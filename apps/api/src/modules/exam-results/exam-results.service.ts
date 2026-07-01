// apps/api/src/modules/exam-results/exam-results.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { calcStatus } from './sbpcml-references';
import { CreateExamResultDto } from './dto/create-exam-result.dto';

@Injectable()
export class ExamResultsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateExamResultDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { gender: true } });
    const gender = (user?.gender === 'male' ? 'male' : user?.gender === 'female' ? 'female' : 'any') as any;

    const exam = await this.prisma.examResult.create({
      data: {
        userId,
        examDate: new Date(dto.examDate),
        labName: dto.labName,
        examType: dto.examType ?? 'outro',
        processingStatus: 'done',
        aiFlags: [],
      },
    });

    if (dto.items?.length) {
      for (const item of dto.items) {
        const { status, refMin, refMax, refSource } = calcStatus(Number(item.value), item.marker, gender);

        await this.prisma.examResultItem.create({
          data: {
            examId: exam.id,
            userId,
            marker: item.marker,
            unit: item.unit,
            value: item.value,
            rawValue: item.rawValue ?? String(item.value),
            refMin: refMin !== null ? refMin : undefined,
            refMax: refMax !== null ? refMax : undefined,
            refSource: refSource ?? undefined,
            status: status as any,
            examDate: new Date(dto.examDate),
          },
        });
      }
    }

    const items = await this.prisma.examResultItem.findMany({ where: { examId: exam.id } });
    const flags = items.filter(i => i.status !== 'normal' && i.status !== 'pending').map(i => i.marker);
    const hasCritical = items.some(i => i.status === 'critical_low' || i.status === 'critical_high');
    const hasHigh = items.some(i => i.status === 'high' || i.status === 'low');
    const riskLevel = hasCritical ? 'critical' : hasHigh ? 'warning' : 'normal';
    const aiSummary = this.generateAiSummary(items, riskLevel);

    await this.prisma.examResult.update({
      where: { id: exam.id },
      data: { aiFlags: flags, aiRiskLevel: riskLevel, aiSummary, processingStatus: 'done' },
    });

    return this.prisma.examResult.findUnique({ where: { id: exam.id }, include: { items: true } });
  }

  list(userId: string) {
    return this.prisma.examResult.findMany({
      where: { userId },
      orderBy: { examDate: 'desc' },
      include: { items: { orderBy: { marker: 'asc' } } },
    });
  }

  async get(userId: string, id: string) {
    const r = await this.prisma.examResult.findFirst({ where: { id, userId }, include: { items: true } });
    if (!r) throw new NotFoundException('Resultado não encontrado');
    return r;
  }

  async timeline(userId: string, marker: string, from?: string, to?: string) {
    const where: any = { userId, marker };
    if (from || to) {
      where.examDate = {};
      if (from) where.examDate.gte = new Date(from);
      if (to)   where.examDate.lte = new Date(to);
    }
    const items = await this.prisma.examResultItem.findMany({
      where,
      orderBy: { examDate: 'asc' },
      select: {
        id: true, examDate: true, value: true, unit: true,
        status: true, refMin: true, refMax: true,
        exam: { select: { labName: true, examType: true } },
      },
    });
    return { marker, data: items };
  }

  async availableMarkers(userId: string) {
    const raw = await this.prisma.examResultItem.groupBy({
      by: ['marker', 'unit'],
      where: { userId },
      _count: { marker: true },
      _max: { examDate: true, status: true },
      orderBy: { _count: { marker: 'desc' } },
    });
    return raw.map(r => ({
      marker: r.marker,
      unit: r.unit,
      count: r._count.marker,
      lastDate: r._max.examDate,
      lastStatus: r._max.status,
    }));
  }

  async healthSummary(userId: string) {
    const markers = await this.availableMarkers(userId);
    const critical = markers.filter(m => m.lastStatus === 'critical_low' || m.lastStatus === 'critical_high');
    const abnormal = markers.filter(m => m.lastStatus === 'high' || m.lastStatus === 'low');
    const normal   = markers.filter(m => m.lastStatus === 'normal');
    return { total: markers.length, critical: critical.length, abnormal: abnormal.length, normal: normal.length, markers };
  }

  private generateAiSummary(items: any[], riskLevel: string): string {
    const abnormal = items.filter(i => i.status !== 'normal' && i.status !== 'pending');
    if (abnormal.length === 0) return 'Todos os marcadores analisados estão dentro dos valores de referência SBPC/ML.';
    const critical = abnormal.filter(i => i.status === 'critical_low' || i.status === 'critical_high');
    const high     = abnormal.filter(i => i.status === 'high');
    const low      = abnormal.filter(i => i.status === 'low');
    let summary = '';
    if (critical.length > 0)
      summary += `⚠️ ATENÇÃO CRÍTICA: ${critical.map(i => i.marker).join(', ')} apresentam valores fora do intervalo crítico e requerem avaliação médica imediata. `;
    if (high.length > 0)
      summary += `Valores acima do limite: ${high.map(i => `${i.marker} (${Number(i.value).toFixed(2)} ${i.unit ?? ''})`).join(', ')}. `;
    if (low.length > 0)
      summary += `Valores abaixo do limite: ${low.map(i => `${i.marker} (${Number(i.value).toFixed(2)} ${i.unit ?? ''})`).join(', ')}. `;
    summary += 'Recomenda-se consultar um médico para avaliação clínica.';
    return summary;
  }
}
