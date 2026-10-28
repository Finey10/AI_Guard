'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2, Shield } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface BudgetGaugeProps {
  sloTarget: number;
  observedAvailability: number;
  remainingBudgetPercent: number;
  budgetConsumedPercent: number;
}

export const BudgetGauge: React.FC<BudgetGaugeProps> = ({
  sloTarget,
  observedAvailability,
  remainingBudgetPercent,
  budgetConsumedPercent
}) => {
  const allowedUnavailability = Math.max(0, 100 - sloTarget).toFixed(3);
  const isExhausted = remainingBudgetPercent <= 5;
  const isCritical = remainingBudgetPercent < 20;
  const isWarning = remainingBudgetPercent >= 20 && remainingBudgetPercent < 50;

  const data = [
    { name: 'Remaining', value: Math.max(0, remainingBudgetPercent) },
    { name: 'Consumed', value: Math.max(0, budgetConsumedPercent) }
  ];

  const remainingColor = isCritical
    ? '#ef4444' // ruby rose
    : isWarning
    ? '#f59e0b' // amber
    : '#10b981'; // healthy emerald

  const consumedColor = '#2D1E16'; // Deep Mocha background track

  return (
    <div className="glass-panel rounded-2xl p-5 shadow-2xl flex flex-col justify-between relative overflow-hidden">
      {/* Exhausted Budget Alert Bar */}
      {isExhausted && (
        <div className="absolute top-0 inset-x-0 bg-gradient-to-r from-red-600 to-rose-600 text-white px-3 py-1.5 text-xs font-mono font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.7)] animate-pulse z-10">
          <AlertTriangle className="w-4 h-4" />
          CRITICAL: ERROR BUDGET IS EXHAUSTED OR NEAR ZERO
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
            className={`text-xs px-3 py-1 rounded-full font-mono font-bold border ${
              isCritical
                ? 'bg-rose-950/80 text-rose-300 border-rose-500/60 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                : isWarning
                ? 'bg-amber-950/80 text-amber-300 border-amber-500/60 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                : 'bg-[#291B14] text-[#E5E4E2] border-[#6F4E37] shadow-[0_0_10px_rgba(111,78,55,0.4)]'
            }`}
          >
            {isExhausted
              ? 'EXHAUSTED'
              : isCritical
              ? 'CRITICAL LOW'
              : isWarning
              ? 'WARNING'
              : 'HEALTHY BUFFER'}
          </span>
        </div>

        {/* Center Donut / Radial Gauge */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="w-48 h-48 relative">
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
            {/* Center label with glowing typography */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black font-mono text-[#E5E4E2] tracking-tight drop-shadow-[0_0_12px_rgba(230,224,240,0.5)]">
                {remainingBudgetPercent.toFixed(1)}%
              </span>
              <span className="text-[11px] font-mono text-[#E6E0F0] font-bold uppercase tracking-wider">
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
                observedAvailability < sloTarget ? 'text-rose-400' : 'text-emerald-400'
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
                budgetConsumedPercent > 80 ? 'text-rose-400' : 'text-[#E5E4E2]'
              }`}
            >
              {budgetConsumedPercent.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Footer advice badge */}
      <div
        className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
          isCritical
            ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
            : isWarning
            ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
            : 'bg-[#261912]/80 border-[#6F4E37]/60 text-[#E5E4E2]'
        }`}
      >
        {isCritical ? (
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-[#E6E0F0] shrink-0 mt-0.5" />
        )}
        <div className="font-sans font-medium text-[11px] leading-relaxed">
          {isExhausted
            ? 'Budget exhausted. Non-emergency releases must wait or require SRE waiver.'
            : isCritical
            ? 'Budget severely depleted. Shipments without canary safeguards risk SLA breach.'
            : isWarning
            ? 'Moderate budget consumption. Canary safeguards and active monitoring enforced.'
            : 'Error budget capacity is healthy. Normal release velocity authorized.'}
        </div>
      </div>
    </div>
  );
};
