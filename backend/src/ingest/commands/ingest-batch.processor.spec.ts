import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { IngestBatchProcessor } from './ingest-batch.processor';
import { PrismaService } from '../../prisma/prisma.service';
import { IngestBatchCommand } from './ingest-batch.command';

const makeReading = (value = 100) => ({
  value,
  unit: 'kg' as const,
  sensor_id: 'sensor-1',
  timestamp: new Date().toISOString(),
});

const siteFindResult = [{ id: 'site-uuid' }];

const makeMockPrisma = () => ({
  ingestBatch: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  measurement: {
    createMany: jest.fn(),
  },
  site: {
    update: jest.fn(),
    findUnique: jest.fn(),
  },
  outboxEvent: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
  $queryRaw: jest.fn(),
});

describe('IngestBatchProcessor', () => {
  let processor: IngestBatchProcessor;
  let mockPrisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(async () => {
    mockPrisma = makeMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestBatchProcessor,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    processor = module.get<IngestBatchProcessor>(IngestBatchProcessor);
  });

  describe('execute — duplicate detection', () => {
    it('returns cached response without running transaction on duplicate request_id', async () => {
      const existingBatch = {
        id: 'req-uuid',
        site_id: 'site-uuid',
        count: 2,
        total_value: 200,
        processed_at: new Date(),
      };
      mockPrisma.ingestBatch.findUnique.mockResolvedValue(existingBatch);

      const command = new IngestBatchCommand('site-uuid', 'req-uuid', [makeReading()]);
      const result = await processor.execute(command);

      expect(result.duplicate).toBe(true);
      expect(result.batch_id).toBe('req-uuid');
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('increments duplicatesRejected counter on duplicate', async () => {
      const existingBatch = {
        id: 'req-uuid',
        site_id: 'site-uuid',
        count: 1,
        total_value: 100,
        processed_at: new Date(),
      };
      mockPrisma.ingestBatch.findUnique.mockResolvedValue(existingBatch);

      const command = new IngestBatchCommand('site-uuid', 'req-uuid', [makeReading()]);
      await processor.execute(command);
      await processor.execute(command);

      expect(processor.getDuplicatesRejectedCount()).toBe(2);
    });
  });

  describe('execute — successful ingestion', () => {
    beforeEach(() => {
      mockPrisma.ingestBatch.findUnique.mockResolvedValue(null);

      mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => Promise<unknown>) => {
        return callback(mockPrisma);
      });

      mockPrisma.$queryRaw.mockResolvedValue(siteFindResult);

      const batch = {
        id: 'req-uuid',
        site_id: 'site-uuid',
        count: 1,
        total_value: 150,
        processed_at: new Date(),
      };
      mockPrisma.ingestBatch.create.mockResolvedValue(batch);
      mockPrisma.measurement.createMany.mockResolvedValue({ count: 1 });
      mockPrisma.site.update.mockResolvedValue({});
      mockPrisma.site.findUnique.mockResolvedValue({
        id: 'site-uuid',
        total_emissions_to_date: 150,
        emission_limit: 5000,
      });
      mockPrisma.outboxEvent.create.mockResolvedValue({});
    });

    it('returns duplicate:false for new request', async () => {
      const command = new IngestBatchCommand('site-uuid', 'req-uuid', [makeReading(150)]);
      const result = await processor.execute(command);

      expect(result.duplicate).toBe(false);
      expect(result.count).toBe(1);
      expect(result.total_value).toBe(150);
    });

    it('creates measurements for each reading', async () => {
      const readings = [makeReading(100), makeReading(50)];
      const command = new IngestBatchCommand('site-uuid', 'req-uuid', readings);
      await processor.execute(command);

      expect(mockPrisma.measurement.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ value: 100, site_id: 'site-uuid' }),
          expect.objectContaining({ value: 50, site_id: 'site-uuid' }),
        ]),
      });
    });

    it('increments site total_emissions_to_date by sum of readings', async () => {
      const readings = [makeReading(100), makeReading(75)];
      const command = new IngestBatchCommand('site-uuid', 'req-uuid', readings);
      await processor.execute(command);

      expect(mockPrisma.site.update).toHaveBeenCalledWith({
        where: { id: 'site-uuid' },
        data: { total_emissions_to_date: { increment: 175 } },
      });
    });

    it('creates an outbox event in the same transaction', async () => {
      const command = new IngestBatchCommand('site-uuid', 'req-uuid', [makeReading(100)]);
      await processor.execute(command);

      expect(mockPrisma.outboxEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ event_type: 'EMISSIONS_INGESTED' }),
      });
    });
  });

  describe('execute — site not found', () => {
    it('throws NotFoundException when site does not exist', async () => {
      mockPrisma.ingestBatch.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => Promise<unknown>) => {
        return callback(mockPrisma);
      });
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const command = new IngestBatchCommand('missing-site', 'req-uuid', [makeReading()]);
      await expect(processor.execute(command)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDuplicatesRejectedCount', () => {
    it('starts at zero', () => {
      expect(processor.getDuplicatesRejectedCount()).toBe(0);
    });
  });
});
