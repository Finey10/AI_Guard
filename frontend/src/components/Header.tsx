'use client';

import React from 'react';
import { ShieldAlert, Server, Zap, Clock, Sparkles } from 'lucide-react';
import { PRESETS, ScenarioPreset } from '@/lib/mockData';

interface HeaderProps {
  selectedServiceName: string;
  isBackendConnected: boolean | null;
  isMock: boolean;
  lastAnalyzedAt: string | null;
  onSelectPreset: (preset: ScenarioPreset) => void;
  activePresetId?: string;
}

export const Header: React.FC<HeaderProps> = ({
  selectedServiceName,
  isBackendConnected,
  isMock,
  lastAnalyzedAt,
  onSelectPreset,
  activePresetId
}) => {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Brand & Subtitle */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 border border-indigo-400/30">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white font-mono flex items-center gap-2">
                  <span>ZERO LATENCY</span>
                  <span className="text-zinc-600 text-sm">/</span>
                  <span className="text-blue-400 text-sm font-sans font-semibold">ReleaseGuard AI</span>
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-800/80 text-zinc-300 border border-zinc-700/60 font-mono">
                  UG-42 · AO-05
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Deployment-Time Reliability & Change Risk Decision Support
              </p>
            </div>
          </div>

          {/* Right Section: Status Pills & Preset Loaders */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Service Tag */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300">
              <Server className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-zinc-500">Service:</span>
              <span className="text-blue-300 font-medium">{selectedServiceName || 'None'}</span>
            </div>

            {/* Backend Status */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
                isBackendConnected
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
                  : isMock
                  ? 'bg-amber-950/40 text-amber-300 border-amber-800/60'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800'
              }`}
              title={
                isBackendConnected
                  ? 'Connected to FastAPI backend'
                  : 'Backend unreachable: Running with calibrated mock engine'
              }
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  isBackendConnected
                    ? 'bg-emerald-400 animate-pulse'
                    : isMock
                    ? 'bg-amber-400'
                    : 'bg-zinc-500'
                }`}
              />
              <span>
                {isBackendConnected
                  ? 'Backend Online'
                  : isMock
                  ? 'Mock Data Mode'
                  : 'Checking Backend...'}
              </span>
            </div>

            {/* Timestamp */}
            {lastAnalyzedAt && (
              <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-900/80 border border-zinc-800/80 text-xs text-zinc-400">
                <Clock className="w-3 h-3 text-zinc-500" />
                <span>{lastAnalyzedAt}</span>
              </div>
            )}

            {/* Scenario Presets Quick Bar */}
            <div className="flex items-center bg-zinc-900/90 rounded-lg p-0.5 border border-zinc-800">
              <span className="text-[11px] font-medium text-zinc-400 px-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                Presets:
              </span>
              {PRESETS.map((preset) => {
                const isActive = activePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => onSelectPreset(preset)}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                      isActive
                        ? preset.id === 'safe'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                          : preset.id === 'risky'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                  >
                    {preset.id === 'safe' ? 'Safe (GO)' : preset.id === 'risky' ? 'Risky (WAIT)' : 'Caution'}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
