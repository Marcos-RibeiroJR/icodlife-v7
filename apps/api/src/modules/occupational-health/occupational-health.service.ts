// apps/api/src/modules/occupational-health/occupational-health.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePsychosocialAssessmentDto } from './dto/create-assessment.dto';
import { PsychosocialPdfService } from './psychosocial-pdf.service';
import {
  CATEGORY_LABELS, CATEGORY_NR01_REF, PSYCHOSOCIAL_QUESTIONS, PsychosocialCategory, TOTAL_QUESTIONS,
} from './psychosocial-questions';

export type RiskTier = 'baixo' | 'moderado' | 'alto' | 'critico';

// Escala Likert 0–4 usada tanto no formulário quanto na distribuição de respostas do laudo.
export const SCALE_LABELS: { value: number; label: string }[] = [
  { value: 0, label: 'Nunca' },
  { value: 1, label: 'Raramente' },
  { value: 2, label: 'Às vezes' },
  { value: 3, label: 'Frequentemente' },
  { value: 4, label: 'Sempre' },
];

export interface LikertBucket {
  value: number;
  label: string;
  count: number;
  pct: number; // % das respostas desta dimensão que caíram neste valor
}

export interface CategoryResult {
  category: PsychosocialCategory;
  label: string;
  nrReference: string;
  score0to100: number;
  tier: RiskTier;
  answeredCount: number;
  totalQuestions: number;
  // Tendência das respostas por item avaliado nesta dimensão (proporção por valor da escala).
  distribution: LikertBucket[];
  // Pré-laudo curto desta dimensão, base para o laudo/gráfico final consolidado.
  miniLaudo: string;
}

export interface TierCount { tier: RiskTier; label: string; count: number; pct: number; }

export interface OverallChart {
  byCategory: { category: PsychosocialCategory; label: string; score0to100: number; tier: RiskTier }[];
  tierDistribution: TierCount[];
}

interface AssessmentResult {
  overallScore0to100: number;
  overallTier: RiskTier;
  categories: CategoryResult[];
  topRisks: string[]; // labels — mantém o contrato já usado pelo frontend
  overallChart: OverallChart;
  laudo: string;
  recommendations: string[];
  disclaimer: string;
}

// Total de perguntas por categoria (fixo, calculado uma única vez a partir do banco de perguntas).
const TOTAL_BY_CATEGORY: Record<PsychosocialCategory, number> = PSYCHOSOCIAL_QUESTIONS.reduce((acc, q) => {
  acc[q.category] = (acc[q.category] ?? 0) + 1;
  return acc;
}, {} as Record<PsychosocialCategory, number>);

@Injectable()
export class OccupationalHealthService {
  constructor(
    private prisma: PrismaService,
    private pdf: PsychosocialPdfService,
  ) {}

  /** Retorna o banco de perguntas para o front renderizar o formulário */
  getQuestionnaire() {
    return {
      totalQuestions: TOTAL_QUESTIONS,
      scale: SCALE_LABELS,
      categories: Object.entries(CATEGORY_LABELS).map(([key, label]) => ({ key, label })),
      questions: PSYCHOSOCIAL_QUESTIONS.map(q => ({ id: q.id, category: q.category, text: q.text })),
    };
  }

  async list(userId: string) {
    const rows = await this.prisma.psychosocialAssessment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return rows.map(r => this.toSummary(r));
  }

  async get(userId: string, id: string) {
    const a = await this.prisma.psychosocialAssessment.findFirst({ where: { id, userId } });
    if (!a) throw new NotFoundException('Avaliação não encontrada');
    return this.toResponse(a);
  }

