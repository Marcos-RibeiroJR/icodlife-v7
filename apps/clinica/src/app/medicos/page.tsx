'use client';
// apps/clinica/src/app/medicos/page.tsx
import { useEffect, useState } from 'react';
import ClinicShell from '@/components/ui/ClinicShell';
import { clinicApi } from '@/lib/api';

const ROLE_LABEL: Record<string, string> = { owner: 'Sócio', associated: 'Associado', visiting: 'Visitante' };

export default function MedicosPage() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [rooms, setRooms]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]   = useState(false);

  const [identifier, setIdentifier]       = useState('');
  const [role, setRole]                   = useState('associated');
  const [commissionPct, setCommissionPct] = useState('');
  const [roomId, setRoomId]               = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      clinicApi.listDoctors().then(r => r.data),
      clinicApi.listRooms().then(r => r.data).catch(() => []),
    ]).then(([d, r]) => { setDoctors(d); setRooms(r); })
      .catch(err => setError(err.response?.data?.message ?? 'Erro ao carregar médicos'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await clinicApi.linkDoctor({
        identifier,
        role,
        commissionPct: commissionPct ? Number(commissionPct) : undefined,
        roomId: roomId || undefined,
      });
      setIdentifier(''); setCommissionPct(''); setRoomId(''); setRole('associated');
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao vincular médico');
    } finally { setSaving(false); }
  };

  const onUnlink = async (id: string) => {
    if (!confirm('Desvincular este médico da clínica?')) return;
    await clinicApi.unlinkDoctor(id);
    load();
  };

  return (
    <ClinicShell>
      <div className="p-6 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Médicos</h1>
            <p className="text-slate-500 text-sm mt-0.5">Médicos vinculados à clínica</p>
          </div>
          <button onClick={() => setShowForm(v => !v)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            {showForm ? 'Cancelar' : '+ Vincular médico'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={onSubmit} className="bg-white border border-slate-200 rounded-xl p-4 mb-6 space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ICODE do médico ou CRM.UF</label>
              <input value={identifier} onChange={e => setIdentifier(e.target.value)} required
                placeholder="Ex.: 01.01.01.1.0000003 ou 123456.SP"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Função</label>
                <select value={role} onChange={e => setRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="owner">Sócio</option>
                  <option value="associated">Associado</option>
                  <option value="visiting">Visitante</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Comissão (%)</label>
                <input value={commissionPct} onChange={e => setCommissionPct(e.target.value)} type="number" min={0} max={100}
                  placeholder="70"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sala</label>
                <select value={roomId} onChange={e => setRoomId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Sem sala fixa</option>
                  {rooms.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </div>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
            <button type="submit" disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              {saving ? 'Vinculando...' : 'Vincular'}
            </button>
          </form>
        )}

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Carregando...</div>
          ) : doctors.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">Nenhum médico vinculado ainda.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-medium">Médico</th>
                  <th className="px-4 py-3 font-medium">Função</th>
                  <th className="px-4 py-3 font-medium">Comissão</th>
                  <th className="px-4 py-3 font-medium">Sala</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {doctors.map((d: any) => (
                  <tr key={d.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">Dr(a). {d.doctor?.user?.fullName}</p>
                      <p className="text-xs text-slate-400">{d.doctor?.user?.icode}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{ROLE_LABEL[d.role] ?? d.role}</td>
                    <td className="px-4 py-3 text-slate-600">{d.commissionPct != null ? `${d.commissionPct}%` : '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{d.room?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => onUnlink(d.id)} className="text-xs text-red-600 hover:underline">Desvincular</button>
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
