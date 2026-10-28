# Deployment Safeguards and Rollback Checklist

## 1. Canary Deployment Standards
- All changes with moderate risk (GO_WITH_SAFE_GUARD) must be deployed using a progressive canary rollout:
  - Phase 1: 5% traffic routing for 15 minutes.
  - Phase 2: Verify p99 latency degradation is < 10% and 5xx error rate remains nominal.
  - Phase 3: Incremental promotion to 25%, 50%, 100%.

## 2. Instant Rollback Readiness
- Automated rollback scripts must be pre-tested and validated in staging before triggering production deployment.
- Rollback execution time must be under 3 minutes.
- Active on-call engineer must monitor telemetry live during the entire rollout window.
