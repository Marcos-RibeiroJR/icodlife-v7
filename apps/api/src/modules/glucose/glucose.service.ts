// apps/api/src/modules/glucose/glucose.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateGlucoseDto, CreateHbA1cDto } from './dto/create-glucose.dto';

// ── Classificação da glicemia (SBD 2023) ────────────────────────────────────
export type GlucoseAlertLevel =
  | 'critical_low'   // < 54 mg/dL
  | 'low'            // 54–69 mg/dL
  | 'normal'         // 70–99 (jejum) / 70–140 (pós)
  | 'pre_diabetes'   // 100–125 (jejum) / 141–199 (pós)
  | 'high'           // ≥ 126 (jejum) / ≥ 200 (pós)
  | 'critical_high'; // ≥ 400

export interface GlucoseAlertInfo {
  level: GlucoseAlertLevel;
  label: string;
  color: string;
  bgColor: string;
  description: string;
}

const ALERT_MAP: Record<GlucoseAlertLevel, GlucoseAlertInfo> = {
  critical_low:  { level:'critical_low',  label:'Hipoglicemia Grave',   color:'#7f1d1d', bgColor:'#fef2f2', description:'Glicemia crítica (< 54 mg/dL) — ação imediata necessária.' },
  low:           { level:'low',           label:'Hipoglicemia',         color:'#dc2626', bgColor:'#fef2f2', description:'Glicemia baixa (54–69 mg/dL) — consuma carboidratos rápidos.' },
  normal:        { level:'normal',        label:'Normal',               color:'#16a34a', bgColor:'#f0fdf4', description:'Glicemia dentro do alvo.' },
  pre_diabetes:  { level:'pre_diabetes',  label:'Pré-diabetes',         color:'#ca8a04', bgColor:'#fefce8', description:'Glicemia elevada — risco de diabetes. Consulte seu médico.' },
  high:          { level:'high',          label:'Hiperglicemia',        color:'#ea580c', bgColor:'#fff7ed', description:'Glicemia alta — monitore de perto e siga o plano terapêutico.' },
  critical_high: { level:'critical_high', label:'Hiperglicemia Grave',  color:'#7c3aed', bgColor:'#f5f3ff', description:'Glicemia muito alta (≥ 400 mg/dL) — risco de cetoacidose.' },
};

function classifyGlucose(value: number, context: string): GlucoseAlertLevel {
  if (value < 54)  return 'critical_low';
  if (value < 70)  return 'low';
  if (value >= 400) return 'critical_high';

  const isPostMeal = context === 'post_meal';
  const isFasting  = context === 'fasting' || context === 'pre_meal';

  if (isPostMeal) {
    if (value <= 140) return 'normal';
    if (value <= 199) return 'pre_diabetes';
    return 'high';
  }
  if (isFasting) {
    if (value <= 99)  return 'normal';
    if (value <= 125) return 'pre_diabetes';
    return 'high';
  }
  // random / bedtime / post_exercise
  if (value <= 140) return 'normal';
  if (value <= 199) return 'pre_diabetes';
  return 'high';
}

// ── HbA1c → glicemia média estimada (ADAG 2008) ────────────────────────────
function hba1cToEAG(hba1c: number): number {
  return Math.round(28.7 * hba1c - 46.7);
}

// ── Classificação HbA1c ─────────────────────────────────────────────────────
function classifyHbA1c(value: number): { label: string; color: string; description: string } {
  if (value < 5.7) return { label: 'Normal',        color: '#16a34a', description: 'HbA1c normal — controle excelente.' };
  if (value < 6.5) return { label: 'Pré-diabetes',  color: '#ca8a04', description: 'HbA1c limítrofe — risco de diabetes. Consulte seu médico.' };
  if (value < 7.0) return { label: 'Diabetes (meta)', color: '#2563eb', description: 'Dentro da meta terapêutica para a maioria dos diabéticos.' };
  if (value < 8.0) return { label: 'Acima da meta', color: '#ea580c', description: 'HbA1c acima da meta — ajuste de tratamento pode ser necessário.' };
  return { label: 'Alto risco',    color: '#dc2626', description: 'HbA1c muito elevada — risco aumentado de complicações. Avalie com seu médico.' };
}

