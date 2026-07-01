// apps/api/src/modules/telemedicine/telemedicine.controller.ts
import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard }      from '../../common/guards/jwt-auth.guard';
import { CurrentUser }       from '../../common/decorators/current-user.decorator';
import { TelemedicineService } from './telemedicine.service';

@Controller('telemedicine')
export class TelemedicineController {
  constructor(private svc: TelemedicineService) {}

  // ── Rotas do médico (autenticado) ─────────────────────────────────────────

  /** POST /telemedicine/rooms — médico cria sala */
  @UseGuards(JwtAuthGuard)
  @Post('rooms')
  create(@CurrentUser() u: any, @Body() body: { appointmentId?: string }) {
    return this.svc.createRoom(u.id, body.appointmentId);
  }

  /** GET /telemedicine/rooms — salas ativas do médico */
  @UseGuards(JwtAuthGuard)
  @Get('rooms')
  listRooms(@CurrentUser() u: any) {
    return this.svc.listDoctorRooms(u.id);
  }

  /** GET /telemedicine/rooms/history — histórico */
  @UseGuards(JwtAuthGuard)
  @Get('rooms/history')
  history(@CurrentUser() u: any, @Query('limit') limit?: string) {
    return this.svc.listDoctorHistory(u.id, limit ? parseInt(limit) : 20);
  }

  /** PATCH /telemedicine/rooms/:id/admit — admite paciente */
  @UseGuards(JwtAuthGuard)
  @Patch('rooms/:id/admit')
  admit(@Param('id') id: string, @CurrentUser() u: any) {
    return this.svc.admitPatient(id, u.id);
  }

  /** PATCH /telemedicine/rooms/:id/end — encerra consulta */
  @UseGuards(JwtAuthGuard)
  @Patch('rooms/:id/end')
  end(@Param('id') id: string, @CurrentUser() u: any, @Body() body: { notes?: string }) {
    return this.svc.endRoom(id, u.id, body.notes);
  }

  /** DELETE /telemedicine/rooms/:id — cancela sala */
  @UseGuards(JwtAuthGuard)
  @Delete('rooms/:id')
  cancel(@Param('id') id: string, @CurrentUser() u: any) {
    return this.svc.cancelRoom(id, u.id);
  }

  // ── Rotas públicas do paciente ────────────────────────────────────────────

  /** GET /telemedicine/join/:token — info da sala (paciente) */
  @Get('join/:token')
  getRoomInfo(@Param('token') token: string) {
    return this.svc.getRoomByToken(token);
  }

  /** POST /telemedicine/join/:token — paciente entra na sala de espera */
  @Post('join/:token')
  patientJoin(
    @Param('token') token: string,
    @Body() body: { patientId?: string; patientName: string; reason?: string },
  ) {
    return this.svc.patientJoin(token, body.patientId ?? null, body.patientName, body.reason);
  }
}
