'use client';
// apps/clinica/src/app/staff/page.tsx
import { useEffect, useState } from 'react';
import ClinicShell from '@/components/ui/ClinicShell';
import { clinicApi } from '@/lib/api';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Gestor administrativo', reception: 'Recepção', financeiro: 'Financeiro', nurse: 'Enfermagem',
};

export default function StaffPage() {
  const [staff, setStaff]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]   = useState(false);

  const [identifier, setIdentifier] = useState('');
  const [role, setRole]             = useState('reception');

  const load = () => {
    setLoading(true);
    clinicApi.listStaff()
      .then(r => setStaff(r.data))
      .catch(err => setError(err.response?.data?.message ?? 'Erro ao carregar equipe'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await clinicApi.addStaff({ identifier, role });
      setIdentifier(''); setRole('reception'); setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao adicionar membro da equipe');
    } finally { setSaving(false); }
  };

  const onRemove = async (id: string) => {
    if (!confirm('Remover este membro da equipe?')) return;
    await clinicApi.removeStaff(id);
    load();
  };

  return (
    <ClinicShell>
      <div className="p-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Equipe</h1>
            <p className="text-slate-500 text-sm mt-0.5">Staff administrativo da clínica (recepção, financeiro, enfermagem)</p>
          </div>
          <button onClick={() => setShowForm(v => !v)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            {showForm ? 'Cancelar' : '+ Adicionar membro'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={onSubmit} className="bg-white border border-slate-200 rounded-xl p-4 mb-6 space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ICODE ou e-mail do usuário</label>
              <input value={identifier} onChange={e => setIdentifier(e.target.value)} required
                placeholder="usuario@email.com ou 01.01.01.1.0000010"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <p className="text-xs text-slate-400 mt-1">A pessoa precisa já ter uma conta ICODLIFE cadastrada.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Função</label>
              <select value={role} onChange={e => setRole(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
            <button type="submit" disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              {saving ? 'Adicionando...' : 'Adicionar à equipe'}
            </button>
          </form>
        )}

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Carregando...</div>
          ) : staff.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">Nenhum membro de equipe cadastrado ainda.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Função</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s: any) => (
                  <tr key={s.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{s.user?.fullName}</p>
                      <p className="text-xs text-slate-400">{s.user?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{ROLE_LABEL[s.role] ?? s.role}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => onRemove(s.id)} className="text-xs text-red-600 hover:underline">Remover</button>
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
