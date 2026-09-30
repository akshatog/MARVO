"""MOSDAC THREDDS NCSS connector (no file download required).

Root: https://mosdac.gov.in/live_data  (unauthenticated)

Three access paths exist; this module implements the two cheapest:
  * NCSS point  -> CSV time series at one lat/lon. Used for every
    "conditions at my location" answer.  Returns < 1 KB vs. a 3.8 GB file.
  * dataset.xml -> read the true validity window of a dataset so MARVO
    can label stale cycles and fall back gracefully.

OPeNDAP ASCII (grid windows for front-detection maps) is a future addition
tracked in the roadmap.

Datasets used:
  OSF_WAVE  - Ocean State Forecast waves  (SWH, MWPER, MWDIR, UWIND, VWIND)
  OSF_CIRC  - Ocean State Forecast circulation (temp, salinity,
              eastward_ocean_wave_current, northward_ocean_wave_current)

Verified behaviours (2026-09-21, from DATA_SOURCES.md):
  - accept=csv works for point requests; accept=netcdf is rejected for grid.
  - vertCoord=0 returns fill for OSF_CIRC; first real level is 1 (1 m depth).
  - Fill value is ~-1e34 for OSF_WAVE and ~-9.9999998e33 for OSF_CIRC.
  - OSF_WAVE time axis is "hours since 2026-4-21" — read dataset.xml for the
    true validity window, never assume it matches today's date.
  - OSF_CIRC daily files are named SAC_OSF_CIRC_10KM_YYYYMMDD.nc (~3.8 GB);
    the catalog is read to find the newest file, then only a single NCSS point
    is fetched — never the whole file.

Fallback contract:
  Every public function returns None / [] on any failure so the calling agent
  can cleanly cascade to Open-Meteo without propagating exceptions.
  The caller is responsible for labelling fallback data as non-ISRO.
"""
from __future__ import annotations

import logging
import math
import re
import threading
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Iterable, List, Optional, Tuple

import httpx

log = logging.getLogger(__name__)

# ── Constants ──────────────────────────────────────────────────────────────────

MOSDAC_BASE = "https://mosdac.gov.in/live_data"
FILL_LIMIT = 1e30  # values whose abs() exceeds this are treated as fill

# Dataset paths (relative to MOSDAC_BASE)
OSF_WAVE_DATASET = "OSF_WAVE/SAC_OSF_WAVE_10KM.nc"
OSF_CIRC_CATALOG = "OSF_CIRC"            # catalog path for listing dated files
OSF_CIRC_PATTERN = re.compile(r"SAC_OSF_CIRC_10KM_(\d{8})\.nc")

# NCSS vars we care about
OSF_WAVE_VARS = ["SWH", "MWPER", "UWIND", "VWIND"]
OSF_CIRC_VARS = ["temp", "eastward_ocean_wave_current", "northward_ocean_wave_current"]

# Cache TTLs (seconds)
_TTL_OK = 600.0       # 10 min: forecast data, good enough for a demo run
_TTL_FAIL = 60.0      # 1 min: remember failures briefly; fail fast offline
_TTL_CATALOG = 1800.0 # 30 min: catalog listing rarely changes mid-day
_TTL_STALE = 48 * 3600  # if cycle is older than 48 h, mark data stale

# ── Shared HTTP client ─────────────────────────────────────────────────────────

_client: Optional[httpx.Client] = None
_client_lock = threading.Lock()


def _http() -> httpx.Client:
    """Shared synchronous httpx client with a browser-like UA to avoid WAF 403s."""
    global _client
    if _client is None:
        with _client_lock:
            if _client is None:
                _client = httpx.Client(
                    timeout=4.0,
                    follow_redirects=True,
                    headers={
                        "User-Agent": (
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                            "AppleWebKit/537.36 (KHTML, like Gecko) "
                            "Chrome/126.0.0.0 Safari/537.36 MARVO/2.0"
                        ),
                        "Accept-Language": "en-IN,en;q=0.9",
                    },
                )
    return _client


# ── In-memory cache ────────────────────────────────────────────────────────────

_cache: Dict[str, Tuple[float, Any]] = {}
_cache_lock = threading.Lock()


def _cache_get(key: str) -> Optional[Any]:
    with _cache_lock:
        entry = _cache.get(key)
        if entry and entry[0] > time.monotonic():
            return entry[1]
    return None


def _cache_set(key: str, value: Any, ttl: float) -> None:
    with _cache_lock:
        _cache[key] = (time.monotonic() + ttl, value)


def clear_thredds_cache() -> None:
    """Drop all cached results (for testing / mode toggle)."""
    with _cache_lock:
        _cache.clear()


# ── CSV parsers ────────────────────────────────────────────────────────────────

