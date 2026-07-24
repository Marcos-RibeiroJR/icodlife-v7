'use client';
// apps/clinica/src/app/atendimento/page.tsx — Atendimento (Guichê)
import { useEffect, useState } from 'react';
import ClinicShell from '@/components/ui/ClinicShell';
import { atendimentoApi, clinicApi, consultationRequestsApi } from '@/lib/api';
import { IcodlifeUserPicker, type IcodlifeUser } from '@/components/ui/IcodlifeUserPicker';

type Tab = 'fila' | 'guiches' | 'produtividade';

const EXAM_LABEL: Record<string, string> = {
  admissional: 'Admissional', periodico: 'Periódico', retorno: 'Retorno ao trabalho',
  mudanca_funcao: 'Mudança de função', demissional: 'Demissional',
};

export default function AtendimentoPage() {
  const [tab, setTab] = useState<Tab>('fila');
  const [counters, setCounters] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [productivity, setProductivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');

  const [newCounterLabel, setNewCounterLabel] = useState('');
  const [startingFor, setStartingFor] = useState<string | null>(null); // consultationRequestId
  const [selectedCounter, setSelectedCounter] = useState('');

  // Busca avulsa no guichê — paciente que chega sem estar na fila da Base de Consultas
  const [companies, setCompanies] = useState<any[]>([]);
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [walkInLinkedUser, setWalkInLinkedUser] = useState<IcodlifeUser | null>(null);
  const [walkInPatientName, setWalkInPatientName] = useState('');
  const [walkInCompanyId, setWalkInCompanyId] = useState('');
  const [walkInExamType, setWalkInExamType] = useState('periodico');
  const [walkInSaving, setWalkInSaving] = useState(false);

  const load = () => {
    setLoading(true);
    setLoadError('');
    Promise.all([
      atendimentoApi.listCounters(),
      clinicApi.listStaff(),
      atendimentoApi.queue(),
      atendimentoApi.activeSessions(),
      atendimentoApi.productivity(),
      clinicApi.listCompanies(),
    ])
      .then(([c, s, q, as, p, comp]) => {
        setCounters(c.data ?? []);
        setStaff(s.data ?? []);
        setQueue(q.data ?? []);
        setActiveSessions(as.data ?? []);
        setProductivity(p.data);
        setCompanies(comp.data ?? []);
      })
      .catch((err) => setLoadError(err.response?.data?.message ?? 'Erro ao carregar o atendimento'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const createCounter = async () => {
    if (!newCounterLabel.trim()) return;
    setError('');
    try {
      await atendimentoApi.createCounter({ label: newCounterLabel.trim() });
      setNewCounterLabel('');
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Erro ao criar guichê.');
    }
  };

  const assignStaff = async (counterId: string, staffId: string) => {
    try {
      await atendimentoApi.updateCounter(counterId, { staffId: staffId || null });
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Erro ao vincular funcionário.');
    }
  };

  const startService = async (consultationRequestId: string | null) => {
    if (!selectedCounter) { setError('Selecione um guichê para iniciar o atendimento.'); return; }
    setError('');
    try {
      await atendimentoApi.startSession({ counterId: selectedCounter, consultationRequestId: consultationRequestId ?? undefined });
      setStartingFor(null);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Erro ao iniciar atendimento.');
    }
  };

  const closeWalkIn = () => {
    setShowWalkIn(false);
    setWalkInLinkedUser(null);
    setWalkInPatientName('');
    setWalkInCompanyId('');
    setWalkInExamType('periodico');
  };

  /** Busca avulsa: cria a solicitação já vinculada ao cadastro iCODLIFE (quando
   * encontrado) e, se um guichê estiver selecionado, chama o atendimento na hora —
   * tudo amarrado ao mesmo cadastro único, igual ao fluxo de Base de Consultas. */
  const registerAndCall = async () => {
    if (!walkInCompanyId || !walkInPatientName.trim()) {
      setError('Selecione a empresa e informe o nome do paciente.');
      return;
    }
    setWalkInSaving(true);
    setError('');
    try {
      const { data: request } = await consultationRequestsApi.create({
        companyId: walkInCompanyId,
        patientName: walkInPatientName.trim(),
        patientIcode: walkInLinkedUser?.icode || undefined,
        examType: walkInExamType,
      });
      if (selectedCounter) {
        await atendimentoApi.startSession({ counterId: selectedCounter, consultationRequestId: request.id });
      }
      closeWalkIn();
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Erro ao registrar atendimento avulso.');
    } finally { setWalkInSaving(false); }
  };

  const endService = async (sessionId: string, status: 'completed' | 'canceled') => {
    try {
      await atendimentoApi.endSession(sessionId, { status });
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Erro ao encerrar atendimento.');
    }
  };

  return (
    <ClinicShell>
      <div className="p-6 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-800">Atendimento</h1>
          <p className="text-slate-500 text-sm mt-0.5">Guichês, fila de atendimento e produtividade da recepção</p>
        </div>

        <div className="flex gap-2 mb-6">
          {([['fila', 'Fila'], ['guiches', 'Guichês'], ['produtividade', 'Produtividade']] as [Tab, string][]).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all
                ${tab === k ? 'bg-[#B91C1C] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {label}
            </button>
          ))}
        </div>

        {loadError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg flex items-center justify-between gap-3">
            <span>{loadError}</span>
            <button onClick={load} className="font-semibold underline flex-shrink-0">Tentar novamente</button>
          </div>
        )}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
        )}

        {loading ? (
          <div className="card p-8 text-center text-slate-400">Carregando...</div>
        ) : tab === 'guiches' ? (
          <div className="space-y-6">
            <div className="card p-5 bg-white border border-slate-200 rounded-xl">
              <h3 className="font-bold text-slate-800 mb-3">Novo guichê</h3>
              <div className="flex gap-2">
                <input className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="Ex: Guichê 1, Triagem, Recepção A"
                  value={newCounterLabel} onChange={(e) => setNewCounterLabel(e.target.value)} />
                <button onClick={createCounter}
                  className="bg-[#B91C1C] hover:bg-[#7B1E1E] text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors">
                  Criar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {counters.map((c: any) => (
                <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-slate-800">{c.label}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.sessions?.length ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                      {c.sessions?.length ? 'Em atendimento' : 'Livre'}
                    </span>
                  </div>
                  <label className="text-xs font-medium text-slate-500">Funcionário vinculado</label>
                  <select className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    value={c.staffId ?? ''} onChange={(e) => assignStaff(c.id, e.target.value)}>
                    <option value="">— nenhum —</option>
                    {staff.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.user?.fullName ?? s.userId}</option>
                    ))}
                  </select>
                </div>
              ))}
              {counters.length === 0 && (
                <div className="text-slate-400 text-sm p-4">Nenhum guichê cadastrado ainda.</div>
              )}
            </div>
          </div>
        ) : tab === 'fila' ? (
          <div className="space-y-6">
            {activeSessions.length > 0 && (
              <div>
                <h3 className="font-bold text-slate-800 mb-3 text-sm">Em atendimento agora</h3>
                <div className="space-y-2">
                  {activeSessions.map((s: any) => (
                    <div key={s.id} className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-800">
                          {s.consultationRequest?.patientName ?? 'Atendimento avulso'} — {s.counter?.label}
                        </div>
                        <div className="text-xs text-slate-500">
                          Atendente: {s.staff?.user?.fullName ?? '—'} · início {new Date(s.startedAt).toLocaleTimeString('pt-BR')}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => endService(s.id, 'completed')}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                          Concluir
                        </button>
                        <button onClick={() => endService(s.id, 'canceled')}
                          className="border border-slate-200 text-slate-500 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h3 className="font-bold text-slate-800 text-sm">Fila de espera ({queue.length})</h3>
                <div className="flex items-center gap-2">
                  <select className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs"
                    value={selectedCounter} onChange={(e) => setSelectedCounter(e.target.value)}>
                    <option value="">Guichê para iniciar...</option>
                    {counters.filter((c: any) => c.staffId && !c.sessions?.length).map((c: any) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                  <button onClick={() => setShowWalkIn((s) => !s)}
                    className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                    + Paciente avulso
                  </button>
                </div>
              </div>

              {showWalkIn && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
                  <h4 className="font-bold text-slate-800 text-sm mb-1">Atender paciente avulso</h4>
                  <p className="text-slate-500 text-xs mb-3">
                    Paciente que chegou sem estar na fila da Base de Consultas. Busque no cadastro único
                    iCODLIFE — o atendimento fica amarrado ao mesmo cadastro do funcionário/paciente.
                  </p>

                  <div className="mb-3">
                    <IcodlifeUserPicker
                      selected={walkInLinkedUser}
                      onSelect={(u) => { setWalkInLinkedUser(u); setWalkInPatientName(u.fullName); }}
                      onClear={() => setWalkInLinkedUser(null)}
                      placeholder="Buscar por nome, ICODE ou e-mail..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 md:col-span-1">
                      <label className="label">Empresa *</label>
                      <select className="input-field" value={walkInCompanyId}
                        onChange={(e) => setWalkInCompanyId(e.target.value)}>
                        <option value="">Selecione...</option>
                        {companies.map((c: any) => (
                          <option key={c.id} value={c.id}>{c.nomeFantasia || c.razaoSocial}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Tipo de exame</label>
                      <select className="input-field" value={walkInExamType}
                        onChange={(e) => setWalkInExamType(e.target.value)}>
                        {Object.entries(EXAM_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="label">Nome do paciente *</label>
                      <input className="input-field" value={walkInPatientName}
                        disabled={!!walkInLinkedUser}
                        onChange={(e) => setWalkInPatientName(e.target.value)} />
                    </div>
                  </div>

                  {!selectedCounter && (
                    <p className="text-xs text-amber-600 mt-3">
                      Nenhum guichê selecionado acima — a solicitação será registrada e entra na fila, mas o
                      atendimento não inicia automaticamente.
                    </p>
                  )}

                  <div className="flex gap-2 mt-4">
                    <button onClick={closeWalkIn}
                      className="flex-1 border border-slate-200 text-slate-600 font-semibold text-sm py-2 rounded-lg hover:bg-slate-50 transition-colors">
                      Cancelar
                    </button>
                    <button onClick={registerAndCall} disabled={walkInSaving || !walkInCompanyId || !walkInPatientName.trim()}
                      className="flex-1 bg-[#B91C1C] hover:bg-[#7B1E1E] disabled:opacity-50 text-white font-semibold text-sm py-2 rounded-lg transition-colors">
                      {walkInSaving ? 'Registrando...' : selectedCounter ? 'Registrar e chamar' : 'Registrar na fila'}
                    </button>
                  </div>
                </div>
              )}

              {queue.length === 0 ? (
                <div className="card p-8 text-center text-slate-400 text-sm">Fila vazia.</div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-50">
                  {queue.map((q: any) => (
                    <div key={q.id} className="p-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-800">{q.patientName}</div>
                        <div className="text-xs text-slate-500">
                          {q.company?.nomeFantasia || q.company?.razaoSocial} · {EXAM_LABEL[q.examType] ?? q.examType}
                          {q.psychosocialSnapshot && ' · laudo psicossocial disponível'}
                        </div>
                      </div>
                      <button onClick={() => startService(q.id)} disabled={!selectedCounter}
                        className="bg-[#B91C1C] hover:bg-[#7B1E1E] disabled:opacity-40 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                        Chamar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="font-bold text-slate-800 mb-3 text-sm">Por funcionário</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                      <th className="py-2 font-medium">Funcionário</th>
                      <th className="py-2 font-medium text-right">Atendimentos</th>
                      <th className="py-2 font-medium text-right">Tempo médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(productivity?.porFuncionario ?? []).map((p: any) => (
                      <tr key={p.staffId} className="border-b border-slate-50 last:border-0">
                        <td className="py-2 text-slate-700">{p.name}</td>
                        <td className="py-2 text-right font-semibold">{p.count}</td>
                        <td className="py-2 text-right text-slate-500">{p.avgMinutes} min</td>
                      </tr>
                    ))}
                    {(!productivity?.porFuncionario || productivity.porFuncionario.length === 0) && (
                      <tr><td colSpan={3} className="py-4 text-center text-slate-400 text-xs">Sem dados no período.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="font-bold text-slate-800 mb-3 text-sm">Por guichê</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                      <th className="py-2 font-medium">Guichê</th>
                      <th className="py-2 font-medium text-right">Atendimentos</th>
                      <th className="py-2 font-medium text-right">Tempo médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(productivity?.porGuiche ?? []).map((p: any) => (
                      <tr key={p.counterId} className="border-b border-slate-50 last:border-0">
                        <td className="py-2 text-slate-700">{p.label}</td>
                        <td className="py-2 text-right font-semibold">{p.count}</td>
                        <td className="py-2 text-right text-slate-500">{p.avgMinutes} min</td>
                      </tr>
                    ))}
                    {(!productivity?.porGuiche || productivity.porGuiche.length === 0) && (
                      <tr><td colSpan={3} className="py-4 text-center text-slate-400 text-xs">Sem dados no período.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </ClinicShell>
  );
}
