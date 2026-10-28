'use client';

import React from 'react';
import { Flame } from 'lucide-react';
import { RiskFactor, RecommendationType } from '@/lib/types';

interface RiskPanelProps {
  riskScore: number;
  factors: RiskFactor[];
  recommendation?: RecommendationType;
}

export const RiskPanel: React.FC<RiskPanelProps> = ({
  riskScore,
  factors,
  recommendation
}) => {
  const isHighRisk = recommendation ? recommendation === 'WAIT' : riskScore >= 60;
  const isMediumRisk = recommendation ? recommendation === 'GO_WITH_SAFE_GUARD' : (riskScore >= 30 && riskScore < 60);

  const scoreColor = isHighRisk
    ? 'text-rose-400 drop-shadow-[0_0_12px_rgba(239,68,68,0.7)]'
    : isMediumRisk
    ? 'text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.7)]'
    : 'text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.7)]';

  const barColor = isHighRisk
    ? 'from-[#8C6246] via-rose-500 to-red-600 shadow-[0_0_15px_rgba(239,68,68,0.7)]'
    : isMediumRisk
    ? 'from-[#6F4E37] via-amber-500 to-yellow-400 shadow-[0_0_15px_rgba(245,158,11,0.7)]'
    : 'from-[#6F4E37] via-emerald-500 to-teal-400 shadow-[0_0_15px_rgba(16,185,129,0.6)]';

  const riskBadge = isHighRisk
    ? { label: 'CRITICAL RISK', bg: 'bg-rose-950/80 text-rose-300 border-rose-500/70 shadow-[0_0_12px_rgba(239,68,68,0.5)]' }
    : isMediumRisk
    ? { label: 'ELEVATED RISK', bg: 'bg-amber-950/80 text-amber-300 border-amber-500/70 shadow-[0_0_12px_rgba(245,158,11,0.5)]' }
    : { label: 'LOW RISK', bg: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/70 shadow-[0_0_12px_rgba(16,185,129,0.5)]' };

  return (
    <div className="glass-panel rounded-2xl p-5 shadow-2xl flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#6F4E37]/40">
          <div>
            <h3 className="text-sm font-bold text-[#E5E4E2] flex items-center gap-2 font-mono">
              <Flame className="w-4 h-4 text-[#E6E0F0] drop-shadow-[0_0_8px_rgba(230,224,240,0.8)]" />
              CHANGE RISK INDEX
            </h3>
            <p className="text-[11px] text-[#E6E0F0]/70 font-sans">Statistical risk model (0-100)</p>
          </div>
          <span
            className={`text-xs px-3 py-1 rounded-full font-mono font-bold border transition-all ${riskBadge.bg}`}
          >
            {riskBadge.label}
          </span>
        </div>

        {/* Large Score & Visual Meter */}
        <div className="my-5">
          <div className="flex items-baseline justify-between mb-2 font-mono">
            <span className="text-xs text-[#E6E0F0]/70 uppercase tracking-wider font-semibold">
              COMPOSITE SCORE
            </span>
            <div className="flex items-baseline gap-1">
              <span className={`text-4xl font-black ${scoreColor}`}>{riskScore}</span>
              <span className="text-sm text-[#E6E0F0]/60 font-bold">/100</span>
            </div>
          </div>

          {/* Segmented Gradient Progress Bar */}
          <div className="w-full bg-[#140D09] rounded-full h-4 p-0.5 border border-[#6F4E37]/50 overflow-hidden shadow-inner">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700 ease-out`}
              style={{ width: `${Math.min(100, Math.max(6, riskScore))}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-[#E6E0F0]/60 font-mono mt-1.5">
            <span>0 (MINIMAL)</span>
            <span>35 (SAFEGUARD)</span>
            <span>65 (WAIT)</span>
            <span>100 (CRITICAL)</span>
          </div>
        </div>

        {/* Top Contributing Risk Drivers */}
        <div className="space-y-2 font-sans mt-4">
          <span className="text-xs font-mono font-bold text-[#E6E0F0]/80 block mb-1 uppercase">
            PRIMARY RISK DRIVERS
          </span>
          {factors.slice(0, 3).map((factor, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 rounded-xl bg-[#1A110D]/90 border border-[#6F4E37]/40 text-xs"
            >
              <div className="flex items-center gap-2 truncate pr-2">
                <div
                  className={`w-2 h-2 rounded-full shrink-0 shadow-[0_0_6px] ${
                    factor.impact === 'critical'
                      ? 'bg-rose-500 shadow-rose-500'
                      : factor.impact === 'high'
                      ? 'bg-rose-400 shadow-rose-400'
                      : factor.impact === 'medium'
                      ? 'bg-amber-400 shadow-amber-400'
                      : 'bg-[#E6E0F0] shadow-[#E6E0F0]'
                  }`}
                />
                <span className="text-[#E5E4E2] font-medium truncate">{factor.name}</span>
              </div>
              <span className="font-mono font-bold text-[#E6E0F0] shrink-0 bg-[#241712] px-2 py-0.5 rounded border border-[#6F4E37]/50">
                +{factor.weight} pts
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
