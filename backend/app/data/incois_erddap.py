"""INCOIS ERDDAP connector.

Base URL: https://erddap.incois.gov.in/erddap  (verified live, no auth needed)

ERDDAP is a data server standard that exposes datasets via clean REST URLs.
This is far more robust than scraping HTML tables from the INCOIS portal,
which is JS-rendered and its GeoServer is behind a WAF (HTTP 403).

Datasets used (confirmed on the INCOIS ERDDAP as of 2026-09-21):
  IRS_chlorophyll_datasets  - IRS-P4 OCM chlorophyll (archival, daily)
  incois_argo_sst_weekly    - Argo float weekly SST composites
  incois_oceansat2_datasets - Oceansat-2 OCM (archival)

ERDDAP CSV format:
  Row 0: column headers
  Row 1: units
  Row 2+: data

Coordinate syntax for griddap:  variable[(time_expr)][(lat)][(lon)]
ERDDAP resolves (last) to the most recent timestep and (13.08) to the
nearest grid cell — no manual index arithmetic needed.

Fallback contract:
  All public functions return None / [] on any failure. The caller cascades
  to MOSDAC or Open-Meteo data and labels it accordingly.
"""
from __future__ import annotations

import logging
import threading
import time
from typing import Any, Dict, List, Optional, Tuple

import httpx

log = logging.getLogger(__name__)

ERDDAP_BASE = "https://erddap.incois.gov.in/erddap"

# Cache TTLs
_TTL_OK = 3600.0    # 1 hour: INCOIS updates 1-2x/day
_TTL_FAIL = 120.0   # 2 min: retry failures quickly

_cache: Dict[str, Tuple[float, Any]] = {}
_lock = threading.Lock()
_client: Optional[httpx.Client] = None
_client_lock = threading.Lock()


def _http() -> httpx.Client:
    global _client
    if _client is None:
        with _client_lock:
            if _client is None:
                _client = httpx.Client(
                    timeout=12.0,
                    follow_redirects=True,
                    headers={
                        "User-Agent": (
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                            "MARVO/2.0 (INCOIS ERDDAP client)"
                        )
                    },
                )
    return _client


def _cache_get(key: str) -> Optional[Any]:
    with _lock:
        entry = _cache.get(key)
        if entry and entry[0] > time.monotonic():
            return entry[1]
    return None


def _cache_set(key: str, value: Any, ttl: float) -> None:
    with _lock:
        _cache[key] = (time.monotonic() + ttl, value)


def clear_erddap_cache() -> None:
    """Drop all cached results (for testing / mode toggle)."""
    with _lock:
        _cache.clear()


# ── CSV parser ─────────────────────────────────────────────────────────────────

def _parse_erddap_csv(text: str) -> List[Dict[str, Any]]:
    """Parse an ERDDAP griddap/tabledap CSV response.

    Format:
        header_row   (column names)
        units_row    (units for each column)
        data_rows...
    """
    lines = [ln for ln in text.splitlines() if ln.strip()]
    if len(lines) < 3:
        return []
    headers = [h.strip() for h in lines[0].split(",")]
    units = [u.strip() for u in lines[1].split(",")]
    rows: List[Dict[str, Any]] = []
    for line in lines[2:]:
        parts = [p.strip() for p in line.split(",")]
        if len(parts) != len(headers):
            continue
        row: Dict[str, Any] = {"_units": dict(zip(headers, units))}
        for key, value in zip(headers, parts):
            if value in ("", "NaN", "null"):
                row[key] = None
                continue
            try:
                row[key] = float(value)
            except ValueError:
                row[key] = value
        rows.append(row)
    return rows


# ── Griddap point query ────────────────────────────────────────────────────────

