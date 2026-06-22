// apps/api/src/modules/meus-medicos/meus-medicos.module.ts
import { Module } from '@nestjs/common';
import { MeusMedicosService } from './meus-medicos.service';
import { MeusMedicosController } from './meus-medicos.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MeusMedicosController],
  providers: [MeusMedicosService],
})
export class MeusMedicosModule {}
