// apps/api/src/modules/doctor-staff/doctor-staff.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DoctorStaffService {
  constructor(private prisma: PrismaService) {}

  private async getDoctor(userId: string) {
    const doc = await this.prisma.doctor.findUnique({ where: { userId } });
    if (!doc) throw new NotFoundException('Perfil de doutor não encontrado');
    return doc;
  }

  async listStaff(userId: string) {
    const doc = await this.getDoctor(userId);
    return this.prisma.doctorStaff.findMany({
      where:   { doctorId: doc.id, status: 'active' },
      include: { user: { select: { id: true, fullName: true, icode: true, avatarUrl: true, email: true } } },
      orderBy: { startedAt: 'asc' },
    });
  }

  async addStaff(userId: string, dto: {
    icode:       string;
    role?:       string;
    customRole?: string;
    notes?:      string;
  }) {
    const doc     = await this.getDoctor(userId);
    const member  = await this.prisma.user.findFirst({
      where: { icode: dto.icode.trim(), status: 'active' },
    });
    if (!member) throw new NotFoundException('Nenhum usuário com este ICODE encontrado');

    // Evita duplicata ativa
    const existing = await this.prisma.doctorStaff.findFirst({
      where: { doctorId: doc.id, userId: member.id, status: 'active' },
    });
    if (existing) throw new ConflictException('Funcionário já vinculado');

    return this.prisma.doctorStaff.create({
      data: {
        doctorId:   doc.id,
        userId:     member.id,
        role:       dto.role ?? 'assistant',
        customRole: dto.customRole,
        notes:      dto.notes,
      },
      include: { user: { select: { id: true, fullName: true, icode: true, avatarUrl: true, email: true } } },
    });
  }

  async updateStaff(userId: string, staffId: string, dto: {
    role?:       string;
    customRole?: string;
    notes?:      string;
  }) {
    const doc    = await this.getDoctor(userId);
    const record = await this.prisma.doctorStaff.findFirst({ where: { id: staffId, doctorId: doc.id } });
    if (!record) throw new NotFoundException('Vínculo não encontrado');

    return this.prisma.doctorStaff.update({
      where: { id: staffId },
      data: {
        ...(dto.role       !== undefined && { role: dto.role }),
        ...(dto.customRole !== undefined && { customRole: dto.customRole }),
        ...(dto.notes      !== undefined && { notes: dto.notes }),
      },
      include: { user: { select: { id: true, fullName: true, icode: true, avatarUrl: true, email: true } } },
    });
  }

  async removeStaff(userId: string, staffId: string) {
    const doc    = await this.getDoctor(userId);
    const record = await this.prisma.doctorStaff.findFirst({ where: { id: staffId, doctorId: doc.id } });
    if (!record) throw new NotFoundException('Vínculo não encontrado');

    return this.prisma.doctorStaff.update({
      where: { id: staffId },
      data:  { status: 'inactive', endedAt: new Date() },
    });
  }
}
