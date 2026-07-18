// apps/api/src/modules/ophthalmology/ophthalmology.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateOphthalmologyExamDto, UpdateConsultHistoryDto } from './dto/create-exam.dto';
import { OphthalmologyPdfService } from './ophthalmology-pdf.service';

/** Tabela de conversão Snellen → estimativa de grau (dioptrias) */
const SNELLEN_TO_MYOPIA: Record<string, { min: number; max: number; label: string }> = {
  '20/20':  { min: 0,     max: 0,    label: 'Visão normal' },
  '20/25':  { min: -0.25, max: -0.5, label: 'Leve suspeita' },
  '20/30':  { min: -0.5,  max: -0.75, label: 'Leve' },
  '20/40':  { min: -0.75, max: -1.25, label: 'Leve a moderada' },
  '20/50':  { min: -1.25, max: -1.75, label: 'Moderada' },
  '20/60':  { min: -1.75, max: -2.25, label: 'Moderada' },
  '20/80':  { min: -2.25, max: -2.75, label: 'Moderada a alta' },
  '20/100': { min: -2.75, max: -3.5,  label: 'Alta' },
  '20/200': { min: -3.5,  max: -5.0,  label: 'Alta' },
  '20/400': { min: -5.0,  max: -8.0,  label: 'Muito alta' },
};

type RiskLevel = 'none' | 'low' | 'moderate' | 'high';

interface ExamEstimate {
  myopiaRight: number;
  myopiaLeft: number;
  astigRight: number;
  astigLeft: number;
  confidence: number;
  riskLevel: RiskLevel;
  summary: string;
  recommendations: string[];
}

@Injectable()
export class OphthalmologyService {
  constructor(private prisma: PrismaService, private pdf: OphthalmologyPdfService) {}

