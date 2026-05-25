import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/redis/redis.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

const SITE_UUID = '550e8400-e29b-41d4-a716-446655440001';
const REQUEST_UUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

const makeValidBody = (requestId = REQUEST_UUID) => ({
  site_id: SITE_UUID,
  request_id: requestId,
  readings: [
    { value: 100, unit: 'kg', timestamp: new Date().toISOString() },
    { value: 50, unit: 'kg', timestamp: new Date().toISOString() },
  ],
});

const mockBatch = {
  id: REQUEST_UUID,
  site_id: SITE_UUID,
  count: 2,
  total_value: 150,
  processed_at: new Date(),
};

const makeMockPrisma = () => ({
  ingestBatch: {
    findUnique: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(mockBatch),
  },
  measurement: {
    createMany: jest.fn().mockResolvedValue({ count: 2 }),
  },
  site: {
    update: jest.fn().mockResolvedValue({}),
    findUnique: jest.fn().mockResolvedValue({
      id: SITE_UUID,
      total_emissions_to_date: 150,
      emission_limit: 5000,
    }),
  },
  outboxEvent: {
    create: jest.fn().mockResolvedValue({}),
    findMany: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue({}),
  },
  $transaction: jest.fn(),
  $queryRaw: jest.fn().mockResolvedValue([{ id: SITE_UUID }]),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
});

const mockRedis = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
};

describe('Ingest (e2e)', () => {
  let app: INestApplication;
  let mockPrisma: ReturnType<typeof makeMockPrisma>;

  beforeAll(async () => {
    mockPrisma = makeMockPrisma();

    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mockPrisma) => Promise<unknown>) => callback(mockPrisma),
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(RedisService)
      .useValue(mockRedis)
      .compile();

    app = moduleFixture.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.ingestBatch.findUnique.mockResolvedValue(null);
    mockPrisma.ingestBatch.create.mockResolvedValue(mockBatch);
    mockPrisma.measurement.createMany.mockResolvedValue({ count: 2 });
    mockPrisma.site.update.mockResolvedValue({});
    mockPrisma.site.findUnique.mockResolvedValue({
      id: SITE_UUID,
      total_emissions_to_date: 150,
      emission_limit: 5000,
    });
    mockPrisma.outboxEvent.create.mockResolvedValue({});
    mockPrisma.outboxEvent.findMany.mockResolvedValue([]);
    mockPrisma.$queryRaw.mockResolvedValue([{ id: SITE_UUID }]);
    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mockPrisma) => Promise<unknown>) => callback(mockPrisma),
    );
  });

  describe('POST /v1/ingest', () => {
    it('returns 200 with batch result for valid request', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/ingest')
        .send(makeValidBody())
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.duplicate).toBe(false);
      expect(res.body.data.count).toBe(2);
      expect(res.body.data.total_value).toBe(150);
    });

    it('returns duplicate:true on retry with same request_id', async () => {
      mockPrisma.ingestBatch.findUnique.mockResolvedValue(mockBatch);

      const res = await request(app.getHttpServer())
        .post('/v1/ingest')
        .send(makeValidBody())
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.duplicate).toBe(true);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('returns 400 when site_id is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/ingest')
        .send({ request_id: REQUEST_UUID, readings: [] })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when readings array is empty', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/ingest')
        .send({ site_id: SITE_UUID, request_id: REQUEST_UUID, readings: [] })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('returns 400 when readings has more than 100 entries', async () => {
      const readings = Array.from({ length: 101 }, () => ({
        value: 1,
        unit: 'kg',
        timestamp: new Date().toISOString(),
      }));

      const res = await request(app.getHttpServer())
        .post('/v1/ingest')
        .send({ site_id: SITE_UUID, request_id: REQUEST_UUID, readings })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('returns 400 when request_id is not a UUID', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/ingest')
        .send({ site_id: SITE_UUID, request_id: 'not-a-uuid', readings: [{ value: 1, unit: 'kg', timestamp: new Date().toISOString() }] })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('returns 404 when site does not exist', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .post('/v1/ingest')
        .send(makeValidBody())
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /v1/ingest/stats', () => {
    it('returns duplicate stats', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/ingest/stats')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('duplicates_rejected');
    });
  });
});
