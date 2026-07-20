// apps/api/src/modules/exam-results/exam-results.module.ts
import { Module } from '@nestjs/common';
import { ExamResultsController } from './exam-results.controller';
import { ExamResultsService } from './exam-results.service';
import { TrendReportService } from './trend-report.service';
import { LifestyleModule } from '../lifestyle/lifestyle.module';

@Module({
  imports: [LifestyleModule],
  controllers: [ExamResultsController],
  providers: [ExamResultsService, TrendReportService],
  exports: [ExamResultsService, TrendReportService],
})
export class ExamResultsModule {}
