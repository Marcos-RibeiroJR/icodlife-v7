// apps/api/src/modules/aso/aso.service.ts
// ASO — Atestado de Saúde Ocupacional (NR-07). Emitido pelo médico examinador.
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as QRCode from 'qrcode';
import { AsoPdfService } from './aso-pdf.service';
import { createDocumentSignature, verifyDocumentToken } from '../export/export.service';

export type ExamType = 'admissional' | 'periodico' | 'retorno' | 'mudanca_funcao' | 'demissional';
export type AsoResult = 'apto' | 'apto_restricoes' | 'inapto';

export interface CreateAsoDto {
  patientDoctorId?: string;
  companyId?: string;
  // Clínica emissora (opcional — médico pode emitir sem vínculo a uma clínica)
  clinicId?: string;
  // Empresa
  companyName: string;
  companyCnpj?: string;
  companyAddress?: string;
  companyPhone?: string;
  // Trabalhador
  workerName: string;
  workerCpf?: string;
  workerRg?: string;
  workerBirthDate?: string;
  workerSex?: string;
  workerRole?: string;
  workerSector?: string;
  workerRegistration?: string;
  admissionDate?: string;
  // Exame
  examType: ExamType;
  examDate?: string;
  jobDescription?: string;
  // Riscos e exames complementares
  risks?: string[];
  complementaryExams?: any[];
  // Parecer
  result: AsoResult;
  restrictions?: string;
  observations?: string;
  // Médico (preenchido pelo contexto se omitido)
  doctorName?: string;
  doctorCrm?: string;
  doctorUf?: string;
  doctorSpecialty?: string;
}

const EXAM_TYPES: ExamType[] = ['admissional', 'periodico', 'retorno', 'mudanca_funcao', 'demissional'];
const RESULTS: AsoResult[] = ['apto', 'apto_restricoes', 'inapto'];

@Injectable()
export class AsoService {
  constructor(
    private prisma: PrismaService,
    private pdfService: AsoPdfService,
  ) {}

  private async getDoctor(userId: string) {
    const doc = await this.prisma.doctor.findUnique({
      where: { userId },
      include: { user: { select: { fullName: true } } },
    });
    if (!doc) throw new NotFoundException('Perfil de doutor não encontrado');
    return doc;
  }

  /** Dados do médico (+ clínicas ativas vinculadas) para preencher o cabeçalho do ASO. */
  async getContext(userId: string) {
    const doc = await this.getDoctor(userId);
    const links = await this.prisma.clinicDoctor.findMany({
      where: { doctorId: doc.id, status: 'active' },
      include: { clinic: { select: { id: true, nomeFantasia: true, razaoSocial: true, cnpj: true } } },
      orderBy: { joinedAt: 'asc' },
    });
    return {
      doctorName: doc.user?.fullName ?? '',
      doctorCrm: doc.crm,
      doctorUf: doc.uf,
      doctorSpecialty: doc.specialties?.[0] ?? '',
      clinics: links.map((l) => ({
        id: l.clinic.id,
        name: l.clinic.nomeFantasia || l.clinic.razaoSocial,
        cnpj: l.clinic.cnpj,
      })),
    };
  }

  /** Garante que o médico esteja ativamente vinculado à clínica informada. */
  private async assertDoctorInClinic(doctorId: string, clinicId: string) {
    const link = await this.prisma.clinicDoctor.findUnique({
      where: { clinicId_doctorId: { clinicId, doctorId } },
    });
    if (!link || link.status !== 'active') {
      throw new BadRequestException('Médico não está vinculado a esta clínica.');
    }
  }

