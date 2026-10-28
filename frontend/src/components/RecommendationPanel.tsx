'use client';

import React from 'react';
import { RecommendationType } from '@/lib/types';
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

interface RecommendationPanelProps {
  recommendation: RecommendationType;
  explanation: string;
  mitigations: string[];
  deploymentTimingAdvice?: string;
  className?: string;
}

export const RecommendationPanel: React.FC<RecommendationPanelProps> = ({
  recommendation,
  explanation,
  mitigations,
  className
}) => {
  const isGo = recommendation === 'GO';
  const isSafeguard = recommendation === 'GO_WITH_SAFE_GUARD';

  const config = isGo
    ? {
        label: 'GO — APPROVED TO SHIP',
        confidence: '94.8%',
        badgeBg: 'bg-[#291B14] text-[#E5E4E2] border-emerald-500/60 shadow-sm',
        titleColor: 'text-[#E5E4E2]',
        icon: CheckCircle2,
        iconColor: 'text-emerald-400'
      }
    : isSafeguard
    ? {
        label: 'GO WITH SAFEGUARD',
        confidence: '78.2%',
        badgeBg: 'bg-[#291B14] text-[#E5E4E2] border-amber-500/60 shadow-sm',
        titleColor: 'text-amber-300',
        icon: AlertTriangle,
        iconColor: 'text-amber-400'
      }
    : {
        label: 'WAIT — SHIPMENT NOT ADVISED',
        confidence: '91.4%',
        badgeBg: 'bg-[#291B14] text-[#E5E4E2] border-rose-500/60 shadow-sm',
        titleColor: 'text-rose-300',
        icon: XCircle,
        iconColor: 'text-rose-400'
      };

  const IconComponent = config.icon;

  return (
    <div
      className={`glass-panel rounded-2xl p-6 shadow-2xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden h-full min-h-[440px] ${className || ''}`}
    >
      <div className="flex-1 flex flex-col justify-between">
        {/* Top Header Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#6F4E37]/50">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-[#1C120D] border border-[#6F4E37]/60 shadow-inner">
              <IconComponent className={`w-7 h-7 ${config.iconColor}`} />
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-[#E6E0F0]/80 font-bold block">
                DEPLOYMENT DECISION
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
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#E6E0F0] mb-2">
            <Sparkles className="w-4 h-4 text-[#E6E0F0]" />
            <span>RELIABILITY RATIONALE</span>
          </div>
          <div className="p-4 rounded-xl bg-[#180F0B]/80 border border-[#6F4E37]/50 text-xs text-[#E5E4E2] leading-relaxed shadow-inner">
            {explanation}
          </div>
        </div>

        {/* Actionable Safeguards or Mitigations */}
        {mitigations && mitigations.length > 0 && (
          <div className="mt-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#E6E0F0] mb-2.5">
              <ShieldCheck className="w-4 h-4 text-[#E6E0F0]" />
              <span>ACTIONABLE SAFEGUARDS</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {mitigations.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 text-xs p-3 rounded-lg bg-[#19100C]/70 border border-[#6F4E37]/40 hover:border-[#E6E0F0]/50 transition-colors text-[#E5E4E2]"
                >
                  <ArrowRight className="w-4 h-4 text-[#E6E0F0] shrink-0 mt-0.5" />
                  <span className="font-sans font-medium">{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
