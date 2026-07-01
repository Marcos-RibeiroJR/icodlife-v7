// apps/api/src/modules/mental-health/mental-health.service.ts
import {
  Injectable, BadRequestException, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SafetyService } from './safety.service';
import {
  getScale, listScales, scalesByCategory, ScaleDefinition, Answer,
} from './scales';
import {
  buildIndividualLaudo, buildConsolidatedLaudo, AssessmentSummary,
} from './laudo.builder';
import { CreateMentalHealthAssessmentDto, ReviewAssessmentDto } from './dto/create-assessment.dto';

@Injectable()
export class MentalHealthService {
  constructor(
    private prisma: PrismaService,
    private safety: SafetyService,
  ) {}

  // ── Catálogo de escalas ──────────────────────────────────────────────────
  listScales() {
    return { scales: listScales(), byCategory: scalesByCategory() };
  }

  getQuestionnaire(code: string) {
    const s = this.requireScale(code);
    return {
      code: s.code,
      name: s.name,
      shortName: s.shortName,
      category: s.category,
      categoryLabel: s.categoryLabel,
      license: s.license,
      attribution: s.attribution,
      timeframe: s.timeframe,
      instructions: s.instructions,
      direction: s.direction,
      options: s.options,
      questions: s.questions.map(q => ({
        id: q.id, text: q.text, subscale: q.subscale, isSafetyItem: !!q.isSafetyItem,
      })),
      disclaimer: s.disclaimer,
    };
  }

  // ── Aplicar uma escala ───────────────────────────────────────────────────
  async create(userId: string, code: string, dto: CreateMentalHealthAssessmentDto) {
    const scale = this.requireScale(code);
    const answers = this.validateAnswers(scale, dto.answers);

    const result = scale.score(answers);

    const patient = await this.prisma.user.findUnique({
      where: { id: userId }, select: { fullName: true },
    });

    const laudo = buildIndividualLaudo(scale, result, {
      appliedBy: dto.appliedBy ?? 'self',
      when: new Date(),
      patientName: patient?.fullName,
      sector: dto.sector,
      role: dto.role,
    });

    const safety = this.safety.build(result);

    const saved = await this.prisma.mentalHealthAssessment.create({
      data: {
        userId,
        scaleCode: scale.code,
        category: scale.category,
        version: scale.version,
        answers: answers as any,
        rawScore: result.rawScore,
        normalizedScore: result.normalizedScore,
        subscores: (result.subscores ?? undefined) as any,
        severity: result.severity,
        interpretation: laudo,
        // Guarda cor e rótulo junto das flags para reconstruir o consolidado sem ambiguidade.
        flags: { ...(result.flags ?? {}), color: result.color, severityLabel: result.severityLabel } as any,
        appliedBy: dto.appliedBy ?? 'self',
      },
    });

    // Aciona equipe de cuidado se houver risco (não bloqueia a resposta).
    await this.safety.notifyCareTeam(userId, scale.shortName, result);

    return { assessment: saved, result, safety };
  }

