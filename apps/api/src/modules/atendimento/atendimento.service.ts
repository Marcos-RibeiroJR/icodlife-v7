// apps/api/src/modules/atendimento/atendimento.service.ts
// Módulo "Atendimento": guichês (postos de recepção), fila vinda da Base de
// Consultas, início/fim de atendimento e relatório de produtividade por
// funcionário/guichê.
import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AtendimentoService {
  constructor(private prisma: PrismaService) {}

  private async requireClinicByOwner(userId: string) {
    const clinic = await this.prisma.clinic.findUnique({ where: { ownerUserId: userId } });
    if (!clinic) throw new NotFoundException('Perfil de clínica não encontrado');
    return clinic;
  }

  private async visibleCompanyIds(clinicId: string): Promise<string[]> {
    const doctorLinks = await this.prisma.clinicDoctor.findMany({
      where: { clinicId, status: 'active' },
      select: { doctorId: true },
    });
    const companies = await this.prisma.company.findMany({
      where: { OR: [{ clinicId }, { doctorId: { in: doctorLinks.map((l) => l.doctorId) } }] },
      select: { id: true },
    });
    return companies.map((c) => c.id);
  }

  // ── Guichês ──────────────────────────────────────────────────────────────
  async createCounter(userId: string, dto: { label: string; staffId?: string }) {
    const clinic = await this.requireClinicByOwner(userId);
    if (!dto.label) throw new BadRequestException('Nome/identificação do guichê é obrigatório.');
    if (dto.staffId) await this.assertStaffInClinic(clinic.id, dto.staffId);
    return this.prisma.serviceCounter.create({
      data: { clinicId: clinic.id, label: dto.label, staffId: dto.staffId },
    });
  }

  async listCounters(userId: string) {
    const clinic = await this.requireClinicByOwner(userId);
    return this.prisma.serviceCounter.findMany({
      where: { clinicId: clinic.id },
      include: {
        staff: { include: { user: { select: { fullName: true } } } },
        sessions: { where: { status: 'in_progress' }, take: 1 },
      },
      orderBy: { label: 'asc' },
    });
  }

  async updateCounter(userId: string, id: string, dto: { label?: string; staffId?: string | null; isActive?: boolean }) {
    const clinic = await this.requireClinicByOwner(userId);
    const counter = await this.prisma.serviceCounter.findFirst({ where: { id, clinicId: clinic.id } });
    if (!counter) throw new NotFoundException('Guichê não encontrado.');
    if (dto.staffId) await this.assertStaffInClinic(clinic.id, dto.staffId);
    return this.prisma.serviceCounter.update({
      where: { id },
      data: {
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.staffId !== undefined && { staffId: dto.staffId }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  private async assertStaffInClinic(clinicId: string, staffId: string) {
    const staff = await this.prisma.clinicStaff.findFirst({ where: { id: staffId, clinicId, status: 'active' } });
    if (!staff) throw new BadRequestException('Funcionário não pertence a esta clínica.');
  }

  // ── Fila (vinda da Base de Consultas) ───────────────────────────────────
  async listQueue(userId: string) {
    const clinic = await this.requireClinicByOwner(userId);
    const companyIds = await this.visibleCompanyIds(clinic.id);
    if (companyIds.length === 0) return [];
    return this.prisma.consultationRequest.findMany({
      where: { companyId: { in: companyIds }, status: { in: ['pending', 'linked', 'queued'] } },
      include: { company: { select: { razaoSocial: true, nomeFantasia: true } } },
      orderBy: { receivedAt: 'asc' },
      take: 200,
    });
  }

  // ── Sessões de atendimento ──────────────────────────────────────────────
  async startSession(userId: string, dto: { counterId: string; consultationRequestId?: string }) {
    const clinic = await this.requireClinicByOwner(userId);
    const counter = await this.prisma.serviceCounter.findFirst({ where: { id: dto.counterId, clinicId: clinic.id } });
    if (!counter) throw new NotFoundException('Guichê não encontrado.');
    if (!counter.staffId) throw new BadRequestException('Vincule um funcionário a este guichê antes de iniciar o atendimento.');

    const active = await this.prisma.serviceSession.findFirst({ where: { counterId: counter.id, status: 'in_progress' } });
    if (active) throw new ConflictException('Este guichê já tem um atendimento em andamento.');

    if (dto.consultationRequestId) {
      const req = await this.prisma.consultationRequest.findFirst({ where: { id: dto.consultationRequestId } });
      if (!req) throw new NotFoundException('Solicitação da fila não encontrada.');
      await this.prisma.consultationRequest.update({ where: { id: req.id }, data: { status: 'in_service' } });
    }

    return this.prisma.serviceSession.create({
      data: {
        counterId: counter.id,
        staffId: counter.staffId,
        consultationRequestId: dto.consultationRequestId,
      },
      include: { consultationRequest: true, counter: true },
    });
  }

  async endSession(userId: string, id: string, dto: { asoId?: string; notes?: string; status?: 'completed' | 'canceled' }) {
    const clinic = await this.requireClinicByOwner(userId);
    const session = await this.prisma.serviceSession.findFirst({
      where: { id, counter: { clinicId: clinic.id } },
      include: { consultationRequest: true },
    });
    if (!session) throw new NotFoundException('Atendimento não encontrado.');
    if (session.status !== 'in_progress') throw new BadRequestException('Este atendimento já foi encerrado.');

    const finalStatus = dto.status ?? 'completed';
    const asoId = dto.asoId ?? session.asoId ?? undefined;
    const updated = await this.prisma.serviceSession.update({
      where: { id },
      data: { endedAt: new Date(), status: finalStatus, asoId, notes: dto.notes },
    });

    if (session.consultationRequestId) {
      await this.prisma.consultationRequest.update({
        where: { id: session.consultationRequestId },
        data: { status: finalStatus === 'completed' ? 'completed' : 'canceled' },
      });
    }

    if (finalStatus === 'completed' && asoId) {
      await this.chargeExamFee(clinic.id, session, asoId).catch(() => {});
    }

    return updated;
  }

  /** Cobrança automática do faturamento por tipo de exame ao concluir um
   * atendimento no guichê vinculado a um ASO — usa a tabela de preços da
   * clínica (ClinicExamPrice). Sem preço configurado para o tipo de exame,
   * não gera lançamento (a clínica pode lançar manualmente se quiser).
   * Idempotente via serviceSessionId (unique em DoctorCashEntry). */
  private async chargeExamFee(clinicId: string, session: any, asoId: string) {
    const already = await this.prisma.doctorCashEntry.findUnique({ where: { serviceSessionId: session.id } });
    if (already) return;

    const aso = await this.prisma.aso.findUnique({ where: { id: asoId } });
    if (!aso) return;

    const priceRow = await this.prisma.clinicExamPrice.findUnique({
      where: { clinicId_examType: { clinicId, examType: aso.examType } },
    });
    if (!priceRow || Number(priceRow.price) <= 0) return;

    const counter = await this.prisma.serviceCounter.findUnique({ where: { id: session.counterId } });
    const patientName = session.consultationRequest?.patientName ?? aso.workerName;

    await this.prisma.doctorCashEntry.create({
      data: {
        doctorId: aso.doctorId,
        clinicId,
        counterId: session.counterId,
        examType: aso.examType,
        serviceSessionId: session.id,
        type: 'income',
        category: 'exame_guiche',
        description: `Exame ${aso.examType} — ${patientName} (${counter?.label ?? 'guichê'})`,
        amount: priceRow.price,
        paymentMethod: 'internal',
        entryDate: new Date(),
        patientName,
      },
    });
  }

  async listActiveSessions(userId: string) {
    const clinic = await this.requireClinicByOwner(userId);
    return this.prisma.serviceSession.findMany({
      where: { status: 'in_progress', counter: { clinicId: clinic.id } },
      include: {
        counter: true,
        staff: { include: { user: { select: { fullName: true } } } },
        consultationRequest: true,
      },
      orderBy: { startedAt: 'asc' },
    });
  }

  // ── Produtividade ────────────────────────────────────────────────────────
  async productivity(userId: string, from?: string, to?: string) {
    const clinic = await this.requireClinicByOwner(userId);
    const where: any = { counter: { clinicId: clinic.id }, status: { in: ['completed', 'canceled'] } };
    if (from || to) {
      where.startedAt = {};
      if (from) where.startedAt.gte = new Date(from);
      if (to) where.startedAt.lte = new Date(to);
    }

    const sessions = await this.prisma.serviceSession.findMany({
      where,
      include: {
        staff: { include: { user: { select: { fullName: true } } } },
        counter: { select: { label: true } },
      },
    });

    const byStaff = new Map<string, { staffId: string; name: string; count: number; completed: number; totalMinutes: number }>();
    const byCounter = new Map<string, { counterId: string; label: string; count: number; totalMinutes: number }>();

    for (const s of sessions) {
      const durationMin = s.endedAt ? (new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 60000 : 0;

      const staffKey = s.staffId;
      const staffEntry = byStaff.get(staffKey) ?? { staffId: staffKey, name: s.staff.user?.fullName ?? 'Sem nome', count: 0, completed: 0, totalMinutes: 0 };
      staffEntry.count += 1;
      if (s.status === 'completed') staffEntry.completed += 1;
      staffEntry.totalMinutes += durationMin;
      byStaff.set(staffKey, staffEntry);

      const counterKey = s.counterId;
      const counterEntry = byCounter.get(counterKey) ?? { counterId: counterKey, label: s.counter.label, count: 0, totalMinutes: 0 };
      counterEntry.count += 1;
      counterEntry.totalMinutes += durationMin;
      byCounter.set(counterKey, counterEntry);
    }

    const staffStats = Array.from(byStaff.values())
      .map((s) => ({ ...s, avgMinutes: s.count ? Math.round((s.totalMinutes / s.count) * 10) / 10 : 0 }))
      .sort((a, b) => b.count - a.count);
    const counterStats = Array.from(byCounter.values())
      .map((c) => ({ ...c, avgMinutes: c.count ? Math.round((c.totalMinutes / c.count) * 10) / 10 : 0 }))
      .sort((a, b) => b.count - a.count);

    return {
      totalAtendimentos: sessions.length,
      porFuncionario: staffStats,
      porGuiche: counterStats,
    };
  }
}
