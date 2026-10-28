'use client';

import React from 'react';
import { RecommendationType, SuggestedWindow } from '@/lib/types';
import { CheckCircle2, AlertTriangle, XCircle, ShieldAlert, ArrowRight, Calendar, Sparkles } from 'lucide-react';

interface RecommendationPanelProps {
  recommendation: RecommendationType;
  explanation: string;
  mitigations: string[];
  deploymentTimingAdvice: string;
  suggestedWindows?: SuggestedWindow[];
}

export const RecommendationPanel: React.FC<RecommendationPanelProps> = ({
  recommendation,
  explanation,
  mitigations,
  deploymentTimingAdvice,
  suggestedWindows
}) => {
  const isGo = recommendation === 'GO';
  const isSafeguard = recommendation === 'GO_WITH_SAFE_GUARD';
  const isWait = recommendation === 'WAIT';

  const config = isGo
    ? {
        label: 'GO — APPROVED TO SHIP',
        sublabel: 'Reliability targets satisfied. Normal deployment velocity authorized.',
        badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        cardBg: 'from-emerald-950/20 to-zinc-900/80',
        borderColor: 'border-emerald-800/60',
        icon: CheckCircle2,
        iconColor: 'text-emerald-400'
      }
    : isSafeguard
    ? {
        label: 'GO WITH SAFEGUARD',
        sublabel: 'Moderate change risk detected. Enforce progressive rollout controls.',
        badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        cardBg: 'from-amber-950/20 to-zinc-900/80',
        borderColor: 'border-amber-800/60',
        icon: AlertTriangle,
        iconColor: 'text-amber-400'
      }
    : {
        label: 'WAIT — SHIPMENT NOT ADVISED',
        sublabel: 'Critical risk criteria or error budget boundary breached. Deferral advised.',
        badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        cardBg: 'from-rose-950/20 to-zinc-900/80',
        borderColor: 'border-rose-800/60',
        icon: XCircle,
        iconColor: 'text-rose-400'
      };

  const IconComponent = config.icon;

  return (
    <div
      className={`bg-gradient-to-b ${config.cardBg} border ${config.borderColor} rounded-xl p-5 shadow-2xl backdrop-blur-sm flex flex-col justify-between`}
    >
      <div>
        {/* Top Header Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl bg-zinc-950/60 border border-zinc-800 ${config.iconColor}`}>
              <IconComponent className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold block">
                Deployment Advisory Decision
              </span>
              <h2 className={`text-xl font-extrabold tracking-tight ${config.iconColor} font-mono`}>
                {config.label}
              </h2>
            </div>
          </div>
          <div className={`self-start sm:self-auto px-3 py-1 rounded-full text-xs font-mono font-medium border ${config.badgeBg}`}>
            Decision Support Only
          </div>
        </div>

        {/* AI & Mathematical Explanation */}
        <div className="my-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Reliability Rationale & Decision Factors
          </div>
          <div className="p-3.5 rounded-lg bg-zinc-950/70 border border-zinc-800 text-xs text-zinc-200 leading-relaxed">
            {explanation}
          </div>
        </div>

        {/* Actionable Safeguards or Mitigations */}
        {mitigations && mitigations.length > 0 && (
          <div className="my-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 mb-2">
              <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
              Actionable Safeguards & Mitigation Steps
            </div>
            <ul className="space-y-1.5">
              {mitigations.map((step, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-xs p-2.5 rounded-md bg-zinc-950/50 border border-zinc-800/80 text-zinc-300"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Timing Advice & Suggested Alternative Windows */}
        <div className="mt-4 pt-3 border-t border-zinc-800/80">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 mb-1.5">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            Deployment Schedule Advice
          </div>
          <p className="text-xs text-zinc-400 mb-2">{deploymentTimingAdvice}</p>

          {suggestedWindows && suggestedWindows.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {suggestedWindows.map((win, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80 text-xs flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-zinc-200 truncate">{win.label}</span>
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
                  <div className="text-[11px] font-mono text-zinc-400 truncate">{win.window}</div>
                  {win.is_simulated && (
                    <span className="text-[9px] text-zinc-500 mt-1 italic">
                      * Simulated schedule estimation
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Compliance Advisory Disclaimer */}
      <div className="mt-4 pt-3 border-t border-zinc-800/60 text-[10px] text-zinc-500 flex items-center justify-between">
        <span>Non-blocking advisory system</span>
        <span>Human engineer retains ultimate release authority</span>
      </div>
    </div>
  );
};
