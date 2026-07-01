// apps/api/src/modules/notifications/notifications.module.ts
import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationsController } from './notifications.controller';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { PushModule } from '../push/push.module';

@Module({
  imports:     [PushModule],
  controllers: [NotificationsController],
  providers:   [NotificationService, NotificationSchedulerService],
  exports:     [NotificationService],
})
export class NotificationsModule {}
