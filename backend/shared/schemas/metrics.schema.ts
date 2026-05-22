import { z } from 'zod';

export const ComplianceStatus = z.enum(['WITHIN_LIMIT', 'LIMIT_EXCEEDED']);

export const SiteMetricsSchema = z.object({
  site_id: z.string().uuid(),
  site_name: z.string(),
  emission_limit: z.number(),
  total_emissions_to_date: z.number(),
  compliance_status: ComplianceStatus,
  utilization_pct: z.number(),
  measurement_count: z.number().int(),
  last_reading_at: z.string().or(z.date()).nullable(),
});

export type SiteMetrics = z.infer<typeof SiteMetricsSchema>;
