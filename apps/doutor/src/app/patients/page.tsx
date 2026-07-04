'use client';
// apps/doutor/src/app/patients/page.tsx
// Sprint 13 — Meu Paciente
// Aba 1: Meus Pacientes (vinculados)
// Aba 2: Adicionar Paciente (busca por ICODE/nome)
// Aba 3: Doutores no ICODLIFE

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import DoctorShell from '@/components/ui/DoctorShell';
import { api } from '@/lib/api';

type Tab = 'meus' | 'adicionar' | 'doutores';

// ─── Ícones inline ────────────────────────────────────────────────────────────
const UserIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);
const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);
const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);
const SearchIcon = () => (
  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
  </svg>
);

// ─── Avatar genérico ──────────────────────────────────────────────────────────
function Avatar({ name, url, size = 9 }: { name?: string; url?: string; size?: number }) {
  const cls = `w-${size} h-${size} rounded-full flex items-center justify-center text-sm font-bold`;
  if (url) return <img src={url} alt={name} className={`${cls} object-cover`} />;
  return (
    <div className={`${cls} bg-blue-100 text-blue-700`}>
      {(name ?? '?')[0]?.toUpperCase()}
    </div>
  );
}

// ─── Tab: Meus Pacientes ──────────────────────────────────────────────────────
function MeusPacientes() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [removing, setRemoving] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/doutor/patients')
      .then(r => setPatients(r.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = async (id: string) => {
    if (!confirm('Remover este paciente do seu painel?')) return;
    setRemoving(id);
    try {
      await api.delete(`/doutor/patients/${id}`);
      setPatients(prev => prev.filter(p => p.id !== id));
    } catch (e: any) {
      alert(e.response?.data?.message || 'Erro ao remover');
    } finally { setRemoving(null); }
  };

  const filtered = patients.filter(p =>
    !search ||
    p.user?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    p.user?.icode?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2"><SearchIcon /></span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filtrar por nome ou código..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <span className="text-sm text-slate-500">{patients.length} paciente(s)</span>
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm py-8 text-center">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <UserIcon />
          <p className="text-slate-400 text-sm mt-3">
            {search ? 'Nenhum paciente encontrado.' : 'Nenhum paciente vinculado. Use a aba "Adicionar Paciente".'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left text-xs font-medium text-slate-500 px-4 py-3 uppercase tracking-wide">Paciente</th>
                <th className="text-left text-xs font-medium text-slate-500 px-4 py-3 uppercase tracking-wide">Código Único</th>
                <th className="text-left text-xs font-medium text-slate-500 px-4 py-3 uppercase tracking-wide">Especialidade</th>
                <th className="text-left text-xs font-medium text-slate-500 px-4 py-3 uppercase tracking-wide">Vinculado em</th>
                <th className="text-left text-xs font-medium text-slate-500 px-4 py-3 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p: any) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={p.user?.fullName} url={p.user?.avatarUrl} />
                      <div>
                        <p className="text-sm font-medium text-slate-800">{p.user?.fullName}</p>
                        <p className="text-xs text-slate-400">{p.user?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      {p.user?.icode ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{p.specialty || 'Geral'}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(p.connectedAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      p.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {p.status === 'active' ? 'Ativo' : 'Encerrado'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/patients/${p.id}`}
                        className="text-xs text-blue-600 hover:underline font-medium whitespace-nowrap"
                      >
                        Ver prontuário
                      </Link>
                      {p.user?.id && (
                        <Link
                          href={`/saude-mental/${p.user.id}`}
                          className="text-xs text-indigo-600 hover:underline font-medium whitespace-nowrap"
                        >
                          🧠 Saúde Mental
                        </Link>
                      )}
                      {p.status === 'active' && (
                        <button
                          onClick={() => remove(p.id)}
                          disabled={removing === p.id}
                          className="p-1 text-slate-400 hover:text-red-500 disabled:opacity-40 transition-colors"
                          title="Remover paciente"
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Adicionar Paciente ──────────────────────────────────────────────────
function AdicionarPaciente() {
  const [query,     setQuery]     = useState('');
  const [results,   setResults]   = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [icode,     setIcode]     = useState('');
  const [specialty, setSpecialty] = useState('');
  const [adding,    setAdding]    = useState(false);
  const [msg,       setMsg]       = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const doSearch = async () => {
    if (query.trim().length < 2) return;
    setSearching(true);
    setResults([]);
    try {
      const r = await api.get('/doutor/users/search', { params: { q: query.trim() } });
      setResults(r.data);
    } finally { setSearching(false); }
  };

  const selectUser = (user: any) => {
    setIcode(user.icode ?? '');
    setResults([]);
    setQuery(user.fullName);
  };

  const addPatient = async () => {
    if (!icode.trim()) { setMsg({ type: 'err', text: 'Informe o Código Único do paciente.' }); return; }
    setAdding(true);
    setMsg(null);
    try {
      await api.post('/doutor/patients', { icode: icode.trim(), specialty: specialty || undefined });
      setMsg({ type: 'ok', text: 'Paciente vinculado com sucesso!' });
      setIcode(''); setQuery(''); setSpecialty('');
    } catch (e: any) {
      setMsg({ type: 'err', text: e.response?.data?.message || 'Erro ao vincular' });
    } finally { setAdding(false); }
  };

  return (
    <div className="max-w-lg">
      <p className="text-sm text-slate-500 mb-5">
        Busque um usuário do ICODLIFE pelo nome ou código único (ICODE) para adicionar como seu paciente.
      </p>

      {/* Campo de busca */}
      <label className="block text-xs font-medium text-slate-600 mb-1">Buscar usuário</label>
      <div className="flex gap-2 mb-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2"><SearchIcon /></span>
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setResults([]); }}
            onKeyDown={e => e.key === 'Enter' && doSearch()}
            placeholder="Nome ou código único..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <button
          onClick={doSearch}
          disabled={searching || query.trim().length < 2}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-800 disabled:opacity-40 text-white text-sm rounded-lg transition-colors"
        >
          {searching ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      {/* Resultados da busca */}
      {results.length > 0 && (
        <div className="border border-slate-200 rounded-lg overflow-hidden mb-4 bg-white shadow-sm">
          {results.map(u => (
            <button
              key={u.id}
              onClick={() => selectUser(u)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-blue-50 border-b border-slate-100 last:border-0 transition-colors"
            >
              <Avatar name={u.fullName} url={u.avatarUrl} size={8} />
              <div>
                <p className="text-sm font-medium text-slate-800">{u.fullName}</p>
                <p className="text-xs text-slate-400">{u.icode ?? 'sem código'} · {u.email}</p>
              </div>
            </button>
          ))}
        </div>
      )}
      {results.length === 0 && searching === false && query.trim().length >= 2 && (
        <p className="text-xs text-slate-400 mb-4">Nenhum resultado. Tente outro nome ou código.</p>
      )}

      {/* Código único selecionado */}
      <label className="block text-xs font-medium text-slate-600 mt-4 mb-1">Código Único (ICODE)</label>
      <input
        value={icode}
        onChange={e => setIcode(e.target.value)}
        placeholder="Ex: BR.00001.SP"
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none mb-3"
      />

      <label className="block text-xs font-medium text-slate-600 mb-1">Especialidade (opcional)</label>
      <input
        value={specialty}
        onChange={e => setSpecialty(e.target.value)}
        placeholder="Ex: Cardiologia, Clínico Geral..."
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none mb-4"
      />

      <button
        onClick={addPatient}
        disabled={adding || !icode.trim()}
        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <PlusIcon />
        {adding ? 'Vinculando...' : 'Vincular Paciente'}
      </button>

      {msg && (
        <div className={`mt-3 px-4 py-2.5 rounded-lg text-sm font-medium ${
          msg.type === 'ok'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {msg.text}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Doutores no ICODLIFE ────────────────────────────────────────────────
function DoutoresIcodLife() {
  const [doctors,  setDoctors]  = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [total,    setTotal]    = useState(0);

  useEffect(() => {
    api.get('/doutor/all-doctors', { params: { limit: 100 } })
      .then(r => { setDoctors(r.data.data); setTotal(r.data.total); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = doctors.filter(d =>
    !search ||
    d.user?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    d.doctorId?.toLowerCase().includes(search.toLowerCase()) ||
    d.specialties?.some((s: string) => s.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2"><SearchIcon /></span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filtrar por nome, ID ou especialidade..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <span className="text-sm text-slate-500">{total} médico(s) cadastrado(s)</span>
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm py-8 text-center">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <p className="text-slate-400 text-sm">Nenhum médico encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((d: any) => (
            <div key={d.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <Avatar name={d.user?.fullName} url={d.user?.avatarUrl} size={10} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{d.user?.fullName}</p>
                  <p className="text-xs font-mono text-blue-600">{d.doctorId}</p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-500">
                <div className="flex justify-between">
                  <span>CRM</span>
                  <span className="font-medium text-slate-700">{d.crm}/{d.uf}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status</span>
                  <span className={`font-medium px-1.5 py-0.5 rounded-full ${
                    d.crmStatus === 'verified'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {d.crmStatus === 'verified' ? 'Verificado' : 'Pendente'}
                  </span>
                </div>
                {d.addressCity && (
                  <div className="flex justify-between">
                    <span>Cidade</span>
                    <span className="font-medium text-slate-700">{d.addressCity}/{d.addressState}</span>
                  </div>
                )}
                {d.consultPrice && (
                  <div className="flex justify-between">
                    <span>Consulta</span>
                    <span className="font-medium text-slate-700">
                      R$ {Number(d.consultPrice).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {d.specialties?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {d.specialties.slice(0, 3).map((s: string) => (
                    <span key={s} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{s}</span>
                  ))}
                  {d.specialties.length > 3 && (
                    <span className="text-xs text-slate-400">+{d.specialties.length - 3}</span>
                  )}
                </div>
              )}

              {d.user?.icode && (
                <p className="mt-2 text-xs font-mono text-slate-400">{d.user.icode}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function MeuPacientePage() {
  const [tab, setTab] = useState<Tab>('meus');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'meus',      label: 'Meus Pacientes'       },
    { id: 'adicionar', label: 'Adicionar Paciente'   },
    { id: 'doutores',  label: 'Médicos no ICODLIFE'  },
  ];

  return (
    <DoctorShell>
      <div className="p-6 max-w-6xl">
        {/* Cabeçalho */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-800">Meu Paciente</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gerencie seus pacientes e consulte médicos cadastrados no ICODLIFE.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                tab === t.id
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        {tab === 'meus'      && <MeusPacientes />}
        {tab === 'adicionar' && <AdicionarPaciente />}
        {tab === 'doutores'  && <DoutoresIcodLife />}
      </div>
    </DoctorShell>
  );
}
