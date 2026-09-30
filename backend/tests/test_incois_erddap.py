"""Tests for the INCOIS ERDDAP connector (incois_erddap.py).

Same split as test_mosdac_thredds.py:
  - Unit tests: run always (mocked HTTP, no network needed)
  - Integration tests: need ORCA_INTEGRATION_TESTS=1

Run unit tests only:
    cd backend && python -m pytest tests/test_incois_erddap.py -v

Run with live network:
    cd backend && ORCA_INTEGRATION_TESTS=1 python -m pytest tests/test_incois_erddap.py -v
"""
from __future__ import annotations

import os
from unittest.mock import MagicMock, patch

import pytest

from app.data.incois_erddap import (
    _parse_erddap_csv,
    clear_erddap_cache,
    fetch_chlorophyll_erddap,
    fetch_sst_erddap,
    griddap_point,
)

INTEGRATION = pytest.mark.skipif(
    os.getenv("ORCA_INTEGRATION_TESTS") != "1",
    reason="Set ORCA_INTEGRATION_TESTS=1 to run live network tests",
)

# ── Sample ERDDAP CSV ─────────────────────────────────────────────────────────

SAMPLE_ERDDAP_CSV = """\
time,latitude,longitude,chlor_a
UTC,degrees_north,degrees_east,mg m-3
2024-01-20T12:00:00Z,13.08,80.35,0.4821
"""

SAMPLE_SST_CSV = """\
time,latitude,longitude,sst
UTC,degrees_north,degrees_east,degree_C
2026-09-01T00:00:00Z,13.08,80.35,28.32
"""

FILL_ERDDAP_CSV = """\
time,latitude,longitude,chlor_a
UTC,degrees_north,degrees_east,mg m-3
2024-01-20T12:00:00Z,13.08,80.35,NaN
"""


# ── Unit tests: _parse_erddap_csv ─────────────────────────────────────────────

class TestParseErddapCsv:
    def test_parses_data_row(self):
        rows = _parse_erddap_csv(SAMPLE_ERDDAP_CSV)
        assert len(rows) == 1
        assert rows[0]["chlor_a"] == pytest.approx(0.4821, rel=1e-3)

    def test_nan_becomes_none(self):
        rows = _parse_erddap_csv(FILL_ERDDAP_CSV)
        assert len(rows) == 1
        assert rows[0]["chlor_a"] is None

    def test_units_stored_in_meta(self):
        rows = _parse_erddap_csv(SAMPLE_ERDDAP_CSV)
        assert "_units" in rows[0]
        assert rows[0]["_units"]["chlor_a"] == "mg m-3"

    def test_fewer_than_3_lines_returns_empty(self):
        assert _parse_erddap_csv("time,chlor_a\nUTC,mg m-3\n") == []

    def test_empty_string_returns_empty(self):
        assert _parse_erddap_csv("") == []


# ── Unit tests: griddap_point (mocked HTTP) ───────────────────────────────────

class TestGriddapPoint:
    def setup_method(self):
        clear_erddap_cache()

    def _mock_response(self, text: str, status: int = 200):
        resp = MagicMock()
        resp.status_code = status
        resp.text = text
        return resp

    def test_returns_parsed_rows_on_200(self):
        with patch("app.data.incois_erddap._http") as mock_http:
            mock_http.return_value.get.return_value = self._mock_response(SAMPLE_ERDDAP_CSV)
            rows = griddap_point(
                dataset_id="IRS_chlorophyll_datasets",
                variable="chlor_a",
                lat=13.08, lon=80.35,
            )
        assert len(rows) == 1
        assert rows[0]["chlor_a"] == pytest.approx(0.4821, rel=1e-3)

    def test_returns_empty_on_http_error(self):
        with patch("app.data.incois_erddap._http") as mock_http:
            mock_http.return_value.get.return_value = self._mock_response("", status=500)
            rows = griddap_point(
                dataset_id="IRS_chlorophyll_datasets",
                variable="chlor_a",
                lat=13.08, lon=80.35,
            )
        assert rows == []

    def test_returns_empty_on_exception(self):
        with patch("app.data.incois_erddap._http") as mock_http:
            mock_http.return_value.get.side_effect = ConnectionError("timeout")
            rows = griddap_point(
                dataset_id="IRS_chlorophyll_datasets",
                variable="chlor_a",
                lat=13.08, lon=80.35,
            )
        assert rows == []

    def test_caching(self):
        with patch("app.data.incois_erddap._http") as mock_http:
            mock_http.return_value.get.return_value = self._mock_response(SAMPLE_ERDDAP_CSV)
            griddap_point("IRS_chlorophyll_datasets", "chlor_a", lat=13.08, lon=80.35)
            griddap_point("IRS_chlorophyll_datasets", "chlor_a", lat=13.08, lon=80.35)
        assert mock_http.return_value.get.call_count == 1, "Second call should be cached"


# ── Unit tests: fetch_chlorophyll_erddap ─────────────────────────────────────

