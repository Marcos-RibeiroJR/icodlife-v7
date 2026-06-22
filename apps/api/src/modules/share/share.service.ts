import { Injectable, GoneException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ShareService {
  constructor(private prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.shareToken.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  create(userId: string, d: any) {
    return this.prisma.shareToken.create({
      data: {
        userId,
        accessLevel: (d.accessLevel || 'basic') as any,
        customFields: d.customFields || [],
        expiresAt: new Date(Date.now() + (d.durationHours || 1) * 3_600_000),
      },
    });
  }

  async revoke(userId: string, id: string) {
    await this.prisma.shareToken.updateMany({ where: { id, userId }, data: { revokedAt: new Date() } });
    return { message: 'Revogado' };
  }

  async view(token: string, ip: string) {
    const t = await this.prisma.shareToken.findFirst({
      where: { token, revokedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!t) throw new GoneException('Link expirado ou inválido');

    await this.prisma.shareToken.update({
      where: { id: t.id },
      data: { accessedAt: new Date(), accessIp: ip },
    });

    // Always fetch basic user info
    const user = await this.prisma.user.findUnique({
      where: { id: t.userId },
      select: {
        fullName: true,
        birthDate: true,
        gender: true,
        bloodType: true,
        allergies: true,
        isDonor: true,
        chronicConditions: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
      },
    });

    const payload: any = { token: t, user };

    if (t.accessLevel === 'full' || t.accessLevel === 'custom') {
      // Recent exam results (last 10)
      const exams = await this.prisma.examResult.findMany({
        where: { userId: t.userId },
        orderBy: { examDate: 'desc' },
        take: 10,
        select: {
          id: true, examType: true, examDate: true,
          results: true, normalRangeMin: true, normalRangeMax: true, unit: true,
        },
      });

      // Active medications
      const medications = await this.prisma.medication.findMany({
        where: { userId: t.userId, isActive: true },
        select: { name: true, dosage: true, frequency: true, condition: true },
      });

      // Last 5 BP readings
      const bpReadings = await (this.prisma as any).bloodPressureReading?.findMany({
        where: { userId: t.userId },
        orderBy: { measuredAt: 'desc' },
        take: 5,
        select: { systolic: true, diastolic: true, pulse: true, measuredAt: true, classification: true },
      }).catch(() => []);

      payload.exams       = exams;
      payload.medications = medications;
      payload.bpReadings  = bpReadings ?? [];
    }

    return payload;
  }
}
