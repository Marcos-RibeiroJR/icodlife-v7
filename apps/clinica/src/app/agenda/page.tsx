'use client';
// apps/clinica/src/app/agenda/page.tsx
import { useEffect, useState } from 'react';
import ClinicShell from '@/components/ui/ClinicShell';
import { clinicApi } from '@/lib/api';

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Agendado', confirmed: 'Confirmado', completed: 'Concluído',
  cancelled: 'Cancelado', no_show: 'Faltou',
};
const STATUS_COLOR: Record<string, string> = {
  scheduled: 'bg-slate-100 text-slate-700', confirmed: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-amber-100 text-amber-700',
};

export default function AgendaPage() {
  const [date, setDate]         = useState(new Date().toISOString().slice(0, 10));
  const [doctorId, setDoctorId] = useState('');
  const [doctors, setDoctors]   = useState<any[]>([]);
  const [items, setItems]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    clinicApi.listDoctors().then(r => setDoctors(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    clinicApi.listAgenda({ date, doctorId: doctorId || undefined })
      .then(r => setItems(r.data))
      .catch(err => setError(err.response?.data?.message ?? 'Erro ao carregar agenda'))
      .finally(() => setLoading(false));
  }, [date, doctorId]);

  return (
    <ClinicShell>
      <div className="p-6 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-800">Agenda</h1>
          <p className="text-slate-500 text-sm mt-0.5">Visão consolidada de todos os médicos da clínica</p>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <select value={doctorId} onChange={e => setDoctorId(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Todos os médicos</option>
            {doctors.map((d: any) => (
              <option key={d.doctorId} value={d.doctorId}>Dr(a). {d.doctor?.user?.fullName}</option>
            ))}
          </select>
        </div>

        {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Carregando...</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">Nenhum atendimento agendado para esse filtro.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-medium">Horário</th>
                  <th className="px-4 py-3 font-medium">Médico</th>
                  <th className="px-4 py-3 font-medium">Procedimento</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a: any) => (
                  <tr key={a.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3 font-mono text-slate-600">
                      {new Date(a.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-slate-800">Dr(a). {a.doctor?.user?.fullName ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{a.procedure?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[a.status] ?? 'bg-slate-100 text-slate-700'}`}>
                        {STATUS_LABEL[a.status] ?? a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </ClinicShell>
  );
}
