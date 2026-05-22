import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SitesService } from './sites.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  site: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
};

describe('SitesService', () => {
  let service: SitesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SitesService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<SitesService>(SitesService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a site with provided dto', async () => {
      const dto = { name: 'Well A', location: 'TX', emission_limit: 5000 };
      const created = { id: 'uuid-1', ...dto, total_emissions_to_date: 0, metadata: null };
      mockPrisma.site.create.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(result).toEqual(created);
      expect(mockPrisma.site.create).toHaveBeenCalledWith({
        data: { name: 'Well A', location: 'TX', emission_limit: 5000, metadata: null },
      });
    });

    it('passes metadata when provided', async () => {
      const dto = { name: 'Well B', location: 'TX', emission_limit: 1000, metadata: { sensors: 2 } };
      mockPrisma.site.create.mockResolvedValue({ id: 'uuid-2', ...dto, total_emissions_to_date: 0 });

      await service.create(dto);

      expect(mockPrisma.site.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ metadata: { sensors: 2 } }),
      });
    });
  });

  describe('findAll', () => {
    it('returns all sites ordered by created_at desc', async () => {
      const sites = [{ id: '1' }, { id: '2' }];
      mockPrisma.site.findMany.mockResolvedValue(sites);

      const result = await service.findAll();

      expect(result).toEqual(sites);
      expect(mockPrisma.site.findMany).toHaveBeenCalledWith({ orderBy: { created_at: 'desc' } });
    });
  });

  describe('findOne', () => {
    it('returns the site when found', async () => {
      const site = { id: 'uuid-1', name: 'Well A' };
      mockPrisma.site.findUnique.mockResolvedValue(site);

      const result = await service.findOne('uuid-1');

      expect(result).toEqual(site);
      expect(mockPrisma.site.findUnique).toHaveBeenCalledWith({ where: { id: 'uuid-1' } });
    });

    it('throws NotFoundException when site does not exist', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('includes site id in NotFoundException message', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'NOT_FOUND' }),
      });
    });
  });
});
