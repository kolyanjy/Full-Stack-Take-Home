import { Module } from '@nestjs/common';
import { OutboxProcessor } from './outbox.processor';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [MetricsModule],
  providers: [OutboxProcessor],
})
export class OutboxModule {}
