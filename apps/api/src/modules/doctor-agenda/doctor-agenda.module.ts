// apps/api/src/modules/doctor-agenda/doctor-agenda.module.ts
import { Module }                  from '@nestjs/common';
import { DoctorAgendaService }     from './doctor-agenda.service';
import { DoctorAgendaController }  from './doctor-agenda.controller';
import { PrismaModule }            from '../../common/prisma/prisma.module';

@Module({
  imports:     [PrismaModule],
  controllers: [DoctorAgendaController],
  providers:   [DoctorAgendaService],
  exports:     [DoctorAgendaService],
})
export class DoctorAgendaModule {}
