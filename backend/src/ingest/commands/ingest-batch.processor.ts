import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IngestBatch, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { IngestBatchCommand } from './ingest-batch.command';
import { IngestResponse } from '../../../shared/schemas/ingest.schema';

@Injectable()
export class IngestBatchProcessor {
  private readonly logger = new Logger(IngestBatchProcessor.name);
  private duplicatesRejected = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async execute(command: IngestBatchCommand): Promise<IngestResponse> {
    const existingBatch = await this.prisma.ingestBatch.findUnique({
      where: { id: command.requestId },
    });

    if (existingBatch) {
      this.duplicatesRejected++;
      this.logger.warn(
        `Duplicate request rejected: request_id=${command.requestId} site_id=${command.siteId} ` +
          `total_duplicates_rejected=${this.duplicatesRejected}`,
      );
      return this.toResponse(existingBatch, true);
    }

    const totalValue = command.readings.reduce((sum, r) => sum + r.value, 0);

    const result = await this.prisma.$transaction(
      (tx) => this.createBatchInTransaction(tx, command, totalValue),
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 10000 },
    );

    this.logger.log(
      `Batch processed: request_id=${command.requestId} site_id=${command.siteId} ` +
        `count=${command.readings.length} total_value=${totalValue}`,
    );

    await this.invalidateSiteCache(command.siteId);

    return this.toResponse(result, false);
  }

  private async createBatchInTransaction(
    tx: Prisma.TransactionClient,
    command: IngestBatchCommand,
    totalValue: number,
  ): Promise<IngestBatch> {
    const sites = await tx.$queryRaw<{ id: string }[]>(
      Prisma.sql`SELECT id FROM sites WHERE id = ${command.siteId} FOR UPDATE`,
    );

    if (sites.length === 0) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: `Site ${command.siteId} not found` });
    }

    const batch = await tx.ingestBatch.create({
      data: {
        id: command.requestId,
        site_id: command.siteId,
        total_value: totalValue,
        count: command.readings.length,
      },
    });

    await tx.measurement.createMany({
      data: command.readings.map((r) => ({
        site_id: command.siteId,
        batch_id: batch.id,
        value: r.value,
        unit: r.unit,
        sensor_id: r.sensor_id ?? null,
        timestamp: new Date(r.timestamp),
      })),
    });

    await tx.site.update({
      where: { id: command.siteId },
      data: { total_emissions_to_date: { increment: totalValue } },
    });

    const updatedSite = await tx.site.findUnique({ where: { id: command.siteId } });

    await tx.outboxEvent.create({
      data: {
        event_type: 'EMISSIONS_INGESTED',
        payload: {
          batch_id: batch.id,
          site_id: command.siteId,
          total_value: totalValue,
          count: command.readings.length,
          new_total: updatedSite?.total_emissions_to_date,
          emission_limit: updatedSite?.emission_limit,
          limit_exceeded:
            (updatedSite?.total_emissions_to_date ?? 0) > (updatedSite?.emission_limit ?? 0),
        },
      },
    });

    return batch;
  }

  private async invalidateSiteCache(siteId: string): Promise<void> {
    await this.redis.del(`metrics:${siteId}`, `sites:${siteId}`, 'sites:all');
  }

  private toResponse(batch: IngestBatch, duplicate: boolean): IngestResponse {
    return {
      batch_id: batch.id,
      site_id: batch.site_id,
      count: batch.count,
      total_value: batch.total_value,
      duplicate,
      processed_at: batch.processed_at,
    };
  }

  getDuplicatesRejectedCount(): number {
    return this.duplicatesRejected;
  }
}
