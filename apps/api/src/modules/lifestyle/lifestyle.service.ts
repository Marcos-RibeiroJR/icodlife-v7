// apps/api/src/modules/lifestyle/lifestyle.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpsertLifestyleDto } from './dto/upsert-lifestyle.dto';

@Injectable()
export class LifestyleService {
  constructor(private prisma: PrismaService) {}

  private calcBmi(height: number, weight: number): { bmi: number; bmiCategory: string } {
    const bmi = weight / Math.pow(height / 100, 2);
    let bmiCategory = 'normal';
    if (bmi < 18.5)      bmiCategory = 'underweight';
    else if (bmi < 25)   bmiCategory = 'normal';
    else if (bmi < 30)   bmiCategory = 'overweight';
    else if (bmi < 35)   bmiCategory = 'obese_1';
    else if (bmi < 40)   bmiCategory = 'obese_2';
    else                 bmiCategory = 'obese_3';
    return { bmi: Math.round(bmi * 10) / 10, bmiCategory };
  }

  private calcHealthScore(dto: UpsertLifestyleDto, bmi?: number): { score: number; notes: string } {
    let score = 100;
    const issues: string[] = [];

    // BMI (0–20 pts)
    if (bmi) {
      if (bmi < 18.5 || bmi >= 30)     { score -= 20; issues.push('IMC fora da faixa saudável'); }
      else if (bmi >= 25)               { score -= 10; issues.push('Sobrepeso'); }
    }

    // Tabagismo (0–20 pts)
    if (dto.smokingStatus === 'daily')      { score -= 20; issues.push('Tabagismo diário'); }
    else if (dto.smokingStatus === 'occasional') { score -= 10; issues.push('Tabagismo ocasional'); }

    // Álcool (0–15 pts)
    if (dto.alcoholStatus === 'daily')      { score -= 15; issues.push('Consumo diário de álcool'); }
    else if (dto.alcoholStatus === 'weekly') { score -= 8; issues.push('Consumo semanal de álcool'); }

    // Exercício (0–15 pts)
    if (dto.exerciseFrequency === 'sedentary') { score -= 15; issues.push('Sedentarismo'); }
    else if (dto.exerciseFrequency === '1-2x')  { score -= 5; }

    // Sono (0–10 pts)
    if (dto.sleepHoursAvg) {
      if (dto.sleepHoursAvg < 6 || dto.sleepHoursAvg > 9) { score -= 10; issues.push('Sono inadequado'); }
    }
    if (dto.sleepQuality && dto.sleepQuality <= 2) { score -= 5; issues.push('Qualidade do sono ruim'); }

    // Estresse (0–10 pts)
    if (dto.stressLevel && dto.stressLevel >= 8) { score -= 10; issues.push('Nível de estresse muito alto'); }
    else if (dto.stressLevel && dto.stressLevel >= 6) { score -= 5; issues.push('Estresse moderado a alto'); }

    // Pressão Arterial (0–15 pts)
    if (dto.systolicBp && dto.diastolicBp) {
      if (dto.systolicBp >= 180 || dto.diastolicBp >= 110)     { score -= 15; issues.push('Hipertensão grave (PA ≥180/110)'); }
      else if (dto.systolicBp >= 140 || dto.diastolicBp >= 90) { score -= 10; issues.push('Hipertensão arterial'); }
      else if (dto.systolicBp >= 130 || dto.diastolicBp >= 80) { score -= 5;  issues.push('Pressão arterial elevada'); }
    }

    // Trabalho (0–10 pts)
    if (dto.workHoursPerWeek && dto.workHoursPerWeek > 50) { score -= 10; issues.push('Carga horária excessiva'); }
    else if (dto.workHoursPerWeek && dto.workHoursPerWeek > 44) { score -= 5; }

    score = Math.max(0, score);
    const notes = issues.length > 0
      ? `Pontos de melhoria identificados: ${issues.join(', ')}.`
      : 'Excelente! Seus hábitos de vida estão dentro dos parâmetros saudáveis.';

    return { score, notes };
  }