  async create(userId: string, dto: CreatePsychosocialAssessmentDto) {
    if (!dto.answers || dto.answers.length === 0) {
      throw new BadRequestException('É necessário enviar as respostas do questionário.');
    }

    const knownIds = new Set(PSYCHOSOCIAL_QUESTIONS.map(q => q.id));
    const invalid = dto.answers.filter(a => !knownIds.has(a.questionId));
    if (invalid.length > 0) {
      throw new BadRequestException(`Perguntas desconhecidas no envio: ${invalid.map(i => i.questionId).join(', ')}`);
    }

    const completionRate = dto.answers.length / TOTAL_QUESTIONS;
    if (completionRate < 0.7) {
      throw new BadRequestException(
        `Questionário incompleto (${dto.answers.length}/${TOTAL_QUESTIONS}). Responda pelo menos 70% das perguntas para gerar o laudo.`,
      );
    }

    const result = this.computeResult(dto);

    const created = await this.prisma.psychosocialAssessment.create({
      data: {
        userId,
        assessmentType: 'psychosocial',
        answers: dto.answers as any,
        score: result.overallScore0to100,
        riskLevel: result.overallTier,
        aiAnalysis: result.laudo,
        sector: dto.sector,
        role: dto.role,
        workRegime: dto.workRegime,
        employmentType: dto.employmentType,
        weeklyOvertimeHours: dto.weeklyOvertimeHours,
        consentGiven: !!dto.consentGiven,
        // Compartilhamento com médico/clínica começa desligado — é um consentimento
        // de finalidade distinta (LGPD), o paciente ativa explicitamente depois.
        sharedWithDoctor: false,
        categoryBreakdown: result.categories as any,
        topRisks: result.topRisks as any,
        recommendations: result.recommendations as any,
      },
    });

    // Salva o laudo na Biblioteca de Exames (HealthRecord) para aparecer junto aos demais exames.
    try {
      const record = await this.prisma.healthRecord.create({
        data: {
          userId,
          category: 'medicina-do-trabalho',
          title: `Laudo de Riscos Psicossociais (NR-01) — ${new Date().toLocaleDateString('pt-BR')}`,
          recordDate: created.createdAt,
          fileName: `laudo-psicossocial-${created.id.slice(0, 8)}.pdf`,
          fileUrl: `/occupational-health/psychosocial/assessments/${created.id}/laudo.pdf`,
          tags: ['laudo', 'psicossocial', 'nr-01', 'medicina-do-trabalho'],
          description: created.id,
          isProcessed: true,
        },
      });
      await this.prisma.psychosocialAssessment.update({
        where: { id: created.id },
        data: { healthRecordId: record.id },
      });
    } catch { /* não bloqueia a avaliação se o registro na biblioteca falhar */ }

    return this.get(userId, created.id);
  }

  /** Liga/desliga o compartilhamento deste laudo com o médico/clínica vinculados (consentimento específico). */
  async setSharing(userId: string, id: string, shared: boolean) {
    const a = await this.prisma.psychosocialAssessment.findFirst({ where: { id, userId } });
    if (!a) throw new NotFoundException('Avaliação não encontrada');
    const updated = await this.prisma.psychosocialAssessment.update({
      where: { id },
      data: { sharedWithDoctor: shared },
    });
    return this.toResponse(updated);
  }

  /** Gera o PDF do laudo (com gráficos por dimensão) a partir da avaliação salva. */
  async generateLaudoPdf(userId: string, id: string) {
    const a = await this.prisma.psychosocialAssessment.findFirst({
      where: { id, userId },
      include: { user: { select: { fullName: true } } },
    });
    if (!a) throw new NotFoundException('Avaliação não encontrada');
    const response = this.toResponse(a);
    const buffer = await this.pdf.generate({ result: response, patientName: (a as any).user?.fullName ?? 'Paciente' });
    return { buffer, assessment: a };
  }

  // ── Reshape: linha do banco → contrato usado pelo frontend ─────────────────
  private toSummary(row: any) {
    const topRisks: string[] = Array.isArray(row.topRisks) ? row.topRisks : [];
    return {
      id: row.id,
      createdAt: row.createdAt,
      overallScore: row.score,
      overallTier: row.riskLevel,
      sector: row.sector,
      role: row.role,
      topRisks,
      laudo: row.aiAnalysis,
      sharedWithDoctor: row.sharedWithDoctor,
    };
  }

  private toResponse(row: any) {
    const categories: CategoryResult[] = Array.isArray(row.categoryBreakdown) ? row.categoryBreakdown : [];
    const topRisks: string[] = Array.isArray(row.topRisks) ? row.topRisks : [];
    const recommendations: string[] = Array.isArray(row.recommendations) ? row.recommendations : [];
    return {
      id: row.id,
      createdAt: row.createdAt,
      overallScore: row.score,
      overallTier: row.riskLevel,
      sector: row.sector,
      role: row.role,
      workRegime: row.workRegime,
      employmentType: row.employmentType,
      weeklyOvertimeHours: row.weeklyOvertimeHours,
      consentGiven: row.consentGiven,
      sharedWithDoctor: row.sharedWithDoctor,
      categories,
      categoryScores: categories, // alias mantido por compatibilidade com o front
      topRisks,
      recommendations,
      overallChart: this.buildOverallChart(categories),
      laudo: row.aiAnalysis,
      disclaimer: this.disclaimerText(),
    };
  }

