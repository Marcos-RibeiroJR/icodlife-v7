// apps/api/src/modules/clinic/clinic.service.ts
import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateClinicDto } from './dto/create-clinic.dto';
import { UpdateClinicDto } from './dto/update-clinic.dto';
import { LinkDoctorDto } from './dto/link-doctor.dto';
import { AddClinicStaffDto } from './dto/clinic-staff.dto';
import { ClinicProcedureDto } from './dto/clinic-procedure.dto';
import { ClinicRoomDto } from './dto/clinic-room.dto';

@Injectable()
export class ClinicService {
  constructor(private prisma: PrismaService) {}

  // ── Gera clinicCode sequencial por UF: CL.00001.SP ───────────────────────
  private async generateClinicCode(uf: string): Promise<string> {
    const counter = await this.prisma.clinicCounter.upsert({
      where: { uf },
      update: { nextValue: { increment: 1 } },
      create: { uf, nextValue: 2 },
    });
    const num = (counter.nextValue - 1).toString().padStart(5, '0');
    return `CL.${num}.${uf}`;
  }

  // ── helper: clínica do usuário logado (dono) ──────────────────────────────
  private async requireClinicByOwner(userId: string) {
    const clinic = await this.prisma.clinic.findUnique({ where: { ownerUserId: userId } });
    if (!clinic) throw new NotFoundException('Perfil de clínica não encontrado');
    return clinic;
  }

  // ── helper: ids dos médicos ativos vinculados à clínica ───────────────────
  private async activeDoctorIds(clinicId: string): Promise<string[]> {
    const links = await this.prisma.clinicDoctor.findMany({
      where: { clinicId, status: 'active' },
      select: { doctorId: true },
    });
    return links.map((l) => l.doctorId);
  }

  // ── Ativar perfil de clínica em conta existente ───────────────────────────
  async becomeClinicAdmin(userId: string, dto: CreateClinicDto) {
    const existing = await this.prisma.clinic.findUnique({ where: { ownerUserId: userId } });
    if (existing) throw new ConflictException('Este usuário já possui uma clínica cadastrada');

    const cnpjExists = await this.prisma.clinic.findUnique({ where: { cnpj: dto.cnpj } });
    if (cnpjExists) throw new ConflictException('CNPJ já cadastrado');

    const uf = (dto.estado ?? 'SP').toUpperCase();
    const clinicCode = await this.generateClinicCode(uf);

    const [clinic] = await this.prisma.$transaction([
      this.prisma.clinic.create({
        data: {
          clinicCode,
          ownerUserId: userId,
          razaoSocial: dto.razaoSocial,
          nomeFantasia: dto.nomeFantasia,
          cnpj: dto.cnpj,
          tipoEstabelecimento: dto.tipoEstabelecimento ?? 'clinica',
          cnes: dto.cnes,
          cep: dto.cep, logradouro: dto.logradouro, numero: dto.numero,
          complemento: dto.complemento, bairro: dto.bairro, cidade: dto.cidade,
          estado: uf,
          telefone: dto.telefone, whatsapp: dto.whatsapp, email: dto.email, site: dto.site,
          healthPlans: dto.healthPlans ?? [],
          specialties: dto.specialties ?? [],
        },
      }),
      this.prisma.user.update({ where: { id: userId }, data: { role: 'clinic_admin' } }),
    ]);

    return { message: 'Clínica cadastrada com sucesso.', clinicCode: clinic.clinicCode, clinic };
  }

  // ── Perfil da clínica autenticada ─────────────────────────────────────────
  async getMyClinic(userId: string) {
    const clinic = await this.requireClinicByOwner(userId);
    const [doctorsCount, staffCount] = await Promise.all([
      this.prisma.clinicDoctor.count({ where: { clinicId: clinic.id, status: 'active' } }),
      this.prisma.clinicStaff.count({ where: { clinicId: clinic.id, status: 'active' } }),
    ]);
    return { ...clinic, doctorsCount, staffCount };
  }

