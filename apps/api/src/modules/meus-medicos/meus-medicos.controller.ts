// apps/api/src/modules/meus-medicos/meus-medicos.controller.ts
import {
  Controller, Post, Get, Patch, Delete,
  Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { MeusMedicosService } from './meus-medicos.service';
import { AddDoctorDto } from './dto/add-doctor.dto';
import { UpdatePatientDoctorDto } from './dto/update-patient-doctor.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('meus-medicos')
@UseGuards(JwtAuthGuard)
export class MeusMedicosController {
  constructor(private readonly service: MeusMedicosService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  add(@CurrentUser() user: any, @Body() dto: AddDoctorDto) {
    return this.service.add(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: any) {
    return this.service.list(user.id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdatePatientDoctorDto,
  ) {
    return this.service.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.remove(user.id, id);
  }
}
