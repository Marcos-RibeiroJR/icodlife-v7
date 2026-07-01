import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class MedicationsService {
  constructor(private prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.medication.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  create(userId: string, d: any) {
    // frequency must be a string per schema
    const frequency = typeof d.frequency === 'object'
      ? JSON.stringify(d.frequency)
      : (d.frequency || 'daily');

    return this.prisma.medication.create({
      data: {
        userId,
        name: d.name,
        dosage: d.dosage,
        frequency,
        startDate: new Date(d.startDate || new Date()),
        endDate: d.endDate ? new Date(d.endDate) : undefined,
        prescribingDoctor: d.prescribingDoctor,
        notes: d.notes,
        isActive: true,
      },
    });
  }

  update(userId: string, id: string, d: any) {
    const data: any = {};
    if (d.name !== undefined) data.name = d.name;
    if (d.dosage !== undefined) data.dosage = d.dosage;
    if (d.frequency !== undefined) data.frequency = typeof d.frequency === 'object' ? JSON.stringify(d.frequency) : d.frequency;
    if (d.startDate !== undefined) data.startDate = new Date(d.startDate);
    if (d.endDate !== undefined) data.endDate = d.endDate ? new Date(d.endDate) : null;
    if (d.prescribingDoctor !== undefined) data.prescribingDoctor = d.prescribingDoctor;
    if (d.notes !== undefined) data.notes = d.notes;
    if (d.isActive !== undefined) data.isActive = d.isActive;
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
