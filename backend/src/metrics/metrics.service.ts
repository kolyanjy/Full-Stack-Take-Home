import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SiteMetrics } from '../../shared/schemas/metrics.schema';

const TTL = 30;

@Injectable()
export class MetricsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getSiteMetrics(siteId: string): Promise<SiteMetrics> {
    const cached = await this.redis.get<SiteMetrics>(`metrics:${siteId}`);
    if (cached) return cached;

    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
      include: { _count: { select: { measurements: true } } },
    });

    if (!site) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: `Site ${siteId} not found` });
    }

    const lastMeasurement = await this.prisma.measurement.findFirst({
      where: { site_id: siteId },
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true },
    });

    const emissionLimit = site.emission_limit.toNumber();
    const totalEmissions = site.total_emissions_to_date.toNumber();
    const utilization = (totalEmissions / emissionLimit) * 100;

    const metrics: SiteMetrics = {
      site_id: site.id,
      site_name: site.name,
      emission_limit: emissionLimit,
      total_emissions_to_date: totalEmissions,
      compliance_status: totalEmissions <= emissionLimit ? 'WITHIN_LIMIT' : 'LIMIT_EXCEEDED',
      utilization_pct: Math.round(utilization * 100) / 100,
      measurement_count: site._count.measurements,
      last_reading_at: lastMeasurement?.timestamp ?? null,
    };

    await this.redis.set(`metrics:${siteId}`, metrics, TTL);
    return metrics;
  }

  async invalidate(siteId: string) {
    await this.redis.del(`metrics:${siteId}`);
  }
}
