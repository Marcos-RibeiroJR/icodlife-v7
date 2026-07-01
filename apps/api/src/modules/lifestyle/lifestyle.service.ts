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

  async upsert(userId: string, dto: UpsertLifestyleDto) {
    let bmi: number | undefined;
    let bmiCategory: string | undefined;

    if (dto.heightCm && dto.weightKg) {
      const calc = this.calcBmi(Number(dto.heightCm), Number(dto.weightKg));
      bmi = calc.bmi;
      bmiCategory = calc.bmiCategory;
    }

    const data: any = {
      // Biometria
      heightCm:                dto.heightCm,
      weightKg:                dto.weightKg,
      waistCm:                 dto.waistCm,
      bmi,
      bmiCategory,
      systolicBp:              dto.systolicBp,
      diastolicBp:             dto.diastolicBp,
      // Tabagismo
      smokingStatus:           dto.smokingStatus,
      cigarettesPerDay:        dto.cigarettesPerDay,
      smokingYears:            dto.smokingYears,
      quitDate:                dto.quitDate ? new Date(dto.quitDate) : undefined,
      // Álcool
      alcoholStatus:           dto.alcoholStatus,
      drinksPerWeek:           dto.drinksPerWeek,
      alcoholTypes:            dto.alcoholTypes,
      // Atividade física
      exerciseFrequency:       dto.exerciseFrequency,
      exerciseTypes:           dto.exerciseTypes,
      exerciseMinutes:         dto.exerciseMinutes,
      // Sono / emocional
      sleepHoursAvg:           dto.sleepHoursAvg,
      sleepQuality:            dto.sleepQuality   !== undefined ? Number(dto.sleepQuality)   : undefined,
      stressLevel:             dto.stressLevel    !== undefined ? Number(dto.stressLevel)    : undefined,
      moodAvg:                 dto.moodAvg        !== undefined ? Number(dto.moodAvg)        : undefined,
      mentalHealthDiagnoses:   dto.mentalHealthDiagnoses,
      therapyFrequency:        dto.therapyFrequency,
      // Sexual / reprodutivo
      sexuallyActive:          dto.sexuallyActive,
      contraceptionType:       dto.contraceptionType,
      stdProtection:           dto.stdProtection,
      // Trabalho
      workHoursPerWeek:        dto.workHoursPerWeek,
      workEnvironment:         dto.workEnvironment,
      ergonomicRisk:           dto.ergonomicRisk,
      occupationalChemicals:   dto.occupationalChemicals,
      // Alimentação
      dietType:                dto.dietType,
      mealsPerDay:             dto.mealsPerDay,
      waterLitersDay:          dto.waterLitersDay,
      // Localização
      cityName:                dto.cityName,
      stateCode:               dto.stateCode,
      ibgeCode:                dto.ibgeCode,
    };

    // Remove undefined fields
    Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);

    const profile = await this.prisma.lifestyleProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });

    // Save snapshot — only fields that exist on LifestyleSnapshot
    await this.prisma.lifestyleSnapshot.create({
      data: {
        userId,
        heightCm: bmi ? dto.heightCm : undefined,
        weightKg: dto.weightKg,
        bmi,
        notes: undefined,
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
      orderBy: { snapshotAt: 'desc' },
      take: 24,
      select: { snapshotAt: true, bmi: true, weightKg: true, heightCm: true },
    });
  }

  // Regional stats — LifestyleSnapshot has no stateCode; return minimal data
  async regionalStats(stateCode: string) {
    return { state: stateCode, count: 0, message: 'Dados regionais não disponíveis nesta versão' };
  }
}
