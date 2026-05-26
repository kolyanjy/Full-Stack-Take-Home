import { useState, useEffect, useCallback } from 'react';
import { Activity, Database, Loader2, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { api } from '@/services/api';
import type { Site, SiteMetrics } from '@/types/emissions';
import { CreateSiteForm } from '@/components/CreateSiteForm';
import { IngestBatchForm } from '@/components/IngestBatchForm';
import { SiteMetricsCard } from '@/components/SiteMetricsCard';
import { useMetricsSocket } from '@/hooks/useMetricsSocket';

export default function App() {
  const [sites, setSites] = useState<Site[]>([]);
  const [metricsMap, setMetricsMap] = useState<Record<string, SiteMetrics>>({});
  const [loading, setLoading] = useState(true);

  const handleMetricsUpdate = useCallback((metrics: SiteMetrics) => {
    setMetricsMap(prev => ({ ...prev, [metrics.site_id]: metrics }));
  }, []);

  const { connected } = useMetricsSocket(handleMetricsUpdate);

  const loadSites = useCallback(async () => {
    setLoading(true);
    const result = await api.listSites();
    if (result.success) {
      const incoming = result.data;
      setSites(prev =>
        JSON.stringify(prev) === JSON.stringify(incoming) ? prev : incoming,
      );
      await Promise.all(
        incoming.map(async (site) => {
          const m = await api.getSiteMetrics(site.id);
          if (m.success) {
            setMetricsMap(prev => ({ ...prev, [site.id]: m.data }));
          }
        }),
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  const handleSiteCreated = (site: Site) => {
    setSites(prev => [site, ...prev]);
    api.getSiteMetrics(site.id).then(m => {
      if (m.success) setMetricsMap(prev => ({ ...prev, [site.id]: m.data }));
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg font-semibold text-gray-900">
                Emissions Monitoring Dashboard
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div
                className={`flex items-center gap-1.5 text-xs font-medium ${
                  connected ? 'text-green-600' : 'text-gray-400'
                }`}
              >
                {connected ? (
                  <Wifi className="w-3.5 h-3.5" />
                ) : (
                  <WifiOff className="w-3.5 h-3.5" />
                )}
                {connected ? 'Live' : 'Disconnected'}
              </div>
              <button
                onClick={loadSites}
                disabled={loading}
                className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <CreateSiteForm onSiteCreated={handleSiteCreated} />
          </div>
          <div className="lg:col-span-2">
            <IngestBatchForm sites={sites} onIngestionComplete={loadSites} />
          </div>
        </div>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-gray-400" />
              Active Sites
              <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {sites.length}
              </span>
            </h2>
            {loading && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Updating…
              </div>
            )}
          </div>

          {sites.length === 0 && !loading ? (
            <div className="bg-white border border-dashed border-gray-200 rounded-xl p-16 text-center">
              <Database className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <h3 className="text-sm font-medium text-gray-900 mb-1">No sites yet</h3>
              <p className="text-xs text-gray-500">
                Create your first industrial site to start monitoring emissions
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sites.map((site) => (
                <SiteMetricsCard
                  key={site.id}
                  site={site}
                  metrics={metricsMap[site.id]}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
