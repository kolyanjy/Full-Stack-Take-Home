import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { MetricsGateway } from '../../metrics/metrics.gateway';
import { ReadingMessage } from '../reading-message.interface';

@Injectable()
export class ReadingsService {
  private readonly logger = new Logger(ReadingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly metricsGateway: MetricsGateway,
  ) {}

  async process(data: ReadingMessage): Promise<void> {
    const { batch_id, site_id, reading } = data;
    this.logger.log(`Processing reading: batch=${batch_id} site=${site_id} value=${reading.value}`);

    try {
      const updatedSite = await this.prisma.$transaction(async (tx) => {
        await tx.measurement.create({
          data: {
            site_id,
            batch_id,
            value: reading.value,
            unit: reading.unit,
            sensor_id: reading.sensor_id ?? null,
            timestamp: new Date(reading.timestamp),
          },
        });

        return tx.site.update({
          where: { id: site_id },
          data: { total_emissions_to_date: { increment: reading.value } },
        });
      });

      if (
        updatedSite.emission_limit !== null &&
        updatedSite.total_emissions_to_date.toNumber() > updatedSite.emission_limit.toNumber()
      ) {
        this.logger.warn(
          `[AlertingService] ALERT: Site ${site_id} exceeded emission limit! ` +
            `total=${updatedSite.total_emissions_to_date} limit=${updatedSite.emission_limit}`,
        );
      }

      await this.redis.del(`metrics:${site_id}`, `sites:${site_id}`, 'sites:all');
      await this.metricsGateway.emitMetricsUpdate(site_id);
    } catch (err) {
      this.logger.error(
        `Failed to process reading for batch ${batch_id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
