// apps/api/src/modules/exam-results/exam-results.controller.ts
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ExamResultsService } from './exam-results.service';
import { TrendReportService } from './trend-report.service';
import { CreateExamResultDto } from './dto/create-exam-result.dto';

@UseGuards(JwtAuthGuard)
@Controller('exam-results')
export class ExamResultsController {
  constructor(
    private svc: ExamResultsService,
    private trendSvc: TrendReportService,
  ) {}

  @Post()
  create(@CurrentUser() u: any, @Body() dto: CreateExamResultDto) {
    return this.svc.create(u.id, dto);
  }

  @Get()
  list(@CurrentUser() u: any) {
    return this.svc.list(u.id);
  }

  @Get('summary')
  summary(@CurrentUser() u: any) {
    return this.svc.healthSummary(u.id);
  }

  @Get('trend-report')
  trendReport(@CurrentUser() u: any, @Query('months') months?: string) {
    return this.trendSvc.generate(u.id, months ? Number(months) : 6);
  }

  @Get('markers')
  markers(@CurrentUser() u: any) {
    return this.svc.availableMarkers(u.id);
  }

  @Get('timeline')
  timeline(
    @CurrentUser() u: any,
    @Query('marker') marker: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.timeline(u.id, marker, from, to);
  }

  @Get(':id')
  get(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.get(u.id, id);
  }
}
