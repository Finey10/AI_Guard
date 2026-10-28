import { ReleaseAnalysisRequest, ReleaseAnalysisResponse, SuggestedWindow, RiskFactor } from './types';

export interface ScenarioPreset {
  id: string;
  name: string;
  badge: string;
  badgeColor: 'emerald' | 'rose' | 'amber';
  description: string;
  request: ReleaseAnalysisRequest;
  expectedResponse: ReleaseAnalysisResponse;
}

export const SAFE_SCENARIO: ScenarioPreset = {
  id: 'safe',
  name: 'Safe Scenario (Green Light)',
  badge: 'Recommended GO',
  badgeColor: 'emerald',
  description: 'Healthy error budget (78% remaining), low latency, zero incidents, small PR in an off-peak slot.',
  request: {
    service_name: 'checkout-service',
    slo_target: 99.9,
    observed_availability: 99.96,
    error_rate_percent: 0.04,
    latency_ms: 145,
    latency_threshold_ms: 250,
    recent_incidents: 0,
    change_size: 'small',
    proposed_deployment_time: '2026-10-29T10:30:00',
    release_notes: 'Optimized Redis cache connection pooling and query pre-fetch logic.'
  },
  expectedResponse: {
    risk_score: 18,
    remaining_budget_percent: 78.4,
    budget_consumed_percent: 21.6,
    recommendation: 'GO',
    risk_factors: [
      {
        name: 'Error Budget Capacity',
        impact: 'low',
        weight: 10,
        description: '78.4% error budget remaining provides substantial cushion against unforeseen regressions.',
        is_ai_generated: false
      },
      {
        name: 'Latency Margin',
        impact: 'low',
        weight: 8,
        description: 'Measured P95 latency (145ms) has 105ms headroom beneath the 250ms SLA ceiling.',
        is_ai_generated: false
      },
      {
        name: 'Change Scope & Incident History',
        impact: 'low',
        weight: 5,
        description: 'Small PR footprint with 0 recorded incidents on checkout-service in past 30 days.',
        is_ai_generated: false
      },
      {
        name: 'Traffic Window Alignment',
        impact: 'low',
        weight: 5,
        description: 'Scheduled window falls in morning low-traffic period with ample on-call coverage.',
        is_ai_generated: true
      }
    ],
    explanation: 'The proposed release for checkout-service meets all reliability readiness gates. Error budget is 78.4% intact, latency is 42% below threshold, and change size is minimal with no linked incident history.',
    mitigations: [
      'Standard automated canary verification (10% traffic for 10 minutes)',
      'Continuous Prometheus error-budget burn rate monitoring',
      'Verify Redis connection pool metrics in Grafana'
    ],
    deployment_timing_advice: 'The proposed 10:30 AM window is optimal with historically low traffic volume.',
    suggested_windows: [
      {
        window: '2026-10-29T10:30:00Z - 11:30:00Z',
        risk_level: 'low',
        label: 'Selected Window (Optimal Off-Peak)',
        is_simulated: true
      },
      {
        window: '2026-10-29T14:00:00Z - 15:00:00Z',
        risk_level: 'low',
        label: 'Alternative Secondary Window',
        is_simulated: true
      }
    ]
  }
};

