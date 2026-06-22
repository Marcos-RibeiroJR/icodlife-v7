// apps/api/src/modules/menstrual/menstrual.service.ts
import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class MenstrualService {
  constructor(private prisma: PrismaService) {}

  // Verificar acesso — apenas usuárias femininas/other
  private async checkAccess(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['female', 'other'].includes(user.gender)) {
      throw new ForbiddenException('Módulo disponível apenas para usuárias femininas e other');
    }
    return user;
  }

  // ── REGISTRAR INÍCIO DE CICLO ─────────────────────────────────────────────

  async startCycle(userId: string, dto: {
    cycleStart: string;
    flowIntensity?: number;
    symptoms?: string[];
    notes?: string;
  }) {
    await this.checkAccess(userId);

    // Calcular previsão baseada no histórico
    const { avgLength, avgPeriod } = await this.getAverageCycleData(userId);
    const startDate = new Date(dto.cycleStart);
    const nextPredicted = new Date(startDate);
    nextPredicted.setDate(nextPredicted.getDate() + avgLength);
    const ovulationPredicted = new Date(startDate);
    ovulationPredicted.setDate(ovulationPredicted.getDate() + Math.round(avgLength / 2) - 1);

    return this.prisma.menstrualCycle.create({
      data: {
        userId,
        cycleStart: startDate,
        flowIntensity: dto.flowIntensity,
        symptoms: dto.symptoms ?? [],
        notes: dto.notes,
        currentPhase: 'menstrual',
        nextCyclePredicted: nextPredicted,
        ovulationPredicted,
      },
    });
  }

  // ── LOG DIÁRIO ────────────────────────────────────────────────────────────

  async logDay(userId: string, dto: {
    loggedDate: string;
    flowIntensity?: number;
    symptoms?: string[];
    mood?: string[];
    basalTemp?: number;
    cervicalMucus?: string;
    notes?: string;
  }) {
    await this.checkAccess(userId);

    return this.prisma.menstrualDailyLog.upsert({
      where: { userId_loggedDate: { userId, loggedDate: new Date(dto.loggedDate) } },
      create: {
        userId,
        loggedDate: new Date(dto.loggedDate),
        flowIntensity: dto.flowIntensity,
        symptoms: dto.symptoms ?? [],
        mood: dto.mood ?? [],
        basalTemp: dto.basalTemp,
        cervicalMucus: dto.cervicalMucus,
        notes: dto.notes,
      },
      update: {
        flowIntensity: dto.flowIntensity,
        symptoms: dto.symptoms,
        mood: dto.mood,
        basalTemp: dto.basalTemp,
        cervicalMucus: dto.cervicalMucus,
        notes: dto.notes,
      },
    });
  }

  // ── ESTATÍSTICAS E PREDIÇÕES ──────────────────────────────────────────────

  async getStats(userId: string) {
    await this.checkAccess(userId);

    const cycles = await this.prisma.menstrualCycle.findMany({
      where: { userId },
      orderBy: { cycleStart: 'desc' },
      take: 12,
    });

    const { avgLength, avgPeriod } = await this.getAverageCycleData(userId);
    const lastCycle = cycles[0];

    let currentPhase: string | null = null;
    let daysUntilNext: number | null = null;

    if (lastCycle?.nextCyclePredicted) {
      const today = new Date();
      const diffDays = Math.round(
        (lastCycle.nextCyclePredicted.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      daysUntilNext = diffDays;
      currentPhase = this.calculatePhase(lastCycle.cycleStart, avgLength);
    }

    // Sintomas mais frequentes
    const allSymptoms = cycles.flatMap(c => c.symptoms);
    const symptomCount: Record<string, number> = {};
    allSymptoms.forEach(s => { symptomCount[s] = (symptomCount[s] || 0) + 1; });
    const topSymptoms = Object.entries(symptomCount)
      .sort(([,a],[,b]) => b - a)
      .slice(0, 5)
      .map(([symptom, count]) => ({ symptom, count }));

    return {
      cycleCount: cycles.length,
      averageCycleLength: avgLength,
      averagePeriodLength: avgPeriod,
      currentPhase,
      daysUntilNextCycle: daysUntilNext,
      nextCyclePredicted: lastCycle?.nextCyclePredicted,
      ovulationPredicted: lastCycle?.ovulationPredicted,
      topSymptoms,
      cycles: cycles.slice(0, 6),
    };
  }

  // ── CALENDÁRIO (últimos 3 meses) ──────────────────────────────────────────

  async getCalendar(userId: string) {
    await this.checkAccess(userId);

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const [cycles, dailyLogs] = await Promise.all([
      this.prisma.menstrualCycle.findMany({
        where: { userId, cycleStart: { gte: threeMonthsAgo } },
        orderBy: { cycleStart: 'asc' },
      }),
      this.prisma.menstrualDailyLog.findMany({
        where: { userId, loggedDate: { gte: threeMonthsAgo } },
        orderBy: { loggedDate: 'asc' },
      }),
    ]);

    return { cycles, dailyLogs };
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────

  private async getAverageCycleData(userId: string) {
    const cycles = await this.prisma.menstrualCycle.findMany({
      where: { userId, cycleLength: { not: null } },
      orderBy: { cycleStart: 'desc' },
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

  private calculatePhase(cycleStart: Date, cycleLength: number): string {
    const today = new Date();
    const dayOfCycle = Math.round((today.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24));
    const ovDay = Math.round(cycleLength / 2) - 1;

    if (dayOfCycle <= 5) return 'menstrual';
    if (dayOfCycle <= ovDay - 2) return 'follicular';
    if (dayOfCycle <= ovDay + 2) return 'ovulation';
    return 'luteal';
  }
}
