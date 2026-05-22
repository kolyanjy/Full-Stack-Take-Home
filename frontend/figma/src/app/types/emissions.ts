export interface Site {
  id: string;
  name: string;
  location: string;
  emission_limit: number;
  total_emissions_to_date: number;
  created_at: string;
}

export interface Measurement {
  id: string;
  site_id: string;
  value: number;
  timestamp: string;
  sensor_id?: string;
}

export interface IngestBatchRequest {
  site_id: string;
  measurements: Omit<Measurement, 'id' | 'site_id'>[];
  idempotency_key: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface SiteMetrics {
  site: Site;
  compliance_status: 'Within Limit' | 'Limit Exceeded';
  utilization_percentage: number;
  total_measurements: number;
  last_measurement_at?: string;
}
