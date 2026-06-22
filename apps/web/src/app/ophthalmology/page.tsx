'use client';
// apps/web/src/app/ophthalmology/page.tsx
import { useState, useEffect } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { ophthalmologyApi } from '../../lib/api';
import Link from 'next/link';

const RISK_BADGE: Record<string,string> = {
  none:'bg-green-100 text-green-700', low:'bg-yellow-100 text-yellow-700',
  moderate:'bg-orange-100 text-orange-700', high:'bg-red-100 text-red-700',
};
const RISK_LABEL: Record<string,string> = {
  none:'🟢 Normal', low:'🟡 Leve', moderate:'🟠 Moderado', high:'🔴 Elevado',
};

// Diagrama SVG do olho com eixo de astigmatismo
function EyeDiagram({ axis, label }: { axis: number | null; label: string }) {
  const cx = 80, cy = 80, r = 60;
  const rad = axis !== null ? (axis * Math.PI) / 180 : null;
  const x2 = rad !== null ? cx + r * Math.cos(rad) : null;
  const y2 = rad !== null ? cy - r * Math.sin(rad) : null;
  const x1 = rad !== null ? cx - r * Math.cos(rad) : null;
  const y1 = rad !== null ? cy + r * Math.sin(rad) : null;

  return (
    <div className="flex flex-col items-center">
      <svg width={160} height={160} viewBox="0 0 160 160">
        {/* Esclera */}
        <circle cx={cx} cy={cy} r={r} fill="white" stroke="#cbd5e1" strokeWidth={2} />
        {/* Iris */}
        <circle cx={cx} cy={cy} r={38} fill="#bfdbfe" stroke="#93c5fd" strokeWidth={1.5} />
        {/* Pupila */}
        <circle cx={cx} cy={cy} r={18} fill="#1e3a5f" />
        {/* Reflexo */}
        <circle cx={cx - 6} cy={cy - 6} r={5} fill="white" opacity={0.6} />
        {/* Eixo de astigmatismo */}
        {rad !== null && x1 !== null && x2 !== null && (
          <line x1={x1} y1={y1!} x2={x2} y2={y2!}
            stroke="#dc2626" strokeWidth={2} strokeDasharray="5,3" opacity={0.9} />
        )}
        {/* Graus ao redor */}
        {[0,45,90,135].map(deg => {
          const a = (deg * Math.PI) / 180;
          const tx = cx + (r + 12) * Math.cos(a);
          const ty = cy - (r + 12) * Math.sin(a);
          return <text key={deg} x={tx} y={ty} textAnchor="middle" dominantBaseline="middle"
            fontSize={8} fill="#94a3b8">{deg}°</text>;
        })}
      </svg>
      <div className="text-xs font-semibold text-slate-600 mt-1">{label}</div>
      {axis !== null ? (
        <div className="text-xs text-red-600 font-bold">Eixo {axis}°</div>
      ) : (
        <div className="text-xs text-slate-400">Sem eixo registrado</div>
      )}
    </div>
  );
}

// Escala de Snellen visual
function AcuityMeter({ value, label }: { value: string | null; label: string }) {
  // Converte "20/20" → número (menor é pior visão)
  const parse = (v: string | null) => {
    if (!v) return null;
    const parts = v.split('/');
    if (parts.length !== 2) return null;
    return Number(parts[1]) / Number(parts[0]);
  };
  const ratio = parse(value);
  const pct = ratio ? Math.min(100, Math.max(0, 100 - ((ratio - 1) / 4) * 100)) : 0;
  const color = !ratio ? '#94a3b8' : pct >= 90 ? '#16a34a' : pct >= 60 ? '#d97706' : '#dc2626';

  return (
    <div className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-2xl">
      <div className="text-xs text-slate-400 font-semibold">{label}</div>
      <div className="text-3xl font-bold" style={{ color }}>{value ?? '—'}</div>
      <div className="w-full bg-slate-200 rounded-full h-2">
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div className="text-xs text-slate-400">
        {!ratio ? 'Sem dado' : ratio === 1 ? 'Visao perfeita' : ratio <= 1.5 ? 'Boa visao' : ratio <= 2 ? 'Visao reduzida' : 'Baixa visao'}
      </div>
    </div>
  );
}

