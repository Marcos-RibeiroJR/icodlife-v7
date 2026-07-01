// apps/api/src/modules/doctor-prescriptions/doctor-prescriptions.controller.ts
import {
  Controller, Get, Post, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { DoctorPrescriptionsService } from './doctor-prescriptions.service';
import { JwtAuthGuard }  from '../../common/guards/jwt-auth.guard';
import { RolesGuard }    from '../../common/guards/roles.guard';
import { Roles }         from '../../common/decorators/roles.decorator';
import { CurrentUser }   from '../../common/decorators/current-user.decorator';

@Controller('doutor/receitas')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('doctor')
export class DoctorPrescriptionsController {
  constructor(private readonly svc: DoctorPrescriptionsService) {}

  // Contexto do médico (nome, CRM) para montar cabeçalho impresso
  @Get('context')
  context(@CurrentUser() u: any) { return this.svc.getDoctorContext(u.id); }

  // ── Receitas ──────────────────────────────────────────────────────────────
  @Get('prescriptions')
  listPrescriptions(
    @CurrentUser() u: any,
    @Query('page')        page:        string,
    @Query('limit')       limit:       string,
    @Query('patientName') patientName: string,
  ) {
    return this.svc.listPrescriptions(u.id, +page || 1, +limit || 20, patientName);
  }

  @Post('prescriptions')
  createPrescription(@CurrentUser() u: any, @Body() dto: any) {
    return this.svc.createPrescription(u.id, dto);
  }

  @Get('prescriptions/:id')
  getPrescription(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.getPrescription(u.id, id);
  }

  @Delete('prescriptions/:id')
  cancelPrescription(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.cancelPrescription(u.id, id);
  }

  // ── Pedidos de Exame ──────────────────────────────────────────────────────
  @Get('exam-orders')
  listExamOrders(
    @CurrentUser() u: any,
    @Query('page')        page:        string,
    @Query('limit')       limit:       string,
    @Query('patientName') patientName: string,
  ) {
    return this.svc.listExamOrders(u.id, +page || 1, +limit || 20, patientName);
  }

  @Post('exam-orders')
  createExamOrder(@CurrentUser() u: any, @Body() dto: any) {
    return this.svc.createExamOrder(u.id, dto);
  }

  @Get('exam-orders/:id')
  getExamOrder(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.getExamOrder(u.id, id);
  }

  @Delete('exam-orders/:id')
  cancelExamOrder(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.cancelExamOrder(u.id, id);
  }
}
