'use client';

import React from 'react';
import { Sparkles, Radio, KeyRound, UserCheck, Plus } from 'lucide-react';
import { PRESETS, ScenarioPreset } from '@/lib/mockData';
import { AuthUser } from '@/lib/types';

interface HeaderProps {
  selectedServiceName: string;
  isBackendConnected: boolean | null;
  isMock: boolean;
  lastAnalyzedAt: string | null;
  onSelectPreset: (preset: ScenarioPreset) => void;
  onSelectNew: () => void;
  activePresetId?: string;
  currentUser?: AuthUser | null;
  onOpenAuth: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isBackendConnected,
  isMock,
  onSelectPreset,
  onSelectNew,
  activePresetId,
  currentUser,
  onOpenAuth
}) => {
  return (
    <header className="border-b border-[#6F4E37]/40 bg-[#160E0A]/90 backdrop-blur-xl sticky top-0 z-40 shadow-[0_4px_30px_rgba(0,0,0,0.6)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Brand & System Status */}
          <div className="flex items-center gap-3.5">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#6F4E37] via-[#E6E0F0]/50 to-[#6F4E37] rounded-xl blur-md opacity-70 group-hover:opacity-100 transition duration-500" />
              <div className="relative w-11 h-11 rounded-xl bg-[#1C120D] border border-[#6F4E37]/60 flex items-center justify-center p-1.5 shadow-lg shadow-[#6F4E37]/30">
                <img
                  src="/logo.png"
                  alt="Signal Ops Logo"
                  className="w-full h-full object-contain drop-shadow-[0_0_10px_rgba(111,78,55,0.8)]"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-extrabold tracking-tight text-[#E5E4E2] font-mono flex items-center gap-2">
                  <span className="tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-[#E5E4E2] via-[#E6E0F0] to-[#D4B59E] drop-shadow-[0_0_12px_rgba(230,224,240,0.3)]">
                    SIGNAL OPS
                  </span>
                </h1>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#E6E0F0]/70 mt-0.5">
                <span className="flex items-center gap-1.5 text-[#E6E0F0] font-medium">
                  <Radio className="w-3 h-3 text-[#E6E0F0] animate-pulse" />
                  Real-Time Reliability & Change-Risk Orchestration
                </span>
              </div>
            </div>
          </div>

          {/* Right Controls: Presets & Auth Tab */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Presets Toggle Group */}
            <div className="flex items-center bg-[#1F140F]/90 p-1 rounded-xl border border-[#6F4E37]/50 shadow-inner">
              <span className="text-[11px] font-mono font-bold text-[#E6E0F0]/80 px-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#E6E0F0]" />
                PRESETS:
              </span>
              {PRESETS.map((preset) => {
                const isActive = activePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => onSelectPreset(preset)}
                    className={`px-3 py-1 text-xs font-mono font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-[#6F4E37] via-[#855E43] to-[#6F4E37] text-[#E5E4E2] shadow-[0_0_15px_rgba(111,78,55,0.6)] border border-[#E6E0F0]/50'
                        : 'text-[#E6E0F0]/70 hover:text-[#E5E4E2] hover:bg-[#2E1E16]'
                    }`}
                  >
                    {preset.id === 'safe' ? 'Safe (GO)' : preset.id === 'risky' ? 'Risky (WAIT)' : 'Caution'}
                  </button>
                );
              })}

              {/* New Option */}
              <button
                type="button"
                onClick={onSelectNew}
                className={`px-3 py-1 text-xs font-mono font-bold rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-1 ${
                  activePresetId === 'new'
                    ? 'bg-gradient-to-r from-[#6F4E37] via-[#855E43] to-[#6F4E37] text-[#E5E4E2] shadow-[0_0_15px_rgba(111,78,55,0.6)] border border-[#E6E0F0]/50'
                    : 'text-[#E6E0F0]/70 hover:text-[#E5E4E2] hover:bg-[#2E1E16]'
                }`}
                title="Create a new release telemetry analysis"
              >
                <Plus className="w-3 h-3 text-[#E6E0F0]" />
                <span>New</span>
              </button>
            </div>

            {/* Authentication Tab Button */}
            {!currentUser ? (
              <button
                type="button"
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#6F4E37] via-[#8C6246] to-[#6F4E37] hover:from-[#8C6246] hover:to-[#A37353] text-[#E5E4E2] font-mono font-bold text-xs border border-[#E6E0F0]/40 shadow-[0_0_15px_rgba(111,78,55,0.5)] transition-all duration-200 active:scale-95 cursor-pointer"
                title="Authenticate to access deployment privileges"
              >
                <KeyRound className="w-3.5 h-3.5 text-[#E6E0F0]" />
                <span>SIGN IN / LOGIN</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#241712] border border-[#E6E0F0]/50 hover:border-[#E6E0F0] text-xs font-mono text-[#E5E4E2] shadow-[0_0_15px_rgba(111,78,55,0.4)] transition-all cursor-pointer"
                title="Active SRE Session — Click to view profile or sign out"
              >
                <UserCheck className="w-3.5 h-3.5 text-[#E6E0F0]" />
                <span className="font-bold text-[#E5E4E2]">{currentUser.name}</span>
                <span className="text-[10px] text-[#E6E0F0]/70 font-mono">({currentUser.role})</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
