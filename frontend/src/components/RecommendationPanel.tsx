'use client';

import React from 'react';
import { RecommendationType, SuggestedWindow } from '@/lib/types';
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck, ArrowRight, Calendar, Sparkles, Terminal } from 'lucide-react';

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
        sublabel: 'Reliability targets satisfied · Normal deployment velocity authorized',
        confidence: '94.8%',
        panelClass: 'glass-panel-emerald',
        badgeBg: 'bg-emerald-950/80 text-emerald-300 border-emerald-400/80 shadow-[0_0_15px_rgba(16,185,129,0.4)]',
        titleColor: 'text-emerald-400 neon-glow-emerald',
        icon: CheckCircle2,
        iconColor: 'text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]'
      }
    : isSafeguard
    ? {
        label: 'GO WITH SAFEGUARD',
        sublabel: 'Moderate change risk detected · Enforce progressive rollout controls',
        confidence: '78.2%',
        panelClass: 'glass-panel-amber',
        badgeBg: 'bg-amber-950/80 text-amber-300 border-amber-400/80 shadow-[0_0_15px_rgba(245,158,11,0.4)]',
        titleColor: 'text-amber-400',
        icon: AlertTriangle,
        iconColor: 'text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]'
      }
    : {
        label: 'WAIT — SHIPMENT NOT ADVISED',
        sublabel: 'Critical risk criteria or error budget boundary breached · Deferral advised',
        confidence: '91.4%',
        panelClass: 'glass-panel-rose',
        badgeBg: 'bg-rose-950/80 text-rose-300 border-rose-400/80 shadow-[0_0_15px_rgba(239,68,68,0.4)]',
        titleColor: 'text-rose-400 neon-glow-rose',
        icon: XCircle,
        iconColor: 'text-rose-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]'
      };

  const IconComponent = config.icon;

  return (
    <div
      className={`${config.panelClass} rounded-2xl p-6 shadow-2xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden`}
    >
      {/* Decorative cyber grid highlight */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-radial from-white/5 to-transparent pointer-events-none rounded-full blur-2xl -mr-16 -mt-16" />

      <div>
        {/* Top Header Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-700/60">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 shadow-inner">
              <IconComponent className={`w-7 h-7 ${config.iconColor}`} />
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400 font-bold block">
                DEPLOYMENT ADVISORY DECISION
              </span>
              <h2 className={`text-2xl font-black tracking-tight font-mono ${config.titleColor}`}>
                {config.label}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${config.badgeBg}`}>
              CONFIDENCE {config.confidence}
            </div>
          </div>
        </div>

        {/* AI & Mathematical Explanation */}
        <div className="my-4">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-300 mb-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>AI OPS RELIABILITY RATIONALE</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/80 border border-cyan-500/20 text-xs text-slate-200 leading-relaxed shadow-inner">
            {explanation}
          </div>
        </div>

        {/* Actionable Safeguards or Mitigations */}
        {mitigations && mitigations.length > 0 && (
          <div className="my-4">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-300 mb-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>ACTIONABLE SAFEGUARDS & MITIGATION GATES</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {mitigations.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 text-xs p-3 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 transition-colors text-slate-200"
                >
                  <ArrowRight className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span className="font-sans font-medium">{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timing Advice & Suggested Alternative Windows */}
        <div className="mt-4 pt-4 border-t border-slate-800/80">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-300 mb-2">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span>DEPLOYMENT SCHEDULE INTELLIGENCE</span>
          </div>
          <p className="text-xs text-slate-400 mb-3">{deploymentTimingAdvice}</p>

          {suggestedWindows && suggestedWindows.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {suggestedWindows.map((win, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-950/70 border border-cyan-500/25 text-xs flex flex-col justify-between hover:border-cyan-400/50 transition-colors shadow-sm"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-slate-100">{win.label}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                        win.risk_level === 'low'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                          : win.risk_level === 'medium'
                          ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                          : 'bg-rose-950 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {win.risk_level} risk
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-cyan-300">{win.window}</div>
                  {win.is_simulated && (
                    <span className="text-[9px] text-slate-500 mt-1 italic">
                      * Calibrated traffic simulation
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Compliance Advisory Disclaimer */}
      <div className="mt-4 pt-3 border-t border-slate-800/60 text-[10px] font-mono text-slate-500 flex items-center justify-between">
        <span>ADVISORY-ONLY SYSTEM · NON-BLOCKING</span>
        <span>ENGINEER MAINTAINS ULTIMATE AUTHORITY</span>
      </div>
    </div>
  );
};