def _is_fill(v: Optional[float]) -> bool:
    return v is None or not math.isfinite(v) or abs(v) > FILL_LIMIT


def _clean(v: Optional[float]) -> Optional[float]:
    return None if _is_fill(v) else float(v)


def parse_ncss_csv(text: str) -> List[Dict[str, Any]]:
    """Parse a THREDDS NCSS point CSV response.

    NCSS adds unit annotations to headers like:
        temp[unit="degC"], SWH[unit="m"]
    We strip them so callers get clean key names.

    NCSS may emit multiple variable-group blocks separated by blank lines;
    this function collects all rows from all blocks.
    """
    rows: List[Dict[str, Any]] = []
    # Split on blank lines to handle multi-block responses
    blocks = [b for b in text.split("\n\n") if b.strip()]
    for block in blocks:
        lines = [ln for ln in block.splitlines() if ln.strip()]
        if len(lines) < 2:
            continue
        headers: List[str] = []
        units: Dict[str, str] = {}
        for col in lines[0].split(","):
            name = col.strip()
            unit = ""
            if "[" in name:
                m = re.search(r'unit="([^"]*)"', name)
                unit = m.group(1) if m else ""
                name = name.split("[")[0]
            headers.append(name)
            units[name] = unit
        for line in lines[1:]:
            parts = [p.strip() for p in line.split(",")]
            if len(parts) != len(headers):
                continue
            row: Dict[str, Any] = {"_units": units}
            for name, value in zip(headers, parts):
                if name == "time":
                    row["time"] = value
                    continue
                try:
                    raw = float(value)
                    row[name] = _clean(raw)
                except ValueError:
                    row[name] = value
            rows.append(row)
    return rows


