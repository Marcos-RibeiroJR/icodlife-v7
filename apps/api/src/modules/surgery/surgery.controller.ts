// apps/api/src/modules/surgery/surgery.controller.ts
import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, Request,
} from '@nestjs/common';
import { SurgeryService, CreateSurgeryDto, UpdateSurgeryDto } from './surgery.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('surgery')
@UseGuards(JwtAuthGuard)
export class SurgeryController {
  constructor(private svc: SurgeryService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateSurgeryDto) {
    return this.svc.create(req.user.userId, dto);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.svc.findAll(req.user.userId);
  }

  @Get('summary')
  summary(@Request() req: any) {
    return this.svc.getSummary(req.user.userId);
  }

  @Get('family')
  family(@Request() req: any) {
    return this.svc.findFamilySurgeries(req.user.userId);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.svc.findOne(req.user.userId, id);
  }

  @Patch(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateSurgeryDto) {
    return this.svc.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.svc.remove(req.user.userId, id);
  }
}
