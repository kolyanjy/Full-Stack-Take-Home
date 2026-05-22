import type {
  Site,
  SiteMetrics,
  IngestBatchRequest,
  IngestResponse,
  ApiResult,
} from '@/types/emissions';

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001/v1';

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      ...options,
    });
    const json = (await res.json()) as ApiResult<T>;
    return json;
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : 'Network request failed',
      },
      meta: { timestamp: new Date().toISOString(), path, version: '1' },
    };
  }
}

export const api = {
  listSites(): Promise<ApiResult<Site[]>> {
    return request<Site[]>('/sites');
  },

  createSite(data: {
    name: string;
    location: string;
    emission_limit: number;
    metadata?: Record<string, unknown>;
  }): Promise<ApiResult<Site>> {
    return request<Site>('/sites', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getSiteMetrics(siteId: string): Promise<ApiResult<SiteMetrics>> {
    return request<SiteMetrics>(`/sites/${siteId}/metrics`);
  },

  ingestBatch(payload: IngestBatchRequest): Promise<ApiResult<IngestResponse>> {
    return request<IngestResponse>('/ingest', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
