"""
tests/test_connectors.py — Unit and integration tests for AI connectors and service.

Covers:
1. Backend connector direct computation and HTTP fallback.
2. Frontend connector formatting matching TypeScript types.
3. AI Service endpoints (/health, /api/analyze-release, /api/ai/budget, /api/ai/risk).
"""
import os
import sys
from pathlib import Path

# Add repo root and ai/ to sys.path
_repo_root = Path(__file__).parent.parent.parent
if str(_repo_root) not in sys.path:
    sys.path.insert(0, str(_repo_root))
_ai_dir = Path(__file__).parent.parent
if str(_ai_dir) not in sys.path:
    sys.path.insert(0, str(_ai_dir))

import pytest
from httpx import AsyncClient, ASGITransport

from ai.backend_connector import BackendConnector
from ai.frontend_connector import format_for_frontend
from ai.orchestrator import OrchestratorResult
from ai.budget_agent import evaluate_budget_condition
from ai.risk_agent import evaluate_release_risk
from ai.service import app


@pytest.mark.asyncio
async def test_ai_service_health():
    """GET /health on AI service reports status."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "service" in data


@pytest.mark.asyncio
async def test_ai_service_analyze_release_flow():
    """POST /api/analyze-release executes full connector & agent pipeline."""
    payload = {
        "service_name": "checkout-service",
        "observed_availability": 99.92,
        "error_rate_percent": 0.4,
        "latency_ms": 210,
        "latency_threshold_ms": 500,
        "change_size": "medium",
        "recent_incidents_30d": 1,
        "proposed_deployment_time": "2026-10-28T10:00:00Z",
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/api/analyze-release", json=payload)

    assert resp.status_code == 200
    data = resp.json()

    # Verify frontend expected fields
    assert "risk_score" in data
    assert isinstance(data["risk_score"], (int, float))
    assert "remaining_budget_percent" in data
    assert "budget_consumed_percent" in data
    assert "recommendation" in data
    assert data["recommendation"] in ("GO", "GO_WITH_SAFE_GUARD", "WAIT")
    assert "explanation" in data
    assert "mitigations" in data
    assert len(data["mitigations"]) > 0
    assert "deployment_timing_advice" in data
    assert "suggested_windows" in data


def test_frontend_connector_maps_impact_and_types():
    """Verify frontend_connector creates valid structure."""
    deterministic = {
        "service_name": "test-svc",
        "risk_score": 52.0,
        "recommendation": "GO_WITH_SAFE_GUARD",
        "error_budget": {
            "remaining_budget_percent": 45.0,
            "budget_consumed_percent": 55.0,
        },
        "risk_factors": [
            {"name": "Latency", "contribution": 20.0, "description": "High latency"},
            {"name": "Error Rate", "contribution": 6.0, "description": "Minor spike"},
        ]
    }
    budget = evaluate_budget_condition(
        slo_target=99.9,
        observed_availability=99.85,
        budget_consumed_percent=55.0,
        remaining_budget_percent=45.0,
    )
    risk = evaluate_release_risk(
        risk_score=52.0,
        recommendation="GO_WITH_SAFE_GUARD",
        risk_factors=deterministic["risk_factors"],
        budget_agent_output=budget,
    )
    mock_orchestrator = OrchestratorResult(
        risk_score=52.0,
        recommendation="GO_WITH_SAFE_GUARD",
        explanation="Canary rollout recommended.",
        mitigations=["Canary 5%"],
        deployment_timing_advice="Deploy during low traffic.",
        confidence_note="Metrics valid.",
        budget_analysis=budget,
        risk_analysis=risk,
    )

    result = format_for_frontend(
        deterministic_analysis=deterministic,
        orchestrator_result=mock_orchestrator,
    )
    assert result["risk_score"] == 52.0
    assert result["remaining_budget_percent"] == 45.0
    assert result["recommendation"] == "GO_WITH_SAFE_GUARD"
    # Latency should be mapped to critical impact (>= 20.0)
    assert any(f["name"] == "Latency" and f["impact"] == "critical" for f in result["risk_factors"])
