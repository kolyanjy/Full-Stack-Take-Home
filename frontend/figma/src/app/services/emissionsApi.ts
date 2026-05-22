import type {
  Site,
  Measurement,
  IngestBatchRequest,
  ApiResponse,
  SiteMetrics,
} from '../types/emissions';

// Simulate network latency and occasional failures
const simulateNetworkDelay = (shouldFail = false): Promise<void> => {
  return new Promise((resolve, reject) => {
    const delay = Math.random() * 800 + 200; // 200-1000ms
    setTimeout(() => {
      if (shouldFail && Math.random() < 0.15) {
        reject(new Error('Network timeout'));
      } else {
        resolve();
      }
    }, delay);
  });
};

// Storage keys
const SITES_KEY = 'emissions_sites';
const MEASUREMENTS_KEY = 'emissions_measurements';
const IDEMPOTENCY_KEY = 'emissions_idempotency_keys';

// Helper functions for localStorage
const getSites = (): Site[] => {
  const data = localStorage.getItem(SITES_KEY);
  return data ? JSON.parse(data) : [];
};

const setSites = (sites: Site[]): void => {
  localStorage.setItem(SITES_KEY, JSON.stringify(sites));
};

const getMeasurements = (): Measurement[] => {
  const data = localStorage.getItem(MEASUREMENTS_KEY);
  return data ? JSON.parse(data) : [];
};

const setMeasurements = (measurements: Measurement[]): void => {
  localStorage.setItem(MEASUREMENTS_KEY, JSON.stringify(measurements));
};

const getIdempotencyKeys = (): Record<string, boolean> => {
  const data = localStorage.getItem(IDEMPOTENCY_KEY);
  return data ? JSON.parse(data) : {};
};

const setIdempotencyKeys = (keys: Record<string, boolean>): void => {
  localStorage.setItem(IDEMPOTENCY_KEY, JSON.stringify(keys));
};

// API implementation
export const emissionsApi = {
  // [POST] /sites - Create a new site
  async createSite(
    name: string,
    location: string,
    emission_limit: number
  ): Promise<ApiResponse<Site>> {
    try {
      await simulateNetworkDelay();

      // Validation
      if (!name || !location) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Name and location are required',
          },
        };
      }

      if (emission_limit <= 0) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Emission limit must be greater than 0',
          },
        };
      }

      const sites = getSites();
      const newSite: Site = {
        id: crypto.randomUUID(),
        name,
        location,
        emission_limit,
        total_emissions_to_date: 0,
        created_at: new Date().toISOString(),
      };

      sites.push(newSite);
      setSites(sites);

      return {
        success: true,
        data: newSite,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  },

  // [GET] /sites - List all sites
  async listSites(): Promise<ApiResponse<Site[]>> {
    try {
      await simulateNetworkDelay();
      const sites = getSites();

      return {
        success: true,
        data: sites,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  },

  // [POST] /ingest - Batch ingestion with idempotency
  async ingestBatch(
    request: IngestBatchRequest
  ): Promise<ApiResponse<{ measurements_added: number; site: Site }>> {
    try {
      await simulateNetworkDelay(true); // Allow failures for retry demo

      // Validate batch size
      if (request.measurements.length > 100) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Batch size cannot exceed 100 measurements',
          },
        };
      }

      // Check idempotency key
      const idempotencyKeys = getIdempotencyKeys();
      if (idempotencyKeys[request.idempotency_key]) {
        // Request already processed - return success but don't duplicate
        const sites = getSites();
        const site = sites.find((s) => s.id === request.site_id);

        if (!site) {
          return {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Site not found',
            },
          };
        }

        return {
          success: true,
          data: {
            measurements_added: 0, // Already processed
            site,
          },
        };
      }

      // Find site
      const sites = getSites();
      const siteIndex = sites.findIndex((s) => s.id === request.site_id);

      if (siteIndex === -1) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Site not found',
          },
        };
      }

      // ATOMIC TRANSACTION: Add measurements and update site total
      const measurements = getMeasurements();
      const newMeasurements: Measurement[] = request.measurements.map((m) => ({
        id: crypto.randomUUID(),
        site_id: request.site_id,
        ...m,
      }));

      const totalNewEmissions = newMeasurements.reduce(
        (sum, m) => sum + m.value,
        0
      );

      // Update site total
      sites[siteIndex].total_emissions_to_date += totalNewEmissions;

      // Persist everything atomically (in real backend, this would be a DB transaction)
      measurements.push(...newMeasurements);
      setMeasurements(measurements);
      setSites(sites);

      // Mark idempotency key as processed
      idempotencyKeys[request.idempotency_key] = true;
      setIdempotencyKeys(idempotencyKeys);

      return {
        success: true,
        data: {
          measurements_added: newMeasurements.length,
          site: sites[siteIndex],
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  },

  // [GET] /sites/:id/metrics - Get site analytics
  async getSiteMetrics(siteId: string): Promise<ApiResponse<SiteMetrics>> {
    try {
      await simulateNetworkDelay();

      const sites = getSites();
      const site = sites.find((s) => s.id === siteId);

      if (!site) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Site not found',
          },
        };
      }

      const measurements = getMeasurements().filter(
        (m) => m.site_id === siteId
      );

      const compliance_status: 'Within Limit' | 'Limit Exceeded' =
        site.total_emissions_to_date <= site.emission_limit
          ? 'Within Limit'
          : 'Limit Exceeded';

      const utilization_percentage =
        (site.total_emissions_to_date / site.emission_limit) * 100;

      const lastMeasurement = measurements.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0];

      return {
        success: true,
        data: {
          site,
          compliance_status,
          utilization_percentage: Math.round(utilization_percentage * 100) / 100,
          total_measurements: measurements.length,
          last_measurement_at: lastMeasurement?.timestamp,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  },
};
