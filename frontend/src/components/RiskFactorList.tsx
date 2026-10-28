'use client';

import React, { useState } from 'react';
import { RiskFactor } from '@/lib/types';
import { ListFilter, Sparkles, Cpu } from 'lucide-react';

interface RiskFactorListProps {
  factors: RiskFactor[];
}

export const RiskFactorList: React.FC<RiskFactorListProps> = ({ factors }) => {
  const [filter, setFilter] = useState<'all' | 'measured' | 'ai'>('all');

  const filteredFactors = factors.filter((f) => {
    if (filter === 'measured') return !f.is_ai_generated;
    if (filter === 'ai') return f.is_ai_generated;
    return true;
  });

  const getImpactBadge = (impact: RiskFactor['impact']) => {
    switch (impact) {
      case 'critical':
        return 'bg-rose-950/80 text-rose-300 border-rose-500/80 shadow-[0_0_10px_rgba(239,68,68,0.4)]';
      case 'high':
        return 'bg-rose-950/50 text-rose-300 border-rose-500/60 shadow-[0_0_8px_rgba(239,68,68,0.25)]';
      case 'medium':
        return 'bg-amber-950/50 text-amber-300 border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.25)]';
      case 'low':
      default:
        return 'bg-emerald-950/50 text-emerald-300 border-emerald-500/60 shadow-[0_0_8px_rgba(16,185,129,0.25)]';
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-5 shadow-2xl">
      {/* Header and Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 mb-4 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
            <ListFilter className="w-4 h-4 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            FACTOR ATTRIBUTION & AUDIT TRAIL
          </h3>
          <p className="text-[11px] text-slate-400">
            Explicit separation of deterministic system metrics and AI synthesized reasoning.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-cyan-500/20 self-start sm:self-auto font-mono text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              filter === 'all'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ALL ({factors.length})
          </button>
          <button
            onClick={() => setFilter('measured')}
            className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              filter === 'measured'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            METRICS ({factors.filter((f) => !f.is_ai_generated).length})
          </button>
          <button
            onClick={() => setFilter('ai')}
            className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              filter === 'ai'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            AI OPS ({factors.filter((f) => f.is_ai_generated).length})
          </button>
        </div>
      </div>

      {/* Factors List */}
      <div className="space-y-2.5">
        {filteredFactors.map((factor, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-cyan-500/30 transition-all flex flex-col md:flex-row md:items-center md:justify-between gap-3"
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                  factor.is_ai_generated
                    ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-500/40 shadow-[0_0_8px_rgba(99,102,241,0.3)]'
                    : 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                }`}
              >
                {factor.is_ai_generated ? (
                  <Sparkles className="w-4 h-4" />
                ) : (
                  <Cpu className="w-4 h-4" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-100 font-mono">{factor.name}</span>
                  {factor.is_ai_generated ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-950/70 text-indigo-300 border border-indigo-500/40">
                      <Sparkles className="w-2.5 h-2.5" />
                      AI SYNTHESIZED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950/70 text-cyan-300 border border-cyan-500/40">
                      <Cpu className="w-2.5 h-2.5" />
                      SYSTEM METRIC
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {factor.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto shrink-0 font-mono">
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase font-bold border ${getImpactBadge(
                  factor.impact
                )}`}
              >
                {factor.impact}
              </span>
              <span className="text-xs font-bold text-cyan-200 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 shadow-inner">
                +{factor.weight} PTS
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