export const RISKY_SCENARIO: ScenarioPreset = {
  id: 'risky',
  name: 'Risky Scenario (Critical Warning)',
  badge: 'Recommended WAIT',
  badgeColor: 'rose',
  description: 'Exhausted error budget (4% left), high latency spike, 2 recent incidents, large DB migration on Friday.',
  request: {
    service_name: 'payment-gateway',
    slo_target: 99.95,
    observed_availability: 99.91,
    error_rate_percent: 0.85,
    latency_ms: 340,
    latency_threshold_ms: 200,
    recent_incidents: 2,
    change_size: 'large',
    proposed_deployment_time: '2026-10-30T17:15:00',
    release_notes: 'Major schema refactoring and multi-currency ledger migration.'
  },
  expectedResponse: {
    risk_score: 88,
    remaining_budget_percent: 4.2,
    budget_consumed_percent: 95.8,
    recommendation: 'WAIT',
    risk_factors: [
      {
        name: 'Error Budget Depletion',
        impact: 'critical',
        weight: 42,
        description: 'Remaining error budget is critically depleted at 4.2% (95.8% consumed). Any minor blip triggers an SLO breach.',
        is_ai_generated: false
      },
      {
        name: 'Latency Breach',
        impact: 'high',
        weight: 26,
        description: 'Current P95 latency (340ms) exceeds SLA threshold (200ms) by 70%.',
        is_ai_generated: false
      },
      {
        name: 'Recent Outage History',
        impact: 'high',
        weight: 20,
        description: '2 recent production incidents recorded on payment-gateway within the past 7 days.',
        is_ai_generated: false
      },
      {
        name: 'Friday Peak / Freeze Window',
        impact: 'high',
        weight: 18,
        description: 'Friday 17:15 is inside the weekend freeze window and coincides with peak transaction volume.',
        is_ai_generated: true
      },
      {
        name: 'Large Scope Blast Radius',
        impact: 'medium',
        weight: 14,
        description: 'Large architectural refactoring affecting core financial transaction flows.',
        is_ai_generated: false
      }
    ],
    explanation: 'DO NOT DEPLOY: payment-gateway has nearly exhausted its monthly error budget (4.2% left), observed latency has breached SLA by 70%, and 2 previous incidents are unresolved. Shipping on a Friday evening during peak traffic creates an unacceptable risk of a SEV-1 outage.',
    mitigations: [
      'Postpone deployment to Monday 09:30 UTC off-peak maintenance window',
      'Execute shadow traffic replay against staging database before rollout',
      'Require VP of Reliability & Tech Lead sign-off for an error budget waiver',
      'Configure automated rollback trigger if payment error rate exceeds 0.2%'
    ],
    deployment_timing_advice: 'HIGH RISK: Friday 17:15 is within the deployment freeze window. Deferring to Monday morning reduces release risk by over 60%.',
    suggested_windows: [
      {
        window: '2026-11-02T09:30:00Z - 10:30:00Z',
        risk_level: 'low',
        label: 'Recommended: Monday Morning Off-Peak Window',
        is_simulated: true
      },
      {
        window: '2026-11-02T13:00:00Z - 14:00:00Z',
        risk_level: 'low',
        label: 'Alternative: Monday Midday Window',
        is_simulated: true
      }
    ]
  }
};

export const SAFEGUARD_SCENARIO: ScenarioPreset = {
  id: 'safeguard',
  name: 'Caution Scenario (Safeguards Required)',
  badge: 'GO WITH SAFEGUARD',
  badgeColor: 'amber',
  description: 'Moderate error budget (36% remaining), latency near limit, medium size PR.',
  request: {
    service_name: 'inventory-api',
    slo_target: 99.5,
    observed_availability: 99.62,
    error_rate_percent: 0.38,
    latency_ms: 215,
    latency_threshold_ms: 220,
    recent_incidents: 1,
    change_size: 'medium',
    proposed_deployment_time: '2026-10-29T14:00:00',
    release_notes: 'Added warehouse stock reservation locking API.'
  },
  expectedResponse: {
    risk_score: 48,
    remaining_budget_percent: 36.0,
    budget_consumed_percent: 64.0,
    recommendation: 'GO_WITH_SAFE_GUARD',
    risk_factors: [
      {
        name: 'Moderate Budget Headroom',
        impact: 'medium',
        weight: 20,
        description: '36.0% error budget remaining provides modest buffer; cannot tolerate prolonged rollback.',
        is_ai_generated: false
      },
      {
        name: 'Latency Proximity to Threshold',
        impact: 'medium',
        weight: 16,
        description: 'Observed latency of 215ms is within 5ms of the 220ms SLA boundary.',
        is_ai_generated: false
      },
      {
        name: 'Medium Code Churn',
        impact: 'medium',
        weight: 12,
        description: 'Medium change size introducing database locks for inventory reservations.',
        is_ai_generated: false
      },
      {
        name: 'Controlled Midday Window',
        impact: 'low',
        weight: 8,
        description: 'Window is between peak lunch and evening rushes, but active monitoring is mandatory.',
        is_ai_generated: true
      }
    ],
    explanation: 'Proceed with safeguards: inventory-api error budget is below 50% and latency is closely tracking the upper threshold. Deployment is permitted under progressive canary gating with immediate rollback criteria.',
    mitigations: [
      'Execute canary release at 5% traffic weight for 20 minutes',
      'Monitor lock contention and database CPU utilization in real-time',
      'Require secondary peer reviewer on-call during traffic shift',
      'Auto-abort deployment if P95 latency exceeds 220ms for more than 60 seconds'
    ],
    deployment_timing_advice: 'Window is acceptable between peak hours. Do not deploy without active engineering supervision.',
    suggested_windows: [
      {
        window: '2026-10-29T14:00:00Z - 15:00:00Z',
        risk_level: 'medium',
        label: 'Selected Window (Canary Gating Required)',
        is_simulated: true
      },
      {
        window: '2026-10-30T09:00:00Z - 10:00:00Z',
        risk_level: 'low',
        label: 'Safer Slot: Friday Morning Low-Volume',
        is_simulated: true
      }
    ]
  }
};

