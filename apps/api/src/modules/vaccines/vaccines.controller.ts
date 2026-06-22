// apps/api/src/modules/vaccines/vaccines.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { VaccinesService, CreateVaccinationDto, UpdateVaccinationDto } from './vaccines.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

// Catálogo público — sem autenticação
@Controller('vaccines')
export class VaccinesCatalogController {
  constructor(private svc: VaccinesService) {}

  @Get()
  catalog() { return this.svc.getCatalog(); }
}

// Registros do usuário — requer JWT
@Controller('vaccinations')
@UseGuards(JwtAuthGuard)
export class VaccinationsController {
  constructor(private svc: VaccinesService) {}

  @Get()
  list(@Request() req: any) {
    return this.svc.list(req.user.userId);
  }

  @Get('summary')
  summary(@Request() req: any) {
    return this.svc.getSummary(req.user.userId);
  }

  @Post()
  create(@Request() req: any, @Body() dto: CreateVaccinationDto) {
    return this.svc.create(req.user.userId, dto);
  }

  @Patch(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateVaccinationDto) {
    return this.svc.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.svc.remove(req.user.userId, id);
  }
}