  async list(userId: string, page = 1, limit = 20, worker?: string) {
    const doc = await this.getDoctor(userId);
    const skip = (page - 1) * limit;
    const where: any = { doctorId: doc.id };
    if (worker) where.workerName = { contains: worker, mode: 'insensitive' };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.aso.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.aso.count({ where }),
    ]);
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async get(userId: string, id: string) {
    const doc = await this.getDoctor(userId);
    const aso = await this.prisma.aso.findFirst({
      where: { id, doctorId: doc.id },
      include: { clinic: true },
    });
    if (!aso) throw new NotFoundException('ASO não encontrado');
    return aso;
  }

  async create(userId: string, dto: CreateAsoDto) {
    const doc = await this.getDoctor(userId);

    // Clínica emissora (opcional): valida vínculo ativo antes de gravar.
    let clinicId: string | null = null;
    if (dto.clinicId) {
      await this.assertDoctorInClinic(doc.id, dto.clinicId);
      clinicId = dto.clinicId;
    }

    // Vínculo com empresa cadastrada: puxa os dados automaticamente (snapshot no ASO).
    let companyId: string | null = null;
    if (dto.companyId) {
      const company = await this.prisma.company.findFirst({
        where: { id: dto.companyId, doctorId: doc.id },
      });
      if (!company) throw new NotFoundException('Empresa vinculada não encontrada.');
      companyId = company.id;
      const addr = [company.logradouro, company.numero, company.bairro, company.cidade, company.estado]
        .filter(Boolean).join(', ');
      dto.companyName    = dto.companyName    || company.razaoSocial;
      dto.companyCnpj    = dto.companyCnpj    || company.cnpj;
      dto.companyAddress = dto.companyAddress || addr || undefined;
      dto.companyPhone   = dto.companyPhone   || company.telefonePrincipal || company.telefoneRh || undefined;
    }

    this.validate(dto);

    // Riscos psicossociais (NR-01): se o trabalhador é um paciente cadastrado (patientDoctorId)
    // e compartilhou o laudo mais recente com o médico (sharedWithDoctor=true), anexa um
    // snapshot ao ASO. Sem esse consentimento explícito, o ASO é emitido normalmente, sem a seção.
    let psychosocialAssessmentId: string | null = null;
    let psychosocialSnapshot: any = null;
    if (dto.patientDoctorId) {
      const patientDoctor = await this.prisma.patientDoctor.findUnique({ where: { id: dto.patientDoctorId } });
      if (patientDoctor?.userId) {
        const shared = await this.prisma.psychosocialAssessment.findFirst({
          where: { userId: patientDoctor.userId, sharedWithDoctor: true },
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

    const created = await this.prisma.aso.create({
      data: {
        doctorId:        doc.id,
        patientDoctorId: dto.patientDoctorId ?? null,
        companyId,
        clinicId,
        psychosocialAssessmentId,
        psychosocialSnapshot,
        companyName:     dto.companyName,
        companyCnpj:     dto.companyCnpj,
        companyAddress:  dto.companyAddress,
        companyPhone:    dto.companyPhone,
        workerName:      dto.workerName,
        workerCpf:       dto.workerCpf,
        workerRg:        dto.workerRg,
        workerBirthDate: dto.workerBirthDate ? new Date(dto.workerBirthDate) : null,
        workerSex:       dto.workerSex,
        workerRole:      dto.workerRole,
        workerSector:    dto.workerSector,
        workerRegistration: dto.workerRegistration,
        admissionDate:   dto.admissionDate ? new Date(dto.admissionDate) : null,
        examType:        dto.examType,
        examDate:        dto.examDate ? new Date(dto.examDate) : new Date(),
        jobDescription:  dto.jobDescription,
        risks:           (dto.risks ?? []) as any,
        complementaryExams: (dto.complementaryExams ?? []) as any,
        result:          dto.result,
        restrictions:    dto.restrictions,
        observations:    dto.observations,
        doctorName:      dto.doctorName || doc.user?.fullName || 'Médico Examinador',
        doctorCrm:       dto.doctorCrm  || doc.crm,
        doctorUf:        dto.doctorUf   || doc.uf,
        doctorSpecialty: dto.doctorSpecialty || doc.specialties?.[0] || null,
        signedAt:        new Date(),
      },
    });

    return this.signAso(created);
  }

  /** Gera e persiste a assinatura digital (HMAC-SHA256) do ASO. */
  private async signAso(aso: any) {
    const sig = createDocumentSignature(aso.id, aso.workerName);
    return this.prisma.aso.update({
      where: { id: aso.id },
      data: {
        signatureHash:      sig.hash,
        verifyToken:        sig.token,
        signatureExpiresAt: new Date(sig.expiresAt),
        ...(aso.signedAt ? {} : { signedAt: new Date(sig.issuedAt) }),
      },
    });
  }

  /** Garante que o ASO possua assinatura (backfill de registros antigos). */
  private async ensureSignature(aso: any) {
    if (aso.verifyToken && aso.signatureHash) return aso;
    return this.signAso(aso);
  }

  async update(userId: string, id: string, dto: Partial<CreateAsoDto>) {
    const doc = await this.getDoctor(userId);
    const existing = await this.prisma.aso.findFirst({ where: { id, doctorId: doc.id } });
    if (!existing) throw new NotFoundException('ASO não encontrado');
    if (dto.examType && !EXAM_TYPES.includes(dto.examType)) throw new BadRequestException('Tipo de exame inválido');
    if (dto.result && !RESULTS.includes(dto.result)) throw new BadRequestException('Parecer inválido');

    return this.prisma.aso.update({
      where: { id },
      data: {
        ...(dto.companyName     !== undefined && { companyName: dto.companyName }),
        ...(dto.companyCnpj     !== undefined && { companyCnpj: dto.companyCnpj }),
        ...(dto.companyAddress  !== undefined && { companyAddress: dto.companyAddress }),
        ...(dto.companyPhone    !== undefined && { companyPhone: dto.companyPhone }),
        ...(dto.workerName      !== undefined && { workerName: dto.workerName }),
        ...(dto.workerCpf       !== undefined && { workerCpf: dto.workerCpf }),
        ...(dto.workerRg        !== undefined && { workerRg: dto.workerRg }),
        ...(dto.workerBirthDate !== undefined && { workerBirthDate: dto.workerBirthDate ? new Date(dto.workerBirthDate) : null }),
        ...(dto.workerSex       !== undefined && { workerSex: dto.workerSex }),
        ...(dto.workerRole      !== undefined && { workerRole: dto.workerRole }),
        ...(dto.workerSector    !== undefined && { workerSector: dto.workerSector }),
        ...(dto.workerRegistration !== undefined && { workerRegistration: dto.workerRegistration }),
        ...(dto.admissionDate   !== undefined && { admissionDate: dto.admissionDate ? new Date(dto.admissionDate) : null }),
        ...(dto.examType        !== undefined && { examType: dto.examType }),
        ...(dto.examDate        !== undefined && { examDate: dto.examDate ? new Date(dto.examDate) : new Date() }),
        ...(dto.jobDescription  !== undefined && { jobDescription: dto.jobDescription }),
        ...(dto.risks           !== undefined && { risks: dto.risks as any }),
        ...(dto.complementaryExams !== undefined && { complementaryExams: dto.complementaryExams as any }),
        ...(dto.result          !== undefined && { result: dto.result }),
        ...(dto.restrictions    !== undefined && { restrictions: dto.restrictions }),
        ...(dto.observations    !== undefined && { observations: dto.observations }),
      },
    });
  }

  async cancel(userId: string, id: string) {
    const doc = await this.getDoctor(userId);
    const existing = await this.prisma.aso.findFirst({ where: { id, doctorId: doc.id } });
    if (!existing) throw new NotFoundException('ASO não encontrado');
    return this.prisma.aso.update({ where: { id }, data: { status: 'canceled' } });
  }

  /** Gera o PDF assinado do ASO (com QR de validação). */
  async generatePdf(userId: string, id: string): Promise<{ buffer: Buffer; aso: any }> {
    const doc = await this.getDoctor(userId);
    let aso: any = await this.prisma.aso.findFirst({
      where: { id, doctorId: doc.id },
      include: { clinic: true },
    });
    if (!aso) throw new NotFoundException('ASO não encontrado');

    aso = { ...(await this.ensureSignature(aso)), clinic: aso.clinic };

    const apiUrl = process.env.API_URL ?? 'https://api.icodlife.com';
    const verifyUrl = `${apiUrl}/api/v1/aso/verify/${aso.verifyToken}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      width: 140, margin: 1, color: { dark: '#002B5C', light: '#FFFFFF' },
    });
    const qrBuffer = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');

    const buffer = await this.pdfService.generate({ aso, verifyUrl, qrBuffer });
    return { buffer, aso };
  }

  /** Verificação pública de autenticidade via token do QR. */
  async verifyByToken(token: string) {
    const platform = 'IcodLife / Sou Doutor';
    const checkedAt = new Date().toISOString();
    const result = verifyDocumentToken(token);
    if (!result.valid || !result.sub) {
      return { valid: false, reason: result.reason ?? 'Token inválido', platform, checkedAt };
    }

    const aso = await this.prisma.aso.findUnique({ where: { id: result.sub } });
    if (!aso) {
      return { valid: false, reason: 'Documento não localizado', platform, checkedAt };
    }
    if (aso.status === 'canceled') {
      return {
        valid: false,
        reason: 'ASO cancelado pelo médico examinador',
        platform, checkedAt,
        document: 'Atestado de Saúde Ocupacional (NR-07)',
      };
    }

    return {
      valid: true,
      platform,
      document: 'Atestado de Saúde Ocupacional (NR-07)',
      worker: aso.workerName,
      company: aso.companyName,
      examType: aso.examType,
      result: aso.result,
      examDate: aso.examDate,
      doctor: `${aso.doctorName} — CRM ${aso.doctorCrm}/${aso.doctorUf}`,
      issuedAt: result.issuedAt,
      expiresAt: result.expiresAt,
      checkedAt,
      message: '✅ ASO autêntico. Assinatura digital válida.',
    };
  }

  private validate(dto: CreateAsoDto) {
    if (!dto.companyName) throw new BadRequestException('Razão social da empresa é obrigatória.');
    if (!dto.workerName) throw new BadRequestException('Nome do trabalhador é obrigatório.');
    if (!dto.examType || !EXAM_TYPES.includes(dto.examType)) throw new BadRequestException('Tipo de exame inválido.');
    if (!dto.result || !RESULTS.includes(dto.result)) throw new BadRequestException('Parecer médico inválido.');
    if (dto.result === 'apto_restricoes' && !dto.restrictions) {
      throw new BadRequestException('Para "Apto com restrições" é necessário descrever as restrições.');
    }
  }
}
