// apps/api/src/modules/occupational-health/occupational-health.controller.ts
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OccupationalHealthService } from './occupational-health.service';
import { CreatePsychosocialAssessmentDto } from './dto/create-assessment.dto';

@Controller('occupational-health')
@UseGuards(JwtAuthGuard)
export class OccupationalHealthController {
  constructor(private svc: OccupationalHealthService) {}

  /** Retorna o banco de perguntas (54 itens / 9 dimensões NR-01) para montar o formulário */
  @Get('psychosocial/questionnaire')
  getQuestionnaire() {
    return this.svc.getQuestionnaire();
  }

  /** Lista as avaliações já realizadas pelo usuário */
  @Get('psychosocial/assessments')
  list(@CurrentUser() u: any) {
    return this.svc.list(u.id);
  }

  /** Busca uma avaliação (com laudo completo) */
  @Get('psychosocial/assessments/:id')
  get(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.get(u.id, id);
  }

  /** Envia as respostas do questionário e recebe o laudo de risco psicossocial */
  @Post('psychosocial/assessments')
  create(@CurrentUser() u: any, @Body() dto: CreatePsychosocialAssessmentDto) {
    return this.svc.create(u.id, dto);
  }
}
