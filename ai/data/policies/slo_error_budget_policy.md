# Reliability and Error Budget Policy

## 1. Error Budget Depletion Rules
- **0% Remaining Budget**: When an error budget is exhausted (0.0% remaining) or observed availability drops below the target SLO, all non-emergency deployments to the service are paused (HOLD / WAIT).
- **Burn Rate Alerts**: If the 1-hour burn rate exceeds 14.4x (consuming 2% of the budget in 1 hour), deployments must require SRE approval.
- **Freeze Windows**: Deployments are blocked during designated organizational freeze periods and peak customer traffic windows.

## 2. Recovery Protocol
- Teams must burn down technical debt and allow observed availability to recover above the agreed SLO before resuming standard deployments.
- Deploying into an exhausted budget without an approved exception ticket violates engineering reliability standards.
