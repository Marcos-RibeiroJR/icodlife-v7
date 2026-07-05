// apps/api/src/modules/aso/aso.module.ts
import { Module } from '@nestjs/common';
import { AsoService } from './aso.service';
import { AsoController, AsoVerifyController } from './aso.controller';
import { AsoPdfService } from './aso-pdf.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AsoController, AsoVerifyController],
  providers: [AsoService, AsoPdfService],
  exports: [AsoService],
})
export class AsoModule {}
