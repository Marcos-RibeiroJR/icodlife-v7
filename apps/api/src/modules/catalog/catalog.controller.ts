// apps/api/src/modules/catalog/catalog.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('catalog')
@UseGuards(JwtAuthGuard)
export class CatalogController {
  constructor(private svc: CatalogService) {}

  /** Busca de exames (base TUSS embutida). */
  @Get('exams')
  exams(@Query('q') q: string, @Query('limit') limit?: string) {
    return this.svc.searchExams(q ?? '', limit ? +limit : 20);
  }

  /** Busca de medicamentos (ANVISA ao vivo + fallback local). */
  @Get('medications')
  medications(@Query('q') q: string, @Query('limit') limit?: string) {
    return this.svc.searchMedications(q ?? '', limit ? +limit : 20);
  }
}
