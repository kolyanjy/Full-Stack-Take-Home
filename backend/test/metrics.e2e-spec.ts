import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

const SITE_UUID = '550e8400-e29b-41d4-a716-446655440001';

const mockSite = {
  id: SITE_UUID,
  name: 'Well A',
  emission_limit: 5000,
  total_emissions_to_date: 1250,
  _count: { measurements: 10 },
};

const mockPrisma = {
  site: { findUnique: jest.fn() },
  measurement: { findFirst: jest.fn() },
  outboxEvent: { findMany: jest.fn().mockResolvedValue([]) },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

describe('Metrics (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
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
    mockPrisma.outboxEvent.findMany.mockResolvedValue([]);
  });

  describe('GET /v1/sites/:id/metrics', () => {
    it('returns metrics with WITHIN_LIMIT status', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(mockSite);
      mockPrisma.measurement.findFirst.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get(`/v1/sites/${SITE_UUID}/metrics`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.site_id).toBe(SITE_UUID);
      expect(res.body.data.compliance_status).toBe('WITHIN_LIMIT');
      expect(res.body.data.utilization_pct).toBe(25);
      expect(res.body.data.measurement_count).toBe(10);
    });

    it('returns LIMIT_EXCEEDED when emissions exceed limit', async () => {
      mockPrisma.site.findUnique.mockResolvedValue({
        ...mockSite,
        total_emissions_to_date: 6000,
        emission_limit: 5000,
      });
      mockPrisma.measurement.findFirst.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get(`/v1/sites/${SITE_UUID}/metrics`)
        .expect(200);

      expect(res.body.data.compliance_status).toBe('LIMIT_EXCEEDED');
    });

    it('includes last_reading_at when measurements exist', async () => {
      const lastTimestamp = new Date('2026-01-15T12:00:00Z');
      mockPrisma.site.findUnique.mockResolvedValue(mockSite);
      mockPrisma.measurement.findFirst.mockResolvedValue({ timestamp: lastTimestamp });

      const res = await request(app.getHttpServer())
        .get(`/v1/sites/${SITE_UUID}/metrics`)
        .expect(200);

      expect(res.body.data.last_reading_at).toBeTruthy();
    });

    it('returns 404 when site does not exist', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get(`/v1/sites/${SITE_UUID}/metrics`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 400 for non-UUID site id', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/sites/invalid-id/metrics')
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('includes all required metric fields', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(mockSite);
      mockPrisma.measurement.findFirst.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get(`/v1/sites/${SITE_UUID}/metrics`)
        .expect(200);

      const data = res.body.data;
      expect(data).toHaveProperty('site_id');
      expect(data).toHaveProperty('site_name');
      expect(data).toHaveProperty('emission_limit');
      expect(data).toHaveProperty('total_emissions_to_date');
      expect(data).toHaveProperty('compliance_status');
      expect(data).toHaveProperty('utilization_pct');
      expect(data).toHaveProperty('measurement_count');
      expect(data).toHaveProperty('last_reading_at');
    });
  });
});
