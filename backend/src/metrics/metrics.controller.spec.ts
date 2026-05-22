import { Test, TestingModule } from '@nestjs/testing';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

const mockMetricsService = {
  getSiteMetrics: jest.fn(),
};

describe('MetricsController', () => {
  let controller: MetricsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [{ provide: MetricsService, useValue: mockMetricsService }],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
    jest.clearAllMocks();
  });

  describe('getSiteMetrics', () => {
    it('delegates to service.getSiteMetrics with the given id', async () => {
      const metrics = {
        site_id: 'site-uuid',
        site_name: 'Well A',
        emission_limit: 5000,
        total_emissions_to_date: 1000,
        compliance_status: 'WITHIN_LIMIT' as const,
        utilization_pct: 20,
        measurement_count: 5,
        last_reading_at: null,
      };
      mockMetricsService.getSiteMetrics.mockResolvedValue(metrics);

      const result = await controller.getSiteMetrics('site-uuid');

      expect(result).toEqual(metrics);
      expect(mockMetricsService.getSiteMetrics).toHaveBeenCalledWith('site-uuid');
    });
  });
});
