// apps/api/src/modules/prontuario/prontuario.controller.ts
import {
  Controller, Post, Get, Delete, Body, Param, UseGuards, Request, Ip, Query,
} from '@nestjs/common';
import { ProntuarioService, CreateShareDto } from './prontuario.service';
import { verifyDocumentToken } from '../export/export.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

// ── Rotas autenticadas (paciente) ────────────────────────────────────────────
@Controller('prontuario')
@UseGuards(JwtAuthGuard)
export class ProntuarioController {
  constructor(private svc: ProntuarioService) {}

  @Post('share')
  create(@Request() req: any, @Body() dto: CreateShareDto) {
    return this.svc.createShare(req.user.userId, dto);
  }

  @Get('share')
  list(@Request() req: any) {
    return this.svc.listMyShares(req.user.userId);
  }

  @Delete('share/:id')
  revoke(@Request() req: any, @Param('id') id: string) {
    return this.svc.revokeShare(req.user.userId, id);
  }
}

// ── Rotas públicas ────────────────────────────────────────────────────────────
@Controller('prontuario/public')
export class ProntuarioPublicController {
  constructor(private svc: ProntuarioService) {}

  /** Lê o prontuário pelo share token (nível básico/médio/completo) */
  @Get(':token')
  read(
    @Param('token') token: string,
    @Query('name') name: string,
    @Ip() ip: string,
  ) {
    return this.svc.readByToken(token, name, ip);
  }
}

// ── Verificação de assinatura digital (público) ───────────────────────────────
@Controller('prontuario/verify')
export class ProntuarioVerifyController {
  /**
   * GET /api/v1/prontuario/verify/:token
   * Verifica a autenticidade de um prontuário PDF gerado pela plataforma.
   * Retornado como JSON para leitura programática e HTML para acesso via browser/QR.
   */
  @Get(':token')
  verify(@Param('token') token: string) {
    const result = verifyDocumentToken(token);

    if (!result.valid) {
      return {
        valid:    false,
        reason:   result.reason,
        platform: 'IcodLife Digital Health',
        checkedAt: new Date().toISOString(),
      };
    }

    return {
      valid:     true,
      platform:  'IcodLife Digital Health',
      document:  'Prontuário Médico Digital',
      patient:   result.name,
      issuedAt:  result.issuedAt,
      expiresAt: result.expiresAt,
      checkedAt: new Date().toISOString(),
      message:   '✅ Documento autêntico. Assinatura digital válida.',
    };
  }
}
