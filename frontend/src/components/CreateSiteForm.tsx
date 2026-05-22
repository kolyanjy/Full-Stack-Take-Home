import { useState } from 'react';
import { api } from '@/services/api';
import type { Site } from '@/types/emissions';

interface Props {
  onSiteCreated: (site: Site) => void;
}

export function CreateSiteForm({ onSiteCreated }: Props) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [emissionLimit, setEmissionLimit] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const result = await api.createSite({
      name,
      location,
      emission_limit: parseFloat(emissionLimit),
    });

    setLoading(false);

    if (result.success) {
      onSiteCreated(result.data);
      setSuccess(`Site "${result.data.name}" created successfully`);
      setName('');
      setLocation('');
      setEmissionLimit('');
    } else {
      setError(result.error.message);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full bg-blue-500" />
        <h3 className="font-semibold text-gray-900">Create New Site</h3>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Site Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          placeholder="Well Pad A-123"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Location
        </label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          placeholder="North Field, Sector 5"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Emission Limit (kg CH₄)
        </label>
        <input
          type="number"
          step="0.01"
          value={emissionLimit}
          onChange={(e) => setEmissionLimit(e.target.value)}
          required
          min="0.01"
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          placeholder="1000.00"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Creating...' : 'Create Site'}
      </button>
    </form>
  );
}