def griddap_point(
    dataset_id: str,
    variable: str,
    lat: float,
    lon: float,
    time_expr: str = "last",
    extra_dims: str = "",
) -> List[Dict[str, Any]]:
    """Fetch a nearest-cell value via ERDDAP griddap using (value) syntax.

    The URL pattern:
        /griddap/{dataset_id}.csv?{variable}[(time_expr)]{extra_dims}[(lat)][(lon)]

    ERDDAP resolves (last) to the newest timestep and (13.08) to the nearest
    grid cell, so no index arithmetic is needed.

    extra_dims: optional bracketed dimension selectors for non-lat/lon axes,
                e.g. "[(0)]" for a depth dimension.
    """
    # URL-encode brackets as %5B and %5D for strict compliance
    query = (
        f"{variable}%5B({time_expr})%5D{extra_dims}"
        f"%5B({lat:.4f})%5D%5B({lon:.4f})%5D"
    )
    url = f"{ERDDAP_BASE}/griddap/{dataset_id}.csv?{query}"

    cached = _cache_get(url)
    if cached is not None:
        return cached

    try:
        resp = _http().get(url)
        if resp.status_code == 200:
            rows = _parse_erddap_csv(resp.text)
            _cache_set(url, rows, _TTL_OK)
            log.debug("[INCOIS ERDDAP] %s/%s → %d row(s)", dataset_id, variable, len(rows))
            return rows
        log.debug("[INCOIS ERDDAP] HTTP %s for %s/%s", resp.status_code, dataset_id, variable)
        _cache_set(url, [], _TTL_FAIL)
        return []
    except Exception as exc:
        log.debug("[INCOIS ERDDAP] Request failed for %s/%s: %s", dataset_id, variable, exc)
        _cache_set(url, [], _TTL_FAIL)
        return []


def griddap_box(
    dataset_id: str,
    variable: str,
    south: float,
    north: float,
    west: float,
    east: float,
    time_expr: str = "last",
    stride: int = 4,
) -> List[Dict[str, Any]]:
    """Fetch a bounding-box slice for spatial reasoning (e.g., chlorophyll patch maps).

    stride reduces the number of returned points; stride=4 returns every 4th cell.
    """
    query = (
        f"{variable}%5B({time_expr})%5D"
        f"%5B({south:.4f}):{stride}:({north:.4f})%5D"
        f"%5B({west:.4f}):{stride}:({east:.4f})%5D"
    )
    url = f"{ERDDAP_BASE}/griddap/{dataset_id}.csv?{query}"

    cached = _cache_get(url)
    if cached is not None:
        return cached

    try:
        resp = _http().get(url)
        if resp.status_code == 200:
            rows = _parse_erddap_csv(resp.text)
            _cache_set(url, rows, _TTL_OK)
            return rows
        _cache_set(url, [], _TTL_FAIL)
        return []
    except Exception:
        _cache_set(url, [], _TTL_FAIL)
        return []


# ── High-level public API ──────────────────────────────────────────────────────

# ── NOAA CoastWatch ERDDAP ────────────────────────────────────────────────────
# Base URL: https://coastwatch.noaa.gov/erddap  (NOAA NESDIS, very high uptime)
# Used as a reliable fallback when INCOIS ERDDAP is unavailable.
#
# Dataset: noaacwNPPN20VIIRSDINEOFDaily
#   - DINEOF gap-filling means NO cloud gaps — always has a value
#   - Daily composite, global 9km
#   - VIIRS (NOAA-20 + Suomi-NPP), 2018-present
#   - Variable: chlor_a (mg/m³)
#   - Has altitude dimension → must include [(0.0)] in query

NOAA_CW_BASE = "https://coastwatch.noaa.gov/erddap"
NOAA_CW_DATASET = "noaacwNPPN20VIIRSDINEOFDaily"
NOAA_CW_VARIABLE = "chlor_a"

_noaa_client: Optional[httpx.Client] = None
_noaa_client_lock = threading.Lock()


def _noaa_http() -> httpx.Client:
    global _noaa_client
    if _noaa_client is None:
        with _noaa_client_lock:
            if _noaa_client is None:
                _noaa_client = httpx.Client(
                    timeout=15.0,
                    follow_redirects=True,
                    headers={"User-Agent": "MARVO/2.0 (NOAA CoastWatch ERDDAP client)"},
                )
    return _noaa_client


