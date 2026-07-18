'use client';
// apps/clinica/src/app/salas/page.tsx
import { useEffect, useState } from 'react';
import ClinicShell from '@/components/ui/ClinicShell';
import { clinicApi } from '@/lib/api';

export default function SalasPage() {
  const [rooms, setRooms]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]   = useState(false);

  const [name, setName] = useState('');
  const [floor, setFloor] = useState('');

  const load = () => {
    setLoading(true);
    clinicApi.listRooms()
      .then(r => setRooms(r.data))
      .catch(err => setError(err.response?.data?.message ?? 'Erro ao carregar salas'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await clinicApi.createRoom({ name, floor: floor || undefined });
      setName(''); setFloor(''); setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao criar sala');
    } finally { setSaving(false); }
  };

  return (
    <ClinicShell>
      <div className="p-6 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Salas</h1>
            <p className="text-slate-500 text-sm mt-0.5">Salas de atendimento da clínica</p>
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
            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
            <button type="submit" disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              {saving ? 'Salvando...' : 'Salvar sala'}
            </button>
          </form>
        )}

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Carregando...</div>
          ) : rooms.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">Nenhuma sala cadastrada ainda.</div>
          ) : (
            <div className="grid grid-cols-3 gap-4 p-4">
              {rooms.map((r: any) => (
                <div key={r.id} className="border border-slate-200 rounded-lg p-4">
                  <p className="font-medium text-slate-800">{r.name}</p>
                  {r.floor && <p className="text-xs text-slate-400 mt-0.5">{r.floor}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ClinicShell>
  );
}
