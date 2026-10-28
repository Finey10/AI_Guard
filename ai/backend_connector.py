"""
backend_connector.py — Connects the AI Agents module to the deterministic backend.

Provides communication with the backend developer's risk engine:
1. HTTP mode: Calls running backend server (e.g. http://localhost:8000).
2. Direct Python mode: Invokes backend.risk_engine and backend.data_service
   directly if running in the same Python environment without network overhead.
"""
from __future__ import annotations

import logging
import os
import sys
from pathlib import Path
from typing import Any, Optional

import httpx

logger = logging.getLogger("releaseguard.backend_connector")

# Backend API base URL (default: http://localhost:8000)
BACKEND_API_URL = os.environ.get("BACKEND_API_URL", "http://localhost:8000").rstrip("/")

# Add repo root to sys.path so 'backend' can be imported in direct mode if present
_repo_root = Path(__file__).parent.parent
if str(_repo_root) not in sys.path:
    sys.path.insert(0, str(_repo_root))


class BackendConnector:
    """Client for communicating with the deterministic backend."""

    def __init__(self, base_url: str = BACKEND_API_URL, timeout: float = 5.0):
        self.base_url = base_url
        self.timeout = timeout

    def check_health(self) -> bool:
        """Check if backend API is reachable."""
        try:
            with httpx.Client(timeout=self.timeout) as client:
                res = client.get(f"{self.base_url}/health")
                return res.status_code == 200
        except Exception:
            return False

    def fetch_service_history(self, service_name: str) -> list[dict[str, Any]]:
        """Fetch historical releases for a service from the backend."""
        # Try direct in-memory import first if backend is local
        try:
            from backend import data_service
            history = data_service.get_release_history(service_name)
            if history:
                return history
        except Exception:
            pass

        # Otherwise fetch over HTTP
        try:
            with httpx.Client(timeout=self.timeout) as client:
                res = client.get(f"{self.base_url}/api/services/{service_name}/history")
                if res.status_code == 200:
                    return res.json()
        except Exception as exc:
            logger.warning("Could not fetch release history from backend: %s", exc)

        return []

    def fetch_deployment_timing(self, proposed_time_iso: Optional[str]) -> dict[str, Any]:
        """Fetch deployment calendar advice from backend."""
        if not proposed_time_iso:
            return {"advice": "No calendar restrictions detected.", "label": "Standard Window"}

        try:
            from datetime import datetime, timezone
            dt = datetime.fromisoformat(proposed_time_iso.replace("Z", "+00:00")).astimezone(timezone.utc).replace(tzinfo=None)
            from backend import data_service
            return data_service.check_deployment_timing(dt)
        except Exception:
            return {"advice": "Calendar evaluation unavailable.", "label": "Standard"}

    def compute_deterministic_risk(self, request_payload: dict[str, Any]) -> dict[str, Any]:
        """
        Request deterministic risk analysis from backend risk engine.
        Uses in-process backend.risk_engine if available, or POSTs to backend API.
        """
        # Option A: In-process direct computation
        try:
            from backend import data_service, risk_engine
            service_name = request_payload["service_name"]
            svc = data_service.get_service(service_name)
            slo_target = svc["slo_target"] if svc else float(request_payload.get("slo_target", 99.9))

            result = risk_engine.analyze_release(
                service_name=service_name,
                slo_target=slo_target,
                change_size=request_payload.get("change_size", "medium"),
                observed_availability=float(request_payload["observed_availability"]),
                error_rate_percent=float(request_payload["error_rate_percent"]),
                latency_ms=float(request_payload["latency_ms"]),
                latency_threshold_ms=float(request_payload["latency_threshold_ms"]),
                recent_incidents_30d=int(request_payload.get("recent_incidents_30d", request_payload.get("recent_incidents", 0))),
            )
            return result
        except Exception as local_err:
            logger.debug("Direct local risk engine computation skipped (%s), trying HTTP.", local_err)

        # Option B: HTTP call to running backend server
        try:
            with httpx.Client(timeout=self.timeout) as client:
                res = client.post(f"{self.base_url}/api/analyze-release", json=request_payload)
                if res.status_code == 200:
                    return res.json()
                else:
                    raise RuntimeError(f"Backend returned HTTP {res.status_code}: {res.text}")
        except Exception as http_err:
            logger.error("HTTP connection to backend failed: %s", http_err)
            raise


# Global singleton connector instance
backend_client = BackendConnector()
