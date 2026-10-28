# Incident Response and Exception Escalation

## 1. Developer Exception Protocol for WAIT/HOLD
- If a release is categorized as WAIT or HOLD, developers who believe the change is urgent must:
  1. Verify the change is a P0 critical security vulnerability or active outage hotfix.
  2. Obtain written sign-off from both the On-Call SRE Lead and Engineering Manager.
  3. Ensure a dedicated incident war room is staffed during the rollout.

## 2. Low-Risk Deployment Windows
- Recommended standard low-risk deployment windows:
  - Tuesday 09:00 - 12:00 UTC
  - Wednesday 09:00 - 12:00 UTC
- Avoid deployments on Friday afternoons and month-end batch processing windows.
