import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Version } from '@nestjs/common';
import { SitesService } from './sites.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CreateSiteSchema, CreateSiteDto } from '../../shared/schemas/site.schema';

@Controller('sites')
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Post()
  @Version('1')
  create(@Body(new ZodValidationPipe(CreateSiteSchema)) dto: CreateSiteDto) {
    return this.sitesService.create(dto);
  }

  @Get()
  @Version('1')
  findAll() {
    return this.sitesService.findAll();
  }

  @Get(':id')
  @Version('1')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.sitesService.findOne(id);
  }
}
