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
import { SAFE_SCENARIO, PRESETS, ScenarioPreset } from '@/lib/mockData';
import { analyzeRelease, checkBackendHealth, API_BASE_URL } from '@/lib/api';
import { AlertCircle, RefreshCw, Lock, Sparkles, ShieldCheck } from 'lucide-react';

export default function DashboardPage() {
  const [formData, setFormData] = useState<ReleaseAnalysisRequest>(SAFE_SCENARIO.request);
  const [response, setResponse] = useState<ReleaseAnalysisResponse>(SAFE_SCENARIO.expectedResponse);
  const [activePresetId, setActivePresetId] = useState<string>('safe');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMock, setIsMock] = useState<boolean>(true);
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<string | null>('Initial Mock Benchmark');

  const checkHealth = useCallback(async () => {
    const isOnline = await checkBackendHealth();
    setBackendConnected(isOnline);
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const handleSelectPreset = (preset: ScenarioPreset) => {
    setActivePresetId(preset.id);
    setFormData(preset.request);
    setResponse(preset.expectedResponse);
    setIsMock(true);
    setLastAnalyzedAt(`Preset: ${preset.name} (${new Date().toLocaleTimeString()})`);
  };

  const handleReset = () => {
    handleSelectPreset(SAFE_SCENARIO);
  };

  const handleAnalyze = async (request: ReleaseAnalysisRequest) => {
    setIsLoading(true);

    const result = await analyzeRelease(request);

    setResponse(result.data);
    setIsMock(result.isMock);
    setLastAnalyzedAt(new Date().toLocaleTimeString());

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-cyan-500 selection:text-white">
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
        {/* Offline / Mock Warning Notice */}
        {isMock && (
          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.15)] backdrop-blur-md">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-mono font-bold text-amber-100 uppercase tracking-wide">
                  Demo & Mathematical Simulation Mode Active ·{' '}
                </span>
                <span className="text-amber-200/90 font-sans">
                  Backend offline at <code className="font-mono bg-slate-900 px-1.5 py-0.5 rounded text-amber-300 border border-amber-500/30">{API_BASE_URL}</code>. Displaying deterministic SRE model calculations.
                </span>
              </div>
            </div>
            <button
              onClick={checkHealth}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-900/50 hover:bg-amber-900/80 border border-amber-500/50 text-amber-200 font-mono font-bold transition-all shrink-0 self-start sm:self-auto text-xs shadow-sm hover:shadow-[0_0_12px_rgba(245,158,11,0.4)]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              RECHECK BACKEND
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
            <div className="glass-panel rounded-2xl p-5 shadow-2xl">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                <h3 className="text-sm font-bold text-white font-mono uppercase">
                  REPRODUCIBLE SRE PRESETS
                </h3>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Test how the decision recommendation changes as error budget and operational risk vary.
              </p>

              <div className="space-y-2.5">
                {PRESETS.map((p) => {
                  const isSelected = activePresetId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPreset(p)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 ${
                        isSelected
                          ? p.id === 'safe'
                            ? 'bg-emerald-950/60 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400/50'
                            : p.id === 'risky'
                            ? 'bg-rose-950/60 border-rose-400 shadow-[0_0_20px_rgba(239,68,68,0.3)] ring-1 ring-rose-400/50'
                            : 'bg-amber-950/60 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)] ring-1 ring-amber-400/50'
                          : 'bg-slate-950/60 border-slate-800 hover:border-cyan-500/30 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white font-mono">{p.name}</span>
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase border ${
                            p.badgeColor === 'emerald'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-500/60'
                              : p.badgeColor === 'rose'
                              ? 'bg-rose-950 text-rose-300 border-rose-500/60'
                              : 'bg-amber-950 text-amber-300 border-amber-500/60'
                          }`}
                        >
                          {p.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{p.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SRE Compliance & Anti-Gaming Card */}
            <div className="glass-panel rounded-2xl p-4 text-xs text-slate-400 space-y-2.5">
              <div className="flex items-center gap-2 text-slate-200 font-mono font-bold">
                <Lock className="w-4 h-4 text-cyan-400" />
                <span>COMPLIANCE & ANTI-GAMING SAFEGUARDS</span>
              </div>
              <ul className="space-y-1.5 text-[11px] list-disc list-inside text-slate-400 font-sans leading-relaxed">
                <li>Author metrics strictly anonymized into aggregated experience tiers.</li>
                <li>Zero individual developer surveillance or punitive scorecard generation.</li>
                <li>Advisory-only system: Human engineers retain final deployment power.</li>
                <li>Anti-gaming guards track cumulative churn against PR splitting attempts.</li>
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

            {/* Bottom Section 1: Deployment Timeline with Neon Wave Graph */}
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
      <footer className="border-t border-cyan-500/20 bg-slate-950/80 py-4 mt-8 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 font-mono">
          <div>
            <span className="font-bold text-slate-300">SIGNAL OPS</span> · Hackathon Team UG-42 (AI Ops)
          </div>
          <div className="flex items-center gap-3">
            <span className="text-cyan-400">Problem AO-05</span>
            <span>·</span>
            <span>Reliability Decision Support</span>
            <span>·</span>
            <span>Next.js 16 + Tailwind</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
