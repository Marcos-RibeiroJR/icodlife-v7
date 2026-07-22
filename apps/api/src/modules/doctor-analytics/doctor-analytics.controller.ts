// apps/api/src/modules/doctor-analytics/doctor-analytics.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DoctorAnalyticsService } from './doctor-analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('doutor/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('doctor')
export class DoctorAnalyticsController {
  constructor(private readonly svc: DoctorAnalyticsService) {}

  /** Dashboard consolidado — KPIs, tendências e perfil de pacientes dos últimos N meses. */
  @Get('dashboard')
  getDashboard(@CurrentUser() u: any, @Query('months') months?: string) {
    const m = Math.min(24, Math.max(1, Number(months) || 6));
    return this.svc.getDashboard(u.id, m);
  }
}