  async updateClinic(userId: string, dto: UpdateClinicDto) {
    const clinic = await this.requireClinicByOwner(userId);
    return this.prisma.clinic.update({
      where: { id: clinic.id },
      data: {
        ...(dto.razaoSocial !== undefined && { razaoSocial: dto.razaoSocial }),
        ...(dto.nomeFantasia !== undefined && { nomeFantasia: dto.nomeFantasia }),
        ...(dto.tipoEstabelecimento !== undefined && { tipoEstabelecimento: dto.tipoEstabelecimento }),
        ...(dto.cnes !== undefined && { cnes: dto.cnes }),
        ...(dto.cep !== undefined && { cep: dto.cep }),
        ...(dto.logradouro !== undefined && { logradouro: dto.logradouro }),
        ...(dto.numero !== undefined && { numero: dto.numero }),
        ...(dto.complemento !== undefined && { complemento: dto.complemento }),
        ...(dto.bairro !== undefined && { bairro: dto.bairro }),
        ...(dto.cidade !== undefined && { cidade: dto.cidade }),
        ...(dto.estado !== undefined && { estado: dto.estado.toUpperCase() }),
        ...(dto.telefone !== undefined && { telefone: dto.telefone }),
        ...(dto.whatsapp !== undefined && { whatsapp: dto.whatsapp }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.site !== undefined && { site: dto.site }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
        ...(dto.healthPlans !== undefined && { healthPlans: dto.healthPlans }),
        ...(dto.specialties !== undefined && { specialties: dto.specialties }),
      },
    });
  }

  // ── Médicos da clínica ─────────────────────────────────────────────────────
  async linkDoctor(userId: string, dto: LinkDoctorDto) {
    const clinic = await this.requireClinicByOwner(userId);

    let doctor = await this.prisma.doctor.findFirst({ where: { user: { icode: dto.identifier.trim() } } });
    if (!doctor && dto.identifier.includes('.')) {
      const [crm, uf] = dto.identifier.split('.');
      doctor = await this.prisma.doctor.findFirst({ where: { crm, uf: uf?.toUpperCase() } });
    }
    if (!doctor) throw new NotFoundException('Médico não encontrado (use o ICODE ou "CRM.UF", ex.: 123456.SP)');

    const existing = await this.prisma.clinicDoctor.findUnique({
      where: { clinicId_doctorId: { clinicId: clinic.id, doctorId: doctor.id } },
    });
    if (existing) {
      if (existing.status === 'active') throw new ConflictException('Médico já vinculado a esta clínica');
      return this.prisma.clinicDoctor.update({
        where: { id: existing.id },
        data: { status: 'active', leftAt: null, role: dto.role ?? existing.role },
      });
    }

    return this.prisma.clinicDoctor.create({
      data: {
        clinicId: clinic.id,
        doctorId: doctor.id,
        role: dto.role ?? 'associated',
        commissionPct: dto.commissionPct,
        roomId: dto.roomId,
      },
    });
  }

  async listDoctors(userId: string) {
    const clinic = await this.requireClinicByOwner(userId);
    return this.prisma.clinicDoctor.findMany({
      where: { clinicId: clinic.id, status: 'active' },
      include: {
        doctor: {
          include: { user: { select: { fullName: true, email: true, avatarUrl: true, icode: true } } },
        },
        room: true,
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async unlinkDoctor(userId: string, clinicDoctorId: string) {
    const clinic = await this.requireClinicByOwner(userId);
    return this.prisma.clinicDoctor.updateMany({
      where: { id: clinicDoctorId, clinicId: clinic.id },
      data: { status: 'ended', leftAt: new Date() },
    });
  }

  // ── Pacientes (união de PatientDoctor de todos os médicos da clínica) ─────
  async listPatients(userId: string) {
    const clinic = await this.requireClinicByOwner(userId);
    const doctorIds = await this.activeDoctorIds(clinic.id);
    if (doctorIds.length === 0) return [];

    const links = await this.prisma.patientDoctor.findMany({
      where: { doctorId: { in: doctorIds }, status: 'active' },
      include: {
        user: {
          select: {
            id: true, fullName: true, email: true, avatarUrl: true, icode: true,
            dateOfBirth: true, gender: true, bloodType: true,
            allergies: true, chronicConditions: true,
          },
        },
        doctor: { include: { user: { select: { fullName: true } } } },
      },
      orderBy: { connectedAt: 'desc' },
    });

    // dedupe por paciente (um paciente pode estar com mais de um médico da clínica)
    const byUser = new Map<string, any>();
    for (const l of links) {
      if (!byUser.has(l.user.id)) byUser.set(l.user.id, { ...l.user, doctors: [] });
      byUser.get(l.user.id).doctors.push({ patientDoctorId: l.id, doctorName: l.doctor?.user?.fullName, specialty: l.specialty });
    }
    return Array.from(byUser.values());
  }

  // ── Agenda consolidada ──────────────────────────────────────────────────
  async listAgenda(userId: string, opts: { date?: string; doctorId?: string; roomId?: string }) {
    const clinic = await this.requireClinicByOwner(userId);
    const doctorIds = await this.activeDoctorIds(clinic.id);
    if (doctorIds.length === 0) return [];

    const where: any = { doctorId: { in: doctorIds } };
    if (opts.doctorId) where.doctorId = opts.doctorId;
    if (opts.date) {
      const start = new Date(opts.date + 'T00:00:00');
      const end = new Date(opts.date + 'T23:59:59.999');
      where.scheduledAt = { gte: start, lte: end };
    }
    if (opts.roomId) where.roomId = opts.roomId;

    return this.prisma.doctorAppointment.findMany({
      where,
      include: {
        doctor: { include: { user: { select: { fullName: true } } } },
        procedure: true,
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  // ── Empresas (Medicina do Trabalho) ────────────────────────────────────
  async listCompanies(userId: string) {
    const clinic = await this.requireClinicByOwner(userId);
    const doctorIds = await this.activeDoctorIds(clinic.id);
    if (doctorIds.length === 0) return [];
    return this.prisma.company.findMany({
      where: { OR: [{ clinicId: clinic.id }, { doctorId: { in: doctorIds } }] },
      orderBy: { razaoSocial: 'asc' },
    });
  }

  // ── ASOs emitidos por qualquer médico da clínica ───────────────────────
  async listAsos(userId: string) {
    const clinic = await this.requireClinicByOwner(userId);
    const doctorIds = await this.activeDoctorIds(clinic.id);
    if (doctorIds.length === 0) return [];
    return this.prisma.aso.findMany({
      where: { OR: [{ clinicId: clinic.id }, { doctorId: { in: doctorIds } }] },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  // ── Salas ──────────────────────────────────────────────────────────────
  async createRoom(userId: string, dto: ClinicRoomDto) {
    const clinic = await this.requireClinicByOwner(userId);
    return this.prisma.clinicRoom.create({ data: { clinicId: clinic.id, name: dto.name, floor: dto.floor } });
  }

  async listRooms(userId: string) {
    const clinic = await this.requireClinicByOwner(userId);
    return this.prisma.clinicRoom.findMany({ where: { clinicId: clinic.id }, orderBy: { name: 'asc' } });
  }

  // ── Procedimentos ────────────────────────────────────────────────────────
  async createProcedure(userId: string, dto: ClinicProcedureDto) {
    const clinic = await this.requireClinicByOwner(userId);
    return this.prisma.clinicProcedure.create({
      data: {
        clinicId: clinic.id,
        name: dto.name,
        tussCode: dto.tussCode,
        category: dto.category ?? 'consulta',
        defaultPrice: dto.defaultPrice,
        durationMinutes: dto.durationMinutes ?? 30,
        healthPlanPrices: dto.healthPlanPrices as any,
      },
    });
  }

  async listProcedures(userId: string) {
    const clinic = await this.requireClinicByOwner(userId);
    return this.prisma.clinicProcedure.findMany({ where: { clinicId: clinic.id, isActive: true }, orderBy: { name: 'asc' } });
  }

  // ── Staff administrativo ───────────────────────────────────────────────
  async addStaff(userId: string, dto: AddClinicStaffDto) {
    const clinic = await this.requireClinicByOwner(userId);
    const target = await this.prisma.user.findFirst({
      where: { OR: [{ icode: dto.identifier.trim() }, { email: dto.identifier.trim().toLowerCase() }] },
    });
    if (!target) throw new NotFoundException('Usuário não encontrado (use ICODE ou e-mail)');

    const existing = await this.prisma.clinicStaff.findFirst({ where: { clinicId: clinic.id, userId: target.id } });
    if (existing) {
      return this.prisma.clinicStaff.update({
        where: { id: existing.id },
        data: { status: 'active', role: dto.role ?? existing.role, endedAt: null },
      });
    }
    return this.prisma.clinicStaff.create({
      data: { clinicId: clinic.id, userId: target.id, role: dto.role ?? 'reception' },
    });
  }

  async listStaff(userId: string) {
    const clinic = await this.requireClinicByOwner(userId);
    return this.prisma.clinicStaff.findMany({
      where: { clinicId: clinic.id, status: 'active' },
      include: { user: { select: { fullName: true, email: true, avatarUrl: true, icode: true } } },
      orderBy: { startedAt: 'asc' },
    });
  }

  async removeStaff(userId: string, staffId: string) {
    const clinic = await this.requireClinicByOwner(userId);
    return this.prisma.clinicStaff.updateMany({
      where: { id: staffId, clinicId: clinic.id },
      data: { status: 'ended', endedAt: new Date() },
    });
  }

  // ── Financeiro consolidado ─────────────────────────────────────────────
  async financeiroDre(userId: string, from?: string, to?: string) {
    const clinic = await this.requireClinicByOwner(userId);
    const doctorIds = await this.activeDoctorIds(clinic.id);
    if (doctorIds.length === 0) return { entradas: 0, saidas: 0, saldo: 0, porCategoria: [] };

    const where: any = { doctorId: { in: doctorIds } };
    if (from || to) {
      where.entryDate = {};
      if (from) where.entryDate.gte = new Date(from);
      if (to) where.entryDate.lte = new Date(to);
    }

    const entries = await this.prisma.doctorCashEntry.findMany({ where });
    const entradas = entries.filter((e) => e.type === 'income').reduce((s, e) => s + Number(e.amount), 0);
    const saidas = entries.filter((e) => e.type === 'expense').reduce((s, e) => s + Number(e.amount), 0);

    const porCategoriaMap = new Map<string, number>();
    for (const e of entries) {
      const sign = e.type === 'expense' ? -1 : 1;
      porCategoriaMap.set(e.category, (porCategoriaMap.get(e.category) ?? 0) + sign * Number(e.amount));
    }

    return {
      entradas, saidas, saldo: entradas - saidas,
      porCategoria: Array.from(porCategoriaMap.entries()).map(([category, total]) => ({ category, total })),
    };
  }

  async financeiroPorMedico(userId: string, from?: string, to?: string) {
    const clinic = await this.requireClinicByOwner(userId);
    const links = await this.prisma.clinicDoctor.findMany({
      where: { clinicId: clinic.id, status: 'active' },
      include: { doctor: { include: { user: { select: { fullName: true } } } } },
    });

    const where: any = {};
    if (from || to) {
      where.entryDate = {};
      if (from) where.entryDate.gte = new Date(from);
      if (to) where.entryDate.lte = new Date(to);
    }

    const result = [];
    for (const link of links) {
      const entries = await this.prisma.doctorCashEntry.findMany({
        where: { ...where, doctorId: link.doctorId },
      });
      const bruto = entries.filter((e) => e.type === 'income').reduce((s, e) => s + Number(e.amount), 0);
      const commissionPct = link.commissionPct ? Number(link.commissionPct) : 100;
      const repasseMedico = bruto * (commissionPct / 100);
      result.push({
        doctorId: link.doctorId,
        doctorName: link.doctor.user.fullName,
        role: link.role,
        commissionPct,
        faturamentoBruto: bruto,
        repasseMedico,
        margemClinica: bruto - repasseMedico,
      });
    }
    return result;
  }
}
