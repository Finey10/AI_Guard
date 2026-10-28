'use client';

import React, { useState } from 'react';
import { ReleaseAnalysisRequest } from '@/lib/types';
import { Play, RotateCcw, AlertCircle, Activity, Clock, ShieldCheck, FileText, ChevronDown, Edit3 } from 'lucide-react';

interface MetricFormProps {
  initialValues: ReleaseAnalysisRequest;
  onSubmit: (data: ReleaseAnalysisRequest) => void;
  isLoading: boolean;
  onReset: () => void;
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
  onReset
}) => {
  const [formData, setFormData] = useState<ReleaseAnalysisRequest>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCustomService, setIsCustomService] = useState<boolean>(false);

  React.useEffect(() => {
    setFormData(initialValues);
    setErrors({});
    // Check if initial service is in known list
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

    if (formData.slo_target <= 0 || formData.slo_target >= 100) {
      newErrors.slo_target = 'SLO target must be between 0.1% and 99.999%';
    }

    if (formData.observed_availability < 0 || formData.observed_availability > 100) {
      newErrors.observed_availability = 'Observed availability must be between 0% and 100%';
    }

    if (formData.error_rate_percent < 0 || formData.error_rate_percent > 100) {
      newErrors.error_rate_percent = 'Error rate must be between 0% and 100%';
    }

    if (formData.latency_ms < 0) {
      newErrors.latency_ms = 'Latency must be a positive number';
    }

    if (formData.latency_threshold_ms <= 0) {
      newErrors.latency_threshold_ms = 'Threshold must be greater than 0';
    }

    if (formData.recent_incidents < 0) {
      newErrors.recent_incidents = 'Incidents count cannot be negative';
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
    // Find service definition
    for (const group of PRODUCTION_SERVICES) {
      const match = group.services.find((s) => s.id === selectedId);
      if (match) {
        setFormData((prev) => ({
          ...prev,
          service_name: match.id,
          slo_target: match.defaultSlo,
          latency_threshold_ms: match.defaultThresholdMs
        }));
        return;
      }
    }

    handleChange('service_name', selectedId);
  };

  return (
    <div className="glass-panel rounded-2xl p-5 shadow-2xl">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
            <Activity className="w-4 h-4 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            TELEMETRY & CHANGE CONFIGURATION
          </h2>
          <p className="text-[11px] text-slate-400">
            Define SLO threshold parameters, blast radius, and deployment schedule.
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="text-xs font-mono text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition-colors px-2.5 py-1 rounded-lg hover:bg-slate-800 border border-transparent hover:border-cyan-500/30"
          title="Reset form to defaults"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          RESET
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Target Service Dropdown */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-mono font-bold text-slate-300 uppercase">
              Target Service <span className="text-rose-400">*</span>
            </label>
            <button
              type="button"
              onClick={() => setIsCustomService(!isCustomService)}
              className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <Edit3 className="w-3 h-3" />
              {isCustomService ? 'Choose from list' : 'Type custom name'}
            </button>
          </div>

          {!isCustomService ? (
            <div className="relative">
              <select
                value={formData.service_name}
                onChange={(e) => handleSelectService(e.target.value)}
                className={`w-full bg-slate-950/90 border ${
                  errors.service_name ? 'border-rose-500' : 'border-slate-800 focus:border-cyan-400'
                } rounded-xl px-3 py-2.5 text-sm text-cyan-200 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 font-mono shadow-inner appearance-none cursor-pointer pr-10`}
              >
                {PRODUCTION_SERVICES.map((group) => (
                  <optgroup
                    key={group.category}
                    label={group.category}
                    className="bg-slate-900 text-slate-300 font-bold"
                  >
                    {group.services.map((svc) => (
                      <option
                        key={svc.id}
                        value={svc.id}
                        className="bg-slate-950 text-cyan-200 py-1 font-mono"
                      >
                        {svc.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
                <option value="__custom__" className="bg-slate-900 text-amber-300 font-bold">
                  + Custom Microservice Name...
                </option>
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-cyan-400">
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
                className={`w-full bg-slate-950/90 border ${
                  errors.service_name ? 'border-rose-500' : 'border-slate-800 focus:border-cyan-400'
                } rounded-xl px-3 py-2.5 text-sm text-cyan-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 font-mono shadow-inner`}
              />
            </div>
          )}

          {errors.service_name && (
            <p className="text-xs text-rose-400 mt-1 flex items-center gap-1 font-mono">
              <AlertCircle className="w-3 h-3" />
              {errors.service_name}
            </p>
          )}
          <p className="text-[10px] font-mono text-slate-500 mt-1">
            Categorized production microservices with pre-calibrated SRE thresholds.
          </p>
        </div>

        {/* SLO & Availability Telemetry */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-cyan-500/20 space-y-3 shadow-inner">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>SLO INDICATORS (ROLLING 30-DAY WINDOW)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1 truncate" title="SLO Target (%)">
                SLO Target (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="90"
                max="99.999"
                value={formData.slo_target}
                onChange={(e) => handleChange('slo_target', parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-cyan-200 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1 truncate" title="Observed Availability (%)">
                Availability (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="80"
                max="100"
                value={formData.observed_availability}
                onChange={(e) =>
                  handleChange('observed_availability', parseFloat(e.target.value) || 0)
                }
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-cyan-200 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1 truncate" title="Error Rate (%)">
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
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-cyan-200 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
            </div>
          </div>
        </div>

        {/* Latency & Incident Context */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs font-mono font-bold text-slate-300 mb-1 truncate" title="P95 Latency (ms)">
              P95 Latency (ms)
            </label>
            <input
              type="number"
              min="1"
              value={formData.latency_ms}
              onChange={(e) => handleChange('latency_ms', parseInt(e.target.value) || 0)}
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400 rounded-xl px-3 py-1.5 text-sm text-cyan-200 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-400/50"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-slate-300 mb-1 truncate" title="SLA Threshold (ms)">
              SLA Threshold (ms)
            </label>
            <input
              type="number"
              min="1"
              value={formData.latency_threshold_ms}
              onChange={(e) =>
                handleChange('latency_threshold_ms', parseInt(e.target.value) || 0)
              }
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400 rounded-xl px-3 py-1.5 text-sm text-cyan-200 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-400/50"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-slate-300 mb-1 truncate" title="Recent Incidents">
              Recent Incidents
            </label>
            <input
              type="number"
              min="0"
              max="20"
              value={formData.recent_incidents}
              onChange={(e) => handleChange('recent_incidents', parseInt(e.target.value) || 0)}
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400 rounded-xl px-3 py-1.5 text-sm text-cyan-200 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-400/50"
            />
          </div>
        </div>

        {/* Proposed Deployment Time & Release Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono font-bold text-slate-300 mb-1 flex items-center gap-1.5 uppercase">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              Proposed Time <span className="text-rose-400">*</span>
            </label>
            <input
              type="datetime-local"
              value={formData.proposed_deployment_time}
              onChange={(e) => handleChange('proposed_deployment_time', e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400 rounded-xl px-3 py-2 text-sm text-cyan-200 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-400/50"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-slate-300 mb-1 flex items-center gap-1.5 uppercase">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Release Notes (Optional)
            </label>
            <input
              type="text"
              value={formData.release_notes || ''}
              onChange={(e) => handleChange('release_notes', e.target.value)}
              placeholder="e.g. Migration to v2 auth endpoints"
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-400/50"
            />
          </div>
        </div>

        {/* Radiant Action Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-xl font-mono font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition-all duration-300 ${
              isLoading
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-500 via-indigo-600 to-emerald-500 hover:from-cyan-400 hover:via-indigo-500 hover:to-emerald-400 text-white shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:shadow-[0_0_35px_rgba(16,185,129,0.5)] active:scale-[0.99] border border-cyan-400/40'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>EVALUATING MULTI-AGENT SAFETY MATRIX...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current text-white" />
                <span>ANALYZE RELEASE SAFETY NOW</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
