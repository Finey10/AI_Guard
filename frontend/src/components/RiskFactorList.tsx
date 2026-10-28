'use client';

import React, { useState } from 'react';
import { RiskFactor } from '@/lib/types';
import { ListFilter, Sparkles, Cpu, AlertTriangle, ShieldCheck } from 'lucide-react';

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
        return 'bg-rose-950/80 text-rose-300 border-rose-800';
      case 'high':
        return 'bg-rose-950/50 text-rose-300 border-rose-800/60';
      case 'medium':
        return 'bg-amber-950/50 text-amber-300 border-amber-800/60';
      case 'low':
      default:
        return 'bg-emerald-950/50 text-emerald-300 border-emerald-800/60';
    }
  };

  return (
    <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-5 shadow-xl backdrop-blur-sm">
      {/* Header and Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 mb-4 border-b border-zinc-800">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <ListFilter className="w-4 h-4 text-indigo-400" />
            Detailed Risk Factor Attribution
          </h3>
          <p className="text-xs text-zinc-400">
            Explicit breakdown separating measured system telemetry from AI-generated contextual insights.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center bg-zinc-950 rounded-lg p-1 border border-zinc-800 self-start sm:self-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
              filter === 'all'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All Factors ({factors.length})
          </button>
          <button
            onClick={() => setFilter('measured')}
            className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all flex items-center gap-1 ${
              filter === 'measured'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Cpu className="w-3 h-3 text-cyan-400" />
            Measured ({factors.filter((f) => !f.is_ai_generated).length})
          </button>
          <button
            onClick={() => setFilter('ai')}
            className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all flex items-center gap-1 ${
              filter === 'ai'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3 h-3 text-indigo-400" />
            AI Reasoning ({factors.filter((f) => f.is_ai_generated).length})
          </button>
        </div>
      </div>

      {/* Factors List */}
      <div className="space-y-2.5">
        {filteredFactors.map((factor, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col md:flex-row md:items-center md:justify-between gap-3"
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-1.5 rounded-md mt-0.5 shrink-0 ${
                  factor.is_ai_generated
                    ? 'bg-indigo-950/60 text-indigo-300 border border-indigo-800/60'
                    : 'bg-zinc-900 text-cyan-400 border border-zinc-800'
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
                  <span className="text-xs font-semibold text-zinc-100">{factor.name}</span>
                  {/* Origin Badge */}
                  {factor.is_ai_generated ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-950/70 text-indigo-300 border border-indigo-800/50">
                      <Sparkles className="w-2.5 h-2.5" />
                      AI Synthesized
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-cyan-950/70 text-cyan-300 border border-cyan-800/50">
                      <Cpu className="w-2.5 h-2.5" />
                      Deterministic Metric
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  {factor.description}
                </p>
              </div>
            </div>

            {/* Impact & Weight badges */}
            <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
              <span
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-mono uppercase font-medium border ${getImpactBadge(
                  factor.impact
                )}`}
              >
                {factor.impact}
              </span>
              <span className="text-xs font-mono font-bold text-zinc-300 bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800">
                +{factor.weight} pts
              </span>
            </div>
          </div>
        ))}

        {filteredFactors.length === 0 && (
          <div className="text-center py-6 text-xs text-zinc-500">
            No factors matching this category.
          </div>
        )}
      </div>
    </div>
  );
};
