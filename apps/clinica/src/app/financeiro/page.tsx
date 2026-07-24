'use client';
// apps/clinica/src/app/financeiro/page.tsx
import { useEffect, useState } from 'react';
import ClinicShell from '@/components/ui/ClinicShell';
import StatCard from '@/components/ui/StatCard';
import { clinicApi, atendimentoApi } from '@/lib/api';

function fmtBRL(v: number) {
  return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const ENTRY_TYPE_LABEL: Record<string, string> = { income: 'Crédito', expense: 'Débito' };
const CATEGORY_LABEL: Record<string, string> = { custo_sala: 'Custo de sala', ajuste: 'Ajuste manual', exame_guiche: 'Exame (guichê)' };
const EXAM_LABEL: Record<string, string> = {
  admissional: 'Admissional', periodico: 'Periódico', retorno: 'Retorno ao trabalho',
  mudanca_funcao: 'Mudança de função', demissional: 'Demissional',
};

// ─── Modal: Conta corrente do médico (extrato + lançamento manual) ────────────
function ContaCorrenteModal({
  doctorId, doctorName, filters, onClose,
}: {
  doctorId: string; doctorName: string;
  filters: { roomId?: string; counterId?: string; examType?: string };
  onClose: () => void;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    clinicApi.contaCorrente(doctorId, filters).then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, [doctorId]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    if (!description.trim() || !amount) return;
    setSaving(true); setError('');
    try {
      await clinicApi.createContaCorrenteEntry(doctorId, { type, description, amount: Number(amount) });
      setDescription(''); setAmount(''); setShowForm(false);
      load();
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Erro ao lançar');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-800">Conta corrente — Dr(a). {doctorName}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-slate-400 text-sm">Carregando...</div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-500">Créditos</p>
                <p className="text-sm font-bold text-green-700">{fmtBRL(data?.totalIncome)}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-500">Débitos</p>
                <p className="text-sm font-bold text-red-700">{fmtBRL(data?.totalExpense)}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-500">Saldo</p>
                <p className={`text-sm font-bold ${(data?.saldo ?? 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmtBRL(data?.saldo)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Extrato</p>
              <button onClick={() => setShowForm(v => !v)} className="text-xs text-indigo-600 hover:underline">
                {showForm ? 'Cancelar' : '+ Lançamento manual'}
              </button>
            </div>

            {showForm && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-3 space-y-2">
                <div className="flex gap-2">
                  <select value={type} onChange={e => setType(e.target.value)}
                    className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs">
                    <option value="expense">Débito</option>
                    <option value="income">Crédito</option>
                  </select>
                  <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição"
                    className="flex-1 px-2 py-1.5 border border-slate-300 rounded-lg text-xs" />
                  <input value={amount} onChange={e => setAmount(e.target.value)} type="number" min={0} step="0.01" placeholder="R$"
                    className="w-24 px-2 py-1.5 border border-slate-300 rounded-lg text-xs" />
                </div>
                {error && <p className="text-xs text-red-600">{error}</p>}
                <button onClick={submit} disabled={saving}
                  className="text-xs text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 px-3 py-1.5 rounded-lg">
                  {saving ? 'Salvando...' : 'Lançar'}
                </button>
              </div>
            )}

            <div className="divide-y divide-slate-50 border border-slate-100 rounded-lg overflow-hidden">
              {(data?.entries ?? []).length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs">Nenhum lançamento.</div>
              ) : data.entries.map((e: any) => (
                <div key={e.id} className="flex items-center justify-between px-3 py-2 text-xs">
                  <div>
                    <p className="text-slate-700">{e.description}</p>
                    <p className="text-slate-400">
                      {new Date(e.entryDate).toLocaleDateString('pt-BR')} · {CATEGORY_LABEL[e.category] ?? e.category}
                      {e.room?.name && ` · sala ${e.room.name}`}
                      {e.counter?.label && ` · ${e.counter.label}`}
                      {e.examType && ` · ${EXAM_LABEL[e.examType] ?? e.examType}`}
                    </p>
                  </div>
                  <span className={`font-medium ${e.type === 'income' ? 'text-green-700' : 'text-red-700'}`}>
                    {e.type === 'income' ? '+' : '-'} {fmtBRL(Number(e.amount))}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Preços por tipo de exame (cobrança automática no guichê) ─────────────────
function ExamPricesCard() {
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    clinicApi.listExamPrices()
      .then((r) => {
        const map: Record<string, string> = {};
        (r.data ?? []).forEach((p: any) => { map[p.examType] = String(p.price); });
        setPrices(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true); setSaved(false);
    try {
      const payload = Object.keys(EXAM_LABEL)
        .filter((k) => prices[k] !== undefined && prices[k] !== '')
        .map((k) => ({ examType: k, price: Number(prices[k]) }));
      await clinicApi.saveExamPrices(payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {} finally { setSaving(false); }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
      <p className="text-sm font-medium text-slate-800 mb-1">Preço por tipo de exame</p>
      <p className="text-xs text-slate-500 mb-3">
        Ao concluir um atendimento no guichê vinculado a um ASO, o faturamento é lançado automaticamente
        com o valor configurado aqui para o tipo de exame.
      </p>
      {loading ? (
        <div className="text-xs text-slate-400">Carregando...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(EXAM_LABEL).map(([k, label]) => (
              <div key={k}>
                <label className="label">{label}</label>
                <input type="number" min={0} step="0.01" className="input-field" placeholder="R$ 0,00"
                  value={prices[k] ?? ''}
                  onChange={(e) => setPrices((p) => ({ ...p, [k]: e.target.value }))} />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-3">
            <button onClick={save} disabled={saving}
              className="bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
              {saving ? 'Salvando...' : 'Salvar preços'}
            </button>
            {saved && <span className="text-xs text-green-700 font-medium">Salvo ✓</span>}
          </div>
        </>
      )}
    </div>
  );
}

export default function FinanceiroPage() {
  const [from, setFrom] = useState('');
  const [to, setTo]     = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [counterId, setCounterId] = useState('');
  const [examType, setExamType] = useState('');

  const [rooms, setRooms] = useState<any[]>([]);
  const [counters, setCounters] = useState<any[]>([]);
  const [dre, setDre]   = useState<any>(null);
  const [porMedico, setPorMedico] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [contaCorrenteFor, setContaCorrenteFor] = useState<{ id: string; name: string } | null>(null);
  const [showExamPrices, setShowExamPrices] = useState(false);

  const filters = () => ({
    from: from || undefined,
    to: to || undefined,
    doctorId: doctorId || undefined,
    roomId: roomId || undefined,
    counterId: counterId || undefined,
    examType: examType || undefined,
  });

  const load = () => {
    setLoading(true); setError('');
    const params = filters();
    Promise.all([
      clinicApi.financeiroDre(params).then(r => r.data),
      clinicApi.financeiroPorMedico(params).then(r => r.data),
    ]).then(([d, pm]) => { setDre(d); setPorMedico(pm); })
      .catch(err => setError(err.response?.data?.message ?? 'Erro ao carregar financeiro'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    clinicApi.listRooms().then(r => setRooms(r.data ?? [])).catch(() => {});
    atendimentoApi.listCounters().then(r => setCounters(r.data ?? [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ClinicShell>
      <div className="p-6 max-w-5xl">
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Financeiro</h1>
            <p className="text-slate-500 text-sm mt-0.5">DRE consolidado da clínica e repasse por médico</p>
          </div>
          <button onClick={() => setShowExamPrices((s) => !s)}
            className="text-xs font-semibold text-indigo-600 hover:underline">
            {showExamPrices ? 'Ocultar preços por exame' : 'Configurar preços por exame'}
          </button>
        </div>

        {showExamPrices && <ExamPricesCard />}

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
          <p className="text-xs font-semibold text-slate-600 mb-2">Filtros do extrato de faturamento</p>
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">De</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Até</label>
              <input type="date" value={to} onChange={e => setTo(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Por médico</label>
              <select value={doctorId} onChange={e => setDoctorId(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Todos</option>
                {porMedico.map((m: any) => (
                  <option key={m.doctorId} value={m.doctorId}>Dr(a). {m.doctorName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Por sala</label>
              <select value={roomId} onChange={e => setRoomId(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Todas</option>
                {rooms.map((r: any) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Por guichê</label>
              <select value={counterId} onChange={e => setCounterId(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Todos</option>
                {counters.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Por exame</label>
              <select value={examType} onChange={e => setExamType(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Todos</option>
                {Object.entries(EXAM_LABEL).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </div>
            <button onClick={load}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              Filtrar
            </button>
          </div>
          {(roomId || counterId || examType) && (
            <p className="text-xs text-amber-600 mt-3">
              Nota: faturamento por sala/guichê/exame só aparece em lançamentos gerados a partir do uso da
              sala (custo) ou de atendimentos concluídos no guichê com preço configurado — lançamentos
              manuais só entram no filtro se essas informações forem preenchidas ao lançar.
            </p>
          )}
        </div>

        {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Carregando...</div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-8">
              <StatCard label="Entradas" value={fmtBRL(dre?.entradas ?? 0)} />
              <StatCard label="Saídas" value={fmtBRL(dre?.saidas ?? 0)} />
              <StatCard label="Saldo" value={fmtBRL(dre?.saldo ?? 0)} />
            </div>

            {dre?.porCategoria?.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
                <p className="text-sm font-medium text-slate-800 mb-3">Por categoria</p>
                <div className="space-y-2">
                  {dre.porCategoria.map((c: any) => (
                    <div key={c.category} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 last:border-0">
                      <span className="text-slate-600">{CATEGORY_LABEL[c.category] ?? c.category}</span>
                      <span className={c.total >= 0 ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>
                        {fmtBRL(c.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <p className="text-sm font-medium text-slate-800 px-4 pt-4 pb-2">Repasse por médico</p>
              {porMedico.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">Nenhum lançamento no período.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                      <th className="px-4 py-3 font-medium">Médico</th>
                      <th className="px-4 py-3 font-medium">Comissão</th>
                      <th className="px-4 py-3 font-medium">Faturamento bruto</th>
                      <th className="px-4 py-3 font-medium">Repasse ao médico</th>
                      <th className="px-4 py-3 font-medium">Margem da clínica</th>
                      <th className="px-4 py-3 font-medium">Custo de salas</th>
                      <th className="px-4 py-3 font-medium">Conta corrente</th>
                      <th className="px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {porMedico.map((m: any) => (
                      <tr key={m.doctorId} className="border-b border-slate-50 last:border-0">
                        <td className="px-4 py-3 font-medium text-slate-800">Dr(a). {m.doctorName}</td>
                        <td className="px-4 py-3 text-slate-600">{m.commissionPct}%</td>
                        <td className="px-4 py-3 text-slate-600">{fmtBRL(m.faturamentoBruto)}</td>
                        <td className="px-4 py-3 text-slate-600">{fmtBRL(m.repasseMedico)}</td>
                        <td className="px-4 py-3 text-slate-800 font-medium">{fmtBRL(m.margemClinica)}</td>
                        <td className="px-4 py-3 text-red-600">{fmtBRL(m.custoSalas)}</td>
                        <td className={`px-4 py-3 font-medium ${(m.saldoContaCorrente ?? 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {fmtBRL(m.saldoContaCorrente)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setContaCorrenteFor({ id: m.doctorId, name: m.doctorName })}
                            className="text-xs text-indigo-600 hover:underline whitespace-nowrap"
                          >
                            Ver extrato
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {contaCorrenteFor && (
          <ContaCorrenteModal
            doctorId={contaCorrenteFor.id}
            doctorName={contaCorrenteFor.name}
            filters={{ roomId: roomId || undefined, counterId: counterId || undefined, examType: examType || undefined }}
            onClose={() => setContaCorrenteFor(null)}
          />
        )}
      </div>
    </ClinicShell>
  );
}
