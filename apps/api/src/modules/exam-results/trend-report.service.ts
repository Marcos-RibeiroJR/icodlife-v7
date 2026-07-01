// apps/api/src/modules/exam-results/trend-report.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export type TrendDir = 'improving' | 'worsening' | 'stable' | 'single';

export interface MarkerTrend {
  marker: string;
  unit: string;
  currentValue: number;
  previousValue: number | null;
  currentStatus: string;
  trend: TrendDir;
  deltaPercent: number | null;
  readings: number;
  lastDate: string;
  refMin: number | null;
  refMax: number | null;
}

export interface TrendReport {
  generatedAt: string;
  period: string; // ex: "últimos 6 meses"
  totalMarkers: number;
  normal: number;
  abnormal: number;
  critical: number;
  improving: number;
  worsening: number;
  markers: MarkerTrend[];
  lifestyle: LifestyleHighlights | null;
  recommendations: string[];
  overallRisk: 'low' | 'moderate' | 'high' | 'critical';
  narrativeSummary: string;
}

interface LifestyleHighlights {
  healthScore: number | null;
  bmi: number | null;
  bmiCategory: string | null;
  smokingStatus: string | null;
  exerciseFrequency: string | null;
  stressLevel: number | null;
  systolicBp: number | null;
  diastolicBp: number | null;
}

@Injectable()
export class TrendReportService {
  constructor(private prisma: PrismaService) {}

  async generate(userId: string, months = 6): Promise<TrendReport> {
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    // 1. Pega todos os itens de exame no período
    const items = await this.prisma.examResultItem.findMany({
      where: { userId, examDate: { gte: since } },
      orderBy: { examDate: 'asc' },
    });

    // 2. Perfil de estilo de vida
    const lifestyle = await this.prisma.lifestyleProfile.findUnique({ where: { userId } });

    // 3. Agrupa por marcador
    const byMarker = new Map<string, typeof items>();
    for (const item of items) {
      if (!byMarker.has(item.marker)) byMarker.set(item.marker, []);
      byMarker.get(item.marker)!.push(item);
    }

    // 4. Calcula tendência por marcador
    const markerTrends: MarkerTrend[] = [];
    for (const [marker, readings] of byMarker) {
      const sorted = readings.sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime());
      const last    = sorted[sorted.length - 1];
      const prev    = sorted.length > 1 ? sorted[sorted.length - 2] : null;

      const current  = Number(last.value);
      const previous = prev ? Number(prev.value) : null;

      let delta: number | null = null;
      let trend: TrendDir = 'single';

      if (previous !== null && previous !== 0) {
        delta = ((current - previous) / previous) * 100;
        const isGood = this.isBetterDirection(marker, current, previous, last.status ?? '');
        if (Math.abs(delta) < 3) trend = 'stable';
        else trend = isGood ? 'improving' : 'worsening';
      }

      markerTrends.push({
        marker,
        unit:         last.unit ?? '',
        currentValue: current,
        previousValue: previous,
        currentStatus: last.status ?? 'pending',
        trend,
        deltaPercent:  delta,
        readings:      sorted.length,
        lastDate:      last.examDate.toISOString(),
        refMin:        last.refMin ? Number(last.refMin) : null,
        refMax:        last.refMax ? Number(last.refMax) : null,
      });
    }

    // 5. Métricas consolidadas
    const normal   = markerTrends.filter(m => m.currentStatus === 'normal').length;
    const critical = markerTrends.filter(m => m.currentStatus.startsWith('critical')).length;
    const abnormal = markerTrends.filter(m => ['high','low'].includes(m.currentStatus)).length;
    const improving = markerTrends.filter(m => m.trend === 'improving').length;
    const worsening = markerTrends.filter(m => m.trend === 'worsening').length;

    // 6. Risco geral
    const overallRisk: TrendReport['overallRisk'] =
      critical > 0       ? 'critical' :
      abnormal > 2       ? 'high' :
      abnormal > 0 ? 'moderate' :
      'low';

    // 7. Cruzamento com estilo de vida
    const ls: LifestyleHighlights | null = lifestyle ? {
      healthScore:       null,
      bmi:               lifestyle.bmi ? Number(lifestyle.bmi) : null,
      bmiCategory:       lifestyle.bmiCategory ?? null,
      smokingStatus:     lifestyle.smokingStatus ?? null,
      exerciseFrequency: lifestyle.exerciseFrequency ?? null,
      stressLevel:       lifestyle.stressLevel ?? null,
      systolicBp:        null,
      diastolicBp:       null,
    } : null;

    // 8. Recomendações automáticas
    const recommendations = this.buildRecommendations(markerTrends, ls);

    // 9. Sumário narrativo
    const narrativeSummary = this.buildNarrative(markerTrends, ls, overallRisk, months);

    // Ordena: críticos primeiro, depois alterados, depois normais
    markerTrends.sort((a, b) => {
      const order = { critical_high: 0, critical_low: 0, high: 1, low: 1, normal: 2, pending: 3 };
      return (order[a.currentStatus as keyof typeof order] ?? 3) - (order[b.currentStatus as keyof typeof order] ?? 3);
    });

