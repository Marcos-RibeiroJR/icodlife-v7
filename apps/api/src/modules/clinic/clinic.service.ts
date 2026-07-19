// apps/api/src/modules/clinic/clinic.service.ts
import { Injectable, ConflictException, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateClinicDto } from './dto/create-clinic.dto';
import { UpdateClinicDto } from './dto/update-clinic.dto';
import { LinkDoctorDto } from './dto/link-doctor.dto';
import { AddClinicStaffDto } from './dto/clinic-staff.dto';
import { ClinicProcedureDto } from './dto/clinic-procedure.dto';
import { ClinicRoomDto } from './dto/clinic-room.dto';
import { CompanyService } from '../company/company.service';

const onlyDigits = (s?: string) => (s ?? '').replace(/\D/g, '');

@Injectable()
export class ClinicService {
  constructor(
    private prisma: PrismaService,
    private companyService: CompanyService,
  ) {}

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

  // ── helper: garante que o médico pertence (ativamente) à clínica logada ───
  private async assertDoctorInClinic(clinicId: string, doctorId: string) {
    const link = await this.prisma.clinicDoctor.findUnique({
      where: { clinicId_doctorId: { clinicId, doctorId } },
    });
    if (!link || link.status !== 'active') {
      throw new ForbiddenException('Médico não pertence a esta clínica');
    }
  }

  // ── helpers de horário (mesma lógica do DoctorAgendaService, por doctorId) ─
  private parseTime(t: string): { h: number; m: number } {
    const [h, m] = t.split(':').map(Number);
    return { h, m };
  }

  private addMinutes(date: Date, mins: number): Date {
    return new Date(date.getTime() + mins * 60_000);
  }

