import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateSiteDto } from '../../shared/schemas/site.schema';

const TTL = 60;

@Injectable()
export class SitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async create(dto: CreateSiteDto) {
    const site = await this.prisma.site.create({
      data: {
        name: dto.name,
        location: dto.location,
        emission_limit: dto.emission_limit,
        metadata: (dto.metadata ?? null) as object,
      },
    });
    await this.redis.del('sites:all');
    return site;
  }

  async findAll() {
    const cached = await this.redis.get('sites:all');
    if (cached) return cached;
    const sites = await this.prisma.site.findMany({ orderBy: { created_at: 'desc' } });
    await this.redis.set('sites:all', sites, TTL);
    return sites;
  }

  async findOne(id: string) {
    const cached = await this.redis.get(`sites:${id}`);
    if (cached) return cached;
    const site = await this.prisma.site.findUnique({ where: { id } });
    if (!site) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: `Site ${id} not found` });
    }
    await this.redis.set(`sites:${id}`, site, TTL);
    return site;
  }

  async invalidateSite(id: string) {
    await this.redis.del(`sites:${id}`, 'sites:all');
  }
}
