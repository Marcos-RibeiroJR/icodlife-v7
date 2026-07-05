// apps/api/src/modules/aso/aso.controller.ts
import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, Res, UseGuards,
} from '@nestjs/common';
import { AsoService } from './aso.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('doutor/aso')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('doctor')
export class AsoController {
  constructor(private readonly svc: AsoService) {}

  /** Dados do médico para preencher o cabeçalho do ASO */
  @Get('context')
  context(@CurrentUser() u: any) {
    return this.svc.getContext(u.id);
  }

  @Get()
  list(
    @CurrentUser() u: any,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('worker') worker: string,
  ) {
    return this.svc.list(u.id, +page || 1, +limit || 20, worker);
  }

  @Post()
  create(@CurrentUser() u: any, @Body() dto: any) {
    return this.svc.create(u.id, dto);
  }

  @Get(':id')
  get(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.get(u.id, id);
  }

  /** PDF assinado do ASO (com QR de validação) */
  @Get(':id/pdf')
  async pdf(@CurrentUser() u: any, @Param('id') id: string, @Res() res: any) {
    const { buffer, aso } = await this.svc.generatePdf(u.id, id);
    const safe = (aso.workerName || 'aso').normalize('NFD').replace(/[^\w]+/g, '-').toLowerCase();
    const filename = `aso-${safe}-${id.slice(0, 8)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  @Patch(':id')
  update(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: any) {
    return this.svc.update(u.id, id, dto);
  }

  @Delete(':id')
  cancel(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.cancel(u.id, id);
  }
}

// ── Verificação pública de autenticidade (via QR do PDF) ──────────────────────
@Controller('aso/verify')
export class AsoVerifyController {
  constructor(private readonly svc: AsoService) {}

  /** GET /api/v1/aso/verify/:token — valida a assinatura digital do ASO. */
  @Get(':token')
  verify(@Param('token') token: string) {
    return this.svc.verifyByToken(token);
  }
}
