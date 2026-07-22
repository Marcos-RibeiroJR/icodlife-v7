'use client';
// apps/doutor/src/app/analytics/page.tsx
// Sprint 20 — Dashboard Analytics do médico: KPIs, tendências e perfil de pacientes.
import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import DoctorShell from '@/components/ui/DoctorShell';
import { analyticsApi } from '@/lib/api';

const PERIODS = [
  { label: '3 meses', value: 3 },
  { label: '6 meses', value: 6 },
  { label: '12 meses', value: 12 },
];

const GENDER_COLORS: Record<string, string> = {
  male: '#3B82F6', female: '#EC4899', other: '#A855F7', 'Não informado': '#94A3B8',
};
const PIE_COLORS = ['#3B82F6', '#EC4899', '#A855F7', '#F59E0B', '#10B981', '#94A3B8'];

const GENDER_LABEL: Record<string, string> = {
  male: 'Masculino', female: 'Feminino', other: 'Outro', 'Não informado': 'Não informado',
};

function fmtMonth(key: string) {
  const [y, m] = key.split('-');
  const names = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${names[Number(m) - 1]}/${y.slice(2)}`;
}

function currency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function KpiCard({ label, value, sub, subColor }: { label: string; value: string; sub?: string; subColor?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      {sub && <p className={`text-xs mt-1 ${subColor ?? 'text-slate-400'}`}>{sub}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [months, setMonths] = useState(6);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    analyticsApi.dashboard(months)
      .then(r => setData(r.data))
      .catch(err => setError(err.response?.data?.message ?? 'Erro ao carregar o dashboard analítico.'))
      .finally(() => setLoading(false));
  }, [months]);

  return (
    <DoctorShell>
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">📊 Dashboard Analítico</h1>
            <p className="text-slate-500 text-sm">Visão consolidada do seu consultório — {data?.period ?? ''}</p>
          </div>
          <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1">
            {PERIODS.map(p => (
              <button key={p.value} onClick={() => setMonths(p.value)}
                className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                  months === p.value ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {loading && <p className="text-slate-400 text-sm">Carregando…</p>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg mb-4">{error}</div>}

        {!loading && !error && data && (
          <>
            {/* ── KPIs ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <KpiCard label="Pacientes ativos" value={String(data.kpis.totalPatients)}
                sub={`+${data.kpis.newPatients} novo(s) no período`} subColor="text-green-600" />
              <KpiCard label="Consultas no período" value={String(data.kpis.totalAppointments)}
                sub={`${data.kpis.completedAppointments} concluídas · ${data.kpis.canceledAppointments} canceladas`} />
              <KpiCard label="Taxa de no-show" value={`${data.kpis.noShowRate}%`}
                sub={data.kpis.noShowRate > 15 ? 'Acima do ideal' : 'Sob controle'}
                subColor={data.kpis.noShowRate > 15 ? 'text-red-600' : 'text-green-600'} />
              <KpiCard label="Receita no período" value={currency(data.kpis.totalRevenue)}
                sub={data.kpis.revenueDeltaPercent != null
                  ? `${data.kpis.revenueDeltaPercent >= 0 ? '▲' : '▼'} ${Math.abs(data.kpis.revenueDeltaPercent)}% vs. período anterior`
                  : 'Sem dado do período anterior'}
                subColor={data.kpis.revenueDeltaPercent != null ? (data.kpis.revenueDeltaPercent >= 0 ? 'text-green-600' : 'text-red-600') : 'text-slate-400'} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* ── Tendência de consultas ── */}
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-slate-700 mb-3">Consultas por mês</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.appointmentsTrend.map((d: any) => ({ ...d, month: fmtMonth(d.month) }))}
                    margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="completed" name="Concluídas" fill="#10B981" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="canceled" name="Canceladas" fill="#EF4444" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* ── Tendência de receita ── */}
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-slate-700 mb-3">Receita por mês</p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data.revenueTrend.map((d: any) => ({ ...d, month: fmtMonth(d.month) }))}
                    margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => currency(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="income" name="Receita" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="expense" name="Despesa" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* ── Gênero ── */}
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-slate-700 mb-3">Pacientes por gênero</p>
                {data.patientsByGender.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-10">Sem dados</p>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={data.patientsByGender} dataKey="count" nameKey="gender" cx="50%" cy="50%" outerRadius={65}
                        label={(e: any) => GENDER_LABEL[e.gender] ?? e.gender}>
                        {data.patientsByGender.map((g: any, i: number) => (
                          <Cell key={i} fill={GENDER_COLORS[g.gender] ?? PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number, _n: string, p: any) => [v, GENDER_LABEL[p.payload.gender] ?? p.payload.gender]} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* ── Faixa etária ── */}
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-slate-700 mb-3">Pacientes por faixa etária</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={data.patientsByAgeGroup} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="ageGroup" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="Pacientes" fill="#3B82F6" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* ── Especialidade ── */}
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-slate-700 mb-3">Pacientes por especialidade</p>
                {data.patientsBySpecialty.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-10">Sem dados</p>
                ) : (
                  <div className="space-y-2 pt-2">
                    {data.patientsBySpecialty.slice(0, 6).map((s: any) => (
                      <div key={s.specialty} className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 truncate">{s.specialty}</span>
                        <span className="font-semibold text-slate-800">{s.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Top tipos de atendimento ── */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-slate-700 mb-3">Tipos de atendimento mais frequentes</p>
              {data.topAppointmentTypes.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Nenhuma consulta no período.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                      <th className="py-2 font-medium">Tipo</th>
                      <th className="py-2 font-medium text-right">Qtd.</th>
                      <th className="py-2 font-medium text-right">Receita</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topAppointmentTypes.map((t: any) => (
                      <tr key={t.type} className="border-b border-slate-50 last:border-0">
                        <td className="py-2 text-slate-700 capitalize">{t.type}</td>
                        <td className="py-2 text-right text-slate-600">{t.count}</td>
                        <td className="py-2 text-right text-slate-600">{currency(t.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </DoctorShell>
  );
}
