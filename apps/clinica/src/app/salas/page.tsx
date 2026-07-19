'use client';
// apps/clinica/src/app/salas/page.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ClinicShell from '@/components/ui/ClinicShell';
import { clinicApi } from '@/lib/api';

function fmtBRL(v?: number | null) {
  if (v == null) return '—';
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function doctorLabel(d: any) { return d?.doctor?.user?.fullName ?? '—'; }

export default function SalasPage() {
  const router = useRouter();
  const [rooms, setRooms]       = useState<any[]>([]);
  const [doctors, setDoctors]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);

  const [name, setName]           = useState('');
  const [floor, setFloor]         = useState('');
  const [costPerHour, setCostPerHour] = useState('');
  const [costPerUse, setCostPerUse]   = useState('');

  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [assignDoctorId, setAssignDoctorId] = useState('');

  const load = () => {
    setLoading(true);
    clinicApi.listRooms()
      .then(r => setRooms(r.data))
      .catch(err => setError(err.response?.data?.message ?? 'Erro ao carregar salas'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);
  useEffect(() => { clinicApi.listDoctors().then(r => setDoctors(r.data)).catch(() => {}); }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await clinicApi.createRoom({
        name,
        floor: floor || undefined,
        costPerHour: costPerHour ? Number(costPerHour) : undefined,
        costPerUse: costPerUse ? Number(costPerUse) : undefined,
      });
      setName(''); setFloor(''); setCostPerHour(''); setCostPerUse(''); setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao criar sala');
    } finally { setSaving(false); }
  };

  const doAssign = async (roomId: string) => {
    if (!assignDoctorId) return;
    try {
      await clinicApi.assignRoomDoctor(roomId, assignDoctorId);
      setAssignFor(null); setAssignDoctorId('');
      load();
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Erro ao associar médico à sala');
    }
  };

  const doUnassign = async (roomId: string, doctorId: string) => {
    if (!confirm('Remover esta sala como sala fixa do médico?')) return;
    await clinicApi.unassignRoomDoctor(roomId, doctorId);
    load();
  };

  const verAgenda = (roomId: string) => router.push(`/agenda?roomId=${roomId}`);

  return (
    <ClinicShell>
      <div className="p-6 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Salas</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Salas de atendimento, associação a médicos e custo de ocupação (débito automático na conta corrente).
            </p>
          </div>
          <button onClick={() => setShowForm(v => !v)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            {showForm ? 'Cancelar' : '+ Nova sala'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={onSubmit} className="bg-white border border-slate-200 rounded-xl p-4 mb-6 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome da sala</label>
                <input value={name} onChange={e => setName(e.target.value)} required placeholder="Sala 1"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Andar (opcional)</label>
                <input value={floor} onChange={e => setFloor(e.target.value)} placeholder="Térreo"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Custo por hora (R$, opcional)</label>
                <input value={costPerHour} onChange={e => setCostPerHour(e.target.value)} type="number" min={0} step="0.01" placeholder="0,00"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Custo fixo por uso (R$, opcional)</label>
                <input value={costPerUse} onChange={e => setCostPerUse(e.target.value)} type="number" min={0} step="0.01" placeholder="0,00"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Se preenchido, toda consulta marcada como "Realizada" nesta sala gera um débito automático na conta
              corrente do médico responsável (custo fixo por uso tem prioridade sobre o custo por hora).
            </p>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
            <button type="submit" disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              {saving ? 'Salvando...' : 'Salvar sala'}
            </button>
          </form>
        )}

        {!showForm && error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Carregando...</div>
          ) : rooms.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">Nenhuma sala cadastrada ainda.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
              {rooms.map((r: any) => (
                <div key={r.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-slate-800">{r.name}</p>
                      {r.floor && <p className="text-xs text-slate-400">{r.floor}</p>}
                    </div>
                    <button onClick={() => verAgenda(r.id)} className="text-xs text-indigo-600 hover:underline whitespace-nowrap">
                      Ver agenda
                    </button>
                  </div>

                  <div className="mt-2 text-xs text-slate-500 space-x-3">
                    <span>Por hora: <span className="font-medium text-slate-700">{fmtBRL(r.costPerHour)}</span></span>
                    <span>Por uso: <span className="font-medium text-slate-700">{fmtBRL(r.costPerUse)}</span></span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Médicos associados</p>
                    {(r.assigned ?? []).length === 0 ? (
                      <p className="text-xs text-slate-400 mb-2">Nenhum médico com sala fixa aqui.</p>
                    ) : (
                      <ul className="space-y-1 mb-2">
                        {r.assigned.map((a: any) => (
                          <li key={a.id} className="flex items-center justify-between text-xs">
                            <span className="text-slate-700">Dr(a). {doctorLabel(a)}</span>
                            <button onClick={() => doUnassign(r.id, a.doctorId)} className="text-slate-400 hover:text-red-500">Remover</button>
                          </li>
                        ))}
                      </ul>
                    )}

                    {assignFor === r.id ? (
                      <div className="flex items-center gap-2">
                        <select value={assignDoctorId} onChange={e => setAssignDoctorId(e.target.value)}
                          className="flex-1 px-2 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
                          <option value="">— Selecionar médico —</option>
                          {doctors.map((d: any) => (
                            <option key={d.doctorId} value={d.doctorId}>Dr(a). {doctorLabel(d)}</option>
                          ))}
                        </select>
                        <button onClick={() => doAssign(r.id)} className="text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1.5 rounded-lg">OK</button>
                        <button onClick={() => { setAssignFor(null); setAssignDoctorId(''); }} className="text-xs text-slate-500 px-1">×</button>
                      </div>
                    ) : (
                      <button onClick={() => setAssignFor(r.id)} className="text-xs text-indigo-600 hover:underline">+ Associar médico</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ClinicShell>
  );
}
