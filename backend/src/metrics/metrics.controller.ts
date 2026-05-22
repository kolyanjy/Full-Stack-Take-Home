import { Controller, Get, Param, ParseUUIDPipe, Version } from '@nestjs/common';
import { MetricsService } from './metrics.service';

@Controller('sites')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get(':id/metrics')
  @Version('1')
  getSiteMetrics(@Param('id', ParseUUIDPipe) id: string) {
    return this.metricsService.getSiteMetrics(id);
  }
}
