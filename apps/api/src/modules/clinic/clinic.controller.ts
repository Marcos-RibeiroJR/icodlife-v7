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
    @Query('doctorId') doctorId?: string,
    @Query('roomId') roomId?: string,
  ) {
    return this.clinicService.listAgenda(user.id, { date, doctorId, roomId });
  }

  // ── empresas ─────────────────────────────────────────────────────────────
  @Get('companies')
  listCompanies(@CurrentUser() user: any) {
    return this.clinicService.listCompanies(user.id);
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
}