// ── Regressão linear simples ─────────────────────────────────────────────────
function trend(values: number[]): 'subindo' | 'descendo' | 'estavel' {
  const n = values.length;
  if (n < 3) return 'estavel';
  const xs = values.map((_, i) => i);
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = values.reduce((a, b) => a + b, 0) / n;
  const num = xs.reduce((s, x, i) => s + (x - mx) * (values[i] - my), 0);
  const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  const slope = den === 0 ? 0 : num / den;
  return slope > 1 ? 'subindo' : slope < -1 ? 'descendo' : 'estavel';
}

@Injectable()
export class GlucoseService {
  constructor(private prisma: PrismaService) {}

  // ── Registrar leitura ──────────────────────────────────────────────────────
  async createReading(userId: string, dto: CreateGlucoseDto) {
    const alertLevel = classifyGlucose(dto.value, dto.context);
    const reading = await this.prisma.glucoseReading.create({
      data: {
        userId,
        value:          dto.value,
        context:        dto.context as any,
        measuredAt:     new Date(dto.measuredAt),
        notes:          dto.notes,
        carbsGrams:     dto.carbsGrams,
        insulinUnits:   dto.insulinUnits,
        exerciseBefore: dto.exerciseBefore ?? false,
        sick:           dto.sick ?? false,
        alertLevel,
      },
    });
    return { ...reading, alertInfo: ALERT_MAP[alertLevel] };
  }

  // ── Listar leituras ────────────────────────────────────────────────────────
  async listReadings(userId: string, days?: number) {
    const where: any = { userId };
    if (days) {
      where.measuredAt = { gte: new Date(Date.now() - days * 86_400_000) };
    }
    const readings = await this.prisma.glucoseReading.findMany({
      where, orderBy: { measuredAt: 'desc' },
    });
    return readings.map(r => ({
      ...r,
      alertInfo: ALERT_MAP[(r.alertLevel as GlucoseAlertLevel) ?? 'normal'],
    }));
  }

  // ── Deletar leitura ────────────────────────────────────────────────────────
  async deleteReading(userId: string, id: string) {
    const existing = await this.prisma.glucoseReading.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Leitura não encontrada');
    await this.prisma.glucoseReading.deleteMany({ where: { id, userId } });
    return { message: 'Leitura removida' };
  }

  // ── Registrar HbA1c ────────────────────────────────────────────────────────
  async createHbA1c(userId: string, dto: CreateHbA1cDto) {
    const eAG = hba1cToEAG(dto.value);
    const record = await this.prisma.hbA1cReading.create({
      data: {
        userId,
        value:                dto.value,
        measuredAt:           new Date(dto.measuredAt),
        labName:              dto.labName,
        estimatedAvgGlucose:  eAG,
        notes:                dto.notes,
      },
    });
    return { ...record, classification: classifyHbA1c(dto.value) };
  }

  // ── Listar HbA1c ──────────────────────────────────────────────────────────
  async listHbA1c(userId: string) {
    const records = await this.prisma.hbA1cReading.findMany({
      where: { userId }, orderBy: { measuredAt: 'desc' },
    });
    return records.map(r => ({
      ...r,
      classification: classifyHbA1c(Number(r.value)),
    }));
  }

