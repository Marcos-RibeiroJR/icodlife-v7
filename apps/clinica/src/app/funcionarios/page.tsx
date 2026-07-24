'use client';
// apps/clinica/src/app/funcionarios/page.tsx — Meus Funcionários
import { useEffect, useState } from 'react';
import ClinicShell from '@/components/ui/ClinicShell';
import { employeesApi, clinicApi } from '@/lib/api';
import { IcodlifeUserPicker, type IcodlifeUser } from '@/components/ui/IcodlifeUserPicker';

const emptyForm = { companyId: '', fullName: '', icode: '', cpf: '', sector: '', role: '' };

export default function FuncionariosPage() {
  const [q, setQ]           = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [linkedUser, setLinkedUser] = useState<IcodlifeUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = (query?: string) => {
    setLoading(true);
    setLoadError('');
    employeesApi.search(query)
      .then((r) => setEmployees(r.data))
      .catch((err) => setLoadError(err.response?.data?.message ?? 'Erro ao carregar funcionários'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    clinicApi.listCompanies().then((r) => setCompanies(r.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(q || undefined), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const selectLinkedUser = (u: IcodlifeUser) => {
    setLinkedUser(u);
    setForm((f) => ({ ...f, fullName: u.fullName, icode: u.icode || '' }));
  };

  const clearLinkedUser = () => {
    setLinkedUser(null);
    setForm((f) => ({ ...f, icode: '' }));
  };

  const closeForm = () => {
    setShowForm(false);
    setForm(emptyForm);
    setLinkedUser(null);
    setFormError('');
  };

  const saveEmployee = async () => {
    if (!form.companyId || !form.fullName) return;
    setSaving(true);
    setFormError('');
    try {
      await employeesApi.create(form);
      closeForm();
      load(q || undefined);
    } catch (e: any) {
      setFormError(e?.response?.data?.message ?? 'Erro ao cadastrar funcionário.');
    } finally { setSaving(false); }
  };

  return (
    <ClinicShell>
      <div className="p-6 max-w-5xl">
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Meus Funcionários</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Pessoas cadastradas pelas empresas clientes — busque por ICODE ou nome ({employees.length})
            </p>
          </div>
          <button onClick={() => setShowForm((s) => !s)}
            className="bg-[#B91C1C] hover:bg-[#7B1E1E] text-white font-semibold text-sm px-4 py-2 rounded-xl transition-colors">
            + Novo Funcionário
          </button>
        </div>

        {showForm && (
          <div className="card p-6 border-red-100 mb-6 bg-white border border-slate-200 rounded-xl">
            <h3 className="font-bold text-slate-800 mb-1">Cadastrar funcionário</h3>
            <p className="text-slate-500 text-xs mb-4">
              Todo funcionário tem um cadastro único no iCODLIFE. Busque primeiro pelo nome, ICODE ou e-mail —
              se ele ainda não tiver conta na plataforma, preencha os dados manualmente abaixo.
            </p>

            <div className="mb-4">
              <label className="label">Buscar no cadastro iCODLIFE</label>
              <IcodlifeUserPicker
                selected={linkedUser}
                onSelect={selectLinkedUser}
                onClear={clearLinkedUser}
                placeholder="Buscar funcionário por nome, ICODE ou e-mail..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 md:col-span-1">
                <label className="label">Empresa *</label>
                <select className="input-field" value={form.companyId}
                  onChange={(e) => setForm((f) => ({ ...f, companyId: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {companies.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.nomeFantasia || c.razaoSocial}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Nome completo *</label>
                <input className="input-field" value={form.fullName}
                  disabled={!!linkedUser}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
              </div>
              <div>
                <label className="label">ICODE</label>
                <input className="input-field" value={form.icode}
                  disabled={!!linkedUser}
                  placeholder="Preenchido automaticamente se vinculado"
                  onChange={(e) => setForm((f) => ({ ...f, icode: e.target.value }))} />
              </div>
              <div>
                <label className="label">CPF</label>
                <input className="input-field" value={form.cpf}
                  onChange={(e) => setForm((f) => ({ ...f, cpf: e.target.value }))} />
              </div>
              <div>
                <label className="label">Setor</label>
                <input className="input-field" value={form.sector}
                  onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))} />
              </div>
              <div>
                <label className="label">Cargo</label>
                <input className="input-field" value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} />
              </div>
            </div>

            {formError && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">{formError}</div>}

            <div className="flex gap-3 mt-4">
              <button onClick={closeForm}
                className="flex-1 border border-slate-200 text-slate-600 font-semibold py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={saveEmployee} disabled={saving || !form.companyId || !form.fullName}
                className="flex-1 bg-[#B91C1C] text-white font-semibold py-2.5 rounded-xl hover:bg-[#7B1E1E] transition-colors disabled:opacity-60">
                {saving ? 'Salvando...' : 'Cadastrar'}
              </button>
            </div>
          </div>
        )}

        <div className="mb-4">
          <input
            className="w-full max-w-md border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-200 focus:outline-none"
            placeholder="Buscar por ICODE ou nome..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {loadError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg flex items-center justify-between gap-3">
            <span>{loadError}</span>
            <button onClick={() => load(q || undefined)} className="font-semibold underline flex-shrink-0">Tentar novamente</button>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Carregando...</div>
          ) : employees.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">Nenhum funcionário encontrado.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">ICODE</th>
                  <th className="px-4 py-3 font-medium">Empresa</th>
                  <th className="px-4 py-3 font-medium">Setor / Cargo</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((e: any) => (
                  <tr key={e.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {e.fullName}
                      {e.userId && <span className="ml-2 text-xs text-green-600 font-semibold">● cadastrado no app</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">{e.icode || e.user?.icode || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{e.company?.nomeFantasia || e.company?.razaoSocial}</td>
                    <td className="px-4 py-3 text-slate-600">{[e.sector, e.role].filter(Boolean).join(' · ') || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${e.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {e.status === 'active' ? 'Ativo' : e.status}
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
