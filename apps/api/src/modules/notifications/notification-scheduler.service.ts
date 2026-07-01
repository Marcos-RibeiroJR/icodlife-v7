// apps/api/src/modules/notifications/notification-scheduler.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService } from './notification.service';

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  // ── Lembretes de medicamentos — a cada hora ──────────────────────────────
  @Cron(CronExpression.EVERY_HOUR)
  async checkMedicationReminders() {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

    // Encontra medicamentos ativos cujo horário agendado é nesta hora
    const medications = await this.prisma.medication.findMany({
      where: { isActive: true },
      select: { id: true, userId: true, name: true, dosage: true, scheduledTimes: true },
    });

    let triggered = 0;
    for (const med of medications) {
      const times: string[] = (med.scheduledTimes as string[]) ?? [];
      const shouldNotify = times.some(t => {
        const [h, m] = t.split(':').map(Number);
        return h === hour && Math.abs(m - minute) <= 5;
      });

      if (!shouldNotify) continue;

      // Evita duplicata — não criar se já existe notificação não lida nas últimas 2h
      const recent = await this.prisma.notification.findFirst({
        where: {
          userId: med.userId,
          type: 'medication_reminder',
          isRead: false,
          createdAt: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) },
          data: { path: ['medicationId'], equals: med.id },
        },
      });
      if (recent) continue;

      await this.notificationService.create(med.userId, {
        type: 'medication_reminder',
        title: `💊 ${med.name}`,
        body: `Hora de tomar ${med.name}${med.dosage ? ` ${med.dosage}` : ''}.`,
        data: { medicationId: med.id, time: timeStr },
      });
      triggered++;
    }

    if (triggered > 0) this.logger.log(`Medication reminders triggered: ${triggered}`);
  }

  // ── Lembretes de consultas — todo dia às 8h ──────────────────────────────
  @Cron('0 8 * * *')
  async checkAppointmentReminders() {
    const now = new Date();
    // Consultas nas próximas 24h e nas próximas 1h
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        appointmentAt: { gte: in24h, lte: in25h },
        status: 'scheduled',
      },
      select: {
        id: true, userId: true, doctorName: true, specialty: true, appointmentAt: true,
      },
    });

    for (const appt of appointments) {
      const dateStr = new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
      }).format(appt.appointmentAt);

      await this.notificationService.create(appt.userId, {
        type: 'appointment_reminder',
        title: '📅 Consulta amanhã',
        body: `${appt.specialty ?? 'Consulta'}${appt.doctorName ? ` com ${appt.doctorName}` : ''} — ${dateStr}`,
        data: { appointmentId: appt.id },
      });
    }

    if (appointments.length > 0) this.logger.log(`Appointment reminders: ${appointments.length}`);
  }

  // ── Reforços de vacinas — todo dia às 9h ────────────────────────────────
  @Cron('0 9 * * *')
  async checkVaccineBoosterReminders() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in7days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const records = await this.prisma.vaccinationRecord.findMany({
      where: {
        nextDoseAt: { gte: today, lte: in7days },
        status: { not: 'completed' },
      },
      include: {
        vaccine: { select: { name: true } },
      },
    });

    for (const rec of records) {
      const dateStr = rec.nextDoseAt
        ? new Intl.DateTimeFormat('pt-BR').format(rec.nextDoseAt)
        : 'em breve';

      // Check for recent duplicate
      const recent = await this.prisma.notification.findFirst({
        where: {
          userId: rec.userId,
          type: 'vaccine_reminder',
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          data: { path: ['vaccineRecordId'], equals: rec.id },
        },
      });
      if (recent) continue;

      await this.notificationService.create(rec.userId, {
        type: 'vaccine_reminder',
        title: '💉 Reforço de vacina',
        body: `Dose de reforço da vacina ${rec.vaccine?.name ?? ''} prevista para ${dateStr}.`,
        data: { vaccineRecordId: rec.id },
      });
    }

    if (records.length > 0) this.logger.log(`Vaccine reminders: ${records.length}`);
  }

  // ── Medicamentos com estoque baixo — todo dia às 7h ──────────────────────
  @Cron('0 7 * * *')
  async checkLowStockReminders() {
    const meds = await this.prisma.medication.findMany({
      where: {
        isActive: true,
        stockQuantity: { not: null },
        lowStockAlert: { not: null },
      },
      select: { id: true, userId: true, name: true, stockQuantity: true, lowStockAlert: true },
    });

    for (const med of meds) {
      if (med.stockQuantity === null || med.lowStockAlert === null) continue;
      if (med.stockQuantity > med.lowStockAlert) continue;

      const recent = await this.prisma.notification.findFirst({
        where: {
          userId: med.userId,
          type: 'low_stock',
          isRead: false,
          createdAt: { gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
          data: { path: ['medicationId'], equals: med.id },
        },
      });
      if (recent) continue;

      await this.notificationService.create(med.userId, {
        type: 'low_stock',
        title: '⚠️ Estoque baixo',
        body: `${med.name} com apenas ${med.stockQuantity} unidade(s). Hora de repor!`,
        data: { medicationId: med.id, stockQuantity: med.stockQuantity },
      });
    }
  }
}
