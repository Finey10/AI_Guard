"""
data_service.py — Load and serve JSON fixture data for ReleaseGuard.

Data persistence choice
-----------------------
This MVP uses JSON flat-files instead of SQLite/SQLAlchemy to keep the
dependency surface minimal and the data human-readable during the hackathon.
All data is loaded at import time and cached in module-level variables.
A production version should replace these with a proper database layer.

Timezone policy
---------------
`check_deployment_timing` accepts a datetime that has already been normalised
to UTC by schemas.py. All calendar comparisons are performed in UTC.
"""
from __future__ import annotations

import json
import os
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Optional

# ---------------------------------------------------------------------------
# Resolve data directory
# ---------------------------------------------------------------------------

_DATA_DIR = Path(os.environ.get("DATA_DIR", Path(__file__).parent / "data"))


def _load_json(filename: str):
    path = _DATA_DIR / filename
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# Module-level cache (loaded once at startup)
# ---------------------------------------------------------------------------

_services: list[dict] = []
_release_history: list[dict] = []
_calendar: dict = {}


def _ensure_loaded() -> None:
    """Load all JSON fixtures if not already loaded."""
    global _services, _release_history, _calendar
    if not _services:
        _services = _load_json("services.json")
    if not _release_history:
        _release_history = _load_json("release_history.json")
    if not _calendar:
        _calendar = _load_json("deployment_calendar.json")


def verify_data_files() -> None:
    """
    Called at API startup to verify all data files are readable.
    Raises FileNotFoundError or json.JSONDecodeError on failure.
    """
    _ensure_loaded()
    assert len(_services) > 0, "services.json loaded empty"
    assert len(_release_history) > 0, "release_history.json loaded empty"
    assert "peak_windows" in _calendar, "deployment_calendar.json missing peak_windows"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_all_services() -> list[dict]:
    """Return all service definitions."""
    _ensure_loaded()
    return list(_services)


def get_service(name: str) -> Optional[dict]:
    """Return a single service by name, or None if not found."""
    _ensure_loaded()
    for svc in _services:
        if svc["service_name"] == name:
            return svc
    return None


def get_release_history(service_name: str) -> list[dict]:
    """Return release history records for a given service."""
    _ensure_loaded()
    return [r for r in _release_history if r["service_name"] == service_name]


def get_deployment_calendar() -> dict:
    """Return the raw deployment calendar."""
    _ensure_loaded()
    return _calendar


def check_deployment_timing(proposed_time: datetime) -> dict:
    """
    Evaluate a proposed UTC deployment time against the deployment calendar.

    Parameters
    ----------
    proposed_time : datetime
        UTC datetime (timezone-naive after normalisation in schemas.py).

    Returns
    -------
    dict with keys:
        status      – "freeze" | "peak" | "low_risk" | "neutral"
        risk_level  – "high" | "medium" | "low" | "neutral"
        label       – matching window label or "No special window"
        advice      – human-readable guidance string
    """
    _ensure_loaded()
    cal = _calendar

    dow = proposed_time.weekday()   # 0=Monday … 6=Sunday
    hour = proposed_time.hour
    dom = proposed_time.day

    # 1. Check freeze windows first (highest priority)
    for fw in cal.get("freeze_windows", []):
        start = date.fromisoformat(fw["start"])
        end = date.fromisoformat(fw["end"])
        if start <= proposed_time.date() <= end:
            return {
                "status": "freeze",
                "risk_level": "high",
                "label": fw["label"],
                "advice": (
                    f"🚫 FREEZE WINDOW: '{fw['label']}'. "
                    f"Deployments are blocked from {fw['start']} to {fw['end']}. "
                    f"Note: {fw.get('note', '')}"
                ),
            }

    # 2. Check peak windows
    for pw in cal.get("peak_windows", []):
        matched = False
        if "day_of_week" in pw:
            matched = (
                pw["day_of_week"] == dow
                and pw["hour_start"] <= hour < pw["hour_end"]
            )
        elif "day_of_month" in pw:
            matched = dom in pw["day_of_month"]

        if matched:
            return {
                "status": "peak",
                "risk_level": pw.get("risk_level", "high"),
                "label": pw["label"],
                "advice": (
                    f"⚠️  PEAK WINDOW: '{pw['label']}'. "
                    f"Elevated traffic risk. Note: {pw.get('note', '')}"
                ),
            }

    # 3. Check low-risk windows
    for lw in cal.get("low_risk_windows", []):
        if "day_of_week" in lw:
            matched = (
                lw["day_of_week"] == dow
                and lw.get("hour_start", 0) <= hour < lw.get("hour_end", 24)
            )
        else:
            matched = False

        if matched:
            return {
                "status": "low_risk",
                "risk_level": "low",
                "label": lw["label"],
                "advice": (
                    f"✅ LOW-RISK WINDOW: '{lw['label']}'. "
                    f"Good time to deploy. Note: {lw.get('note', '')}"
                ),
            }

    # 4. Neutral
    return {
        "status": "neutral",
        "risk_level": "neutral",
        "label": "No special window",
        "advice": "No special calendar constraint applies to this time slot.",
    }
