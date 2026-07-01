// apps/api/src/modules/doctor-prescriptions/doctor-prescriptions.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DoctorPrescriptionsService {
  constructor(private prisma: PrismaService) {}

  private async getDoctor(userId: string) {
    const doc = await this.prisma.doctor.findUnique({ where: { userId } });
    if (!doc) throw new NotFoundException('Perfil de doutor não encontrado');
    return doc;
  }

  // ── Receitas ──────────────────────────────────────────────────────────────

  async listPrescriptions(userId: string, page = 1, limit = 20, patientName?: string) {
    const doc  = await this.getDoctor(userId);
    const skip = (page - 1) * limit;
    const where: any = { doctorId: doc.id };
    if (patientName) where.patientName = { contains: patientName, mode: 'insensitive' };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.doctorPrescription.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { patientDoctor: { include: { user: { select: { fullName: true, icode: true } } } } },
      }),
      this.prisma.doctorPrescription.count({ where }),
    ]);
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async createPrescription(userId: string, dto: {
    patientName:      string;
    patientAge?:      number;
    patientIcode?:    string;
    patientDoctorId?: string;
    items:            any[];
    diagnosis?:       string;
    notes?:           string;
    validDays?:       number;
  }) {
    const doc = await this.getDoctor(userId);
    return this.prisma.doctorPrescription.create({
      data: {
        doctorId:        doc.id,
        patientName:     dto.patientName,
        patientAge:      dto.patientAge,
        patientIcode:    dto.patientIcode,
        patientDoctorId: dto.patientDoctorId,
        items:           dto.items,
        diagnosis:       dto.diagnosis,
        notes:           dto.notes,
        validDays:       dto.validDays ?? 30,
      },
    });
  }

  async getPrescription(userId: string, id: string) {
    const doc  = await this.getDoctor(userId);
    const item = await this.prisma.doctorPrescription.findFirst({
      where: { id, doctorId: doc.id },
      include: { patientDoctor: { include: { user: { select: { fullName: true } } } } },
    });
    if (!item) throw new NotFoundException('Receita não encontrada');
    return item;
  }

  async cancelPrescription(userId: string, id: string) {
    const doc  = await this.getDoctor(userId);
    const item = await this.prisma.doctorPrescription.findFirst({ where: { id, doctorId: doc.id } });
    if (!item) throw new NotFoundException('Receita não encontrada');
    return this.prisma.doctorPrescription.update({ where: { id }, data: { status: 'canceled' } });
  }

  // ── Pedidos de Exame ──────────────────────────────────────────────────────

  async listExamOrders(userId: string, page = 1, limit = 20, patientName?: string) {
    const doc  = await this.getDoctor(userId);
    const skip = (page - 1) * limit;
    const where: any = { doctorId: doc.id };
    if (patientName) where.patientName = { contains: patientName, mode: 'insensitive' };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.doctorExamOrder.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { patientDoctor: { include: { user: { select: { fullName: true, icode: true } } } } },
      }),
      this.prisma.doctorExamOrder.count({ where }),
    ]);
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async createExamOrder(userId: string, dto: {
    patientName:      string;
    patientAge?:      number;
    patientIcode?:    string;
    patientDoctorId?: string;
    exams:            any[];
    clinicalInfo?:    string;
    urgency?:         string;
    notes?:           string;
  }) {
    const doc = await this.getDoctor(userId);
    return this.prisma.doctorExamOrder.create({
      data: {
        doctorId:        doc.id,
        patientName:     dto.patientName,
        patientAge:      dto.patientAge,
        patientIcode:    dto.patientIcode,
        patientDoctorId: dto.patientDoctorId,
        exams:           dto.exams,
        clinicalInfo:    dto.clinicalInfo,
        urgency:         dto.urgency ?? 'routine',
        notes:           dto.notes,
      },
    });
  }

  async getExamOrder(userId: string, id: string) {
    const doc  = await this.getDoctor(userId);
    const item = await this.prisma.doctorExamOrder.findFirst({
      where: { id, doctorId: doc.id },
      include: { patientDoctor: { include: { user: { select: { fullName: true } } } } },
    });
    if (!item) throw new NotFoundException('Pedido não encontrado');
    return item;
  }

  async cancelExamOrder(userId: string, id: string) {
    const doc  = await this.getDoctor(userId);
    const item = await this.prisma.doctorExamOrder.findFirst({ where: { id, doctorId: doc.id } });
    if (!item) throw new NotFoundException('Pedido não encontrado');
    return this.prisma.doctorExamOrder.update({ where: { id }, data: { status: 'canceled' } });
  }

  // ── Contexto para preencher formulário ────────────────────────────────────
  // Retorna dados do médico para montar o cabeçalho da receita (CRM, nome, etc.)

  async getDoctorContext(userId: string) {
    const doc = await this.prisma.doctor.findUnique({
      where: { userId },
      include: { user: { select: { fullName: true, email: true, avatarUrl: true } } },
    });
    return doc;
  }
}
