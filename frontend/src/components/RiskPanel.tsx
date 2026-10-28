'use client';

import React from 'react';
import { Flame } from 'lucide-react';
import { RiskFactor } from '@/lib/types';

interface RiskPanelProps {
  riskScore: number;
  factors: RiskFactor[];
}

export const RiskPanel: React.FC<RiskPanelProps> = ({
  riskScore,
  factors
}) => {
  const isHighRisk = riskScore >= 65;
  const isMediumRisk = riskScore >= 35 && riskScore < 65;

  const scoreColor = isHighRisk
    ? 'text-rose-400 drop-shadow-[0_0_12px_rgba(239,68,68,0.7)]'
    : isMediumRisk
    ? 'text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.7)]'
    : 'text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.7)]';

  const barColor = isHighRisk
    ? 'from-amber-500 via-rose-500 to-red-600 shadow-[0_0_15px_rgba(239,68,68,0.8)]'
    : isMediumRisk
    ? 'from-emerald-500 via-amber-500 to-orange-500 shadow-[0_0_15px_rgba(245,158,11,0.8)]'
    : 'from-cyan-500 via-teal-400 to-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]';

  const riskBadge = isHighRisk
    ? { label: 'CRITICAL RISK', bg: 'bg-rose-950/80 text-rose-300 border-rose-500/60 shadow-[0_0_10px_rgba(239,68,68,0.3)]' }
    : isMediumRisk
    ? { label: 'ELEVATED RISK', bg: 'bg-amber-950/80 text-amber-300 border-amber-500/60 shadow-[0_0_10px_rgba(245,158,11,0.3)]' }
    : { label: 'LOW RISK', bg: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.3)]' };

  return (
    <div className="glass-panel rounded-2xl p-5 shadow-2xl flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
              <Flame className="w-4 h-4 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
              CHANGE RISK INDEX
            </h3>
            <p className="text-[11px] text-slate-400">Statistical risk model (0-100)</p>
          </div>
          <span
            className={`text-xs px-3 py-1 rounded-full font-mono font-bold border ${riskBadge.bg}`}
          >
            {riskBadge.label}
          </span>
        </div>

        {/* Large Score & Visual Meter */}
        <div className="my-5">
          <div className="flex items-baseline justify-between mb-2 font-mono">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              COMPOSITE SCORE
            </span>
            <div className="flex items-baseline gap-1">
              <span className={`text-4xl font-black ${scoreColor}`}>{riskScore}</span>
              <span className="text-sm text-slate-500 font-bold">/100</span>
            </div>
          </div>

          {/* Segmented Gradient Progress Bar */}
          <div className="w-full bg-slate-950 rounded-full h-4 p-0.5 border border-cyan-500/25 overflow-hidden shadow-inner">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700 ease-out`}
              style={{ width: `${Math.min(100, Math.max(6, riskScore))}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1.5">
            <span>0 (MINIMAL)</span>
            <span>35 (SAFEGUARD)</span>
            <span>65 (WAIT)</span>
            <span>100 (CRITICAL)</span>
          </div>
        </div>

        {/* Top Contributing Risk Drivers */}
        <div className="space-y-2 font-sans mt-4">
          <span className="text-xs font-mono font-bold text-slate-400 block mb-1 uppercase">
            PRIMARY RISK DRIVERS
          </span>
          {factors.slice(0, 3).map((factor, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs"
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
                      : 'bg-emerald-400 shadow-emerald-400'
                  }`}
                />
                <span className="text-slate-200 font-medium truncate">{factor.name}</span>
              </div>
              <span className="font-mono font-bold text-slate-300 shrink-0 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                +{factor.weight} pts
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
