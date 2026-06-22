// apps/api/src/modules/vaccines/vaccines.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { VaccinationStatus } from '@prisma/client';

export interface CreateVaccinationDto {
  vaccineId:    string;
  doseNumber?:  number;
  status?:      VaccinationStatus;
  appliedAt?:   string;
  scheduledAt?: string;
  lotNumber?:   string;
  location?:    string;
  professional?: string;
  manufacturer?: string;
  notes?:       string;
}

export type UpdateVaccinationDto = Partial<CreateVaccinationDto>;

@Injectable()
export class VaccinesService {
  constructor(private prisma: PrismaService) {}

  // ── Catálogo público ────────────────────────────────────────────────────────

  async getCatalog() {
    return this.prisma.vaccine.findMany({
      where: { isActive: true },
      orderBy: [{ calendar: 'asc' }, { name: 'asc' }],
    });
  }

  // ── Registros do usuário ───────────────────────────────────────────────────

  async list(userId: string) {
    return this.prisma.vaccinationRecord.findMany({
      where: { userId },
      include: { vaccine: true },
      orderBy: { appliedAt: 'desc' },
    });
  }

  async create(userId: string, dto: CreateVaccinationDto) {
    const vaccine = await this.prisma.vaccine.findUnique({ where: { id: dto.vaccineId } });
    if (!vaccine) throw new NotFoundException('Vacina não encontrada no catálogo');

    const appliedAt  = dto.appliedAt  ? new Date(dto.appliedAt)  : null;
    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;

    // Calcula nextDoseAt se houver intervalo e não for a última dose
    let nextDoseAt: Date | null = null;
    const doseNumber = dto.doseNumber ?? 1;
    if (appliedAt && vaccine.intervalDays && doseNumber < vaccine.recommendedDoses) {
      nextDoseAt = new Date(appliedAt.getTime() + vaccine.intervalDays * 86_400_000);
    }
    // Se for a última dose e houver reforço periódico
    if (appliedAt && vaccine.boosterYears && doseNumber >= vaccine.recommendedDoses) {
      nextDoseAt = new Date(appliedAt);
      nextDoseAt.setFullYear(nextDoseAt.getFullYear() + vaccine.boosterYears);
    }

    return this.prisma.vaccinationRecord.create({
      data: {
        userId,
        vaccineId:    dto.vaccineId,
        doseNumber,
        status:       dto.status ?? 'completed',
        appliedAt,
        scheduledAt,
        lotNumber:    dto.lotNumber,
        location:     dto.location,
        professional: dto.professional,
        manufacturer: dto.manufacturer,
        nextDoseAt,
        notes:        dto.notes,
      },
      include: { vaccine: true },
    });
  }

  async update(userId: string, id: string, dto: UpdateVaccinationDto) {
    const rec = await this.prisma.vaccinationRecord.findUnique({ where: { id }, include: { vaccine: true } });
    if (!rec) throw new NotFoundException('Registro não encontrado');
    if (rec.userId !== userId) throw new ForbiddenException();

    const appliedAt = dto.appliedAt ? new Date(dto.appliedAt) : rec.appliedAt;
    const doseNumber = dto.doseNumber ?? rec.doseNumber;

    let nextDoseAt = rec.nextDoseAt;
    if (appliedAt && rec.vaccine.intervalDays && doseNumber < rec.vaccine.recommendedDoses) {
      nextDoseAt = new Date(appliedAt.getTime() + rec.vaccine.intervalDays * 86_400_000);
    }
    if (appliedAt && rec.vaccine.boosterYears && doseNumber >= rec.vaccine.recommendedDoses) {
      nextDoseAt = new Date(appliedAt);
      nextDoseAt.setFullYear(nextDoseAt.getFullYear() + rec.vaccine.boosterYears);
    }

    return this.prisma.vaccinationRecord.update({
      where: { id },
      data: {
        ...dto,
        appliedAt,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        nextDoseAt,
        status: dto.status as VaccinationStatus | undefined,
      },
      include: { vaccine: true },
    });
  }

  async remove(userId: string, id: string) {
    const rec = await this.prisma.vaccinationRecord.findUnique({ where: { id } });
    if (!rec) throw new NotFoundException('Registro não encontrado');
    if (rec.userId !== userId) throw new ForbiddenException();
    return this.prisma.vaccinationRecord.delete({ where: { id } });
  }

  // ── Resumo + alertas ────────────────────────────────────────────────────────

  async getSummary(userId: string) {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 86_400_000);

    const [records, catalog] = await Promise.all([
      this.prisma.vaccinationRecord.findMany({
        where: { userId },
        include: { vaccine: true },
        orderBy: { appliedAt: 'desc' },
      }),
      this.prisma.vaccine.findMany({ where: { isActive: true } }),
    ]);

    // Vacinas já tomadas (pelo menos 1 dose concluída)
    const takenVaccineIds = new Set(
      records.filter(r => r.status === 'completed').map(r => r.vaccineId)
    );

    // Doses pendentes: vacinas iniciadas mas não completas
    const dosesByVaccine: Record<string, number> = {};
    for (const r of records.filter(r => r.status === 'completed')) {
      dosesByVaccine[r.vaccineId] = Math.max(dosesByVaccine[r.vaccineId] ?? 0, r.doseNumber);
    }

    const pendingDoses = catalog.filter(v =>
      takenVaccineIds.has(v.id) &&
      (dosesByVaccine[v.id] ?? 0) < v.recommendedDoses
    );

    // Reforços vencidos ou próximos (nextDoseAt <= 30 dias)
    const upcomingBoosters = records.filter(r =>
      r.nextDoseAt && r.nextDoseAt <= in30
    );

    const overdueBoosters = records.filter(r =>
      r.nextDoseAt && r.nextDoseAt < now
    );

    // Vacinas do PNI ainda não iniciadas
    const pniVaccines = catalog.filter(v => v.calendar === 'PNI');
    const notStarted = pniVaccines.filter(v => !takenVaccineIds.has(v.id));

    return {
      total:             records.length,
      completed:         records.filter(r => r.status === 'completed').length,
      scheduled:         records.filter(r => r.status === 'scheduled').length,
      vaccinesCompleted: takenVaccineIds.size,
      pendingDoses:      pendingDoses.length,
      overdueBoosters:   overdueBoosters.length,
      upcomingBoosters:  upcomingBoosters.length,
      pniNotStarted:     notStarted.length,
      alerts: [
        ...overdueBoosters.map(r => ({
          type: 'overdue' as const,
          vaccineId: r.vaccineId,
          vaccineName: r.vaccine.name,
          doseNumber: r.doseNumber + 1,
          dueAt: r.nextDoseAt,
        })),
        ...upcomingBoosters
          .filter(r => r.nextDoseAt && r.nextDoseAt >= now)
          .map(r => ({
            type: 'upcoming' as const,
            vaccineId: r.vaccineId,
            vaccineName: r.vaccine.name,
            doseNumber: r.doseNumber + 1,
            dueAt: r.nextDoseAt,
          })),
      ],
    };
  }
}
