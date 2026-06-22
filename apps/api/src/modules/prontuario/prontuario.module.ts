// apps/api/src/modules/prontuario/prontuario.module.ts
import { Module } from '@nestjs/common';
import { ProntuarioService } from './prontuario.service';
import { ProntuarioController, ProntuarioPublicController } from './prontuario.controller';

@Module({
  controllers: [ProntuarioController, ProntuarioPublicController],
  providers:   [ProntuarioService],
  exports:     [ProntuarioService],
})
export class ProntuarioModule {}
