"""Potential Fishing Zone agent.

WHAT PFZ MEANS (we say this on stage, because it is the single most likely
"gotcha" question): a PFZ is not a fish detector. INCOIS derives PFZ advisories
from sea-surface-temperature fronts and chlorophyll concentration — the physical
signature of nutrient upwelling where forage species, and therefore catch,
concentrate. ORCA reproduces that reasoning and ranks candidate zones. It never
claims to see fish.

Data tiers (in order of preference):
  TIER 1 — INCOIS TextData (SEC001-SEC008): official pre-computed advisory
            locations. Source = "INCOIS". Mode = "LIVE".
  TIER 2 — INCOIS ERDDAP satellite (when TextData is down): geometric zone
            candidates from the fishing-ground layout, enriched with REAL
            satellite chlorophyll from the INCOIS ERDDAP API.
            Source = "INCOIS-ERDDAP". Mode = "LIVE".
  TIER 3 — Fully synthetic fallback (when all live APIs are unreachable):
            demo_store geometry + synthetic oceanographic values.
            Source = "DEMO". Mode = "DEMO".
"""
from __future__ import annotations

from datetime import datetime
from typing import List

from ..data import demo_store
from ..data.geo import RESTRICTED_ZONES, compass, point_in_polygon
from ..schemas import AgentResult, Location, PFZZone
from ..services import fishing as fishing_svc
from .base import live_enabled, timed


def _score(zone: dict) -> float:
    """Rank by front strength (chlorophyll) discounted by distance and sea state.

    When chlorophyll is None (INCOIS TextData does not provide it directly),
    fall back to distance-only scoring so live zones are still ranked sensibly.
    """
    chl = zone.get("chlorophyll_mg_m3") or 0.8  # conservative default if not provided
    distance = zone.get("distance_km") or 1.0
    wave = zone.get("wave_height_m") or 1.0
    return (chl * 1.6) - (distance / 45.0) - (wave * 0.25)


def _blocking_zone(lat: float, lon: float):
    """The restricted area containing this point, if any."""
    for zone in RESTRICTED_ZONES:
        if point_in_polygon((lat, lon), zone["polygon"]):
            return zone
    return None


def _incois_to_pfz_zone(raw: dict, rank: int, stamp: str) -> dict:
    """Convert an INCOIS scraper zone dict to the PFZZone-compatible format."""
    # bearing may come as a compass string (demo_store) or as bearing_deg float
    # (INCOIS scraper). PFZZone.bearing expects a compass string.
    raw_bearing = raw.get("bearing") or ""
    if not raw_bearing:
        deg = raw.get("bearing_deg")
        raw_bearing = compass(float(deg)) if deg is not None else ""
    return {
        "zone_id":           raw.get("zone_id", f"INCOIS-{rank:02d}"),
        "latitude":          raw["latitude"],
        "longitude":         raw["longitude"],
        "distance_km":       raw.get("distance_km", 25.0),
        "bearing":           raw_bearing,
        "bearing_deg":       raw.get("bearing_deg"),
        "depth_m":           raw.get("depth_m"),
        "wave_height_m":     raw.get("wave_height_m"),
        "sst_c":             raw.get("sst_c"),
        "chlorophyll_mg_m3": raw.get("chlorophyll_mg_m3"),
        "confidence":        raw.get("confidence") or 0.90,   # 0.0 means 'unfilled'
        "source":            raw.get("source", "INCOIS"),
        "source_type":       raw.get("source_type", "official_bulletin"),
        "rank":              rank,
        "timestamp":         stamp,
    }


