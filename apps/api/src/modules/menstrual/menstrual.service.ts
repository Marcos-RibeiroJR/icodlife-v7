// apps/api/src/modules/menstrual/menstrual.service.ts
import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class MenstrualService {
  constructor(private prisma: PrismaService) {}

  private async checkAccess(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['female', 'other'].includes(user.gender)) {
      throw new ForbiddenException('Módulo disponível apenas para usuárias femininas e other');
    }
    return user;
  }

  async startCycle(userId: string, dto: {
    cycleStart?: string;
    startDate?: string;
    notes?: string;
  }) {
    await this.checkAccess(userId);
    const startDate = new Date(dto.startDate || dto.cycleStart || new Date());

    return this.prisma.menstrualCycle.create({
      data: {
        userId,
        startDate,
        notes: dto.notes,
      },
    });
  }

  async logDay(userId: string, dto: {
    loggedDate?: string;
    date?: string;
    flow?: string;
    symptoms?: string[];
    mood?: string | string[];
    temperature?: number;
    notes?: string;
  }) {
    await this.checkAccess(userId);

    const date = new Date(dto.date || dto.loggedDate || new Date());
    // mood: schema is String?, service may send array — take first element
    const mood = Array.isArray(dto.mood) ? (dto.mood[0] ?? null) : (dto.mood ?? null);

    // No compound unique on userId+date — manual upsert
    const existing = await this.prisma.menstrualDailyLog.findFirst({
      where: { userId, date },
    });

    if (existing) {
      return this.prisma.menstrualDailyLog.update({
        where: { id: existing.id },
        data: {
          flow: dto.flow,
          symptoms: dto.symptoms,
          mood,
          temperature: dto.temperature,
          notes: dto.notes,
        },
      });
    }

    return this.prisma.menstrualDailyLog.create({
      data: {
        userId,
        date,
        flow: dto.flow,
        symptoms: dto.symptoms ?? [],
        mood,
        temperature: dto.temperature,
        notes: dto.notes,
      },
    });
  }

  async getStats(userId: string) {
    await this.checkAccess(userId);

    const cycles = await this.prisma.menstrualCycle.findMany({
      where: { userId },
      orderBy: { startDate: 'desc' },
      take: 12,
    });

    const { avgLength, avgPeriod } = await this.getAverageCycleData(userId);
    const lastCycle = cycles[0];

    let currentPhase: string | null = null;
    if (lastCycle) {
      currentPhase = this.calculatePhase(lastCycle.startDate, avgLength);
    }

    // Sintomas mais frequentes (from daily logs)
    const dailyLogs = await this.prisma.menstrualDailyLog.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 100,
    });
    const allSymptoms = dailyLogs.flatMap(d => d.symptoms);
    const symptomCount: Record<string, number> = {};
    allSymptoms.forEach(s => { symptomCount[s] = (symptomCount[s] || 0) + 1; });
    const topSymptoms = Object.entries(symptomCount)
      .sort(([,a],[,b]) => b - a)
      .slice(0, 5)
      .map(([symptom, count]) => ({ symptom, count }));

    // Predict next cycle
    const nextCyclePredicted = lastCycle
      ? new Date(lastCycle.startDate.getTime() + avgLength * 86_400_000)
      : null;

    return {
      cycleCount: cycles.length,
      averageCycleLength: avgLength,
      averagePeriodLength: avgPeriod,
      currentPhase,
      nextCyclePredicted,
      topSymptoms,
      cycles: cycles.slice(0, 6),
    };
  }

  async getCalendar(userId: string) {
    await this.checkAccess(userId);

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const [cycles, dailyLogs] = await Promise.all([
      this.prisma.menstrualCycle.findMany({
        where: { userId, startDate: { gte: threeMonthsAgo } },
        orderBy: { startDate: 'asc' },
      }),
      this.prisma.menstrualDailyLog.findMany({
        where: { userId, date: { gte: threeMonthsAgo } },
        orderBy: { date: 'asc' },
      }),
    ]);

    return { cycles, dailyLogs };
  }

  private async getAverageCycleData(userId: string) {
    const cycles = await this.prisma.menstrualCycle.findMany({
      where: { userId, cycleLength: { not: null } },
      orderBy: { startDate: 'desc' },
      take: 6,
    });

    const avgLength = cycles.length > 0
      ? Math.round(cycles.reduce((s, c) => s + (c.cycleLength ?? 28), 0) / cycles.length)
      : 28;
    const avgPeriod = cycles.length > 0
      ? Math.round(cycles.reduce((s, c) => s + (c.periodLength ?? 5), 0) / cycles.length)
      : 5;

    return { avgLength, avgPeriod };
  }

  private calculatePhase(startDate: Date, cycleLength: number): string {
    const today = new Date();
    const dayOfCycle = Math.round((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const ovDay = Math.round(cycleLength / 2) - 1;

    if (dayOfCycle <= 5) return 'menstrual';
    if (dayOfCycle <= ovDay - 2) return 'follicular';
    if (dayOfCycle <= ovDay + 2) return 'ovulation';
    return 'luteal';
  }
}
