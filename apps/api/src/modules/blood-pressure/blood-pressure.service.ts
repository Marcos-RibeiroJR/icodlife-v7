// apps/api/src/modules/blood-pressure/blood-pressure.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateBpReadingDto } from './dto/create-bp-reading.dto';

// ── Classificação SBH 2020 (Sociedade Brasileira de Hipertensão) ─────────────
export type BpClass = 'normal' | 'elevado' | 'hipertensao1' | 'hipertensao2' | 'crise';

export interface BpClassInfo {
  key: BpClass;
  label: string;
  color: string;     // hex
  bgColor: string;
  description: string;
}

const BP_CLASSES: Record<BpClass, BpClassInfo> = {
  normal:       { key:'normal',       label:'Normal',             color:'#16a34a', bgColor:'#f0fdf4', description:'Pressão dentro do ideal.' },
  elevado:      { key:'elevado',      label:'Elevado',            color:'#ca8a04', bgColor:'#fefce8', description:'Pressão ligeiramente alta — atenção ao estilo de vida.' },
  hipertensao1: { key:'hipertensao1', label:'Hipertensão Grau 1', color:'#ea580c', bgColor:'#fff7ed', description:'Hipertensão estágio 1 — consulte um médico.' },
  hipertensao2: { key:'hipertensao2', label:'Hipertensão Grau 2', color:'#dc2626', bgColor:'#fef2f2', description:'Hipertensão estágio 2 — acompanhamento médico necessário.' },
  crise:        { key:'crise',        label:'Crise Hipertensiva', color:'#7f1d1d', bgColor:'#fef2f2', description:'Crise hipertensiva — procure atendimento imediato.' },
};

function classify(systolic: number, diastolic: number): BpClass {
  if (systolic >= 180 || diastolic >= 120) return 'crise';
  if (systolic >= 140 || diastolic >= 90)  return 'hipertensao2';
  if (systolic >= 130 || diastolic >= 80)  return 'hipertensao1';
  if (systolic >= 120 && diastolic < 80)   return 'elevado';
  return 'normal';
}

// ── Regressão linear simples ─────────────────────────────────────────────────
function linearRegression(values: number[]): { slope: number; trend: 'subindo' | 'descendo' | 'estavel' } {
  const n = values.length;
  if (n < 2) return { slope: 0, trend: 'estavel' };
  const xs = values.map((_, i) => i);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = values.reduce((a, b) => a + b, 0) / n;
  const num   = xs.reduce((s, x, i) => s + (x - meanX) * (values[i] - meanY), 0);
  const den   = xs.reduce((s, x) => s + (x - meanX) ** 2, 0);
  const slope = den === 0 ? 0 : num / den;
  const trend = slope > 0.3 ? 'subindo' : slope < -0.3 ? 'descendo' : 'estavel';
  return { slope, trend };
}

export interface BpTrendReport {
  totalReadings: number;
  avgSystolic: number;
  avgDiastolic: number;
  avgPulse: number | null;
  maxSystolic: number;
  minSystolic: number;
  maxDiastolic: number;
  minDiastolic: number;
  lastReading: any;
  trendSystolic: 'subindo' | 'descendo' | 'estavel';
  trendDiastolic: 'subindo' | 'descendo' | 'estavel';
  dominantClass: BpClass;
  classDistribution: Record<BpClass, number>;
  // Correlações contextuais
  correlations: ContextCorrelation[];
  // Alertas IA
  alerts: BpAlert[];
  // Recomendações
  recommendations: string[];
  // Série temporal (últimos N dias)
  series: BpSeriesPoint[];
}

export interface ContextCorrelation {
  factor: string;
  factorLabel: string;
  avgSystolicWith: number;
  avgSystolicWithout: number;
  impact: number;      // diferença média em mmHg
  severity: 'low' | 'medium' | 'high';
  message: string;
}

