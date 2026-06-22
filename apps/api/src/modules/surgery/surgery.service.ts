// apps/api/src/modules/surgery/surgery.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SurgeryStatus } from '@prisma/client';

export interface CreateSurgeryDto {
  procedureName:  string;
  procedureCode?: string;
  surgeryDate?:   string;   // ISO date — passado
  scheduledDate?: string;   // ISO date — futuro
  status?:        'scheduled' | 'completed' | 'canceled';
  hospitalName?:  string;
  hospitalCity?:  string;
  surgeonName?:   string;
  anesthesiaType?: string;
  indication?:    string;
  technique?:     string;
  duration?:      number;
  bloodLoss?:     number;
  complications?: string[];
  recovery?:      string;
  hospitalDays?:  number;
  returnToWork?:  number;
  implants?:      string[];
  familyMemberId?: string;
  notes?:         string;
}

export type UpdateSurgeryDto = Partial<CreateSurgeryDto>;

@Injectable()
export class SurgeryService {
  constructor(private prisma: PrismaService) {}

  // ─── CRUD do usuário ────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateSurgeryDto) {
    return this.prisma.surgery.create({
      data: {
        userId,
        procedureName:  dto.procedureName,
        procedureCode:  dto.procedureCode,
        surgeryDate:    dto.surgeryDate    ? new Date(dto.surgeryDate)    : null,
        scheduledDate:  dto.scheduledDate  ? new Date(dto.scheduledDate)  : null,
        status:         (dto.status as SurgeryStatus) ?? SurgeryStatus.completed,
        hospitalName:   dto.hospitalName,
        hospitalCity:   dto.hospitalCity,
        surgeonName:    dto.surgeonName,
        anesthesiaType: dto.anesthesiaType,
        indication:     dto.indication,
        technique:      dto.technique,
        duration:       dto.duration,
        bloodLoss:      dto.bloodLoss,
        complications:  dto.complications  ?? [],
        recovery:       dto.recovery,
        hospitalDays:   dto.hospitalDays,
        returnToWork:   dto.returnToWork,
        implants:       dto.implants       ?? [],
        familyMemberId: dto.familyMemberId,
        notes:          dto.notes,
      },
      include: { familyMember: { select: { fullName: true, relationship: true } } },
    });
  }

  async findAll(userId: string) {
    return this.prisma.surgery.findMany({
      where: { userId },
      orderBy: [
        { status: 'asc' },       // scheduled first
        { surgeryDate: 'desc' },
      ],
      include: { familyMember: { select: { fullName: true, relationship: true } } },
    });
  }

  async findOne(userId: string, id: string) {
    const s = await this.prisma.surgery.findUnique({
      where: { id },
      include: { familyMember: { select: { fullName: true, relationship: true } } },
    });
    if (!s) throw new NotFoundException('Cirurgia não encontrada');
    if (s.userId !== userId) throw new ForbiddenException();
    return s;
  }

  async update(userId: string, id: string, dto: UpdateSurgeryDto) {
    await this.findOne(userId, id); // valida ownership
    return this.prisma.surgery.update({
      where: { id },
      data: {
        ...dto,
        surgeryDate:   dto.surgeryDate   ? new Date(dto.surgeryDate)   : undefined,
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
        status:        dto.status as SurgeryStatus | undefined,
      },
      include: { familyMember: { select: { fullName: true, relationship: true } } },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.surgery.delete({ where: { id } });
  }

  // ─── Cirurgias da família (hereditário) ─────────────────────────────────────

  async findFamilySurgeries(userId: string) {
    // Busca todos os membros da família do usuário e suas cirurgias
    return this.prisma.surgery.findMany({
      where: {
        userId,
        familyMemberId: { not: null },
      },
      include: { familyMember: { select: { fullName: true, relationship: true, customLabel: true } } },
      orderBy: { surgeryDate: 'desc' },
    });
  }

  // ─── Resumo para dashboard ───────────────────────────────────────────────────

  async getSummary(userId: string) {
    const [total, scheduled, withImplants, familySurgeries] = await Promise.all([
      this.prisma.surgery.count({ where: { userId, status: 'completed' } }),
      this.prisma.surgery.count({ where: { userId, status: 'scheduled' } }),
      this.prisma.surgery.count({ where: { userId, implants: { isEmpty: false } } }),
      this.prisma.surgery.count({ where: { userId, familyMemberId: { not: null } } }),
    ]);

    const nextScheduled = await this.prisma.surgery.findFirst({
      where: { userId, status: 'scheduled' },
      orderBy: { scheduledDate: 'asc' },
      select: { procedureName: true, scheduledDate: true, hospitalName: true },
    });

    return { total, scheduled, withImplants, familySurgeries, nextScheduled };
  }
}
