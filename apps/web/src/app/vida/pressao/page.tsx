'use client';
// apps/web/src/app/vida/pressao/page.tsx
// Mapa de Pressão Arterial — Sprint 5

import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '../../../components/layout/AppLayout';
import { bloodPressureApi } from '../../../lib/api';

// ── Tipos ─────────────────────────────────────────────────────────────────────
type BpClass = 'normal' | 'elevado' | 'hipertensao1' | 'hipertensao2' | 'crise';
type SleepQuality = 'boa' | 'regular' | 'ruim' | 'insonia';
type PhysicalActivity = 'nenhuma' | 'leve' | 'moderada' | 'intensa';
type StressLevel = 'baixo' | 'moderado' | 'alto';

interface Reading {
  id: string;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  measuredAt: string;
  arm: string | null;
  classification: BpClass;
  classInfo: { key: BpClass; label: string; color: string; bgColor: string; description: string };
  sleepQuality: SleepQuality | null;
  alcoholConsumed: boolean;
  heavyMeal: boolean;
  stressLevel: StressLevel | null;
  notes: string | null;
}

interface Correlation {
  factorLabel: string;
  impact: number;
  severity: 'low' | 'medium' | 'high';
  message: string;
}

interface Alert {
  level: 'info' | 'warning' | 'danger' | 'critical';
  title: string;
  message: string;
}

interface SeriesPoint {
  date: string;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  classification: BpClass;
  classInfo: { color: string };
  factors: string[];
}

