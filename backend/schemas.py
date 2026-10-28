"""
schemas.py — Pydantic v2 request/response models for ReleaseGuard API.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class ChangeSize(str, Enum):
    small = "small"
    medium = "medium"
    large = "large"


class Recommendation(str, Enum):
    GO = "GO"
    GO_WITH_SAFE_GUARD = "GO_WITH_SAFE_GUARD"
    WAIT = "WAIT"


class DecisionAlias(str, Enum):
    DEPLOY = "DEPLOY"       # Mapped from GO
    MONITOR = "MONITOR"     # Mapped from GO_WITH_SAFE_GUARD
    HOLD = "HOLD"           # Mapped from WAIT


# ---------------------------------------------------------------------------
# Request model
# ---------------------------------------------------------------------------

class AnalyzeReleaseRequest(BaseModel):
    """Payload for POST /api/analyze-release."""

    service_name: str = Field(..., description="Name of the service to analyze")
    change_size: ChangeSize = Field(..., description="Size of the proposed change")
    files_changed: int = Field(..., ge=0, description="Number of files changed")
    observed_availability: float = Field(
        ..., ge=0.0, le=100.0,
        description="Current observed availability percentage (e.g. 99.85)"
    )
    error_rate_percent: float = Field(
        ..., ge=0.0,
        description="Current error rate as a percentage (e.g. 0.5)"
    )
    latency_ms: float = Field(
        ..., ge=0.0,
        description="Current p99 latency in milliseconds"
    )
    latency_threshold_ms: float = Field(
        ..., gt=0.0,
        description="SLO latency threshold in milliseconds"
    )
    recent_incidents_30d: int = Field(
        ..., ge=0,
        description="Number of incidents in the past 30 days for this service"
    )
    # Optional fields
    proposed_deployment_time: Optional[datetime] = Field(
        None,
        description=(
            "ISO 8601 timestamp for the proposed deployment. "
            "If an offset is supplied the backend normalises it to UTC."
        ),
    )
    release_notes: Optional[str] = Field(
        None, description="Free-form release notes or change description"
    )

    @field_validator("proposed_deployment_time", mode="before")
    @classmethod
    def normalise_to_utc(cls, v):
        """Convert any timezone-aware datetime to UTC; leave naive as-is."""
        if v is None:
            return v
        if isinstance(v, str):
            from datetime import timezone
            dt = datetime.fromisoformat(v.replace("Z", "+00:00"))
        else:
            dt = v
        if dt.tzinfo is not None:
            from datetime import timezone
            dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

class RiskFactor(BaseModel):
    """Breakdown of a single risk factor contribution."""

    name: str = Field(..., description="Human-readable factor name")
    contribution: float = Field(..., description="Points contributed (0–max)")
    description: str = Field(..., description="Explanation of the contribution")


class ErrorBudgetInfo(BaseModel):
    """Derived error budget information."""

    slo_target: float
    observed_availability: float
    budget_consumed_percent: float
    remaining_budget_percent: float
    is_exhausted: bool


class AnalyzeReleaseResponse(BaseModel):
    """Full response payload from POST /api/analyze-release."""

    service_name: str
    risk_score: float = Field(..., ge=0.0, le=100.0)
    recommendation: Recommendation
    decision_alias: DecisionAlias = Field(
        default=DecisionAlias.DEPLOY,
        description="Mapped decision alias: DEPLOY (GO), MONITOR (GO_WITH_SAFE_GUARD), HOLD (WAIT)"
    )
    error_budget: ErrorBudgetInfo

    # Frontend top-level compatibility & AI advisor fields
    remaining_budget_percent: float = Field(
        default=100.0,
        description="Top-level remaining budget percent (frontend compatibility)"
    )
    budget_consumed_percent: float = Field(
        default=0.0,
        description="Top-level budget consumed percent (frontend compatibility)"
    )
    explanation: str = Field(
        default="",
        description="Concise SRE-grade explanation of the risk decision"
    )
    main_contributing_factors: list[str] = Field(
        default_factory=list,
        description="Ranked primary drivers contributing to the risk score"
    )
    mitigations: list[str] = Field(
        default_factory=list,
        description="Actionable mitigation steps"
    )
    deployment_timing_advice: Optional[str] = Field(
        default=None,
        description="Calendar timing advice"
    )

    # Risk factor breakdown & existing fields (100% backward compatible)
    risk_factors: list[RiskFactor]
    safeguards: list[str] = Field(
        default_factory=list,
        description="Concrete safeguards to apply (populated for GO_WITH_SAFE_GUARD)"
    )
    investigation_recommendations: list[str] = Field(
        default_factory=list,
        description="Investigation steps (populated for WAIT)"
    )
    timing_advice: Optional[str] = Field(
        None,
        description="Calendar-based timing advice for proposed_deployment_time"
    )
    summary: str = Field(..., description="One-line human-readable verdict")

    # Detailed AI advisor output metadata
    ai_advisor: Optional[dict] = Field(
        default=None,
        description="Full structured AI advisor output with transparency & governance metadata"
    )


# ---------------------------------------------------------------------------
# Data models (used internally / for /api/services responses)
# ---------------------------------------------------------------------------

class ServiceInfo(BaseModel):
    service_name: str
    slo_target: float
    owner_team: str
    criticality: str
    description: str


class ReleaseRecord(BaseModel):
    release_id: str
    service_name: str
    timestamp: str
    change_size: ChangeSize
    files_changed: int
    author_tenure_months: int
    time_of_day: str
    caused_incident: bool
    incident_severity: Optional[str]
    observed_availability: float
    error_rate_percent: float
    notes: str
