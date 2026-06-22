// apps/api/src/modules/appointments/appointments.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AppointmentsService, CreateAppointmentDto, UpdateAppointmentDto } from './appointments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private svc: AppointmentsService) {}

  @Get()
  list(@Request() req: any) { return this.svc.list(req.user.userId); }

  @Get('upcoming')
  upcoming(@Request() req: any, @Query('limit') limit?: string) {
    return this.svc.getUpcoming(req.user.userId, limit ? Number(limit) : 5);
  }

  @Get('summary')
  summary(@Request() req: any) { return this.svc.getSummary(req.user.userId); }

  @Get('calendar')
  calendar(
    @Request() req: any,
    @Query('year')  year:  string,
    @Query('month') month: string,
  ) {
    const y = year  ? Number(year)  : new Date().getFullYear();
    const m = month ? Number(month) : new Date().getMonth() + 1;
    return this.svc.getByMonth(req.user.userId, y, m);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.svc.findOne(req.user.userId, id);
  }

  @Post()
  create(@Request() req: any, @Body() dto: CreateAppointmentDto) {
    return this.svc.create(req.user.userId, dto);
  }

  @Patch(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateAppointmentDto) {
    return this.svc.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.svc.remove(req.user.userId, id);
  }
}