export interface BpAlert {
  level: 'info' | 'warning' | 'danger' | 'critical';
  title: string;
  message: string;
}

export interface BpSeriesPoint {
  date: string;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  classification: BpClass;
  classInfo: BpClassInfo;
  factors: string[];
}

@Injectable()
export class BloodPressureService {
  constructor(private prisma: PrismaService) {}

  // ── Registrar medição ──────────────────────────────────────────────────────
  async create(userId: string, dto: CreateBpReadingDto) {
    const classification = classify(dto.systolic, dto.diastolic);
    return this.prisma.bloodPressureReading.create({
      data: {
        userId,
        systolic:   dto.systolic,
        diastolic:  dto.diastolic,
        pulse:      dto.pulse,
        measuredAt: new Date(dto.measuredAt),
        arm:        dto.arm,
        classification: classification as any,
        sleepQuality:    dto.sleepQuality    as any,
        alcoholConsumed: dto.alcoholConsumed ?? false,
        heavyMeal:       dto.heavyMeal       ?? false,
        highSodium:      dto.highSodium      ?? false,
        physicalActivity: dto.physicalActivity as any,
        stressLevel:      dto.stressLevel     as any,
        caffeine:         dto.caffeine        ?? false,
        tookMedication:   dto.tookMedication  ?? false,
        headache:         dto.headache        ?? false,
        dizziness:        dto.dizziness       ?? false,
        smoking:          dto.smoking         ?? false,
        notes:            dto.notes,
      },
    });
  }

  // ── Listar medições ────────────────────────────────────────────────────────
  async list(userId: string, days?: number) {
    const where: any = { userId };
    if (days) {
      where.measuredAt = { gte: new Date(Date.now() - days * 86_400_000) };
    }
    const readings = await this.prisma.bloodPressureReading.findMany({
      where, orderBy: { measuredAt: 'desc' },
    });
    return readings.map(r => ({
      ...r,
      classInfo: BP_CLASSES[r.classification as BpClass],
    }));
  }

  // ── Deletar medição ────────────────────────────────────────────────────────
  async delete(userId: string, id: string) {
    const existing = await this.prisma.bloodPressureReading.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Medição não encontrada');
    await this.prisma.bloodPressureReading.deleteMany({ where: { id, userId } });
    return { message: 'Medição removida' };
  }

