import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SiteMetrics } from '../../shared/schemas/metrics.schema';

@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSiteMetrics(siteId: string): Promise<SiteMetrics> {
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

    const utilization = (site.total_emissions_to_date / site.emission_limit) * 100;

    return {
      site_id: site.id,
      site_name: site.name,
      emission_limit: site.emission_limit,
      total_emissions_to_date: site.total_emissions_to_date,
      compliance_status:
        site.total_emissions_to_date <= site.emission_limit ? 'WITHIN_LIMIT' : 'LIMIT_EXCEEDED',
      utilization_pct: Math.round(utilization * 100) / 100,
      measurement_count: site._count.measurements,
      last_reading_at: lastMeasurement?.timestamp ?? null,
    };
  }
}
