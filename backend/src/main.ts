import { NestFactory } from '@nestjs/core';
import { Logger, VersioningType } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error', 'debug'],
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'emissions-consumer',
        brokers: [(process.env.KAFKA_BROKER ?? 'localhost:9092')],
      },
      consumer: {
        groupId: 'emissions-consumer-group',
      },
    },
  });

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  const rawOrigin = process.env.CORS_ORIGIN;
  const corsOrigin = rawOrigin
    ? rawOrigin.includes(',')
      ? rawOrigin.split(',').map((o) => o.trim())
      : rawOrigin
    : '*';
  app.enableCors({ origin: corsOrigin });

  await app.startAllMicroservices();

  const port = process.env.PORT || 3001;
  await app.listen(port);
  Logger.log(`Emissions API running on http://localhost:${port}/v1`, 'Bootstrap');
}

bootstrap();
