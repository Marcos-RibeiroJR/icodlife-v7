import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
@Controller('appointments') @UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private svc: AppointmentsService) {}
  @Get() list(@CurrentUser() u: any) { return this.svc.list(u.id); }
  @Post() create(@CurrentUser() u: any, @Body() b: any) { return this.svc.create(u.id, b); }
  @Patch(':id') update(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.update(u.id, id, b); }
  @Delete(':id') remove(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.remove(u.id, id); }
}
