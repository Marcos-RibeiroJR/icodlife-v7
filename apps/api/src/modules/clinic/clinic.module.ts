// apps/api/src/modules/clinic/clinic.module.ts
import { Module } from '@nestjs/common';
import { ClinicService } from './clinic.service';
import { BecomeClinicAdminController, ClinicPanelController } from './clinic.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { CompanyModule } from '../company/company.module';

@Module({
  imports: [PrismaModule, CompanyModule],
  controllers: [BecomeClinicAdminController, ClinicPanelController],
  providers: [ClinicService],
  exports: [ClinicService],
})
export class ClinicModule {}
