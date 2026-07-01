// apps/api/src/modules/appointments/appointments.service.ts
import { Injectable, NotFoundException, ForbiddenException, Optional } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AppointmentStatus } from '../../generated/prisma';
import { PushService } from '../push/push.service';

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
  constructor(
    private prisma: PrismaService,
    @Optional() private pushService?: PushService,
  ) {}

  async create(userId: string, dto: CreateAppointmentDto) {
    const appt = await this.prisma.appointment.create({
      data: {
        userId,
        doctorName:       dto.doctorName,
        specialty:        dto.specialty,
        cnesCode:         dto.cnesCode,
        appointmentAt:    new Date(dto.appointmentAt),
        duration:         dto.duration ?? 30,
        status:           dto.status ?? 'scheduled',
        telehealth:       dto.telehealth ?? false,
        location:         dto.location,
        address:          dto.address,
        meetingUrl:       dto.meetingUrl,
        patientDoctorId:  dto.patientDoctorId,
        reminderMinutes:  dto.reminderMinutes,
        color:            dto.color ?? '#DC2626',
        notes:            dto.notes,
      },
    });
    // Push de confirmação imediata
    const dateStr = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(appt.appointmentAt);
    this.pushService?.sendToUser(userId, {
      title: '📅 Consulta agendada',
      body:  `${dto.specialty ?? 'Consulta'}${dto.doctorName ? ` com ${dto.doctorName}` : ''} — ${dateStr}`,
      data:  { type: 'appointment_created', appointmentId: appt.id },
    }).catch(() => {});
    return appt;
  }

  list(userId: string) {
    return this.prisma.appointment.findMany({
      where: { userId },
      orderBy: { appointmentAt: 'desc' },
    });
  }

  async get(userId: string, id: string) {
    const a = await this.prisma.appointment.findFirst({ where: { id, userId } });
    if (!a) throw new NotFoundException('Consulta não encontrada');
    return a;
  }

  async update(userId: string, id: string, dto: UpdateAppointmentDto) {
    await this.get(userId, id);
    return this.prisma.appointment.update({
      where: { id },
      data: {
        ...dto,
        appointmentAt: dto.appointmentAt ? new Date(dto.appointmentAt) : undefined,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    return this.prisma.appointment.delete({ where: { id } });
  }

  getUpcoming(userId: string, limit = 5) {
    return this.prisma.appointment.findMany({
      where: { userId, appointmentAt: { gte: new Date() }, status: 'scheduled' },
      orderBy: { appointmentAt: 'asc' },
      take: limit,
    });
  }

  async getSummary(userId: string) {
    const [total, upcoming, completed, canceled] = await Promise.all([
      this.prisma.appointment.count({ where: { userId } }),
      this.prisma.appointment.count({ where: { userId, appointmentAt: { gte: new Date() }, status: 'scheduled' } }),
      this.prisma.appointment.count({ where: { userId, status: 'completed' } }),
      this.prisma.appointment.count({ where: { userId, status: 'canceled' } }),
    ]);
    return { total, upcoming, completed, canceled };
  }
}
