import { Test, TestingModule } from '@nestjs/testing';
import { IngestService } from './ingest.service';
import { IngestBatchProcessor } from './commands/ingest-batch.processor';
import { IngestBatchCommand } from './commands/ingest-batch.command';

const mockProcessor = {
  execute: jest.fn(),
  getDuplicatesRejectedCount: jest.fn(),
};

describe('IngestService', () => {
  let service: IngestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestService,
        { provide: IngestBatchProcessor, useValue: mockProcessor },
      ],
    }).compile();

    service = module.get<IngestService>(IngestService);
    jest.clearAllMocks();
  });

  describe('ingestBatch', () => {
    it('builds a command and delegates to the processor', async () => {
      const dto = {
        site_id: 'site-uuid',
        request_id: 'req-uuid',
        readings: [{ value: 100, unit: 'kg' as const, timestamp: new Date().toISOString() }],
      };
      const processorResult = {
        batch_id: 'req-uuid',
        site_id: 'site-uuid',
        count: 1,
        total_value: 100,
        duplicate: false,
        processed_at: new Date(),
      };
      mockProcessor.execute.mockResolvedValue(processorResult);

      const result = await service.ingestBatch(dto);

      expect(result).toEqual(processorResult);
      expect(mockProcessor.execute).toHaveBeenCalledWith(
        expect.any(IngestBatchCommand),
      );
      const call = mockProcessor.execute.mock.calls[0][0] as IngestBatchCommand;
      expect(call.siteId).toBe('site-uuid');
      expect(call.requestId).toBe('req-uuid');
      expect(call.readings).toEqual(dto.readings);
    });
  });

  describe('getDuplicateStats', () => {
    it('returns the processor duplicate count wrapped in an object', () => {
      mockProcessor.getDuplicatesRejectedCount.mockReturnValue(5);

      const result = service.getDuplicateStats();

      expect(result).toEqual({ duplicates_rejected: 5 });
    });
  });
});
