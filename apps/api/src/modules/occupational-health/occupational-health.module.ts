// apps/api/src/modules/occupational-health/occupational-health.module.ts
import { Module } from '@nestjs/common';
import { OccupationalHealthService } from './occupational-health.service';
import { OccupationalHealthController } from './occupational-health.controller';

@Module({
  providers: [OccupationalHealthService],
  controllers: [OccupationalHealthController],
})
export class OccupationalHealthModule {}