interface AnalysisReport {
  totalReadings: number;
  avgSystolic: number;
  avgDiastolic: number;
  avgPulse: number | null;
  maxSystolic: number; minSystolic: number;
  maxDiastolic: number; minDiastolic: number;
  trendSystolic: 'subindo' | 'descendo' | 'estavel';
  trendDiastolic: 'subindo' | 'descendo' | 'estavel';
  dominantClass: BpClass;
  classDistribution: Record<BpClass, number>;
  correlations: Correlation[];
  alerts: Alert[];
  recommendations: string[];
  series: SeriesPoint[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const CLASS_STYLE: Record<BpClass, { bg: string; text: string; border: string; dot: string }> = {
  normal:       { bg:'bg-green-50',  text:'text-green-700',  border:'border-green-200', dot:'#16a34a' },
  elevado:      { bg:'bg-yellow-50', text:'text-yellow-700', border:'border-yellow-200',dot:'#ca8a04' },
  hipertensao1: { bg:'bg-orange-50', text:'text-orange-700', border:'border-orange-200',dot:'#ea580c' },
  hipertensao2: { bg:'bg-red-50',    text:'text-red-700',    border:'border-red-200',   dot:'#dc2626' },
  crise:        { bg:'bg-red-100',   text:'text-red-900',    border:'border-red-400',   dot:'#7f1d1d' },
};

const CLASS_LABEL: Record<BpClass, string> = {
  normal:'Normal', elevado:'Elevado', hipertensao1:'H. Grau 1', hipertensao2:'H. Grau 2', crise:'Crise',
};

const ALERT_STYLE = {
  info:     { bg:'bg-blue-50',   border:'border-blue-200',  text:'text-blue-800'  },
  warning:  { bg:'bg-yellow-50', border:'border-yellow-300',text:'text-yellow-900'},
  danger:   { bg:'bg-red-50',    border:'border-red-300',   text:'text-red-900'   },
  critical: { bg:'bg-red-100',   border:'border-red-500',   text:'text-red-900'   },
};

function trendIcon(t: string) {
  if (t === 'subindo') return '📈';
  if (t === 'descendo') return '📉';
  return '➡️';
}

// ── Gráfico SVG ───────────────────────────────────────────────────────────────
function BpChart({ series, period }: { series: SeriesPoint[]; period: number }) {
  if (!series.length) return (
    <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
      Nenhuma medição no período selecionado
    </div>
  );

  const W = 600, H = 200, PL = 48, PR = 16, PT = 16, PB = 36;
  const plotW = W - PL - PR;
  const plotH = H - PT - PB;

  // Últimas N medições para o período
  const pts = [...series].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const maxS = Math.max(...pts.map(p => p.systolic), 160);
  const minS = Math.min(...pts.map(p => p.diastolic), 60);
  const range = maxS - minS || 60;

  const toX = (i: number) => PL + (i / (pts.length - 1 || 1)) * plotW;
  const toY = (v: number) => PT + plotH - ((v - minS) / range) * plotH;

  const sysPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p.systolic)}`).join(' ');
  const diaPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p.diastolic)}`).join(' ');

  // Banda de referência normal (< 120 sistólica, < 80 diastólica)
  const refSysY = toY(120);
  const refDiaY = toY(80);

  // Linhas de referência
  const gridValues = [80, 100, 120, 140, 160].filter(v => v >= minS && v <= maxS);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 320, maxHeight: 220 }}>
        <defs>
          <linearGradient id="sysGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dc2626" stopOpacity="0.15"/>
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0"/>
          </linearGradient>
        </defs>

        {/* Banda zona normal */}
        <rect x={PL} y={refSysY} width={plotW} height={refDiaY - refSysY}
          fill="#f0fdf4" opacity="0.6"/>

        {/* Grid horizontal */}
        {gridValues.map(v => (
          <g key={v}>
            <line x1={PL} y1={toY(v)} x2={W - PR} y2={toY(v)}
              stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 3"/>
            <text x={PL - 4} y={toY(v) + 4} textAnchor="end"
              fontSize="10" fill="#94a3b8">{v}</text>
          </g>
        ))}

        {/* Linha diastólica */}
        <path d={diaPath} fill="none" stroke="#3b82f6" strokeWidth="2"
          strokeLinejoin="round" strokeLinecap="round" opacity="0.8"/>

        {/* Linha sistólica */}
        <path d={sysPath} fill="none" stroke="#dc2626" strokeWidth="2.5"
          strokeLinejoin="round" strokeLinecap="round"/>

        {/* Pontos sistólica */}
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={toX(i)} cy={toY(p.systolic)} r="4"
              fill={p.classInfo.color} stroke="white" strokeWidth="1.5"/>
            <circle cx={toX(i)} cy={toY(p.diastolic)} r="3"
              fill="#3b82f6" stroke="white" strokeWidth="1.5"/>
          </g>
        ))}

        {/* Eixo X — datas */}
        {pts.filter((_, i) => pts.length <= 8 || i % Math.ceil(pts.length / 6) === 0).map((p, ii, arr) => {
          const origIdx = pts.indexOf(p);
          const d = new Date(p.date);
          return (
            <text key={ii} x={toX(origIdx)} y={H - 4} textAnchor="middle"
              fontSize="9" fill="#94a3b8">
              {`${d.getDate()}/${d.getMonth()+1}`}
            </text>
          );
        })}

        {/* Linha de referência 120 */}
        <line x1={PL} y1={toY(120)} x2={W-PR} y2={toY(120)}
          stroke="#16a34a" strokeWidth="1" strokeDasharray="6 3" opacity="0.5"/>

        {/* Legenda */}
        <g transform={`translate(${PL}, ${PT - 4})`}>
          <circle cx="6" cy="0" r="4" fill="#dc2626"/>
          <text x="12" y="4" fontSize="9" fill="#64748b">Sistólica</text>
          <circle cx="68" cy="0" r="4" fill="#3b82f6"/>
          <text x="74" y="4" fontSize="9" fill="#64748b">Diastólica</text>
        </g>
      </svg>
    </div>
  );
}

