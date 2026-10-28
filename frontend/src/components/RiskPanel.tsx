'use client';

import React from 'react';
import { AlertCircle, Flame, Activity, History, Zap } from 'lucide-react';
import { ChangeSize, RiskFactor } from '@/lib/types';

interface RiskPanelProps {
  riskScore: number;
  factors: RiskFactor[];
  recentIncidents: number;
  latencyMs: number;
  latencyThresholdMs: number;
  changeSize: ChangeSize;
}

export const RiskPanel: React.FC<RiskPanelProps> = ({
  riskScore,
  factors,
  recentIncidents,
  latencyMs,
  latencyThresholdMs,
  changeSize
}) => {
  const isHighRisk = riskScore >= 65;
  const isMediumRisk = riskScore >= 35 && riskScore < 65;
  const isLowRisk = riskScore < 35;

  const scoreColor = isHighRisk
    ? 'text-rose-400'
    : isMediumRisk
    ? 'text-amber-400'
    : 'text-emerald-400';

  const barColor = isHighRisk
    ? 'bg-rose-500'
    : isMediumRisk
    ? 'bg-amber-500'
    : 'bg-emerald-500';

  const riskBadge = isHighRisk
    ? { label: 'CRITICAL RISK', bg: 'bg-rose-950/60 text-rose-300 border-rose-800' }
    : isMediumRisk
    ? { label: 'ELEVATED RISK', bg: 'bg-amber-950/60 text-amber-300 border-amber-800' }
    : { label: 'LOW RISK', bg: 'bg-emerald-950/60 text-emerald-300 border-emerald-800' };

  // Contextual warnings
  const isLatencyBreached = latencyMs > latencyThresholdMs;
  const isLatencyNearThreshold = !isLatencyBreached && latencyMs > latencyThresholdMs * 0.85;

  return (
    <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-5 shadow-xl flex flex-col justify-between backdrop-blur-sm">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              Change Risk Assessment
            </h3>
            <p className="text-xs text-zinc-400">Multi-factor operational risk model (0-100)</p>
          </div>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold border ${riskBadge.bg}`}
          >
            {riskBadge.label}
          </span>
        </div>

        {/* Large Score & Visual Progress Bar */}
        <div className="my-4">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-xs text-zinc-400 font-medium">Composite Risk Score</span>
            <div className="flex items-baseline gap-1 font-mono">
              <span className={`text-3xl font-extrabold ${scoreColor}`}>{riskScore}</span>
              <span className="text-sm text-zinc-500">/100</span>
            </div>
          </div>

          {/* Segmented Risk Meter */}
          <div className="w-full bg-zinc-950 rounded-full h-3 p-0.5 border border-zinc-800 overflow-hidden relative">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
              style={{ width: `${Math.min(100, Math.max(5, riskScore))}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1">
            <span>0 (Minimal)</span>
            <span>35 (Safeguards Threshold)</span>
            <span>65 (Wait Threshold)</span>
            <span>100 (Critical)</span>
          </div>
        </div>

        {/* Contextual Badges / Indicators */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {/* Recent incidents indicator */}
          <div
            className={`p-2 rounded-lg border text-center ${
              recentIncidents > 0
                ? 'bg-rose-950/40 border-rose-900/70 text-rose-300'
                : 'bg-zinc-950/60 border-zinc-800 text-zinc-400'
            }`}
          >
            <History className="w-3.5 h-3.5 mx-auto mb-1 text-zinc-400" />
            <div className="text-[11px] font-medium">Recent Outages</div>
            <div className="text-sm font-mono font-bold">
              {recentIncidents === 0 ? '0 (Clean)' : `${recentIncidents} logged`}
            </div>
          </div>

          {/* Latency warning */}
          <div
            className={`p-2 rounded-lg border text-center ${
              isLatencyBreached
                ? 'bg-rose-950/40 border-rose-900/70 text-rose-300'
                : isLatencyNearThreshold
                ? 'bg-amber-950/40 border-amber-900/70 text-amber-300'
                : 'bg-zinc-950/60 border-zinc-800 text-zinc-400'
            }`}
          >
            <Activity className="w-3.5 h-3.5 mx-auto mb-1 text-zinc-400" />
            <div className="text-[11px] font-medium">Latency Delta</div>
            <div className="text-sm font-mono font-bold">
              {latencyMs}ms{' '}
              <span className="text-[10px] font-normal text-zinc-500">/{latencyThresholdMs}ms</span>
            </div>
          </div>

          {/* Change size indicator */}
          <div
            className={`p-2 rounded-lg border text-center ${
              changeSize === 'large'
                ? 'bg-amber-950/40 border-amber-900/70 text-amber-300'
                : 'bg-zinc-950/60 border-zinc-800 text-zinc-400'
            }`}
          >
            <Zap className="w-3.5 h-3.5 mx-auto mb-1 text-zinc-400" />
            <div className="text-[11px] font-medium">Change Size</div>
            <div className="text-sm font-mono font-bold capitalize">{changeSize}</div>
          </div>
        </div>

        {/* Top Contributing Risk Drivers */}
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-zinc-400 block mb-1">
            Primary Risk Contributors
          </span>
          {factors.slice(0, 3).map((factor, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded-md bg-zinc-950/60 border border-zinc-800/80 text-xs"
            >
              <div className="flex items-center gap-2 truncate pr-2">
                <div
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    factor.impact === 'critical'
                      ? 'bg-rose-500'
                      : factor.impact === 'high'
                      ? 'bg-rose-400'
                      : factor.impact === 'medium'
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                  }`}
                />
                <span className="text-zinc-200 truncate">{factor.name}</span>
              </div>
              <span className="font-mono text-zinc-400 shrink-0">+{factor.weight} pts</span>
            </div>
          ))}
        </div>
      </div>

      {/* Advisory Note */}
      <div className="mt-4 pt-3 border-t border-zinc-800/80 text-[11px] text-zinc-500 flex items-center justify-between">
        <span>Calibrated model baseline</span>
        <span className="font-mono text-zinc-400">Zero Latency Risk Engine</span>
      </div>
    </div>
  );
};
