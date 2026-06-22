// apps/api/src/modules/meus-medicos/meus-medicos.service.ts
import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AddDoctorDto } from './dto/add-doctor.dto';
import { UpdatePatientDoctorDto } from './dto/update-patient-doctor.dto';

@Injectable()
export class MeusMedicosService {
  constructor(private prisma: PrismaService) {}

  // ── Adicionar médico à lista do usuário ──────────────────────────────────
  async add(userId: string, dto: AddDoctorDto) {
    if (!dto.doctorId && !dto.externalCrm) {
      throw new BadRequestException('Informe o DoctorID ou o CRM externo do médico');
    }

    let doctorDbId: string | null = null;

    if (dto.doctorId) {
      // Busca médico interno pelo doctorId funcional (DR.XXXXX.UF)
      const doctor = await this.prisma.doctor.findFirst({
        where: {
          OR: [{ doctorId: dto.doctorId }, { id: dto.doctorId }],
        },
      });
      if (!doctor) throw new NotFoundException('Médico não encontrado no IcodLife');
      doctorDbId = doctor.id;

      // Verifica duplicata
      const existing = await this.prisma.patientDoctor.findUnique({
        where: { userId_doctorId: { userId, doctorId: doctorDbId } },
      });
      if (existing && existing.status !== 'ended') {
        throw new ConflictException('Médico já vinculado à sua conta');
      }
    }

    return this.prisma.patientDoctor.create({
      data: {
        userId,
        doctorId: doctorDbId,
        externalCrm: dto.doctorId ? undefined : dto.externalCrm,
        externalUf: dto.doctorId ? undefined : dto.externalUf?.toUpperCase(),
        externalName: dto.doctorId ? undefined : dto.externalName,
        specialty: dto.specialty,
        status: 'active',
        notes: dto.notes,
      },
      include: {
        doctor: {
          include: { user: { select: { fullName: true, avatarUrl: true } } },
        },
      },
    });
  }

  // ── Listar médicos do usuário ────────────────────────────────────────────
  async list(userId: string) {
    return this.prisma.patientDoctor.findMany({
      where: { userId },
      include: {
        doctor: {
          include: { user: { select: { fullName: true, avatarUrl: true } } },
        },
      },
      orderBy: { connectedAt: 'desc' },
    });
  }

  // ── Atualizar vínculo ────────────────────────────────────────────────────
  async update(userId: string, id: string, dto: UpdatePatientDoctorDto) {
    const record = await this.prisma.patientDoctor.findFirst({
      where: { id, userId },
    });
    if (!record) throw new NotFoundException('Vínculo não encontrado');

    return this.prisma.patientDoctor.update({
      where: { id },
      data: {
        ...(dto.status    !== undefined && {
          status: dto.status,
          endedAt: dto.status === 'ended' ? new Date() : null,
        }),
        ...(dto.specialty !== undefined && { specialty: dto.specialty }),
        ...(dto.notes     !== undefined && { notes: dto.notes }),
      },
      include: {
        doctor: {
          include: { user: { select: { fullName: true, avatarUrl: true } } },
        },
      },
    });
  }

  // ── Remover vínculo ──────────────────────────────────────────────────────
  async remove(userId: string, id: string) {
    const record = await this.prisma.patientDoctor.findFirst({
      where: { id, userId },
    });
    if (!record) throw new NotFoundException('Vínculo não encontrado');

    await this.prisma.patientDoctor.delete({ where: { id } });
    return { message: 'Médico removido da sua lista' };
  }
}