  // ── Análise completa de tendências ─────────────────────────────────────────
  async analyze(userId: string, days = 90): Promise<BpTrendReport> {
    const readings = await this.prisma.bloodPressureReading.findMany({
      where: { userId, measuredAt: { gte: new Date(Date.now() - days * 86_400_000) } },
      orderBy: { measuredAt: 'asc' },
    });

    if (readings.length === 0) {
      return {
        totalReadings: 0, avgSystolic: 0, avgDiastolic: 0, avgPulse: null,
        maxSystolic: 0, minSystolic: 0, maxDiastolic: 0, minDiastolic: 0,
        lastReading: null, trendSystolic: 'estavel', trendDiastolic: 'estavel',
        dominantClass: 'normal', classDistribution: { normal:0, elevado:0, hipertensao1:0, hipertensao2:0, crise:0 },
        correlations: [], alerts: [], recommendations: [], series: [],
      };
    }

    const n = readings.length;
    const sys = readings.map(r => r.systolic);
    const dia = readings.map(r => r.diastolic);
    const pls = readings.filter(r => r.pulse != null).map(r => r.pulse as number);

    const avgSys = Math.round(sys.reduce((a,b) => a+b, 0) / n);
    const avgDia = Math.round(dia.reduce((a,b) => a+b, 0) / n);
    const avgPulse = pls.length ? Math.round(pls.reduce((a,b) => a+b, 0) / pls.length) : null;

    const { trend: trendSys } = linearRegression(sys);
    const { trend: trendDia } = linearRegression(dia);

    // Distribuição de classificações
    const dist: Record<BpClass, number> = { normal:0, elevado:0, hipertensao1:0, hipertensao2:0, crise:0 };
    readings.forEach(r => dist[r.classification as BpClass]++);
    const dominantClass = (Object.entries(dist).sort((a,b) => b[1]-a[1])[0][0]) as BpClass;

    // Correlações contextuais
    const correlations = this.buildCorrelations(readings);

    // Alertas
    const alerts = this.buildAlerts(readings, avgSys, avgDia, trendSys, trendDia, correlations);

    // Recomendações
    const recommendations = this.buildRecommendations(correlations, alerts, avgSys, avgDia);

    // Série temporal
    const series: BpSeriesPoint[] = readings.map(r => {
      const factors: string[] = [];
      if (r.alcoholConsumed)  factors.push('🍺 Álcool');
      if (r.heavyMeal)        factors.push('🥩 Refeição pesada');
      if (r.highSodium)       factors.push('🧂 Alto sódio');
      if (r.caffeine)         factors.push('☕ Cafeína');
      if (r.smoking)          factors.push('🚬 Cigarro');
      if (r.sleepQuality === 'ruim' || r.sleepQuality === 'insonia') factors.push('😴 Sono ruim');
      if (r.stressLevel === 'alto') factors.push('😰 Estresse alto');
      if (r.physicalActivity && r.physicalActivity !== 'nenhuma') factors.push('🏃 Atividade física');
      return {
        date:           r.measuredAt.toISOString(),
        systolic:       r.systolic,
        diastolic:      r.diastolic,
        pulse:          r.pulse,
        classification: r.classification as BpClass,
        classInfo:      BP_CLASSES[r.classification as BpClass],
        factors,
      };
    });

    return {
      totalReadings: n,
      avgSystolic: avgSys, avgDiastolic: avgDia, avgPulse,
      maxSystolic: Math.max(...sys), minSystolic: Math.min(...sys),
      maxDiastolic: Math.max(...dia), minDiastolic: Math.min(...dia),
      lastReading: readings[readings.length - 1],
      trendSystolic: trendSys, trendDiastolic: trendDia,
      dominantClass, classDistribution: dist,
      correlations, alerts, recommendations, series,
    };
  }

