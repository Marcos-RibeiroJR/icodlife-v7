// apps/api/src/modules/blood-pressure/blood-pressure.controller.ts
import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BloodPressureService } from './blood-pressure.service';
import { CreateBpReadingDto } from './dto/create-bp-reading.dto';

@UseGuards(JwtAuthGuard)
@Controller('blood-pressure')
export class BloodPressureController {
  constructor(private svc: BloodPressureService) {}

  /** POST /blood-pressure — registrar nova medição */
  @Post()
  create(@CurrentUser() u: any, @Body() dto: CreateBpReadingDto) {
    return this.svc.create(u.id, dto);
  }

  /** GET /blood-pressure — listar medições (query: days=90) */
  @Get()
  list(@CurrentUser() u: any, @Query('days') days?: string) {
    return this.svc.list(u.id, days ? Number(days) : undefined);
  }

  /** GET /blood-pressure/analyze — relatório completo com tendências e IA */
  @Get('analyze')
  analyze(@CurrentUser() u: any, @Query('days') days?: string) {
    return this.svc.analyze(u.id, days ? Number(days) : 90);
  }

  /** GET /blood-pressure/classify — classifica um par sistólica/diastólica */
  @Get('classify')
  classify(@Query('systolic') s: string, @Query('diastolic') d: string) {
    return this.svc.classify(Number(s), Number(d));
  }

  /** DELETE /blood-pressure/:id */
  @Delete(':id')
  remove(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.delete(u.id, id);
  }
}
