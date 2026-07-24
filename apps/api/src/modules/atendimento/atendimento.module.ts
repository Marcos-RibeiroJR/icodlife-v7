// apps/api/src/modules/atendimento/atendimento.module.ts
import { Module } from '@nestjs/common';
import { ConsultationRequestsService } from './consultation-requests.service';
import { ConsultationRequestsController } from './consultation-requests.controller';
import { PublicIntakeController } from './public-intake.controller';
import { AtendimentoService } from './atendimento.service';
import { AtendimentoController } from './atendimento.controller';
import { MailerService } from '../../common/mailer/mailer.service';

@Module({
  controllers: [ConsultationRequestsController, PublicIntakeController, AtendimentoController],
  providers: [ConsultationRequestsService, AtendimentoService, MailerService],
  exports: [ConsultationRequestsService, AtendimentoService],
})
export class AtendimentoModule {}
