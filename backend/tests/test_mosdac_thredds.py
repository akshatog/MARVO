"""Tests for the MOSDAC THREDDS NCSS connector (mosdac_thredds.py).

Tests are split into:
  1. Unit tests — test parsers with pre-baked CSV strings (no network).
  2. Integration tests — marked with @pytest.mark.integration; skipped by
     default, run only when ORCA_INTEGRATION_TESTS=1 is set.  These hit the
     real MOSDAC endpoint.

Run unit tests only (fast, CI-safe):
    cd backend && python -m pytest tests/test_mosdac_thredds.py -v

Run with live network:
    cd backend && ORCA_INTEGRATION_TESTS=1 python -m pytest tests/test_mosdac_thredds.py -v
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest

from app.data.mosdac_thredds import (
    _haversine_km,
    _is_fill,
    _merge_rows,
    clear_thredds_cache,
    fetch_waves_mosdac,
    ncss_point,
    parse_ncss_csv,
    time_span,
)

INTEGRATION = pytest.mark.skipif(
    os.getenv("ORCA_INTEGRATION_TESTS") != "1",
    reason="Set ORCA_INTEGRATION_TESTS=1 to run live network tests",
)

# ── Sample data ────────────────────────────────────────────────────────────────

SAMPLE_NCSS_CSV = """\
time,SWH[unit="m"],MWPER[unit="s"],UWIND[unit="m/s"],VWIND[unit="m/s"]
2026-09-21T00:00:00Z,1.23,7.5,3.1,4.2
2026-09-21T06:00:00Z,1.45,8.0,3.5,4.8
"""

MULTIBLOCK_NCSS_CSV = """\
time,SWH[unit="m"]
2026-09-21T00:00:00Z,1.23

