// apps/api/src/modules/body-metrics/body-metrics.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { BodyMetricsService, CreateBodyMetricDto, UpdateBodyMetricDto } from './body-metrics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('body-metrics')
@UseGuards(JwtAuthGuard)
export class BodyMetricsController {
  constructor(private svc: BodyMetricsService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateBodyMetricDto) {
    return this.svc.create(req.user.userId, dto);
  }

  @Get()
  list(
    @Request() req: any,
    @Query('page')  page?:  string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.findAll(req.user.userId, page ? Number(page) : 1, limit ? Number(limit) : 20);
  }

  @Get('latest')
  latest(@Request() req: any) {
    return this.svc.getLatest(req.user.userId);
  }

  @Get('stats')
  stats(@Request() req: any) {
    return this.svc.getStats(req.user.userId);
  }

  @Patch(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateBodyMetricDto) {
    return this.svc.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.svc.delete(req.user.userId, id);
  }
}