  // ── Correlações entre fatores e PA ────────────────────────────────────────
  private buildCorrelations(readings: any[]): ContextCorrelation[] {
    const factors: Array<{ key: keyof typeof readings[0]; label: string }> = [
      { key: 'alcoholConsumed', label: 'Consumo de álcool' },
      { key: 'heavyMeal',       label: 'Refeição pesada (churrasco/fritos)' },
      { key: 'highSodium',      label: 'Alimentação com alto sódio' },
      { key: 'caffeine',        label: 'Consumo de cafeína' },
      { key: 'smoking',         label: 'Uso de cigarro' },
      { key: 'headache',        label: 'Cefaleia/dor de cabeça' },
      { key: 'dizziness',       label: 'Tontura/vertigem' },
    ];

    const results: ContextCorrelation[] = [];

    for (const { key, label } of factors) {
      const withFactor    = readings.filter(r => r[key] === true);
      const withoutFactor = readings.filter(r => r[key] !== true);
      if (withFactor.length < 2 || withoutFactor.length < 2) continue;

      const avgWith    = withFactor.reduce((s, r) => s + r.systolic, 0) / withFactor.length;
      const avgWithout = withoutFactor.reduce((s, r) => s + r.systolic, 0) / withoutFactor.length;
      const impact     = Math.round(avgWith - avgWithout);
      if (Math.abs(impact) < 2) continue;

      const severity = Math.abs(impact) >= 10 ? 'high' : Math.abs(impact) >= 5 ? 'medium' : 'low';
      const direction = impact > 0 ? 'eleva' : 'reduz';
      results.push({
        factor: String(key), factorLabel: label,
        avgSystolicWith:    Math.round(avgWith),
        avgSystolicWithout: Math.round(avgWithout),
        impact,
        severity,
        message: `"${label}" ${direction} a sistólica em ~${Math.abs(impact)} mmHg no seu histórico.`,
      });
    }

    // Sono ruim
    const poorSleep  = readings.filter(r => r.sleepQuality === 'ruim' || r.sleepQuality === 'insonia');
    const goodSleep  = readings.filter(r => r.sleepQuality === 'boa' || r.sleepQuality === 'regular');
    if (poorSleep.length >= 2 && goodSleep.length >= 2) {
      const avgPoor = poorSleep.reduce((s, r) => s + r.systolic, 0) / poorSleep.length;
      const avgGood = goodSleep.reduce((s, r) => s + r.systolic, 0) / goodSleep.length;
      const impact  = Math.round(avgPoor - avgGood);
      if (Math.abs(impact) >= 2) {
        const severity = Math.abs(impact) >= 10 ? 'high' : Math.abs(impact) >= 5 ? 'medium' : 'low';
        results.push({
          factor: 'sleepQuality', factorLabel: 'Sono ruim/insônia',
          avgSystolicWith: Math.round(avgPoor),
          avgSystolicWithout: Math.round(avgGood),
          impact, severity,
          message: `Noites de sono ruim elevam a sistólica em ~${Math.abs(impact)} mmHg no seu histórico.`,
        });
      }
    }

    // Estresse alto
    const highStress = readings.filter(r => r.stressLevel === 'alto');
    const lowStress  = readings.filter(r => r.stressLevel === 'baixo');
    if (highStress.length >= 2 && lowStress.length >= 2) {
      const avgHigh = highStress.reduce((s, r) => s + r.systolic, 0) / highStress.length;
      const avgLow  = lowStress.reduce((s, r) => s + r.systolic, 0) / lowStress.length;
      const impact  = Math.round(avgHigh - avgLow);
      if (Math.abs(impact) >= 2) {
        const severity = Math.abs(impact) >= 10 ? 'high' : Math.abs(impact) >= 5 ? 'medium' : 'low';
        results.push({
          factor: 'stressLevel', factorLabel: 'Estresse elevado',
          avgSystolicWith: Math.round(avgHigh),
          avgSystolicWithout: Math.round(avgLow),
          impact, severity,
          message: `Em dias de estresse alto, sua sistólica sobe ~${Math.abs(impact)} mmHg.`,
        });
      }
    }

    return results.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  }

  // ── Alertas inteligentes ──────────────────────────────────────────────────
  private buildAlerts(
    readings: any[], avgSys: number, avgDia: number,
    trendSys: string, trendDia: string, correlations: ContextCorrelation[],
  ): BpAlert[] {
    const alerts: BpAlert[] = [];
    const last3 = readings.slice(-3);

    // Crise nas últimas medições
    if (last3.some(r => r.classification === 'crise')) {
      alerts.push({
        level: 'critical',
        title: '⚠️ Crise hipertensiva detectada',
        message: 'Uma ou mais medições recentes estão em nível de crise (≥180/120 mmHg). Procure atendimento médico imediatamente.',
      });
    }

    // Tendência de subida sustentada
    if (trendSys === 'subindo' && trendDia === 'subindo') {
      alerts.push({
        level: 'warning',
        title: '📈 Pressão em tendência de alta',
        message: 'Tanto a sistólica quanto a diastólica estão subindo nas últimas medições. Consulte seu médico.',
      });
    } else if (trendSys === 'subindo') {
      alerts.push({
        level: 'warning',
        title: '📈 Sistólica em alta',
        message: 'Sua pressão máxima (sistólica) está em tendência de subida.',
      });
    }

    // Média alta
    if (avgSys >= 140 || avgDia >= 90) {
      alerts.push({
        level: 'danger',
        title: '🔴 Média pressórica elevada',
        message: `Sua média neste período é ${avgSys}/${avgDia} mmHg — acima dos limites de Hipertensão Grau 1. Acompanhamento médico é recomendado.`,
      });
    } else if (avgSys >= 130 || avgDia >= 80) {
      alerts.push({
        level: 'warning',
        title: '🟠 Média pressórica no limiar',
        message: `Sua média é ${avgSys}/${avgDia} mmHg — na faixa de Hipertensão Grau 1. Monitore com frequência.`,
      });
    }

    // Correlações críticas
    correlations
      .filter(c => c.severity === 'high' && c.impact > 0)
      .forEach(c => {
        alerts.push({
          level: 'info',
          title: `💡 ${c.factorLabel} impacta sua pressão`,
          message: c.message,
        });
      });

    // Medição irregular (últimas 7 dias sem registro)
    const daysSinceLast = readings.length
      ? Math.floor((Date.now() - new Date(readings[readings.length-1].measuredAt).getTime()) / 86_400_000)
      : 999;
    if (daysSinceLast > 7) {
      alerts.push({
        level: 'info',
        title: '📅 Faz ' + daysSinceLast + ' dias sem medição',
        message: 'Monitore sua pressão regularmente — o ideal é ao menos 2x por semana.',
      });
    }

    return alerts;
  }