    return {
      generatedAt: new Date().toISOString(),
      period: `últimos ${months} meses`,
      totalMarkers: markerTrends.length,
      normal, abnormal, critical, improving, worsening,
      markers: markerTrends,
      lifestyle: ls,
      recommendations,
      overallRisk,
      narrativeSummary,
    };
  }

  private isBetterDirection(marker: string, current: number, previous: number, status: string): boolean {
    // Para marcadores onde menor é melhor (colesterol, glicose, etc.)
    const lowerBetter = ['Glicose','Colesterol Total','Colesterol LDL','Triglicerideos',
                         'TGO','TGP','Gama GT','Creatinina','Ureia','Acido Urico','PCR',
                         'Proteina C Reativa','HbA1c','Hemoglobina Glicada'];
    const isLowerBetter = lowerBetter.some(m => marker.toLowerCase().includes(m.toLowerCase()));
    const decreased = current < previous;
    if (isLowerBetter) return decreased;
    // Para marcadores onde valores normais são bons — está voltando ao range normal?
    if (status === 'normal') return true;
    return !decreased; // aumento é melhora para HDL, Hemoglobina, etc.
  }

  private buildRecommendations(markers: MarkerTrend[], ls: LifestyleHighlights | null): string[] {
    const recs: string[] = [];

    // Recomendações baseadas em marcadores
    const criticals = markers.filter(m => m.currentStatus.startsWith('critical'));
    if (criticals.length > 0) {
      recs.push(`Procure avaliação médica urgente: ${criticals.map(m => m.marker).join(', ')} em nível crítico.`);
    }

    const glucose = markers.find(m => m.marker.toLowerCase().includes('glicos') || m.marker === 'HbA1c');
    if (glucose && (glucose.currentStatus === 'high' || glucose.currentStatus.startsWith('critical'))) {
      recs.push('Glicemia elevada: reduza carboidratos simples, aumente atividade física e consulte endocrinologista.');
    }

    const ldl = markers.find(m => m.marker === 'Colesterol LDL' || m.marker === 'LDL');
    if (ldl && ldl.currentStatus === 'high') {
      recs.push('LDL elevado: reduza gorduras saturadas, aumente consumo de fibras. Considere avaliação cardiológica.');
    }

    const tg = markers.find(m => m.marker.toLowerCase().includes('triglice'));
    if (tg && tg.currentStatus === 'high') {
      recs.push('Triglicerídeos elevados: evite açúcar, álcool e carboidratos refinados. Aumente exercícios aeróbicos.');
    }

    const vitD = markers.find(m => m.marker === 'Vitamina D');
    if (vitD && vitD.currentStatus === 'low') {
      recs.push('Vitamina D insuficiente: exponha-se ao sol por 15-20 min/dia. Avalie suplementação com médico.');
    }

    // Recomendações de estilo de vida
    if (ls) {
      if (ls.smokingStatus === 'daily' || ls.smokingStatus === 'occasional') {
        recs.push('Tabagismo ativo: cessar o tabaco reduz risco cardiovascular em até 50% em 1 ano.');
      }
      if (ls.exerciseFrequency === 'sedentary') {
        recs.push('Sedentarismo identificado: inicie com 30 min de caminhada 3x/semana. Impacto direto em glicemia e colesterol.');
      }
      if (ls.bmiCategory && ['obese_1','obese_2','obese_3'].includes(ls.bmiCategory)) {
        recs.push('IMC na faixa de obesidade: perda de 5-10% do peso corporal já melhora glicemia, PA e perfil lipídico.');
      }
      if (ls.stressLevel && Number(ls.stressLevel) >= 8) {
        recs.push('Estresse severo: considere terapia, meditação ou mindfulness. Estresse crônico eleva cortisol e glicemia.');
      }
      if (ls.systolicBp && ls.diastolicBp && (ls.systolicBp >= 140 || ls.diastolicBp >= 90)) {
        recs.push('Pressão arterial elevada: monitore diariamente, reduza sal e consulte cardiologista.');
      }
    }

    if (recs.length === 0) {
      recs.push('Seus marcadores estão dentro dos parâmetros normais. Mantenha o acompanhamento regular (6 a 12 meses).');
    }

    return recs;
  }

  private buildNarrative(
    markers: MarkerTrend[],
    ls: LifestyleHighlights | null,
    risk: string,
    months: number,
  ): string {
    const total    = markers.length;
    const normal   = markers.filter(m => m.currentStatus === 'normal').length;
    const critical = markers.filter(m => m.currentStatus.startsWith('critical')).length;
    const abnormal = markers.filter(m => ['high','low'].includes(m.currentStatus)).length;
    const worsening = markers.filter(m => m.trend === 'worsening').length;
    const improving = markers.filter(m => m.trend === 'improving').length;

    let text = `Laudo gerado com base nos exames dos últimos ${months} meses. `;

    if (total === 0) {
      return 'Nenhum exame processado no período. Cadastre seus exames para gerar um laudo de tendência.';
    }

    if (critical > 0) {
      text += `⚠️ ATENÇÃO: ${critical} marcador(es) em nível CRÍTICO. `;
    }

    text += `Foram analisados ${total} marcador(es): ${normal} normal(is), ${abnormal} alterado(s)${critical > 0 ? ` e ${critical} crítico(s)` : ''}. `;

    if (worsening > 0) {
      text += `${worsening} marcador(es) mostram tendência de piora. `;
    }
    if (improving > 0) {
      text += `${improving} marcador(es) em melhora. `;
    }

    if (ls) {
      text += `Score de saúde do Módulo Vida: ${ls.healthScore ?? 'não calculado'}. `;
      if (ls.bmiCategory === 'normal') {
        text += 'IMC dentro da faixa saudável. ';
      } else if (ls.bmiCategory && ls.bmiCategory !== 'normal') {
        text += `IMC na categoria ${ls.bmiCategory}. `;
      }
    }

    const riskLabels: Record<string, string> = {
      low: 'Risco global BAIXO',
      moderate: 'Risco global MODERADO',
      high: 'Risco global ALTO',
      critical: 'Risco global CRÍTICO',
    };
    text += riskLabels[risk] + '. ';
    text += 'Este laudo é informativo e não substitui avaliação médica.';

    return text
  }
}
