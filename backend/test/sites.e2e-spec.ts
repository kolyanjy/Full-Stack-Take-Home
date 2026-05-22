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
  name: 'Permian Well A',
  location: 'TX',
  emission_limit: 5000,
  total_emissions_to_date: 0,
  metadata: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockPrisma = {
  site: {
    create: jest.fn().mockResolvedValue(mockSite),
    findMany: jest.fn().mockResolvedValue([mockSite]),
    findUnique: jest.fn(),
  },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

describe('Sites (e2e)', () => {
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
    mockPrisma.site.create.mockResolvedValue(mockSite);
    mockPrisma.site.findMany.mockResolvedValue([mockSite]);
  });

  describe('POST /v1/sites', () => {
    it('creates a site and returns 201', async () => {
      const body = { name: 'Permian Well A', location: 'TX', emission_limit: 5000 };

      const res = await request(app.getHttpServer())
        .post('/v1/sites')
        .send(body)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(SITE_UUID);
    });

    it('returns 400 when name is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/sites')
        .send({ location: 'TX', emission_limit: 5000 })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when emission_limit is negative', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/sites')
        .send({ name: 'X', location: 'TX', emission_limit: -1 })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /v1/sites', () => {
    it('returns a list of sites', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/sites')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0].id).toBe(SITE_UUID);
    });
  });

  describe('GET /v1/sites/:id', () => {
    it('returns the site when found', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(mockSite);

      const res = await request(app.getHttpServer())
        .get(`/v1/sites/${SITE_UUID}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(SITE_UUID);
    });

    it('returns 404 when site does not exist', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get(`/v1/sites/${SITE_UUID}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 400 for non-UUID id', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/sites/not-a-uuid')
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });
});
