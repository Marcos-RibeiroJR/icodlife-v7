// apps/api/src/modules/doctor-staff/doctor-staff.controller.ts
import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards,
} from '@nestjs/common';
import { DoctorStaffService } from './doctor-staff.service';
import { JwtAuthGuard }       from '../../common/guards/jwt-auth.guard';
import { RolesGuard }         from '../../common/guards/roles.guard';
import { Roles }              from '../../common/decorators/roles.decorator';
import { CurrentUser }        from '../../common/decorators/current-user.decorator';

@Controller('doutor/staff')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('doctor')
export class DoctorStaffController {
  constructor(private readonly svc: DoctorStaffService) {}

  @Get()
  list(@CurrentUser() u: any) { return this.svc.listStaff(u.id); }

  @Post()
  add(@CurrentUser() u: any, @Body() dto: any) { return this.svc.addStaff(u.id, dto); }

  @Patch(':id')
  update(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: any) {
    return this.svc.updateStaff(u.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.removeStaff(u.id, id); }
}
