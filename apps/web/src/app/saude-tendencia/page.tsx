'use client';
// apps/web/src/app/saude-tendencia/page.tsx
// Fase 3 — Dashboard de Tendência de Saúde (motor de risco / check-ins diários do HealthBot)
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';
import { AppLayout } from '../../components/layout/AppLayout';
import { chatApi } from '../../lib/api';

type Period = 'daily' | 'weekly' | 'monthly' | 'annual';

interface SeriePoint {
  bucket: string;
  checkins: number;
  avgRisk: number;
  avgSentiment: number;
  flagCount: number;
}
interface TrendsResponse {
  period: Period;
  totalCheckins: number;
  avgRisk: number;
  currentTrend: 'improving' | 'worsening' | 'stable' | string;
  series: SeriePoint[];
  topFlags: { flag: string; count: number }[];
}

const PERIODS: { key: Period; label: string }[] = [
  { key: 'daily',   label: 'Diário' },
  { key: 'weekly',  label: 'Semanal' },
  { key: 'monthly', label: 'Mensal' },
  { key: 'annual',  label: 'Anual' },
];

// Thresholds do motor: riskScore >= 50 -> alto, >= 20 -> moderado, senão baixo
function riskMeta(score: number) {
  if (score >= 50) return { label: 'Risco Alto',      color: '#dc2626', bg: 'bg-red-50',   text: 'text-red-700',   icon: '🔴' };
  if (score >= 20) return { label: 'Risco Moderado',  color: '#d97706', bg: 'bg-amber-50', text: 'text-amber-700', icon: '🟡' };
  return              { label: 'Risco Baixo',      color: '#16a34a', bg: 'bg-green-50', text: 'text-green-700', icon: '🟢' };
}

const TREND_META: Record<string, { label: string; icon: string; text: string }> = {
  improving: { label: 'Melhorando', icon: '📈', text: 'text-emerald-600' },
  worsening: { label: 'Piorando',   icon: '📉', text: 'text-red-600' },
  stable:    { label: 'Estável',    icon: '➡️', text: 'text-slate-600' },
};

const FLAG_META: Record<string, { label: string; icon: string }> = {
  sleep_issue:       { label: 'Sono ruim',            icon: '😴' },
  severe_pain:       { label: 'Dor intensa',          icon: '🤕' },
  missed_medication: { label: 'Medicação esquecida',  icon: '💊' },
  bp_risk_factors:   { label: 'Fatores de risco (PA)', icon: '❤️' },
  bp_symptom:        { label: 'Sintoma de pressão',   icon: '🩺' },
  possible_illness:  { label: 'Possível doença',      icon: '🤒' },
};
const flagLabel = (f: string) => FLAG_META[f]?.label ?? f.replace(/_/g, ' ');
const flagIcon  = (f: string) => FLAG_META[f]?.icon ?? '⚠️';

// Encurta rótulo do bucket no eixo X conforme o período
function shortBucket(bucket: string, period: Period): string {
  if (period === 'daily') {
    const [, m, d] = bucket.split('-');
    return d && m ? `${d}/${m}` : bucket;
  }
  if (period === 'weekly')  return bucket.replace(/^\d{4}-/, '');           // S03
  if (period === 'monthly') {
    const [y, m] = bucket.split('-');
    const nomes = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    return m ? `${nomes[+m - 1]}/${y.slice(2)}` : bucket;
  }
  return bucket; // annual -> ano cheio
}

