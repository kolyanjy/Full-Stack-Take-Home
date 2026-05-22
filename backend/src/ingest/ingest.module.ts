import { Module } from '@nestjs/common';
import { IngestController } from './ingest.controller';
import { IngestService } from './ingest.service';
import { IngestBatchProcessor } from './commands/ingest-batch.processor';

@Module({
  controllers: [IngestController],
  providers: [IngestService, IngestBatchProcessor],
})
export class IngestModule {}
