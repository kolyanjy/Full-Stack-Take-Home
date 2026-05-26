import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MetricsModule } from '../metrics/metrics.module';
import { EventBusProducerService } from './event-bus-producer.service';
import { EventBusController } from './event-bus.controller';
import { ReadingsService } from './readings/readings.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_CLIENT',
        useFactory: () => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'emissions-producer',
              brokers: [(process.env.KAFKA_BROKER ?? 'localhost:9092')],
            },
            producer: {
              allowAutoTopicCreation: true,
            },
          },
        }),
      },
    ]),
    MetricsModule,
  ],
  controllers: [EventBusController],
  providers: [EventBusProducerService, ReadingsService],
  exports: [EventBusProducerService],
})
export class EventBusModule {}
