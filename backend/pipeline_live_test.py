#!/usr/bin/env python
"""
MARVO Pipeline Live Data Test
=============================
Runs the full multi-agent pipeline in LIVE mode and shows exactly what each
agent fetched, which data source was used, and whether it came from
MOSDAC/ISRO, INCOIS ERDDAP, or the Open-Meteo fallback.

Usage (run from the backend/ directory):
    python pipeline_live_test.py

Exit codes:
    0 — all agents ran (data may be DEMO if APIs unavailable; check output)
    1 — a critical agent crashed with an uncaught exception
"""
from __future__ import annotations

import sys
import time
import json
from datetime import datetime, timezone

# ── Bootstrap: force LIVE mode before importing anything else ─────────────────
import os
os.environ["MARVO_DATA_MODE"] = "LIVE"

# Add backend/ to path so we can import the app package
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config import set_data_mode
set_data_mode("LIVE")

from app.schemas import Location
from app.agents import (
    ocean_agent,
    weather_agent,
    cyclone_agent,
    pfz_agent,
)

# ── Test locations (covering multiple Indian coastal regions) ─────────────────
TEST_LOCATIONS = [
    {"name": "Chennai",    "lat": 13.083, "lon": 80.270, "region": "SE (Bay of Bengal)"},
    {"name": "Mumbai",     "lat": 19.076, "lon": 72.877, "region": "NW (Arabian Sea)"},
    {"name": "Kochi",      "lat": 9.931,  "lon": 76.267, "region": "SW (Arabian Sea)"},
]

SEPARATOR = "─" * 72


def fmt_val(v, unit="", precision=2):
    if v is None:
        return "None (unavailable)"
    if isinstance(v, float):
        return f"{v:.{precision}f} {unit}".strip()
    return f"{v} {unit}".strip()


def print_header(title: str):
    print(f"\n{'━' * 72}")
    print(f"  {title}")
    print(f"{'━' * 72}")


def run_ocean_agent(loc: Location, when: datetime):
    print_header(f"OCEAN AGENT — {loc.name}")
    t0 = time.perf_counter()
    result = ocean_agent.run(loc, when)
    elapsed = (time.perf_counter() - t0) * 1000

    print(f"  Mode     : {result.mode}")
    print(f"  Source   : {result.source}")
    print(f"  OK       : {result.ok}")
    print(f"  Latency  : {elapsed:.0f} ms")
    print()

    d = result.data or {}
    provider = "unknown"

    # Check which provider was actually used (stored in live_client output)
    # We can re-call fetch_marine to see the raw dict
    try:
        from app.data.live_client import fetch_marine
        raw = fetch_marine(loc.latitude, loc.longitude, when)
        if raw:
            provider = raw.get("provider", "unknown")
            stale = raw.get("is_stale", False)
            moved = raw.get("data_moved_km")
            note = raw.get("note", "")
            print(f"  Provider  : {provider}")
            if stale:
                print(f"  ⚠  STALE  : {raw.get('staleness_note', 'cycle aged out')}")
            if moved:
                print(f"  ⚓ Moved  : {moved:.1f} km from query point (land-masked cell)")
            if note:
                print(f"  Note      : {note}")
        else:
            print(f"  Provider  : Open-Meteo fallback (MOSDAC returned None)")
    except Exception as e:
        print(f"  Provider  : [could not resolve — {e}]")

    print()
    print(f"  Wave Height     : {fmt_val(d.get('wave_height_m'), 'm')}")
    print(f"  Wave Period     : {fmt_val(d.get('wave_period_s'), 's')}")
    print(f"  Sea State       : {d.get('sea_state', 'unknown')}")
    print(f"  SST             : {fmt_val(d.get('sst_c'), '°C')}")
    print(f"  Current Speed   : {fmt_val(d.get('current_speed_ms'), 'm/s')}")
    print(f"  Chlorophyll     : {fmt_val(d.get('chlorophyll_mg_m3'), 'mg/m³')}")

    if result.unavailable:
        print()
        for msg in result.unavailable:
            print(f"  ℹ  {msg}")

    return result


def run_weather_agent(loc: Location, when: datetime):
    print_header(f"WEATHER AGENT — {loc.name}")
    t0 = time.perf_counter()
    result = weather_agent.run(loc, when)
    elapsed = (time.perf_counter() - t0) * 1000

    print(f"  Mode     : {result.mode}")
    print(f"  Source   : {result.source}")
    print(f"  Latency  : {elapsed:.0f} ms")
    print()

    d = result.data or {}
    print(f"  Wind Speed      : {fmt_val(d.get('wind_speed_kmh'), 'km/h')}")
    print(f"  Wind Direction  : {fmt_val(d.get('wind_direction_deg'), '°')}")
    print(f"  Rain Prob       : {fmt_val(d.get('rain_probability_pct'), '%', 0)}")
    print(f"  Visibility      : {fmt_val(d.get('visibility_km'), 'km')}")

    return result


