// apps/api/src/modules/doctor-agenda/doctor-agenda.controller.ts
import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { DoctorAgendaService } from './doctor-agenda.service';
import { JwtAuthGuard }        from '../../common/guards/jwt-auth.guard';
import { RolesGuard }          from '../../common/guards/roles.guard';
import { Roles }               from '../../common/decorators/roles.decorator';
import { CurrentUser }         from '../../common/decorators/current-user.decorator';

@Controller('doutor/agenda')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('doctor')
export class DoctorAgendaController {
  constructor(private readonly svc: DoctorAgendaService) {}

  // ── Carga horária ──────────────────────────────────────────────────────────
  @Get('working-hours')
  getWorkingHours(@CurrentUser() u: any) {
    return this.svc.getWorkingHours(u.id);
  }

  @Post('working-hours')
  setWorkingHours(@CurrentUser() u: any, @Body() body: { days: any[] }) {
    return this.svc.setWorkingHours(u.id, body.days);
  }

  // ── Bloqueios ──────────────────────────────────────────────────────────────
  @Post('blocked-slots')
  addBlockedSlot(@CurrentUser() u: any, @Body() dto: any) {
    return this.svc.addBlockedSlot(u.id, dto);
  }

  @Delete('blocked-slots/:id')
  removeBlockedSlot(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.removeBlockedSlot(u.id, id);
  }

  // ── Slots disponíveis ──────────────────────────────────────────────────────
  @Get('slots')
  getSlots(@CurrentUser() u: any, @Query('date') date: string) {
    return this.svc.getAvailableSlots(u.id, date);
  }

  // ── Resumo do dia ──────────────────────────────────────────────────────────
  @Get('day-summary')
  getDaySummary(@CurrentUser() u: any, @Query('date') date: string) {
    return this.svc.getDaySummary(u.id, date || new Date().toISOString().slice(0, 10));
  }

  // ── Consultas ──────────────────────────────────────────────────────────────
  @Get('appointments')
  getAppointments(
    @CurrentUser() u: any,
    @Query('from')  from:  string,
    @Query('to')    to:    string,
  ) {
    const now  = new Date();
    const dflt = (d: string, fb: string) => d || fb;
    return this.svc.getAppointments(
      u.id,
      dflt(from, new Date(now.getFullYear(), now.getMonth(), 1).toISOString()),
      dflt(to,   new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()),
    );
  }

  @Post('appointments')
  createAppointment(@CurrentUser() u: any, @Body() dto: any) {
    return this.svc.createAppointment(u.id, dto);
  }

  @Patch('appointments/:id')
  updateAppointment(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: any) {
    return this.svc.updateAppointment(u.id, id, dto);
  }

  @Delete('appointments/:id')
  deleteAppointment(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.deleteAppointment(u.id, id);
  }
}
