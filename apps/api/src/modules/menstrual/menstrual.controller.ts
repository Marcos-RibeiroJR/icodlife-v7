import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { MenstrualService } from './menstrual.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
@Controller('menstrual')
@UseGuards(JwtAuthGuard)
export class MenstrualController {
  constructor(private svc: MenstrualService) {}
  @Post('cycles')    startCycle(@CurrentUser() u: any, @Body() b: any) { return this.svc.startCycle(u.id, b); }
  @Get('cycles')     getCycles(@CurrentUser() u: any) { return this.svc['prisma'].menstrualCycle.findMany({ where: { userId: u.id }, orderBy: { cycleStart: 'desc' } }); }
  @Post('daily-log') logDay(@CurrentUser() u: any, @Body() b: any) { return this.svc.logDay(u.id, b); }
  @Get('stats')      getStats(@CurrentUser() u: any) { return this.svc.getStats(u.id); }
  @Get('calendar')   getCalendar(@CurrentUser() u: any) { return this.svc.getCalendar(u.id); }
}
