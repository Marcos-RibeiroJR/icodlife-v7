import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class MedicationsService {
  constructor(private prisma: PrismaService) {}

  /** frequency é coluna String no schema — guardamos como JSON serializado quando vem
   *  um objeto ({times, days}) e desserializamos na leitura, pra manter compatível com
   *  registros antigos que só tinham um rótulo simples tipo "daily". */
  private parseFrequency(raw: string): any {
    if (typeof raw !== 'string') return raw;
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : raw;
    } catch {
      return raw;
    }
  }

  /** Extrai o array de horários (scheduled_times, NOT NULL sem default) a partir do
   *  payload recebido — aceita frequency.times, scheduledTimes direto, ou string
   *  "07:00, 19:00" separada por vírgula. Nunca retorna null/undefined (bug histórico:
   *  create() nunca preenchia essa coluna e violava a constraint NOT NULL). */
  private extractScheduledTimes(d: any): string[] {
    if (Array.isArray(d.frequency?.times)) return d.frequency.times.filter(Boolean);
    if (Array.isArray(d.scheduledTimes)) return d.scheduledTimes.filter(Boolean);
    if (typeof d.times === 'string' && d.times.trim()) {
      return d.times.split(',').map((t: string) => t.trim()).filter(Boolean);
    }
    return ['08:00'];
  }

  private mapOut(m: any) {
    return m ? { ...m, frequency: this.parseFrequency(m.frequency) } : m;
  }

  async list(userId: string) {
    const meds = await this.prisma.medication.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    return meds.map((m) => this.mapOut(m));
  }

  async create(userId: string, d: any) {
    // frequency must be a string per schema
    const frequency = typeof d.frequency === 'object'
      ? JSON.stringify(d.frequency)
      : (d.frequency || 'daily');

    const scheduledTimes = this.extractScheduledTimes(d);

    const totalPills     = d.totalPills     !== undefined && d.totalPills     !== '' ? Number(d.totalPills)     : undefined;
    const remainingPills = d.remainingPills !== undefined && d.remainingPills !== '' ? Number(d.remainingPills) : undefined;

    const created = await this.prisma.medication.create({
      data: {
        userId,
        name: d.name,
        dosage: d.dosage,
        frequency,
        scheduledTimes,
        timesPerDay: scheduledTimes.length || 1,
        startDate: new Date(d.startDate || new Date()),
        endDate: d.endDate ? new Date(d.endDate) : undefined,
        prescribingDoctor: d.prescribingDoctor,
        notes: d.notes,
        isActive: true,
        lastPurchaseDate: d.lastPurchaseDate ? new Date(d.lastPurchaseDate) : undefined,
        totalPills,
        remainingPills,
        // Alimenta o recurso de alerta de estoque baixo (ja existia no scheduler
        // mas nunca era populado por nenhuma tela): espelha remainingPills em
        // stockQuantity e define um limiar padrao de 5 unidades quando aplicavel.
        stockQuantity: remainingPills,
        stockUnit: remainingPills !== undefined ? (d.stockUnit || 'comprimidos') : undefined,
        lowStockAlert: remainingPills !== undefined ? (d.lowStockAlert !== undefined ? Number(d.lowStockAlert) : 5) : undefined,
      },
    });
    return this.mapOut(created);
  }

  update(userId: string, id: string, d: any) {
    const data: any = {};
    if (d.name !== undefined) data.name = d.name;
    if (d.dosage !== undefined) data.dosage = d.dosage;
    if (d.frequency !== undefined) data.frequency = typeof d.frequency === 'object' ? JSON.stringify(d.frequency) : d.frequency;
    if (d.frequency?.times !== undefined || d.scheduledTimes !== undefined || d.times !== undefined) {
      const scheduledTimes = this.extractScheduledTimes(d);
      data.scheduledTimes = scheduledTimes;
      data.timesPerDay = scheduledTimes.length || 1;
    }
    if (d.startDate !== undefined) data.startDate = new Date(d.startDate);
    if (d.endDate !== undefined) data.endDate = d.endDate ? new Date(d.endDate) : null;
    if (d.prescribingDoctor !== undefined) data.prescribingDoctor = d.prescribingDoctor;
    if (d.notes !== undefined) data.notes = d.notes;
    if (d.isActive !== undefined) data.isActive = d.isActive;
    if (d.lastPurchaseDate !== undefined) data.lastPurchaseDate = d.lastPurchaseDate ? new Date(d.lastPurchaseDate) : null;
    if (d.totalPills !== undefined) data.totalPills = d.totalPills !== '' ? Number(d.totalPills) : null;
    if (d.remainingPills !== undefined) {
      const remainingPills = d.remainingPills !== '' ? Number(d.remainingPills) : null;
      data.remainingPills = remainingPills;
      data.stockQuantity = remainingPills;
      if (remainingPills !== null) {
        data.stockUnit = d.stockUnit || 'comprimidos';
        if (d.lowStockAlert !== undefined) data.lowStockAlert = Number(d.lowStockAlert);
      }
    }
    return this.prisma.medication.updateMany({ where: { id, userId }, data });
  }

  remove(userId: string, id: string) {
    return this.prisma.medication.updateMany({ where: { id, userId }, data: { isActive: false } });
  }

  logTaken(medicationId: string, userId: string, d: any) {
    return this.prisma.medicationLog.create({
      data: {
        medicationId,
        userId,
        takenAt: new Date(d.takenAt || d.scheduledAt || new Date()),
        wasSkipped: d.wasSkipped ?? false,
        skipReason: d.skipReason,
        notes: d.notes,
      },
    });
  }

  getAdherence(medicationId: string) {
    return this.prisma.medicationLog.findMany({
      where: { medicationId },
      orderBy: { takenAt: 'desc' },
      take: 30,
    });
  }
}
