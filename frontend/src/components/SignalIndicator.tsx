'use client';

import React from 'react';
import { RecommendationType } from '@/lib/types';
import { AlertCircle, AlertTriangle, CheckCircle2, Radio } from 'lucide-react';

interface SignalIndicatorProps {
  recommendation: RecommendationType;
  riskScore: number;
}

export const SignalIndicator: React.FC<SignalIndicatorProps> = ({
  recommendation,
  riskScore
}) => {
  const isRedActive = recommendation === 'WAIT';
  const isYellowActive = recommendation === 'GO_WITH_SAFE_GUARD';
  const isGreenActive = recommendation === 'GO';

  return (
    <div className="glass-panel rounded-2xl p-5 shadow-2xl flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#6F4E37]/40 mb-4">
        <div>
          <h3 className="text-sm font-bold text-[#E5E4E2] flex items-center gap-2 font-mono">
            <Radio className="w-4 h-4 text-[#E6E0F0] animate-pulse" />
            DEPLOYMENT READINESS SIGNAL
          </h3>
          <p className="text-[11px] text-[#E6E0F0]/70 font-sans">
            Real-time optical threshold indicator
          </p>
        </div>
        <div
          className={`text-[11px] px-3 py-1 rounded-full font-mono font-bold border transition-all ${
            isRedActive
              ? 'bg-rose-950/80 text-rose-300 border-rose-500/70 shadow-[0_0_12px_rgba(239,68,68,0.5)]'
              : isYellowActive
              ? 'bg-amber-950/80 text-amber-300 border-amber-500/70 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
              : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/70 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
          }`}
        >
          {isRedActive
            ? 'SIGNAL: RED (HOLD)'
            : isYellowActive
            ? 'SIGNAL: YELLOW (CAUTION)'
            : 'SIGNAL: GREEN (GO)'}
        </div>
      </div>

      {/* 3 Horizontal Signal Pills: Red, Yellow, Green */}
      <div className="grid grid-cols-3 gap-3.5 my-2">
        {/* RED PILL */}
        <div
          className={`h-14 rounded-full flex items-center justify-center gap-2 transition-all duration-500 ${
            isRedActive
              ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white font-mono font-black text-xs tracking-wider shadow-[0_0_35px_rgba(239,68,68,0.95)] ring-2 ring-red-300 animate-pulse scale-[1.02]'
              : 'bg-[#1C100C]/70 border border-[#6F4E37]/35 text-red-500/30 opacity-40 hover:opacity-60'
          }`}
        >
          <AlertCircle
            className={`w-4 h-4 ${isRedActive ? 'text-white' : 'text-red-500/40'}`}
          />
          <span className="font-mono text-xs font-black">WAIT</span>
        </div>

        {/* YELLOW PILL */}
        <div
          className={`h-14 rounded-full flex items-center justify-center gap-2 transition-all duration-500 ${
            isYellowActive
              ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-mono font-black text-xs tracking-wider shadow-[0_0_35px_rgba(245,158,11,0.95)] ring-2 ring-yellow-200 animate-pulse scale-[1.02]'
              : 'bg-[#1C160B]/70 border border-[#6F4E37]/35 text-amber-500/30 opacity-40 hover:opacity-60'
          }`}
        >
          <AlertTriangle
            className={`w-4 h-4 ${isYellowActive ? 'text-slate-950 font-bold' : 'text-amber-500/40'}`}
          />
          <span className="font-mono text-xs font-black">CAUTION</span>
        </div>

        {/* GREEN PILL */}
        <div
          className={`h-14 rounded-full flex items-center justify-center gap-2 transition-all duration-500 ${
            isGreenActive
              ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 text-white font-mono font-black text-xs tracking-wider shadow-[0_0_35px_rgba(16,185,129,0.95)] ring-2 ring-emerald-300 animate-pulse scale-[1.02]'
              : 'bg-[#0E1A12]/70 border border-[#6F4E37]/35 text-emerald-500/30 opacity-40 hover:opacity-60'
          }`}
        >
          <CheckCircle2
            className={`w-4 h-4 ${isGreenActive ? 'text-white' : 'text-emerald-500/40'}`}
          />
          <span className="font-mono text-xs font-black">GO</span>
        </div>
      </div>

      {/* Contextual Status Banner */}
      <div
        className={`mt-4 p-3 rounded-xl border text-xs font-mono transition-all flex items-center justify-between ${
          isRedActive
            ? 'bg-rose-950/40 border-rose-500/50 text-rose-200 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
            : isYellowActive
            ? 'bg-amber-950/40 border-amber-500/50 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
            : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
        }`}
      >
        <span className="text-[11px] font-sans font-medium">
          {isRedActive
            ? 'CRITICAL GATE: High change risk or depleted error budget. Deployment halted.'
            : isYellowActive
            ? 'CONDITIONAL GATE: Release permissible only with active canary safeguard phase.'
            : 'APPROVED GATE: All reliability thresholds verified. Ready for deployment.'}
        </span>
        <span className="font-bold text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-black/40 border border-white/10 shrink-0 ml-2">
          Risk: {riskScore}/100
        </span>
      </div>
    </div>
  );
};
