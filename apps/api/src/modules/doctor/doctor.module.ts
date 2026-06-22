// apps/api/src/modules/doctor/doctor.module.ts
import { Module } from '@nestjs/common';
import { DoctorService } from './doctor.service';
import {
  DoctorsPublicController,
  BecomeDoctorController,
  DoctorPanelController,
} from './doctor.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DoctorsPublicController, BecomeDoctorController, DoctorPanelController],
  providers: [DoctorService],
  exports: [DoctorService],
})
export class DoctorModule {}
