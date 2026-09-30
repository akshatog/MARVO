"""Cached demo datasets — the reason MARVO cannot be killed by stage Wi-Fi.

Design choice: demo conditions are keyed by HOUR OF DAY, not absolute date, so
"tomorrow 6 AM" and "today 6 AM" both resolve to the same rehearsed sea state.
Every value returned from here is stamped source="DEMO" and carries the
disclaimer text — synthetic data is never dressed up as an official feed.

Scenario is selected by the place the user asks about:

    Paradip     → Cyclone Dana (Oct 2024), storm track on map    (EXTREME)
    Mumbai      → SW Monsoon squall, clears after 14:00 IST      (HIGH → moderate)
    Chennai     → NE Monsoon fishing season, excellent PFZ        (LOW)
    Veraval     → Cyclone Biparjoy pre-landfall (Jun 2023)        (EXTREME)
    Kochi       → Kerala post-monsoon upwelling, good fishing     (MODERATE)

Each scenario is grounded in a documented real event and tests a different
branch of the MARVO decision pipeline.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

from ..config import DEMO_DISCLAIMER
from .geo import (PORTS, compass, bearing_deg, destination, haversine_km,
                  is_on_land, nearest_port, seaward_bearing)

IST = timezone(timedelta(hours=5, minutes=30))


def now_ist() -> datetime:
    return datetime.now(IST)


def iso(dt: Optional[datetime] = None) -> str:
    return (dt or now_ist()).isoformat(timespec="seconds")


# --------------------------------------------------------------------------
# Hourly keyframes per scenario.  hour -> conditions
# --------------------------------------------------------------------------
Keyframes = Dict[int, Dict[str, float]]

SCENARIOS: Dict[str, Dict] = {

    # ── SCENARIO 1 ──────────────────────────────────────────────────────────
    # Cyclone Dana — Odisha Coast, Bay of Bengal
    # Real event: Severe Cyclonic Storm DANA made landfall near Bhitarkanika /
    # Dhamra, Odisha on 24-25 October 2024. IMD issued an Orange alert for
    # north Odisha coast; INCOIS issued a High Wave Alert (4.5–6.0 m).
    # Fishermen were advised not to venture into the sea from 23 Oct onward.
    # This keyframe represents 24 Oct 2024 — the day before landfall, when
    # conditions were most dangerous for any boat still at sea.
    #
    # Tests: risk floor → EXTREME (92), two simultaneous active alerts,
    #        storm track rendered on map, SSE voice output "do not go out".
    # ────────────────────────────────────────────────────────────────────────
    "cyclone_dana": {
        "label": "Cyclone Dana — Odisha coast (24 Oct 2024)",
        "keyframes": {
            0:  {"wave": 4.8, "period": 10.2, "wind": 92,  "wind_dir": 115, "rain": 94,
                 "visibility": 1.2, "sst": 29.3, "current": 1.75, "chl": 0.48},
            6:  {"wave": 5.4, "period": 10.8, "wind": 105, "wind_dir": 108, "rain": 97,
                 "visibility": 0.8, "sst": 29.4, "current": 1.95, "chl": 0.45},
            12: {"wave": 5.8, "period": 11.0, "wind": 112, "wind_dir": 100, "rain": 98,
                 "visibility": 0.6, "sst": 29.4, "current": 2.10, "chl": 0.44},
            18: {"wave": 5.2, "period": 10.5, "wind": 98,  "wind_dir": 95,  "rain": 95,
                 "visibility": 1.0, "sst": 29.3, "current": 1.85, "chl": 0.46},
            23: {"wave": 4.5, "period": 10.0, "wind": 85,  "wind_dir": 90,  "rain": 91,
                 "visibility": 1.4, "sst": 29.2, "current": 1.65, "chl": 0.50},
        },
        "alerts": [
            {
                # Primary IMD cyclone bulletin (actual text from 24 Oct 2024 bulletin)
                "type": "cyclone_warning",
                "severity": "severe",
                "official": True,
                "active_hours": (0, 24),
                "headline": "Severe Cyclonic Storm DANA — Orange alert for north Odisha coast",
                "detail": (
                    "Severe Cyclonic Storm DANA over northwest Bay of Bengal. "
                    "Likely to make landfall near Bhitarkanika–Dhamra coast on 25 October. "
                    "Fishermen are advised NOT to venture into sea and to return to coast immediately. "
                    "Wind speed 95–105 kmph, gusts up to 115 kmph."
                ),
                "source": "IMD",
                # Storm position and forecast track (24 Oct 2024, ~12 UTC)
                # Dana originated in the Bay of Bengal ~15°N and tracked NNW
                "storm": {
                    "latitude": 20.1, "longitude": 87.2, "radius_km": 200,
                    "track": [
                        {"latitude": 16.5, "longitude": 90.5, "label": "-48 h"},
                        {"latitude": 17.8, "longitude": 89.3, "label": "-24 h"},
                        {"latitude": 19.0, "longitude": 88.2, "label": "-12 h"},
                        {"latitude": 20.1, "longitude": 87.2, "label": "now"},
                        {"latitude": 21.1, "longitude": 86.3, "label": "+12 h"},
                        {"latitude": 21.8, "longitude": 85.5, "label": "+24 h (landfall)"},
                    ],
                },
            },
            {
                # INCOIS High Wave Alert issued simultaneously
                "type": "high_wave_alert",
                "severity": "high",
                "official": True,
                "active_hours": (0, 24),
                "headline": "INCOIS High Wave Alert — wave height 4.5–6.0 m off Odisha coast",
                "detail": (
                    "INCOIS High Wave Alert in force along Odisha coast. "
                    "Significant wave height 4.5–6.0 m expected. "
                    "All fishing activity suspended."
                ),
                "source": "INCOIS",
            },
        ],
    },

    # ── SCENARIO 2 ──────────────────────────────────────────────────────────
    # Southwest Monsoon Squall — Maharashtra / Mumbai Coast
    # Real pattern: Arabian Sea monsoon squall, June–September every year.
    # IMD issues fishermen warnings when wind speed over north Maharashtra
    # coast exceeds 35 kmph. Squalls typically build overnight and by morning,
    # and moderate through the afternoon as the monsoon trough shifts.
    # IMD Fishermen Warning active 00:00–14:00 IST, then expires.
    #
    # Tests: 24-hour risk timeline colour change, next_improvement_hour() = 14,
    #        SSE stream shows risk score dropping, "leave after 2 PM" advice.
    # ────────────────────────────────────────────────────────────────────────
    "monsoon_squall_clearing": {
        "label": "SW Monsoon squall, clears after 14:00 IST — Maharashtra coast",
        "keyframes": {
            0:  {"wave": 2.4, "period": 7.0, "wind": 37, "wind_dir": 225, "rain": 72,
                 "visibility": 5.0, "sst": 27.6, "current": 0.90, "chl": 1.35},
            6:  {"wave": 2.6, "period": 6.8, "wind": 40, "wind_dir": 230, "rain": 78,
                 "visibility": 4.5, "sst": 27.5, "current": 0.95, "chl": 1.40},
            11: {"wave": 2.1, "period": 7.2, "wind": 32, "wind_dir": 235, "rain": 55,
                 "visibility": 7.0, "sst": 27.8, "current": 0.72, "chl": 1.32},
            14: {"wave": 1.4, "period": 7.8, "wind": 22, "wind_dir": 245, "rain": 25,
                 "visibility": 11.0, "sst": 28.2, "current": 0.48, "chl": 1.28},
            18: {"wave": 1.2, "period": 8.0, "wind": 18, "wind_dir": 252, "rain": 18,
                 "visibility": 12.5, "sst": 28.4, "current": 0.40, "chl": 1.24},
            23: {"wave": 1.6, "period": 7.2, "wind": 26, "wind_dir": 238, "rain": 38,
                 "visibility":  9.0, "sst": 27.9, "current": 0.58, "chl": 1.30},
        },
        "alerts": [
            {
                "type": "fishermen_warning",
                "severity": "moderate",
                "official": True,
                "active_hours": (0, 14),          # expires at 14:00 IST
                "headline": "IMD Fishermen Warning — squally weather over north Maharashtra coast",
                "detail": (
                    "Squally weather with wind speed reaching 35–45 kmph very likely "
                    "over the north Maharashtra coast. Strong winds and rough seas expected "
                    "until afternoon. Fishermen advised not to venture into the sea before 14:00 IST."
                ),
                "source": "IMD",
                # Monsoon squall belt — warning circle (no storm track, it's a belt not a cyclone)
                "storm": {"latitude": 19.40, "longitude": 72.20, "radius_km": 110, "track": []},
            }
        ],
    },

    # ── SCENARIO 3 ──────────────────────────────────────────────────────────
    # Northeast Monsoon Fishing Season — Tamil Nadu / Bay of Bengal
    # Real pattern: Nov–Feb every year. The NE monsoon brings calm seas to
    # the Bay of Bengal while driving cold, nutrient-rich upwelling along the
    # Tamil Nadu shelf. INCOIS PFZ advisories consistently show productive
    # zones 40–80 km off the Tamil Nadu coast. Chlorophyll peaks at 2.0–2.5
    # mg/m³. Skipjack tuna, Indian mackerel, and ribbonfish are the catch.
    # No active warnings — this is the fishermen's best window of the year.
    #
    # Tests: full positive decision path (GO, SAFE), PFZ with 3 ranked
    #        zones on map, HSI fishing model picks the best zone.
    # ────────────────────────────────────────────────────────────────────────
    "ne_monsoon_fishing": {
        "label": "NE Monsoon fishing season — Bay of Bengal (Tamil Nadu)",
        "keyframes": {
            0:  {"wave": 0.6, "period": 9.2, "wind": 14, "wind_dir": 45, "rain": 5,
                 "visibility": 16.0, "sst": 27.8, "current": 0.22, "chl": 2.15},
            6:  {"wave": 0.7, "period": 9.4, "wind": 16, "wind_dir": 50, "rain": 6,
                 "visibility": 15.5, "sst": 27.7, "current": 0.25, "chl": 2.20},
            12: {"wave": 0.9, "period": 9.0, "wind": 19, "wind_dir": 48, "rain": 8,
                 "visibility": 14.5, "sst": 28.1, "current": 0.28, "chl": 2.10},
            18: {"wave": 0.8, "period": 9.2, "wind": 17, "wind_dir": 45, "rain": 6,
                 "visibility": 15.0, "sst": 28.0, "current": 0.24, "chl": 2.12},
            23: {"wave": 0.6, "period": 9.4, "wind": 14, "wind_dir": 42, "rain": 4,
                 "visibility": 16.0, "sst": 27.8, "current": 0.22, "chl": 2.18},
        },
        "alerts": [],   # no warnings — this is the safe window
    },

    # ── SCENARIO 4 ──────────────────────────────────────────────────────────
    # Cyclone Biparjoy Pre-Landfall — Gujarat / Saurashtra Coast
    # Real event: Extremely Severe Cyclonic Storm BIPARJOY formed in the
    # Arabian Sea and made landfall near Jakhau Port, Kutch, Gujarat on
    # 15 June 2023 at ~18:30 IST. Wind speed at landfall: 125–135 kmph.
    # This keyframe represents 14 June 2023, the day before landfall —
    # the Gujarat Coast Guard had already ordered all fishing vessels to
    # return to harbour. Veraval and Jakhau ports were closed.
    #
    # Tests: Arabian Sea coast (different geography from Bay of Bengal),
    #        Coast Guard warning type, Hindi language path for Gujarat demo.
    # ────────────────────────────────────────────────────────────────────────
    "biparjoy_warning": {
        "label": "Cyclone Biparjoy pre-landfall — Gujarat coast (14 Jun 2023)",
        "keyframes": {
            0:  {"wave": 3.8, "period": 9.8, "wind": 88,  "wind_dir": 175, "rain": 82,
                 "visibility": 2.5, "sst": 29.8, "current": 1.55, "chl": 0.42},
            6:  {"wave": 4.2, "period": 10.2, "wind": 95,  "wind_dir": 170, "rain": 88,
                 "visibility": 2.0, "sst": 29.9, "current": 1.70, "chl": 0.40},
            12: {"wave": 4.8, "period": 10.5, "wind": 102, "wind_dir": 165, "rain": 92,
                 "visibility": 1.5, "sst": 30.0, "current": 1.85, "chl": 0.38},
            18: {"wave": 4.5, "period": 10.2, "wind": 97,  "wind_dir": 160, "rain": 88,
                 "visibility": 2.0, "sst": 29.9, "current": 1.72, "chl": 0.40},
            23: {"wave": 4.0, "period":  9.8, "wind": 90,  "wind_dir": 170, "rain": 84,
                 "visibility": 2.4, "sst": 29.8, "current": 1.58, "chl": 0.41},
        },
        "alerts": [
            {
                # Gujarat Coast Guard order — all vessels return to port
                "type": "coast_guard_warning",
                "severity": "severe",
                "official": True,
                "active_hours": (0, 24),
                "headline": "Coast Guard — All fishing vessels ordered to return to harbour immediately",
                "detail": (
                    "The Indian Coast Guard has directed all fishing boats off the Gujarat coast "
                    "to return to the nearest harbour. Extremely Severe Cyclonic Storm BIPARJOY "
                    "is tracking NNE toward the Saurashtra coast. Wind speed 125–135 kmph at "
                    "centre. Veraval and Jakhau ports have been closed to all traffic."
                ),
                "source": "Coast Guard",
                # Biparjoy position on 14 Jun 2023 (~12 UTC): ~21.5°N, 67.5°E
                # Tracking NNE toward Jakhau (23.2°N, 68.8°E)
                "storm": {
                    "latitude": 21.5, "longitude": 67.5, "radius_km": 250,
                    "track": [
                        {"latitude": 18.0, "longitude": 66.8, "label": "-48 h"},
                        {"latitude": 19.8, "longitude": 66.9, "label": "-24 h"},
                        {"latitude": 20.7, "longitude": 67.2, "label": "-12 h"},
                        {"latitude": 21.5, "longitude": 67.5, "label": "now"},
                        {"latitude": 22.5, "longitude": 68.0, "label": "+12 h"},
                        {"latitude": 23.2, "longitude": 68.8, "label": "+24 h (landfall)"},
                    ],
                },
            },
            {
                # IMD Extremely Severe bulletin
                "type": "cyclone_warning",
                "severity": "severe",
                "official": True,
                "active_hours": (0, 24),
                "headline": "Extremely Severe Cyclonic Storm BIPARJOY — Red alert Gujarat coast",
                "detail": (
                    "IMD Bulletin: ESCS BIPARJOY over the north Arabian Sea. "
                    "Expected to make landfall near Jakhau–Mandvi coast on 15 June evening. "
                    "Red alert issued. Fishermen must NOT venture into the sea under any circumstances."
                ),
                "source": "IMD",
            },
        ],
    },

    # ── SCENARIO 5 ──────────────────────────────────────────────────────────
    # Kerala Post-Monsoon Upwelling — Kochi / Lakshadweep Sea
    # Real pattern: October–November, southwest monsoon retreating. Ekman
    # pumping (wind-driven upwelling) along the Kerala shelf brings cold,
    # nutrient-rich water to the surface. Chlorophyll 1.7–2.0 mg/m³.
    # SST ~28.5–29°C with a productive thermal front 35–55 km offshore.
    # Moderate swells remain from the retreating monsoon. No warnings active.
    #
    # Tests: nuanced MODERATE decision ("go, but take care"), PFZ shows the
    #        offshore thermal front, route planner active, authority view.
    # ────────────────────────────────────────────────────────────────────────
    "moderate_offshore": {
        "label": "Kerala post-monsoon upwelling — productive but moderate swell",
        "keyframes": {
            0:  {"wave": 1.4, "period": 8.2, "wind": 20, "wind_dir": 242, "rain": 28,
                 "visibility": 11.0, "sst": 28.8, "current": 0.48, "chl": 1.82},
            6:  {"wave": 1.3, "period": 8.4, "wind": 18, "wind_dir": 248, "rain": 22,
                 "visibility": 12.0, "sst": 28.7, "current": 0.44, "chl": 1.88},
            12: {"wave": 1.6, "period": 8.0, "wind": 23, "wind_dir": 255, "rain": 32,
                 "visibility": 10.5, "sst": 29.2, "current": 0.52, "chl": 1.78},
            18: {"wave": 1.5, "period": 8.2, "wind": 21, "wind_dir": 250, "rain": 28,
                 "visibility": 11.0, "sst": 29.0, "current": 0.48, "chl": 1.75},
            23: {"wave": 1.3, "period": 8.3, "wind": 19, "wind_dir": 244, "rain": 24,
                 "visibility": 11.5, "sst": 28.8, "current": 0.45, "chl": 1.80},
        },
        "alerts": [],   # no active warnings — moderate sea state, good fishing
    },
}

# --------------------------------------------------------------------------
# Place → scenario mapping
# Every port that resolves to this scenario will share its sea state and
# alerts. Unknown places fall through to "moderate_offshore" (the default).
# --------------------------------------------------------------------------
PORT_SCENARIO: Dict[str, str] = {
    # Cyclone Dana — Odisha (EXTREME)
    "Paradip":           "cyclone_dana",
    "Digha":             "cyclone_dana",           # also Bay of Bengal, same event radius

    # SW Monsoon squall — Maharashtra (HIGH, time-dependent)
    "Mumbai":            "monsoon_squall_clearing",
    "Ratnagiri":         "monsoon_squall_clearing",

    # NE Monsoon excellent fishing — Bay of Bengal (LOW)
    "Chennai":           "ne_monsoon_fishing",
    "Visakhapatnam":     "ne_monsoon_fishing",
    "Port Blair":        "ne_monsoon_fishing",

    # Cyclone Biparjoy — Gujarat (EXTREME, Arabian Sea)
    "Veraval":           "biparjoy_warning",

    # Kerala upwelling — moderate/productive (MODERATE)
    "Kochi":             "moderate_offshore",
    "Panaji (Goa)":      "moderate_offshore",
}

# Lightning is scenario-level rather than hourly — only cyclone-force events
LIGHTNING_SCENARIOS = {"cyclone_dana", "biparjoy_warning"}

SEA_STATE_BANDS: List[Tuple[float, str, str]] = [
    (0.5,  "calm",           "शांत"),
    (1.25, "slight",         "किंचित"),
    (2.5,  "moderate",       "मध्यम"),
    (4.0,  "rough",          "खवळलेला"),
    (6.0,  "very rough",     "अतिशय खवळलेला"),
    (99.0, "phenomenal",     "अत्यंत धोकादायक"),
]


def sea_state(wave_m: float) -> str:
    for limit, label, _ in SEA_STATE_BANDS:
        if wave_m < limit:
            return label
    return "phenomenal"


# --------------------------------------------------------------------------
# Interpolation
# --------------------------------------------------------------------------
# Day-to-day drift so a 2-day forecast is a genuine forecast rather than the
# same day repeated. Day 1 settles, day 2 builds again — the pattern a fisher
# actually plans around.
DAY_MODIFIERS: Dict[int, Dict[str, float]] = {
    0: {"wave": 1.00, "wind": 1.00, "chl": 1.00, "rain": 1.00},
    1: {"wave": 0.78, "wind": 0.84, "chl": 1.10, "rain": 0.72},
    2: {"wave": 1.14, "wind": 1.10, "chl": 0.90, "rain": 1.18},
}


def day_offset(when: Optional[datetime]) -> int:
    """Whole days between `when` and today (IST), clamped to the forecast range."""
    if when is None:
        return 0
    return max(0, min(2, (when.date() - now_ist().date()).days))


def _interpolate(keyframes: Keyframes, hour: float) -> Dict[str, float]:
    hours = sorted(keyframes)
    lo = max([h for h in hours if h <= hour], default=hours[-1])
    hi = min([h for h in hours if h >= hour], default=hours[0])
    if lo == hi:
        return dict(keyframes[lo])
    span = (hi - lo) or 1
    t = (hour - lo) / span
    a, b = keyframes[lo], keyframes[hi]
    return {k: a[k] + (b[k] - a[k]) * t for k in a}


def scenario_for(location_name: str) -> str:
    return PORT_SCENARIO.get(location_name, "moderate_offshore")


def resolve_hour(when: Optional[datetime]) -> float:
    dt = when or now_ist()
    return dt.hour + dt.minute / 60.0


# --------------------------------------------------------------------------
# Public API used by the agents
# --------------------------------------------------------------------------
def conditions(location_name: str, when: Optional[datetime] = None) -> Dict:
    """Full synthetic condition set for a place/time."""
    key = scenario_for(location_name)
    sc = SCENARIOS[key]
    hour = resolve_hour(when)
    values = _interpolate(sc["keyframes"], hour)

    offset = day_offset(when)
    mod = DAY_MODIFIERS[offset]
    values["wave"] = round(values["wave"] * mod["wave"], 2)
    values["wind"] = round(values["wind"] * mod["wind"], 1)
    values["chl"]  = round(values["chl"]  * mod["chl"],  2)
    values["rain"] = min(100.0, round(values["rain"] * mod["rain"], 1))

    values["lightning"]      = key in LIGHTNING_SCENARIOS and values["rain"] > 70
    values["sea_state"]      = sea_state(values["wave"])
    values["scenario"]       = key
    values["scenario_label"] = sc["label"]
    values["day_offset"]     = offset
    values["disclaimer"]     = DEMO_DISCLAIMER
    return values


def alerts(location_name: str, when: Optional[datetime] = None) -> List[Dict]:
    """Active official-style warnings for a place/time (demo copies)."""
    key = scenario_for(location_name)
    hour = resolve_hour(when)
    out: List[Dict] = []
    for raw in SCENARIOS[key]["alerts"]:
        start, end = raw["active_hours"]
        if start <= hour < end:
            item = {k: v for k, v in raw.items() if k != "active_hours"}
            item["valid_till"]  = f"{end:02d}:00 IST"
            item["location"]    = location_name
            item["mode"]        = "DEMO"
            item["disclaimer"]  = DEMO_DISCLAIMER
            out.append(item)
    return out


def next_improvement_hour(location_name: str, from_hour: float) -> Optional[int]:
    """First hour after `from_hour` where the scenario becomes materially safer.

    Powers the 'conditions improve after 14:00, ask me again then' advice.
    """
    key = scenario_for(location_name)
    sc = SCENARIOS[key]
    base = _interpolate(sc["keyframes"], from_hour)
    for h in range(int(from_hour) + 1, 24):
        nxt = _interpolate(sc["keyframes"], h)
        calmer = nxt["wave"] <= base["wave"] - 0.4 and nxt["wind"] <= base["wind"] - 5
        warning_gone = not any(
            a["active_hours"][0] <= h < a["active_hours"][1] for a in sc["alerts"]
        )
        if calmer and warning_gone:
            return h
    return None


# Candidate grounds around the offshore arc. Deterministic (no RNG) so the same
# place always returns the same grounds — a fisher must be able to come back to
# "zone 2" tomorrow and find the same patch of sea.
#
# NOTE on sst_delta: it is the ground's temperature difference from the
# surrounding water, i.e. the strength of the thermal front. A delta of 0.0
# means flat, featureless water and scores BADLY however rich it is — an
# earlier version gave the nearest ground the best chlorophyll but no front,
# so the model ranked the richest patch of sea last.
#
# The shelf here is modelled with the productive water closer in and thinning
# offshore, which is the usual picture along this coast.
_CANDIDATE_LAYOUT = [
    {"d_bearing": -20, "distance":  31.0, "sst_delta":  0.90, "chl_mult": 1.00},
    {"d_bearing":  45, "distance":  38.0, "sst_delta":  0.70, "chl_mult": 0.90},
    {"d_bearing":  25, "distance":  46.5, "sst_delta": -0.60, "chl_mult": 0.84},
    {"d_bearing": -42, "distance":  54.0, "sst_delta":  0.50, "chl_mult": 0.78},
    {"d_bearing":   5, "distance":  62.0, "sst_delta":  0.45, "chl_mult": 0.72},
    {"d_bearing":  62, "distance":  71.0, "sst_delta": -0.35, "chl_mult": 0.68},
    {"d_bearing":  -8, "distance":  78.0, "sst_delta":  0.30, "chl_mult": 0.64},
    {"d_bearing": -58, "distance":  88.0, "sst_delta": -0.25, "chl_mult": 0.60},
    {"d_bearing":  33, "distance":  96.0, "sst_delta":  0.20, "chl_mult": 0.56},
]


def pfz_zones(lat: float, lon: float, location_name: str,
              when: Optional[datetime] = None, count: int = 3,
              radius_km: float = 100.0) -> List[Dict]:
    """Synthetic Potential Fishing Zone candidates within `radius_km`.

    Mirrors the INCOIS approach conceptually: zones sit on SST/chlorophyll
    fronts. Values here are SIMULATED — production MARVO parses the INCOIS PFZ
    advisory bulletin for the district.
    """
    cond = conditions(location_name, when)
    port = nearest_port(lat, lon)
    # The fan axis is wherever the most open water actually lies FROM THIS
    # POINT, not the nearest port's coast direction — a point inside the Gulf
    # of Khambhat is 'near Veraval', but its sea is down the gulf, not SSW
    # across the Saurashtra peninsula.
    offshore = seaward_bearing(lat, lon, prior=float(port.get("shore_bearing", 270)))

    zones: List[Dict] = []
    for i, spec in enumerate(_CANDIDATE_LAYOUT, start=1):
        if spec["distance"] > radius_km:
            continue
        # A fishing ground on land is nonsense (the on-screen equivalent of
        # recommending a wheat field), so a candidate that falls on land slides
        # along its distance arc toward the open-water axis until it is wet —
        # or is dropped. Distance is preserved, so ranking and trip maths
        # (which never use the bearing) are unaffected.
        placed = None
        off  = spec["d_bearing"]
        step = 18 if off <= 0 else -18
        for attempt in range(8):
            trial = off + attempt * step
            cand  = destination((lat, lon), (offshore + trial) % 360, spec["distance"])
            if not is_on_land(cand[0], cand[1]):
                placed = cand
                break
        if placed is None:
            continue
        plat, plon = placed
        actual_km = haversine_km((lat, lon), (plat, plon))
        if actual_km > radius_km:
            continue
        chl = round(cond["chl"] * spec["chl_mult"], 2)
        sst = round(cond["sst"] + spec["sst_delta"], 1)
        zones.append({
            "id":                  f"z{i}",
            "rank":                i,
            "latitude":            round(plat, 4),
            "longitude":           round(plon, 4),
            "distance_km":         round(actual_km, 1),
            "bearing":             compass(bearing_deg((lat, lon), (plat, plon))),
            "sst_c":               sst,
            "chlorophyll_mg_m3":   chl,
            "wave_height_m":       round(max(0.3, cond["wave"] - 0.25 - 0.03 * i), 2),
            "confidence":          0.0,   # filled in by services/fishing.py
            "rationale":           "",
            "source":              "DEMO",
            "disclaimer":          DEMO_DISCLAIMER,
        })
    return zones
