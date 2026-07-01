// apps/api/src/modules/occupational-health/occupational-health.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePsychosocialAssessmentDto } from './dto/create-assessment.dto';
import {
  CATEGORY_LABELS, CATEGORY_NR01_REF, PSYCHOSOCIAL_QUESTIONS, PsychosocialCategory, TOTAL_QUESTIONS,
} from './psychosocial-questions';

export type RiskTier = 'baixo' | 'moderado' | 'alto' | 'critico';

interface CategoryResult {
  category: PsychosocialCategory;
  label: string;
  nrReference: string;
  score0to100: number;
  tier: RiskTier;
  answeredCount: number;
}

interface AssessmentResult {
  overallScore0to100: number;
  overallTier: RiskTier;
  categories: CategoryResult[];
  topRisks: CategoryResult[];
  laudo: string;
  recommendations: string[];
  disclaimer: string;
}

@Injectable()
export class OccupationalHealthService {
  constructor(private prisma: PrismaService) {}

  /** Retorna o banco de perguntas para o front renderizar o formulário */
  getQuestionnaire() {
    return {
      totalQuestions: TOTAL_QUESTIONS,
      scale: [
        { value: 0, label: 'Nunca' },
        { value: 1, label: 'Raramente' },
        { value: 2, label: 'Às vezes' },
        { value: 3, label: 'Frequentemente' },
        { value: 4, label: 'Sempre' },
      ],
      categories: Object.entries(CATEGORY_LABELS).map(([key, label]) => ({ key, label })),
      questions: PSYCHOSOCIAL_QUESTIONS.map(q => ({ id: q.id, category: q.category, text: q.text })),
    };
  }

  async list(userId: string) {
    return this.prisma.psychosocialAssessment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async get(userId: string, id: string) {
    const a = await this.prisma.psychosocialAssessment.findFirst({ where: { id, userId } });
    if (!a) throw new NotFoundException('Avaliação não encontrada');
    return a;
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

    return this.prisma.psychosocialAssessment.create({
      data: {
        userId,
        assessmentType: 'psychosocial',
        answers: dto.answers as any,
        score: result.overallScore0to100,
        riskLevel: result.overallTier,
        aiAnalysis: result.laudo,
      },
    });
  }

  // ── Motor de cálculo ────────────────────────────────────────────────────
  private computeResult(dto: CreatePsychosocialAssessmentDto): AssessmentResult {
    const byCategory = new Map<PsychosocialCategory, number[]>();

    for (const ans of dto.answers) {
      const q = PSYCHOSOCIAL_QUESTIONS.find(x => x.id === ans.questionId)!;
      // normaliza para "escore de risco" do item: 0 (sem risco) a 4 (risco máximo)
      const riskValue = q.reverse ? 4 - ans.value : ans.value;
      const arr = byCategory.get(q.category) ?? [];
      arr.push(riskValue);
      byCategory.set(q.category, arr);
    }

    const categories: CategoryResult[] = Array.from(byCategory.entries()).map(([category, values]) => {
      const avg = values.reduce((s, v) => s + v, 0) / values.length; // 0–4
      const score0to100 = +((avg / 4) * 100).toFixed(1);
      return {
        category,
        label: CATEGORY_LABELS[category],
        nrReference: CATEGORY_NR01_REF[category],
        score0to100,
        tier: this.tierFor(score0to100),
        answeredCount: values.length,
      };
    }).sort((a, b) => b.score0to100 - a.score0to100);

    const overallScore0to100 = +(categories.reduce((s, c) => s + c.score0to100, 0) / categories.length).toFixed(1);
    const overallTier = this.tierFor(overallScore0to100);
    const topRisks = categories.filter(c => c.tier === 'alto' || c.tier === 'critico').slice(0, 4);

    const laudo = this.buildLaudo(overallScore0to100, overallTier, categories, topRisks, dto);
    const recommendations = this.buildRecommendations(topRisks.length > 0 ? topRisks : categories.slice(0, 2));

    const disclaimer =
      'Esta triagem avalia a PERCEPÇÃO do trabalhador sobre condições organizacionais do trabalho, conforme as ' +
      'dimensões previstas na NR-01 (item 1.5.1.6.2) e em instrumentos validados (COPSOQ, JCQ, ERI, MBI). ' +
      'Não constitui diagnóstico clínico individual de transtorno mental — o foco é identificar fatores de risco ' +
      'ocupacionais para alimentar o Programa de Gerenciamento de Riscos (PGR) e o PCMSO. Em caso de sintomas ' +
      'significativos de sofrimento psíquico, encaminhe o trabalhador ao médico do trabalho, psicólogo ou serviço ' +
      'de saúde para avaliação clínica individual.';

    return { overallScore0to100, overallTier, categories, topRisks, laudo, recommendations, disclaimer };
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
      `• ${c.label}: ${c.score0to100}/100 (${this.tierLabel(c.tier)}) — ${c.nrReference}`,
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