  // ── Motor de cálculo ────────────────────────────────────────────────────
  private computeResult(dto: CreatePsychosocialAssessmentDto): AssessmentResult {
    const byCategory = new Map<PsychosocialCategory, { risk: number[]; raw: number[] }>();

    for (const ans of dto.answers) {
      const q = PSYCHOSOCIAL_QUESTIONS.find(x => x.id === ans.questionId)!;
      // normaliza para "escore de risco" do item: 0 (sem risco) a 4 (risco máximo)
      const riskValue = q.reverse ? 4 - ans.value : ans.value;
      const bucket = byCategory.get(q.category) ?? { risk: [], raw: [] };
      bucket.risk.push(riskValue);
      bucket.raw.push(ans.value); // valor bruto (o que o trabalhador de fato respondeu)
      byCategory.set(q.category, bucket);
    }

    const categories: CategoryResult[] = Array.from(byCategory.entries()).map(([category, { risk, raw }]) => {
      const avg = risk.reduce((s, v) => s + v, 0) / risk.length; // 0–4
      const score0to100 = +((avg / 4) * 100).toFixed(1);
      const tier = this.tierFor(score0to100);
      const totalQuestions = TOTAL_BY_CATEGORY[category] ?? raw.length;
      const distribution = this.buildDistribution(raw);
      const partial: CategoryResult = {
        category,
        label: CATEGORY_LABELS[category],
        nrReference: CATEGORY_NR01_REF[category],
        score0to100,
        tier,
        answeredCount: raw.length,
        totalQuestions,
        distribution,
        miniLaudo: '',
      };
      partial.miniLaudo = this.buildCategoryMiniLaudo(partial);
      return partial;
    }).sort((a, b) => b.score0to100 - a.score0to100);

    const overallScore0to100 = +(categories.reduce((s, c) => s + c.score0to100, 0) / categories.length).toFixed(1);
    const overallTier = this.tierFor(overallScore0to100);
    const topRiskCategories = categories.filter(c => c.tier === 'alto' || c.tier === 'critico').slice(0, 4);
    const topRisks = topRiskCategories.map(c => c.label);

    const laudo = this.buildLaudo(overallScore0to100, overallTier, categories, topRiskCategories, dto);
    const recommendations = this.buildRecommendations(topRiskCategories.length > 0 ? topRiskCategories : categories.slice(0, 2));
    const overallChart = this.buildOverallChart(categories);

    return {
      overallScore0to100, overallTier, categories, topRisks, overallChart, laudo, recommendations,
      disclaimer: this.disclaimerText(),
    };
  }

  /** Distribuição bruta das respostas (0–4) de uma dimensão — "tendência das respostas por item". */
  private buildDistribution(rawValues: number[]): LikertBucket[] {
    const total = rawValues.length || 1;
    return SCALE_LABELS.map(s => {
      const count = rawValues.filter(v => v === s.value).length;
      return { value: s.value, label: s.label, count, pct: +((count / total) * 100).toFixed(1) };
    });
  }

  /** Gráfico final consolidado: score por dimensão + proporção de dimensões em cada nível de risco. */
  private buildOverallChart(categories: CategoryResult[]): OverallChart {
    const byCategory = categories.map(c => ({ category: c.category, label: c.label, score0to100: c.score0to100, tier: c.tier }));
    const tiers: RiskTier[] = ['baixo', 'moderado', 'alto', 'critico'];
    const total = categories.length || 1;
    const tierDistribution: TierCount[] = tiers.map(tier => {
      const count = categories.filter(c => c.tier === tier).length;
      return { tier, label: this.tierLabel(tier), count, pct: +((count / total) * 100).toFixed(1) };
    });
    return { byCategory, tierDistribution };
  }

  private buildCategoryMiniLaudo(cat: CategoryResult): string {
    const dominant = [...cat.distribution].sort((a, b) => b.count - a.count)[0];
    const pctRespondida = cat.totalQuestions > 0 ? Math.round((cat.answeredCount / cat.totalQuestions) * 100) : 0;
    return (
      `${cat.answeredCount}/${cat.totalQuestions} perguntas respondidas (${pctRespondida}%). ` +
      `Resposta mais frequente nesta dimensão: "${dominant.label}" (${dominant.pct}% das respostas). ` +
      `Escore de risco: ${cat.score0to100}/100 — ${this.tierLabel(cat.tier)}.`
    );
  }

  private tierFor(score: number): RiskTier {
    if (score >= 75) return 'critico';
    if (score >= 50) return 'alto';
    if (score >= 25) return 'moderado';
    return 'baixo';
  }

  private tierLabel(tier: RiskTier): string {
    return { baixo: '🟢 Baixo', moderado: '🟡 Moderado', alto: '🟠 Alto', critico: '🔴 Crítico' }[tier];
  }

