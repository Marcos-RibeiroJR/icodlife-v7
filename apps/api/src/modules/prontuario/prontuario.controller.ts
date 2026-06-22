// apps/api/src/modules/prontuario/prontuario.controller.ts
import {
  Controller, Post, Get, Delete, Body, Param, UseGuards, Request, Ip, Query,
} from '@nestjs/common';
import { ProntuarioService, CreateShareDto } from './prontuario.service';
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

// ── Rota pública (médico lê o prontuário) ────────────────────────────────────
@Controller('prontuario/public')
export class ProntuarioPublicController {
  constructor(private svc: ProntuarioService) {}

  @Get(':token')
  read(
    @Param('token') token: string,
    @Query('name') name: string,
    @Ip() ip: string,
  ) {
    return this.svc.readByToken(token, name, ip);
  }
}
