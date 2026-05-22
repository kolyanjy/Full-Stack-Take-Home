import { useState } from 'react';
import { emissionsApi } from '../services/emissionsApi';
import type { Site, IngestBatchRequest } from '../types/emissions';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface IngestBatchFormProps {
  sites: Site[];
  onIngestionComplete: () => void;
}

export function IngestBatchForm({ sites, onIngestionComplete }: IngestBatchFormProps) {
  const [siteId, setSiteId] = useState('');
  const [numReadings, setNumReadings] = useState('10');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastIdempotencyKey, setLastIdempotencyKey] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const generateMockReadings = (count: number) => {
    return Array.from({ length: count }, () => ({
      value: Math.random() * 10 + 5, // 5-15 kg CH₄
      timestamp: new Date().toISOString(),
      sensor_id: `SENSOR-${Math.floor(Math.random() * 1000)}`,
    }));
  };

  const performIngestion = async (idempotencyKey: string) => {
    if (!siteId) {
      setError('Please select a site');
      return;
    }

    setLoading(true);
    setError(null);

    const count = parseInt(numReadings);
    if (count < 1 || count > 100) {
      setError('Number of readings must be between 1 and 100');
      setLoading(false);
      return;
    }

    const request: IngestBatchRequest = {
      site_id: siteId,
      measurements: generateMockReadings(count),
      idempotency_key: idempotencyKey,
    };

    const response = await emissionsApi.ingestBatch(request);
    setLoading(false);

    if (response.success) {
      setLastIdempotencyKey(null);
      setRetryCount(0);
      onIngestionComplete();
    } else {
      setError(response.error?.message || 'Failed to ingest batch');
      setLastIdempotencyKey(idempotencyKey);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const idempotencyKey = crypto.randomUUID();
    await performIngestion(idempotencyKey);
  };

  const handleRetry = async () => {
    if (!lastIdempotencyKey) return;
    setRetryCount((prev) => prev + 1);
    await performIngestion(lastIdempotencyKey);
  };

  return (
    <div className="bg-white p-6 rounded-lg border space-y-4">
      <h3 className="font-semibold">Manual Batch Ingestion</h3>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">Ingestion Failed</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
              {lastIdempotencyKey && (
                <button
                  onClick={handleRetry}
                  disabled={loading}
                  className="mt-3 flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry ({retryCount > 0 ? `Attempt ${retryCount + 1}` : 'Safe Retry'})
                </button>
              )}
              <p className="text-red-600 text-xs mt-2">
                ✓ Safe to retry - idempotency key prevents duplicate records
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Target Site</label>
          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="">Select a site...</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name} - {site.location}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Number of Readings (1-100)
          </label>
          <input
            type="number"
            value={numReadings}
            onChange={(e) => setNumReadings(e.target.value)}
            required
            min="1"
            max="100"
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !siteId}
          className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Ingesting...' : 'Ingest Batch'}
        </button>
      </form>

      <div className="bg-blue-50 border border-blue-200 rounded p-3">
        <p className="text-sm text-blue-900">
          <strong>Idempotency Demo:</strong> If ingestion fails due to network timeout,
          use the Retry button. The same idempotency key ensures no duplicate records.
        </p>
      </div>
    </div>
  );
}