  // ── Análise completa ──────────────────────────────────────────────────────
  async analyze(userId: string, days = 90) {
    const [readings, hba1cList] = await Promise.all([
      this.prisma.glucoseReading.findMany({
        where: { userId, measuredAt: { gte: new Date(Date.now() - days * 86_400_000) } },
        orderBy: { measuredAt: 'asc' },
      }),
      this.prisma.hbA1cReading.findMany({
        where: { userId }, orderBy: { measuredAt: 'desc' }, take: 6,
      }),
    ]);

    if (readings.length === 0) {
      return {
        totalReadings: 0, avgGlucose: null, minGlucose: null, maxGlucose: null,
        trendGlucose: 'estavel', dominantAlert: 'normal',
        alertDistribution: {}, timeInRange: null,
        fastingAvg: null, postMealAvg: null,
        series: [], alerts: [], recommendations: [],
        hba1cHistory: hba1cList.map(r => ({ ...r, classification: classifyHbA1c(Number(r.value)) })),
      };
    }

    const values = readings.map(r => Number(r.value));
    const n      = values.length;
    const avg    = Math.round(values.reduce((a, b) => a + b, 0) / n);

    // Tempo no alvo (70-180 mg/dL)
    const inRange   = readings.filter(r => Number(r.value) >= 70 && Number(r.value) <= 180).length;
    const belowRange = readings.filter(r => Number(r.value) < 70).length;
    const aboveRange = readings.filter(r => Number(r.value) > 180).length;
    const timeInRange = {
      inRangePct:    Math.round((inRange / n) * 100),
      belowRangePct: Math.round((belowRange / n) * 100),
      aboveRangePct: Math.round((aboveRange / n) * 100),
      inRange, belowRange, aboveRange, total: n,
    };

    // Médias por contexto
    const fastingReadings   = readings.filter(r => r.context === 'fasting');
    const postMealReadings  = readings.filter(r => r.context === 'post_meal');
    const fastingAvg  = fastingReadings.length
      ? Math.round(fastingReadings.reduce((s, r) => s + Number(r.value), 0) / fastingReadings.length)
      : null;
    const postMealAvg = postMealReadings.length
      ? Math.round(postMealReadings.reduce((s, r) => s + Number(r.value), 0) / postMealReadings.length)
      : null;

    // Distribuição de alertas
    const alertDist: Record<string, number> = {};
    readings.forEach(r => {
      const k = r.alertLevel ?? 'normal';
      alertDist[k] = (alertDist[k] ?? 0) + 1;
    });
    const dominantAlert = Object.entries(alertDist).sort((a, b) => b[1] - a[1])[0][0] as GlucoseAlertLevel;

    // Série temporal
    const series = readings.map(r => ({
      date:        r.measuredAt.toISOString(),
      value:       Number(r.value),
      context:     r.context,
      alertLevel:  r.alertLevel,
      alertInfo:   ALERT_MAP[(r.alertLevel as GlucoseAlertLevel) ?? 'normal'],
      notes:       r.notes,
    }));

    // Alertas inteligentes
    const alerts = this.buildAlerts(readings, avg, fastingAvg, postMealAvg, timeInRange, hba1cList);

    // Recomendações
    const recommendations = this.buildRecommendations(alerts, avg, fastingAvg, timeInRange);

    return {
      totalReadings: n,
      avgGlucose: avg,
      minGlucose: Math.min(...values),
      maxGlucose: Math.max(...values),
      trendGlucose: trend(values),
      dominantAlert,
      alertDistribution: alertDist,
      timeInRange,
      fastingAvg,
      postMealAvg,
      series,
      alerts,
      recommendations,
      hba1cHistory: hba1cList.map(r => ({
        ...r,
        classification: classifyHbA1c(Number(r.value)),
      })),
    };
  }

