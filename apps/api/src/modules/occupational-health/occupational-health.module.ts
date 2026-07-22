// apps/api/src/modules/occupational-health/occupational-health.module.ts
import { Module } from '@nestjs/common';
import { OccupationalHealthService } from './occupational-health.service';
import { OccupationalHealthController } from './occupational-health.controller';
import { PsychosocialPdfService } from './psychosocial-pdf.service';

@Module({
  providers: [OccupationalHealthService, PsychosocialPdfService],
  controllers: [OccupationalHealthController],
  exports: [OccupationalHealthService],
})
export class OccupationalHealthModule {}
