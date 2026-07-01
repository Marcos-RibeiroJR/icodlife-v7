// apps/api/src/modules/aso/aso.controller.ts
import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AsoService } from './aso.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('doutor/aso')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('doctor')
export class AsoController {
  constructor(private readonly svc: AsoService) {}

  /** Dados do médico para preencher o cabeçalho do ASO */
  @Get('context')
  context(@CurrentUser() u: any) {
    return this.svc.getContext(u.id);
  }

  @Get()
  list(
    @CurrentUser() u: any,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('worker') worker: string,
  ) {
    return this.svc.list(u.id, +page || 1, +limit || 20, worker);
  }

  @Post()
  create(@CurrentUser() u: any, @Body() dto: any) {
    return this.svc.create(u.id, dto);
  }

  @Get(':id')
  get(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.get(u.id, id);
  }

  @Patch(':id')
  update(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: any) {
    return this.svc.update(u.id, id, dto);
  }

  @Delete(':id')
  cancel(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.cancel(u.id, id);
  }
}
