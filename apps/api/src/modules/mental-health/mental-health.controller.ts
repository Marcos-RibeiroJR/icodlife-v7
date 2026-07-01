// apps/api/src/modules/mental-health/mental-health.controller.ts
import {
  Body, Controller, Get, Param, Post, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MentalHealthService } from './mental-health.service';
import { CreateMentalHealthAssessmentDto, ReviewAssessmentDto } from './dto/create-assessment.dto';

@Controller('mental-health')
@UseGuards(JwtAuthGuard)
export class MentalHealthController {
  constructor(private svc: MentalHealthService) {}

  // ── Catálogo ──────────────────────────────────────────────
  /** Lista as escalas disponíveis (livres) e o agrupamento por categoria */
  @Get('scales')
  listScales() {
    return this.svc.listScales();
  }

  /** Questionário de uma escala para montar o formulário */
  @Get('scales/:code')
  questionnaire(@Param('code') code: string) {
    return this.svc.getQuestionnaire(code);
  }

  // ── Avaliações ────────────────────────────────────────────
  /** Histórico de avaliações do usuário (filtro opcional por escala) */
  @Get('assessments')
  list(@CurrentUser() u: any, @Query('scale') scale?: string) {
    return this.svc.list(u.id, scale);
  }

  /** Laudo consolidado (centralizado) — última aplicação de cada escala */
  @Get('assessments/consolidated')
  consolidated(@CurrentUser() u: any) {
    return this.svc.consolidated(u.id);
  }

  /** Gera e ARMAZENA o laudo consolidado no prontuário */
  @Post('assessments/consolidated')
  saveConsolidated(@CurrentUser() u: any) {
    return this.svc.consolidated(u.id, true);
  }

  /** Busca uma avaliação individual (com laudo completo) */
  @Get('assessments/:id')
  get(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.get(u.id, id);
  }

  /** Envia respostas de uma escala → gera laudo e persiste no prontuário */
  @Post('assessments/:code')
  create(
    @CurrentUser() u: any,
    @Param('code') code: string,
    @Body() dto: CreateMentalHealthAssessmentDto,
  ) {
    return this.svc.create(u.id, code, dto);
  }

  // ── Visão do médico ───────────────────────────────────────
  /** Médico vinculado consulta as avaliações de um paciente */
  @Get('patients/:userId/assessments')
  patientAssessments(@CurrentUser() u: any, @Param('userId') userId: string) {
    return this.svc.getPatientAssessments(u.id, userId);
  }

  /** Médico revisa/valida um laudo */
  @Post('assessments/:id/review')
  review(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: ReviewAssessmentDto) {
    return this.svc.review(u.id, id, dto);
  }
}
