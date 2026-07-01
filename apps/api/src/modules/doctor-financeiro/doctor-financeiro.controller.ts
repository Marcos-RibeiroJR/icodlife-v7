// apps/api/src/modules/doctor-financeiro/doctor-financeiro.controller.ts
import {
  Controller, Get, Post, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { DoctorFinanceiroService } from './doctor-financeiro.service';
import { JwtAuthGuard }  from '../../common/guards/jwt-auth.guard';
import { RolesGuard }    from '../../common/guards/roles.guard';
import { Roles }         from '../../common/decorators/roles.decorator';
import { CurrentUser }   from '../../common/decorators/current-user.decorator';

@Controller('doutor/financeiro')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('doctor')
export class DoctorFinanceiroController {
  constructor(private readonly svc: DoctorFinanceiroService) {}

  @Get('entries')
  list(
    @CurrentUser() u: any,
    @Query('from') from: string,
    @Query('to')   to:   string,
    @Query('type') type: string,
  ) {
    const now = new Date();
    const df  = from || new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const dt  = to   || new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    return this.svc.listEntries(u.id, df, dt, type);
  }

  @Post('entries')
  create(@CurrentUser() u: any, @Body() dto: any) {
    return this.svc.createEntry(u.id, dto);
  }

  @Delete('entries/:id')
  remove(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.deleteEntry(u.id, id);
  }

  @Get('summary')
  summary(
    @CurrentUser() u: any,
    @Query('year')  year:  string,
    @Query('month') month: string,
  ) {
    const now = new Date();
    return this.svc.getMonthlySummary(
      u.id,
      +year  || now.getFullYear(),
      +month || now.getMonth() + 1,
    );
  }

  @Post('import-appointments')
  importAppts(
    @CurrentUser() u: any,
    @Query('from') from: string,
    @Query('to')   to:   string,
  ) {
    const now = new Date();
    const df  = from || new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const dt  = to   || new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    return this.svc.importFromAppointments(u.id, df, dt);
  }
}
