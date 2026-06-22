// apps/api/src/modules/blood-pressure/blood-pressure.module.ts
import { Module } from '@nestjs/common';
import { BloodPressureController } from './blood-pressure.controller';
import { BloodPressureService } from './blood-pressure.service';

@Module({
  controllers: [BloodPressureController],
  providers: [BloodPressureService],
  exports: [BloodPressureService],
})
export class BloodPressureModule {}
