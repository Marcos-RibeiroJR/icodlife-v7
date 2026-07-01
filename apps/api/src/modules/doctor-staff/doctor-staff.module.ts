import { Module }               from '@nestjs/common';
import { DoctorStaffService }   from './doctor-staff.service';
import { DoctorStaffController } from './doctor-staff.controller';
import { PrismaModule }         from '../../common/prisma/prisma.module';

@Module({
  imports:     [PrismaModule],
  controllers: [DoctorStaffController],
  providers:   [DoctorStaffService],
  exports:     [DoctorStaffService],
})
export class DoctorStaffModule {}
