'use client';

import React, { useState } from 'react';
import { ReleaseAnalysisRequest } from '@/lib/types';
import { Play, RotateCcw, AlertCircle, Activity, Clock, ShieldCheck, ChevronDown, Edit3 } from 'lucide-react';

interface MetricFormProps {
  initialValues: ReleaseAnalysisRequest;
  onSubmit: (data: ReleaseAnalysisRequest) => void;
  isLoading: boolean;
  onReset: () => void;
  className?: string;
}

export interface ServiceCategory {
  category: string;
  services: {
    id: string;
    label: string;
    defaultSlo: number;
    defaultThresholdMs: number;
  }[];
}

const PRODUCTION_SERVICES: ServiceCategory[] = [
  {
    category: 'Tier 1 — Mission-Critical Commerce & Finance',
    services: [
      { id: 'checkout-service', label: 'checkout-service (Order Processing & Cart)', defaultSlo: 99.9, defaultThresholdMs: 250 },
      { id: 'payment-gateway', label: 'payment-gateway (PSP & Card Settlement)', defaultSlo: 99.95, defaultThresholdMs: 200 },
      { id: 'billing-engine', label: 'billing-engine (Invoicing & Subscriptions)', defaultSlo: 99.9, defaultThresholdMs: 300 },
      { id: 'ledger-service', label: 'ledger-service (Double-Entry Balances)', defaultSlo: 99.99, defaultThresholdMs: 150 },
      { id: 'fraud-detector', label: 'fraud-detector (Risk Scoring & 3D Secure)', defaultSlo: 99.5, defaultThresholdMs: 120 }
    ]
  },
  {
    category: 'Tier 1 — Identity, Security & Gateway',
    services: [
      { id: 'api-gateway', label: 'api-gateway (Edge Proxy & Ingress)', defaultSlo: 99.99, defaultThresholdMs: 80 },
      { id: 'auth-service', label: 'auth-service (OAuth2 & Token Authority)', defaultSlo: 99.99, defaultThresholdMs: 100 },
      { id: 'user-session-service', label: 'user-session-service (Redis Session IAM)', defaultSlo: 99.95, defaultThresholdMs: 60 }
    ]
  },
  {
    category: 'Tier 2 — Commerce, Catalog & Search',
    services: [
      { id: 'inventory-api', label: 'inventory-api (Stock & Warehouse Lock)', defaultSlo: 99.5, defaultThresholdMs: 220 },
      { id: 'search-service', label: 'search-service (Elasticsearch Product Query)', defaultSlo: 99.5, defaultThresholdMs: 180 },
      { id: 'catalog-service', label: 'catalog-service (Product SKU Catalog)', defaultSlo: 99.5, defaultThresholdMs: 200 },
      { id: 'pricing-discount-engine', label: 'pricing-discount-engine (Dynamic Promotions)', defaultSlo: 99.5, defaultThresholdMs: 160 },
      { id: 'recommendation-ml', label: 'recommendation-ml (Vector Personalization)', defaultSlo: 99.0, defaultThresholdMs: 250 }
    ]
  },
  {
    category: 'Tier 3 — Async Workers & Infrastructure',
    services: [
      { id: 'notification-worker', label: 'notification-worker (Email, SMS & Webhooks)', defaultSlo: 99.0, defaultThresholdMs: 500 },
      { id: 'kafka-event-consumer', label: 'kafka-event-consumer (Event Stream Bus)', defaultSlo: 99.0, defaultThresholdMs: 400 },
      { id: 'analytics-ingest', label: 'analytics-ingest (Telemetry Pipeline)', defaultSlo: 98.5, defaultThresholdMs: 600 },
      { id: 'media-transcoder', label: 'media-transcoder (Asset Optimization)', defaultSlo: 98.0, defaultThresholdMs: 1000 }
    ]
  }
];

