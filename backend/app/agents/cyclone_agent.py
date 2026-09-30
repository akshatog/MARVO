"""Cyclone / marine-alert agent.

Highest-priority agent in the system. If it reports an official severe warning,
the risk engine's deterministic floor forces EXTREME regardless of what every
other agent — or the language model — thinks.

LIVE mode: fetches the IMD CAP RSS feed via advisory_scraper.scrape_imd_cap_rss()
           and falls back to the GDACS feed if the CAP feed is empty.
           In LIVE mode, if no alerts are found, returns empty (no demo fallback).
DEMO mode: uses the demo_store as before.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Optional

from ..data import demo_store
from ..schemas import AgentResult, Location
from .base import live_enabled, timed

SEVERITY_RANK = {"low": 0, "moderate": 1, "high": 2, "severe": 3}

# State/region → keywords found in IMD CAP area_desc.
# Alerts matching the queried location's state (or a neighbour coast) are kept.
# Alerts with an empty/missing area_desc are treated as nationwide and always kept.
_COASTAL_KEYWORDS: Dict[str, List[str]] = {
    "Gujarat":           ["gujarat", "saurashtra", "kutch", "diu", "arabian sea"],
    "Maharashtra":       ["maharashtra", "mumbai", "konkan", "ratnagiri", "sindhudurg"],
    "Goa":               ["goa"],
    "Karnataka":         ["karnataka", "mangalore", "karwar", "udupi"],
    "Kerala":            ["kerala", "kochi", "lakshadweep", "thiruvananthapuram", "kozhikode"],
    "Tamil Nadu":        ["tamil", "chennai", "rameshwaram", "puducherry", "tuticorin"],
    "Andhra Pradesh":    ["andhra", "visakhapatnam", "vizag", "kakinada", "machilipatnam"],
    "Odisha":            ["odisha", "orissa", "paradip", "puri", "gopalpur", "dhamra"],
    "West Bengal":       ["bengal", "kolkata", "sagar", "digha", "haldia"],
    "Andaman":           ["andaman", "nicobar", "port blair"],
    "Lakshadweep":       ["lakshadweep", "minicoy", "agatti"],
}


def _alert_relevant_to_location(alert: Dict, location: Location) -> bool:
    """Return True if this alert's area_desc covers the queried location.

    Matching logic:
      1. Empty area_desc → assume nationwide → always relevant.
      2. area_desc contains the location name → relevant.
      3. area_desc contains a keyword from the location's state coast list → relevant.
      4. No match → not relevant (alert is for a different coast).
    """
    area = (alert.get("area_desc") or "").lower()
    if not area:
        return True  # nationwide / no area info → conservative, keep it

    # Direct name match
    if location.name.lower() in area:
        return True

    # State keyword match
    keywords = _COASTAL_KEYWORDS.get(location.state or "", [])
    if any(kw in area for kw in keywords):
        return True

    # Also match on location name fragments (e.g. "Paradip" → "paradip")
    loc_words = [w for w in location.name.lower().split() if len(w) > 3]
    if any(w in area for w in loc_words):
        return True

    return False


def _cap_alerts_to_agent_format(cap_alerts: List[Dict]) -> List[Dict]:
    """Convert CAP RSS alert dicts to the format expected by the risk engine."""
    result = []
    for a in cap_alerts:
        result.append({
            "severity": a.get("severity", "moderate"),
            "official": a.get("official", True),
            "headline": a.get("headline", "IMD Marine Advisory"),
            "area_desc": a.get("area_desc", ""),
            "onset": a.get("onset"),
            "expires": a.get("expires"),
            "source": a.get("source", "IMD_CAP"),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
    return result


@timed
def run(location: Location, when: datetime) -> AgentResult:
    stamp = when.isoformat(timespec="seconds")
    alerts: List[Dict] = []
    source = "DEMO"
    mode = "DEMO"

    if live_enabled():
        # Primary: IMD CAP RSS feed — filter to alerts relevant for this location
        try:
            from ..data.advisory_scraper import scrape_imd_cap_rss
            cap_alerts = scrape_imd_cap_rss()
            relevant = [a for a in cap_alerts if _alert_relevant_to_location(a, location)]
            if relevant:
                alerts = _cap_alerts_to_agent_format(relevant)
                source = "IMD_CAP"
                mode = "LIVE"
                stamp = datetime.now(timezone.utc).isoformat()
        except Exception:
            pass

        # Secondary: GDACS if IMD CAP returned nothing for this location
        if not alerts:
            try:
                from ..data.live_client import fetch_gdacs
                gdacs_entries = fetch_gdacs()
                for entry in gdacs_entries:
                    # GDACS entries don't have fine-grained area_desc — keep all
                    # (they are already filtered to Indian Ocean events in live_client)
                    alerts.append({
                        "severity": "severe" if entry.get("alert_level", "").lower() in ("red", "orange") else "moderate",
                        "official": True,
                        "headline": entry.get("title", "GDACS Marine Event"),
                        "area_desc": entry.get("description", ""),
                        "onset": entry.get("pub_date"),
                        "expires": None,
                        "source": "GDACS",
                        "timestamp": stamp,
                    })
                if gdacs_entries:
                    source = "GDACS"
                    mode = "LIVE"
            except Exception:
                pass

        # In LIVE mode: no alerts found = genuinely no warnings for this coast.
        # Do NOT fall through to demo data — that would mix fictional cyclones
        # with real ocean conditions and is explicitly prohibited.
        if not alerts:
            source = "IMD_CAP"
            mode = "LIVE"

    else:
        # DEMO mode only: use the demo store
        if not alerts:
            alerts = demo_store.alerts(location.name, when)
            source = "DEMO"
            mode = "DEMO"

    alerts.sort(key=lambda a: SEVERITY_RANK.get(str(a.get("severity")).lower(), 0), reverse=True)
    worst = alerts[0] if alerts else None
    official = any(a.get("official") for a in alerts)

    return AgentResult(
        agent="cyclone",
        ok=True,
        location=location,
        data={
            "alerts": alerts,
            "count": len(alerts),
            "official_warning_active": official,
            "highest_severity": (worst or {}).get("severity"),
            "headline": (worst or {}).get("headline"),
        },
        source=source,
        timestamp=stamp,
        confidence=0.95 if alerts else 0.8,
        mode=mode,  # type: ignore[arg-type]
    )
