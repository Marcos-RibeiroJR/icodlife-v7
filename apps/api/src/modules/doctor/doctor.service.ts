// apps/api/src/modules/doctor/doctor.service.ts
import {
  Injectable, ConflictException, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BecomeDoctorDto } from './dto/become-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { SearchDoctorsDto } from './dto/search-doctors.dto';

@Injectable()
export class DoctorService {
  constructor(private prisma: PrismaService) {}

  // ── Gera DoctorID sequencial por UF: DR.00001.SP ─────────────────────────
  private async generateDoctorId(uf: string): Promise<string> {
    // upsert retorna o valor APÓS o increment; create inicia em 2 (primeiro uso = 2-1 = 1)
    const counter = await this.prisma.doctorCounter.upsert({
      where: { uf },
      update: { nextValue: { increment: 1 } },
      create: { uf, nextValue: 2 },
    });
    const num = (counter.nextValue - 1).toString().padStart(5, '0');
    return `DR.${num}.${uf}`;
  }

  // ── Ativar perfil de doutor em conta existente ────────────────────────────
  async becomeDoctor(userId: string, dto: BecomeDoctorDto) {
    const existing = await this.prisma.doctor.findUnique({ where: { userId } });
    if (existing) throw new ConflictException('Este usuário já possui perfil de doutor');

    // Verifica CRM duplicado no mesmo UF
    const crmExists = await this.prisma.doctor.findFirst({
      where: { crm: dto.crm, uf: dto.uf.toUpperCase() },
    });
    if (crmExists) throw new ConflictException('CRM já cadastrado para este estado');

    const uf = dto.uf.toUpperCase();
    const doctorId = await this.generateDoctorId(uf);

    const [doctor] = await this.prisma.$transaction([
      this.prisma.doctor.create({
        data: {
          userId,
          doctorId,
          crm: dto.crm,
          uf,
          crmStatus: 'pending',
          specialties: dto.specialties,
          healthPlans: dto.healthPlans ?? [],
          bio: dto.bio,
          consultPrice: dto.consultPrice,
          addressCity: dto.addressCity,
          addressState: dto.addressState ?? uf,
          phone: dto.phone,
          website: dto.website,
        },
        include: { user: { select: { email: true, fullName: true, icode: true } } },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { role: 'doctor' },
      }),
    ]);

    return {
      message: 'Perfil de doutor criado com sucesso. CRM em validação manual.',
      doctorId: doctor.doctorId,
      crmStatus: doctor.crmStatus,
      doctor,
    };
  }

  // ── Perfil do doutor autenticado ─────────────────────────────────────────
  async getMyProfile(userId: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { userId },
      include: {
        user: { select: { email: true, fullName: true, avatarUrl: true, icode: true } },
        _count: { select: { patients: true } },
      },
    });
    if (!doctor) throw new NotFoundException('Perfil de doutor não encontrado');
    return doctor;
  }

  // ── Atualizar perfil ──────────────────────────────────────────────────────
  async updateProfile(userId: string, dto: UpdateDoctorDto) {
    const doctor = await this.prisma.doctor.findUnique({ where: { userId } });
    if (!doctor) throw new NotFoundException('Perfil de doutor não encontrado');

    return this.prisma.doctor.update({
      where: { userId },
      data: {
        ...(dto.specialties   !== undefined && { specialties: dto.specialties }),
        ...(dto.healthPlans   !== undefined && { healthPlans: dto.healthPlans }),
        ...(dto.bio           !== undefined && { bio: dto.bio }),
        ...(dto.consultPrice  !== undefined && { consultPrice: dto.consultPrice }),
        ...(dto.addressCity   !== undefined && { addressCity: dto.addressCity }),
        ...(dto.addressState  !== undefined && { addressState: dto.addressState }),
        ...(dto.phone         !== undefined && { phone: dto.phone }),
        ...(dto.website       !== undefined && { website: dto.website }),
      },
    });
  }

  // ── Lista de pacientes conectados ao doutor ───────────────────────────────
  async getPatients(userId: string) {
    const doctor = await this.prisma.doctor.findUnique({ where: { userId } });
    if (!doctor) throw new NotFoundException('Perfil de doutor não encontrado');

    return this.prisma.patientDoctor.findMany({
      where: { doctorId: doctor.id, status: 'active' },
      include: {
        user: {
          select: {
            id: true, fullName: true, email: true,
            avatarUrl: true, icode: true,
            dateOfBirth: true, gender: true, bloodType: true,
            allergies: true, chronicConditions: true,
          },
        },
      },
      orderBy: { connectedAt: 'desc' },
    });
  }

  // ── Busca pública de médicos ──────────────────────────────────────────────
  async search(dto: SearchDoctorsDto) {
    const { specialty, uf, healthPlan, name, page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;

    const where: any = { crmStatus: { not: 'canceled' } };

    if (uf)        where.uf = uf.toUpperCase();
    if (specialty) where.specialties = { has: specialty };
    if (healthPlan) where.healthPlans = { has: healthPlan };
    if (name) {
      where.user = { fullName: { contains: name, mode: 'insensitive' } };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.doctor.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: { select: { fullName: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.doctor.count({ where }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  // ── Perfil público de um médico ───────────────────────────────────────────
  async getPublicProfile(doctorId: string) {
    const doctor = await this.prisma.doctor.findFirst({
      where: {
        OR: [{ id: doctorId }, { doctorId }],
        crmStatus: { not: 'canceled' },
      },
      include: {
        user: { select: { fullName: true, avatarUrl: true } },
        _count: { select: { patients: true } },
      },
    });
    if (!doctor) throw new NotFoundException('Médico não encontrado');
    return doctor;
  }

  // ── Lista de especialidades disponíveis ──────────────────────────────────
  async listSpecialties() {
    const doctors = await this.prisma.doctor.findMany({
      where: { crmStatus: { not: 'canceled' } },
      select: { specialties: true },
    });
    const all = doctors.flatMap(d => d.specialties);
    const unique = [...new Set(all)].sort();
    return unique;
  }
}