def fetch_chlorophyll_noaa_coastwatch(lat: float, lon: float) -> Optional[float]:
    """Fetch chlorophyll-a (mg/m³) from NOAA CoastWatch ERDDAP.

    Uses the DINEOF gap-filled VIIRS product (noaacwNPPN20VIIRSDINEOFDaily).
    DINEOF gap-filling interpolates through cloud cover so this dataset always
    has a value — unlike raw L3 products which return NaN under clouds.

    Falls back to None on any failure.
    """
    # Small box around the point; the dataset is 9km so 0.1 deg gives ~2-3 cells
    delta = 0.12
    south = round(lat - delta, 4)
    north = round(lat + delta, 4)
    west = round(lon - delta, 4)
    east = round(lon + delta, 4)

    # altitude dimension is always 0.0 (sea surface)
    query = (
        f"{NOAA_CW_VARIABLE}%5B(last)%5D%5B(0.0)%5D"
        f"%5B({south}):1:({north})%5D"
        f"%5B({west}):1:({east})%5D"
    )
    url = f"{NOAA_CW_BASE}/griddap/{NOAA_CW_DATASET}.csv?{query}"

    cached = _cache_get(url)
    if cached is not None:
        return cached if isinstance(cached, float) else None

    try:
        resp = _noaa_http().get(url)
        if resp.status_code != 200:
            log.debug("[NOAA CW] HTTP %s for chlorophyll", resp.status_code)
            _cache_set(url, None, _TTL_FAIL)
            return None

        rows = _parse_erddap_csv(resp.text)
        values = [
            float(r[NOAA_CW_VARIABLE])
            for r in rows
            if r.get(NOAA_CW_VARIABLE) is not None
            and isinstance(r[NOAA_CW_VARIABLE], (int, float))
            and 0 < float(r[NOAA_CW_VARIABLE]) < 200
        ]
        if not values:
            _cache_set(url, None, _TTL_FAIL)
            return None

        # Median is more robust than mean for coastal NaN-mixed grids
        values.sort()
        median = values[len(values) // 2]
        result = round(median, 4)
        log.debug("[NOAA CW] chlorophyll @ (%.3f, %.3f) = %.4f mg/m³", lat, lon, result)
        _cache_set(url, result, _TTL_OK)
        return result

    except Exception as exc:
        log.debug("[NOAA CW] Request failed: %s", exc)
        _cache_set(url, None, _TTL_FAIL)
        return None


# ── High-level public API ──────────────────────────────────────────────────────

def fetch_chlorophyll_erddap(lat: float, lon: float) -> Optional[float]:
    """Fetch chlorophyll-a (mg/m³) at a point. Cascades through data sources.

    Priority cascade:
      1. INCOIS ERDDAP — IRS-P4 OCM (Indian satellite, authoritative for INCOIS PFZ)
      2. INCOIS ERDDAP — Oceansat-2 OCM (secondary Indian satellite)
      3. NOAA CoastWatch — DINEOF gap-filled VIIRS (reliable US fallback, always has data)

    Returns a float in mg/m³ or None if all sources fail.
    """
    # -- Source 1: INCOIS IRS-P4 OCM ----------------------------------------
    rows = griddap_point(
        dataset_id="IRS_chlorophyll_datasets",
        variable="chlor_a",
        lat=lat,
        lon=lon,
    )
    val = rows[0].get("chlor_a") if rows else None
    if val is not None and isinstance(val, (int, float)) and 0 < val < 200:
        return round(float(val), 4)

    # -- Source 2: INCOIS Oceansat-2 -----------------------------------------
    rows2 = griddap_point(
        dataset_id="incois_oceansat2_datasets",
        variable="chlor_a",
        lat=lat,
        lon=lon,
    )
    val2 = rows2[0].get("chlor_a") if rows2 else None
    if val2 is not None and isinstance(val2, (int, float)) and 0 < val2 < 200:
        return round(float(val2), 4)

    # -- Source 3: NOAA CoastWatch DINEOF (reliable fallback) ----------------
    log.debug("[INCOIS ERDDAP] Both INCOIS datasets failed — trying NOAA CoastWatch")
    return fetch_chlorophyll_noaa_coastwatch(lat, lon)




def fetch_sst_erddap(lat: float, lon: float) -> Optional[float]:
    """Fetch SST from INCOIS ERDDAP Argo weekly composite.

    Returns SST in °C or None.  Less granular than MOSDAC but serves as an
    independent cross-check for the risk engine.
    """
    rows = griddap_point(
        dataset_id="incois_argo_sst_weekly",
        variable="sst",
        lat=lat,
        lon=lon,
    )
    if not rows:
        return None
    val = rows[0].get("sst")
    if val is not None and isinstance(val, (int, float)) and -5 < val < 40:
        return round(float(val), 2)
    return None


def dataset_info(dataset_id: str) -> List[Dict[str, Any]]:
    """Fetch ERDDAP metadata for a dataset (variable list, time coverage, etc.)."""
    url = f"{ERDDAP_BASE}/info/{dataset_id}/index.json"
    cached = _cache_get(url)
    if cached is not None:
        return cached
    try:
        resp = _http().get(url)
        if resp.status_code == 200:
            payload = resp.json()
            if "table" in payload:
                cols = payload["table"].get("columnNames", [])
                rows = [dict(zip(cols, row)) for row in payload["table"].get("rows", [])]
                _cache_set(url, rows, 86400.0)  # metadata: 24 h TTL
                return rows
        _cache_set(url, [], _TTL_FAIL)
        return []
    except Exception:
        _cache_set(url, [], _TTL_FAIL)
        return []
