// apps/api/src/modules/clinic/clinic.controller.ts
import {
  Controller, Post, Get, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ClinicService } from './clinic.service';
import { CreateClinicDto } from './dto/create-clinic.dto';
import { UpdateClinicDto } from './dto/update-clinic.dto';
import { LinkDoctorDto } from './dto/link-doctor.dto';
import { AddClinicStaffDto } from './dto/clinic-staff.dto';
import { ClinicProcedureDto } from './dto/clinic-procedure.dto';
import { ClinicRoomDto } from './dto/clinic-room.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

// ── Ativar perfil de clínica em conta existente ──────────────────────────────
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class BecomeClinicAdminController {
  constructor(private readonly clinicService: ClinicService) {}

  @Post('become-clinic-admin')
  @HttpCode(HttpStatus.CREATED)
  becomeClinicAdmin(@CurrentUser() user: any, @Body() dto: CreateClinicDto) {
    return this.clinicService.becomeClinicAdmin(user.id, dto);
  }
}

// ── Painel da Clínica (role=clinic_admin obrigatório) ────────────────────────
@Controller('clinic')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('clinic_admin')
export class ClinicPanelController {
  constructor(private readonly clinicService: ClinicService) {}

  @Get('me')
  getMyClinic(@CurrentUser() user: any) {
    return this.clinicService.getMyClinic(user.id);
  }

  @Patch('me')
  updateClinic(@CurrentUser() user: any, @Body() dto: UpdateClinicDto) {
    return this.clinicService.updateClinic(user.id, dto);
  }

  // ── médicos ──────────────────────────────────────────────────────────────
  @Post('doctors')
  linkDoctor(@CurrentUser() user: any, @Body() dto: LinkDoctorDto) {
    return this.clinicService.linkDoctor(user.id, dto);
  }

  @Get('doctors')
  listDoctors(@CurrentUser() user: any) {
    return this.clinicService.listDoctors(user.id);
  }

  @Delete('doctors/:id')
  unlinkDoctor(@CurrentUser() user: any, @Param('id') id: string) {
    return this.clinicService.unlinkDoctor(user.id, id);
  }

  // ── pacientes ────────────────────────────────────────────────────────────
  @Get('patients')
  listPatients(@CurrentUser() user: any) {
    return this.clinicService.listPatients(user.id);
  }

  // ── agenda ───────────────────────────────────────────────────────────────
  @Get('agenda')
  listAgenda(
    @CurrentUser() user: any,
    @Query('date') date?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('doctorId') doctorId?: string,
    @Query('roomId') roomId?: string,
  ) {
    return this.clinicService.listAgenda(user.id, { date, from, to, doctorId, roomId });
  }

  @Get('agenda/working-hours')
  getDoctorWorkingHours(@CurrentUser() user: any, @Query('doctorId') doctorId: string) {
    return this.clinicService.getDoctorWorkingHours(user.id, doctorId);
  }

  @Get('agenda/slots')
  getDoctorSlots(@CurrentUser() user: any, @Query('doctorId') doctorId: string, @Query('date') date: string) {
    return this.clinicService.getDoctorSlots(user.id, doctorId, date);
  }

  @Get('agenda/day-summary')
  getDoctorDaySummary(@CurrentUser() user: any, @Query('doctorId') doctorId: string, @Query('date') date: string) {
    return this.clinicService.getDoctorDaySummary(user.id, doctorId, date || new Date().toISOString().slice(0, 10));
  }

  @Post('agenda/appointments')
  createAppointment(@CurrentUser() user: any, @Body() dto: any) {
    return this.clinicService.createAppointment(user.id, dto);
  }

  @Patch('agenda/appointments/:id')
  updateAppointment(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: any) {
    return this.clinicService.updateAppointment(user.id, id, dto);
  }

  @Delete('agenda/appointments/:id')
  cancelAppointment(@CurrentUser() user: any, @Param('id') id: string) {
    return this.clinicService.cancelAppointment(user.id, id);
  }

  // ── empresas ─────────────────────────────────────────────────────────────
  @Get('companies')
  listCompanies(@CurrentUser() user: any) {
    return this.clinicService.listCompanies(user.id);
  }

