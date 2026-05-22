import { Injectable } from '@nestjs/common';
import { IngestBatchCommand } from './commands/ingest-batch.command';
import { IngestBatchProcessor } from './commands/ingest-batch.processor';
import { IngestBatchDto } from '../../shared/schemas/ingest.schema';

@Injectable()
export class IngestService {
  constructor(private readonly processor: IngestBatchProcessor) {}

  ingestBatch(dto: IngestBatchDto) {
    const command = new IngestBatchCommand(dto.site_id, dto.request_id, dto.readings);
    return this.processor.execute(command);
  }

  getDuplicateStats() {
    return { duplicates_rejected: this.processor.getDuplicatesRejectedCount() };
  }
}
