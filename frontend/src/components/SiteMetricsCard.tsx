import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import type { Site, SiteMetrics } from '@/types/emissions';

interface Props {
  site: Site;
  metrics: SiteMetrics | undefined;
}

export function SiteMetricsCard({ site, metrics }: Props) {
  if (!metrics) {
    return (
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-center min-h-[220px]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
      </div>
    );
  }

  const isOverLimit = metrics.compliance_status === 'LIMIT_EXCEEDED';
  const utilizationClamped = Math.min(metrics.utilization_pct, 100);

  return (
    <div
      className={`bg-white p-6 rounded-xl border-2 shadow-sm transition-all ${
        isOverLimit ? 'border-red-300' : 'border-gray-100'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 truncate">{site.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{site.location}</p>
        </div>
        <div className="ml-3 shrink-0">
          {isOverLimit ? (
            <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-medium px-2 py-1 rounded-full">
              <AlertTriangle className="w-3 h-3" />
              Exceeded
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-medium px-2 py-1 rounded-full">
              <CheckCircle className="w-3 h-3" />
              Compliant
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-0.5">Total Emissions</p>
            <p className="text-sm font-semibold text-gray-900">
              {metrics.total_emissions_to_date.toFixed(2)}
              <span className="text-xs font-normal text-gray-500 ml-1">kg CH₄</span>
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-0.5">Emission Limit</p>
            <p className="text-sm font-semibold text-gray-900">
              {metrics.emission_limit.toFixed(2)}
              <span className="text-xs font-normal text-gray-500 ml-1">kg CH₄</span>
            </p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-500">Utilization</span>
            <span
              className={`text-xs font-semibold ${
                isOverLimit ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {metrics.utilization_pct.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${
                isOverLimit ? 'bg-red-500' : utilizationClamped > 80 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${utilizationClamped}%` }}
            />
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
          <span>{metrics.measurement_count} readings</span>
          {metrics.last_reading_at && (
            <span>
              Last:{' '}
              {new Date(metrics.last_reading_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