export default function OphthalmologyPage() {
  const [exams, setExams]     = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<'home'|'exams'|'history'|'novo'>('home');
  const [form, setForm]       = useState({
    consultDate: '', doctorName: '', clinic: '',
    sphericalRight: '', cylinderRight: '', axisRight: '',
    sphericalLeft:  '', cylinderLeft:  '', axisLeft:  '',
    addRight: '', addLeft: '',
    diagnoses: [] as string[], notes: '',
  });
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  const DIAGNOSES_LIST = ['Miopia','Hipermetropia','Astigmatismo','Presbiopia','Catarata','Glaucoma','Retinopathy','Ambliopia'];

  useEffect(() => {
    Promise.allSettled([ophthalmologyApi.listExams(), ophthalmologyApi.getHistory()]).then(([e, h]) => {
      setExams(e.status === 'fulfilled' ? (e.value.data?.data ?? e.value.data ?? []) : []);
      setHistory(h.status === 'fulfilled' ? (h.value.data?.data ?? h.value.data ?? []) : []);
      setLoading(false);
    });
  }, []);

  const lastExam     = exams[0];
  const lastHistory  = history[0];

  const toggleDiag = (d: string) =>
    setForm(f => ({ ...f, diagnoses: f.diagnoses.includes(d) ? f.diagnoses.filter(x => x !== d) : [...f.diagnoses, d] }));

  const save = async () => {
    setSaving(true);
    try {
      await ophthalmologyApi.createHistory({
        consultDate:     form.consultDate || undefined,
        doctorName:      form.doctorName  || undefined,
        clinic:          form.clinic      || undefined,
        sphericalRight:  form.sphericalRight ? Number(form.sphericalRight) : undefined,
        cylinderRight:   form.cylinderRight  ? Number(form.cylinderRight)  : undefined,
        axisRight:       form.axisRight      ? Number(form.axisRight)       : undefined,
        sphericalLeft:   form.sphericalLeft  ? Number(form.sphericalLeft)   : undefined,
        cylinderLeft:    form.cylinderLeft   ? Number(form.cylinderLeft)    : undefined,
        axisLeft:        form.axisLeft       ? Number(form.axisLeft)        : undefined,
        addRight:        form.addRight       ? Number(form.addRight)        : undefined,
        addLeft:         form.addLeft        ? Number(form.addLeft)         : undefined,
        diagnoses:       form.diagnoses.length ? form.diagnoses : undefined,
        notes:           form.notes || undefined,
      });
      setSaved(true);
      // Recarrega histórico
      const { data } = await ophthalmologyApi.getHistory();
      setHistory(data?.data ?? data ?? []);
      setTimeout(() => { setSaved(false); setTab('history'); }, 1500);
    } catch {} finally { setSaving(false); }
  };

  const TABS = [
    { id: 'home',    label: '🏠 Inicio' },
    { id: 'exams',   label: '📋 Triagens' },
    { id: 'history', label: '📁 Historico' },
    { id: 'novo',    label: '+ Consulta' },
  ];

  return (
    <AppLayout>
      <div className="bg-[#7B1E1E] px-8 py-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-white text-2xl font-bold">Oftalmologia</h1>
            <p className="text-white/55 text-sm mt-1">Saude ocular — triagem digital e acompanhamento</p>
          </div>
          <Link href="/ophthalmology/auto-exam"
            className="bg-white/20 hover:bg-white/30 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all">
            Iniciar triagem →
          </Link>
        </div>
      </div>

      <div className="p-8 max-w-4xl mx-auto">
        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all
                ${tab === t.id ? 'bg-white shadow text-[#7B1E1E]' : 'text-slate-500 hover:text-slate-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── HOME ── */}
        {tab === 'home' && (
          <div className="space-y-5">

            {/* Diagrama de olhos do último histórico */}
            {lastHistory && (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-800">Ultima prescricao — {new Date(lastHistory.consultDate ?? lastHistory.createdAt).toLocaleDateString('pt-BR')}</h3>
                  {lastHistory.doctorName && <span className="text-xs text-slate-400">Dr. {lastHistory.doctorName}</span>}
                </div>

                {/* Diagramas de eixo */}
                <div className="flex justify-around mb-6">
                  <EyeDiagram axis={lastHistory.axisRight ?? null} label="Olho Direito (OD)" />
                  <EyeDiagram axis={lastHistory.axisLeft  ?? null} label="Olho Esquerdo (OE)" />
                </div>

                {/* Tabela de graus — fonte grande */}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'OD — Olho Direito', sf: lastHistory.sphericalRight, cy: lastHistory.cylinderRight, ax: lastHistory.axisRight, add: lastHistory.addRight },
                    { label: 'OE — Olho Esquerdo', sf: lastHistory.sphericalLeft,  cy: lastHistory.cylinderLeft,  ax: lastHistory.axisLeft,  add: lastHistory.addLeft  },
                  ].map(eye => (
                    <div key={eye.label} className="bg-slate-50 rounded-2xl p-4">
                      <div className="text-xs text-slate-400 font-semibold mb-3">{eye.label}</div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-[10px] text-slate-400">Esfera</div>
                          <div className="text-2xl font-bold text-slate-800">{eye.sf != null ? (Number(eye.sf) >= 0 ? `+${Number(eye.sf).toFixed(2)}` : Number(eye.sf).toFixed(2)) : '—'}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400">Cilindro</div>
                          <div className="text-2xl font-bold text-slate-800">{eye.cy != null ? (Number(eye.cy) >= 0 ? `+${Number(eye.cy).toFixed(2)}` : Number(eye.cy).toFixed(2)) : '—'}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400">Eixo</div>
                          <div className="text-2xl font-bold text-red-700">{eye.ax != null ? `${eye.ax}°` : '—'}</div>
                        </div>
                        {eye.add != null && (
                          <div>
                            <div className="text-[10px] text-slate-400">Adicao</div>
                            <div className="text-2xl font-bold text-blue-700">+{Number(eye.add).toFixed(2)}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {lastHistory.diagnoses?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-slate-100">
                    {lastHistory.diagnoses.map((d: string) => (
                      <span key={d} className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{d}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Acuidade da última triagem */}
            {lastExam && (
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-800">Ultima triagem digital</h3>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${RISK_BADGE[lastExam.riskLevel] ?? RISK_BADGE.none}`}>
                    {RISK_LABEL[lastExam.riskLevel] ?? 'Sem dado'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <AcuityMeter value={lastExam.acuityRightEye} label="Acuidade OD" />
                  <AcuityMeter value={lastExam.acuityLeftEye}  label="Acuidade OE" />
                </div>
                {lastExam.reportSummary && (
                  <p className="text-xs text-slate-500 leading-relaxed mt-4 border-t border-slate-100 pt-3">
                    {lastExam.reportSummary}
                  </p>
                )}
              </div>
            )}

            {/* CTA se vazio */}
            {!lastExam && !lastHistory && (
              <div className="card p-10 text-center">
                <div className="text-5xl mb-3">👁️</div>
                <p className="font-semibold text-slate-600 mb-2">Nenhum dado ocular registrado ainda</p>
                <p className="text-sm text-slate-400 mb-5">Faca uma triagem digital ou registre sua ultima consulta.</p>
                <div className="flex gap-3 justify-center">
                  <Link href="/ophthalmology/auto-exam"
                    className="bg-[#7B1E1E] text-white font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-[#5f1616] transition-colors">
                    Triagem digital
                  </Link>
                  <button onClick={() => setTab('novo')}
                    className="border-2 border-slate-200 text-slate-600 font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-slate-50 transition-colors">
                    + Registrar consulta
                  </button>
                </div>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              ⚠️ Exame de pre-triagem digital. Nao substitui avaliacao com oftalmologista.
            </div>

            <Link href="/appointments?specialty=Oftalmologia"
              className="block w-full text-center border-2 border-slate-200 text-slate-600 font-semibold py-3 rounded-xl hover:bg-slate-50 transition-colors text-sm">
              Agendar consulta com oftalmologista
            </Link>
          </div>
        )}

        {/* ── TRIAGENS ── */}
        {tab === 'exams' && (
          <div className="space-y-3">
            {loading && <p className="text-slate-400 text-sm text-center py-8">Carregando...</p>}
            {!loading && exams.length === 0 && (
              <div className="text-center py-12">
                <div className="text-5xl mb-3">👁️</div>
                <p className="text-slate-400 text-sm mb-4">Nenhuma triagem realizada ainda.</p>
                <Link href="/ophthalmology/auto-exam"
                  className="bg-[#7B1E1E] text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-[#5f1616] transition-colors">
                  Fazer primeira triagem
                </Link>
              </div>
            )}
            {exams.map((e: any) => (
              <div key={e.id} className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-bold text-slate-700">
                    {new Date(e.createdAt).toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })}
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${RISK_BADGE[e.riskLevel] ?? RISK_BADGE.none}`}>
                    {RISK_LABEL[e.riskLevel]}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <AcuityMeter value={e.acuityRightEye} label="OD" />
                  <AcuityMeter value={e.acuityLeftEye}  label="OE" />
                </div>
                {e.reportSummary && (
                  <p className="text-xs text-slate-500 leading-relaxed mt-3">{e.reportSummary}</p>
                )}
                {e.confidenceScore && (
                  <div className="mt-2 text-[10px] text-slate-400">Confianca: {e.confidenceScore}%</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── HISTÓRICO ── */}
        {tab === 'history' && (
          <div className="space-y-4">
            {!loading && history.length === 0 && (
              <div className="text-center py-10">
                <div className="text-4xl mb-3">📁</div>
                <p className="text-slate-400 text-sm mb-4">Nenhuma consulta registrada.</p>
                <button onClick={() => setTab('novo')}
                  className="bg-[#7B1E1E] text-white font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-[#5f1616] transition-colors">
                  + Registrar consulta
                </button>
              </div>
            )}
            {history.map((h: any) => (
              <div key={h.id} className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="font-bold text-slate-800">{h.doctorName ?? 'Oftalmologista'}</div>
                    <div className="text-xs text-slate-400">
                      {h.consultDate ? new Date(h.consultDate).toLocaleDateString('pt-BR') : new Date(h.createdAt).toLocaleDateString('pt-BR')}
                      {h.clinic && ` · ${h.clinic}`}
                    </div>
                  </div>
                </div>
                <div className="flex justify-around mb-4">
                  <EyeDiagram axis={h.axisRight ?? null} label="OD" />
                  <EyeDiagram axis={h.axisLeft  ?? null} label="OE" />
                </div>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-blue-50 rounded-xl p-3">
                    <div className="text-[10px] text-slate-400 mb-1">Olho Direito</div>
                    <div className="font-bold text-slate-700 text-sm">
                      {h.sphericalRight != null ? (Number(h.sphericalRight) >= 0 ? `+${Number(h.sphericalRight).toFixed(2)}` : Number(h.sphericalRight).toFixed(2)) : '—'}
                      {' / '}
                      {h.cylinderRight != null ? (Number(h.cylinderRight) >= 0 ? `+${Number(h.cylinderRight).toFixed(2)}` : Number(h.cylinderRight).toFixed(2)) : '—'}
                      {h.axisRight != null ? ` x ${h.axisRight}°` : ''}
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-3">
                    <div className="text-[10px] text-slate-400 mb-1">Olho Esquerdo</div>
                    <div className="font-bold text-slate-700 text-sm">
                      {h.sphericalLeft != null ? (Number(h.sphericalLeft) >= 0 ? `+${Number(h.sphericalLeft).toFixed(2)}` : Number(h.sphericalLeft).toFixed(2)) : '—'}
                      {' / '}
                      {h.cylinderLeft != null ? (Number(h.cylinderLeft) >= 0 ? `+${Number(h.cylinderLeft).toFixed(2)}` : Number(h.cylinderLeft).toFixed(2)) : '—'}
                      {h.axisLeft != null ? ` x ${h.axisLeft}°` : ''}
                    </div>
                  </div>
                </div>
                {h.diagnoses?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-slate-100">
                    {h.diagnoses.map((d: string) => (
                      <span key={d} className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{d}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── NOVA CONSULTA ── */}
        {tab === 'novo' && (
          <div className="card p-6 space-y-5">
            <h2 className="font-bold text-slate-800">Registrar consulta com oftalmologista</h2>
            {saved && (
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 text-sm">
                Consulta salva com sucesso!
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Data da consulta</label>
                <input type="date" className="input-field" value={form.consultDate}
                  onChange={e => setForm(f => ({ ...f, consultDate: e.target.value }))} />
              </div>
              <div>
                <label className="label">Medico</label>
                <input className="input-field" placeholder="Nome do oftalmologista" value={form.doctorName}
                  onChange={e => setForm(f => ({ ...f, doctorName: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="label">Clinica / Hospital</label>
                <input className="input-field" placeholder="Nome da clinica" value={form.clinic}
                  onChange={e => setForm(f => ({ ...f, clinic: e.target.value }))} />
              </div>
            </div>

            {/* OD */}
            <div>
              <div className="font-semibold text-slate-700 text-sm mb-3">Olho Direito (OD)</div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Esfera', key: 'sphericalRight', placeholder: '-2.50' },
                  { label: 'Cilindro', key: 'cylinderRight', placeholder: '-0.75' },
                  { label: 'Eixo', key: 'axisRight', placeholder: '180' },
                  { label: 'Adicao', key: 'addRight', placeholder: '+1.75' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="label">{f.label}</label>
                    <input className="input-field" placeholder={f.placeholder}
                      value={(form as any)[f.key]}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
                  </div>
                ))}
              </div>
            </div>

            {/* OE */}
            <div>
              <div className="font-semibold text-slate-700 text-sm mb-3">Olho Esquerdo (OE)</div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Esfera', key: 'sphericalLeft', placeholder: '-2.50' },
                  { label: 'Cilindro', key: 'cylinderLeft', placeholder: '-0.75' },
                  { label: 'Eixo', key: 'axisLeft', placeholder: '175' },
                  { label: 'Adicao', key: 'addLeft', placeholder: '+1.75' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="label">{f.label}</label>
                    <input className="input-field" placeholder={f.placeholder}
                      value={(form as any)[f.key]}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
                  </div>
                ))}
              </div>
            </div>

            {/* Diagnósticos */}
            <div>
              <label className="label">Diagnosticos</label>
              <div className="flex flex-wrap gap-2">
                {DIAGNOSES_LIST.map(d => (
                  <button key={d} type="button" onClick={() => toggleDiag(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border
                      ${form.diagnoses.includes(d)
                        ? 'bg-[#7B1E1E] text-white border-[#7B1E1E]'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Observacoes do medico</label>
              <textarea className="input-field" rows={3} placeholder="Recomendacoes, proxima consulta, etc."
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setTab('home')} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={save} disabled={saving}
                className="flex-1 bg-[#7B1E1E] text-white font-semibold py-3 rounded-xl hover:bg-[#5f1616] transition-colors disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar consulta'}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
