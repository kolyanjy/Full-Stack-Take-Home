import { Body, Controller, Get, HttpCode, HttpStatus, Post, Version } from '@nestjs/common';
import { IngestService } from './ingest.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { IngestBatchSchema, IngestBatchDto } from '../../shared/schemas/ingest.schema';

@Controller('ingest')
export class IngestController {
  constructor(private readonly ingestService: IngestService) {}

  @Post()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  ingest(@Body(new ZodValidationPipe(IngestBatchSchema)) dto: IngestBatchDto) {
    return this.ingestService.ingestBatch(dto);
  }

  @Get('stats')
  @Version('1')
  stats() {
    return this.ingestService.getDuplicateStats();
  }
}
