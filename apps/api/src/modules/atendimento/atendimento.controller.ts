// apps/api/src/modules/atendimento/atendimento.controller.ts
// Módulo "Atendimento": guichês, fila, início/fim de atendimento e produtividade.
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AtendimentoService } from './atendimento.service';

@Controller('clinic/atendimento')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('clinic_admin')
export class AtendimentoController {
  constructor(private svc: AtendimentoService) {}

  // ── Guichês ──────────────────────────────────────────────────────────────
  @Post('guiches')
  createCounter(@CurrentUser() user: any, @Body() dto: { label: string; staffId?: string }) {
    return this.svc.createCounter(user.id, dto);
  }

  @Get('guiches')
  listCounters(@CurrentUser() user: any) {
    return this.svc.listCounters(user.id);
  }

  @Patch('guiches/:id')
  updateCounter(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: any) {
    return this.svc.updateCounter(user.id, id, dto);
  }

  // ── Fila ─────────────────────────────────────────────────────────────────
  @Get('fila')
  queue(@CurrentUser() user: any) {
    return this.svc.listQueue(user.id);
  }

  // ── Sessões (início/fim de atendimento) ────────────────────────────────
  @Post('sessions')
  startSession(@CurrentUser() user: any, @Body() dto: { counterId: string; consultationRequestId?: string }) {
    return this.svc.startSession(user.id, dto);
  }

  @Patch('sessions/:id/end')
  endSession(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: any) {
    return this.svc.endSession(user.id, id, dto);
  }

  @Get('sessions/ativas')
  activeSessions(@CurrentUser() user: any) {
    return this.svc.listActiveSessions(user.id);
  }

  // ── Produtividade ───────────────────────────────────────────────────────
  @Get('produtividade')
  productivity(@CurrentUser() user: any, @Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.productivity(user.id, from, to);
  }
}
