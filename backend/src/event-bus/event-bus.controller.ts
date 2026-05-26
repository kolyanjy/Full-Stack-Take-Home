import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { ReadingsService } from './readings/readings.service';
import { ReadingMessage } from './reading-message.interface';

@Controller()
export class EventBusController {
  constructor(private readonly readingsService: ReadingsService) {}

  @EventPattern('emissions.readings')
  async onEmissionsReading(@Payload() data: ReadingMessage): Promise<void> {
    await this.readingsService.process(data);
  }
}