class TestFetchChlorophyllErddap:
    def setup_method(self):
        clear_erddap_cache()

    def test_returns_float_on_success(self):
        with patch("app.data.incois_erddap.griddap_point") as mock_gp:
            mock_gp.return_value = [{"chlor_a": 0.4821, "_units": {}}]
            result = fetch_chlorophyll_erddap(13.08, 80.35)
        assert result == pytest.approx(0.4821, rel=1e-3)

    def test_returns_none_when_erddap_empty(self):
        # griddap_point is called up to 3 times (IRS-P4, Oceansat-2, then NOAA fallback).
        # We must mock ALL three paths — using side_effect to return [] for each
        # griddap_point call and also stub the NOAA fallback so no network hits occur.
        with patch("app.data.incois_erddap.griddap_point", side_effect=[[], []]) as _mock_gp, \
             patch("app.data.incois_erddap.fetch_chlorophyll_noaa_coastwatch", return_value=None):
            result = fetch_chlorophyll_erddap(13.08, 80.35)
        assert result is None

    def test_returns_none_when_nan(self):
        # griddap_point cascades through 2 datasets + NOAA fallback — mock all paths.
        with patch("app.data.incois_erddap.griddap_point",
                   side_effect=[[{"chlor_a": None, "_units": {}}], []]), \
             patch("app.data.incois_erddap.fetch_chlorophyll_noaa_coastwatch", return_value=None):
            result = fetch_chlorophyll_erddap(13.08, 80.35)
        assert result is None

    def test_rejects_implausible_high_value(self):
        # Both INCOIS datasets return 999 (implausible); NOAA fallback also stubbed None.
        with patch("app.data.incois_erddap.griddap_point",
                   side_effect=[[{"chlor_a": 999.0, "_units": {}}], [{"chlor_a": 999.0, "_units": {}}]]), \
             patch("app.data.incois_erddap.fetch_chlorophyll_noaa_coastwatch", return_value=None):
            result = fetch_chlorophyll_erddap(13.08, 80.35)
        assert result is None

    def test_rejects_negative_value(self):
        # Both INCOIS datasets return negative (invalid); NOAA fallback stubbed None.
        with patch("app.data.incois_erddap.griddap_point",
                   side_effect=[[{"chlor_a": -0.5, "_units": {}}], [{"chlor_a": -0.5, "_units": {}}]]), \
             patch("app.data.incois_erddap.fetch_chlorophyll_noaa_coastwatch", return_value=None):
            result = fetch_chlorophyll_erddap(13.08, 80.35)
        assert result is None

    def test_tries_oceansat2_when_irs_fails(self):
        """When IRS_chlorophyll_datasets returns empty, falls back to Oceansat-2."""
        call_count = {"n": 0}

        def side_effect(dataset_id, **kwargs):
            call_count["n"] += 1
            if dataset_id == "IRS_chlorophyll_datasets":
                return []
            return [{"chlor_a": 0.3, "_units": {}}]

        with patch("app.data.incois_erddap.griddap_point", side_effect=side_effect):
            result = fetch_chlorophyll_erddap(13.08, 80.35)
        assert result == pytest.approx(0.3, rel=0.01)
        assert call_count["n"] == 2


# ── Unit tests: fetch_sst_erddap ─────────────────────────────────────────────

class TestFetchSstErddap:
    def setup_method(self):
        clear_erddap_cache()

    def test_returns_float_on_success(self):
        with patch("app.data.incois_erddap.griddap_point") as mock_gp:
            mock_gp.return_value = [{"sst": 28.32, "_units": {}}]
            result = fetch_sst_erddap(13.08, 80.35)
        assert result == pytest.approx(28.32, rel=1e-3)

    def test_rejects_implausible_sst(self):
        with patch("app.data.incois_erddap.griddap_point") as mock_gp:
            mock_gp.return_value = [{"sst": 100.0, "_units": {}}]
            result = fetch_sst_erddap(13.08, 80.35)
        assert result is None

    def test_returns_none_on_empty(self):
        with patch("app.data.incois_erddap.griddap_point") as mock_gp:
            mock_gp.return_value = []
            result = fetch_sst_erddap(13.08, 80.35)
        assert result is None


# ── Integration tests: live INCOIS ERDDAP ─────────────────────────────────────

@INTEGRATION
class TestIncoisErddapIntegration:
    def setup_method(self):
        clear_erddap_cache()

    def test_chlorophyll_live(self):
        """Verify the ERDDAP endpoint is reachable and returns a plausible value."""
        result = fetch_chlorophyll_erddap(13.08, 80.35)
        # IRS chlorophyll is archival; a None is acceptable if the dataset has
        # no data for this grid cell. Verify no exception is raised.
        if result is not None:
            assert 0 < result < 100, f"Implausible chlorophyll value: {result}"

    def test_griddap_point_live(self):
        rows = griddap_point(
            dataset_id="IRS_chlorophyll_datasets",
            variable="chlor_a",
            lat=13.08, lon=80.35,
        )
        # Rows may be empty if cell is cloud-masked; just verify no exception.
        assert isinstance(rows, list)
