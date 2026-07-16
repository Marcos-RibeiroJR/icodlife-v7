// apps/api/src/modules/lifestyle/lifestyle.controller.ts
import { Controller, Get, Post, Body, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LifestyleService } from './lifestyle.service';

@UseGuards(JwtAuthGuard)
@Controller('lifestyle')
export class LifestyleController {
  constructor(private svc: LifestyleService) {}

  @Post()
  upsert(@Request() req: any, @Body() dto: any) {
    return this.svc.upsert(req.user.userId, dto);
  }

  @Get()
  get(@Request() req: any) {
    return this.svc.get(req.user.userId);
  }

  @Get('history')
  history(@Request() req: any) {
    return this.svc.history(req.user.userId);
  }

  @Get('regional/:state')
  regional(@Param('state') state: string) {
    return this.svc.regionalStats(state.toUpperCase());
  }
}
