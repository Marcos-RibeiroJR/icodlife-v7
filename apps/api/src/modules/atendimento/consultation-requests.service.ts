// apps/api/src/modules/atendimento/consultation-requests.service.ts
// "Meus Funcionários" + "Base de Consultas": cadastro de funcionários das
// empresas clientes e repositório de solicitações de exame/consulta
// recebidas via formulário público tokenizado (ou lançadas manualmente
// pela recepção da clínica).
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MailerService } from '../../common/mailer/mailer.service';

@Injectable()
export class ConsultationRequestsService {
  constructor(
    private prisma: PrismaService,
    private mailer: MailerService,
  ) {}

  private async requireClinicByOwner(userId: string) {
    const clinic = await this.prisma.clinic.findUnique({ where: { ownerUserId: userId } });
    if (!clinic) throw new NotFoundException('Perfil de clínica não encontrado');
    return clinic;
  }

  /** Empresas visíveis para a clínica logada: vinculadas diretamente ou via médico ativo da clínica. */
  private async visibleCompanyIds(clinicId: string): Promise<string[]> {
    const doctorLinks = await this.prisma.clinicDoctor.findMany({
      where: { clinicId, status: 'active' },
      select: { doctorId: true },
    });
    const doctorIds = doctorLinks.map((l) => l.doctorId);
    const companies = await this.prisma.company.findMany({
      where: { OR: [{ clinicId }, { doctorId: { in: doctorIds } }] },
      select: { id: true },
    });
    return companies.map((c) => c.id);
  }

