'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { MetricForm } from '@/components/MetricForm';
import { BudgetGauge } from '@/components/BudgetGauge';
import { RiskPanel } from '@/components/RiskPanel';
import { RecommendationPanel } from '@/components/RecommendationPanel';
import { SignalIndicator } from '@/components/SignalIndicator';
import { AuthModal } from '@/components/AuthModal';
import { ReleaseAnalysisRequest, ReleaseAnalysisResponse, AuthUser } from '@/lib/types';
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

  // Authentication State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('signal_ops_auth_user');
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
      }
    } catch {
      // localStorage read error ignored
    }
  }, []);

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('signal_ops_auth_user');
    } catch {
      // localStorage remove error ignored
    }
    setCurrentUser(null);
  };

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
    <div className="min-h-screen flex flex-col selection:bg-[#6F4E37] selection:text-[#E6E0F0]">
      {/* Header with Auth Tab */}
      <Header
        selectedServiceName={formData.service_name}
        isBackendConnected={backendConnected}
        isMock={isMock}
        lastAnalyzedAt={lastAnalyzedAt}
        onSelectPreset={handleSelectPreset}
        activePresetId={activePresetId}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Top Row: Release Telemetry (5 cols) & Deployment Decision (7 cols) - Perfectly Matched Height */}
          <div className="lg:col-span-5 flex flex-col">
            <MetricForm
              initialValues={formData}
              onSubmit={handleAnalyze}
              isLoading={isLoading}
              onReset={handleReset}
            />
          </div>

          <div className="lg:col-span-7 flex flex-col">
            <RecommendationPanel
              recommendation={response.recommendation}
              explanation={response.explanation}
              mitigations={response.mitigations}
              deploymentTimingAdvice={response.deployment_timing_advice}
            />
          </div>

          {/* Second Row: Signal Indicator (5 cols below Release Telemetry) & Dual Gauges (7 cols) */}
          <div className="lg:col-span-5 flex flex-col">
            <SignalIndicator
              recommendation={response.recommendation}
              riskScore={response.risk_score}
            />
          </div>

          <div className="lg:col-span-7">
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

      {/* Authentication Modal / Tab Dialog */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Minimal Clean Footer */}
      <footer className="border-t border-[#6F4E37]/35 bg-[#160E0A]/90 py-4 mt-8 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs text-[#E6E0F0]/70 font-mono">
          <span className="font-bold text-[#E5E4E2]">SIGNAL OPS</span>
          <span>Reliability & Change-Risk Advisor</span>
        </div>
      </footer>
    </div>
  );
}
