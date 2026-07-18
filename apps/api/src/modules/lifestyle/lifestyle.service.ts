// apps/api/src/modules/lifestyle/lifestyle.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class LifestyleService {
  private readonly logger = new Logger(LifestyleService.name);
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

  async upsert(userId: string, dto: any) {
    // Coerção de tipos: a tela pode enviar números como texto e reenviar campos
    // extras do perfil (id, userId, timestamps). Aqui só aceitamos campos conhecidos,
    // no tipo correto — nada de rejeitar a requisição inteira.
    const num = (v: any) => (v === '' || v === null || v === undefined || isNaN(Number(v))) ? undefined : Number(v);
    const int = (v: any) => { const n = num(v); return n === undefined ? undefined : Math.round(n); };
    const bool = (v: any) => typeof v === 'boolean' ? v : v === 'true' ? true : v === 'false' ? false : undefined;
    const arr = (v: any) => Array.isArray(v) ? v : undefined;
    const str = (v: any) => (typeof v === 'string' && v.trim() !== '') ? v.trim() : undefined;
    const date = (v: any) => { if (!v) return undefined; const d = new Date(v); return isNaN(d.getTime()) ? undefined : d; };

    const heightCm = num(dto.heightCm);
    const weightKg = num(dto.weightKg);
    let bmi: number | undefined;
    let bmiCategory: string | undefined;
    if (heightCm && weightKg) {
      const calc = this.calcBmi(heightCm, weightKg);
      bmi = calc.bmi;
      bmiCategory = calc.bmiCategory;
    }

    const data: any = {
      // Biometria
      heightCm, weightKg, waistCm: num(dto.waistCm), bmi, bmiCategory,
      systolicBp: int(dto.systolicBp), diastolicBp: int(dto.diastolicBp),
      // Tabagismo
      smokingStatus: str(dto.smokingStatus), cigarettesPerDay: int(dto.cigarettesPerDay),
      smokingYears: int(dto.smokingYears), quitDate: date(dto.quitDate),
      // Álcool
      alcoholStatus: str(dto.alcoholStatus), drinksPerWeek: int(dto.drinksPerWeek), alcoholTypes: arr(dto.alcoholTypes),
      // Atividade física
      exerciseFrequency: str(dto.exerciseFrequency), exerciseTypes: arr(dto.exerciseTypes), exerciseMinutes: int(dto.exerciseMinutes),
      // Sono / emocional
      sleepHoursAvg: num(dto.sleepHoursAvg), sleepQuality: int(dto.sleepQuality),
      stressLevel: int(dto.stressLevel), moodAvg: int(dto.moodAvg),
      mentalHealthDiagnoses: arr(dto.mentalHealthDiagnoses), therapyFrequency: str(dto.therapyFrequency),
      // Sexual / reprodutivo
      sexuallyActive: bool(dto.sexuallyActive), contraceptionType: str(dto.contraceptionType), stdProtection: bool(dto.stdProtection),
      // Trabalho
      workHoursPerWeek: int(dto.workHoursPerWeek), workEnvironment: str(dto.workEnvironment),
      ergonomicRisk: int(dto.ergonomicRisk), occupationalChemicals: bool(dto.occupationalChemicals),
      // Alimentação
      dietType: str(dto.dietType), mealsPerDay: int(dto.mealsPerDay), waterLitersDay: num(dto.waterLitersDay),
      // Localização
      cityName: str(dto.cityName), stateCode: str(dto.stateCode), ibgeCode: str(dto.ibgeCode),
    };

    // Remove campos indefinidos (não sobrescreve o que não veio no formulário).
    Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);

    try {
      const profile = await this.prisma.lifestyleProfile.upsert({
        where: { userId },
        create: { userId, alcoholTypes: [], exerciseTypes: [], mentalHealthDiagnoses: [], ...data },
        update: data,
      });

      // Snapshot histórico (série temporal de peso/IMC) — só quando há biometria.
      if (heightCm !== undefined || weightKg !== undefined || bmi !== undefined) {
        await this.prisma.lifestyleSnapshot.create({
          data: { userId, heightCm, weightKg, bmi },
        });
      }

      return profile;
    } catch (e: any) {
      // Superfície do erro real (ex.: coluna ausente = build/migration desatualizada).
      this.logger.error(`Falha ao salvar Módulo Vida (user ${userId}): ${e?.message ?? e}`, e?.stack);
      throw new BadRequestException(`Não foi possível salvar os dados de estilo de vida: ${e?.message ?? 'erro desconhecido'}`);
    }
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
