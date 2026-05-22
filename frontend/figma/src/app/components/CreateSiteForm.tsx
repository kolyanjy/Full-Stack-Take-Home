import { useState } from 'react';
import { emissionsApi } from '../services/emissionsApi';
import type { Site } from '../types/emissions';

interface CreateSiteFormProps {
  onSiteCreated: (site: Site) => void;
}

export function CreateSiteForm({ onSiteCreated }: CreateSiteFormProps) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [emissionLimit, setEmissionLimit] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const response = await emissionsApi.createSite(
      name,
      location,
      parseFloat(emissionLimit)
    );

    setLoading(false);

    if (response.success && response.data) {
      onSiteCreated(response.data);
      // Reset form
      setName('');
      setLocation('');
      setEmissionLimit('');
    } else {
      setError(response.error?.message || 'Failed to create site');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg border">
      <h3 className="font-semibold">Create New Site</h3>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Site Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-3 py-2 border rounded-md"
          placeholder="Well Pad A-123"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Location</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
          className="w-full px-3 py-2 border rounded-md"
          placeholder="North Field, Sector 5"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Emission Limit (kg CH₄)
        </label>
        <input
          type="number"
          step="0.01"
          value={emissionLimit}
          onChange={(e) => setEmissionLimit(e.target.value)}
          required
          min="0.01"
          className="w-full px-3 py-2 border rounded-md"
          placeholder="1000.00"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Creating...' : 'Create Site'}
      </button>
    </form>
  );
}
