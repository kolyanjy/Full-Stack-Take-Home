import { NestFactory } from '@nestjs/core';
import { Logger, VersioningType } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error', 'debug'],
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

  const port = process.env.PORT || 3001;
  await app.listen(port);
  Logger.log(`Emissions API running on http://localhost:${port}/v1`, 'Bootstrap');
}

bootstrap();
