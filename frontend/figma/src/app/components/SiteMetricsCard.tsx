import { useState, useEffect } from 'react';
import { emissionsApi } from '../services/emissionsApi';
import type { Site, SiteMetrics } from '../types/emissions';
import { TrendingUp, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface SiteMetricsCardProps {
  site: Site;
  refreshTrigger: number;
}

export function SiteMetricsCard({ site, refreshTrigger }: SiteMetricsCardProps) {
  const [metrics, setMetrics] = useState<SiteMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      setError(null);

      const response = await emissionsApi.getSiteMetrics(site.id);

      if (response.success && response.data) {
        setMetrics(response.data);
      } else {
        setError(response.error?.message || 'Failed to load metrics');
      }

      setLoading(false);
    };

    fetchMetrics();
  }, [site.id, refreshTrigger]);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg border flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="bg-white p-6 rounded-lg border">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  const isOverLimit = metrics.compliance_status === 'Limit Exceeded';

  return (
    <div className={`bg-white p-6 rounded-lg border-2 ${isOverLimit ? 'border-red-300' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg">{site.name}</h3>
          <p className="text-sm text-gray-600">{site.location}</p>
        </div>
        <div className="flex items-center gap-2">
          {isOverLimit ? (
            <AlertTriangle className="w-5 h-5 text-red-600" />
          ) : (
            <CheckCircle className="w-5 h-5 text-green-600" />
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Compliance Status</span>
          <span
            className={`font-medium ${isOverLimit ? 'text-red-600' : 'text-green-600'}`}
          >
            {metrics.compliance_status}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Total Emissions</span>
          <span className="font-semibold">
            {site.total_emissions_to_date.toFixed(2)} kg CH₄
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Emission Limit</span>
          <span className="font-medium">{site.emission_limit.toFixed(2)} kg CH₄</span>
        </div>

        <div className="pt-2 border-t">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600">Utilization</span>
            <span className="font-medium">
              {metrics.utilization_percentage.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                isOverLimit ? 'bg-red-600' : 'bg-green-600'
              }`}
              style={{ width: `${Math.min(metrics.utilization_percentage, 100)}%` }}
            />
          </div>
        </div>

        <div className="pt-2 border-t text-xs text-gray-500 space-y-1">
          <div className="flex justify-between">
            <span>Total Measurements:</span>
            <span>{metrics.total_measurements}</span>
          </div>
          {metrics.last_measurement_at && (
            <div className="flex justify-between">
              <span>Last Reading:</span>
              <span>{new Date(metrics.last_measurement_at).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
