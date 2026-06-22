// apps/api/src/modules/doctor/doctor.controller.ts
import {
  Controller, Post, Get, Patch, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { DoctorService } from './doctor.service';
import { BecomeDoctorDto } from './dto/become-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { SearchDoctorsDto } from './dto/search-doctors.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

// ── Rotas públicas de busca ───────────────────────────────────────────────────
@Controller('doctors')
export class DoctorsPublicController {
  constructor(private readonly doctorService: DoctorService) {}

  @Get()
  search(@Query() dto: SearchDoctorsDto) {
    return this.doctorService.search(dto);
  }

  @Get('specialties')
  listSpecialties() {
    return this.doctorService.listSpecialties();
  }

  @Get(':id')
  getPublicProfile(@Param('id') id: string) {
    return this.doctorService.getPublicProfile(id);
  }
}

// ── Rota para ativar perfil doutor ───────────────────────────────────────────
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class BecomeDoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  @Post('become-doctor')
  @HttpCode(HttpStatus.CREATED)
  becomeDoctor(@CurrentUser() user: any, @Body() dto: BecomeDoctorDto) {
    return this.doctorService.becomeDoctor(user.id, dto);
  }
}

// ── Painel do Doutor (role=doctor obrigatório) ────────────────────────────────
@Controller('doutor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('doctor')
export class DoctorPanelController {
  constructor(private readonly doctorService: DoctorService) {}

  @Get('me')
  getMyProfile(@CurrentUser() user: any) {
    return this.doctorService.getMyProfile(user.id);
  }

  @Patch('profile')
  updateProfile(@CurrentUser() user: any, @Body() dto: UpdateDoctorDto) {
    return this.doctorService.updateProfile(user.id, dto);
  }

  @Get('patients')
  getPatients(@CurrentUser() user: any) {
    return this.doctorService.getPatients(user.id);
  }
}
