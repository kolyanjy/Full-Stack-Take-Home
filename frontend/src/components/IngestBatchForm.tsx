import { useState } from 'react';
import { AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { api } from '@/services/api';
import type { Site } from '@/types/emissions';

interface Props {
  sites: Site[];
  onIngestionComplete: () => void;
}

export function IngestBatchForm({ sites, onIngestionComplete }: Props) {
  const [siteId, setSiteId] = useState('');
  const [numReadings, setNumReadings] = useState('10');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{
    count: number;
    total: number;
    duplicate: boolean;
  } | null>(null);
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const generateReadings = (count: number) =>
    Array.from({ length: count }, () => ({
      value: Math.round((Math.random() * 10 + 5) * 100) / 100,
      unit: 'kg' as const,
      sensor_id: `SENSOR-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      timestamp: new Date().toISOString(),
    }));

  const performIngestion = async (requestId: string) => {
    if (!siteId) {
      setError('Please select a site');
      return;
    }

    const count = parseInt(numReadings);
    if (count < 1 || count > 100) {
      setError('Number of readings must be between 1 and 100');
      return;
    }

    setLoading(true);
    setError(null);
    setLastResult(null);

    const result = await api.ingestBatch({
      site_id: siteId,
      request_id: requestId,
      readings: generateReadings(count),
    });

    setLoading(false);

    if (result.success) {
      setLastRequestId(null);
      setRetryCount(0);
      setLastResult({
        count: result.data.count,
        total: result.data.total_value,
        duplicate: result.data.duplicate,
      });
      onIngestionComplete();
    } else {
      setError(result.error.message);
      setLastRequestId(requestId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performIngestion(crypto.randomUUID());
  };

  const handleRetry = async () => {
    if (!lastRequestId) return;
    setRetryCount((prev) => prev + 1);
    await performIngestion(lastRequestId);
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <h3 className="font-semibold text-gray-900">Manual Batch Ingestion</h3>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-red-800 font-medium text-sm">Ingestion Failed</p>
              <p className="text-red-700 text-sm mt-0.5">{error}</p>
              {lastRequestId && (
                <button
                  onClick={handleRetry}
                  disabled={loading}
                  className="mt-3 inline-flex items-center gap-2 bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  {retryCount > 0 ? `Retry (Attempt ${retryCount + 1})` : 'Safe Retry'}
                </button>
              )}
              <p className="text-red-500 text-xs mt-2">
                ✓ Safe to retry — same request_id prevents duplicate records
              </p>
            </div>
          </div>
        </div>
      )}

      {lastResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-green-800 font-medium text-sm">
                {lastResult.duplicate ? 'Duplicate request detected — no data added' : 'Batch ingested successfully'}
              </p>
              {!lastResult.duplicate && (
                <p className="text-green-700 text-sm mt-0.5">
                  {lastResult.count} readings · {lastResult.total.toFixed(2)} kg CH₄ total
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Target Site
          </label>
          <select
            value={siteId}
            onChange={(e) => {
              setSiteId(e.target.value);
              setLastResult(null);
            }}
            required
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          >
            <option value="">Select a site...</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name} — {site.location}
              </option>
            ))}
          </select>
          {sites.length === 0 && (
            <p className="text-xs text-gray-500 mt-1">Create a site first to enable ingestion</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Number of Readings (1–100)
          </label>
          <input
            type="number"
            value={numReadings}
            onChange={(e) => setNumReadings(e.target.value)}
            required
            min="1"
            max="100"
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !siteId}
          className="w-full bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Ingesting...' : 'Ingest Batch'}
        </button>
      </form>
    </div>
  );
}