  private disclaimerText(): string {
    return (
      'Esta triagem avalia a PERCEPÇÃO do trabalhador sobre condições organizacionais do trabalho, conforme as ' +
      'dimensões previstas na NR-01 (item 1.5.1.6.2) e em instrumentos validados (COPSOQ, JCQ, ERI, MBI). ' +
      'Não constitui diagnóstico clínico individual de transtorno mental — o foco é identificar fatores de risco ' +
      'ocupacionais para alimentar o Programa de Gerenciamento de Riscos (PGR) e o PCMSO. Em caso de sintomas ' +
      'significativos de sofrimento psíquico, encaminhe o trabalhador ao médico do trabalho, psicólogo ou serviço ' +
      'de saúde para avaliação clínica individual.'
    );
  }

  private buildLaudo(
    overallScore: number,
    overallTier: RiskTier,
    categories: CategoryResult[],
    topRisks: CategoryResult[],
    dto: CreatePsychosocialAssessmentDto,
  ): string {
    const header =
      `LAUDO DE TRIAGEM DE RISCOS PSICOSSOCIAIS OCUPACIONAIS — NR-01\n` +
      `Base normativa: NR-01, item 1.5.1.6.2 (Portaria MTE nº 1.419/2024); instrumento de referência: COPSOQ-BR / JCQ / ERI / MBI.\n` +
      (dto.sector ? `Setor: ${dto.sector}  ` : '') + (dto.role ? `Cargo/Função: ${dto.role}\n` : '\n') +
      `Escore geral de risco psicossocial: ${overallScore}/100 — Classificação: ${this.tierLabel(overallTier)}\n`;

    const body = categories.map(c =>
      `• ${c.label}: ${c.score0to100}/100 (${this.tierLabel(c.tier)}) — ${c.nrReference}\n  ${c.miniLaudo}`,
    ).join('\n');

    const conclusion = topRisks.length > 0
      ? `\n\nCONCLUSÃO: foram identificados ${topRisks.length} fator(es) de risco psicossocial em nível ALTO ou CRÍTICO ` +
        `(${topRisks.map(t => t.label).join('; ')}). Recomenda-se que estes fatores sejam incluídos no inventário de ` +
        `riscos do PGR, com plano de ação conforme a hierarquia de controles (eliminação/fonte > organização do ` +
        `trabalho > medidas administrativas), e que o caso seja levado ao SESMT / médico do trabalho responsável.`
      : `\n\nCONCLUSÃO: não foram identificados fatores em nível alto ou crítico nesta triagem individual. ` +
        `Recomenda-se manter o monitoramento periódico e a reavaliação coletiva por Grupo Homogêneo de Exposição (GHE).`;

    return header + '\n' + body + conclusion;
  }

  private buildRecommendations(riskCategories: CategoryResult[]): string[] {
    const MAP: Record<PsychosocialCategory, string> = {
      demandas_trabalho:      '📋 Revisar metas, prazos e dimensionamento de equipe; redistribuir tarefas para equilibrar a carga de trabalho.',
      organizacao_trabalho:   '🧭 Ampliar a autonomia do trabalhador, esclarecer papéis/responsabilidades e padronizar escalas com antecedência.',
      conteudo_tarefa:        '🔄 Reestruturar tarefas repetitivas, ampliar variedade de atividades e revisar política de reconhecimento/recompensa.',
      relacoes_suporte:       '🤝 Promover ações de integração de equipe, mediação de conflitos e fortalecimento do suporte entre colegas.',
      lideranca_gestao:       '🎓 Capacitar lideranças em feedback construtivo, gestão humanizada de metas e escuta ativa.',
      assedio_violencia:      '🚨 Acionar imediatamente o canal de denúncia/ouvidoria; revisar e divulgar a política de tolerância zero a assédio; investigação formal.',
      inseguranca_mudanca:    '📢 Melhorar a comunicação institucional sobre mudanças organizacionais e perspectivas de carreira.',
      conflito_trabalho_vida: '⏰ Implementar política de desconexão digital, controlar banco de horas e garantir pausas regulamentares.',
      sintomas_bemestar:      '🩺 Encaminhar para avaliação com médico do trabalho e, se indicado, psicólogo/psiquiatra para avaliação clínica individual.',
    };
    const base = [
      '⚠️ Este resultado é uma triagem organizacional — não substitui avaliação clínica individual.',
      ...riskCategories.map(c => MAP[c.category]),
      '📊 Inclua estes resultados (de forma agregada e anônima) no inventário de riscos do PGR, segmentando por Grupo Homogêneo de Exposição (GHE).',
    ];
    return Array.from(new Set(base));
  }
}