  /** Enriquecimento por CNPJ (BrasilAPI/ReceitaWS) — antes de "companies/:id" p/ não colidir. */
  @Get('companies/lookup/:cnpj')
  lookupCompanyCnpj(@Param('cnpj') cnpj: string) {
    return this.clinicService.lookupCnpj(cnpj);
  }

  @Post('companies')
  createCompany(@CurrentUser() user: any, @Body() dto: any) {
    return this.clinicService.createCompany(user.id, dto);
  }

  @Get('companies/:id')
  getCompany(@CurrentUser() user: any, @Param('id') id: string) {
    return this.clinicService.getCompany(user.id, id);
  }

  @Patch('companies/:id')
  updateCompany(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: any) {
    return this.clinicService.updateCompany(user.id, id, dto);
  }

  @Delete('companies/:id')
  removeCompany(@CurrentUser() user: any, @Param('id') id: string) {
    return this.clinicService.removeCompany(user.id, id);
  }

  // ── ASOs ─────────────────────────────────────────────────────────────────
  @Get('asos')
  listAsos(@CurrentUser() user: any) {
    return this.clinicService.listAsos(user.id);
  }

  // ── salas ────────────────────────────────────────────────────────────────
  @Post('rooms')
  createRoom(@CurrentUser() user: any, @Body() dto: ClinicRoomDto) {
    return this.clinicService.createRoom(user.id, dto);
  }

  @Get('rooms')
  listRooms(@CurrentUser() user: any) {
    return this.clinicService.listRooms(user.id);
  }

  @Patch('rooms/:id')
  updateRoom(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: any) {
    return this.clinicService.updateRoom(user.id, id, dto);
  }

  /** Agenda da sala — mesma listagem de /clinic/agenda, filtrada por roomId. */
  @Get('rooms/:id/agenda')
  roomAgenda(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('date') date?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.clinicService.listAgenda(user.id, { date, from, to, roomId: id });
  }

  @Post('rooms/:id/doctors')
  assignRoomDoctor(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: { doctorId: string }) {
    return this.clinicService.assignRoomToDoctor(user.id, id, dto.doctorId);
  }

  @Delete('rooms/:id/doctors/:doctorId')
  unassignRoomDoctor(@CurrentUser() user: any, @Param('id') id: string, @Param('doctorId') doctorId: string) {
    return this.clinicService.unassignRoomFromDoctor(user.id, id, doctorId);
  }

  // ── procedimentos ────────────────────────────────────────────────────────
  @Post('procedures')
  createProcedure(@CurrentUser() user: any, @Body() dto: ClinicProcedureDto) {
    return this.clinicService.createProcedure(user.id, dto);
  }

  @Get('procedures')
  listProcedures(@CurrentUser() user: any) {
    return this.clinicService.listProcedures(user.id);
  }

  // ── staff ────────────────────────────────────────────────────────────────
  @Post('staff')
  addStaff(@CurrentUser() user: any, @Body() dto: AddClinicStaffDto) {
    return this.clinicService.addStaff(user.id, dto);
  }

  @Get('staff')
  listStaff(@CurrentUser() user: any) {
    return this.clinicService.listStaff(user.id);
  }

  @Delete('staff/:id')
  removeStaff(@CurrentUser() user: any, @Param('id') id: string) {
    return this.clinicService.removeStaff(user.id, id);
  }

  // ── financeiro ───────────────────────────────────────────────────────────
  @Get('financeiro/dre')
  financeiroDre(@CurrentUser() user: any, @Query('from') from?: string, @Query('to') to?: string) {
    return this.clinicService.financeiroDre(user.id, from, to);
  }

  @Get('financeiro/por-medico')
  financeiroPorMedico(@CurrentUser() user: any, @Query('from') from?: string, @Query('to') to?: string) {
    return this.clinicService.financeiroPorMedico(user.id, from, to);
  }

  // ── conta corrente por médico (extrato + saldo, inclui custo de salas) ────
  @Get('financeiro/conta-corrente/:doctorId')
  contaCorrente(
    @CurrentUser() user: any,
    @Param('doctorId') doctorId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.clinicService.getContaCorrente(user.id, doctorId, from, to);
  }

  @Post('financeiro/conta-corrente/:doctorId/entries')
  createContaCorrenteEntry(@CurrentUser() user: any, @Param('doctorId') doctorId: string, @Body() dto: any) {
    return this.clinicService.createDoctorCashEntry(user.id, doctorId, dto);
  }
}
