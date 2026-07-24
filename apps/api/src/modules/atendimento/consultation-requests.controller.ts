// apps/api/src/modules/atendimento/consultation-requests.controller.ts
// Endpoints autenticados da clínica: "Meus Funcionários" e "Base de Consultas".
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ConsultationRequestsService } from './consultation-requests.service';

@Controller('clinic')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('clinic_admin')
export class ConsultationRequestsController {
  constructor(private svc: ConsultationRequestsService) {}

  // ── Busca no cadastro único iCODLIFE ───────────────────────────────────
  @Get('users/search')
  searchIcodlifeUsers(@Query('q') q?: string) {
    return this.svc.searchIcodlifeUsers(q);
  }

  // ── Meus Funcionários ─────────────────────────────────────────────────
  @Get('employees')
  searchEmployees(@CurrentUser() user: any, @Query('q') q?: string) {
    return this.svc.searchEmployees(user.id, q);
  }

  @Post('employees')
  createEmployee(@CurrentUser() user: any, @Body() dto: any) {
    return this.svc.createEmployee(user.id, dto);
  }

  // ── Link público de intake por empresa ──────────────────────────────────
  @Post('companies/:id/intake-token')
  rotateIntakeToken(@CurrentUser() user: any, @Param('id') id: string) {
    return this.svc.rotateIntakeToken(user.id, id);
  }

  // ── Base de Consultas ────────────────────────────────────────────────────
  @Get('consultation-requests')
  list(@CurrentUser() user: any, @Query('status') status?: string, @Query('companyId') companyId?: string) {
    return this.svc.listRequests(user.id, { status, companyId });
  }

  @Get('consultation-requests/:id')
  get(@CurrentUser() user: any, @Param('id') id: string) {
    return this.svc.getRequest(user.id, id);
  }

  @Post('consultation-requests')
  create(@CurrentUser() user: any, @Body() dto: any) {
    return this.svc.createManualRequest(user.id, dto);
  }

  @Patch('consultation-requests/:id')
  updateStatus(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: { status: string }) {
    return this.svc.updateStatus(user.id, id, dto.status);
  }
}