// ── Página Principal ──────────────────────────────────────────────────────────
export default function BloodPressurePage() {
  const [tab, setTab] = useState<'home' | 'register' | 'history' | 'analysis'>('home');
  const [readings, setReadings] = useState<Reading[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [chartPeriod, setChartPeriod] = useState(30);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Formulário
  const now = new Date();
  const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const [form, setForm] = useState({
    systolic: '', diastolic: '', pulse: '',
    measuredAt: localNow, arm: '',
    sleepQuality: '', alcoholConsumed: false, heavyMeal: false, highSodium: false,
    physicalActivity: '', stressLevel: '', caffeine: false,
    tookMedication: false, headache: false, dizziness: false, smoking: false,
    notes: '',
  });

  const setF = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, aRes] = await Promise.all([
        bloodPressureApi.list(180),
        bloodPressureApi.analyze(90),
      ]);
      setReadings(rRes.data);
      setAnalysis(aRes.data);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.systolic || !form.diastolic) { setError('Informe a sistólica e diastólica.'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      await bloodPressureApi.create({
        systolic:  Number(form.systolic),
        diastolic: Number(form.diastolic),
        pulse:     form.pulse ? Number(form.pulse) : undefined,
        measuredAt: form.measuredAt,
        arm:       form.arm || undefined,
        sleepQuality:     form.sleepQuality || undefined,
        alcoholConsumed:  form.alcoholConsumed,
        heavyMeal:        form.heavyMeal,
        highSodium:       form.highSodium,
        physicalActivity: form.physicalActivity || undefined,
        stressLevel:      form.stressLevel || undefined,
        caffeine:         form.caffeine,
        tookMedication:   form.tookMedication,
        headache:         form.headache,
        dizziness:        form.dizziness,
        smoking:          form.smoking,
        notes:            form.notes || undefined,
      });
      setSuccess('Medição registrada com sucesso!');
      setForm(f => ({ ...f, systolic:'', diastolic:'', pulse:'', notes:'' }));
      await load();
      setTimeout(() => setTab('home'), 1200);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Erro ao salvar. Tente novamente.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await bloodPressureApi.delete(id);
      await load();
    } catch { /* silencioso */ }
    setDeleteId(null);
  };

  const last = readings[0];
  const seriesForPeriod = (analysis?.series ?? []).filter(
    p => new Date(p.date).getTime() >= Date.now() - chartPeriod * 86_400_000
  );

  const TABS = [
    { id:'home',     label:'🏠 Início'    },
    { id:'register', label:'➕ Registrar' },
    { id:'history',  label:'📋 Histórico' },
    { id:'analysis', label:'🤖 Análise IA'},
  ];

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-3xl">❤️</span>
              <h1 className="text-2xl font-bold text-slate-800">Mapa de Pressão Arterial</h1>
            </div>
            <p className="text-slate-500 text-sm">Monitore, registre e entenda os fatores que influenciam sua PA</p>
          </div>
          <button onClick={() => setTab('register')}
            className="bg-red-700 text-white font-bold px-4 py-2.5 rounded-xl hover:bg-red-800 transition-colors text-sm">
            + Medir agora
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-5">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`flex-1 py-2 px-1 rounded-lg text-xs font-semibold transition-all
                ${tab === t.id ? 'bg-white shadow text-red-700' : 'text-slate-500 hover:text-slate-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <div className="animate-spin text-3xl mr-3">⏳</div> Carregando…
          </div>
        )}

        {!loading && (
          <>
            {/* ── HOME ── */}
            {tab === 'home' && (
              <div className="space-y-4">

                {/* Última medição */}
                {last ? (
                  <div className={`rounded-2xl border-2 p-5 ${CLASS_STYLE[last.classification].bg} ${CLASS_STYLE[last.classification].border}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Última medição</span>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${CLASS_STYLE[last.classification].bg} ${CLASS_STYLE[last.classification].text} border ${CLASS_STYLE[last.classification].border}`}>
                        {CLASS_LABEL[last.classification]}
                      </span>
                    </div>
                    <div className="flex items-end gap-1 mb-1">
                      <span className="text-5xl font-bold text-slate-800">{last.systolic}</span>
                      <span className="text-2xl font-semibold text-slate-400 mb-1">/</span>
                      <span className="text-3xl font-bold text-slate-600 mb-0.5">{last.diastolic}</span>
                      <span className="text-sm text-slate-400 ml-1 mb-1">mmHg</span>
                      {last.pulse && <span className="text-sm text-slate-500 ml-3 mb-1">❤️ {last.pulse} bpm</span>}
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(last.measuredAt).toLocaleString('pt-BR', { dateStyle:'short', timeStyle:'short' })}
                      {last.arm && ` · Braço ${last.arm}`}
                    </div>
                    <p className={`mt-2 text-sm font-medium ${CLASS_STYLE[last.classification].text}`}>
                      {last.classInfo?.description}
                    </p>
                  </div>
                ) : (
                  <div className="card p-8 text-center">
                    <div className="text-5xl mb-3">❤️</div>
                    <p className="text-slate-500 mb-4">Nenhuma medição registrada ainda.</p>
                    <button onClick={() => setTab('register')}
                      className="bg-red-700 text-white font-bold px-6 py-3 rounded-xl hover:bg-red-800 transition-colors text-sm">
                      Registrar primeira medição
                    </button>
                  </div>
                )}

                {/* Cards de resumo */}
                {analysis && analysis.totalReadings > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label:'Média PA',    value:`${analysis.avgSystolic}/${analysis.avgDiastolic}`, sub:'mmHg', icon:'📊' },
                      { label:'Total aferições', value:String(analysis.totalReadings),     sub:'medições',icon:'📋' },
                      { label:'Sistólica',   value:`${analysis.minSystolic}–${analysis.maxSystolic}`, sub:'mmHg faixa',icon:'📈' },
                      { label:'Tendência',   value:trendIcon(analysis.trendSystolic), sub:analysis.trendSystolic, icon:'🎯' },
                    ].map((c, i) => (
                      <div key={i} className="card p-4 text-center">
                        <div className="text-2xl mb-1">{c.icon}</div>
                        <div className="text-lg font-bold text-slate-800">{c.value}</div>
                        <div className="text-xs text-slate-500">{c.label}</div>
                        <div className="text-[10px] text-slate-400">{c.sub}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Alertas principais */}
                {analysis?.alerts?.slice(0, 3).map((a, i) => (
                  <div key={i} className={`rounded-xl border p-3.5 ${ALERT_STYLE[a.level].bg} ${ALERT_STYLE[a.level].border}`}>
                    <div className={`font-bold text-sm mb-0.5 ${ALERT_STYLE[a.level].text}`}>{a.title}</div>
                    <div className={`text-xs leading-relaxed ${ALERT_STYLE[a.level].text} opacity-90`}>{a.message}</div>
                  </div>
                ))}

                {/* Gráfico */}
                {analysis && analysis.series.length > 0 && (
                  <div className="card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-slate-700">📈 Evolução da Pressão</h3>
                      <div className="flex gap-1">
                        {[7,30,90].map(d => (
                          <button key={d} onClick={() => setChartPeriod(d)}
                            className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors
                              ${chartPeriod === d ? 'bg-red-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                            {d === 7 ? '7d' : d === 30 ? '30d' : '90d'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <BpChart series={seriesForPeriod} period={chartPeriod} />
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded bg-green-200"/>Normal &lt;120/80</span>
                      <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded bg-yellow-200"/>Elevado 120–129</span>
                      <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded bg-orange-200"/>H. Grau 1 130–139</span>
                      <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded bg-red-200"/>H. Grau 2 ≥140</span>
                    </div>
                  </div>
                )}

                {/* Distribuição de classificações */}
                {analysis && analysis.totalReadings > 0 && (
                  <div className="card p-4">
                    <h3 className="font-bold text-slate-700 mb-3">🎯 Distribuição das Medições</h3>
                    <div className="space-y-2">
                      {(Object.entries(analysis.classDistribution) as [BpClass, number][])
                        .filter(([, v]) => v > 0)
                        .sort((a, b) => {
                          const order: BpClass[] = ['normal','elevado','hipertensao1','hipertensao2','crise'];
                          return order.indexOf(a[0]) - order.indexOf(b[0]);
                        })
                        .map(([cls, count]) => {
                          const pct = Math.round((count / analysis.totalReadings) * 100);
                          return (
                            <div key={cls}>
                              <div className="flex justify-between text-xs mb-1">
                                <span className={`font-semibold ${CLASS_STYLE[cls].text}`}>{CLASS_LABEL[cls]}</span>
                                <span className="text-slate-500">{count} ({pct}%)</span>
                              </div>
                              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all"
                                  style={{ width:`${pct}%`, backgroundColor: CLASS_STYLE[cls].dot }}/>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* ── REGISTRAR ── */}
            {tab === 'register' && (
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* PA + pulso */}
                <div className="card p-5">
                  <h3 className="font-bold text-slate-700 mb-4">❤️ Valores da Medição</h3>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div>
                      <label className="label">Sistólica (máx)</label>
                      <input type="number" placeholder="120" min={50} max={300}
                        className="input-field text-center text-lg font-bold"
                        value={form.systolic} onChange={e => setF('systolic', e.target.value)} required/>
                      <p className="text-[10px] text-slate-400 text-center mt-0.5">mmHg</p>
                    </div>
                    <div>
                      <label className="label">Diastólica (mín)</label>
                      <input type="number" placeholder="80" min={30} max={200}
                        className="input-field text-center text-lg font-bold"
                        value={form.diastolic} onChange={e => setF('diastolic', e.target.value)} required/>
                      <p className="text-[10px] text-slate-400 text-center mt-0.5">mmHg</p>
                    </div>
                    <div>
                      <label className="label">Pulso (opcional)</label>
                      <input type="number" placeholder="72" min={30} max={250}
                        className="input-field text-center"
                        value={form.pulse} onChange={e => setF('pulse', e.target.value)}/>
                      <p className="text-[10px] text-slate-400 text-center mt-0.5">bpm</p>
                    </div>
                  </div>

                  {/* Preview da classificação em tempo real */}
                  {form.systolic && form.diastolic && (() => {
                    const s = Number(form.systolic), d = Number(form.diastolic);
                    let cls: BpClass = 'normal';
                    if (s >= 180 || d >= 120) cls = 'crise';
                    else if (s >= 140 || d >= 90) cls = 'hipertensao2';
                    else if (s >= 130 || d >= 80) cls = 'hipertensao1';
                    else if (s >= 120 && d < 80)  cls = 'elevado';
                    return (
                      <div className={`rounded-xl p-3 text-center border ${CLASS_STYLE[cls].bg} ${CLASS_STYLE[cls].border}`}>
                        <span className={`font-bold text-sm ${CLASS_STYLE[cls].text}`}>
                          {CLASS_LABEL[cls]}
                        </span>
                        <span className="text-xs text-slate-500 ml-2">→ {s}/{d} mmHg</span>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="label">Data e hora</label>
                      <input type="datetime-local" className="input-field"
                        value={form.measuredAt} onChange={e => setF('measuredAt', e.target.value)}/>
                    </div>
                    <div>
                      <label className="label">Braço</label>
                      <select className="input-field" value={form.arm} onChange={e => setF('arm', e.target.value)}>
                        <option value="">—</option>
                        <option value="esquerdo">Esquerdo</option>
                        <option value="direito">Direito</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Fatores contextuais */}
                <div className="card p-5">
                  <h3 className="font-bold text-slate-700 mb-1">🤖 Fatores Contextuais</h3>
                  <p className="text-xs text-slate-500 mb-4">Esses dados ajudam a IA a identificar o que influencia sua pressão</p>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="label">Como dormiu?</label>
                      <select className="input-field" value={form.sleepQuality} onChange={e => setF('sleepQuality', e.target.value)}>
                        <option value="">— Não informar</option>
                        <option value="boa">😴 Dormiu bem</option>
                        <option value="regular">😐 Regular</option>
                        <option value="ruim">😫 Dormiu mal</option>
                        <option value="insonia">😵 Insônia</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Atividade física hoje</label>
                      <select className="input-field" value={form.physicalActivity} onChange={e => setF('physicalActivity', e.target.value)}>
                        <option value="">— Não informar</option>
                        <option value="nenhuma">🛋️ Nenhuma</option>
                        <option value="leve">🚶 Leve (caminhada)</option>
                        <option value="moderada">🏃 Moderada</option>
                        <option value="intensa">💪 Intensa</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Nível de estresse</label>
                      <select className="input-field" value={form.stressLevel} onChange={e => setF('stressLevel', e.target.value)}>
                        <option value="">— Não informar</option>
                        <option value="baixo">😌 Baixo</option>
                        <option value="moderado">😐 Moderado</option>
                        <option value="alto">😰 Alto</option>
                      </select>
                    </div>
                  </div>

                  {/* Checkboxes */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key:'alcoholConsumed', label:'🍺 Bebeu álcool'          },
                      { key:'heavyMeal',       label:'🥩 Refeição pesada'        },
                      { key:'highSodium',      label:'🧂 Muita sal/sódio'        },
                      { key:'caffeine',        label:'☕ Cafeína (café/energético)'},
                      { key:'tookMedication',  label:'💊 Tomou medicamento PA'   },
                      { key:'smoking',         label:'🚬 Fumou'                  },
                      { key:'headache',        label:'🤕 Dor de cabeça'          },
                      { key:'dizziness',       label:'😵 Tontura/vertigem'       },
                    ].map(({ key, label }) => (
                      <label key={key}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all
                          ${(form as any)[key] ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                        <input type="checkbox" className="w-4 h-4 accent-red-600"
                          checked={(form as any)[key]}
                          onChange={e => setF(key, e.target.checked)}/>
                        <span className="text-xs font-medium text-slate-700">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Observações */}
                <div className="card p-4">
                  <label className="label">Observações (opcional)</label>
                  <textarea rows={2} placeholder="Ex.: medido após exercício, estava ansioso..."
                    className="input-field resize-none"
                    value={form.notes} onChange={e => setF('notes', e.target.value)}/>
                </div>

                {error   && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}
                {success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">{success}</div>}

                <button type="submit" disabled={saving}
                  className="w-full bg-red-700 text-white font-bold py-3.5 rounded-xl hover:bg-red-800 transition-colors disabled:opacity-50">
                  {saving ? 'Salvando…' : '✅ Salvar Medição'}
                </button>
              </form>
            )}

            {/* ── HISTÓRICO ── */}
            {tab === 'history' && (
              <div className="space-y-3">
                {readings.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-3">📋</div>
                    <p className="text-slate-400 text-sm">Nenhuma medição registrada.</p>
                  </div>
                )}

                {/* Tabela */}
                {readings.length > 0 && (
                  <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Data/Hora</th>
                            <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">PA (mmHg)</th>
                            <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Pulso</th>
                            <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Classificação</th>
                            <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Fatores</th>
                            <th className="px-3 py-3"/>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {readings.map(r => {
                            const factors: string[] = [];
                            if (r.alcoholConsumed) factors.push('🍺');
                            if (r.heavyMeal) factors.push('🥩');
                            if (r.sleepQuality === 'ruim' || r.sleepQuality === 'insonia') factors.push('😴');
                            return (
                              <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 text-slate-700 text-xs whitespace-nowrap">
                                  {new Date(r.measuredAt).toLocaleString('pt-BR', { dateStyle:'short', timeStyle:'short' })}
                                </td>
                                <td className="px-3 py-3 text-center font-bold text-slate-800">
                                  {r.systolic}/{r.diastolic}
                                </td>
                                <td className="px-3 py-3 text-center text-slate-600 text-xs">
                                  {r.pulse ? `${r.pulse} bpm` : '—'}
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${CLASS_STYLE[r.classification].bg} ${CLASS_STYLE[r.classification].text}`}>
                                    {CLASS_LABEL[r.classification]}
                                  </span>
                                </td>
                                <td className="px-3 py-3 text-base">{factors.join(' ')}</td>
                                <td className="px-3 py-3">
                                  {deleteId === r.id ? (
                                    <div className="flex gap-1">
                                      <button onClick={() => handleDelete(r.id)}
                                        className="text-[11px] text-red-700 font-bold hover:underline">Confirmar</button>
                                      <button onClick={() => setDeleteId(null)}
                                        className="text-[11px] text-slate-400 hover:underline">Cancelar</button>
                                    </div>
                                  ) : (
                                    <button onClick={() => setDeleteId(r.id)}
                                      className="text-slate-300 hover:text-red-500 transition-colors text-base">🗑️</button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── ANÁLISE IA ── */}
            {tab === 'analysis' && (
              <div className="space-y-4">
                {!analysis || analysis.totalReadings === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-3">🤖</div>
                    <p className="text-slate-400 text-sm mb-4">Registre ao menos algumas medições para ativar a análise.</p>
                    <button onClick={() => setTab('register')}
                      className="bg-red-700 text-white font-bold px-6 py-3 rounded-xl hover:bg-red-800 text-sm">
                      Registrar medição
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Gráfico avançado */}
                    <div className="card p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-slate-700">📈 Gráfico de Tendência</h3>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{trendIcon(analysis.trendSystolic)} Sistólica: {analysis.trendSystolic}</span>
                          <span>{trendIcon(analysis.trendDiastolic)} Diastólica: {analysis.trendDiastolic}</span>
                        </div>
                      </div>
                      <div className="flex gap-1 mb-3">
                        {[7,30,90].map(d => (
                          <button key={d} onClick={() => setChartPeriod(d)}
                            className={`text-xs px-2.5 py-1 rounded-lg font-semibold
                              ${chartPeriod === d ? 'bg-red-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                            {d === 7 ? '7 dias' : d === 30 ? '30 dias' : '90 dias'}
                          </button>
                        ))}
                      </div>
                      <BpChart series={seriesForPeriod} period={chartPeriod} />
                    </div>

                    {/* Todos os alertas */}
                    {analysis.alerts.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="font-bold text-slate-700">🚨 Alertas e Avisos</h3>
                        {analysis.alerts.map((a, i) => (
                          <div key={i} className={`rounded-xl border p-3.5 ${ALERT_STYLE[a.level].bg} ${ALERT_STYLE[a.level].border}`}>
                            <div className={`font-bold text-sm mb-0.5 ${ALERT_STYLE[a.level].text}`}>{a.title}</div>
                            <div className={`text-xs leading-relaxed ${ALERT_STYLE[a.level].text} opacity-90`}>{a.message}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Correlações */}
                    {analysis.correlations.length > 0 && (
                      <div className="card p-4">
                        <h3 className="font-bold text-slate-700 mb-3">🔗 O que influencia sua pressão</h3>
                        <div className="space-y-3">
                          {analysis.correlations.map((c, i) => (
                            <div key={i} className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-0">
                              <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-1.5 ${c.severity === 'high' ? 'bg-red-500' : c.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-400'}`}/>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-slate-700">{c.factorLabel}</div>
                                <div className="text-xs text-slate-500 mt-0.5">{c.message}</div>
                              </div>
                              <div className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${c.impact > 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                                {c.impact > 0 ? '+' : ''}{c.impact} mmHg
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recomendações */}
                    {analysis.recommendations.length > 0 && (
                      <div className="card p-4">
                        <h3 className="font-bold text-slate-700 mb-3">💡 Recomendações Personalizadas</h3>
                        <div className="space-y-2">
                          {analysis.recommendations.map((r, i) => (
                            <div key={i} className="flex items-start gap-2.5 text-sm text-slate-700 bg-slate-50 rounded-xl p-3">
                              <span className="text-base leading-5">{r.slice(0,2)}</span>
                              <span className="leading-relaxed">{r.slice(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Aviso médico */}
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 text-xs text-blue-800 leading-relaxed">
                      ℹ️ <strong>Aviso:</strong> Esta análise é baseada nos seus registros e tem caráter informativo. Não substitui avaliação médica. Compartilhe este relatório com seu médico ou cardiologista.
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