def run_cyclone_agent(loc: Location, when: datetime):
    print_header(f"CYCLONE AGENT — {loc.name}")
    t0 = time.perf_counter()
    result = cyclone_agent.run(loc, when)
    elapsed = (time.perf_counter() - t0) * 1000

    print(f"  Mode     : {result.mode}")
    print(f"  Source   : {result.source}")
    print(f"  Latency  : {elapsed:.0f} ms")
    print()

    d = result.data or {}
    print(f"  Alert Count     : {d.get('count', 0)}")
    print(f"  Official Warn   : {d.get('official_warning_active', False)}")
    print(f"  Highest Sev     : {d.get('highest_severity', 'none')}")
    if d.get("headline"):
        print(f"  Headline        : {d.get('headline')}")

    return result


def run_pfz_agent(loc: Location, when: datetime):
    print_header(f"PFZ AGENT — {loc.name}")
    t0 = time.perf_counter()
    result = pfz_agent.run(loc, when, count=3)
    elapsed = (time.perf_counter() - t0) * 1000

    print(f"  Mode     : {result.mode}")
    print(f"  Source   : {result.source}")
    print(f"  Latency  : {elapsed:.0f} ms")
    print()

    d = result.data or {}
    zones = d.get("zones", [])
    if not zones:
        print(f"  No PFZ zones returned.")
    else:
        for i, z in enumerate(zones, 1):
            chl = z.get("chlorophyll_mg_m3")
            chl_str = f"{chl:.3f} mg/m³" if chl is not None else "None (enrichment pending)"
            sst = z.get("sst_c")
            sst_str = f"{sst:.1f}°C" if sst is not None else "None"
            print(f"  Zone {i}: {z.get('zone_id', 'UNKNOWN')}")
            print(f"    Lat/Lon : {z.get('latitude'):.3f}°N, {z.get('longitude'):.3f}°E")
            print(f"    Distance: {fmt_val(z.get('distance_km'), 'km', 0)}")
            print(f"    CHL     : {chl_str}")
            print(f"    SST     : {sst_str}")
            print(f"    Source  : {z.get('source', 'unknown')} ({z.get('source_type', '')})")
            print(f"    Conf.   : {z.get('confidence', 0):.0%}")
            print()

    excl = d.get("excluded_count", 0)
    if excl:
        print(f"  ⚠  {excl} zone(s) excluded (inside restricted maritime areas)")

    return result


def run_new_connectors_directly(loc: Location, when: datetime):
    """Directly probe the two new connectors to show raw output."""
    print_header(f"NEW CONNECTORS DIRECT PROBE — {loc.name}")

    # 1. MOSDAC THREDDS
    print("  [MOSDAC THREDDS]")
    try:
        from app.data.mosdac_thredds import fetch_waves_mosdac, fetch_currents_mosdac, time_span, OSF_WAVE_DATASET
        t0 = time.perf_counter()
        waves = fetch_waves_mosdac(loc.latitude, loc.longitude, when)
        ms = (time.perf_counter() - t0) * 1000
        if waves:
            print(f"    ✅ Got data in {ms:.0f} ms")
            print(f"    SWH        : {fmt_val(waves.get('wave_height_m'), 'm')}")
            print(f"    Period     : {fmt_val(waves.get('wave_period_s'), 's')}")
            print(f"    Wind       : {fmt_val(waves.get('wind_speed_kmh'), 'km/h')}")
            print(f"    Valid time : {waves.get('valid_time', 'unknown')}")
            print(f"    Provider   : {waves.get('provider', '?')}")
            if waves.get("is_stale"):
                print(f"    ⚠  STALE: {waves.get('staleness_note', '')}")
            if waves.get("data_moved_km"):
                print(f"    ⚓ Moved  : {waves['data_moved_km']:.1f} km (land-masked)")
        else:
            print(f"    ⚠  No MOSDAC wave data ({ms:.0f} ms) — OSF_WAVE cycle stale or point land-masked")

        # Check dataset validity window
        span = time_span(OSF_WAVE_DATASET)
        if span:
            begin, end = span
            age_h = (datetime.now(timezone.utc) - end).total_seconds() / 3600
            print(f"    Cycle end  : {end.strftime('%Y-%m-%d %H:%M UTC')}  (age: {age_h:.1f} h)")

        # Try currents
        print()
        t0 = time.perf_counter()
        circ = fetch_currents_mosdac(loc.latitude, loc.longitude, when)
        ms = (time.perf_counter() - t0) * 1000
        if circ:
            print(f"    OSF_CIRC SST       : {fmt_val(circ.get('sst_c'), '°C')}")
            print(f"    Current speed      : {fmt_val(circ.get('current_speed_cms'), 'cm/s')}")
            print(f"    Provider           : {circ.get('provider', '?')}")
        else:
            print(f"    ⚠  OSF_CIRC unavailable ({ms:.0f} ms) — catalog may not have today's file yet")

    except Exception as e:
        print(f"    ❌ MOSDAC THREDDS error: {e}")

    print()

    # 2. INCOIS ERDDAP
    print("  [INCOIS ERDDAP]")
    try:
        from app.data.incois_erddap import fetch_chlorophyll_erddap, fetch_sst_erddap
        t0 = time.perf_counter()
        chl = fetch_chlorophyll_erddap(loc.latitude, loc.longitude)
        ms = (time.perf_counter() - t0) * 1000
        if chl is not None:
            print(f"    ✅ Chlorophyll : {chl:.4f} mg/m³ ({ms:.0f} ms)")
            print(f"    Dataset       : IRS-P4 OCM (archival, INCOIS ERDDAP)")
        else:
            print(f"    ⚠  CHL = None ({ms:.0f} ms) — cloud-masked or dataset gap")

        t0 = time.perf_counter()
        sst_argo = fetch_sst_erddap(loc.latitude, loc.longitude)
        ms = (time.perf_counter() - t0) * 1000
        if sst_argo is not None:
            print(f"    ✅ Argo SST    : {sst_argo:.2f}°C ({ms:.0f} ms)")
            print(f"    Dataset       : INCOIS Argo weekly composite")
        else:
            print(f"    ⚠  Argo SST = None ({ms:.0f} ms)")

    except Exception as e:
        print(f"    ❌ INCOIS ERDDAP error: {e}")


