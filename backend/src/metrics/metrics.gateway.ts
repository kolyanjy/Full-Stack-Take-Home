import { Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { MetricsService } from './metrics.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class MetricsGateway {
  @WebSocketServer()
  private readonly server: Server;

  private readonly logger = new Logger(MetricsGateway.name);

  constructor(private readonly metricsService: MetricsService) {}

  async emitMetricsUpdate(siteId: string): Promise<void> {
    try {
      const metrics = await this.metricsService.getSiteMetrics(siteId);
      this.server.emit('site:metrics:updated', metrics);
      this.logger.log(`Emitted metrics update for site ${siteId}`);
    } catch (err) {
      this.logger.error(`Failed to emit metrics update for site ${siteId}: ${err}`);
    }
  }
}