  // ── Busca no cadastro único iCODLIFE (para vincular funcionário/paciente) ──
  async searchIcodlifeUsers(q?: string) {
    const query = (q ?? '').trim();
    if (query.length < 2) return [];
    return this.prisma.user.findMany({
      where: {
        status: 'active',
        OR: [
          { fullName: { contains: query, mode: 'insensitive' } },
          { icode: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: { id: true, fullName: true, email: true, icode: true, avatarUrl: true, bloodType: true },
      take: 10,
    });
  }

  // ── Meus Funcionários ─────────────────────────────────────────────────────
  async searchEmployees(userId: string, q?: string) {
    const clinic = await this.requireClinicByOwner(userId);
    const companyIds = await this.visibleCompanyIds(clinic.id);
    if (companyIds.length === 0) return [];

    const query = (q ?? '').trim();
    return this.prisma.companyEmployee.findMany({
      where: {
        companyId: { in: companyIds },
        ...(query
          ? { OR: [{ icode: { equals: query, mode: 'insensitive' } }, { fullName: { contains: query, mode: 'insensitive' } }] }
          : {}),
      },
      include: {
        company: { select: { razaoSocial: true, nomeFantasia: true } },
        user: { select: { id: true, fullName: true, email: true, avatarUrl: true, icode: true } },
      },
      orderBy: { fullName: 'asc' },
      take: 100,
    });
  }

  async createEmployee(userId: string, dto: any) {
    const clinic = await this.requireClinicByOwner(userId);
    const companyIds = await this.visibleCompanyIds(clinic.id);
    if (!dto.companyId || !companyIds.includes(dto.companyId)) {
      throw new BadRequestException('Empresa inválida ou não pertence a esta clínica.');
    }
    if (!dto.fullName) throw new BadRequestException('Nome do funcionário é obrigatório.');

    const linkedUser = dto.icode
      ? await this.prisma.user.findUnique({ where: { icode: dto.icode.trim() } })
      : null;

    return this.prisma.companyEmployee.create({
      data: {
        companyId: dto.companyId,
        userId: linkedUser?.id,
        icode: dto.icode?.trim(),
        fullName: dto.fullName,
        cpf: dto.cpf,
        sector: dto.sector,
        role: dto.role,
      },
    });
  }

  // ── Empresa: token público de intake ────────────────────────────────────
  async rotateIntakeToken(userId: string, companyId: string) {
    const clinic = await this.requireClinicByOwner(userId);
    const companyIds = await this.visibleCompanyIds(clinic.id);
    if (!companyIds.includes(companyId)) throw new NotFoundException('Empresa não encontrada.');
    const intakeToken = randomUUID();
    await this.prisma.company.update({ where: { id: companyId }, data: { intakeToken } });
    return { intakeToken };
  }

  // ── Formulário público (sem login) ──────────────────────────────────────
  async getCompanyByToken(token: string) {
    const company = await this.prisma.company.findUnique({
      where: { intakeToken: token },
      select: { id: true, razaoSocial: true, nomeFantasia: true },
    });
    if (!company) throw new NotFoundException('Link de solicitação inválido ou expirado.');
    return company;
  }

  async submitPublicRequest(token: string, dto: any) {
    const company = await this.prisma.company.findUnique({ where: { intakeToken: token } });
    if (!company) throw new NotFoundException('Link de solicitação inválido ou expirado.');
    return this.createRequest(company.id, dto, 'form');
  }

  // ── Base de Consultas ────────────────────────────────────────────────────
  async createManualRequest(userId: string, dto: any) {
    const clinic = await this.requireClinicByOwner(userId);
    const companyIds = await this.visibleCompanyIds(clinic.id);
    if (!dto.companyId || !companyIds.includes(dto.companyId)) {
      throw new BadRequestException('Empresa inválida ou não pertence a esta clínica.');
    }
    return this.createRequest(dto.companyId, dto, 'manual');
  }

  /** Núcleo compartilhado: auto-vínculo por ICODE + cópia do laudo psicossocial + notificação. */
  private async createRequest(companyId: string, dto: any, source: 'form' | 'manual' | 'email') {
    if (!dto.patientName) throw new BadRequestException('Nome do paciente/funcionário é obrigatório.');
    if (!dto.examType) throw new BadRequestException('Tipo de exame é obrigatório.');

    const icode = dto.patientIcode?.trim() || undefined;
    let userId: string | undefined;
    let employeeId: string | undefined;
    let psychosocialAssessmentId: string | null = null;
    let psychosocialSnapshot: any = null;
    let status: 'pending' | 'linked' = 'pending';

    if (icode) {
      const user = await this.prisma.user.findUnique({ where: { icode } });
      if (user) {
        userId = user.id;
        status = 'linked';

        // Vincula (ou cria) o registro de funcionário desta empresa para esse usuário.
        const employee = await this.prisma.companyEmployee.findFirst({ where: { companyId, userId: user.id } });
        employeeId = employee?.id ?? (await this.prisma.companyEmployee.create({
          data: { companyId, userId: user.id, icode, fullName: dto.patientName },
        })).id;

        // Laudo psicossocial mais recente COM consentimento de compartilhamento.
        const shared = await this.prisma.psychosocialAssessment.findFirst({
          where: { userId: user.id, sharedWithDoctor: true },
          orderBy: { createdAt: 'desc' },
        });
        if (shared) {
          psychosocialAssessmentId = shared.id;
          psychosocialSnapshot = {
            assessmentId: shared.id,
            assessedAt: shared.createdAt,
            overallScore: shared.score,
            overallTier: shared.riskLevel,
            topRisks: shared.topRisks ?? [],
            categories: shared.categoryBreakdown ?? [],
          };
        }
      }
    }

    const created = await this.prisma.consultationRequest.create({
      data: {
        companyId,
        employeeId,
        userId,
        patientName: dto.patientName,
        patientIcode: icode,
        examType: dto.examType,
        requestedBy: dto.requestedBy,
        requesterEmail: dto.requesterEmail,
        notes: dto.notes,
        psychosocialAssessmentId,
        psychosocialSnapshot,
        source,
        status,
      },
      include: { company: { select: { razaoSocial: true, nomeFantasia: true } } },
    });

    await this.notifyClinic(created).catch(() => {});
    return created;
  }

  private async notifyClinic(request: any) {
    const company = await this.prisma.company.findUnique({
      where: { id: request.companyId },
      select: { clinicId: true, doctorId: true, razaoSocial: true },
    });
    let recipient: string | null = null;
    if (company?.clinicId) {
      const clinic = await this.prisma.clinic.findUnique({
        where: { id: company.clinicId },
        select: { email: true, ownerUser: { select: { email: true } } },
      });
      recipient = clinic?.email || clinic?.ownerUser?.email || null;
    }
    if (!recipient && company?.doctorId) {
      const doctor = await this.prisma.doctor.findUnique({
        where: { id: company.doctorId },
        select: { user: { select: { email: true } } },
      });
      recipient = doctor?.user?.email || null;
    }
    if (!recipient) return;

    const linked = request.status === 'linked'
      ? 'O paciente já está cadastrado no IcodLife e foi vinculado automaticamente pelo ICODE.'
      : 'O paciente ainda não foi localizado pelo ICODE informado — verifique se ele já se cadastrou na plataforma.';

    await this.mailer.send({
      to: recipient,
      subject: `Nova solicitação de exame — ${request.patientName} (${company?.razaoSocial ?? 'empresa'})`,
      html: `
        <p>Nova solicitação recebida na Base de Consultas.</p>
        <p><b>Paciente:</b> ${request.patientName}${request.patientIcode ? ` (ICODE ${request.patientIcode})` : ''}</p>
        <p><b>Tipo de exame:</b> ${request.examType}</p>
        <p><b>Empresa:</b> ${company?.razaoSocial ?? '-'}</p>
        <p>${linked}</p>
      `,
    });
  }

  async listRequests(userId: string, filters: { status?: string; companyId?: string }) {
    const clinic = await this.requireClinicByOwner(userId);
    const companyIds = await this.visibleCompanyIds(clinic.id);
    if (companyIds.length === 0) return [];
    return this.prisma.consultationRequest.findMany({
      where: {
        companyId: filters.companyId ? filters.companyId : { in: companyIds },
        ...(filters.status ? { status: filters.status as any } : {}),
      },
      include: { company: { select: { razaoSocial: true, nomeFantasia: true } } },
      orderBy: { receivedAt: 'desc' },
      take: 200,
    });
  }

  async getRequest(userId: string, id: string) {
    const clinic = await this.requireClinicByOwner(userId);
    const companyIds = await this.visibleCompanyIds(clinic.id);
    const req = await this.prisma.consultationRequest.findFirst({
      where: { id, companyId: { in: companyIds } },
      include: { company: true, employee: true },
    });
    if (!req) throw new NotFoundException('Solicitação não encontrada.');
    return req;
  }

  async updateStatus(userId: string, id: string, status: string) {
    const clinic = await this.requireClinicByOwner(userId);
    const companyIds = await this.visibleCompanyIds(clinic.id);
    const req = await this.prisma.consultationRequest.findFirst({ where: { id, companyId: { in: companyIds } } });
    if (!req) throw new NotFoundException('Solicitação não encontrada.');
    return this.prisma.consultationRequest.update({ where: { id }, data: { status: status as any } });
  }
}