export default function SaudeTendenciaPage() {
  const [period, setPeriod]   = useState<Period>('daily');
  const [data, setData]       = useState<TrendsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const load = async (p: Period) => {
    setLoading(true); setError('');
    try {
      const { data } = await chatApi.getTrends(p);
      setData(data);
    } catch {
      setError('Não foi possível carregar a tendência de saúde.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(period); /* eslint-disable-next-line */ }, [period]);

  const risk  = data ? riskMeta(data.avgRisk) : null;
  const trend = data ? (TREND_META[data.currentTrend] ?? TREND_META.stable) : null;
  const maxFlag = data && data.topFlags.length ? data.topFlags[0].count : 1;

  const chartData = (data?.series ?? []).map(s => ({
    ...s,
    x: shortBucket(s.bucket, period),
  }));

  return (
    <AppLayout>
      {/* Cabeçalho */}
      <div className="bg-[#7B1E1E] px-8 py-6">
        <div className="max-w-4xl mx-auto flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-white text-2xl font-bold">Tendência de Saúde</h1>
            <p className="text-white/55 text-sm mt-1">
              Motor de risco · check-ins diários do HealthBot
            </p>
          </div>
          <div className="flex gap-2">
            {PERIODS.map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all
                  ${period === p.key
                    ? 'bg-white text-[#7B1E1E]'
                    : 'bg-white/20 text-white hover:bg-white/30'}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-8 max-w-4xl mx-auto space-y-6">

        {loading && (
          <div className="card p-16 text-center text-slate-400">
            <div className="text-4xl mb-4">📊</div>
            <div className="font-semibold">Analisando seus check-ins...</div>
            <div className="text-sm mt-1">Consolidando risco, sentimento e sinais</div>
          </div>
        )}

        {!loading && error && (
          <div className="card p-10 text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <p className="text-slate-500 font-semibold">{error}</p>
            <button onClick={() => load(period)}
              className="mt-4 px-4 py-2 rounded-lg bg-[#7B1E1E] text-white text-sm font-semibold">
              Tentar novamente
            </button>
          </div>
        )}

        {!loading && !error && data && data.totalCheckins === 0 && (
          <div className="card p-12 text-center">
            <div className="text-4xl mb-3">🤖</div>
            <p className="font-semibold text-slate-600">Ainda não há check-ins neste período.</p>
            <p className="text-sm text-slate-400 mt-1">
              Faça seu check-in diário com o HealthBot para começar a construir sua tendência.
            </p>
            <Link href="/chat"
              className="inline-block mt-4 px-4 py-2 rounded-lg bg-[#7B1E1E] text-white text-sm font-semibold">
              Abrir HealthBot
            </Link>
          </div>
        )}

        {!loading && !error && data && data.totalCheckins > 0 && (
          <>
            {/* Cards de resumo */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className={`rounded-2xl p-4 border ${risk!.bg} border-transparent`}>
                <div className="text-xs text-slate-500">Risco médio</div>
                <div className={`text-3xl font-bold mt-1 ${risk!.text}`}>{data.avgRisk}</div>
                <div className={`text-xs font-semibold mt-1 ${risk!.text}`}>{risk!.icon} {risk!.label}</div>
              </div>
              <div className="rounded-2xl p-4 bg-slate-50">
                <div className="text-xs text-slate-500">Tendência atual</div>
                <div className={`text-2xl font-bold mt-1 ${trend!.text}`}>{trend!.icon}</div>
                <div className={`text-xs font-semibold mt-1 ${trend!.text}`}>{trend!.label}</div>
              </div>
              <div className="rounded-2xl p-4 bg-slate-50">
                <div className="text-xs text-slate-500">Check-ins</div>
                <div className="text-3xl font-bold mt-1 text-slate-700">{data.totalCheckins}</div>
                <div className="text-xs text-slate-400 mt-1">no período</div>
              </div>
              <div className="rounded-2xl p-4 bg-slate-50">
                <div className="text-xs text-slate-500">Sinais (flags)</div>
                <div className="text-3xl font-bold mt-1 text-slate-700">
                  {data.topFlags.reduce((a, f) => a + f.count, 0)}
                </div>
                <div className="text-xs text-slate-400 mt-1">{data.topFlags.length} tipo(s)</div>
              </div>
            </div>

            {/* Gráfico de risco */}
            <div className="card p-5">
              <h2 className="font-bold text-slate-800 mb-1">Evolução do risco</h2>
              <p className="text-xs text-slate-400 mb-4">
                Score 0–100 · linhas de referência em 20 (moderado) e 50 (alto)
              </p>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="x" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`${v}`, 'Risco médio']} />
                  <ReferenceLine y={20} stroke="#fbbf24" strokeDasharray="4 2" />
                  <ReferenceLine y={50} stroke="#dc2626" strokeDasharray="4 2" />
                  <Line type="monotone" dataKey="avgRisk" stroke="#7B1E1E" strokeWidth={2}
                    dot={{ r: 3, fill: '#7B1E1E' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfico de sentimento */}
            <div className="card p-5">
              <h2 className="font-bold text-slate-800 mb-1">Sentimento</h2>
              <p className="text-xs text-slate-400 mb-4">
                Escala -1 (negativo) a +1 (positivo), extraída das respostas
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="x" tick={{ fontSize: 11 }} />
                  <YAxis domain={[-1, 1]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`${v}`, 'Sentimento médio']} />
                  <ReferenceLine y={0} stroke="#cbd5e1" />
                  <Area type="monotone" dataKey="avgSentiment" stroke="#0ea5e9" strokeWidth={2}
                    fill="url(#sentGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Top flags */}
            {data.topFlags.length > 0 && (
              <div className="card p-5">
                <h2 className="font-bold text-slate-800 mb-4">Sinais mais frequentes</h2>
                <div className="space-y-3">
                  {data.topFlags.map(f => (
                    <div key={f.flag} className="flex items-center gap-3">
                      <span className="text-lg w-6 text-center flex-shrink-0">{flagIcon(f.flag)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-700 truncate">{flagLabel(f.flag)}</span>
                          <span className="text-sm font-bold text-slate-500 ml-2">{f.count}x</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-[#7B1E1E]"
                            style={{ width: `${Math.max(6, (f.count / maxFlag) * 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-600">
              Este painel é gerado automaticamente a partir dos seus check-ins e não substitui avaliação médica profissional.
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
