import { Module }                         from '@nestjs/common';
import { DoctorPrescriptionsService }    from './doctor-prescriptions.service';
import { DoctorPrescriptionsController } from './doctor-prescriptions.controller';
import { PrismaModule }                  from '../../common/prisma/prisma.module';

@Module({
  imports:     [PrismaModule],
  controllers: [DoctorPrescriptionsController],
  providers:   [DoctorPrescriptionsService],
  exports:     [DoctorPrescriptionsService],
})
export class DoctorPrescriptionsModule {}
