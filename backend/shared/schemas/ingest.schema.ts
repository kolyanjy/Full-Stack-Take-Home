import { z } from 'zod';

export const ReadingSchema = z.object({
  value: z.number().nonnegative(),
  unit: z.enum(['kg', 'tonnes', 'scf']).default('kg'),
  sensor_id: z.string().max(100).optional(),
  timestamp: z.string().datetime(),
});

export const IngestBatchSchema = z.object({
  site_id: z.string().uuid(),
  request_id: z.string().uuid(),
  readings: z.array(ReadingSchema).min(1).max(100),
});

export const IngestResponseSchema = z.object({
  batch_id: z.string(),
  site_id: z.string().uuid(),
  count: z.number().int(),
  total_value: z.number(),
  duplicate: z.boolean(),
  processed_at: z.string().or(z.date()),
});

export type ReadingDto = z.infer<typeof ReadingSchema>;
export type IngestBatchDto = z.infer<typeof IngestBatchSchema>;
export type IngestResponse = z.infer<typeof IngestResponseSchema>;
