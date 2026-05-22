export interface Site {
  id: string;
  name: string;
  location: string;
  emission_limit: number;
  total_emissions_to_date: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface SiteMetrics {
  site_id: string;
  site_name: string;
  emission_limit: number;
  total_emissions_to_date: number;
  compliance_status: 'WITHIN_LIMIT' | 'LIMIT_EXCEEDED';
  utilization_pct: number;
  measurement_count: number;
  last_reading_at: string | null;
}

export interface Reading {
  value: number;
  unit?: 'kg' | 'tonnes' | 'scf';
  sensor_id?: string;
  timestamp: string;
}

export interface IngestBatchRequest {
  site_id: string;
  request_id: string;
  readings: Reading[];
}

export interface IngestResponse {
  batch_id: string;
  site_id: string;
  count: number;
  total_value: number;
  duplicate: boolean;
  processed_at: string;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta: { timestamp: string; version: string };
}

export interface ApiError {
  success: false;
  error: { code: string; message: string; details?: unknown };
  meta: { timestamp: string; path: string; version: string };
}

export type ApiResult<T> = ApiSuccess<T> | ApiError;
