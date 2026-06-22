// apps/api/src/modules/ophthalmology/ophthalmology.controller.ts
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OphthalmologyService } from './ophthalmology.service';
import { CreateOphthalmologyExamDto, UpdateConsultHistoryDto } from './dto/create-exam.dto';

@Controller('ophthalmology')
@UseGuards(JwtAuthGuard)
export class OphthalmologyController {
  constructor(private svc: OphthalmologyService) {}

  /** Lista todos os auto-exames do usuário */
  @Get('exams')
  list(@CurrentUser() u: any) {
    return this.svc.list(u.id);
  }

  /** Busca um exame específico */
  @Get('exams/:id')
  get(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.get(u.id, id);
  }

  /** Salva resultado completo do auto-exame de triagem */
  @Post('exams')
  create(@CurrentUser() u: any, @Body() dto: CreateOphthalmologyExamDto) {
    return this.svc.create(u.id, dto);
  }

  /** Lista histórico de consultas reais */
  @Get('history')
  getHistory(@CurrentUser() u: any) {
    return this.svc.getHistory(u.id);
  }

  /** Registra resultado de consulta real com oftalmologista */
  @Post('history')
  createHistory(@CurrentUser() u: any, @Body() dto: UpdateConsultHistoryDto) {
    return this.svc.createHistory(u.id, dto);
  }
}
