'use client';
// apps/web/src/app/vida/glicemia/page.tsx — Sprint 14

import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '../../../components/layout/AppLayout';
import { glucoseApi } from '../../../lib/api';

// ── Tipos ─────────────────────────────────────────────────────────────────────
type AlertLevel = 'critical_low' | 'low' | 'normal' | 'pre_diabetes' | 'high' | 'critical_high';
type GlucoseContext = 'fasting' | 'pre_meal' | 'post_meal' | 'bedtime' | 'random' | 'post_exercise';

const CONTEXT_LABELS: Record<GlucoseContext, string> = {
  fasting:       'Jejum',
  pre_meal:      'Pré-refeição',
  post_meal:     'Pós-refeição',
  bedtime:       'Antes de dormir',
  random:        'Aleatório',
  post_exercise: 'Pós-exercício',
};

const ALERT_STYLE: Record<AlertLevel, { label: string; color: string; bg: string; border: string }> = {
  critical_low:  { label: 'Hipo Grave',     color: 'text-red-900',    bg: 'bg-red-100',    border: 'border-red-400' },
  low:           { label: 'Hipoglicemia',   color: 'text-red-700',    bg: 'bg-red-50',     border: 'border-red-300' },
  normal:        { label: 'Normal',         color: 'text-green-700',  bg: 'bg-green-50',   border: 'border-green-300' },
  pre_diabetes:  { label: 'Pré-diabetes',   color: 'text-amber-700',  bg: 'bg-amber-50',   border: 'border-amber-300' },
  high:          { label: 'Hiperglicemia',  color: 'text-orange-700', bg: 'bg-orange-50',  border: 'border-orange-300' },
  critical_high: { label: 'Hiper Grave',    color: 'text-purple-700', bg: 'bg-purple-50',  border: 'border-purple-300' },
};

