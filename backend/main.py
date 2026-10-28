"""
main.py — FastAPI application entry point for ReleaseGuard.

Timezone policy
---------------
All datetime values submitted by clients are normalised to UTC in
schemas.py before reaching any business logic. Internal operations
and logs use UTC exclusively.
"""
from __future__ import annotations

import logging
import sys
import os
from pathlib import Path

# Ensure the backend/ directory is on sys.path so that bare module imports
# (e.g. `import data_service`) resolve correctly whether the app is launched
# via `uvicorn backend.main:app` (from repo root) or `uvicorn main:app`
# (from inside backend/).
_backend_dir = Path(__file__).parent
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import data_service
import risk_engine
from schemas import (
    AnalyzeReleaseRequest,
    AnalyzeReleaseResponse,
    ErrorBudgetInfo,
    RiskFactor,
    ServiceInfo,
    ReleaseRecord,
)

logger = logging.getLogger("signalops")
logging.basicConfig(level=logging.INFO)


# ---------------------------------------------------------------------------
# Lifespan (startup verification)
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Verify data files are readable at startup."""
    logger.info("SignalOps API starting — verifying data files…")
    try:
        data_service.verify_data_files()
        logger.info("Data files verified successfully.")
    except Exception as exc:
        logger.error("STARTUP FAILURE: data files could not be loaded: %s", exc)
        raise
    yield
    logger.info("SignalOps API shutting down.")


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------

app = FastAPI(
    title="SignalOps API",
    description=(
        "SignalOps (Team Zero Latency) — deterministic release risk analysis.\n\n"
        "**Disclaimer**: All risk scores and recommendations are prototype heuristics "
        "for demonstration purposes only. Not for real operational use."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health", tags=["Meta"])
async def health_check():
    """Liveness probe — returns {"status": "ok"}."""
    return {"status": "ok"}


@app.get("/api/services", response_model=list[ServiceInfo], tags=["Services"])
async def list_services():
    """Return all registered services."""
    return data_service.get_all_services()


@app.get(
    "/api/services/{service_name}/history",
    response_model=list[ReleaseRecord],
    tags=["Services"],
)
async def service_history(service_name: str):
    """
    Return the release history for a specific service.
    Returns 404 if the service is not registered.
    """
    svc = data_service.get_service(service_name)
    if svc is None:
        raise HTTPException(
            status_code=404,
            detail=f"Service '{service_name}' not found.",
        )
    return data_service.get_release_history(service_name)


@app.post(
    "/api/analyze-release",
    response_model=AnalyzeReleaseResponse,
    tags=["Analysis"],
)
async def analyze_release(payload: AnalyzeReleaseRequest):
    """
    Analyse a proposed release and return a risk score with recommendation.

    The engine applies deterministic heuristics (prototype weights — not
    validated industry standards) across five risk factors and returns one of:
    - **GO** — low risk, proceed normally
    - **GO_WITH_SAFE_GUARD** — moderate risk, proceed with listed safeguards
    - **WAIT** — high risk or budget exhausted, do not deploy now
    """
    # Fetch service metadata for SLO target
    svc = data_service.get_service(payload.service_name)
    if svc is None:
        raise HTTPException(
            status_code=404,
            detail=f"Service '{payload.service_name}' not found.",
        )

    slo_target: float = svc["slo_target"]

    # Run risk engine
    result = risk_engine.analyze_release(
        service_name=payload.service_name,
        slo_target=slo_target,
        change_size=payload.change_size.value,
        observed_availability=payload.observed_availability,
        error_rate_percent=payload.error_rate_percent,
        latency_ms=payload.latency_ms,
        latency_threshold_ms=payload.latency_threshold_ms,
        recent_incidents_30d=payload.recent_incidents_30d,
    )

    # Calendar timing advice (optional)
    timing_advice: str | None = None
    if payload.proposed_deployment_time is not None:
        timing_info = data_service.check_deployment_timing(
            payload.proposed_deployment_time
        )
        timing_advice = timing_info["advice"]

    # Build response
    budget_raw = result["error_budget"]
    response = AnalyzeReleaseResponse(
        service_name=result["service_name"],
        risk_score=result["risk_score"],
        recommendation=result["recommendation"],
        error_budget=ErrorBudgetInfo(
            slo_target=budget_raw["slo_target"],
            observed_availability=budget_raw["observed_availability"],
            budget_consumed_percent=budget_raw["budget_consumed_percent"],
            remaining_budget_percent=budget_raw["remaining_budget_percent"],
            is_exhausted=budget_raw["is_exhausted"],
        ),
        risk_factors=[
            RiskFactor(
                name=f["name"],
                contribution=f["contribution"],
                description=f["description"],
            )
            for f in result["risk_factors"]
        ],
        safeguards=result["safeguards"],
        investigation_recommendations=result["investigation_recommendations"],
        timing_advice=timing_advice,
        summary=result["summary"],
    )

    logger.info(
        "analyze-release: service=%s score=%.1f recommendation=%s",
        payload.service_name,
        result["risk_score"],
        result["recommendation"],
    )

    return response
