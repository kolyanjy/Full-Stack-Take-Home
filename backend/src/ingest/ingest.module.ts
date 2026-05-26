import { Module } from '@nestjs/common';
import { EventBusModule } from '../event-bus/event-bus.module';
import { IngestController } from './ingest.controller';
import { IngestService } from './ingest.service';
import { IngestBatchProcessor } from './commands/ingest-batch.processor';

@Module({
  imports: [EventBusModule],
  controllers: [IngestController],
  providers: [IngestService, IngestBatchProcessor],
})
export class IngestModule {}
