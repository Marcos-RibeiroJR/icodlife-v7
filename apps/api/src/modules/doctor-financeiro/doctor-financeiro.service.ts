// apps/api/src/modules/doctor-financeiro/doctor-financeiro.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DoctorFinanceiroService {
  constructor(private prisma: PrismaService) {}

  private async getDoctor(userId: string) {
    const doc = await this.prisma.doctor.findUnique({ where: { userId } });
    if (!doc) throw new NotFoundException('Perfil de doutor não encontrado');
    return doc;
  }

  async listEntries(userId: string, from: string, to: string, type?: string) {
    const doc   = await this.getDoctor(userId);
    const where: any = {
      doctorId:  doc.id,
      entryDate: { gte: new Date(from), lte: new Date(to) },
    };
    if (type) where.type = type;
    return this.prisma.doctorCashEntry.findMany({
      where,
      orderBy: { entryDate: 'desc' },
    });
  }

  async createEntry(userId: string, dto: {
    type:           string;
    category:       string;
    description:    string;
    amount:         number;
    paymentMethod?: string;
    entryDate:      string;
    appointmentId?: string;
    patientName?:   string;
    notes?:         string;
  }) {
    const doc = await this.getDoctor(userId);
    return this.prisma.doctorCashEntry.create({
      data: {
        doctorId:       doc.id,
        type:           dto.type,
        category:       dto.category,
        description:    dto.description,
        amount:         dto.amount,
        paymentMethod:  dto.paymentMethod ?? 'cash',
        entryDate:      new Date(dto.entryDate),
        appointmentId:  dto.appointmentId,
        patientName:    dto.patientName,
        notes:          dto.notes,
      },
    });
  }

  async deleteEntry(userId: string, id: string) {
    const doc   = await this.getDoctor(userId);
    const entry = await this.prisma.doctorCashEntry.findFirst({ where: { id, doctorId: doc.id } });
    if (!entry) throw new NotFoundException('Lançamento não encontrado');
    return this.prisma.doctorCashEntry.delete({ where: { id } });
  }

  // ── Resumo mensal ─────────────────────────────────────────────────────────
  async getMonthlySummary(userId: string, year: number, month: number) {
    const doc  = await this.getDoctor(userId);
    const from = new Date(year, month - 1, 1);
    const to   = new Date(year, month, 0, 23, 59, 59);

    const entries = await this.prisma.doctorCashEntry.findMany({
      where: { doctorId: doc.id, entryDate: { gte: from, lte: to } },
      orderBy: { entryDate: 'asc' },
    });

    const totalIncome  = entries.filter(e => e.type === 'income' ).reduce((s, e) => s + Number(e.amount), 0);
    const totalExpense = entries.filter(e => e.type === 'expense').reduce((s, e) => s + Number(e.amount), 0);
    const balance      = totalIncome - totalExpense;

    // Agrupa receita por dia para gráfico
    const dailyIncome: Record<string, number> = {};
    entries.filter(e => e.type === 'income').forEach(e => {
      const d = e.entryDate.toISOString().slice(0, 10);
      dailyIncome[d] = (dailyIncome[d] ?? 0) + Number(e.amount);
    });

    // Agrupa por categoria
    const byCategory: Record<string, number> = {};
    entries.forEach(e => {
      const key = `${e.type}:${e.category}`;
      byCategory[key] = (byCategory[key] ?? 0) + Number(e.amount);
    });

    return { totalIncome, totalExpense, balance, entries, dailyIncome, byCategory };
  }

  // Importa automaticamente consultas pagas do período (vinculação rápida)
  async importFromAppointments(userId: string, from: string, to: string) {
    const doc  = await this.getDoctor(userId);
    const appts = await this.prisma.doctorAppointment.findMany({
      where: {
        doctorId:      doc.id,
        status:        'completed',
        paymentStatus: 'paid',
        scheduledAt:   { gte: new Date(from), lte: new Date(to) },
        price:         { not: null },
      },
    });

    let imported = 0;
    for (const a of appts) {
      const already = await this.prisma.doctorCashEntry.findFirst({
        where: { doctorId: doc.id, appointmentId: a.id },
      });
      if (already) continue;
      await this.prisma.doctorCashEntry.create({
        data: {
          doctorId:      doc.id,
          type:          'income',
          category:      a.type ?? 'consulta',
          description:   `${a.type ?? 'Consulta'} — ${a.patientName}`,
          amount:        a.price!,
          paymentMethod: a.paymentStatus === 'insurance' ? 'insurance' : 'cash',
          entryDate:     a.scheduledAt,
          appointmentId: a.id,
          patientName:   a.patientName,
        },
      });
      imported++;
    }
    return { imported };
  }
}
