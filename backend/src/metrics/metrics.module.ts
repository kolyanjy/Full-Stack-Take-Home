import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { MetricsGateway } from './metrics.gateway';

@Module({
  controllers: [MetricsController],
  providers: [MetricsService, MetricsGateway],
  exports: [MetricsGateway],
})
export class MetricsModule {}
