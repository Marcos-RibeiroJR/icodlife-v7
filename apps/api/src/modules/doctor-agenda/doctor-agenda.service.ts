// apps/api/src/modules/doctor-agenda/doctor-agenda.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

function parseTime(t: string): { h: number; m: number } {
  const [h, m] = t.split(':').map(Number);
  return { h, m };
}

function addMinutes(date: Date, mins: number): Date {
  return new Date(date.getTime() + mins * 60_000);
}

@Injectable()
export class DoctorAgendaService {
  constructor(private prisma: PrismaService) {}

  private async getDoctor(userId: string) {
    const doc = await this.prisma.doctor.findUnique({ where: { userId } });
    if (!doc) throw new NotFoundException('Perfil de doutor não encontrado');
    return doc;
  }

  // ── Carga horária ─────────────────────────────────────────────────────────

  async getWorkingHours(userId: string) {
    const doc = await this.getDoctor(userId);
    return this.prisma.doctorWorkingHours.findMany({
      where: { doctorId: doc.id },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async setWorkingHours(userId: string, days: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotMinutes?: number;
    isActive?: boolean;
  }[]) {
    const doc = await this.getDoctor(userId);
    const results = [];
    for (const d of days) {
      const r = await this.prisma.doctorWorkingHours.upsert({
        where: { doctorId_dayOfWeek: { doctorId: doc.id, dayOfWeek: d.dayOfWeek } },
        create: {
          doctorId:    doc.id,
          dayOfWeek:   d.dayOfWeek,
          startTime:   d.startTime,
          endTime:     d.endTime,
          slotMinutes: d.slotMinutes ?? 30,
          isActive:    d.isActive ?? true,
        },
        update: {
          startTime:   d.startTime,
          endTime:     d.endTime,
          slotMinutes: d.slotMinutes ?? 30,
          isActive:    d.isActive ?? true,
        },
      });
      results.push(r);
    }
    return results;
  }

  // ── Bloqueios ─────────────────────────────────────────────────────────────

  async addBlockedSlot(userId: string, dto: {
    date: string;
    startTime?: string;
    endTime?: string;
    reason?: string;
  }) {
    const doc = await this.getDoctor(userId);
    return this.prisma.doctorBlockedSlot.create({
      data: {
        doctorId:  doc.id,
        date:      new Date(dto.date),
        startTime: dto.startTime,
        endTime:   dto.endTime,
        reason:    dto.reason,
      },
    });
  }

  async removeBlockedSlot(userId: string, id: string) {
    const doc = await this.getDoctor(userId);
    const slot = await this.prisma.doctorBlockedSlot.findFirst({ where: { id, doctorId: doc.id } });
    if (!slot) throw new NotFoundException('Bloqueio não encontrado');
    return this.prisma.doctorBlockedSlot.delete({ where: { id } });
  }

  // ── Slots disponíveis para um dia ─────────────────────────────────────────

  async getAvailableSlots(userId: string, dateStr: string) {
    const doc  = await this.getDoctor(userId);
    const date = new Date(dateStr + 'T00:00:00');
    const dow  = date.getDay();

    const wh = await this.prisma.doctorWorkingHours.findFirst({
      where: { doctorId: doc.id, dayOfWeek: dow, isActive: true },
    });
    if (!wh) return { date: dateStr, slots: [], message: 'Médico não atende neste dia.' };

    // Bloqueios do dia
    const blocks = await this.prisma.doctorBlockedSlot.findMany({
      where: {
        doctorId: doc.id,
        date: { gte: date, lt: new Date(date.getTime() + 86_400_000) },
      },
    });
    const dayBlocked = blocks.some(b => !b.startTime);

    if (dayBlocked) return { date: dateStr, slots: [], message: 'Dia bloqueado.' };

    // Consultas já agendadas
    const booked = await this.prisma.doctorAppointment.findMany({
      where: {
        doctorId: doc.id,
        status: { not: 'canceled' },
        scheduledAt: { gte: date, lt: new Date(date.getTime() + 86_400_000) },
      },
    });

    // Gera slots
    const { h: sh, m: sm } = parseTime(wh.startTime);
    const { h: eh, m: em } = parseTime(wh.endTime);
    const startMs = sh * 60 + sm;
    const endMs   = eh * 60 + em;

    const slots: { time: string; available: boolean; appointmentId?: string }[] = [];
    for (let t = startMs; t + wh.slotMinutes <= endMs; t += wh.slotMinutes) {
      const slotTime = new Date(date);
      slotTime.setHours(Math.floor(t / 60), t % 60, 0, 0);
      const slotEnd = addMinutes(slotTime, wh.slotMinutes);

      // Verifica se está dentro de algum bloqueio parcial
      const partialBlock = blocks.find(b =>
        b.startTime && b.endTime &&
        parseTime(b.startTime).h * 60 + parseTime(b.startTime).m <= t &&
        parseTime(b.endTime).h * 60 + parseTime(b.endTime).m > t
      );

      // Verifica se já está agendado
      const appt = booked.find(a => {
        const aStart = new Date(a.scheduledAt);
        const aEnd   = addMinutes(aStart, a.durationMinutes);
        return aStart < slotEnd && aEnd > slotTime;
      });

      const hh = String(Math.floor(t / 60)).padStart(2, '0');
      const mm = String(t % 60).padStart(2, '0');

      slots.push({
        time:          `${hh}:${mm}`,
        available:     !partialBlock && !appt,
        appointmentId: appt?.id,
      });
    }

    return { date: dateStr, slots };
  }

  // ── Consultas ─────────────────────────────────────────────────────────────

  async createAppointment(userId: string, dto: {
    patientName:     string;
    patientPhone?:   string;
    patientIcode?:   string;
    patientDoctorId?: string;
    scheduledAt:     string;
    durationMinutes?: number;
    type?:           string;
    notes?:          string;
    color?:          string;
    price?:          number;
    paymentStatus?:  string;
  }) {
    const doc = await this.getDoctor(userId);
    return this.prisma.doctorAppointment.create({
      data: {
        doctorId:        doc.id,
        patientName:     dto.patientName,
        patientPhone:    dto.patientPhone,
        patientIcode:    dto.patientIcode,
        patientDoctorId: dto.patientDoctorId,
        scheduledAt:     new Date(dto.scheduledAt),
        durationMinutes: dto.durationMinutes ?? 30,
        type:            dto.type ?? 'consulta',
        notes:           dto.notes,
        color:           dto.color ?? '#2563EB',
        price:           dto.price,
        paymentStatus:   dto.paymentStatus,
      },
    });
  }

  async updateAppointment(userId: string, id: string, dto: Partial<{
    status: string;
    notes: string;
    price: number;
    paymentStatus: string;
    patientName: string;
    scheduledAt: string;
    durationMinutes: number;
    color: string;
    type: string;
  }>) {
    const doc  = await this.getDoctor(userId);
    const appt = await this.prisma.doctorAppointment.findFirst({ where: { id, doctorId: doc.id } });
    if (!appt) throw new NotFoundException('Consulta não encontrada');
    return this.prisma.doctorAppointment.update({
      where: { id },
      data: {
        ...(dto.status          && { status: dto.status }),
        ...(dto.notes           !== undefined && { notes: dto.notes }),
        ...(dto.price           !== undefined && { price: dto.price }),
        ...(dto.paymentStatus   && { paymentStatus: dto.paymentStatus }),
        ...(dto.patientName     && { patientName: dto.patientName }),
        ...(dto.scheduledAt     && { scheduledAt: new Date(dto.scheduledAt) }),
        ...(dto.durationMinutes && { durationMinutes: dto.durationMinutes }),
        ...(dto.color           && { color: dto.color }),
        ...(dto.type            && { type: dto.type }),
      },
    });
  }

  async deleteAppointment(userId: string, id: string) {
    const doc  = await this.getDoctor(userId);
    const appt = await this.prisma.doctorAppointment.findFirst({ where: { id, doctorId: doc.id } });
    if (!appt) throw new NotFoundException('Consulta não encontrada');
    return this.prisma.doctorAppointment.update({
      where: { id },
      data: { status: 'canceled' },
    });
  }

  // ── Agenda por período ────────────────────────────────────────────────────

  async getAppointments(userId: string, from: string, to: string) {
    const doc = await this.getDoctor(userId);
    return this.prisma.doctorAppointment.findMany({
      where: {
        doctorId:    doc.id,
        scheduledAt: { gte: new Date(from), lte: new Date(to) },
      },
      orderBy: { scheduledAt: 'asc' },
      include: { patientDoctor: { include: { user: { select: { fullName: true, icode: true } } } } },
    });
  }

  // ── Resumo do dia / semana ────────────────────────────────────────────────

  async getDaySummary(userId: string, dateStr: string) {
    const doc  = await this.getDoctor(userId);
    const date = new Date(dateStr + 'T00:00:00');
    const [appts, slots] = await Promise.all([
      this.prisma.doctorAppointment.findMany({
        where: {
          doctorId:    doc.id,
          scheduledAt: { gte: date, lt: new Date(date.getTime() + 86_400_000) },
          status:      { not: 'canceled' },
        },
        orderBy: { scheduledAt: 'asc' },
        include: { patientDoctor: { include: { user: { select: { fullName: true } } } } },
      }),
      this.getAvailableSlots(userId, dateStr),
    ]);
    const totalSlots  = (slots as any).slots?.length ?? 0;
    const freeSlots   = (slots as any).slots?.filter((s: any) => s.available).length ?? 0;
    return { date: dateStr, appointments: appts, totalSlots, freeSlots, bookedSlots: appts.length };
  }
}
