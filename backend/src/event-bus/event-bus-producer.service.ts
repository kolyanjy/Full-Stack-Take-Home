import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { ReadingMessage } from './reading-message.interface';

@Injectable()
export class EventBusProducerService implements OnModuleInit {
  private readonly logger = new Logger(EventBusProducerService.name);

  constructor(@Inject('KAFKA_CLIENT') private readonly client: ClientKafka) {}

  async onModuleInit() {
    await this.client.connect();
  }

  async publishReading(payload: ReadingMessage): Promise<void> {
    await lastValueFrom(this.client.emit('emissions.readings', { key: payload.site_id, value: payload }));
    this.logger.debug(`Published reading for batch ${payload.batch_id}, site ${payload.site_id}`);
  }
}
