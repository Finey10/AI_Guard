'use client';

import React from 'react';
import { SuggestedWindow } from '@/lib/types';
import { Clock, Calendar, CheckCircle2, AlertTriangle, ShieldAlert, Activity } from 'lucide-react';

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
    <div className="glass-panel rounded-2xl p-5 shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 mb-4 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
            <Calendar className="w-4 h-4 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            DEPLOYMENT TIMELINE & TRAFFIC PROFILE
          </h3>
          <p className="text-[11px] text-slate-400">
            Real-time latency telemetry wave and traffic window analysis
          </p>
        </div>
        <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-slate-900 text-cyan-300 border border-cyan-500/30 self-start sm:self-auto shadow-sm">
          CALIBRATED SRE PROFILE
        </span>
      </div>

      {/* Synthetic Neon Wave Graph Visualizer */}
      <div className="mb-4 p-4 rounded-xl bg-slate-950/80 border border-cyan-500/20 relative overflow-hidden">
        <div className="flex items-center justify-between mb-2 text-xs font-mono">
          <div className="flex items-center gap-2 text-cyan-300 font-bold">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>P95 LATENCY & CONCURRENCY WAVE</span>
          </div>
          <span className="text-[10px] text-slate-400">Target Threshold: 250ms</span>
        </div>

        {/* SVG Neon Wave Line */}
        <div className="w-full h-24 relative">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 500 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="neonWaveGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Threshold Line */}
            <line x1="0" y1="35" x2="500" y2="35" stroke="#ef4444" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />

            {/* Wave Area Fill */}
            <path
              d="M 0 65 Q 50 45, 100 60 T 200 40 T 300 70 T 400 30 T 500 55 L 500 100 L 0 100 Z"
              fill="url(#neonWaveGradient)"
            />

            {/* Glowing Wave Stroke */}
            <path
              d="M 0 65 Q 50 45, 100 60 T 200 40 T 300 70 T 400 30 T 500 55"
              fill="none"
              stroke="#00e5ff"
              strokeWidth="2.5"
              filter="url(#glow)"
            />

            {/* Highlighted Deploy Pulse Dot */}
            <circle cx="300" cy="70" r="4" fill="#00f59b" stroke="#ffffff" strokeWidth="1.5" className="animate-ping" />
            <circle cx="300" cy="70" r="4" fill="#00f59b" stroke="#ffffff" strokeWidth="1.5" />
          </svg>
        </div>

        <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-2 pt-2 border-t border-slate-900">
          <span>08:00 (Off-Peak)</span>
          <span>12:00 (Lunch Surge)</span>
          <span className="text-emerald-400 font-bold">14:00 (Safe Window)</span>
          <span>18:00 (Evening Peak)</span>
          <span>22:00 (Taper)</span>
        </div>
      </div>

      {/* SRE Schedule Guidance Callout */}
      {timingAdvice && (
        <div className="mb-4 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
          <Clock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-mono font-bold text-cyan-300">SRE GUIDANCE: </span>
            <span>{timingAdvice}</span>
          </div>
        </div>
      )}

      {/* Target Proposed Slot */}
      <div className="space-y-3">
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-inner">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                currentWindowRisk === 'low'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                  : currentWindowRisk === 'medium'
                  ? 'bg-amber-950 text-amber-400 border border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                  : 'bg-rose-950 text-rose-400 border border-rose-500/50 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
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
                <span className="text-xs font-bold text-slate-100 font-mono">
                  TARGET PROPOSED SLOT
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                  REQUESTED
                </span>
              </div>
              <div className="text-xs font-mono text-slate-400 mt-0.5">{formattedDate}</div>
            </div>
          </div>

          <span
            className={`text-xs px-3 py-1 rounded-full font-mono font-bold capitalize border self-start sm:self-auto ${
              currentWindowRisk === 'low'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                : currentWindowRisk === 'medium'
                ? 'bg-amber-950/80 text-amber-300 border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                : 'bg-rose-950/80 text-rose-300 border-rose-500/60 shadow-[0_0_8px_rgba(239,68,68,0.3)]'
            }`}
          >
            {currentWindowRisk} Risk
          </span>
        </div>

        {/* Alternative Suggested Windows */}
        {suggestedWindows && suggestedWindows.length > 0 && (
          <div className="pt-1">
            <span className="text-xs font-mono font-bold text-slate-400 block mb-2 uppercase">
              EVALUATED ALTERNATIVE WINDOWS:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {suggestedWindows.map((win, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 transition-colors shadow-sm"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-slate-200">{win.label}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                        win.risk_level === 'low'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                          : win.risk_level === 'medium'
                          ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                          : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {win.risk_level} risk
                    </span>
                  </div>
                  <div className="text-xs font-mono text-cyan-300">{win.window}</div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                    <span>Lowest concurrent RPS</span>
                    <span className="italic">* Simulated model</span>
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