  // ── Listar exames do usuário ───────────────────────────────────────────────
  async list(userId: string) {
    return this.prisma.ophthalmologyExam.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  // ── Buscar exame único ─────────────────────────────────────────────────────
  async get(userId: string, id: string) {
    const exam = await this.prisma.ophthalmologyExam.findFirst({
      where: { id, userId },
    });
    if (!exam) throw new NotFoundException('Exame não encontrado');
    return exam;
  }

  // ── Criar / salvar exame completo ──────────────────────────────────────────
  async create(userId: string, dto: CreateOphthalmologyExamDto) {
    // Buscar idade do usuário para melhorar estimativa
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const age = dto.userAge ?? (user?.dateOfBirth
      ? Math.floor((Date.now() - new Date(user.dateOfBirth).getTime()) / 31_557_600_000)
      : 30);

    const estimate = this.computeEstimate(dto, age);

    const exam = await this.prisma.ophthalmologyExam.create({
      data: {
        userId,
        visualAcuityRight: dto.acuityRightEye,
        visualAcuityLeft:  dto.acuityLeftEye,
        astigmatismAxisRight: dto.astigmatismAxisRight,
        astigmatismAxisLeft:  dto.astigmatismAxisLeft,
        contrastScoreRight: dto.contrastScoreRight,
        contrastScoreLeft:  dto.contrastScoreLeft,
        estimatedMyopiaRight: estimate.myopiaRight,
        estimatedMyopiaLeft:  estimate.myopiaLeft,
        estimatedAstigRight:  estimate.astigRight,
        estimatedAstigLeft:   estimate.astigLeft,
        confidenceScore:  estimate.confidence,
        riskLevel:        estimate.riskLevel,
        reportSummary:    estimate.summary,
        recommendations:  estimate.recommendations,
        symptoms:         dto.symptoms ?? [],
        userAge:          age,
        completedAt:      new Date(),
      },
    });

    // Salva o laudo na Biblioteca de Exames (HealthRecord) para aparecer junto aos demais exames.
    try {
      await this.prisma.healthRecord.create({
        data: {
          userId,
          category:    'oftalmologia',
          title:       `Laudo Oftalmológico — ${new Date().toLocaleDateString('pt-BR')}`,
          recordDate:  exam.completedAt ?? new Date(),
          fileName:    `laudo-oftalmologico-${exam.id.slice(0, 8)}.pdf`,
          fileUrl:     `/ophthalmology/exams/${exam.id}/laudo.pdf`,
          tags:        ['laudo', 'oftalmologia'],
          description: exam.id,
          isProcessed: true,
        },
      });
    } catch { /* nao bloqueia o exame se o registro falhar */ }

    return exam;
  }

  /** Gera o PDF do laudo a partir do exame salvo. */
  async generateLaudoPdf(userId: string, examId: string) {
    const exam = await this.prisma.ophthalmologyExam.findFirst({
      where: { id: examId, userId },
      include: { user: { select: { fullName: true } } },
    });
    if (!exam) throw new NotFoundException('Exame nao encontrado');
    const buffer = await this.pdf.generate({
      exam,
      patientName: (exam as any).user?.fullName ?? 'Paciente',
    });
    return { buffer, exam };
  }

  // ── Histórico de consultas reais ───────────────────────────────────────────
  async createHistory(userId: string, dto: UpdateConsultHistoryDto) {
    return this.prisma.ophthalmologyHistory.create({
      data: {
        userId,
        examId:         dto.examId,
        doctorName:     dto.doctorName,
        crmNumber:      dto.crmNumber,
        sphericalRight: dto.sphericalRight,
        sphericalLeft:  dto.sphericalLeft,
        cylinderRight:  dto.cylinderRight,
        cylinderLeft:   dto.cylinderLeft,
        axisRight:      dto.axisRight,
        axisLeft:       dto.axisLeft,
        additionRight:  dto.additionRight,
        additionLeft:   dto.additionLeft,
        diagnoses:      dto.diagnoses ?? [],
        notes:          dto.notes,
      },
    });
  }

  async getHistory(userId: string) {
    return this.prisma.ophthalmologyHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Engine de estimativa (regras + heurística) ────────────────────────────
  private computeEstimate(dto: CreateOphthalmologyExamDto, age: number): ExamEstimate {
    const myopiaRight = this.snellenToMyopia(dto.acuityRightEye);
    const myopiaLeft  = this.snellenToMyopia(dto.acuityLeftEye);

    // Astigmatismo estimado: se confirmado no teste de roda, grau aproximado -0.75
    const astigRight = dto.astigmatismRight ? -0.75 : 0;
    const astigLeft  = dto.astigmatismLeft  ? -0.75 : 0;

    // Contraste baixo pode indicar catarata inicial (penaliza score)
    const contrastPenalty = this.contrastPenalty(dto.contrastScoreRight, dto.contrastScoreLeft);

    // Presbiopia estimada por idade (> 40 anos)
    const presbyopia = age >= 45 ? +(((age - 40) * 0.1).toFixed(2)) : 0;

    // Nível de risco
    const worstMyopia = Math.min(myopiaRight, myopiaLeft);
    const riskLevel: RiskLevel =
      (worstMyopia <= -3 || (dto.astigmatismRight && dto.astigmatismLeft) || contrastPenalty > 0)
        ? 'high'
        : worstMyopia <= -1.5 || dto.astigmatismRight || dto.astigmatismLeft
          ? 'moderate'
          : worstMyopia < 0
            ? 'low'
            : 'none';

    // Confiança: base 70, ajusta por dados disponíveis
    let confidence = 70;
    if (dto.acuityRightEye && dto.acuityLeftEye)      confidence += 8;
    if (dto.astigmatismRight !== undefined)            confidence += 5;
    if (dto.contrastScoreRight !== undefined)          confidence += 5;
    if (dto.estimatedDistanceCm && dto.estimatedDistanceCm >= 35 && dto.estimatedDistanceCm <= 45)
      confidence += 5;
    if (dto.symptoms && dto.symptoms.length > 0)       confidence += 3;
    confidence = Math.min(confidence, 92); // teto realista

    // Sumário
    const conditions: string[] = [];
    if (myopiaRight < -0.5 || myopiaLeft < -0.5)   conditions.push('Miopia');
    if (astigRight || astigLeft)                     conditions.push('Astigmatismo');
    if (myopiaRight > 0.5  || myopiaLeft > 0.5)     conditions.push('Hipermetropia');
    if (presbyopia > 0)                              conditions.push('Presbiopia');
    if (contrastPenalty > 0)                         conditions.push('Suspeita de alteração de contraste');

    const summary = conditions.length === 0
      ? 'Nenhuma alteração refrativa significativa estimada. Visão aparentemente dentro da normalidade para este teste digital.'
      : `Possíveis alterações identificadas: ${conditions.join(', ')}. Este é um exame de triagem — a confirmação deve ser feita com um oftalmologista.`;

    // Recomendações
    const recommendations: string[] = [
      '⚠️ Este é um auto-exame de triagem, NÃO substitui consulta oftalmológica.',
    ];
    if (riskLevel === 'high' || riskLevel === 'moderate') {
      recommendations.push('🔴 Recomendamos consulta com oftalmologista em até 30 dias.');
    } else if (riskLevel === 'low') {
      recommendations.push('🟡 Agende uma consulta preventiva com oftalmologista.');
    } else {
      recommendations.push('🟢 Continue com exames periódicos anuais.');
    }
    if (presbyopia > 0) {
      recommendations.push(`📖 Possível presbiopia (vista cansada) — típica após os 40 anos. Avalie óculos de leitura com oftalmologista.`);
    }
    if (contrastPenalty > 0) {
      recommendations.push('🔍 Baixa sensibilidade ao contraste pode indicar início de catarata ou alteração de córnea. Avalie com urgência.');
    }
    recommendations.push('📋 Salve este relatório e leve à sua próxima consulta oftalmológica.');

    return {
      myopiaRight,
      myopiaLeft,
      astigRight,
      astigLeft,
      confidence,
      riskLevel,
      summary,
      recommendations,
    };
  }

  private snellenToMyopia(acuity?: string): number {
    if (!acuity) return 0;
    const entry = SNELLEN_TO_MYOPIA[acuity];
    if (!entry) return 0;
    return +(((entry.min + entry.max) / 2).toFixed(2));
  }

  private contrastPenalty(right?: number, left?: number): number {
    const r = right ?? 1;
    const l = left  ?? 1;
    const avg = (r + l) / 2;
    return avg < 0.5 ? 1 : 0;
  }
}
