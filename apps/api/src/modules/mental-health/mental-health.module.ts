// apps/api/src/modules/mental-health/mental-health.module.ts
import { Module } from '@nestjs/common';
import { MentalHealthService } from './mental-health.service';
import { MentalHealthController } from './mental-health.controller';
import { SafetyService } from './safety.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [MentalHealthService, SafetyService],
  controllers: [MentalHealthController],
})
export class MentalHealthModule {}
