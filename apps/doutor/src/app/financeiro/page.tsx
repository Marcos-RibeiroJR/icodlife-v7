'use client';
// apps/doutor/src/app/financeiro/page.tsx
// Sprint 19 — Financeiro / Livro-Caixa

import { useEffect, useState, useCallback } from 'react';
import DoctorShell from '@/components/ui/DoctorShell';
import { api } from '@/lib/api';

const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const INCOME_CATEGORIES = [
  { value: 'consulta',     label: 'Consulta' },
  { value: 'retorno',      label: 'Retorno' },
  { value: 'exame',        label: 'Exame' },
  { value: 'procedimento', label: 'Procedimento' },
  { value: 'plano',        label: 'Convênio/Plano' },
  { value: 'outro',        label: 'Outro' },
];
const EXPENSE_CATEGORIES = [
  { value: 'aluguel',      label: 'Aluguel' },
  { value: 'salario',      label: 'Salário/Funcionário' },
  { value: 'material',     label: 'Material/Insumos' },
  { value: 'equipamento',  label: 'Equipamento' },
  { value: 'servico',      label: 'Serviço terceirizado' },
  { value: 'imposto',      label: 'Imposto/Taxa' },
  { value: 'outro',        label: 'Outro' },
];
const PAYMENT_METHODS = [
  { value: 'cash',        label: 'Dinheiro' },
  { value: 'pix',         label: 'PIX' },
  { value: 'card_debit',  label: 'Cartão Débito' },
  { value: 'card_credit', label: 'Cartão Crédito' },
  { value: 'transfer',    label: 'Transferência' },
  { value: 'insurance',   label: 'Convênio' },
];

const fmt   = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtD  = (s: string) => new Date(s).toLocaleDateString('pt-BR');

const CAT_LABEL = (cat: string) =>
  [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES].find(c => c.value === cat)?.label ?? cat;
const PAY_LABEL = (m: string) => PAYMENT_METHODS.find(p => p.value === m)?.label ?? m;

