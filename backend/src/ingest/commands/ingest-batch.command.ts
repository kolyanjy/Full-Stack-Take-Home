import { ReadingDto } from '../../../shared/schemas/ingest.schema';

export class IngestBatchCommand {
  constructor(
    public readonly siteId: string,
    public readonly requestId: string,
    public readonly readings: ReadingDto[],
  ) {}
}
