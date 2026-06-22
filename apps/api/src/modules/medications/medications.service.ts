import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class MedicationsService {
  constructor(private prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.medication.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  create(userId: string, d: any) {
    return this.prisma.medication.create({
      data: {
        userId,
        name: d.name,
        dosage: d.dosage,
        frequency: d.frequency || { times: ['08:00'], days: ['mon','tue','wed','thu','fri','sat','sun'] },
        startDate: new Date(d.startDate || new Date()),
        endDate: d.endDate ? new Date(d.endDate) : undefined,
        prescribingDoctor: d.prescribingDoctor,
        notes: d.notes,
        isActive: true,
        lastPurchaseDate: d.lastPurchaseDate ? new Date(d.lastPurchaseDate) : undefined,
        totalPills:     d.totalPills     != null ? Number(d.totalPills)     : undefined,
        remainingPills: d.remainingPills != null ? Number(d.remainingPills) :
                        d.totalPills     != null ? Number(d.totalPills)     : undefined,
      },
    });
  }

  update(userId: string, id: string, d: any) {
    const data: any = { ...d };
    if (d.lastPurchaseDate) data.lastPurchaseDate = new Date(d.lastPurchaseDate);
    if (d.totalPills     != null) data.totalPills     = Number(d.totalPills);
    if (d.remainingPills != null) data.remainingPills = Number(d.remainingPills);
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
        scheduledAt: new Date(d.scheduledAt || new Date()),
        takenAt: new Date(),
      },
    });
  }

  getAdherence(medicationId: string) {
    return this.prisma.medicationLog.findMany({
      where: { medicationId },
      orderBy: { scheduledAt: 'desc' },
      take: 30,
    });
  }
}