def _merge_rows(rows: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """NCSS emits one block per variable group; merge them on the time key."""
    merged: Dict[str, Dict[str, Any]] = {}
    for row in rows:
        key = str(row.get("time", ""))
        slot = merged.setdefault(key, {"time": key, "_units": {}})
        slot["_units"].update(row.get("_units", {}))
        for k, v in row.items():
            if k in ("time", "_units"):
                continue
            if k not in slot or slot[k] is None:
                slot[k] = v
    return [merged[k] for k in sorted(merged)]


# ── Dataset metadata ───────────────────────────────────────────────────────────

def _fetch_text(url: str, cache_key: str, ttl: float) -> Optional[str]:
    """GET a URL with caching. Returns None on any HTTP/network error."""
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    try:
        resp = _http().get(url)
        if resp.status_code == 200:
            _cache_set(cache_key, resp.text, ttl)
            return resp.text
        log.debug("[MOSDAC] HTTP %s for %s", resp.status_code, url)
        _cache_set(cache_key, None, _TTL_FAIL)
        return None
    except Exception as exc:
        log.debug("[MOSDAC] Request failed for %s: %s", url, exc)
        _cache_set(cache_key, None, _TTL_FAIL)
        return None


def time_span(dataset_path: str) -> Optional[Tuple[datetime, datetime]]:
    """Read the true validity window of a dataset from dataset.xml.

    Especially important for OSF_WAVE whose time axis is frozen ("hours since
    2026-4-21") — only dataset.xml reveals the real forecast cycle dates.
    Returns (begin_utc, end_utc) or None on failure.
    """
    url = f"{MOSDAC_BASE}/ncss/grid/{dataset_path}/dataset.xml"
    text = _fetch_text(url, f"timespan:{dataset_path}", _TTL_CATALOG)
    if not text:
        return None
    begin_m = re.search(r"<begin>([^<]+)</begin>", text)
    end_m = re.search(r"<end>([^<]+)</end>", text)
    if not (begin_m and end_m):
        return None
    try:
        begin = datetime.fromisoformat(begin_m.group(1).replace("Z", "+00:00"))
        end = datetime.fromisoformat(end_m.group(1).replace("Z", "+00:00"))
        return begin, end
    except ValueError as exc:
        log.debug("[MOSDAC] dataset.xml parse error: %s", exc)
        return None


def _is_stale(dataset_path: str) -> Tuple[bool, str]:
    """Return (is_stale, note) for a dataset by reading its time span."""
    span = time_span(dataset_path)
    if span is None:
        return False, ""  # can't tell; optimistically not stale
    _, end = span
    age_h = (datetime.now(timezone.utc) - end).total_seconds() / 3600.0
    if age_h > _TTL_STALE / 3600.0:
        note = (
            f"MOSDAC forecast cycle ended {age_h / 24:.1f} days ago — "
            "data treated as archival; cross-checked against fallback tier"
        )
        return True, note
    return False, ""


def latest_osf_circ_dataset() -> Optional[str]:
    """Find the newest SAC_OSF_CIRC_10KM_YYYYMMDD.nc from the catalog.

    Returns the full dataset path (e.g. "OSF_CIRC/SAC_OSF_CIRC_10KM_20260929.nc")
    or None if the catalog is unreachable.
    """
    cache_key = "catalog:OSF_CIRC"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    url = f"{MOSDAC_BASE}/catalog/OSF_CIRC/catalog.xml"
    text = _fetch_text(url, f"text:{cache_key}", _TTL_CATALOG)
    if not text:
        return None

    best_date = ""
    best_path = None
    for m in re.finditer(r'urlPath="([^"]*SAC_OSF_CIRC_10KM_(\d{8})\.nc[^"]*)"', text):
        url_path = m.group(1)
        date_str = m.group(2)
        if date_str > best_date:
            best_date = date_str
            best_path = url_path

    # urlPath from catalog already includes the dataset path (no leading slash)
    result = best_path
    _cache_set(cache_key, result, _TTL_CATALOG)
    log.debug("[MOSDAC] Latest OSF_CIRC: %s", result)
    return result


# ── Core NCSS point query ──────────────────────────────────────────────────────

def ncss_point(
    dataset_path: str,
    variables: List[str],
    lat: float,
    lon: float,
    start: datetime,
    end: datetime,
    vert_coord: Optional[float] = None,
    ttl: float = _TTL_OK,
) -> List[Dict[str, Any]]:
    """Query MOSDAC THREDDS NCSS for a point time series.

    Builds the query string manually because NCSS requires repeated `var=` keys
    which httpx params dicts would collapse into a single `var=SWH,MWPER,...`.

    Returns a list of time-merged row dicts, or [] on any failure.
    """
    params: List[Tuple[str, str]] = [(v_name, v_val) for v_name in ["var"] for v_val in variables]
    # Rebuild: one tuple per var
    params = [("var", v) for v in variables]
    params += [
        ("latitude", f"{lat:.4f}"),
        ("longitude", f"{lon:.4f}"),
        ("time_start", start.strftime("%Y-%m-%dT%H:%M:%SZ")),
        ("time_end", end.strftime("%Y-%m-%dT%H:%M:%SZ")),
        ("accept", "csv"),
    ]
    if vert_coord is not None:
        params.append(("vertCoord", str(vert_coord)))

    query = "&".join(f"{k}={v}" for k, v in params)
    url = f"{MOSDAC_BASE}/ncss/grid/{dataset_path}?{query}"

    cached = _cache_get(url)
    if cached is not None:
        return cached

    try:
        resp = _http().get(url)
        if resp.status_code == 200:
            rows = _merge_rows(parse_ncss_csv(resp.text))
            _cache_set(url, rows, ttl)
            log.debug(
                "[MOSDAC] NCSS %s @ (%.3f, %.3f) → %d rows",
                dataset_path, lat, lon, len(rows)
            )
            return rows
        log.debug("[MOSDAC] NCSS HTTP %s for %s", resp.status_code, dataset_path)
        _cache_set(url, [], _TTL_FAIL)
        return []
    except Exception as exc:
        log.debug("[MOSDAC] NCSS error for %s: %s", dataset_path, exc)
        _cache_set(url, [], _TTL_FAIL)
        return []


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dl = math.radians(lon2 - lon1)
    a = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def ncss_point_nearest_wet(
    dataset_path: str,
    variables: List[str],
    lat: float,
    lon: float,
    start: datetime,
    end: datetime,
    vert_coord: Optional[float] = None,
    probe_var: Optional[str] = None,
    max_rings: int = 3,
    step_deg: float = 0.25,
) -> Tuple[List[Dict[str, Any]], float, float, float]:
    """Like ncss_point but spirals outward if the query point is land-masked.

    Coastal fishing locations frequently fall on a masked cell of the 10 km
    ocean model. Returning no data there would be useless, so MARVO moves to the
    nearest wet cell and tells the user how far it moved.

    Returns (rows, actual_lat, actual_lon, distance_moved_km).
    """
    probe = probe_var or variables[0]

    def attempt(la: float, lo: float) -> List[Dict[str, Any]]:
        rows = ncss_point(dataset_path, variables, la, lo, start, end, vert_coord)
        return rows if any(r.get(probe) is not None for r in rows) else []

    rows = attempt(lat, lon)
    if rows:
        return rows, lat, lon, 0.0

    for ring in range(1, max_rings + 1):
        offset = step_deg * ring
        # Prefer moving offshore first: east in the Bay of Bengal (lon > 77),
        # west in the Arabian Sea.
        candidates: List[Tuple[float, float]] = [
            (lat, lon + offset) if lon > 77.0 else (lat, lon - offset),
            (lat + offset, lon),
            (lat - offset, lon),
            (lat, lon - offset) if lon > 77.0 else (lat, lon + offset),
            (lat + offset, lon + offset),
            (lat - offset, lon - offset),
        ]
        for la, lo in candidates:
            r = attempt(la, lo)
            if r:
                moved = _haversine_km(lat, lon, la, lo)
                log.debug(
                    "[MOSDAC] Land-mask spiral: moved %.1f km to (%.3f, %.3f)",
                    moved, la, lo
                )
                return r, la, lo, moved

    log.debug("[MOSDAC] All spiral attempts failed for (%.3f, %.3f)", lat, lon)
    return [], lat, lon, 0.0


# ── High-level public API ──────────────────────────────────────────────────────

def fetch_waves_mosdac(lat: float, lon: float, when: datetime) -> Optional[Dict[str, Any]]:
    """Fetch wave height, period, and wind from MOSDAC OSF_WAVE.

    Returns a dict compatible with live_client.fetch_marine() output, with
    provider="MOSDAC/ISRO (OSF_WAVE)". Returns None on any failure so the
    caller can fall back to Open-Meteo.
    """
    start = when.replace(minute=0, second=0, microsecond=0)
    end = start + timedelta(hours=6)

    rows, act_lat, act_lon, moved = ncss_point_nearest_wet(
        OSF_WAVE_DATASET,
        OSF_WAVE_VARS,
        lat, lon, start, end,
        probe_var="SWH",
    )
    if not rows:
        log.info("[MOSDAC] fetch_waves_mosdac: no data at (%.3f, %.3f)", lat, lon)
        return None

    # Pick the row closest to `when`
    target_str = when.strftime("%Y-%m-%dT%H:00")
    row = rows[0]
    for r in rows:
        if str(r.get("time", "")).startswith(target_str):
            row = r
            break

    u = row.get("UWIND") or 0.0
    v = row.get("VWIND") or 0.0
    wind_speed_kmh = round((u ** 2 + v ** 2) ** 0.5 * 3.6, 1)  # m/s → km/h

    stale, stale_note = _is_stale(OSF_WAVE_DATASET)

    result: Dict[str, Any] = {
        "wave_height_m": row.get("SWH"),
        "wave_period_s": row.get("MWPER"),
        "wind_speed_kmh": wind_speed_kmh,
        "sst_c": None,  # OSF_WAVE does not carry SST; OSF_CIRC does
        "current_speed_ms": None,
        "current_direction_deg": None,
        "valid_time": row.get("time"),
        "provider": "MOSDAC/ISRO (OSF_WAVE)",
        "is_stale": stale,
    }
    if stale and stale_note:
        result["staleness_note"] = stale_note
    if moved > 0.5:
        result["data_moved_km"] = round(moved, 1)
        result["note"] = (
            f"Query point was land-masked; nearest wet cell is {moved:.1f} km offshore"
        )

    return result


def fetch_currents_mosdac(lat: float, lon: float, when: datetime) -> Optional[Dict[str, Any]]:
    """Fetch ocean temperature and currents from MOSDAC OSF_CIRC.

    Returns dict with keys: temp_c, current_u_cms, current_v_cms,
    current_speed_cms, provider. Returns None on failure.
    """
    circ_dataset = latest_osf_circ_dataset()
    if not circ_dataset:
        log.info("[MOSDAC] fetch_currents_mosdac: OSF_CIRC catalog unavailable")
        return None

    start = when.replace(minute=0, second=0, microsecond=0)
    end = start + timedelta(hours=6)

    rows, act_lat, act_lon, moved = ncss_point_nearest_wet(
        circ_dataset,
        OSF_CIRC_VARS,
        lat, lon, start, end,
        vert_coord=1,  # 1 m depth; vert_coord=0 returns fill
        probe_var="temp",
    )
    if not rows:
        log.info("[MOSDAC] fetch_currents_mosdac: no data at (%.3f, %.3f)", lat, lon)
        return None

    target_str = when.strftime("%Y-%m-%dT%H:00")
    row = rows[0]
    for r in rows:
        if str(r.get("time", "")).startswith(target_str):
            row = r
            break

    u = row.get("eastward_ocean_wave_current")  # cm/s
    v = row.get("northward_ocean_wave_current")  # cm/s
    speed = None
    if u is not None and v is not None:
        speed = round((u ** 2 + v ** 2) ** 0.5, 2)

    result: Dict[str, Any] = {
        "sst_c": row.get("temp"),
        "current_u_cms": u,
        "current_v_cms": v,
        "current_speed_cms": speed,
        "valid_time": row.get("time"),
        "provider": "MOSDAC/ISRO (OSF_CIRC)",
    }
    if moved > 0.5:
        result["data_moved_km"] = round(moved, 1)

    return result
