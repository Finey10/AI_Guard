'use client';

import React from 'react';
import { ShieldCheck, Server, Sparkles, Activity, Clock, Radio } from 'lucide-react';
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
    <header className="border-b border-cyan-500/20 bg-slate-950/85 backdrop-blur-xl sticky top-0 z-50 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Brand & System Status */}
          <div className="flex items-center gap-3.5">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-red-600 via-rose-500 to-red-500 rounded-xl blur-md opacity-70 group-hover:opacity-100 transition duration-500" />
              <div className="relative w-11 h-11 rounded-xl bg-slate-950/90 border border-red-500/50 flex items-center justify-center p-1.5 shadow-lg shadow-red-500/20">
                <img
                  src="/logo.png"
                  alt="Signal Ops Logo"
                  className="w-full h-full object-contain drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-extrabold tracking-tight text-white font-mono flex items-center gap-2">
                  <span className="tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-rose-400 to-white drop-shadow-[0_0_12px_rgba(239,68,68,0.5)]">
                    SIGNAL OPS
                  </span>
                </h1>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <Radio className="w-3 h-3 animate-pulse" />
                  Real-Time Reliability & Change-Risk Orchestration
                </span>
              </div>
            </div>
          </div>

          {/* Right Controls: Service Target, Status, Presets */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Active Service Target Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-cyan-500/30 text-xs font-mono text-slate-200 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
              <Server className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400">TARGET:</span>
              <span className="text-cyan-300 font-bold">{selectedServiceName || 'checkout-service'}</span>
            </div>

            {/* Backend Connection Status */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all ${
                isBackendConnected
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : isMock
                  ? 'bg-amber-950/60 text-amber-300 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  isBackendConnected
                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.9)] animate-pulse'
                    : isMock
                    ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.9)]'
                    : 'bg-slate-500'
                }`}
              />
              <span>
                {isBackendConnected
                  ? 'API: LIVE ONLINE'
                  : isMock
                  ? 'MOCK ENGINE ACTIVE'
                  : 'CONNECTING...'}
              </span>
            </div>

            {/* Presets Toggle Group */}
            <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-cyan-500/25 shadow-inner">
              <span className="text-[11px] font-mono font-bold text-slate-400 px-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                PRESETS:
              </span>
              {PRESETS.map((preset) => {
                const isActive = activePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => onSelectPreset(preset)}
                    className={`px-3 py-1 text-xs font-mono font-bold rounded-lg transition-all duration-200 ${
                      isActive
                        ? preset.id === 'safe'
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.6)] border border-emerald-400'
                          : preset.id === 'risky'
                          ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.6)] border border-rose-400'
                          : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.6)] border border-amber-400'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
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
