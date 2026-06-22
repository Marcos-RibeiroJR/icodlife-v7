// apps/api/src/modules/lifestyle/lifestyle.controller.ts
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LifestyleService } from './lifestyle.service';
import { UpsertLifestyleDto } from './dto/upsert-lifestyle.dto';

@UseGuards(JwtAuthGuard)
@Controller('lifestyle')
export class LifestyleController {
  constructor(private svc: LifestyleService) {}

  @Post()
  upsert(@CurrentUser() u: any, @Body() dto: UpsertLifestyleDto) {
    return this.svc.upsert(u.id, dto);
  }

  @Get()
  get(@CurrentUser() u: any) {
    return this.svc.get(u.id);
  }

  @Get('history')
  history(@CurrentUser() u: any) {
    return this.svc.history(u.id);
  }

  @Get('regional/:state')
  regional(@Param('state') state: string) {
    return this.svc.regionalStats(state.toUpperCase());
  }
}
