import { Module } from '@nestjs/common';
import { DoctorAnalyticsService } from './doctor-analytics.service';
import { DoctorAnalyticsController } from './doctor-analytics.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DoctorAnalyticsController],
  providers: [DoctorAnalyticsService],
  exports: [DoctorAnalyticsService],
})
export class DoctorAnalyticsModule {}
