export type ChangeSize = 'small' | 'medium' | 'large';

export type RecommendationType = 'GO' | 'GO_WITH_SAFE_GUARD' | 'WAIT';

export type RiskImpact = 'low' | 'medium' | 'high' | 'critical' | 'positive';

export interface ReleaseAnalysisRequest {
  service_name: string;
  slo_target: number;
  observed_availability: number;
  error_rate_percent: number;
  latency_ms: number;
  latency_threshold_ms: number;
  recent_incidents: number;
  change_size: ChangeSize;
  proposed_deployment_time: string;
  release_notes?: string;
}

export interface RiskFactor {
  name: string;
  impact: RiskImpact;
  weight: number;
  description: string;
  is_ai_generated: boolean;
}

export interface SuggestedWindow {
  window: string;
  risk_level: 'low' | 'medium' | 'high';
  label: string;
  is_simulated: boolean;
}

export interface ReleaseAnalysisResponse {
  risk_score: number;
  remaining_budget_percent: number;
  budget_consumed_percent: number;
  recommendation: RecommendationType;
  risk_factors: RiskFactor[];
  explanation: string;
  mitigations: string[];
  deployment_timing_advice: string;
  suggested_windows?: SuggestedWindow[];
}

export interface AnalysisState {
  data: ReleaseAnalysisResponse | null;
  isLoading: boolean;
  isMock: boolean;
  lastAnalyzedAt: string | null;
  error: string | null;
  backendConnected: boolean | null;
}
