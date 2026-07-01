// apps/api/src/modules/glucose/glucose.controller.ts
import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GlucoseService } from './glucose.service';
import { CreateGlucoseDto, CreateHbA1cDto } from './dto/create-glucose.dto';

@UseGuards(JwtAuthGuard)
@Controller('glucose')
export class GlucoseController {
  constructor(private svc: GlucoseService) {}

  /** POST /glucose — registrar leitura de glicemia */
  @Post()
  create(@CurrentUser() u: any, @Body() dto: CreateGlucoseDto) {
    return this.svc.createReading(u.id, dto);
  }

  /** GET /glucose — listar leituras (query: days=90) */
  @Get()
  list(@CurrentUser() u: any, @Query('days') days?: string) {
    return this.svc.listReadings(u.id, days ? Number(days) : undefined);
  }

  /** GET /glucose/analyze — análise completa com alertas e tendências */
  @Get('analyze')
  analyze(@CurrentUser() u: any, @Query('days') days?: string) {
    return this.svc.analyze(u.id, days ? Number(days) : 90);
  }

  /** GET /glucose/classify — classificar valor pontual */
  @Get('classify')
  classify(
    @Query('value') value: string,
    @Query('context') context: string,
  ) {
    return this.svc.classify(Number(value), context ?? 'random');
  }

  /** DELETE /glucose/:id */
  @Delete(':id')
  remove(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.deleteReading(u.id, id);
  }

  // ── HbA1c ──────────────────────────────────────────────────────────────────

  /** POST /glucose/hba1c — registrar HbA1c */
  @Post('hba1c')
  createHbA1c(@CurrentUser() u: any, @Body() dto: CreateHbA1cDto) {
    return this.svc.createHbA1c(u.id, dto);
  }

  /** GET /glucose/hba1c — histórico de HbA1c */
  @Get('hba1c')
  listHbA1c(@CurrentUser() u: any) {
    return this.svc.listHbA1c(u.id);
  }
}
