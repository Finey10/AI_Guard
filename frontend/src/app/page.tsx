'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { MetricForm } from '@/components/MetricForm';
import { BudgetGauge } from '@/components/BudgetGauge';
import { RiskPanel } from '@/components/RiskPanel';
import { RecommendationPanel } from '@/components/RecommendationPanel';
import { DeploymentTimeline } from '@/components/DeploymentTimeline';
import { RiskFactorList } from '@/components/RiskFactorList';
import { ReleaseAnalysisRequest, ReleaseAnalysisResponse } from '@/lib/types';
import { SAFE_SCENARIO, RISKY_SCENARIO, SAFEGUARD_SCENARIO, PRESETS, ScenarioPreset } from '@/lib/mockData';
import { analyzeRelease, checkBackendHealth, API_BASE_URL } from '@/lib/api';
import { ShieldCheck, AlertCircle, RefreshCw, Lock, Sparkles, Terminal } from 'lucide-react';

export default function DashboardPage() {
  const [formData, setFormData] = useState<ReleaseAnalysisRequest>(SAFE_SCENARIO.request);
  const [response, setResponse] = useState<ReleaseAnalysisResponse>(SAFE_SCENARIO.expectedResponse);
  const [activePresetId, setActivePresetId] = useState<string>('safe');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMock, setIsMock] = useState<boolean>(true);
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<string | null>('Initial Mock Benchmark');
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);

  // Check backend health on mount
  const checkHealth = useCallback(async () => {
    const isOnline = await checkBackendHealth();
    setBackendConnected(isOnline);
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  // Handle Preset Selection
  const handleSelectPreset = (preset: ScenarioPreset) => {
    setActivePresetId(preset.id);
    setFormData(preset.request);
    setResponse(preset.expectedResponse);
    setIsMock(true);
    setLastAnalyzedAt(`Preset: ${preset.name} (${new Date().toLocaleTimeString()})`);
    setApiErrorMessage(null);
  };

  // Reset to default safe scenario
  const handleReset = () => {
    handleSelectPreset(SAFE_SCENARIO);
  };

  // Submit analysis request
  const handleAnalyze = async (request: ReleaseAnalysisRequest) => {
    setIsLoading(true);
    setApiErrorMessage(null);

    const result = await analyzeRelease(request);

    setResponse(result.data);
    setIsMock(result.isMock);
    setLastAnalyzedAt(new Date().toLocaleTimeString());

    if (result.isMock && result.error) {
      setApiErrorMessage(result.error);
    } else {
      setApiErrorMessage(null);
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
      {/* Header */}
      <Header
        selectedServiceName={formData.service_name}
        isBackendConnected={backendConnected}
        isMock={isMock}
        lastAnalyzedAt={lastAnalyzedAt}
        onSelectPreset={handleSelectPreset}
        activePresetId={activePresetId}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Offline / Mock Warning Notice when backend is disconnected */}
        {isMock && (
          <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-amber-200">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-100">
                  Demo & Mock Evaluation Mode Active:{' '}
                </span>
                <span>
                  Backend is unreachable at <code className="font-mono bg-zinc-900 px-1 py-0.5 rounded text-amber-300">{API_BASE_URL}</code>.
                  Displaying calibrated mathematical model responses for simulation.
                </span>
              </div>
            </div>
            <button
              onClick={checkHealth}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-900/40 hover:bg-amber-900/60 border border-amber-700/60 text-amber-200 font-medium transition-colors shrink-0 self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Backend Connection
            </button>
          </div>
        )}

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form & Presets (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Input Form */}
            <MetricForm
              initialValues={formData}
              onSubmit={handleAnalyze}
              isLoading={isLoading}
              onReset={handleReset}
            />

            {/* Presets Card Selector */}
            <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-5 shadow-xl backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">Reproducible SRE Scenarios</h3>
              </div>
              <p className="text-xs text-zinc-400 mb-4">
                Select test presets to verify how the decision recommendation changes as error budget and operational risk vary.
              </p>

              <div className="space-y-2.5">
                {PRESETS.map((p) => {
                  const isSelected = activePresetId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPreset(p)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        isSelected
                          ? p.id === 'safe'
                            ? 'bg-emerald-950/40 border-emerald-600 shadow-md ring-1 ring-emerald-500/30'
                            : p.id === 'risky'
                            ? 'bg-rose-950/40 border-rose-600 shadow-md ring-1 ring-rose-500/30'
                            : 'bg-amber-950/40 border-amber-600 shadow-md ring-1 ring-amber-500/30'
                          : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-white">{p.name}</span>
                        <span
                          className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full uppercase border ${
                            p.badgeColor === 'emerald'
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                              : p.badgeColor === 'rose'
                              ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                              : 'bg-amber-950/80 text-amber-300 border-amber-800'
                          }`}
                        >
                          {p.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">{p.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SRE Compliance & Anti-Gaming Card */}
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4 text-xs text-zinc-400 space-y-2.5">
              <div className="flex items-center gap-2 text-zinc-200 font-semibold">
                <Lock className="w-4 h-4 text-blue-400" />
                <span>Zero Latency Compliance & Anti-Surveillance</span>
              </div>
              <ul className="space-y-1.5 text-[11px] list-disc list-inside text-zinc-400">
                <li>Author metrics strictly anonymized & aggregated into experience tiers.</li>
                <li>Zero individual developer surveillance or punitive scorecard generation.</li>
                <li>System operates as an advisor; human engineers retain deployment power.</li>
                <li>Anti-gaming guards detect micro-PR splitting and freeze edge pushing.</li>
              </ul>
            </div>
          </div>

          {/* Right Column: 3 Core Panels + Timeline + Factors (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Top Row: Recommendation Hero Panel */}
            <RecommendationPanel
              recommendation={response.recommendation}
              explanation={response.explanation}
              mitigations={response.mitigations}
              deploymentTimingAdvice={response.deployment_timing_advice}
              suggestedWindows={response.suggested_windows}
            />

            {/* Middle Row: Two Panels (Budget Gauge + Risk Panel) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Panel 1: Budget Gauge */}
              <BudgetGauge
                sloTarget={formData.slo_target}
                observedAvailability={formData.observed_availability}
                remainingBudgetPercent={response.remaining_budget_percent}
                budgetConsumedPercent={response.budget_consumed_percent}
              />

              {/* Panel 2: Risk Panel */}
              <RiskPanel
                riskScore={response.risk_score}
                factors={response.risk_factors}
                recentIncidents={formData.recent_incidents}
                latencyMs={formData.latency_ms}
                latencyThresholdMs={formData.latency_threshold_ms}
                changeSize={formData.change_size}
              />
            </div>

            {/* Bottom Section 1: Deployment Timeline */}
            <DeploymentTimeline
              proposedTime={formData.proposed_deployment_time}
              suggestedWindows={response.suggested_windows}
              timingAdvice={response.deployment_timing_advice}
              riskScore={response.risk_score}
            />

            {/* Bottom Section 2: Detailed Risk Factor Attribution */}
            <RiskFactorList factors={response.risk_factors} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-500">
          <div>
            <span className="font-semibold text-zinc-400">Zero Latency ReleaseGuard AI</span> · Hackathon Team UG-42 (Domain: AI Ops)
          </div>
          <div className="flex items-center gap-3">
            <span>Problem AO-05</span>
            <span>·</span>
            <span>Decision Support Advisory</span>
            <span>·</span>
            <span>Next.js + TypeScript + Tailwind</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