time,MWPER[unit="s"]
2026-09-21T00:00:00Z,7.5
"""

FILL_NCSS_CSV = """\
time,SWH[unit="m"]
2026-09-21T00:00:00Z,-9.999999848243207e+33
"""


# ── Unit tests: parse_ncss_csv ─────────────────────────────────────────────────

class TestParseNcssCsv:
    def test_parses_single_block(self):
        rows = parse_ncss_csv(SAMPLE_NCSS_CSV)
        assert len(rows) == 2
        assert rows[0]["SWH"] == pytest.approx(1.23, rel=1e-3)
        assert rows[0]["MWPER"] == pytest.approx(7.5, rel=1e-3)
        assert rows[0]["time"] == "2026-09-21T00:00:00Z"

    def test_strips_unit_annotations(self):
        rows = parse_ncss_csv(SAMPLE_NCSS_CSV)
        # Keys must not contain "[unit=...]"
        for row in rows:
            for key in row:
                assert "[" not in key

    def test_merges_multiblock(self):
        # parse_ncss_csv alone returns one row per block.
        # _merge_rows (used internally by ncss_point) combines them on "time".
        rows = _merge_rows(parse_ncss_csv(MULTIBLOCK_NCSS_CSV))
        assert len(rows) == 1, f"Expected 1 merged row, got {len(rows)}"
        assert rows[0].get("SWH") == pytest.approx(1.23, rel=1e-3)
        assert rows[0].get("MWPER") == pytest.approx(7.5, rel=1e-3)

    def test_fill_value_becomes_none(self):
        rows = parse_ncss_csv(FILL_NCSS_CSV)
        assert len(rows) == 1
        assert rows[0]["SWH"] is None, "Expected fill value ~-1e34 to be cleaned to None"

    def test_empty_string_returns_empty_list(self):
        assert parse_ncss_csv("") == []

    def test_header_only_returns_empty_list(self):
        assert parse_ncss_csv("time,SWH\n") == []


# ── Unit tests: _is_fill ──────────────────────────────────────────────────────

class TestIsFill:
    def test_large_negative_is_fill(self):
        assert _is_fill(-9.999e+33) is True

    def test_large_positive_is_fill(self):
        assert _is_fill(1.5e+34) is True

    def test_none_is_fill(self):
        assert _is_fill(None) is True

    def test_normal_wave_height_is_not_fill(self):
        assert _is_fill(1.23) is False

    def test_zero_is_not_fill(self):
        assert _is_fill(0.0) is False


# ── Unit tests: _haversine_km ─────────────────────────────────────────────────

class TestHaversineKm:
    def test_same_point_is_zero(self):
        assert _haversine_km(13.0, 80.0, 13.0, 80.0) == pytest.approx(0.0, abs=0.01)

    def test_known_distance(self):
        # Chennai (13.083, 80.270) to Pondicherry (11.934, 79.830) ≈ 136 km
        d = _haversine_km(13.083, 80.270, 11.934, 79.830)
        assert 130 < d < 145, f"Expected ~136 km, got {d:.1f} km"


# ── Unit tests: ncss_point (mocked HTTP) ─────────────────────────────────────

class TestNcssPoint:
    def setup_method(self):
        clear_thredds_cache()

    def _mock_response(self, text: str, status: int = 200):
        resp = MagicMock()
        resp.status_code = status
        resp.text = text
        return resp

    def test_returns_parsed_rows_on_200(self):
        when = datetime(2026, 9, 21, tzinfo=timezone.utc)
        with patch("app.data.mosdac_thredds._http") as mock_http:
            mock_http.return_value.get.return_value = self._mock_response(SAMPLE_NCSS_CSV)
            rows = ncss_point(
                "OSF_WAVE/SAC_OSF_WAVE_10KM.nc",
                ["SWH", "MWPER"],
                lat=13.0, lon=80.0,
                start=when, end=when,
            )
        assert len(rows) >= 1
        assert rows[0].get("SWH") is not None

    def test_returns_empty_on_http_error(self):
        when = datetime(2026, 9, 21, tzinfo=timezone.utc)
        with patch("app.data.mosdac_thredds._http") as mock_http:
            mock_http.return_value.get.return_value = self._mock_response("", status=400)
            rows = ncss_point(
                "OSF_WAVE/SAC_OSF_WAVE_10KM.nc",
                ["SWH"],
                lat=13.0, lon=80.0,
                start=when, end=when,
            )
        assert rows == []

    def test_returns_empty_on_exception(self):
        when = datetime(2026, 9, 21, tzinfo=timezone.utc)
        with patch("app.data.mosdac_thredds._http") as mock_http:
            mock_http.return_value.get.side_effect = ConnectionError("timeout")
            rows = ncss_point(
                "OSF_WAVE/SAC_OSF_WAVE_10KM.nc",
                ["SWH"],
                lat=13.0, lon=80.0,
                start=when, end=when,
            )
        assert rows == []

    def test_caching(self):
        when = datetime(2026, 9, 21, tzinfo=timezone.utc)
        with patch("app.data.mosdac_thredds._http") as mock_http:
            mock_http.return_value.get.return_value = self._mock_response(SAMPLE_NCSS_CSV)
            ncss_point(
                "OSF_WAVE/SAC_OSF_WAVE_10KM.nc",
                ["SWH"],
                lat=13.0, lon=80.0,
                start=when, end=when,
            )
            ncss_point(
                "OSF_WAVE/SAC_OSF_WAVE_10KM.nc",
                ["SWH"],
                lat=13.0, lon=80.0,
                start=when, end=when,
            )
        # Second call must be served from cache — only one HTTP call
        assert mock_http.return_value.get.call_count == 1


# ── Unit tests: fetch_waves_mosdac (mocked) ───────────────────────────────────

class TestFetchWavesMosdac:
    def setup_method(self):
        clear_thredds_cache()

    def test_returns_none_when_ncss_returns_empty(self):
        when = datetime(2026, 9, 21, tzinfo=timezone.utc)
        with patch("app.data.mosdac_thredds.ncss_point_nearest_wet") as mock_ncss:
            mock_ncss.return_value = ([], 13.0, 80.0, 0.0)
            result = fetch_waves_mosdac(13.0, 80.0, when)
        assert result is None

    def test_returns_dict_with_correct_keys(self):
        when = datetime(2026, 9, 21, tzinfo=timezone.utc)
        fake_rows = [{
            "time": "2026-09-21T00:00:00Z",
            "SWH": 1.23,
            "MWPER": 7.5,
            "UWIND": 3.1,
            "VWIND": 4.2,
        }]
        with patch("app.data.mosdac_thredds.ncss_point_nearest_wet") as mock_ncss:
            with patch("app.data.mosdac_thredds._is_stale") as mock_stale:
                mock_ncss.return_value = (fake_rows, 13.0, 80.0, 0.0)
                mock_stale.return_value = (False, "")
                result = fetch_waves_mosdac(13.0, 80.0, when)
        assert result is not None
        assert result["wave_height_m"] == pytest.approx(1.23, rel=1e-3)
        assert result["wave_period_s"] == pytest.approx(7.5, rel=1e-3)
        assert result["provider"] == "MOSDAC/ISRO (OSF_WAVE)"
        assert "wind_speed_kmh" in result

    def test_includes_move_note_when_spiraled(self):
        when = datetime(2026, 9, 21, tzinfo=timezone.utc)
        fake_rows = [{"time": "2026-09-21T00:00:00Z", "SWH": 1.0, "MWPER": 6.0,
                      "UWIND": 0.0, "VWIND": 0.0}]
        with patch("app.data.mosdac_thredds.ncss_point_nearest_wet") as mock_ncss:
            with patch("app.data.mosdac_thredds._is_stale") as mock_stale:
                mock_ncss.return_value = (fake_rows, 13.25, 80.0, 27.8)  # moved 27.8 km
                mock_stale.return_value = (False, "")
                result = fetch_waves_mosdac(13.0, 80.0, when)
        assert result is not None
        assert result.get("data_moved_km") == pytest.approx(27.8, rel=0.1)
        assert "note" in result


# ── Integration tests: live MOSDAC endpoints ──────────────────────────────────

@INTEGRATION
class TestMosdacIntegration:
    """These tests hit the real MOSDAC THREDDS server.

    They verify that the endpoint is reachable and returns parseable data.
    They are NOT asserts on specific values (those change daily).
    """

    def setup_method(self):
        clear_thredds_cache()

    def test_ncss_osf_wave_returns_data(self):
        from datetime import timedelta
        now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
        rows = ncss_point(
            "OSF_WAVE/SAC_OSF_WAVE_10KM.nc",
            ["SWH", "MWPER"],
            lat=13.08, lon=80.35,
            start=now - timedelta(hours=6),
            end=now + timedelta(hours=6),
        )
        # rows may be empty if the MOSDAC forecast cycle has aged out (> 48 h).
        # That is a valid operational state — the stale-cycle detection marks it
        # and the caller falls back to Open-Meteo. This test only checks that
        # the endpoint does not crash and returns a list.
        assert isinstance(rows, list), "NCSS query must return a list, never raise"
        if rows:
            # If there is data, SWH must be a number or None (fill-cleaned)
            swh = rows[0].get("SWH")
            assert swh is None or isinstance(swh, float), f"Unexpected SWH type: {type(swh)}"

    def test_fetch_waves_mosdac_live(self):
        when = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
        result = fetch_waves_mosdac(13.08, 80.35, when)
        # MOSDAC may return None if the cycle is stale or the point is land-masked;
        # that is acceptable — the fallback handles it. Just verify no exception.
        if result is not None:
            assert "wave_height_m" in result
            assert result["provider"].startswith("MOSDAC/ISRO")

    def test_time_span_osf_wave(self):
        span = time_span("OSF_WAVE/SAC_OSF_WAVE_10KM.nc")
        if span is not None:
            begin, end = span
            assert begin < end, "dataset.xml: begin must be before end"
