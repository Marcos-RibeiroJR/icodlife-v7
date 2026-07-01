import { Module }                     from '@nestjs/common';
import { DoctorFinanceiroService }    from './doctor-financeiro.service';
import { DoctorFinanceiroController } from './doctor-financeiro.controller';
import { PrismaModule }               from '../../common/prisma/prisma.module';

@Module({
  imports:     [PrismaModule],
  controllers: [DoctorFinanceiroController],
  providers:   [DoctorFinanceiroService],
  exports:     [DoctorFinanceiroService],
})
export class DoctorFinanceiroModule {}
