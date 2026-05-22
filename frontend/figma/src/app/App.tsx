import { useState, useEffect } from 'react';
import { emissionsApi } from './services/emissionsApi';
import type { Site } from './types/emissions';
import { CreateSiteForm } from './components/CreateSiteForm';
import { IngestBatchForm } from './components/IngestBatchForm';
import { SiteMetricsCard } from './components/SiteMetricsCard';
import { Activity, Database, Loader2 } from 'lucide-react';

export default function App() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const loadSites = async () => {
    setLoading(true);
    const response = await emissionsApi.listSites();
    if (response.success && response.data) {
      setSites(response.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSites();
  }, [refreshTrigger]);

  const handleSiteCreated = (site: Site) => {
    setSites((prev) => [...prev, site]);
  };

  const handleIngestionComplete = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold">Emissions Monitoring Dashboard</h1>
              <p className="text-sm text-gray-600">
                Real-time methane emissions tracking with idempotent ingestion
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-1">
            <CreateSiteForm onSiteCreated={handleSiteCreated} />
          </div>

          <div className="lg:col-span-2">
            <IngestBatchForm sites={sites} onIngestionComplete={handleIngestionComplete} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Database className="w-5 h-5" />
              Active Sites ({sites.length})
            </h2>
            {loading && <Loader2 className="w-5 h-5 animate-spin text-gray-400" />}
          </div>

          {sites.length === 0 && !loading && (
            <div className="bg-white border rounded-lg p-12 text-center">
              <Database className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Sites Yet</h3>
              <p className="text-gray-600">
                Create your first industrial site to start monitoring emissions
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sites.map((site) => (
              <SiteMetricsCard
                key={site.id}
                site={site}
                refreshTrigger={refreshTrigger}
              />
            ))}
          </div>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold mb-3 text-blue-900">
            Architecture Highlights
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>
              <strong>Idempotency:</strong> Each ingestion request uses a unique
              idempotency key. Safe to retry on network failure without creating
              duplicates.
            </li>
            <li>
              <strong>Atomic Transactions:</strong> Measurements and site totals update
              in a single atomic operation (simulated with localStorage, would use DB
              transactions with Supabase).
            </li>
            <li>
              <strong>Unified Error Handling:</strong> Consistent ApiResponse structure
              with error codes (VALIDATION_ERROR, NETWORK_ERROR, NOT_FOUND).
            </li>
            <li>
              <strong>Network Resilience:</strong> Random network delays and failures
              simulate unstable field conditions. Retry mechanism demonstrates UX
              collaboration.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}