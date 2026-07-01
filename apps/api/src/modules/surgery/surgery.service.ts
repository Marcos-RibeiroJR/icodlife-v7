// apps/api/src/modules/surgery/surgery.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SurgeryStatus } from '../../generated/prisma';

export interface CreateSurgeryDto {
  procedureName:   string;
  procedureCode?:  string;
  performedAt?:    string;   // ISO date — surgery performed date
  scheduledAt?:    string;   // ISO date — future scheduled date
  // Legacy aliases
  surgeryDate?:    string;
  scheduledDate?:  string;
  status?:         'scheduled' | 'completed' | 'canceled';
  hospitalName?:   string;
  surgeonName?:    string;
  anesthesiaType?: string;
  indication?:     string;
  technique?:      string;
  durationMinutes?: number;
  duration?:       number;   // legacy
  hospitalDays?:   number;
  returnToWorkDays?: number;
  returnToWork?:   number;   // legacy
  bloodLossMl?:    number;
  bloodLoss?:      number;   // legacy
  complications?:  string[];
  implants?:       string[];
  familyMemberId?: string;
  notes?:          string;
}

export type UpdateSurgeryDto = Partial<CreateSurgeryDto>;

@Injectable()
export class SurgeryService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateSurgeryDto) {
    const performedAt = dto.performedAt || dto.surgeryDate;
    const scheduledAt = dto.scheduledAt || dto.scheduledDate;

    return this.prisma.surgery.create({
      data: {
        userId,
        procedureName:   dto.procedureName,
        procedureCode:   dto.procedureCode,
        performedAt:     performedAt  ? new Date(performedAt)  : null,
        scheduledAt:     scheduledAt  ? new Date(scheduledAt)  : null,
        status:          (dto.status as SurgeryStatus) ?? SurgeryStatus.completed,
        hospitalName:    dto.hospitalName,
        surgeonName:     dto.surgeonName,
        anesthesiaType:  dto.anesthesiaType,
        indication:      dto.indication,
        technique:       dto.technique,
        durationMinutes: dto.durationMinutes ?? dto.duration,
        hospitalDays:    dto.hospitalDays,
        returnToWorkDays: dto.returnToWorkDays ?? dto.returnToWork,
        bloodLossMl:     dto.bloodLossMl ?? dto.bloodLoss,
        complications:   dto.complications ?? [],
        implants:        dto.implants ?? [],
        familyMemberId:  dto.familyMemberId,
        notes:           dto.notes,
      },
      include: { familyMember: { select: { fullName: true, relationship: true } } },
    });
  }

  async findAll(userId: string) {
    return this.prisma.surgery.findMany({
      where: { userId },
      orderBy: [
        { status: 'asc' },
        { performedAt: 'desc' },
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
    await this.findOne(userId, id);
    const performedAt = dto.performedAt || dto.surgeryDate;
    const scheduledAt = dto.scheduledAt || dto.scheduledDate;

    return this.prisma.surgery.update({
      where: { id },
      data: {
        procedureName:   dto.procedureName,
        procedureCode:   dto.procedureCode,
        performedAt:     performedAt  ? new Date(performedAt)  : undefined,
        scheduledAt:     scheduledAt  ? new Date(scheduledAt)  : undefined,
        status:          dto.status as SurgeryStatus | undefined,
        hospitalName:    dto.hospitalName,
        surgeonName:     dto.surgeonName,
        anesthesiaType:  dto.anesthesiaType,
        indication:      dto.indication,
        technique:       dto.technique,
        durationMinutes: dto.durationMinutes ?? dto.duration,
        hospitalDays:    dto.hospitalDays,
        returnToWorkDays: dto.returnToWorkDays ?? dto.returnToWork,
        bloodLossMl:     dto.bloodLossMl ?? dto.bloodLoss,
        complications:   dto.complications,
        implants:        dto.implants,
        notes:           dto.notes,
      },
      include: { familyMember: { select: { fullName: true, relationship: true } } },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.surgery.delete({ where: { id } });
  }

  async findFamilySurgeries(userId: string) {
    return this.prisma.surgery.findMany({
      where: { userId, familyMemberId: { not: null } },
      include: { familyMember: { select: { fullName: true, relationship: true } } },
      orderBy: { performedAt: 'desc' },
    });
  }

  async getSummary(userId: string) {
    const [total, scheduled, withImplants, familySurgeries] = await Promise.all([
      this.prisma.surgery.count({ where: { userId, status: 'completed' } }),
      this.prisma.surgery.count({ where: { userId, status: 'scheduled' } }),
      this.prisma.surgery.count({ where: { userId, implants: { isEmpty: false } } }),
      this.prisma.surgery.count({ where: { userId, familyMemberId: { not: null } } }),
    ]);

    const nextScheduled = await this.prisma.surgery.findFirst({
      where: { userId, status: 'scheduled' },
      orderBy: { scheduledAt: 'asc' },
      select: { procedureName: true, scheduledAt: true, hospitalName: true },
    });

    return { total, scheduled, withImplants, familySurgeries, nextScheduled };
  }
}
