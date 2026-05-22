import { z } from 'zod';

export const CreateSiteSchema = z.object({
  name: z.string().min(1).max(255),
  location: z.string().min(1).max(255),
  emission_limit: z.number().positive(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const SiteResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  location: z.string(),
  emission_limit: z.number(),
  total_emissions_to_date: z.number(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  created_at: z.string().or(z.date()),
  updated_at: z.string().or(z.date()),
});

export type CreateSiteDto = z.infer<typeof CreateSiteSchema>;
export type SiteResponse = z.infer<typeof SiteResponseSchema>;