  async upsert(userId: string, dto: UpsertLifestyleDto) {
    let bmi: number | undefined;
    let bmiCategory: string | undefined;

    if (dto.heightCm && dto.weightKg) {
      const calc = this.calcBmi(Number(dto.heightCm), Number(dto.weightKg));
      bmi = calc.bmi;
      bmiCategory = calc.bmiCategory;
    }

    const { score, notes } = this.calcHealthScore(dto, bmi);

    const data: any = {
      heightCm: dto.heightCm,
      weightKg: dto.weightKg,
      waistCm:  dto.waistCm,
      systolicBp:  dto.systolicBp,
      diastolicBp: dto.diastolicBp,
      bmi,
      bmiCategory,
      smokingStatus:       dto.smokingStatus,
      cigarettesPerDay:    dto.cigarettesPerDay,
      smokingYears:        dto.smokingYears,
      quitDate:            dto.quitDate ? new Date(dto.quitDate) : undefined,
      alcoholStatus:       dto.alcoholStatus,
      drinksPerWeek:       dto.drinksPerWeek,
      alcoholTypes:        dto.alcoholTypes,
      exerciseFrequency:   dto.exerciseFrequency,
      exerciseTypes:       dto.exerciseTypes,
      exerciseMinutes:     dto.exerciseMinutes,
      sleepHoursAvg:       dto.sleepHoursAvg,
      sleepQuality:        dto.sleepQuality,
      stressLevel:         dto.stressLevel,
      moodAvg:             dto.moodAvg,
      mentalHealthDiagnoses: dto.mentalHealthDiagnoses,
      therapyFrequency:    dto.therapyFrequency,
      sexuallyActive:      dto.sexuallyActive,
      contraceptionType:   dto.contraceptionType,
      stdProtection:       dto.stdProtection,
      workHoursPerWeek:    dto.workHoursPerWeek,
      workEnvironment:     dto.workEnvironment,
      ergonomicRisk:       dto.ergonomicRisk,
      occupationalChemicals: dto.occupationalChemicals,
      dietType:            dto.dietType,
      mealsPerDay:         dto.mealsPerDay,
      waterLitersDay:      dto.waterLitersDay,
      healthScore:         score,
      healthScoreNotes:    notes,
    };

    // Remove undefined
    Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);

    const profile = await this.prisma.lifestyleProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });

    // Salvar snapshot para histórico/BigData
    await this.prisma.lifestyleSnapshot.create({
      data: {
        userId,
        profileId: profile.id,
        data: data,
        cityName: dto.cityName,
        stateCode: dto.stateCode,
        ibgeCode: dto.ibgeCode,
        bmi: bmi,
        healthScore: score,
      },
    });

    return profile;
  }

  async get(userId: string) {
    return this.prisma.lifestyleProfile.findUnique({ where: { userId } });
  }

  async history(userId: string) {
    return this.prisma.lifestyleSnapshot.findMany({
      where: { userId },
      orderBy: { snapshotDate: 'desc' },
      take: 24,
      select: { snapshotDate: true, bmi: true, healthScore: true, cityName: true, stateCode: true },
    });
  }

  // Endpoint para análise regional (futuro BigData — anonimizado)
  async regionalStats(stateCode: string) {
    const snaps = await this.prisma.lifestyleSnapshot.findMany({
      where: { stateCode },
      take: 10000,
      select: { bmi: true, healthScore: true, snapshotDate: true },
    });
    if (snaps.length === 0) return { state: stateCode, count: 0 };

    const bmis = snaps.filter(s => s.bmi).map(s => Number(s.bmi));
    const scores = snaps.filter(s => s.healthScore).map(s => Number(s.healthScore));
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

    return {
      state: stateCode,
      count: snaps.length,
      avgBmi: bmis.length ? Math.round(avg(bmis) * 10) / 10 : null,
      avgHealthScore: scores.length ? Math.round(avg(scores)) : null,
    };
  }
}
