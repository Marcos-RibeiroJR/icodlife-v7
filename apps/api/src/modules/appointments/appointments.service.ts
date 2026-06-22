// apps/api/src/modules/appointments/appointments.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AppointmentStatus } from '@prisma/client';

export interface CreateAppointmentDto {
  doctorName:       string;
  specialty?:       string;
  cnesCode?:        string;
  appointmentAt:    string;
  duration?:        number;
  status?:          AppointmentStatus;
  telehealth?:      boolean;
  location?:        string;
  address?:         string;
  meetingUrl?:      string;
  patientDoctorId?: string;
  reminderMinutes?: number;
  color?:           string;
  notes?:           string;
}

export type UpdateAppointmentDto = Partial<CreateAppointmentDto>;

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateAppointmentDto) {
    const at = new Date(dto.appointmentAt);
    const reminderAt = dto.reminderMinutes
      ? new Date(at.getTime() - dto.reminderMinutes * 60_000)
      : null;

    return this.prisma.appointment.create({
      data: {
        userId,
        doctorName:      dto.doctorName,
        specialty:       dto.specialty,
        cnesCode:        dto.cnesCode,
        appointmentAt:   at,
        duration:        dto.duration ?? 30,
        status:          dto.status ?? 'scheduled',
        telehealth:      dto.telehealth ?? false,
        location:        dto.location,
        address:         dto.address,
        meetingUrl:      dto.meetingUrl,
        patientDoctorId: dto.patientDoctorId,
        reminderMinutes: dto.reminderMinutes,
        reminderAt,
        color:           dto.color ?? '#DC2626',
        notes:           dto.notes,
      },
      include: {
        patientDoctor: {
          include: { doctor: { select: { doctorId: true, specialties: true } } },
        },
      },
    });
  }

  async list(userId: string) {
    return this.prisma.appointment.findMany({
      where: { userId },
      orderBy: { appointmentAt: 'asc' },
      include: {
        patientDoctor: {
          include: { doctor: { select: { doctorId: true } } },
        },
      },
    });
  }

  async getByMonth(userId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 0, 23, 59, 59);
    return this.prisma.appointment.findMany({
      where: { userId, appointmentAt: { gte: start, lte: end } },
      orderBy: { appointmentAt: 'asc' },
    });
  }

  async getUpcoming(userId: string, limit = 5) {
    return this.prisma.appointment.findMany({
      where: { userId, status: 'scheduled', appointmentAt: { gte: new Date() } },
      orderBy: { appointmentAt: 'asc' },
      take: limit,
    });
  }

  async findOne(userId: string, id: string) {
    const a = await this.prisma.appointment.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('Consulta não encontrada');
    if (a.userId !== userId) throw new ForbiddenException();
    return a;
  }

  async update(userId: string, id: string, dto: UpdateAppointmentDto) {
    await this.findOne(userId, id);
    const at = dto.appointmentAt ? new Date(dto.appointmentAt) : undefined;
    const reminderAt = at && dto.reminderMinutes
      ? new Date(at.getTime() - dto.reminderMinutes * 60_000)
      : undefined;

    return this.prisma.appointment.update({
      where: { id },
      data: {
        ...dto,
        appointmentAt: at,
        reminderAt,
        status: dto.status as AppointmentStatus | undefined,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.appointment.delete({ where: { id } });
  }

  async getSummary(userId: string) {
    const now = new Date();
    const [upcoming, completed, total] = await Promise.all([
      this.prisma.appointment.count({ where: { userId, status: 'scheduled', appointmentAt: { gte: now } } }),
      this.prisma.appointment.count({ where: { userId, status: 'completed' } }),
      this.prisma.appointment.count({ where: { userId } }),
    ]);
    const next = await this.prisma.appointment.findFirst({
      where: { userId, status: 'scheduled', appointmentAt: { gte: now } },
      orderBy: { appointmentAt: 'asc' },
      select: { doctorName: true, specialty: true, appointmentAt: true, telehealth: true, location: true },
    });
    return { upcoming, completed, total, next };
  }
}