// ── Gráfico simples de barras ─────────────────────────────────────────────────
function GlucoseChart({ series }: { series: any[] }) {
  if (!series || series.length === 0) return (
    <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Sem dados para exibir</div>
  );

  const last = series.slice(-20);
  const maxVal = Math.max(...last.map((r: any) => r.value), 200);
  const minVal = Math.min(...last.map((r: any) => r.value), 60);
  const range  = maxVal - minVal || 1;

  const colorBar = (al: AlertLevel) => {
    if (al === 'critical_low' || al === 'low') return '#ef4444';
    if (al === 'normal')                        return '#22c55e';
    if (al === 'pre_diabetes')                  return '#f59e0b';
    if (al === 'high')                          return '#f97316';
    return '#8b5cf6';
  };

  return (
    <div className="flex items-end gap-1 h-40 px-2">
      {/* Linha de referência 70 */}
      <div className="relative w-full flex items-end gap-1 h-full">
        {last.map((r: any, i: number) => {
          const h = Math.round(((r.value - minVal) / range) * 100);
          return (
            <div key={i} className="flex-1 flex flex-col items-center group relative">
              <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-10">
                <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                  {r.value} mg/dL<br />{CONTEXT_LABELS[r.context as GlucoseContext] || r.context}<br />
                  {new Date(r.date).toLocaleDateString('pt-BR', { day:'2-digit', month:'short' })}
                </div>
              </div>
              <div
                style={{ height: `${Math.max(h, 4)}%`, backgroundColor: colorBar(r.alertLevel) }}
                className="w-full rounded-t transition-all"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── HbA1c Histórico ──────────────────────────────────────────────────────────
function HbA1cCard({ record }: { record: any }) {
  const cls = record.classification;
  return (
    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
      <div>
        <p className="font-semibold text-gray-800">{Number(record.value).toFixed(1)}%</p>
        <p className="text-xs text-gray-500">{record.labName || 'Laboratório'} · {new Date(record.measuredAt).toLocaleDateString('pt-BR')}</p>
        {record.estimatedAvgGlucose && (
          <p className="text-xs text-gray-400">Glicemia média estimada: ~{Number(record.estimatedAvgGlucose)} mg/dL</p>
        )}
      </div>
      <span className="text-sm font-medium px-2 py-1 rounded" style={{ color: cls?.color, backgroundColor: cls?.color + '20' }}>
        {cls?.label}
      </span>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function GlicemiaPage() {
  const [tab, setTab]           = useState<'historico' | 'analise' | 'hba1c'>('historico');
  const [readings, setReadings] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [hba1cList, setHba1cList] = useState<any[]>([]);
  const [loading, setLoading]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showHbForm, setShowHbForm] = useState(false);
  const [days, setDays]         = useState(30);

  // Form glicemia
  const [form, setForm] = useState({
    value: '', context: 'fasting' as GlucoseContext, measuredAt: new Date().toISOString().slice(0, 16),
    notes: '', carbsGrams: '', insulinUnits: '', exerciseBefore: false, sick: false,
  });

  // Form HbA1c
  const [hbForm, setHbForm] = useState({
    value: '', measuredAt: new Date().toISOString().slice(0, 10), labName: '', notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, a, h] = await Promise.all([
        glucoseApi.list(days),
        glucoseApi.analyze(days),
        glucoseApi.listHbA1c(),
      ]);
      setReadings(r.data);
      setAnalysis(a.data);
      setHba1cList(h.data);
    } catch { /* silencioso */ }
    setLoading(false);
  }, [days]);

  useEffect(() => { load(); }, [load]);

  async function submitGlucose(e: React.FormEvent) {
    e.preventDefault();
    try {
      await glucoseApi.create({
        value:         Number(form.value),
        context:       form.context,
        measuredAt:    form.measuredAt,
        notes:         form.notes || undefined,
        carbsGrams:    form.carbsGrams ? Number(form.carbsGrams) : undefined,
        insulinUnits:  form.insulinUnits ? Number(form.insulinUnits) : undefined,
        exerciseBefore: form.exerciseBefore,
        sick:          form.sick,
      });
      setShowForm(false);
      setForm({ value:'', context:'fasting', measuredAt: new Date().toISOString().slice(0,16), notes:'', carbsGrams:'', insulinUnits:'', exerciseBefore:false, sick:false });
      load();
    } catch { alert('Erro ao salvar leitura'); }
  }

  async function submitHbA1c(e: React.FormEvent) {
    e.preventDefault();
    try {
      await glucoseApi.createHbA1c({
        value:      Number(hbForm.value),
        measuredAt: hbForm.measuredAt,
        labName:    hbForm.labName || undefined,
        notes:      hbForm.notes || undefined,
      });
      setShowHbForm(false);
      setHbForm({ value:'', measuredAt: new Date().toISOString().slice(0,10), labName:'', notes:'' });
      load();
    } catch { alert('Erro ao salvar HbA1c'); }
  }

  async function deleteReading(id: string) {
    if (!confirm('Remover esta leitura?')) return;
    await glucoseApi.delete(id);
    load();
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🩸 Glicemia</h1>
            <p className="text-sm text-gray-500">Monitoramento de diabetes e controle glicêmico</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowHbForm(true)} className="px-3 py-2 text-sm border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50">
              + HbA1c
            </button>
            <button onClick={() => setShowForm(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              + Registrar
            </button>
          </div>
        </div>

        {/* Cards resumo */}
        {analysis && analysis.totalReadings > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{analysis.avgGlucose}</p>
              <p className="text-xs text-gray-500">mg/dL médio</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{analysis.timeInRange?.inRangePct}%</p>
              <p className="text-xs text-gray-500">Tempo no alvo</p>
            </div>
            {analysis.fastingAvg && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{analysis.fastingAvg}</p>
                <p className="text-xs text-gray-500">Média jejum</p>
              </div>
            )}
            {analysis.postMealAvg && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-2xl font-bold text-orange-600">{analysis.postMealAvg}</p>
                <p className="text-xs text-gray-500">Média pós-refeição</p>
              </div>
            )}
          </div>
        )}

        {/* Alertas */}
        {analysis?.alerts?.length > 0 && (
          <div className="space-y-2">
            {analysis.alerts.map((a: any, i: number) => (
              <div key={i} className={`flex gap-3 p-3 rounded-lg border text-sm ${
                a.level === 'critical' ? 'bg-red-50 border-red-300 text-red-800' :
                a.level === 'danger'   ? 'bg-orange-50 border-orange-300 text-orange-800' :
                a.level === 'warning'  ? 'bg-amber-50 border-amber-300 text-amber-800' :
                                         'bg-blue-50 border-blue-300 text-blue-800'
              }`}>
                <div>
                  <p className="font-semibold">{a.title}</p>
                  <p className="text-xs mt-0.5 opacity-90">{a.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {(['historico','analise','hba1c'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              {t === 'historico' ? 'Histórico' : t === 'analise' ? 'Análise' : 'HbA1c'}
            </button>
          ))}
          <select value={days} onChange={e => setDays(Number(e.target.value))}
            className="ml-2 text-xs border border-gray-200 rounded px-2 bg-white text-gray-600">
            <option value={7}>7 dias</option>
            <option value={30}>30 dias</option>
            <option value={90}>90 dias</option>
            <option value={180}>6 meses</option>
          </select>
        </div>

        {/* Conteúdo */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Carregando...</div>
        ) : (
          <>
            {/* Histórico */}
            {tab === 'historico' && (
              <div className="space-y-3">
                {/* Gráfico */}
                {analysis?.series?.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">Curva glicêmica</p>
                    <GlucoseChart series={analysis.series} />
                    <div className="flex gap-4 mt-2 text-xs text-gray-500 justify-center">
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block"/>Normal</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500 inline-block"/>Pré-diab.</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500 inline-block"/>Alto</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500 inline-block"/>Baixo</span>
                    </div>
                  </div>
                )}

                {readings.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-4xl mb-2">🩸</p>
                    <p>Nenhuma leitura registrada</p>
                    <button onClick={() => setShowForm(true)} className="mt-3 text-blue-600 text-sm">Registrar primeira leitura</button>
                  </div>
                ) : (
                  readings.map((r: any) => {
                    const style = ALERT_STYLE[r.alertLevel as AlertLevel] ?? ALERT_STYLE.normal;
                    return (
                      <div key={r.id} className={`flex items-center justify-between p-4 rounded-xl border ${style.border} ${style.bg}`}>
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className={`text-2xl font-bold ${style.color}`}>{Number(r.value).toFixed(0)}</p>
                            <p className="text-xs text-gray-400">mg/dL</p>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.color} bg-white border ${style.border}`}>
                                {style.label}
                              </span>
                              <span className="text-xs text-gray-500">{CONTEXT_LABELS[r.context as GlucoseContext]}</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {new Date(r.measuredAt).toLocaleDateString('pt-BR')} · {new Date(r.measuredAt).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}
                            </p>
                            {r.notes && <p className="text-xs text-gray-500 mt-0.5">{r.notes}</p>}
                          </div>
                        </div>
                        <button onClick={() => deleteReading(r.id)} className="text-gray-300 hover:text-red-500 text-lg">×</button>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Análise */}
            {tab === 'analise' && analysis && (
              <div className="space-y-4">
                {/* Tempo no alvo */}
                {analysis.timeInRange && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="font-medium text-gray-800 mb-3">Tempo no Alvo (70–180 mg/dL)</p>
                    <div className="flex h-6 rounded-full overflow-hidden mb-2">
                      <div style={{ width: `${analysis.timeInRange.belowRangePct}%` }} className="bg-red-400" title="Abaixo do alvo" />
                      <div style={{ width: `${analysis.timeInRange.inRangePct}%` }} className="bg-green-400" title="No alvo" />
                      <div style={{ width: `${analysis.timeInRange.aboveRangePct}%` }} className="bg-orange-400" title="Acima do alvo" />
                    </div>
                    <div className="flex gap-4 text-xs text-gray-600">
                      <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-400 rounded inline-block"/>{analysis.timeInRange.belowRangePct}% abaixo</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-400 rounded inline-block"/>{analysis.timeInRange.inRangePct}% no alvo</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-400 rounded inline-block"/>{analysis.timeInRange.aboveRangePct}% acima</span>
                    </div>
                  </div>
                )}

                {/* Recomendações */}
                {analysis.recommendations?.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="font-medium text-gray-800 mb-2">Recomendações</p>
                    <ul className="space-y-1">
                      {analysis.recommendations.map((r: string, i: number) => (
                        <li key={i} className="text-sm text-gray-600">{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* HbA1c */}
            {tab === 'hba1c' && (
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">
                  <strong>O que é HbA1c?</strong> Mede a glicemia média dos últimos 2–3 meses. Meta: abaixo de 7% para a maioria dos diabéticos.
                </div>
                {hba1cList.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <p className="text-3xl mb-2">📊</p>
                    <p>Nenhum registro de HbA1c</p>
                    <button onClick={() => setShowHbForm(true)} className="mt-3 text-blue-600 text-sm">Adicionar resultado</button>
                  </div>
                ) : (
                  hba1cList.map((r: any) => <HbA1cCard key={r.id} record={r} />)
                )}
              </div>
            )}
          </>
        )}

        {/* Modal — Registrar glicemia */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold text-gray-900">Registrar Glicemia</h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
              </div>
              <form onSubmit={submitGlucose} className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Valor (mg/dL) *</label>
                  <input type="number" required min={20} max={600} value={form.value}
                    onChange={e => setForm({...form, value: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: 120" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Contexto *</label>
                  <select value={form.context} onChange={e => setForm({...form, context: e.target.value as GlucoseContext})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    {Object.entries(CONTEXT_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Data e hora *</label>
                  <input type="datetime-local" required value={form.measuredAt}
                    onChange={e => setForm({...form, measuredAt: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Carboidratos (g)</label>
                    <input type="number" min={0} value={form.carbsGrams}
                      onChange={e => setForm({...form, carbsGrams: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Opcional" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Insulina (UI)</label>
                    <input type="number" min={0} step={0.5} value={form.insulinUnits}
                      onChange={e => setForm({...form, insulinUnits: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Opcional" />
                  </div>
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={form.exerciseBefore} onChange={e => setForm({...form, exerciseBefore: e.target.checked})}
                      className="rounded" />
                    Exercício antes
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={form.sick} onChange={e => setForm({...form, sick: e.target.checked})}
                      className="rounded" />
                    Doente
                  </label>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Observações</label>
                  <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-16 resize-none" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowForm(false)}
                    className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm">Cancelar</button>
                  <button type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Salvar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal — HbA1c */}
        {showHbForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold text-gray-900">Registrar HbA1c</h2>
                <button onClick={() => setShowHbForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
              </div>
              <form onSubmit={submitHbA1c} className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Valor (%) *</label>
                  <input type="number" required min={3} max={20} step={0.1} value={hbForm.value}
                    onChange={e => setHbForm({...hbForm, value: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="Ex: 6.5" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Data do exame *</label>
                  <input type="date" required value={hbForm.measuredAt}
                    onChange={e => setHbForm({...hbForm, measuredAt: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Laboratório</label>
                  <input type="text" value={hbForm.labName}
                    onChange={e => setHbForm({...hbForm, labName: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="Ex: Hermes Pardini" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowHbForm(false)}
                    className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm">Cancelar</button>
                  <button type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Salvar</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
