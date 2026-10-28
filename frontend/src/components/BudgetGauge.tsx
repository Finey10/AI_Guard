'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2, Shield } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { RecommendationType } from '@/lib/types';

interface BudgetGaugeProps {
  sloTarget: number;
  observedAvailability: number;
  remainingBudgetPercent: number;
  budgetConsumedPercent: number;
  recommendation?: RecommendationType;
}

export const BudgetGauge: React.FC<BudgetGaugeProps> = ({
  sloTarget,
  observedAvailability,
  remainingBudgetPercent,
  budgetConsumedPercent,
  recommendation
}) => {
  const allowedUnavailability = Math.max(0, 100 - sloTarget).toFixed(3);
  const isExhausted = remainingBudgetPercent <= 0.05 || observedAvailability < sloTarget;

  // Harmonized risk coloring: sync directly with the deployment readiness signal
  const isRed = recommendation
    ? recommendation === 'WAIT'
    : remainingBudgetPercent < 20 || isExhausted;

  const isYellow = recommendation
    ? recommendation === 'GO_WITH_SAFE_GUARD'
    : remainingBudgetPercent >= 20 && remainingBudgetPercent < 50;

  const data = [
    { name: 'Remaining', value: Math.max(0, remainingBudgetPercent) },
    { name: 'Consumed', value: Math.max(0, budgetConsumedPercent) }
  ];

  const remainingColor = isRed
    ? '#ef4444' // Ruby Rose (Red)
    : isYellow
    ? '#f59e0b' // Amber Gold (Yellow)
    : '#10b981'; // Emerald Green (Green)

  const consumedColor = '#2D1E16'; // Deep Mocha background track

  const ringGlow = isRed
    ? 'drop-shadow(0 0 12px rgba(239, 68, 68, 0.75))'
    : isYellow
    ? 'drop-shadow(0 0 12px rgba(245, 158, 11, 0.75))'
    : 'drop-shadow(0 0 12px rgba(16, 185, 129, 0.75))';

  return (
    <div className="glass-panel rounded-2xl p-5 shadow-2xl flex flex-col justify-between relative overflow-hidden">
      {/* Exhausted Budget Alert Bar */}
      {isExhausted && (
        <div className="absolute top-0 inset-x-0 bg-gradient-to-r from-red-600 to-rose-600 text-white px-3 py-1.5 text-xs font-mono font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.7)] animate-pulse z-10">
          <AlertTriangle className="w-4 h-4" />
          CRITICAL: ERROR BUDGET IS EXHAUSTED OR BELOW SLO
        </div>
      )}

      <div>
        {/* Header */}
        <div className={`flex items-center justify-between pb-3 border-b border-[#6F4E37]/40 ${isExhausted ? 'pt-6' : ''}`}>
          <div>
            <h3 className="text-sm font-bold text-[#E5E4E2] flex items-center gap-2 font-mono">
              <Shield className="w-4 h-4 text-[#E6E0F0] drop-shadow-[0_0_8px_rgba(230,224,240,0.8)]" />
              SLO ERROR BUDGET
            </h3>
            <p className="text-[11px] text-[#E6E0F0]/70 font-sans">Rolling 30-day SRE consumption window</p>
          </div>
          <span
            className={`text-xs px-3 py-1 rounded-full font-mono font-bold border transition-all ${
              isRed
                ? 'bg-rose-950/80 text-rose-300 border-rose-500/70 shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                : isYellow
                ? 'bg-amber-950/80 text-amber-300 border-amber-500/70 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/70 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
            }`}
          >
            {isExhausted
              ? 'EXHAUSTED'
              : isRed
              ? 'CRITICAL / LOW'
              : isYellow
              ? 'CAUTION / SAFEGUARD'
              : 'HEALTHY BUFFER'}
          </span>
        </div>

        {/* Center Donut / Radial Gauge */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="w-48 h-48 relative" style={{ filter: ringGlow }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={82}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                  strokeWidth={0}
                >
                  <Cell fill={remainingColor} />
                  <Cell fill={consumedColor} />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center label with glowing typography synced to current risk color */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span
                className={`text-3xl font-black font-mono tracking-tight ${
                  isRed
                    ? 'text-rose-400 drop-shadow-[0_0_12px_rgba(239,68,68,0.7)]'
                    : isYellow
                    ? 'text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.7)]'
                    : 'text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.7)]'
                }`}
              >
                {remainingBudgetPercent.toFixed(1)}%
              </span>
              <span
                className={`text-[11px] font-mono font-bold uppercase tracking-wider ${
                  isRed
                    ? 'text-rose-300/90'
                    : isYellow
                    ? 'text-amber-300/90'
                    : 'text-emerald-300/90'
                }`}
              >
                REMAINING
              </span>
            </div>
          </div>
        </div>

        {/* Budget breakdown metrics grid */}
        <div className="grid grid-cols-2 gap-2 text-xs mb-3 font-mono">
          <div className="p-2.5 rounded-xl bg-[#1A110D]/90 border border-[#6F4E37]/40 shadow-inner">
            <span className="text-[#E6E0F0]/60 block text-[10px] uppercase">SLO Target</span>
            <span className="text-[#E5E4E2] font-bold text-sm">
              {sloTarget.toFixed(2)}%
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#1A110D]/90 border border-[#6F4E37]/40 shadow-inner">
            <span className="text-[#E6E0F0]/60 block text-[10px] uppercase">Observed Availability</span>
            <span
              className={`font-bold text-sm ${
                isRed
                  ? 'text-rose-400'
                  : isYellow
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {observedAvailability.toFixed(3)}%
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#1A110D]/90 border border-[#6F4E37]/40 shadow-inner">
            <span className="text-[#E6E0F0]/60 block text-[10px] uppercase">Allowed Outage</span>
            <span className="text-[#E5E4E2] text-xs font-semibold">{allowedUnavailability}%</span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#1A110D]/90 border border-[#6F4E37]/40 shadow-inner">
            <span className="text-[#E6E0F0]/60 block text-[10px] uppercase">Budget Consumed</span>
            <span
              className={`text-xs font-bold ${
                isRed
                  ? 'text-rose-400'
                  : isYellow
                  ? 'text-amber-400'
                  : 'text-[#E5E4E2]'
              }`}
            >
              {budgetConsumedPercent.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Footer advice badge */}
      <div
        className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${
          isRed
            ? 'bg-rose-950/40 border-rose-500/50 text-rose-200 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
            : isYellow
            ? 'bg-amber-950/40 border-amber-500/50 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
            : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
        }`}
      >
        {isRed ? (
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
        ) : isYellow ? (
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        )}
        <div className="font-sans font-medium text-[11px] leading-relaxed">
          {isExhausted
            ? 'Budget exhausted or below SLO. Non-emergency releases must wait or require SRE waiver.'
            : isRed
            ? 'Critical release risk: error budget severely depleted. Release blocked until stabilized.'
            : isYellow
            ? 'Caution: Elevated release risk detected. Canary safeguards and active monitoring enforced.'
            : 'Error budget capacity is healthy. Normal release velocity authorized.'}
        </div>
      </div>
    </div>
  );
};
