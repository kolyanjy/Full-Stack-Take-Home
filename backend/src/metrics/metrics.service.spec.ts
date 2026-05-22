import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  site: { findUnique: jest.fn() },
  measurement: { findFirst: jest.fn() },
};

const buildSite = (overrides: Record<string, unknown> = {}) => ({
  id: 'site-uuid',
  name: 'Well A',
  emission_limit: 5000,
  total_emissions_to_date: 1000,
  _count: { measurements: 10 },
  ...overrides,
});

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
    jest.clearAllMocks();
  });

  describe('getSiteMetrics', () => {
    it('returns WITHIN_LIMIT when emissions <= limit', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(buildSite({ total_emissions_to_date: 1000, emission_limit: 5000 }));
      mockPrisma.measurement.findFirst.mockResolvedValue(null);

      const result = await service.getSiteMetrics('site-uuid');

      expect(result.compliance_status).toBe('WITHIN_LIMIT');
    });

    it('returns LIMIT_EXCEEDED when emissions > limit', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(buildSite({ total_emissions_to_date: 6000, emission_limit: 5000 }));
      mockPrisma.measurement.findFirst.mockResolvedValue(null);

      const result = await service.getSiteMetrics('site-uuid');

      expect(result.compliance_status).toBe('LIMIT_EXCEEDED');
    });

    it('calculates utilization_pct correctly', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(buildSite({ total_emissions_to_date: 2500, emission_limit: 5000 }));
      mockPrisma.measurement.findFirst.mockResolvedValue(null);

      const result = await service.getSiteMetrics('site-uuid');

      expect(result.utilization_pct).toBe(50);
    });

    it('rounds utilization_pct to 2 decimal places', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(buildSite({ total_emissions_to_date: 1000, emission_limit: 3000 }));
      mockPrisma.measurement.findFirst.mockResolvedValue(null);

      const result = await service.getSiteMetrics('site-uuid');

      expect(result.utilization_pct).toBe(33.33);
    });

    it('includes measurement_count from _count', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(buildSite({ _count: { measurements: 42 } }));
      mockPrisma.measurement.findFirst.mockResolvedValue(null);

      const result = await service.getSiteMetrics('site-uuid');

      expect(result.measurement_count).toBe(42);
    });

    it('returns last_reading_at from latest measurement', async () => {
      const ts = new Date('2026-01-15T10:00:00Z');
      mockPrisma.site.findUnique.mockResolvedValue(buildSite());
      mockPrisma.measurement.findFirst.mockResolvedValue({ timestamp: ts });

      const result = await service.getSiteMetrics('site-uuid');

      expect(result.last_reading_at).toEqual(ts);
    });

    it('returns null for last_reading_at when no measurements exist', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(buildSite());
      mockPrisma.measurement.findFirst.mockResolvedValue(null);

      const result = await service.getSiteMetrics('site-uuid');

      expect(result.last_reading_at).toBeNull();
    });

    it('throws NotFoundException when site does not exist', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(null);

      await expect(service.getSiteMetrics('missing')).rejects.toThrow(NotFoundException);
    });
  });
});