export const PRESETS: ScenarioPreset[] = [SAFE_SCENARIO, RISKY_SCENARIO, SAFEGUARD_SCENARIO];

/**
 * Computes a realistic, deterministic response if the backend is offline.
 * This guarantees that even when the user modifies form fields, the math
 * and decision rules behave consistently.
 */
export function computeLocalMockResponse(req: ReleaseAnalysisRequest): ReleaseAnalysisResponse {
  // Allowed unavailability = 100 - SLO
  const allowedUnavailability = Math.max(0.0001, 100 - req.slo_target);
  const observedUnavailability = Math.max(0, 100 - req.observed_availability);

  // Consumed ratio = observedUnavailability / allowedUnavailability
  const consumedRatio = observedUnavailability / allowedUnavailability;
  const budgetConsumedPercent = Math.min(100, Math.max(0, parseFloat((consumedRatio * 100).toFixed(1))));
  const remainingBudgetPercent = Math.max(0, parseFloat((100 - budgetConsumedPercent).toFixed(1)));

  // Risk Score calculation
  let risk = 15; // baseline

  // 1. Budget factor
  if (remainingBudgetPercent <= 10) risk += 40;
  else if (remainingBudgetPercent <= 30) risk += 25;
  else if (remainingBudgetPercent <= 50) risk += 15;

  // 2. Latency factor
  const latencyRatio = req.latency_ms / Math.max(1, req.latency_threshold_ms);
  if (latencyRatio >= 1.2) risk += 25;
  else if (latencyRatio >= 0.95) risk += 15;
  else if (latencyRatio >= 0.8) risk += 5;

  // 3. Incidents factor
  risk += Math.min(30, req.recent_incidents * 12);

  // 4. Change size factor
  if (req.change_size === 'large') risk += 15;
  else if (req.change_size === 'medium') risk += 8;

  // 5. Day/time factor (check for Friday or peak hours)
  const deployDate = new Date(req.proposed_deployment_time);
  const isFriday = !isNaN(deployDate.getTime()) && deployDate.getDay() === 5;
  const hour = !isNaN(deployDate.getTime()) ? deployDate.getHours() : 12;
  const isPeakHour = (hour >= 11 && hour <= 13) || (hour >= 17 && hour <= 21);

  if (isFriday && hour >= 16) risk += 18;
  else if (isPeakHour) risk += 10;

  const finalRisk = Math.min(98, Math.max(8, Math.round(risk)));

  // Recommendation logic
  let recommendation: 'GO' | 'GO_WITH_SAFE_GUARD' | 'WAIT';
  if (finalRisk >= 65 || remainingBudgetPercent < 15) {
    recommendation = 'WAIT';
  } else if (finalRisk >= 35 || remainingBudgetPercent < 45) {
    recommendation = 'GO_WITH_SAFE_GUARD';
  } else {
    recommendation = 'GO';
  }

  const factors: RiskFactor[] = [
    {
      name: 'Error Budget Margin',
      impact: remainingBudgetPercent < 15 ? 'critical' : remainingBudgetPercent < 45 ? 'medium' : 'low',
      weight: remainingBudgetPercent < 20 ? 35 : 15,
      description: `${remainingBudgetPercent}% error budget remaining (${budgetConsumedPercent}% consumed) for ${req.service_name}.`,
      is_ai_generated: false
    },
    {
      name: 'Service Latency SLA',
      impact: latencyRatio >= 1.0 ? 'high' : latencyRatio >= 0.85 ? 'medium' : 'low',
      weight: latencyRatio >= 1.0 ? 25 : 10,
      description: `P95 latency is ${req.latency_ms}ms against target threshold of ${req.latency_threshold_ms}ms (${Math.round(latencyRatio * 100)}%).`,
      is_ai_generated: false
    },
    {
      name: 'Change Scope & Incidents',
      impact: req.recent_incidents > 0 ? 'high' : req.change_size === 'large' ? 'medium' : 'low',
      weight: req.recent_incidents * 10 + (req.change_size === 'large' ? 12 : 5),
      description: `${req.change_size.toUpperCase()} release scope with ${req.recent_incidents} recent incident(s).`,
      is_ai_generated: false
    },
    {
      name: 'Timing & Traffic Pattern Assessment',
      impact: isFriday && hour >= 16 ? 'high' : isPeakHour ? 'medium' : 'low',
      weight: 12,
      description: `Deployment scheduled at hour ${hour}:00${isFriday ? ' on Friday' : ''}. SRE calendar assesses traffic volume.`,
      is_ai_generated: true
    }
  ];

  let explanation = '';
  const mitigations: string[] = [];

  if (recommendation === 'WAIT') {
    explanation = `Recommendation is WAIT: ${req.service_name} displays elevated risk (score ${finalRisk}/100) due to ${
      remainingBudgetPercent < 20 ? 'exhausted error budget' : 'excessive latency and recent incident history'
    }. Releasing now endangers customer SLA compliance.`;
    mitigations.push('Defer release until next designated off-peak maintenance window');
    mitigations.push('Run comprehensive synthetic load tests on staging');
    mitigations.push('Obtain approval from Reliability Lead before proceeding');
  } else if (recommendation === 'GO_WITH_SAFE_GUARD') {
    explanation = `Recommendation is GO WITH SAFEGUARD: Moderate risk detected (${finalRisk}/100). Error budget is ${remainingBudgetPercent}% remaining. Release can proceed provided progressive deployment controls are enforced.`;
    mitigations.push('Canary rollout starting at 5% traffic weight for 15 minutes');
    mitigations.push('Continuous automated verification of P95 latency and error spikes');
    mitigations.push('Ensure secondary engineer is active on deployment channel');
  } else {
    explanation = `Recommendation is GO: All operational reliability gates are green. Risk score is ${finalRisk}/100 with ${remainingBudgetPercent}% error budget buffer and compliant latency metrics.`;
    mitigations.push('Standard 10% canary ramp-up');
    mitigations.push('Monitor deployment telemetry for 15 minutes post-rollout');
  }

  const suggestedWindows: SuggestedWindow[] = [
    {
      window: `${req.proposed_deployment_time} (Current)`,
      risk_level: finalRisk > 60 ? 'high' : finalRisk > 35 ? 'medium' : 'low',
      label: 'Target Proposed Window',
      is_simulated: true
    },
    {
      window: 'Tomorrow 10:00 - 11:00 UTC',
      risk_level: 'low',
      label: 'Simulated Optimal Off-Peak Window',
      is_simulated: true
    }
  ];

  return {
    risk_score: finalRisk,
    remaining_budget_percent: remainingBudgetPercent,
    budget_consumed_percent: budgetConsumedPercent,
    recommendation,
    risk_factors: factors,
    explanation,
    mitigations,
    deployment_timing_advice: isFriday && hour >= 16
      ? 'Avoid deployment: Friday evening coincides with freeze period transition.'
      : 'Window analysis: Off-peak traffic pattern provides safe deployment conditions.',
    suggested_windows: suggestedWindows
  };
}