  // ── calcula slots disponíveis de um médico num dia, direto por doctorId ───
  private async computeAvailableSlots(doctorId: string, dateStr: string) {
    const date = new Date(dateStr + 'T00:00:00');
    const dow = date.getDay();

    const wh = await this.prisma.doctorWorkingHours.findFirst({
      where: { doctorId, dayOfWeek: dow, isActive: true },
    });
    if (!wh) return { date: dateStr, slots: [], message: 'Médico não atende neste dia.' };

    const blocks = await this.prisma.doctorBlockedSlot.findMany({
      where: { doctorId, date: { gte: date, lt: new Date(date.getTime() + 86_400_000) } },
    });
    const dayBlocked = blocks.some((b) => !b.startTime);
    if (dayBlocked) return { date: dateStr, slots: [], message: 'Dia bloqueado.' };

    const booked = await this.prisma.doctorAppointment.findMany({
      where: {
        doctorId,
        status: { not: 'canceled' },
        scheduledAt: { gte: date, lt: new Date(date.getTime() + 86_400_000) },
      },
    });

    const { h: sh, m: sm } = this.parseTime(wh.startTime);
    const { h: eh, m: em } = this.parseTime(wh.endTime);
    const startMs = sh * 60 + sm;
    const endMs = eh * 60 + em;

    const slots: { time: string; available: boolean; appointmentId?: string }[] = [];
    for (let t = startMs; t + wh.slotMinutes <= endMs; t += wh.slotMinutes) {
      const slotTime = new Date(date);
      slotTime.setHours(Math.floor(t / 60), t % 60, 0, 0);
      const slotEnd = this.addMinutes(slotTime, wh.slotMinutes);

      const partialBlock = blocks.find((b) =>
        b.startTime && b.endTime &&
        this.parseTime(b.startTime).h * 60 + this.parseTime(b.startTime).m <= t &&
        this.parseTime(b.endTime).h * 60 + this.parseTime(b.endTime).m > t
      );

      const appt = booked.find((a) => {
        const aStart = new Date(a.scheduledAt);
        const aEnd = this.addMinutes(aStart, a.durationMinutes);
        return aStart < slotEnd && aEnd > slotTime;
      });

      const hh = String(Math.floor(t / 60)).padStart(2, '0');
      const mm = String(t % 60).padStart(2, '0');

      slots.push({
        time: `${hh}:${mm}`,
        available: !partialBlock && !appt,
        appointmentId: appt?.id,
      });
    }

    return { date: dateStr, slots };
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
      byUser.get(l.user.id).doctors.push({
        patientDoctorId: l.id,
        doctorId: l.doctorId,
        doctorName: l.doctor?.user?.fullName,
        specialty: l.specialty,
      });
    }
    return Array.from(byUser.values());
  }

  // ── Agenda consolidada — aceita "date" (1 dia) OU "from"/"to" (intervalo) ─
  async listAgenda(userId: string, opts: { date?: string; from?: string; to?: string; doctorId?: string; roomId?: string }) {
    const clinic = await this.requireClinicByOwner(userId);
    const doctorIds = await this.activeDoctorIds(clinic.id);
    if (doctorIds.length === 0) return [];

    const where: any = { doctorId: { in: doctorIds } };
    if (opts.doctorId) where.doctorId = opts.doctorId;
    if (opts.roomId) where.roomId = opts.roomId;

    if (opts.from && opts.to) {
      where.scheduledAt = { gte: new Date(opts.from), lte: new Date(opts.to) };
    } else if (opts.date) {
      const start = new Date(opts.date + 'T00:00:00');
      const end = new Date(opts.date + 'T23:59:59.999');
      where.scheduledAt = { gte: start, lte: end };
    }

    return this.prisma.doctorAppointment.findMany({
      where,
      include: {
        doctor: { include: { user: { select: { fullName: true, icode: true } } } },
        procedure: true,
        room: true,
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  // ── Agenda: horários/slots/resumo de um médico específico da clínica ─────
  async getDoctorWorkingHours(userId: string, doctorId: string) {
    const clinic = await this.requireClinicByOwner(userId);
    if (!doctorId) throw new BadRequestException('doctorId é obrigatório');
    await this.assertDoctorInClinic(clinic.id, doctorId);
    return this.prisma.doctorWorkingHours.findMany({
      where: { doctorId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async getDoctorSlots(userId: string, doctorId: string, dateStr: string) {
    const clinic = await this.requireClinicByOwner(userId);
    if (!doctorId) throw new BadRequestException('doctorId é obrigatório');
    await this.assertDoctorInClinic(clinic.id, doctorId);
    return this.computeAvailableSlots(doctorId, dateStr);
  }

  async getDoctorDaySummary(userId: string, doctorId: string, dateStr: string) {
    const clinic = await this.requireClinicByOwner(userId);
    if (!doctorId) throw new BadRequestException('doctorId é obrigatório');
    await this.assertDoctorInClinic(clinic.id, doctorId);

    const date = new Date(dateStr + 'T00:00:00');
    const [appts, slotsResult] = await Promise.all([
      this.prisma.doctorAppointment.findMany({
        where: {
          doctorId,
          scheduledAt: { gte: date, lt: new Date(date.getTime() + 86_400_000) },
          status: { not: 'canceled' },
        },
        orderBy: { scheduledAt: 'asc' },
        include: { room: true, procedure: true },
      }),
      this.computeAvailableSlots(doctorId, dateStr),
    ]);
    const totalSlots = (slotsResult as any).slots?.length ?? 0;
    const freeSlots = (slotsResult as any).slots?.filter((s: any) => s.available).length ?? 0;
    return {
      date: dateStr,
      appointments: appts,
      totalSlots,
      freeSlots,
      bookedSlots: appts.length,
      message: (slotsResult as any).message,
    };
  }

  // ── Agenda: criar/editar/cancelar consulta em nome de um médico da clínica ─
  async createAppointment(userId: string, dto: any) {
    const clinic = await this.requireClinicByOwner(userId);
    if (!dto.doctorId) throw new BadRequestException('doctorId é obrigatório');
    if (!dto.patientName) throw new BadRequestException('patientName é obrigatório');
    if (!dto.scheduledAt) throw new BadRequestException('scheduledAt é obrigatório');
    await this.assertDoctorInClinic(clinic.id, dto.doctorId);

    return this.prisma.doctorAppointment.create({
      data: {
        doctorId: dto.doctorId,
        clinicId: clinic.id,
        patientName: dto.patientName,
        patientPhone: dto.patientPhone || undefined,
        patientIcode: dto.patientIcode || undefined,
        patientDoctorId: dto.patientDoctorId || undefined,
        procedureId: dto.procedureId || undefined,
        roomId: dto.roomId || undefined,
        scheduledAt: new Date(dto.scheduledAt),
        durationMinutes: dto.durationMinutes ?? 30,
        type: dto.type ?? 'consulta',
        notes: dto.notes || undefined,
        color: dto.color ?? '#2563EB',
        price: dto.price !== undefined && dto.price !== '' ? dto.price : undefined,
        paymentStatus: dto.paymentStatus || undefined,
      },
    });
  }

  async updateAppointment(userId: string, id: string, dto: any) {
    const clinic = await this.requireClinicByOwner(userId);
    const doctorIds = await this.activeDoctorIds(clinic.id);
    const appt = await this.prisma.doctorAppointment.findFirst({ where: { id, doctorId: { in: doctorIds } } });
    if (!appt) throw new NotFoundException('Consulta não encontrada');

    if (dto.doctorId && dto.doctorId !== appt.doctorId) {
      await this.assertDoctorInClinic(clinic.id, dto.doctorId);
    }

    const updated = await this.prisma.doctorAppointment.update({
      where: { id },
      data: {
        ...(dto.doctorId && { doctorId: dto.doctorId }),
        ...(dto.status && { status: dto.status }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.paymentStatus && { paymentStatus: dto.paymentStatus }),
        ...(dto.patientName && { patientName: dto.patientName }),
        ...(dto.scheduledAt && { scheduledAt: new Date(dto.scheduledAt) }),
        ...(dto.durationMinutes && { durationMinutes: dto.durationMinutes }),
        ...(dto.color && { color: dto.color }),
        ...(dto.type && { type: dto.type }),
        ...(dto.roomId !== undefined && { roomId: dto.roomId || null }),
      },
    });

    // Consulta concluída numa sala com custo definido → debita automaticamente
    // a conta corrente do médico responsável (idempotente: 1 débito por consulta).
    if (dto.status === 'completed' && updated.roomId) {
      await this.chargeRoomUsage(clinic.id, updated);
    }

    return updated;
  }

  /** Débito automático de custo de sala na conta-corrente (DoctorCashEntry) do médico. */
  private async chargeRoomUsage(clinicId: string, appt: any) {
    const already = await this.prisma.doctorCashEntry.findFirst({
      where: { appointmentId: appt.id, category: 'custo_sala' },
    });
    if (already) return;

    const room = await this.prisma.clinicRoom.findUnique({ where: { id: appt.roomId } });
    if (!room || (room.costPerUse == null && room.costPerHour == null)) return;

    const hours = (appt.durationMinutes ?? 30) / 60;
    const amount = room.costPerUse != null
      ? Number(room.costPerUse)
      : Number(room.costPerHour) * hours;
    if (!amount || amount <= 0) return;

    await this.prisma.doctorCashEntry.create({
      data: {
        doctorId: appt.doctorId,
        clinicId,
        appointmentId: appt.id,
        roomId: room.id,
        type: 'expense',
        category: 'custo_sala',
        description: `Uso da sala ${room.name} — ${appt.patientName}`,
        amount,
        paymentMethod: 'internal',
        entryDate: appt.scheduledAt,
        patientName: appt.patientName,
      },
    });
  }

  async cancelAppointment(userId: string, id: string) {
    const clinic = await this.requireClinicByOwner(userId);
    const doctorIds = await this.activeDoctorIds(clinic.id);
    const appt = await this.prisma.doctorAppointment.findFirst({ where: { id, doctorId: { in: doctorIds } } });
    if (!appt) throw new NotFoundException('Consulta não encontrada');
    return this.prisma.doctorAppointment.update({
      where: { id },
      data: { status: 'canceled' },
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

  /** Enriquecimento por CNPJ (BrasilAPI/ReceitaWS) — mesma lógica do painel do médico, não persiste. */
  lookupCnpj(cnpj: string) {
    return this.companyService.lookupCnpj(cnpj);
  }

  async getCompany(userId: string, id: string) {
    const clinic = await this.requireClinicByOwner(userId);
    const doctorIds = await this.activeDoctorIds(clinic.id);
    const company = await this.prisma.company.findFirst({
      where: { id, OR: [{ clinicId: clinic.id }, { doctorId: { in: doctorIds } }] },
    });
    if (!company) throw new NotFoundException('Empresa não encontrada');
    return company;
  }

  async createCompany(userId: string, dto: any) {
    const clinic = await this.requireClinicByOwner(userId);
    if (!dto.razaoSocial) throw new BadRequestException('Razão social é obrigatória.');
    if (!dto.doctorId) throw new BadRequestException('Médico responsável é obrigatório.');
    await this.assertDoctorInClinic(clinic.id, dto.doctorId);

    const cnpj = onlyDigits(dto.cnpj);
    if (!cnpj || cnpj.length !== 14) throw new BadRequestException('CNPJ inválido (14 dígitos).');

    const dup = await this.prisma.company.findFirst({ where: { clinicId: clinic.id, cnpj } });
    if (dup) throw new ConflictException('Já existe uma empresa cadastrada com este CNPJ nesta clínica.');

    return this.prisma.company.create({
      data: {
        ...this.companyService.mapWritable(dto),
        cnpj,
        doctorId: dto.doctorId,
        clinicId: clinic.id,
        createdBy: userId,
      },
    });
  }

  async updateCompany(userId: string, id: string, dto: any) {
    const clinic = await this.requireClinicByOwner(userId);
    const doctorIds = await this.activeDoctorIds(clinic.id);
    const existing = await this.prisma.company.findFirst({
      where: { id, OR: [{ clinicId: clinic.id }, { doctorId: { in: doctorIds } }] },
    });
    if (!existing) throw new NotFoundException('Empresa não encontrada');

    if (dto.doctorId && dto.doctorId !== existing.doctorId) {
      await this.assertDoctorInClinic(clinic.id, dto.doctorId);
    }

    const data: any = {
      ...this.companyService.mapWritable(dto),
      ...(dto.doctorId && { doctorId: dto.doctorId }),
      updatedBy: userId,
      version: { increment: 1 },
    };
    if (dto.cnpj !== undefined) {
      const cnpj = onlyDigits(dto.cnpj);
      if (cnpj.length !== 14) throw new BadRequestException('CNPJ inválido (14 dígitos).');
      data.cnpj = cnpj;
    }
    return this.prisma.company.update({ where: { id }, data });
  }

  async removeCompany(userId: string, id: string) {
    const clinic = await this.requireClinicByOwner(userId);
    const doctorIds = await this.activeDoctorIds(clinic.id);
    const existing = await this.prisma.company.findFirst({
      where: { id, OR: [{ clinicId: clinic.id }, { doctorId: { in: doctorIds } }] },
    });
    if (!existing) throw new NotFoundException('Empresa não encontrada');
    await this.prisma.company.delete({ where: { id } });
    return { deleted: true };
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
    return this.prisma.clinicRoom.create({
      data: {
        clinicId: clinic.id,
        name: dto.name,
        floor: dto.floor,
        costPerHour: dto.costPerHour,
        costPerUse: dto.costPerUse,
      },
    });
  }

  async updateRoom(userId: string, id: string, dto: Partial<ClinicRoomDto> & { isActive?: boolean }) {
    const clinic = await this.requireClinicByOwner(userId);
    const room = await this.prisma.clinicRoom.findFirst({ where: { id, clinicId: clinic.id } });
    if (!room) throw new NotFoundException('Sala não encontrada');
    return this.prisma.clinicRoom.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.floor !== undefined && { floor: dto.floor }),
        ...(dto.costPerHour !== undefined && { costPerHour: dto.costPerHour }),
        ...(dto.costPerUse !== undefined && { costPerUse: dto.costPerUse }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async listRooms(userId: string) {
    const clinic = await this.requireClinicByOwner(userId);
    return this.prisma.clinicRoom.findMany({
      where: { clinicId: clinic.id },
      include: {
        assigned: {
          where: { status: 'active' },
          include: { doctor: { include: { user: { select: { fullName: true } } } } },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  // ── associar/desassociar sala fixa de um médico ("Sala" como agenda dele) ──
  async assignRoomToDoctor(userId: string, roomId: string, doctorId: string) {
    const clinic = await this.requireClinicByOwner(userId);
    const room = await this.prisma.clinicRoom.findFirst({ where: { id: roomId, clinicId: clinic.id } });
    if (!room) throw new NotFoundException('Sala não encontrada');
    const link = await this.prisma.clinicDoctor.findUnique({
      where: { clinicId_doctorId: { clinicId: clinic.id, doctorId } },
    });
    if (!link || link.status !== 'active') throw new NotFoundException('Médico não vinculado a esta clínica');
    return this.prisma.clinicDoctor.update({ where: { id: link.id }, data: { roomId } });
  }

  async unassignRoomFromDoctor(userId: string, roomId: string, doctorId: string) {
    const clinic = await this.requireClinicByOwner(userId);
    const link = await this.prisma.clinicDoctor.findFirst({
      where: { clinicId: clinic.id, doctorId, roomId },
    });
    if (!link) throw new NotFoundException('Vínculo sala/médico não encontrado');
    return this.prisma.clinicDoctor.update({ where: { id: link.id }, data: { roomId: null } });
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
      const custoSalas = entries
        .filter((e) => e.type === 'expense' && e.category === 'custo_sala')
        .reduce((s, e) => s + Number(e.amount), 0);
      result.push({
        doctorId: link.doctorId,
        doctorName: link.doctor.user.fullName,
        role: link.role,
        commissionPct,
        faturamentoBruto: bruto,
        repasseMedico,
        custoSalas,
        margemClinica: bruto - repasseMedico,
        saldoContaCorrente: repasseMedico - custoSalas,
      });
    }
    return result;
  }

  // ── Conta corrente do médico na clínica (extrato + saldo) ─────────────────
  async getContaCorrente(userId: string, doctorId: string, from?: string, to?: string) {
    const clinic = await this.requireClinicByOwner(userId);
    await this.assertDoctorInClinic(clinic.id, doctorId);

    const where: any = { doctorId, clinicId: clinic.id };
    if (from || to) {
      where.entryDate = {};
      if (from) where.entryDate.gte = new Date(from);
      if (to) where.entryDate.lte = new Date(to);
    }

    const entries = await this.prisma.doctorCashEntry.findMany({
      where,
      include: { room: true },
      orderBy: { entryDate: 'desc' },
    });

    const totalIncome = entries.filter((e) => e.type === 'income').reduce((s, e) => s + Number(e.amount), 0);
    const totalExpense = entries.filter((e) => e.type === 'expense').reduce((s, e) => s + Number(e.amount), 0);
    const custoSalas = entries
      .filter((e) => e.type === 'expense' && e.category === 'custo_sala')
      .reduce((s, e) => s + Number(e.amount), 0);

    return {
      doctorId,
      entries,
      totalIncome,
      totalExpense,
      custoSalas,
      saldo: totalIncome - totalExpense,
    };
  }

  /** Lançamento manual na conta corrente do médico (ajuste, crédito/débito avulso). */
  async createDoctorCashEntry(userId: string, doctorId: string, dto: any) {
    const clinic = await this.requireClinicByOwner(userId);
    await this.assertDoctorInClinic(clinic.id, doctorId);
    if (!dto.type || !['income', 'expense'].includes(dto.type)) {
      throw new BadRequestException('type deve ser "income" ou "expense"');
    }
    if (!dto.description) throw new BadRequestException('description é obrigatória');
    if (dto.amount === undefined || dto.amount === null || Number(dto.amount) <= 0) {
      throw new BadRequestException('amount deve ser maior que zero');
    }
    return this.prisma.doctorCashEntry.create({
      data: {
        doctorId,
        clinicId: clinic.id,
        type: dto.type,
        category: dto.category || 'ajuste',
        description: dto.description,
        amount: dto.amount,
        paymentMethod: dto.paymentMethod || 'internal',
        entryDate: dto.entryDate ? new Date(dto.entryDate) : new Date(),
        notes: dto.notes || undefined,
      },
    });
  }
}
