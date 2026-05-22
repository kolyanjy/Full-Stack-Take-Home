import { BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodSchema } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const errors = result.error.issues.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      }));
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: errors,
      });
    }
    return result.data;
  }
}
