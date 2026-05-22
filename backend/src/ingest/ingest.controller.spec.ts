import { Test, TestingModule } from '@nestjs/testing';
import { IngestController } from './ingest.controller';
import { IngestService } from './ingest.service';

const mockIngestService = {
  ingestBatch: jest.fn(),
  getDuplicateStats: jest.fn(),
};

describe('IngestController', () => {
  let controller: IngestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IngestController],
      providers: [{ provide: IngestService, useValue: mockIngestService }],
    }).compile();

    controller = module.get<IngestController>(IngestController);
    jest.clearAllMocks();
  });

  describe('ingest', () => {
    it('delegates to service.ingestBatch', async () => {
      const dto = {
        site_id: 'site-uuid',
        request_id: 'req-uuid',
        readings: [{ value: 100, unit: 'kg' as const, timestamp: new Date().toISOString() }],
      };
      const expected = { batch_id: 'req-uuid', duplicate: false };
      mockIngestService.ingestBatch.mockResolvedValue(expected);

      const result = await controller.ingest(dto);

      expect(result).toEqual(expected);
      expect(mockIngestService.ingestBatch).toHaveBeenCalledWith(dto);
    });
  });

  describe('stats', () => {
    it('delegates to service.getDuplicateStats', () => {
      const expected = { duplicates_rejected: 3 };
      mockIngestService.getDuplicateStats.mockReturnValue(expected);

      const result = controller.stats();

      expect(result).toEqual(expected);
    });
  });
});
