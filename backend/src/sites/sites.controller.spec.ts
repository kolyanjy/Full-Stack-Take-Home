import { Test, TestingModule } from '@nestjs/testing';
import { SitesController } from './sites.controller';
import { SitesService } from './sites.service';

const mockSitesService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
};

describe('SitesController', () => {
  let controller: SitesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SitesController],
      providers: [{ provide: SitesService, useValue: mockSitesService }],
    }).compile();

    controller = module.get<SitesController>(SitesController);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('delegates to service.create', async () => {
      const dto = { name: 'Well A', location: 'TX', emission_limit: 5000 };
      const site = { id: 'uuid-1', ...dto };
      mockSitesService.create.mockResolvedValue(site);

      const result = await controller.create(dto);

      expect(result).toEqual(site);
      expect(mockSitesService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('delegates to service.findAll', async () => {
      const sites = [{ id: '1' }, { id: '2' }];
      mockSitesService.findAll.mockResolvedValue(sites);

      const result = await controller.findAll();

      expect(result).toEqual(sites);
    });
  });

  describe('findOne', () => {
    it('delegates to service.findOne with the given id', async () => {
      const site = { id: 'uuid-1', name: 'Well A' };
      mockSitesService.findOne.mockResolvedValue(site);

      const result = await controller.findOne('uuid-1');

      expect(result).toEqual(site);
      expect(mockSitesService.findOne).toHaveBeenCalledWith('uuid-1');
    });
  });
});
