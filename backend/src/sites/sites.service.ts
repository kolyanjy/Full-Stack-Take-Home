import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSiteDto } from '../../shared/schemas/site.schema';

@Injectable()
export class SitesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSiteDto) {
    return this.prisma.site.create({
      data: {
        name: dto.name,
        location: dto.location,
        emission_limit: dto.emission_limit,
        metadata: (dto.metadata ?? null) as object,
      },
    });
  }

  async findAll() {
    return this.prisma.site.findMany({ orderBy: { created_at: 'desc' } });
  }

  async findOne(id: string) {
    const site = await this.prisma.site.findUnique({ where: { id } });
    if (!site) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: `Site ${id} not found` });
    }
    return site;
  }
}
