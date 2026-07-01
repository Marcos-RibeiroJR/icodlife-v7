// apps/api/src/modules/company/company.controller.ts
import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('doutor/empresas')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('doctor')
export class CompanyController {
  constructor(private readonly svc: CompanyService) {}

  /** Enriquecimento por CNPJ (BrasilAPI) — não persiste */
  @Get('lookup/:cnpj')
  lookup(@Param('cnpj') cnpj: string) {
    return this.svc.lookupCnpj(cnpj);
  }

  @Get()
  list(
    @CurrentUser() u: any,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search: string,
  ) {
    return this.svc.list(u.id, +page || 1, +limit || 20, search);
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
  remove(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.remove(u.id, id);
  }
}
