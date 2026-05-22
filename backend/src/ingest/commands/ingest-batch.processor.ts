import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IngestBatchCommand } from './ingest-batch.command';
import { IngestResponse } from '../../../shared/schemas/ingest.schema';

@Injectable()
export class IngestBatchProcessor {
  private readonly logger = new Logger(IngestBatchProcessor.name);
  private duplicatesRejected = 0;

  constructor(private readonly prisma: PrismaService) {}

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
      return {
        batch_id: existingBatch.id,
        site_id: existingBatch.site_id,
        count: existingBatch.count,
        total_value: existingBatch.total_value,
        duplicate: true,
        processed_at: existingBatch.processed_at,
      };
    }

    const totalValue = command.readings.reduce((sum, r) => sum + r.value, 0);

    const result = await this.prisma.$transaction(
      async (tx) => {
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
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: 10000,
      },
    );

    this.logger.log(
      `Batch processed: request_id=${command.requestId} site_id=${command.siteId} ` +
        `count=${command.readings.length} total_value=${totalValue}`,
    );

    return {
      batch_id: result.id,
      site_id: result.site_id,
      count: result.count,
      total_value: result.total_value,
      duplicate: false,
      processed_at: result.processed_at,
    };
  }

  getDuplicatesRejectedCount(): number {
    return this.duplicatesRejected;
  }
}
