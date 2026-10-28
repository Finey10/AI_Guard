'use client';

import React, { useState } from 'react';
import { ReleaseAnalysisRequest, ChangeSize } from '@/lib/types';
import { Play, RotateCcw, AlertCircle, Info, Activity, Clock, ShieldCheck, FileText } from 'lucide-react';

interface MetricFormProps {
  initialValues: ReleaseAnalysisRequest;
  onSubmit: (data: ReleaseAnalysisRequest) => void;
  isLoading: boolean;
  onReset: () => void;
}

const COMMON_SERVICES = [
  'checkout-service',
  'payment-gateway',
  'auth-service',
  'inventory-api',
  'notification-worker',
  'search-service'
];

export const MetricForm: React.FC<MetricFormProps> = ({
  initialValues,
  onSubmit,
  isLoading,
  onReset
}) => {
  const [formData, setFormData] = useState<ReleaseAnalysisRequest>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Synchronize when initialValues changes (e.g., when a preset is picked)
  React.useEffect(() => {
    setFormData(initialValues);
    setErrors({});
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

  return (
    <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-5 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            Release & Reliability Parameters
          </h2>
          <p className="text-xs text-zinc-400">
            Define service health telemetry, change size, and planned deployment schedule.
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-zinc-800"
          title="Reset form to defaults"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Service Name & Change Size */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Service Name <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                list="service-list"
                value={formData.service_name}
                onChange={(e) => handleChange('service_name', e.target.value)}
                placeholder="e.g. checkout-service"
                className={`w-full bg-zinc-950 border ${
                  errors.service_name ? 'border-rose-500' : 'border-zinc-800'
                } rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono`}
              />
              <datalist id="service-list">
                {COMMON_SERVICES.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            {errors.service_name && (
              <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.service_name}
              </p>
            )}
            <p className="text-[11px] text-zinc-500 mt-1">Target microservice for deployment.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Change Scope / Size <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['small', 'medium', 'large'] as ChangeSize[]).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => handleChange('change_size', size)}
                  className={`py-2 text-xs font-medium rounded-lg border transition-all capitalize ${
                    formData.change_size === size
                      ? size === 'small'
                        ? 'bg-emerald-950/60 border-emerald-600 text-emerald-200'
                        : size === 'medium'
                        ? 'bg-amber-950/60 border-amber-600 text-amber-200'
                        : 'bg-rose-950/60 border-rose-600 text-rose-200'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Small: micro-fix/copy | Medium: feature branch | Large: architecture/DB migration.
            </p>
          </div>
        </div>

        {/* SLO & Availability Telemetry */}
        <div className="p-3.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            SLO & Reliability Indicators (30-Day Window)
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                SLO Target (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="90"
                max="99.999"
                value={formData.slo_target}
                onChange={(e) => handleChange('slo_target', parseFloat(e.target.value) || 0)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1.5 text-xs text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-[10px] text-zinc-500">e.g. 99.9% uptime</span>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Observed Availability (%)
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
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1.5 text-xs text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-[10px] text-zinc-500">Current 30d measurement</span>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
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
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1.5 text-xs text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-[10px] text-zinc-500">5xx / total requests</span>
            </div>
          </div>
        </div>

        {/* Latency & Incident Context */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Current Latency (ms)
            </label>
            <input
              type="number"
              min="1"
              value={formData.latency_ms}
              onChange={(e) => handleChange('latency_ms', parseInt(e.target.value) || 0)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-[11px] text-zinc-500">P95 service latency</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Latency SLA Threshold (ms)
            </label>
            <input
              type="number"
              min="1"
              value={formData.latency_threshold_ms}
              onChange={(e) =>
                handleChange('latency_threshold_ms', parseInt(e.target.value) || 0)
              }
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-[11px] text-zinc-500">Max allowable threshold</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Recent Incidents (7-day)
            </label>
            <input
              type="number"
              min="0"
              max="20"
              value={formData.recent_incidents}
              onChange={(e) => handleChange('recent_incidents', parseInt(e.target.value) || 0)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-[11px] text-zinc-500">Outages on this service</span>
          </div>
        </div>

        {/* Proposed Deployment Time & Release Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              Proposed Deployment Time <span className="text-rose-400">*</span>
            </label>
            <input
              type="datetime-local"
              value={formData.proposed_deployment_time}
              onChange={(e) => handleChange('proposed_deployment_time', e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              Evaluated against peak hours (11-14, 17-21) and weekend freeze windows.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-zinc-400" />
              Release Notes / PR Description (Optional)
            </label>
            <input
              type="text"
              value={formData.release_notes || ''}
              onChange={(e) => handleChange('release_notes', e.target.value)}
              placeholder="e.g. Migration to v2 auth endpoints"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              Used for semantic similarity against past outage postmortems.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
              isLoading
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20 active:scale-[0.99]'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Running Multi-Agent Reliability Analysis...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Analyze Release Safety</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
