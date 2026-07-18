'use client';
// apps/clinica/src/app/procedimentos/page.tsx
import { useEffect, useState } from 'react';
import ClinicShell from '@/components/ui/ClinicShell';
import { clinicApi } from '@/lib/api';

const CATEGORY_LABEL: Record<string, string> = {
  consulta: 'Consulta', exame: 'Exame', procedimento: 'Procedimento', cirurgia: 'Cirurgia',
};

export default function ProcedimentosPage() {
  const [procedures, setProcedures] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [showForm, setShowForm]     = useState(false);
  const [saving, setSaving]         = useState(false);

  const [name, setName]                     = useState('');
  const [category, setCategory]             = useState('consulta');
  const [defaultPrice, setDefaultPrice]     = useState('');
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [tussCode, setTussCode]             = useState('');

  const load = () => {
    setLoading(true);
    clinicApi.listProcedures()
      .then(r => setProcedures(r.data))
      .catch(err => setError(err.response?.data?.message ?? 'Erro ao carregar procedimentos'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await clinicApi.createProcedure({
        name, category, tussCode: tussCode || undefined,
        defaultPrice: Number(defaultPrice),
        durationMinutes: Number(durationMinutes) || 30,
      });
      setName(''); setDefaultPrice(''); setTussCode(''); setDurationMinutes('30'); setCategory('consulta');
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao criar procedimento');
    } finally { setSaving(false); }
  };

  return (
    <ClinicShell>
      <div className="p-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Procedimentos</h1>
            <p className="text-slate-500 text-sm mt-0.5">Catálogo de procedimentos e preços da clínica</p>
          </div>
          <button onClick={() => setShowForm(v => !v)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            {showForm ? 'Cancelar' : '+ Novo procedimento'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={onSubmit} className="bg-white border border-slate-200 rounded-xl p-4 mb-6 space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
              <input value={name} onChange={e => setName(e.target.value)} required
                placeholder="Consulta Cardiológica"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                <select value={category} onChange={e => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {Object.entries(CATEGORY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Preço (R$)</label>
                <input value={defaultPrice} onChange={e => setDefaultPrice(e.target.value)} type="number" min={0} step="0.01" required
                  placeholder="250.00"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Duração (min)</label>
                <input value={durationMinutes} onChange={e => setDurationMinutes(e.target.value)} type="number" min={1}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Código TUSS</label>
                <input value={tussCode} onChange={e => setTussCode(e.target.value)} placeholder="Opcional"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
            <button type="submit" disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              {saving ? 'Salvando...' : 'Salvar procedimento'}
            </button>
          </form>
        )}

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Carregando...</div>
          ) : procedures.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">Nenhum procedimento cadastrado ainda.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Preço</th>
                  <th className="px-4 py-3 font-medium">Duração</th>
                </tr>
              </thead>
              <tbody>
                {procedures.map((p: any) => (
                  <tr key={p.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                    <td className="px-4 py-3 text-slate-600">{CATEGORY_LABEL[p.category] ?? p.category}</td>
                    <td className="px-4 py-3 text-slate-600">R$ {Number(p.defaultPrice).toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-600">{p.durationMinutes} min</td>
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
