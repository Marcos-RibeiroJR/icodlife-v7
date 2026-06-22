import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { MedicationsService } from './medications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
@Controller('medications') @UseGuards(JwtAuthGuard)
export class MedicationsController {
  constructor(private svc: MedicationsService) {}
  @Get() list(@CurrentUser() u: any) { return this.svc.list(u.id); }
  @Post() create(@CurrentUser() u: any, @Body() b: any) { return this.svc.create(u.id, b); }
  @Patch(':id') update(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.update(u.id, id, b); }
  @Delete(':id') remove(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.remove(u.id, id); }
  @Post(':id/log') log(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.logTaken(id, u.id, b); }
  @Get(':id/adherence') adherence(@Param('id') id: string) { return this.svc.getAdherence(id); }
}
