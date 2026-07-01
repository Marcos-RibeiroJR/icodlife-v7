'use client';
// apps/web/src/app/vida/corpo/page.tsx
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { AppLayout } from '../../../components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('icodlife_token') : null; }
function authH()    { return { headers: { Authorization: `Bearer ${getToken()}` } }; }

const BMI_RANGES = [
  { label: 'Abaixo do Peso', key: 'abaixo_peso', color: '#60a5fa', min: 0,    max: 18.5 },
  { label: 'Normal',         key: 'normal',       color: '#34d399', min: 18.5, max: 25   },
  { label: 'Sobrepeso',      key: 'sobrepeso',    color: '#fbbf24', min: 25,   max: 30   },
  { label: 'Obesidade I',    key: 'obesidade_1',  color: '#f97316', min: 30,   max: 35   },
  { label: 'Obesidade II',   key: 'obesidade_2',  color: '#ef4444', min: 35,   max: 40   },
  { label: 'Obesidade III',  key: 'obesidade_3',  color: '#991b1b', min: 40,   max: 999  },
];

function getBmiInfo(bmi: number | null) {
  if (!bmi) return null;
  return BMI_RANGES.find(r => bmi >= r.min && bmi < r.max) ?? BMI_RANGES[BMI_RANGES.length - 1];
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

interface BodyMetric {
  id:               string;
  measuredAt:       string;
  weightKg?:        number;
  heightCm?:        number;
  bmi?:             number;
  bmiCategory?:     string;
  bodyFatPct?:      number;
  muscleMassKg?:    number;
  muscleMassPct?:   number;
  visceralFatLevel?:number;
  waterPct?:        number;
  boneMassKg?:      number;
  metabolicAge?:    number;
  bmr?:             number;
  deviceType?:      string;
  notes?:           string;
}

interface Stats {
  latest:       BodyMetric | null;
  totalEntries: number;
  weightDelta:  number | null;
  chart: {
    weight:     { date: string; value: number }[];
    bmi:        { date: string; value: number }[];
    bodyFat:    { date: string; value: number }[];
    muscleMass: { date: string; value: number }[];
  };
}

const EMPTY_FORM = {
  measuredAt: new Date().toISOString().slice(0, 16),
  weightKg: '', heightCm: '', bodyFatPct: '', muscleMassKg: '',
  muscleMassPct: '', visceralFatLevel: '', waterPct: '', boneMassKg: '',
  metabolicAge: '', bmr: '', deviceType: 'manual', notes: '',
};

export default function CorpoPage() {
  const [stats, setStats]         = useState<Stats | null>(null);
  const [history, setHistory]     = useState<BodyMetric[]>([]);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState('');
  const [activeChart, setActive]  = useState<'weight' | 'bmi' | 'bodyFat' | 'muscleMass'>('weight');

  const load = useCallback(async () => {
    try {
      const [s, h] = await Promise.all([
        axios.get(`${API}/body-metrics/stats`, authH()),
        axios.get(`${API}/body-metrics?limit=10`, authH()),
      ]);
      setStats(s.data);
      setHistory(h.data.items ?? []);
    } catch (e: any) {
      // silencioso — não exibe erro em lista
      console.warn('body-metrics load error:', e?.response?.status);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = () => {
    setSaving(true);
    setSaveError('');

    const num = (v: string) => v !== '' ? Number(v) : undefined;
    const payload: Record<string, any> = {
      measuredAt:  form.measuredAt || undefined,
      deviceType:  form.deviceType || undefined,
      notes:       form.notes       || undefined,
    };
    if (num(form.weightKg)         !== undefined) payload.weightKg         = num(form.weightKg);
    if (num(form.heightCm)         !== undefined) payload.heightCm         = num(form.heightCm);
    if (num(form.bodyFatPct)       !== undefined) payload.bodyFatPct       = num(form.bodyFatPct);
    if (num(form.muscleMassKg)     !== undefined) payload.muscleMassKg     = num(form.muscleMassKg);
    if (num(form.muscleMassPct)    !== undefined) payload.muscleMassPct    = num(form.muscleMassPct);
    if (num(form.visceralFatLevel) !== undefined) payload.visceralFatLevel = Math.round(num(form.visceralFatLevel)!);
    if (num(form.waterPct)         !== undefined) payload.waterPct         = num(form.waterPct);
    if (num(form.boneMassKg)       !== undefined) payload.boneMassKg       = num(form.boneMassKg);
    if (num(form.metabolicAge)     !== undefined) payload.metabolicAge     = Math.round(num(form.metabolicAge)!);
    if (num(form.bmr)              !== undefined) payload.bmr              = Math.round(num(form.bmr)!);

    axios.post(`${API}/body-metrics`, payload, authH())
      .then(() => {
        setForm(EMPTY_FORM);
        setShowForm(false);
        return load();
      })
      .catch((e: any) => {
        const msg = e?.response?.data?.message;
        setSaveError(
          Array.isArray(msg)
            ? msg.join(' | ')
            : (msg ?? `Erro ${e?.response?.status ?? ''}: verifique os dados e tente novamente.`)
        );
      })
      .finally(() => setSaving(false));
  };

  const del = async (id: string) => {
    if (!confirm('Remover este registro?')) return;
    try { await axios.delete(`${API}/body-metrics/${id}`, authH()); await load(); } catch {}
  };

  const latest = stats?.latest;
  const bmiInfo = getBmiInfo(latest?.bmi ? Number(latest.bmi) : null);
  const chartData = stats?.chart[activeChart]?.map(d => ({ date: fmt(d.date), value: d.value })) ?? [];

  const CHART_LABELS: Record<string, { label: string; color: string; unit: string }> = {
    weight:     { label: 'Peso',           color: '#dc2626', unit: 'kg' },
    bmi:        { label: 'IMC',            color: '#7c3aed', unit: '' },
    bodyFat:    { label: '% Gordura',      color: '#f97316', unit: '%' },
    muscleMass: { label: '% Massa Muscular', color: '#059669', unit: '%' },
  };

  const inp = 'w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-rose-400';

  return (
    <AppLayout>
      <div className="min-h-screen bg-[#FFF8F8] px-6 py-8 max-w-4xl mx-auto">

        {/* header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">⚖️ Evolução Corporal</h1>
            <p className="text-sm text-gray-500 mt-1">Peso, IMC e composição corporal</p>
          </div>
          <button
            onClick={() => setShowForm(s => !s)}
            className="px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 transition-colors"
          >
            {showForm ? '✕ Cancelar' : '+ Nova Medição'}
          </button>
        </div>

        {/* formulário */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-rose-100 p-6 mb-6 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-4">Nova Medição</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Data/Hora</label>
                <input type="datetime-local" className={inp} value={form.measuredAt}
                  onChange={e => setForm(f => ({...f, measuredAt: e.target.value}))} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Peso (kg)</label>
                <input type="number" step="0.1" placeholder="ex: 72.5" className={inp} value={form.weightKg}
                  onChange={e => setForm(f => ({...f, weightKg: e.target.value}))} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Altura (cm)</label>
                <input type="number" step="0.1" placeholder="ex: 175" className={inp} value={form.heightCm}
                  onChange={e => setForm(f => ({...f, heightCm: e.target.value}))} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">% Gordura Corporal</label>
                <input type="number" step="0.1" placeholder="ex: 22.5" className={inp} value={form.bodyFatPct}
                  onChange={e => setForm(f => ({...f, bodyFatPct: e.target.value}))} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Massa Muscular (kg)</label>
                <input type="number" step="0.1" placeholder="ex: 35.2" className={inp} value={form.muscleMassKg}
                  onChange={e => setForm(f => ({...f, muscleMassKg: e.target.value}))} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">% Massa Muscular</label>
                <input type="number" step="0.1" placeholder="ex: 48.8" className={inp} value={form.muscleMassPct}
                  onChange={e => setForm(f => ({...f, muscleMassPct: e.target.value}))} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Gordura Visceral (nível)</label>
                <input type="number" placeholder="1–20" className={inp} value={form.visceralFatLevel}
                  onChange={e => setForm(f => ({...f, visceralFatLevel: e.target.value}))} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">% Água Corporal</label>
                <input type="number" step="0.1" placeholder="ex: 55.0" className={inp} value={form.waterPct}
                  onChange={e => setForm(f => ({...f, waterPct: e.target.value}))} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Massa Óssea (kg)</label>
                <input type="number" step="0.1" placeholder="ex: 3.2" className={inp} value={form.boneMassKg}
                  onChange={e => setForm(f => ({...f, boneMassKg: e.target.value}))} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Idade Metabólica</label>
                <input type="number" placeholder="ex: 32" className={inp} value={form.metabolicAge}
                  onChange={e => setForm(f => ({...f, metabolicAge: e.target.value}))} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">TMB (kcal/dia)</label>
                <input type="number" placeholder="ex: 1680" className={inp} value={form.bmr}
                  onChange={e => setForm(f => ({...f, bmr: e.target.value}))} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Dispositivo</label>
                <select className={inp} value={form.deviceType}
                  onChange={e => setForm(f => ({...f, deviceType: e.target.value}))}>
                  <option value="manual">Manual</option>
                  <option value="balanca">Balança</option>
                  <option value="bioimpedancia">Bioimpedância</option>
                  <option value="fita">Fita Métrica</option>
                  <option value="dexa">DEXA</option>
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className="text-xs text-gray-500 mb-1 block">Observações</label>
              <textarea rows={2} className={inp} placeholder="ex: após academia, em jejum…" value={form.notes}
                onChange={e => setForm(f => ({...f, notes: e.target.value}))} />
            </div>
            {saveError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {saveError}
              </div>
            )}
            <button onClick={save} disabled={saving}
              className="mt-4 px-6 py-2 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 disabled:opacity-50">
              {saving ? 'Salvando…' : 'Salvar Medição'}
            </button>
          </div>
        )}

        {/* cards resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Peso Atual', value: latest?.weightKg ? `${Number(latest.weightKg).toFixed(1)} kg` : '—', sub: stats?.weightDelta !== null && stats?.weightDelta !== undefined ? `${stats.weightDelta > 0 ? '+' : ''}${stats.weightDelta} kg total` : undefined },
            { label: 'IMC', value: latest?.bmi ? Number(latest.bmi).toFixed(1) : '—', sub: bmiInfo?.label, subColor: bmiInfo?.color },
            { label: '% Gordura', value: latest?.bodyFatPct ? `${Number(latest.bodyFatPct).toFixed(1)}%` : '—', sub: undefined },
            { label: 'Medições', value: String(stats?.totalEntries ?? 0), sub: 'registros' },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-2xl border border-rose-100 p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">{c.label}</p>
              <p className="text-2xl font-bold text-gray-900">{c.value}</p>
              {c.sub && <p className="text-xs mt-1 font-medium" style={{ color: c.subColor ?? '#6b7280' }}>{c.sub}</p>}
            </div>
          ))}
        </div>

        {/* IMC gauge */}
        {latest?.bmi && (
          <div className="bg-white rounded-2xl border border-rose-100 p-5 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Classificação IMC</h3>
              <span className="text-2xl font-bold" style={{ color: bmiInfo?.color }}>{Number(latest.bmi).toFixed(1)}</span>
            </div>
            <div className="flex gap-1 h-3 rounded-full overflow-hidden mb-2">
              {BMI_RANGES.slice(0, -1).map(r => (
                <div key={r.key} className="flex-1 rounded-sm" style={{ backgroundColor: r.color, opacity: r.key === latest.bmiCategory ? 1 : 0.25 }} />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-gray-400">
              {BMI_RANGES.slice(0, -1).map(r => <span key={r.key}>{r.label.split(' ')[0]}</span>)}
            </div>
          </div>
        )}

        {/* gráficos */}
        {chartData.length > 1 && (
          <div className="bg-white rounded-2xl border border-rose-100 p-5 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Evolução</h3>
              <div className="flex gap-2">
                {(Object.keys(CHART_LABELS) as (keyof typeof CHART_LABELS)[]).map(k => (
                  <button key={k} onClick={() => setActive(k as any)}
                    className={`text-xs px-3 py-1 rounded-full transition-colors ${activeChart === k ? 'bg-rose-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {CHART_LABELS[k].label}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`${v} ${CHART_LABELS[activeChart].unit}`, CHART_LABELS[activeChart].label]} />
                {activeChart === 'bmi' && (
                  <>
                    <ReferenceLine y={18.5} stroke="#60a5fa" strokeDasharray="4 2" label={{ value: '18.5', position: 'right', fontSize: 10 }} />
                    <ReferenceLine y={25}   stroke="#34d399" strokeDasharray="4 2" label={{ value: '25', position: 'right', fontSize: 10 }} />
                    <ReferenceLine y={30}   stroke="#fbbf24" strokeDasharray="4 2" label={{ value: '30', position: 'right', fontSize: 10 }} />
                  </>
                )}
                <Line type="monotone" dataKey="value" stroke={CHART_LABELS[activeChart].color} strokeWidth={2} dot={{ r: 4, fill: CHART_LABELS[activeChart].color }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* histórico */}
        {history.length > 0 && (
          <div className="bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <h3 className="font-semibold text-gray-800">Histórico</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {history.map(m => (
                <div key={m.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50">
                  <div className="text-xs text-gray-400 w-16 shrink-0">
                    {new Date(m.measuredAt).toLocaleDateString('pt-BR', { day:'2-digit', month:'short' })}
                  </div>
                  <div className="flex-1 flex flex-wrap gap-3 text-sm">
                    {m.weightKg    && <span className="text-gray-700"><span className="text-gray-400 text-xs">Peso</span> {Number(m.weightKg).toFixed(1)}kg</span>}
                    {m.bmi         && <span className="text-gray-700"><span className="text-gray-400 text-xs">IMC</span> {Number(m.bmi).toFixed(1)}</span>}
                    {m.bodyFatPct  && <span className="text-gray-700"><span className="text-gray-400 text-xs">Gord</span> {Number(m.bodyFatPct).toFixed(1)}%</span>}
                    {m.muscleMassPct && <span className="text-gray-700"><span className="text-gray-400 text-xs">Musc</span> {Number(m.muscleMassPct).toFixed(1)}%</span>}
                    {m.waterPct    && <span className="text-gray-700"><span className="text-gray-400 text-xs">Água</span> {Number(m.waterPct).toFixed(1)}%</span>}
                  </div>
                  {m.deviceType && <span className="text-[10px] text-gray-400 capitalize hidden sm:block">{m.deviceType}</span>}
                  <button onClick={() => del(m.id)} className="text-gray-300 hover:text-red-400 text-lg leading-none">×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!stats?.totalEntries && !showForm && (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">⚖️</div>
            <p className="text-gray-500 mb-4">Nenhuma medição registrada ainda</p>
            <button onClick={() => setShowForm(true)}
              className="px-6 py-2 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700">
              Registrar primeira medição
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