  // ── Histórico ────────────────────────────────────────────────────────────
  async list(userId: string, scaleCode?: string) {
    return this.prisma.mentalHealthAssessment.findMany({
      where: { userId, ...(scaleCode ? { scaleCode: scaleCode.toUpperCase() } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async get(userId: string, id: string) {
    const a = await this.prisma.mentalHealthAssessment.findFirst({ where: { id, userId } });
    if (!a) throw new NotFoundException('Avaliação não encontrada');
    return a;
  }

  // ── Laudo consolidado (centralizado) ─────────────────────────────────────
  async consolidated(userId: string, persist = false) {
    const items = await this.latestPerScale(userId);
    const patient = await this.prisma.user.findUnique({
      where: { id: userId }, select: { fullName: true },
    });
    const laudo = buildConsolidatedLaudo(items, { patientName: patient?.fullName, when: new Date() });

    if (persist && items.length) {
      const anySuicide = items.some(i => i.flags?.suicideRisk);
      await this.prisma.mentalHealthAssessment.create({
        data: {
          userId,
          scaleCode: 'CONSOLIDATED',
          category: 'bem_estar',
          version: '1.0',
          answers: [] as any,
          interpretation: laudo,
          flags: { consolidated: true, suicideRisk: anySuicide } as any,
          appliedBy: 'self',
        },
      });
    }

    return { items, laudo };
  }

  private async latestPerScale(userId: string): Promise<AssessmentSummary[]> {
    const rows = await this.prisma.mentalHealthAssessment.findMany({
      where: { userId, scaleCode: { not: 'CONSOLIDATED' } },
      orderBy: { createdAt: 'desc' },
    });

    const seen = new Set<string>();
    const out: AssessmentSummary[] = [];
    for (const r of rows) {
      if (seen.has(r.scaleCode)) continue;
      seen.add(r.scaleCode);
      const def = getScale(r.scaleCode);
      const flags = (r.flags as any) ?? null;
      const color: 'green'|'yellow'|'orange'|'red' =
        flags?.suicideRisk ? 'red' : (flags?.color ?? 'yellow');
      out.push({
        scaleCode: r.scaleCode,
        scaleName: def?.shortName ?? r.scaleCode,
        categoryLabel: def?.categoryLabel ?? r.category,
        rawScore: r.rawScore ?? null,
        normalizedScore: r.normalizedScore ?? null,
        severity: r.severity ?? null,
        severityLabel: flags?.severityLabel ?? r.severity ?? '—',
        color,
        interpretation: r.interpretation ?? '',
        createdAt: r.createdAt,
        flags,
      });
    }
    return out;
  }

  // ── Visão do médico ──────────────────────────────────────────────────────
  async getPatientAssessments(doctorUserId: string, patientUserId: string) {
    await this.assertDoctorLinked(doctorUserId, patientUserId);
    const [items, consolidated] = await Promise.all([
      this.prisma.mentalHealthAssessment.findMany({
        where: { userId: patientUserId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.consolidated(patientUserId),
    ]);
    return { items, consolidated };
  }

  async review(doctorUserId: string, id: string, dto: ReviewAssessmentDto) {
    const a = await this.prisma.mentalHealthAssessment.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('Avaliação não encontrada');
    await this.assertDoctorLinked(doctorUserId, a.userId);
    return this.prisma.mentalHealthAssessment.update({
      where: { id },
      data: {
        reviewedBy: doctorUserId,
        reviewedAt: new Date(),
        ...(dto.notes ? { interpretation: `${a.interpretation}\n\nREVISÃO DO MÉDICO: ${dto.notes}` } : {}),
      },
    });
  }

  private async assertDoctorLinked(doctorUserId: string, patientUserId: string) {
    const doctor = await this.prisma.doctor.findUnique({ where: { userId: doctorUserId }, select: { id: true } });
    if (!doctor) throw new ForbiddenException('Apenas médicos podem acessar avaliações de pacientes.');
    const link = await this.prisma.patientDoctor.findFirst({
      where: { userId: patientUserId, doctorId: doctor.id, status: 'active' },
    });
    if (!link) throw new ForbiddenException('Você não tem vínculo ativo com este paciente.');
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  private requireScale(code: string): ScaleDefinition {
    const s = getScale(code);
    if (!s) throw new NotFoundException(`Escala "${code}" não encontrada ou não disponível.`);
    return s;
  }

  private validateAnswers(scale: ScaleDefinition, answers?: { questionId: string; value: number }[]): Answer[] {
    if (!answers || answers.length === 0) {
      throw new BadRequestException('É necessário enviar as respostas do questionário.');
    }
    const known = new Map(scale.questions.map(q => [q.id, q]));
    const byId = new Map<string, number>();
    for (const a of answers) {
      if (!known.has(a.questionId)) {
        throw new BadRequestException(`Pergunta desconhecida: ${a.questionId}`);
      }
      const maxIdx = Math.max(...scale.options.map(o => o.value));
      if (a.value < 0 || a.value > maxIdx) {
        throw new BadRequestException(`Valor inválido para ${a.questionId} (0–${maxIdx}).`);
      }
      byId.set(a.questionId, a.value);
    }
    // Exige todas as questões respondidas (validade do escore e da triagem de segurança).
    const missing = scale.questions.filter(q => !byId.has(q.id)).map(q => q.id);
    if (missing.length) {
      throw new BadRequestException(`Responda todas as questões. Faltando: ${missing.join(', ')}`);
    }
    return scale.questions.map(q => ({ questionId: q.id, value: byId.get(q.id)! }));
  }
}
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    