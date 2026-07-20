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

      return this.withHealthScore(profile);
    } catch (e: any) {
      // Superfície do erro real (ex.: coluna ausente = build/migration desatualizada).
      this.logger.error(`Falha ao salvar Módulo Vida (user ${userId}): ${e?.message ?? e}`, e?.stack);
      throw new BadRequestException(`Não foi possível salvar os dados de estilo de vida: ${e?.message ?? 'erro desconhecido'}`);
    }
  }

  async get(userId: string) {
    const profile = await this.prisma.lifestyleProfile.findUnique({ where: { userId } });
    return this.withHealthScore(profile);
  }

  /**
   * healthScore/healthScoreNotes são referenciados no frontend (dashboard, vida,
   * trend-report, compartilhamento) mas nunca existiram como coluna no schema —
   * bug conhecido ("coluna não existe"). Em vez de migrar o schema pra persistir
   * um valor derivado, calculamos em tempo real a partir dos campos que já existem
   * (IMC, pressão, tabagismo, álcool, exercício, sono, estresse) e devolvemos junto
   * do perfil. Público: usado também pelo TrendReportService.
   */
  computeHealthScore(p: any): { healthScore: number; healthScoreNotes: string } | null {
    if (!p) return null;

    const BMI_SCORE: Record<string, number> = {
      normal: 20, underweight: 14, overweight: 14, obese_1: 8, obese_2: 4, obese_3: 0,
    };
    const SMOKING_SCORE: Record<string, number> = { never: 15, former: 10, occasional: 5, daily: 0 };
    const ALCOHOL_SCORE: Record<string, number> = { none: 10, occasional: 8, weekly: 5, daily: 0 };
    const EXERCISE_SCORE: Record<string, number> = { '5+x': 15, '3-4x': 12, '1-2x': 7, sedentary: 0 };

    const factors: { key: string; label: string; score: number; max: number }[] = [];

    factors.push({ key: 'bmi', label: 'IMC', score: p.bmiCategory ? (BMI_SCORE[p.bmiCategory] ?? 14) : 14, max: 20 });

    let bpScore = 10; // sem dado — neutro
    if (p.systolicBp != null && p.diastolicBp != null) {
      const s = p.systolicBp, d = p.diastolicBp;
      bpScore = (s < 120 && d < 80) ? 15 : (s < 130 && d < 80) ? 12 : (s < 140 && d < 90) ? 7 : 2;
    }
    factors.push({ key: 'bp', label: 'pressão arterial', score: bpScore, max: 15 });

    factors.push({ key: 'smoking', label: 'tabagismo', score: SMOKING_SCORE[p.smokingStatus ?? 'never'] ?? 15, max: 15 });
    factors.push({ key: 'alcohol', label: 'consumo de álcool', score: ALCOHOL_SCORE[p.alcoholStatus ?? 'none'] ?? 10, max: 10 });
    factors.push({ key: 'exercise', label: 'sedentarismo', score: p.exerciseFrequency ? (EXERCISE_SCORE[p.exerciseFrequency] ?? 7) : 7, max: 15 });

    const sleepScore = p.sleepQuality != null ? (Number(p.sleepQuality) / 5) * 10 : 6;
    factors.push({ key: 'sleep', label: 'qualidade do sono', score: sleepScore, max: 10 });

    const stressScore = p.stressLevel != null ? ((10 - Number(p.stressLevel)) / 10) * 15 : 9;
    factors.push({ key: 'stress', label: 'nível de estresse', score: stressScore, max: 15 });

    const total = factors.reduce((s, f) => s + f.score, 0);
    const healthScore = Math.max(0, Math.min(100, Math.round(total)));

    const weak = factors.filter((f) => f.score / f.max < 0.5).map((f) => f.label);
    const healthScoreNotes = weak.length
      ? `Pontos de atenção: ${weak.join(', ')}.`
      : 'Nenhum fator de risco relevante identificado nos dados informados.';

    return { healthScore, healthScoreNotes };
  }

  private withHealthScore(profile: any) {
    if (!profile) return profile;
    const hs = this.computeHealthScore(profile);
    return hs ? { ...profile, ...hs } : profile;
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