// ─── Gráfico de barras SVG (inline, sem biblioteca) ──────────────────────────
function BarChart({ daily }: { daily: Record<string, number> }) {
  const entries = Object.entries(daily).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return <p className="text-xs text-slate-400 text-center py-4">Sem dados de receita no período.</p>;

  const max = Math.max(...entries.map(([, v]) => v), 1);
  const W = 600, H = 140, PAD = 30, BAR_W = Math.max(8, Math.floor((W - PAD * 2) / entries.length) - 2);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 140 }}>
      {/* Eixo Y labels */}
      {[0, 0.5, 1].map(f => {
        const y = PAD + (H - PAD * 2) * (1 - f);
        return (
          <g key={f}>
            <line x1={PAD} y1={y} x2={W - 10} y2={y} stroke="#e2e8f0" strokeWidth={1} />
            <text x={PAD - 4} y={y + 4} textAnchor="end" fontSize={8} fill="#94a3b8">
              {fmt(max * f).replace('R$', '').trim()}
            </text>
          </g>
        );
      })}
      {/* Barras */}
      {entries.map(([date, value], i) => {
        const barH = Math.max(2, ((value / max) * (H - PAD * 2)));
        const x    = PAD + i * ((W - PAD * 2) / entries.length) + 1;
        const y    = H - PAD - barH;
        const day  = date.slice(8, 10);
        return (
          <g key={date}>
            <rect x={x} y={y} width={BAR_W} height={barH}
              rx={2} fill="#3b82f6" opacity={0.8} className="hover:opacity-100 transition-opacity" />
            {entries.length <= 15 && (
              <text x={x + BAR_W / 2} y={H - PAD + 12} textAnchor="middle" fontSize={7} fill="#64748b">{day}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Modal Novo Lançamento ───────────────────────────────────────────────────
function NewEntryModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    type:          'income',
    category:      'consulta',
    description:   '',
    amount:        '',
    paymentMethod: 'cash',
    entryDate:     today,
    patientName:   '',
    notes:         '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const cats = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  // Reset category when type changes
  const setType = (t: string) => setForm(f => ({
    ...f, type: t, category: t === 'income' ? 'consulta' : 'aluguel',
  }));

  const save = async () => {
    if (!form.description.trim() || !form.amount) { setError('Preencha descrição e valor.'); return; }
    setSaving(true); setError('');
    try {
      await api.post('/doutor/financeiro/entries', {
        ...form,
        amount:      Number(form.amount),
        patientName: form.patientName || undefined,
        notes:       form.notes || undefined,
      });
      onSaved(); onClose();
    } catch (e: any) { setError(e.response?.data?.message || 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-800">Novo Lançamento</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>

        <div className="space-y-3">
          {/* Receita / Despesa toggle */}
          <div className="flex gap-2">
            {(['income','expense'] as const).map(t => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-colors border ${
                  form.type === t
                    ? t === 'income'
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>
                {t === 'income' ? '⬆ Receita' : '⬇ Despesa'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Categoria</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                {cats.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Data</label>
              <input type="date" value={form.entryDate} onChange={e => set('entryDate', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Descrição *</label>
            <input value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Ex: Consulta Dr. Fulano, Aluguel consultório..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Valor (R$) *</label>
              <input type="number" min={0} step={0.01} value={form.amount}
                onChange={e => set('amount', e.target.value)}
                placeholder="0,00"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Pagamento</label>
              <select value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                {PAYMENT_METHODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          {form.type === 'income' && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">Paciente (opcional)</label>
              <input value={form.patientName} onChange={e => set('patientName', e.target.value)}
                placeholder="Nome do paciente"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          )}

          {error && <div className="px-4 py-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={save} disabled={saving}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Salvando...' : 'Lançar'}
          </button>
          <button onClick={onClose}
            className="px-5 py-2.5 border border-slate-300 text-slate-600 text-sm rounded-lg transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function FinanceiroPage() {
  const now        = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [filter,  setFilter]  = useState<'all' | 'income' | 'expense'>('all');
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/doutor/financeiro/summary', { params: { year, month } });
      setSummary(r.data);
    } finally { setLoading(false); }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este lançamento?')) return;
    await api.delete(`/doutor/financeiro/entries/${id}`);
    load();
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const from = new Date(year, month - 1, 1).toISOString();
      const to   = new Date(year, month, 0, 23, 59, 59).toISOString();
      const r    = await api.post('/doutor/financeiro/import-appointments', null, { params: { from, to } });
      if (r.data.imported > 0) { load(); }
      else { alert('Nenhuma consulta nova para importar no período.'); }
    } finally { setImporting(false); }
  };

  const navigate = (dir: 1 | -1) => {
    let m = month + dir, y = year;
    if (m < 1)  { m = 12; y--; }
    if (m > 12) { m = 1;  y++; }
    setMonth(m); setYear(y);
  };

  const entries = summary?.entries ?? [];
  const filtered = filter === 'all' ? entries
    : entries.filter((e: any) => e.type === filter);

  return (
    <DoctorShell>
      <div className="p-6 max-w-3xl">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Financeiro</h1>
            <p className="text-sm text-slate-500 mt-0.5">Livro-caixa do consultório</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleImport} disabled={importing}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-600 text-sm rounded-xl transition-colors disabled:opacity-50">
              {importing ? 'Importando...' : '⬇ Importar Consultas'}
            </button>
            <button onClick={() => setShowNew(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors">
              + Lançamento
            </button>
          </div>
        </div>

        {/* Navegação mês */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-600">‹</button>
          <h2 className="text-base font-semibold text-slate-800 min-w-[140px] text-center">
            {MONTHS_PT[month - 1]} {year}
          </h2>
          <button onClick={() => navigate(1)} className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-600">›</button>
        </div>

        {loading ? (
          <div className="text-center py-10 text-slate-400 text-sm">Carregando...</div>
        ) : (
          <>
            {/* Cards de resumo */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
                <p className="text-xs text-green-600 font-medium mb-1">Receitas</p>
                <p className="text-xl font-bold text-green-700">{fmt(summary?.totalIncome ?? 0)}</p>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                <p className="text-xs text-red-600 font-medium mb-1">Despesas</p>
                <p className="text-xl font-bold text-red-600">{fmt(summary?.totalExpense ?? 0)}</p>
              </div>
              <div className={`border rounded-2xl p-4 ${
                (summary?.balance ?? 0) >= 0
                  ? 'bg-blue-50 border-blue-100'
                  : 'bg-orange-50 border-orange-100'}`}>
                <p className={`text-xs font-medium mb-1 ${(summary?.balance ?? 0) >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  Saldo
                </p>
                <p className={`text-xl font-bold ${(summary?.balance ?? 0) >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                  {fmt(summary?.balance ?? 0)}
                </p>
              </div>
            </div>

            {/* Gráfico de receitas diárias */}
            {Object.keys(summary?.dailyIncome ?? {}).length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Receitas por dia — {MONTHS_PT[month - 1]}
                </p>
                <BarChart daily={summary.dailyIncome} />
              </div>
            )}

            {/* Filtros */}
            <div className="flex items-center gap-2 mb-3">
              {(['all','income','expense'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    filter === f
                      ? 'bg-slate-800 text-white'
                      : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                  {f === 'all' ? 'Todos' : f === 'income' ? 'Receitas' : 'Despesas'}
                </button>
              ))}
              <span className="ml-auto text-xs text-slate-400">{filtered.length} lançamentos</span>
            </div>

            {/* Tabela de lançamentos */}
            {filtered.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <p className="text-3xl mb-2">💰</p>
                <p className="text-sm">Nenhum lançamento neste período.</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Data</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Descrição</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Categoria</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Pagto</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500">Valor</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((e: any) => (
                      <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{fmtD(e.entryDate)}</td>
                        <td className="px-4 py-2.5">
                          <p className="text-xs font-medium text-slate-800 truncate max-w-[180px]">{e.description}</p>
                          {e.patientName && <p className="text-xs text-slate-400">{e.patientName}</p>}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                            {CAT_LABEL(e.category)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">{PAY_LABEL(e.paymentMethod)}</td>
                        <td className={`px-4 py-2.5 text-right text-xs font-bold whitespace-nowrap ${
                          e.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                          {e.type === 'income' ? '+' : '-'}{fmt(Number(e.amount))}
                        </td>
                        <td className="px-4 py-2.5">
                          <button onClick={() => handleDelete(e.id)}
                            className="text-slate-300 hover:text-red-400 transition-colors text-lg leading-none">×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totais */}
                  <tfoot>
                    <tr className="bg-slate-50 border-t border-slate-200">
                      <td colSpan={4} className="px-4 py-2.5 text-xs font-semibold text-slate-600">
                        {filter === 'all' ? 'Saldo' : filter === 'income' ? 'Total Receitas' : 'Total Despesas'}
                      </td>
                      <td className={`px-4 py-2.5 text-right text-sm font-bold ${
                        filter === 'expense' ? 'text-red-600'
                        : filter === 'income' ? 'text-green-600'
                        : (summary?.balance ?? 0) >= 0 ? 'text-blue-700' : 'text-orange-700'
                      }`}>
                        {filter === 'income'  ? fmt(summary?.totalIncome ?? 0)
                        : filter === 'expense' ? fmt(summary?.totalExpense ?? 0)
                        : fmt(summary?.balance ?? 0)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {showNew && (
        <NewEntryModal onClose={() => setShowNew(false)} onSaved={load} />
      )}
    </DoctorShell>
  );
}
