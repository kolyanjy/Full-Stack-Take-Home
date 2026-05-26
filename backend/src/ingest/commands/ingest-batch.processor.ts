import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IngestBatch } from '@prisma/client';
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
      return this.toResponse(existingBatch, true);
    }

    const site = await this.prisma.site.findUnique({ where: { id: command.siteId } });
    if (!site) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: `Site ${command.siteId} not found` });
    }

    const totalValue = command.readings.reduce((sum, r) => sum + r.value, 0);

    const batch = await this.prisma.ingestBatch.create({
      data: {
        id: command.requestId,
        site_id: command.siteId,
        total_value: totalValue,
        count: command.readings.length,
      },
    });

    this.logger.log(
      `Batch accepted: request_id=${command.requestId} site_id=${command.siteId} ` +
        `count=${command.readings.length} total_value=${totalValue}`,
    );

    return this.toResponse(batch, false);
  }

  private toResponse(batch: IngestBatch, duplicate: boolean): IngestResponse {
    return {
      batch_id: batch.id,
      site_id: batch.site_id,
      count: batch.count,
      total_value: batch.total_value.toNumber(),
      duplicate,
      processed_at: batch.processed_at,
    };
  }

  getDuplicatesRejectedCount(): number {
    return this.duplicatesRejected;
  }
}
