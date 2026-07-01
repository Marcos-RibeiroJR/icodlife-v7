// apps/api/src/modules/aso/aso.service.ts
// ASO — Atestado de Saúde Ocupacional (NR-07). Emitido pelo médico examinador.
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export type ExamType = 'admissional' | 'periodico' | 'retorno' | 'mudanca_funcao' | 'demissional';
export type AsoResult = 'apto' | 'apto_restricoes' | 'inapto';

export interface CreateAsoDto {
  patientDoctorId?: string;
  companyId?: string;
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
  constructor(private prisma: PrismaService) {}

  private async getDoctor(userId: string) {
    const doc = await this.prisma.doctor.findUnique({
      where: { userId },
      include: { user: { select: { fullName: true } } },
    });
    if (!doc) throw new NotFoundException('Perfil de doutor não encontrado');
    return doc;
  }

  /** Dados do médico para preencher o cabeçalho do ASO. */
  async getContext(userId: string) {
    const doc = await this.getDoctor(userId);
    return {
      doctorName: doc.user?.fullName ?? '',
      doctorCrm: doc.crm,
      doctorUf: doc.uf,
      doctorSpecialty: doc.specialties?.[0] ?? '',
    };
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
    const aso = await this.prisma.aso.findFirst({ where: { id, doctorId: doc.id } });
    if (!aso) throw new NotFoundException('ASO não encontrado');
    return aso;
  }

  async create(userId: string, dto: CreateAsoDto) {
    const doc = await this.getDoctor(userId);

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

    return this.prisma.aso.create({
      data: {
        doctorId:        doc.id,
        patientDoctorId: dto.patientDoctorId ?? null,
        companyId,
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
    const ex