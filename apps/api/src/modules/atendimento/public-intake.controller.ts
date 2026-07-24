// apps/api/src/modules/atendimento/public-intake.controller.ts
// Formulário público (sem login) que a empresa cliente usa para enviar uma
// solicitação de exame/consulta — link tokenizado por empresa
// (substitui o envio por e-mail informal, sem depender de parsing de e-mail).
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ConsultationRequestsService } from './consultation-requests.service';

@Controller('public/intake')
export class PublicIntakeController {
  constructor(private svc: ConsultationRequestsService) {}

  @Get(':token')
  getCompany(@Param('token') token: string) {
    return this.svc.getCompanyByToken(token);
  }

  @Post(':token')
  submit(@Param('token') token: string, @Body() dto: any) {
    return this.svc.submitPublicRequest(token, dto);
  }
}