@timed
def run(location: Location, when: datetime, count: int = 3) -> AgentResult:
    stamp = when.isoformat(timespec="seconds")
    source = "DEMO"
    mode = "DEMO"
    data_quality = "synthetic"      # escalated as tiers succeed
    raw: List[dict] = []

    if live_enabled():
        # -- TIER 1: INCOIS TextData SEC001-SEC008 ----------------------------
        # Official pre-computed advisory zone positions. Best data available.
        try:
            from ..data.advisory_scraper import scrape_incois_pfz
            live_zones = scrape_incois_pfz()
            if live_zones:
                raw = live_zones
                source = "INCOIS"
                mode = "LIVE"
                data_quality = "official_advisory"
                # Enrich with real chlorophyll from INCOIS ERDDAP/NOAA when the
                # TextData tables don't include it (they almost never do).
                # Run in parallel — one request per zone.
                try:
                    from ..data.incois_erddap import fetch_chlorophyll_erddap
                    from concurrent.futures import ThreadPoolExecutor, as_completed as _as_completed
                    needs_chl = [z for z in raw if z.get("chlorophyll_mg_m3") is None]
                    if needs_chl:
                        with ThreadPoolExecutor(max_workers=len(needs_chl)) as ex:
                            fmap = {ex.submit(fetch_chlorophyll_erddap, z["latitude"], z["longitude"]): z for z in needs_chl}
                            for fut in _as_completed(fmap, timeout=15):
                                z = fmap[fut]
                                chl = fut.result()
                                if chl is not None:
                                    z["chlorophyll_mg_m3"] = chl
                except Exception:
                    pass  # enrichment failure never blocks advisory flow
        except Exception:
            pass

        # -- TIER 2: INCOIS ERDDAP satellite enrichment -----------------------
        # INCOIS TextData is down (returns HTTP 500 as it often does during
        # maintenance). Use the fishing-ground geometric layout from demo_store
        # as candidate positions, but fetch REAL chlorophyll for each point
        # from the NOAA CoastWatch ERDDAP satellite API in PARALLEL so latency
        # is one round-trip (~3 s) not N round-trips (~18 s).
        if not raw:
            try:
                from ..data.incois_erddap import fetch_chlorophyll_erddap
                from concurrent.futures import ThreadPoolExecutor, as_completed
                candidates = demo_store.pfz_zones(
                    location.latitude, location.longitude,
                    location.name, when, count=count * 2,
                )
                # Fire all NOAA requests at the same time
                def _enrich(z: dict) -> dict:
                    chl = fetch_chlorophyll_erddap(z["latitude"], z["longitude"])
                    if chl is not None:
                        z["chlorophyll_mg_m3"] = chl
                        z["source"] = "INCOIS-ERDDAP"
                    return z

                enriched_count = 0
                with ThreadPoolExecutor(max_workers=len(candidates)) as ex:
                    futures = {ex.submit(_enrich, z): z for z in candidates}
                    for fut in as_completed(futures, timeout=18):
                        z = fut.result()
                        if z.get("source") == "INCOIS-ERDDAP":
                            enriched_count += 1

                if enriched_count > 0:
                    # At least some zones have real satellite chlorophyll.
                    raw = candidates
                    source = "INCOIS-ERDDAP"
                    mode = "LIVE"
                    data_quality = "satellite_enriched"
            except Exception:
                pass  # ERDDAP also down -> fall through to Tier 3

    # -- TIER 3: Fully synthetic fallback -------------------------------------
    # All live APIs unreachable. Use demo_store geometry + synthetic values.
    # Clearly labelled so the frontend can display the appropriate caveat.
    if not raw:
        raw = demo_store.pfz_zones(
            location.latitude, location.longitude,
            location.name, when, count=count * 2,
        )
        source = "DEMO"
        mode = "DEMO"
        data_quality = "synthetic"

    # SAFETY FILTER: never recommend a fishing zone inside a restricted area.
    kept, excluded = [], []
    for z in raw:
        blocker = _blocking_zone(z["latitude"], z["longitude"])
        if blocker:
            excluded.append({
                "latitude":  z["latitude"],
                "longitude": z["longitude"],
                "reason":    blocker["name"],
                "zone_type": blocker["zone_type"],
            })
        else:
            kept.append(z)

    kept.sort(key=_score, reverse=True)
    kept = kept[:count]

    zones: List[PFZZone] = []
    for rank, z in enumerate(kept, start=1):
        formatted = _incois_to_pfz_zone(z, rank, stamp)
        # Compute HSI fishing probability so the confidence field is always
        # meaningful. demo_store sets confidence=0.0 as a sentinel ("fill me
        # in"). The /api/fishing endpoint fills it via _zone_payload; the /plan
        # (LangGraph) path goes through this agent and must fill it here.
        hour = int(stamp[11:13]) if len(stamp) >= 13 else 6
        hsi = fishing_svc.probability(
            chlorophyll=formatted.get("chlorophyll_mg_m3"),
            sst=formatted.get("sst_c"),
            ambient_sst=formatted.get("sst_c"),   # fishing.py enriches with ocean_agent sst
            wave_m=formatted.get("wave_height_m"),
            hour=hour,
        )
        prob = hsi["probability"]                  # 0-100
        formatted["confidence"] = round(prob / 100.0, 2)
        formatted["rationale"] = (
            f"Chl {formatted.get('chlorophyll_mg_m3')} mg/m\u00b3 "
            f"at {formatted.get('sst_c')}\u00b0C, "
            f"{round(formatted['distance_km'])} km {formatted['bearing']}. "
            f"HSI likelihood {prob}%."
        )
        zones.append(PFZZone(**{k: v for k, v in formatted.items() if k in PFZZone.model_fields}))

    # Human-readable data quality note surfaced to the frontend / explanation agent.
    quality_note = {
        "official_advisory":  "Official INCOIS PFZ advisory — from today's satellite pass.",
        "satellite_enriched": "INCOIS TextData unavailable. Zone positions estimated; "
                              "chlorophyll from INCOIS ERDDAP satellite (real data).",
        "synthetic":          "INCOIS advisories unavailable. Zones are estimated from "
                              "modelled shelf geometry — treat as indicative only.",
    }.get(data_quality, "")

    return AgentResult(
        agent="pfz",
        ok=True,
        location=location,
        data={
            "zones":          [z.model_dump() for z in zones],
            "excluded_zones": excluded,
            "excluded_count": len(excluded),
            "data_quality":   data_quality,
            "quality_note":   quality_note,
            "method": "SST front + chlorophyll concentration ranking (INCOIS methodology)",
            "safety_filter": "Candidate zones inside restricted maritime areas are removed.",
            "caveat": "Potential zone — indicates likelihood of fish aggregation, not a guarantee.",
        },
        source=source,
        timestamp=stamp,
        confidence=zones[0].confidence if zones else 0.0,
        mode=mode,  # type: ignore[arg-type]
    )
