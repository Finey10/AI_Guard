'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { MetricForm } from '@/components/MetricForm';
import { BudgetGauge } from '@/components/BudgetGauge';
import { RiskPanel } from '@/components/RiskPanel';
import { RecommendationPanel } from '@/components/RecommendationPanel';
import { ReleaseAnalysisRequest, ReleaseAnalysisResponse } from '@/lib/types';
import { SAFE_SCENARIO, ScenarioPreset } from '@/lib/mockData';
import { analyzeRelease, checkBackendHealth } from '@/lib/api';

export default function DashboardPage() {
  const [formData, setFormData] = useState<ReleaseAnalysisRequest>(SAFE_SCENARIO.request);
  const [response, setResponse] = useState<ReleaseAnalysisResponse>(SAFE_SCENARIO.expectedResponse);
  const [activePresetId, setActivePresetId] = useState<string>('safe');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMock, setIsMock] = useState<boolean>(true);
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<string | null>('Initial Benchmark');

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
    setLastAnalyzedAt(new Date().toLocaleTimeString());
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
    <div className="min-h-screen flex flex-col selection:bg-red-500 selection:text-white">
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Simple Clean Form (5 cols) */}
          <div className="lg:col-span-5">
            <MetricForm
              initialValues={formData}
              onSubmit={handleAnalyze}
              isLoading={isLoading}
              onReset={handleReset}
            />
          </div>

          {/* Right Column: Decision Hero + Dual Visual Gauges (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Recommendation Hero Panel */}
            <RecommendationPanel
              recommendation={response.recommendation}
              explanation={response.explanation}
              mitigations={response.mitigations}
              deploymentTimingAdvice={response.deployment_timing_advice}
            />

            {/* Two Gauges Side-by-Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Panel 1: Budget Gauge */}
              <BudgetGauge
                sloTarget={formData.slo_target}
                observedAvailability={formData.observed_availability}
                remainingBudgetPercent={response.remaining_budget_percent}
                budgetConsumedPercent={response.budget_consumed_percent}
              />

              {/* Panel 2: Risk Meter */}
              <RiskPanel
                riskScore={response.risk_score}
                factors={response.risk_factors}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Minimal Clean Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span className="font-bold text-slate-300">SIGNAL OPS</span>
          <span>Reliability & Change-Risk Advisor</span>
        </div>
      </footer>
    </div>
  );
}