export const MetricForm: React.FC<MetricFormProps> = ({
  initialValues,
  onSubmit,
  isLoading,
  onReset,
  className
}) => {
  const [formData, setFormData] = useState<ReleaseAnalysisRequest>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCustomService, setIsCustomService] = useState<boolean>(false);

  React.useEffect(() => {
    setFormData(initialValues);
    setErrors({});
    const isKnown = PRODUCTION_SERVICES.some((group) =>
      group.services.some((s) => s.id === initialValues.service_name)
    );
    setIsCustomService(!isKnown && initialValues.service_name !== '');
  }, [initialValues]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.service_name.trim()) {
      newErrors.service_name = 'Service name is required';
    }

    if (formData.slo_target <= 0 || formData.slo_target > 100) {
      newErrors.slo_target = 'SLO target must be between 0.1% and 100%';
    }

    if (formData.observed_availability < 0 || formData.observed_availability > 100) {
      newErrors.observed_availability = 'Observed availability must be between 0% and 100%';
    }

    if (formData.error_rate_percent < 0 || formData.error_rate_percent > 100) {
      newErrors.error_rate_percent = 'Error rate must be between 0% and 100%';
    }

    if (!formData.proposed_deployment_time) {
      newErrors.proposed_deployment_time = 'Proposed deployment timestamp is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate() && !isLoading) {
      onSubmit(formData);
    }
  };

  const handleChange = (
    field: keyof ReleaseAnalysisRequest,
    value: string | number
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const handleSelectService = (selectedId: string) => {
    if (selectedId === '__custom__') {
      setIsCustomService(true);
      return;
    }

    setIsCustomService(false);

    for (const group of PRODUCTION_SERVICES) {
      const match = group.services.find((s) => s.id === selectedId);
      if (match) {
        setFormData((prev) => ({
          ...prev,
          service_name: match.id,
          latency_threshold_ms: match.defaultThresholdMs,
          slo_target: match.defaultSlo
        }));
        if (errors.service_name) {
          setErrors((prev) => {
            const updated = { ...prev };
            delete updated.service_name;
            return updated;
          });
        }
        return;
      }
    }

    handleChange('service_name', selectedId);
  };

  return (
    <div className={`glass-panel rounded-2xl p-6 shadow-2xl h-full min-h-[440px] flex flex-col justify-between ${className || ''}`}>
      <div className="flex items-center justify-between pb-3.5 mb-2 border-b border-[#6F4E37]/40">
        <h2 className="text-sm font-bold text-[#E5E4E2] flex items-center gap-2 font-mono">
          <Activity className="w-4 h-4 text-[#E6E0F0]" />
          RELEASE TELEMETRY
        </h2>
        <button
          type="button"
          onClick={onReset}
          className="text-xs font-mono text-[#E6E0F0]/80 hover:text-[#E5E4E2] flex items-center gap-1 transition-colors px-2.5 py-1 rounded hover:bg-[#2A1C15] border border-[#6F4E37]/50"
          title="Reset to defaults"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          RESET
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between gap-4">
        {/* Form Fields Container */}
        <div className="space-y-4">
          {/* Target Service Dropdown */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-mono font-bold text-[#E5E4E2] uppercase">
                Target Service <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCustomService(!isCustomService)}
                className="text-[10px] font-mono text-[#E6E0F0] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3 h-3" />
                {isCustomService ? 'Choose list' : 'Custom'}
              </button>
            </div>

            {!isCustomService ? (
              <div className="relative">
                <select
                  value={formData.service_name}
                  onChange={(e) => handleSelectService(e.target.value)}
                  className={`w-full bg-[#18100C]/90 border ${
                    errors.service_name ? 'border-rose-500' : 'border-[#6F4E37]/50 focus:border-[#E6E0F0]'
                  } rounded-xl px-3 py-2.5 text-sm text-[#E5E4E2] focus:outline-none focus:ring-1 focus:ring-[#E6E0F0]/40 font-mono shadow-inner appearance-none cursor-pointer pr-10`}
                >
                  <option value="" disabled className="bg-[#18100C] text-[#E6E0F0]/50 font-mono">
                    -- Select Target Microservice --
                  </option>
                  {PRODUCTION_SERVICES.map((group) => (
                    <optgroup
                      key={group.category}
                      label={group.category}
                      className="bg-[#241712] text-[#E5E4E2] font-bold"
                    >
                      {group.services.map((svc) => (
                        <option
                          key={svc.id}
                          value={svc.id}
                          className="bg-[#18100C] text-[#E5E4E2] py-1 font-mono"
                        >
                          {svc.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  <option value="__custom__" className="bg-[#241712] text-[#E6E0F0] font-bold">
                    + Custom Microservice Name...
                  </option>
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#E6E0F0]">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={formData.service_name}
                  onChange={(e) => handleChange('service_name', e.target.value)}
                  placeholder="Enter custom service identifier, e.g. order-dispatcher"
                  className={`w-full bg-[#18100C]/90 border ${
                    errors.service_name ? 'border-rose-500' : 'border-[#6F4E37]/50 focus:border-[#E6E0F0]'
                  } rounded-xl px-3 py-2.5 text-sm text-[#E5E4E2] placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#E6E0F0]/40 font-mono shadow-inner`}
                />
              </div>
            )}

            {errors.service_name && (
              <p className="text-xs text-rose-400 mt-1 flex items-center gap-1 font-mono">
                <AlertCircle className="w-3 h-3" />
                {errors.service_name}
              </p>
            )}
          </div>

          {/* SLO & Availability Telemetry */}
          <div className="p-3.5 rounded-xl bg-[#1A110D]/90 border border-[#6F4E37]/45 space-y-3 shadow-inner">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#E6E0F0]">
              <ShieldCheck className="w-4 h-4 text-[#E6E0F0]" />
              <span>SLO INDICATORS</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-[11px] font-mono text-[#E6E0F0]/70 mb-1 truncate">
                  SLO Target (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  max="100"
                  value={formData.slo_target}
                  onChange={(e) => handleChange('slo_target', parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#140D09] border border-[#6F4E37]/60 rounded-lg px-2.5 py-1.5 text-xs text-[#E5E4E2] font-mono focus:outline-none focus:ring-1 focus:ring-[#E6E0F0] focus:border-[#E6E0F0]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#E6E0F0]/70 mb-1 truncate">
                  Availability (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.observed_availability}
                  onChange={(e) =>
                    handleChange('observed_availability', parseFloat(e.target.value) || 0)
                  }
                  className="w-full bg-[#140D09] border border-[#6F4E37]/60 rounded-lg px-2.5 py-1.5 text-xs text-[#E5E4E2] font-mono focus:outline-none focus:ring-1 focus:ring-[#E6E0F0] focus:border-[#E6E0F0]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#E6E0F0]/70 mb-1 truncate">
                  Error Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.error_rate_percent}
                  onChange={(e) =>
                    handleChange('error_rate_percent', parseFloat(e.target.value) || 0)
                  }
                  className="w-full bg-[#140D09] border border-[#6F4E37]/60 rounded-lg px-2.5 py-1.5 text-xs text-[#E5E4E2] font-mono focus:outline-none focus:ring-1 focus:ring-[#E6E0F0] focus:border-[#E6E0F0]"
                />
              </div>
            </div>
          </div>

          {/* Proposed Deployment Time */}
          <div>
            <label className="block text-xs font-mono font-bold text-[#E5E4E2] mb-1 flex items-center gap-1.5 uppercase">
              <Clock className="w-3.5 h-3.5 text-[#E6E0F0]" />
              Deployment Time <span className="text-rose-400">*</span>
            </label>
            <input
              type="datetime-local"
              value={formData.proposed_deployment_time}
              onChange={(e) => handleChange('proposed_deployment_time', e.target.value)}
              className="w-full bg-[#18100C]/90 border border-[#6F4E37]/50 focus:border-[#E6E0F0] rounded-xl px-3 py-2 text-sm text-[#E5E4E2] font-mono focus:outline-none focus:ring-1 focus:ring-[#E6E0F0]/40"
            />
          </div>
        </div>

        {/* Action Button at bottom */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-xl font-mono font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition-all duration-300 ${
              isLoading
                ? 'bg-[#291B14] text-[#E6E0F0]/40 cursor-not-allowed'
                : 'bg-gradient-to-r from-[#6F4E37] via-[#8C6246] to-[#6F4E37] hover:from-[#8C6246] hover:to-[#A37353] text-[#E5E4E2] shadow-[0_0_25px_rgba(111,78,55,0.6)] active:scale-[0.99] border border-[#E6E0F0]/40 cursor-pointer'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>ANALYZING SAFETY...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current text-[#E5E4E2]" />
                <span>ANALYZE RELEASE SAFETY</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
