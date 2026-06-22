import { Module } from '@nestjs/common';
import { FamilyService } from './family.service';
import { FamilyController } from './family.controller';
import { NotificationsModule } from '../notifications/notifications.module';
@Module({ imports: [NotificationsModule], providers: [FamilyService], controllers: [FamilyController] })
export class FamilyModule {}