  // ── Alertas inteligentes ──────────────────────────────────────────────────
  private buildAlerts(
    readings: any[], avg: number,
    fastingAvg: number | null, postMealAvg: number | null,
    timeInRange: any, hba1cList: any[],
  ) {
    const alerts: { level: string; title: string; message: string }[] = [];
    const last3 = readings.slice(-3);

    // Hipoglicemia recente
    if (last3.some(r => Number(r.value) < 70)) {
      alerts.push({
        level: 'critical',
        title: '⚠️ Hipoglicemia recente',
        message: 'Uma ou mais leituras recentes indicam hipoglicemia (< 70 mg/dL). Se sentir sintomas, consuma carboidratos de ação rápida.',
      });
    }

    // Hiperglicemia grave recente
    if (last3.some(r => Number(r.value) >= 400)) {
      alerts.push({
        level: 'critical',
        title: '🚨 Hiperglicemia grave detectada',
        message: 'Glicemia ≥ 400 mg/dL nas últimas leituras. Risco de cetoacidose — procure atendimento médico.',
      });
    }

    // Tempo no alvo ruim
    if (timeInRange.belowRangePct > 10) {
      alerts.push({
        level: 'danger',
        title: '📉 Alto tempo abaixo do alvo',
        message: `${timeInRange.belowRangePct}% das suas leituras estão abaixo de 70 mg/dL. Risco aumentado de hipoglicemia.`,
      });
    }
    if (timeInRange.aboveRangePct > 25) {
      alerts.push({
        level: 'warning',
        title: '📈 Alto tempo acima do alvo',
        message: `${timeInRange.aboveRangePct}% das suas leituras estão acima de 180 mg/dL. Avalie com seu médico.`,
      });
    }

    // Jejum elevado
    if (fastingAvg && fastingAvg >= 126) {
      alerts.push({
        level: 'danger',
        title: '🔴 Glicemia de jejum elevada',
        message: `Sua média de jejum é ${fastingAvg} mg/dL — acima de 126 mg/dL, critério diagnóstico para diabetes. Consulte seu médico.`,
      });
    } else if (fastingAvg && fastingAvg >= 100) {
      alerts.push({
        level: 'warning',
        title: '🟠 Glicemia de jejum limítrofe',
        message: `Média de jejum de ${fastingAvg} mg/dL — faixa de pré-diabetes (100-125 mg/dL). Atenção ao estilo de vida.`,
      });
    }

    // HbA1c elevada
    const lastHba1c = hba1cList[0];
    if (lastHba1c && Number(lastHba1c.value) >= 8.0) {
      alerts.push({
        level: 'danger',
        title: '🔴 HbA1c acima de 8%',
        message: `Última HbA1c: ${lastHba1c.value}% — acima da meta recomendada. Risco aumentado de complicações crônicas.`,
      });
    }

    return alerts;
  }

  // ── Recomendações ────────────────────────────────────────────────────────
  private buildRecommendations(alerts: any[], avg: number, fastingAvg: number | null, timeInRange: any) {
    const recs: string[] = [];

    if (alerts.some(a => a.level === 'critical')) {
      recs.push('🏥 Procure seu médico o quanto antes para avaliar seu controle glicêmico.');
    }
    if (timeInRange.belowRangePct > 5) {
      recs.push('🍬 Para hipoglicemias, tenha sempre sachês de mel ou suco de frutas disponíveis.');
      recs.push('⏰ Não fique longos períodos em jejum — faça pequenos lanches a cada 3-4 horas.');
    }
    if (avg > 140 || (fastingAvg && fastingAvg > 100)) {
      recs.push('🥗 Reduza carboidratos refinados (pão branco, arroz branco, açúcar). Prefira integrais.');
      recs.push('🏃 30 minutos de caminhada após as refeições reduzem a glicemia pós-prandial em 20-30 mg/dL.');
      recs.push('💧 Hidrate-se bem — a desidratação concentra a glicose no sangue.');
      recs.push('📏 Meça a glicemia sempre nos mesmos horários para comparações precisas.');
    }
    if (timeInRange.inRangePct >= 70) {
      recs.push('✅ Excelente controle! Mais de 70% das suas leituras estão dentro do alvo (70-180 mg/dL).');
    }
    recs.push('📋 Leve este relatório na próxima consulta com seu médico ou endocrinologista.');

    return [...new Set(recs)];
  }

  // ── Classificar valor pontual ─────────────────────────────────────────────
  classify(value: number, context: string) {
    const level = classifyGlucose(value, context);
    return { value, context, alertLevel: level, alertInfo: ALERT_MAP[level] };
  }
}
