'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2, TrendingDown, Shield } from 'lucide-react';
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
  // Allowed unavailability formula: 100 - SLO
  const allowedUnavailability = Math.max(0, 100 - sloTarget).toFixed(3);
  const observedUnavailability = Math.max(0, 100 - observedAvailability).toFixed(3);

  const isExhausted = remainingBudgetPercent <= 5;
  const isCritical = remainingBudgetPercent < 20;
  const isWarning = remainingBudgetPercent >= 20 && remainingBudgetPercent < 50;

  // Chart data for donut representation: [Remaining, Consumed]
  const data = [
    { name: 'Remaining', value: Math.max(0, remainingBudgetPercent) },
    { name: 'Consumed', value: Math.max(0, budgetConsumedPercent) }
  ];

  const remainingColor = isCritical
    ? '#ef4444' // red-500
    : isWarning
    ? '#f59e0b' // amber-500
    : '#10b981'; // emerald-500

  const consumedColor = '#27272a'; // zinc-800

  return (
    <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-5 shadow-xl flex flex-col justify-between backdrop-blur-sm relative overflow-hidden">
      {/* Top Banner when budget is exhausted */}
      {isExhausted && (
        <div className="absolute top-0 inset-x-0 bg-rose-600/90 text-white px-3 py-1 text-xs font-semibold flex items-center justify-center gap-1.5 shadow">
          <AlertTriangle className="w-3.5 h-3.5" />
          CRITICAL: ERROR BUDGET IS EXHAUSTED OR NEAR ZERO
        </div>
      )}

      <div>
        {/* Header */}
        <div className={`flex items-center justify-between pb-3 border-b border-zinc-800/80 ${isExhausted ? 'pt-5' : ''}`}>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              SLO Error Budget Status
            </h3>
            <p className="text-xs text-zinc-400">Google SRE rolling 30-day budget window</p>
          </div>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-medium border ${
              isCritical
                ? 'bg-rose-950/60 text-rose-300 border-rose-800'
                : isWarning
                ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                : 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
            }`}
          >
            {isExhausted
              ? 'Exhausted'
              : isCritical
              ? 'Critical Low'
              : isWarning
              ? 'At Risk'
              : 'Healthy'}
          </span>
        </div>

        {/* Center Donut / Gauge */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="w-44 h-44 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
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
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold font-mono text-white tracking-tight">
                {remainingBudgetPercent.toFixed(1)}%
              </span>
              <span className="text-[11px] text-zinc-400 font-medium">Remaining</span>
            </div>
          </div>
        </div>

        {/* Budget breakdown metrics */}
        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
          <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
            <span className="text-zinc-500 block text-[11px]">SLO Target</span>
            <span className="text-zinc-200 font-mono font-semibold text-sm">
              {sloTarget.toFixed(2)}%
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
            <span className="text-zinc-500 block text-[11px]">Observed Availability</span>
            <span
              className={`font-mono font-semibold text-sm ${
                observedAvailability < sloTarget ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {observedAvailability.toFixed(3)}%
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
            <span className="text-zinc-500 block text-[11px]">Allowed Unavailability</span>
            <span className="text-zinc-300 font-mono text-xs">{allowedUnavailability}%</span>
          </div>

          <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
            <span className="text-zinc-500 block text-[11px]">Consumed Budget</span>
            <span
              className={`font-mono text-xs font-semibold ${
                budgetConsumedPercent > 80 ? 'text-rose-400' : 'text-zinc-300'
              }`}
            >
              {budgetConsumedPercent.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Footer advice */}
      <div
        className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
          isCritical
            ? 'bg-rose-950/30 border-rose-900/60 text-rose-300'
            : isWarning
            ? 'bg-amber-950/30 border-amber-900/60 text-amber-300'
            : 'bg-emerald-950/30 border-emerald-900/60 text-emerald-300'
        }`}
      >
        {isCritical ? (
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        )}
        <div>
          {isExhausted
            ? 'Budget exhausted. Non-critical releases must wait or receive VP reliability sign-off.'
            : isCritical
            ? 'Budget severely depleted. Deployments without canary safeguards risk SLA breach.'
            : isWarning
            ? 'Moderate budget consumption. Canary safeguards and active monitoring recommended.'
            : 'Error budget is healthy. Reliability targets allow standard deployment velocity.'}
        </div>
      </div>
    </div>
  );
};
