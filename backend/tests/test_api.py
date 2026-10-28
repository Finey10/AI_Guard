"""
tests/test_api.py — Integration tests for the FastAPI application.

Uses httpx.AsyncClient with ASGITransport to avoid spinning up a real server.
Timezone policy: proposed_deployment_time is submitted as ISO 8601 UTC ("Z" suffix).
"""
import sys
import os

# Ensure backend/ is on the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Point DATA_DIR at the backend/data folder regardless of cwd
os.environ.setdefault(
    "DATA_DIR",
    os.path.join(os.path.dirname(__file__), "..", "data"),
)

import pytest
import pytest_asyncio
import httpx
from httpx import AsyncClient, ASGITransport

from main import app


# ---------------------------------------------------------------------------
# Shared valid payload
# ---------------------------------------------------------------------------

VALID_PAYLOAD = {
    "service_name": "checkout-service",
    "change_size": "medium",
    "files_changed": 12,
    "observed_availability": 99.92,
    "error_rate_percent": 0.4,
    "latency_ms": 210,
    "latency_threshold_ms": 500,
    "recent_incidents_30d": 1,
    "proposed_deployment_time": "2026-10-28T10:00:00Z",
    "release_notes": "Promo engine refactor",
}


# ---------------------------------------------------------------------------
# Async test helpers
# ---------------------------------------------------------------------------

@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.asyncio
async def test_health_returns_ok():
    """GET /health → {"status": "ok"}."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_list_services_returns_list():
    """GET /api/services → non-empty list."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get("/api/services")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) > 0


@pytest.mark.asyncio
async def test_service_history_returns_list():
    """GET /api/services/checkout-service/history → list."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get("/api/services/checkout-service/history")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_service_history_nonexistent_returns_404():
    """GET /api/services/nonexistent-svc/history → 404."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get("/api/services/nonexistent-svc/history")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_analyze_release_valid_payload():
    """POST /api/analyze-release with valid payload → 200 with correct schema."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.post("/api/analyze-release", json=VALID_PAYLOAD)
    assert resp.status_code == 200
    data = resp.json()

    # Verify top-level keys
    assert "risk_score" in data
    assert "recommendation" in data
    assert "error_budget" in data
    assert "risk_factors" in data
    assert "summary" in data

    # Type checks
    assert isinstance(data["risk_score"], (int, float))
    assert 0 <= data["risk_score"] <= 100

    # risk_factors should be a list of objects
    assert isinstance(data["risk_factors"], list)
    assert len(data["risk_factors"]) == 5  # one per factor
    for factor in data["risk_factors"]:
        assert "name" in factor
        assert "contribution" in factor
        assert "description" in factor


@pytest.mark.asyncio
async def test_analyze_release_invalid_payload_returns_422():
    """POST /api/analyze-release with missing required fields → 422."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.post("/api/analyze-release", json={"service_name": "checkout-service"})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_analyze_release_recommendation_is_valid_enum():
    """Response recommendation must be one of GO, GO_WITH_SAFE_GUARD, WAIT."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.post("/api/analyze-release", json=VALID_PAYLOAD)
    assert resp.status_code == 200
    rec = resp.json()["recommendation"]
    assert rec in ("GO", "GO_WITH_SAFE_GUARD", "WAIT"), f"Unexpected recommendation: {rec}"


@pytest.mark.asyncio
async def test_analyze_release_wait_for_exhausted_budget():
    """When observed_availability is well below SLO → recommendation is WAIT."""
    payload = {**VALID_PAYLOAD, "observed_availability": 99.5}  # SLO is 99.9
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.post("/api/analyze-release", json=payload)
    assert resp.status_code == 200
    assert resp.json()["recommendation"] == "WAIT"


@pytest.mark.asyncio
async def test_analyze_release_unknown_service_returns_404():
    """POST /api/analyze-release with unknown service_name → 404."""
    payload = {**VALID_PAYLOAD, "service_name": "ghost-service"}
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.post("/api/analyze-release", json=payload)
    assert resp.status_code == 404
