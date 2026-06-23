// apps/api/src/modules/body-metrics/body-metrics.module.ts
import { Module } from '@nestjs/common';
import { BodyMetricsService } from './body-metrics.service';
import { BodyMetricsController } from './body-metrics.controller';

@Module({
  controllers: [BodyMetricsController],
  providers:   [BodyMetricsService],
  exports:     [BodyMetricsService],
})
export class BodyMetricsModule {}
