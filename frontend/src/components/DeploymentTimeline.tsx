'use client';

import React from 'react';
import { SuggestedWindow } from '@/lib/types';
import { Clock, Calendar, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';

interface DeploymentTimelineProps {
  proposedTime: string;
  suggestedWindows?: SuggestedWindow[];
  timingAdvice?: string;
  riskScore: number;
}

export const DeploymentTimeline: React.FC<DeploymentTimelineProps> = ({
  proposedTime,
  suggestedWindows,
  timingAdvice,
  riskScore
}) => {
  const proposedDate = new Date(proposedTime);
  const isValidDate = !isNaN(proposedDate.getTime());

  const formattedDate = isValidDate
    ? proposedDate.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : proposedTime;

  const currentWindowRisk = riskScore >= 65 ? 'high' : riskScore >= 35 ? 'medium' : 'low';

  return (
    <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-5 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-800">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-400" />
            Deployment Window & Schedule Analysis
          </h3>
          <p className="text-xs text-zinc-400">
            Traffic calendar validation, peak window detection, and simulated alternative slots.
          </p>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
          Simulated Schedule Data
        </span>
      </div>

      {/* Timing Advice Callout */}
      {timingAdvice && (
        <div className="mb-4 p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80 text-xs text-zinc-300 flex items-start gap-2.5">
          <Clock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-zinc-200">SRE Schedule Guidance: </span>
            {timingAdvice}
          </div>
        </div>
      )}

      {/* Visual Timeline Comparison */}
      <div className="space-y-3">
        {/* Proposed Window Slot */}
        <div className="p-3.5 rounded-lg bg-zinc-950/80 border border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                currentWindowRisk === 'low'
                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                  : currentWindowRisk === 'medium'
                  ? 'bg-amber-950/60 text-amber-400 border border-amber-800'
                  : 'bg-rose-950/60 text-rose-400 border border-rose-800'
              }`}
            >
              {currentWindowRisk === 'low' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : currentWindowRisk === 'medium' ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <ShieldAlert className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-200">
                  Target Proposed Window
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-blue-300 font-mono">
                  Requested
                </span>
              </div>
              <div className="text-xs font-mono text-zinc-400 mt-0.5">{formattedDate}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-medium capitalize ${
                currentWindowRisk === 'low'
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
                  : currentWindowRisk === 'medium'
                  ? 'bg-amber-950/60 text-amber-300 border border-amber-800'
                  : 'bg-rose-950/60 text-rose-300 border border-rose-800'
              }`}
            >
              {currentWindowRisk} Risk
            </span>
          </div>
        </div>

        {/* Alternative Suggested Windows */}
        {suggestedWindows && suggestedWindows.length > 0 && (
          <div className="pt-2">
            <span className="text-xs font-medium text-zinc-400 block mb-2">
              Alternative Evaluated Slots (Traffic-Calibrated):
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {suggestedWindows.map((win, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-zinc-950/50 border border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-zinc-300">{win.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase ${
                        win.risk_level === 'low'
                          ? 'bg-emerald-950 text-emerald-300'
                          : win.risk_level === 'medium'
                          ? 'bg-amber-950 text-amber-300'
                          : 'bg-rose-950 text-rose-300'
                      }`}
                    >
                      {win.risk_level} risk
                    </span>
                  </div>
                  <div className="text-xs font-mono text-zinc-400">{win.window}</div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-500">
                    <span>Low concurrency load</span>
                    <span className="italic">Simulated estimation</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
