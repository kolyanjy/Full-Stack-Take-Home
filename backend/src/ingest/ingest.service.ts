import { Injectable } from '@nestjs/common';
import { IngestBatchCommand } from './commands/ingest-batch.command';
import { IngestBatchProcessor } from './commands/ingest-batch.processor';
import { EventBusProducerService } from '../event-bus/event-bus-producer.service';
import { IngestBatchDto } from '../../shared/schemas/ingest.schema';

@Injectable()
export class IngestService {
  constructor(
    private readonly processor: IngestBatchProcessor,
    private readonly eventBus: EventBusProducerService,
  ) {}

  async ingestBatch(dto: IngestBatchDto) {
    const command = new IngestBatchCommand(dto.site_id, dto.request_id, dto.readings);
    const response = await this.processor.execute(command);

    if (!response.duplicate) {
      await Promise.all(
        dto.readings.map((reading) =>
          this.eventBus.publishReading({
            batch_id: response.batch_id,
            site_id: dto.site_id,
            reading: {
              value: reading.value,
              unit: reading.unit,
              sensor_id: reading.sensor_id,
              timestamp: reading.timestamp,
            },
          }),
        ),
      );
    }

    return response;
  }

  getDuplicateStats() {
    return { duplicates_rejected: this.processor.getDuplicatesRejectedCount() };
  }
}
