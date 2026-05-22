import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OutboxProcessor {
  private readonly logger = new Logger(OutboxProcessor.name);
  private readonly BATCH_SIZE = 50;

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  async processOutbox() {
    const events = await this.prisma.outboxEvent.findMany({
      where: { processed: false },
      orderBy: { created_at: 'asc' },
      take: this.BATCH_SIZE,
    });

    if (events.length === 0) return;

    this.logger.log(`Processing ${events.length} outbox event(s)`);

    for (const event of events) {
      try {
        await this.dispatchEvent(event.event_type, event.payload as Record<string, unknown>);
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: { processed: true, processed_at: new Date() },
        });
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to process outbox event ${event.id}: ${error}`);
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: { attempts: { increment: 1 }, last_error: error },
        });
      }
    }
  }

  private async dispatchEvent(eventType: string, payload: Record<string, unknown>) {
    this.logger.log(
      `[AlertingService] Event dispatched: type=${eventType} payload=${JSON.stringify(payload)}`,
    );

    if (eventType === 'EMISSIONS_INGESTED' && payload.limit_exceeded) {
      this.logger.warn(
        `[AlertingService] ALERT: Site ${payload.site_id} has exceeded its emission limit! ` +
          `total=${payload.new_total} limit=${payload.emission_limit}`,
      );
    }
  }
}
