// apps/api/src/modules/doctor-analytics/doctor-analytics.service.ts
// Sprint 20 — Dashboard Analytics do médico. 100% derivado de dados existentes
// (DoctorAppointment, DoctorCashEntry, PatientDoctor, User) — sem tabela nova.
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function ageFromBirthDate(dob: Date | null | undefined): number | null {
  if (!dob) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

function ageGroup(age: number | null): string {
  if (age == null) return 'Não informado';
  if (age < 18) return '0-17';
  if (age < 30) return '18-29';
  if (age < 45) return '30-44';
  if (age < 60) return '45-59';
  return '60+';
}

@Injectable()
export class DoctorAnalyticsService {
  constructor(private prisma: PrismaService) {}

  private async getDoctor(userId: string) {
    const doc = await this.prisma.doctor.findUnique({ where: { userId } });
    if (!doc) throw new NotFoundException('Perfil de doutor não encontrado');
    return doc;
  }

  async getDashboard(userId: string, months = 6) {
    const doc = await this.getDoctor(userId);
    const now = new Date();
    const since = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
    const prevSince = new Date(now.getFullYear(), now.getMonth() - (months * 2 - 1), 1);

    const [appointments, prevAppointments, cashEntries, patientLinks] = await Promise.all([
      this.prisma.doctorAppointment.findMany({
        where: { doctorId: doc.id, scheduledAt: { gte: since } },
      }),
      this.prisma.doctorAppointment.findMany({
        where: { doctorId: doc.id, scheduledAt: { gte: prevSince, lt: since } },
      }),
      this.prisma.doctorCashEntry.findMany({
        where: { doctorId: doc.id, entryDate: { gte: since } },
      }),
      this.prisma.patientDoctor.findMany({
        where: { doctorId: doc.id },
        include: { user: { select: { dateOfBirth: true, gender: true } } },
      }),
    ]);

    // ── KPIs ──────────────────────────────────────────────────────────────────
    const totalAppointments     = appointments.length;
    const completedAppointments = appointments.filter((a) => a.status === 'completed').length;
    const canceledAppointments  = appointments.filter((a) => a.status === 'canceled').length;
    const noShowAppointments    = appointments.filter((a) => a.status === 'no_show').length;
    const noShowRate = totalAppointments > 0 ? Math.round((noShowAppointments / totalAppointments) * 1000) / 10 : 0;

    const income = cashEntries.filter((e) => e.type === 'income').reduce((s, e) => s + Number(e.amount), 0);
    const prevIncomeEntries = await this.prisma.doctorCashEntry.findMany({
      where: { doctorId: doc.id, entryDate: { gte: prevSince, lt: since }, type: 'income' },
    });
    const prevIncome = prevIncomeEntries.reduce((s, e) => s + Number(e.amount), 0);
    const revenueDeltaPercent = prevIncome > 0 ? Math.round(((income - prevIncome) / prevIncome) * 1000) / 10 : null;

    const avgTicket = completedAppointments > 0 ? Math.round((income / completedAppointments) * 100) / 100 : 0;

    const activePatients = patientLinks.filter((p) => p.status === 'active').length;
    const newPatients = patientLinks.filter((p) => p.connectedAt >= since).length;

    const kpis = {
      totalPatients: activePatients,
      newPatients,
      totalAppointments,
      completedAppointments,
      canceledAppointments,
      noShowAppointments,
      noShowRate,
      totalRevenue: income,
      avgTicket,
      revenueDeltaPercent,
    };

    // ── Tendência de consultas (mensal) ──────────────────────────────────────
    const apptBuckets = new Map<string, { total: number; completed: number; canceled: number }>();
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
      apptBuckets.set(monthKey(d), { total: 0, completed: 0, canceled: 0 });
    }
    for (const a of appointments) {
      const key = monthKey(new Date(a.scheduledAt));
      const bucket = apptBuckets.get(key);
      if (!bucket) continue;
      bucket.total++;
      if (a.status === 'completed') bucket.completed++;
      if (a.status === 'canceled') bucket.canceled++;
    }
    const appointmentsTrend = Array.from(apptBuckets.entries()).map(([month, v]) => ({ month, ...v }));

    // ── Tendência de receita (mensal) ────────────────────────────────────────
    const revBuckets = new Map<string, { income: number; expense: number }>();
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
      revBuckets.set(monthKey(d), { income: 0, expense: 0 });
    }
    for (const e of cashEntries) {
      const key = monthKey(new Date(e.entryDate));
      const bucket = revBuckets.get(key);
      if (!bucket) continue;
      if (e.type === 'income') bucket.income += Number(e.amount);
      else if (e.type === 'expense') bucket.expense += Number(e.amount);
    }
    const revenueTrend = Array.from(revBuckets.entries()).map(([month, v]) => ({
      month,
      income: Math.round(v.income * 100) / 100,
      expense: Math.round(v.expense * 100) / 100,
    }));

    // ── Perfil dos pacientes ─────────────────────────────────────────────────
    const bySpecialtyMap = new Map<string, number>();
    const byGenderMap = new Map<string, number>();
    const byAgeGroupMap = new Map<string, number>();
    for (const p of patientLinks) {
      const specialty = p.specialty || 'Não informado';
      bySpecialtyMap.set(specialty, (bySpecialtyMap.get(specialty) ?? 0) + 1);
      const gender = p.user?.gender || 'Não informado';
      byGenderMap.set(gender, (byGenderMap.get(gender) ?? 0) + 1);
      const grp = ageGroup(ageFromBirthDate(p.user?.dateOfBirth));
      byAgeGroupMap.set(grp, (byAgeGroupMap.get(grp) ?? 0) + 1);
    }
    const patientsBySpecialty = Array.from(bySpecialtyMap.entries())
      .map(([specialty, count]) => ({ specialty, count }))
      .sort((a, b) => b.count - a.count);
    const patientsByGender = Array.from(byGenderMap.entries()).map(([gender, count]) => ({ gender, count }));
    const AGE_ORDER = ['0-17', '18-29', '30-44', '45-59', '60+', 'Não informado'];
    const patientsByAgeGroup = Array.from(byAgeGroupMap.entries())
      .map(([ageGroup, count]) => ({ ageGroup, count }))
      .sort((a, b) => AGE_ORDER.indexOf(a.ageGroup) - AGE_ORDER.indexOf(b.ageGroup));

    // ── Top tipos de atendimento ─────────────────────────────────────────────
    const typeMap = new Map<string, { count: number; revenue: number }>();
    for (const a of appointments) {
      const type = a.type || 'consulta';
      const cur = typeMap.get(type) ?? { count: 0, revenue: 0 };
      cur.count++;
      if (a.price != null) cur.revenue += Number(a.price);
      typeMap.set(type, cur);
    }
    const topAppointmentTypes = Array.from(typeMap.entries())
      .map(([type, v]) => ({ type, count: v.count, revenue: Math.round(v.revenue * 100) / 100 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return {
      generatedAt: new Date().toISOString(),
      period: `últimos ${months} meses`,
      kpis,
      appointmentsTrend,
      revenueTrend,
      patientsBySpecialty,
      patientsByGender,
      patientsByAgeGroup,
      topAppointmentTypes,
    };
  }
}