def main():
    when = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)

    print()
    print("╔══════════════════════════════════════════════════════════════════════╗")
    print("║          MARVO 2.0 — LIVE PIPELINE DATA FETCH TEST                   ║")
    print("╠══════════════════════════════════════════════════════════════════════╣")
    print(f"║  Mode     : LIVE (MARVO_DATA_MODE=LIVE)                              ║")
    print(f"║  Time UTC : {when.strftime('%Y-%m-%d %H:%M')}                                      ║")
    print(f"║  Tier 1   : MOSDAC THREDDS NCSS + INCOIS ERDDAP (ISRO/MoES)        ║")
    print(f"║  Tier 2   : Open-Meteo Marine (labeled fallback if Tier 1 fails)    ║")
    print("╚══════════════════════════════════════════════════════════════════════╝")

    errors = []

    for loc_data in TEST_LOCATIONS:
        loc = Location(
            name=loc_data["name"],
            latitude=loc_data["lat"],
            longitude=loc_data["lon"],
        )

        print(f"\n\n{'═' * 72}")
        print(f"  LOCATION: {loc_data['name']} ({loc_data['region']})")
        print(f"  Coordinates: {loc_data['lat']}°N, {loc_data['lon']}°E")
        print(f"{'═' * 72}")

        # First, directly probe the new connectors to see raw data
        run_new_connectors_directly(loc, when)

        # Then run the full agent pipeline
        try:
            run_ocean_agent(loc, when)
        except Exception as e:
            print(f"  ❌ Ocean agent crashed: {e}")
            errors.append(f"{loc.name}/ocean: {e}")

        try:
            run_weather_agent(loc, when)
        except Exception as e:
            print(f"  ❌ Weather agent crashed: {e}")
            errors.append(f"{loc.name}/weather: {e}")

        try:
            run_cyclone_agent(loc, when)
        except Exception as e:
            print(f"  ❌ Cyclone agent crashed: {e}")
            errors.append(f"{loc.name}/cyclone: {e}")

        try:
            run_pfz_agent(loc, when)
        except Exception as e:
            print(f"  ❌ PFZ agent crashed: {e}")
            errors.append(f"{loc.name}/pfz: {e}")

    # Final summary
    print(f"\n\n{'═' * 72}")
    print("  SUMMARY")
    print(f"{'═' * 72}")
    if errors:
        print(f"  ❌ {len(errors)} agent(s) crashed:")
        for e in errors:
            print(f"     • {e}")
        print()
        sys.exit(1)
    else:
        print("  ✅ All agents completed without exceptions.")
        print()
        print("  What to check in the output above:")
        print("   • Provider = 'MOSDAC/ISRO (OSF_WAVE)'  → Tier 1 data working ✅")
        print("   • Provider = 'Open-Meteo Marine ...'    → Tier 2 fallback (MOSDAC stale/unavail)")
        print("   • CHL value present in PFZ zones        → INCOIS ERDDAP enrichment working ✅")
        print("   • ⚠ STALE notice                        → OSF_WAVE cycle aged out (expected)")
        print()
        sys.exit(0)


if __name__ == "__main__":
    main()