  // ── Recomendações personalizadas ──────────────────────────────────────────
  private buildRecommendations(
    correlations: ContextCorrelation[], alerts: BpAlert[],
    avgSys: number, avgDia: number,
  ): string[] {
    const recs: string[] = [];

    if (correlations.some(c => c.factor === 'alcoholConsumed' && c.impact > 5)) {
      recs.push('🍺 Reduza o consumo de álcool — seu histórico mostra impacto direto na pressão.');
    }
    if (correlations.some(c => c.factor === 'heavyMeal' && c.impact > 5)) {
      recs.push('🥩 Evite refeições pesadas (churrasco, fritos) — eleváveis sua pressão em até ' + correlations.find(c=>c.factor==='heavyMeal')!.impact + ' mmHg.');
    }
    if (correlations.some(c => c.factor === 'highSodium' && c.impact > 3)) {
      recs.push('🧂 Reduza o sódio na alimentação — prefira temperos naturais e evite sal adicionado.');
    }
    if (correlations.some(c => c.factor === 'sleepQuality' && c.impact > 5)) {
      recs.push('😴 Melhore a qualidade do sono — noites ruins elevam sua pressão significativamente.');
    }
    if (correlations.some(c => c.factor === 'stressLevel' && c.impact > 5)) {
      recs.push('🧘 Gerencie o estresse — meditação, exercícios respiratórios e pausas regulares ajudam.');
    }
    if (correlations.some(c => c.factor === 'smoking' && c.impact > 0)) {
      recs.push('🚬 Parar de fumar reduz significativamente o risco cardiovascular e a pressão arterial.');
    }

    if (avgSys >= 130 || avgDia >= 80) {
      recs.push('🏃 Pratique exercícios aeróbicos moderados (caminhada, natação) por 30 min/dia, 5x/semana.');
      recs.push('⚖️ Mantenha peso adequado — cada 5 kg perdidos reduz a sistólica em ~4 mmHg.');
      recs.push('🥦 Adote a dieta DASH: rica em frutas, vegetais, grãos integrais e laticínios com baixo teor de gordura.');
    }

    recs.push('📏 Meça a pressão sempre no mesmo braço, sentado, após 5 minutos de repouso.');
    recs.push('📋 Leve este relatório na próxima consulta com seu médico para avaliar a tendência.');

    return [...new Set(recs)]; // deduplica
  }

  /** Expõe a função classify como método público para o controller */
  classify(systolic: number, diastolic: number) {
    return { systolic, diastolic, classification: classify(systolic, diastolic) };
  }

  // Regional benchmark (placeholder)
  async regionalBenchmark(stateCode: string) {
    return { state: stateCode, avgSystolic: null, avgDiastolic: null, count: 0 };
  }
}
