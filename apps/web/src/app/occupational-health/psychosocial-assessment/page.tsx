'use client';
// apps/web/src/app/occupational-health/psychosocial-assessment/page.tsx
import { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AppLayout } from '../../../components/layout/AppLayout';
import { occupationalHealthApi } from '../../../lib/api';

const TIER_BADGE: Record<string, string> = {
  baixo: 'bg-green-100 text-green-700', moderado: 'bg-yellow-100 text-yellow-700',
  alto: 'bg-orange-100 text-orange-700', critico: 'bg-red-100 text-red-700',
};
const TIER_LABEL: Record<string, string> = {
  baixo: '🟢 Risco Baixo', moderado: '🟡 Risco Moderado', alto: '🟠 Risco Alto', critico: '🔴 Risco Critico',
};

const TIER_HEX: Record<string, string> = {
  critico: '#dc2626', alto: '#ea580c', moderado: '#d97706', baixo: '#16a34a',
};

function ScoreBar({ score, tier }: { score: number; tier: string }) {
  const color = TIER_HEX[tier] ?? TIER_HEX.baixo;
  return (
    <div className="w-full bg-slate-100 rounded-full h-2 mt-1">
      <div className="h-2 rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: color }} />
    </div>
  );
}

/** Tendência das respostas de uma dimensão na escala Likert (0–4) — "mini-gráfico" por item avaliado. */
function LikertDistributionChart({ distribution }: { distribution: { value: number; label: string; count: number; pct: number }[] }) {
  if (!distribution?.length) return null;
  return (
    <div className="space-y-1.5 mt-3">
      {distribution.map((b) => (
        <div key={b.value} className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 w-24 flex-shrink-0 text-right">{b.label}</span>
          <div className="flex-1 bg-slate-100 rounded-full h-2.5">
            <div className="h-2.5 rounded-full bg-indigo-500 transition-all" style={{ width: `${Math.max(b.pct, b.pct > 0 ? 2 : 0)}%` }} />
          </div>
          <span className="text-[10px] text-slate-500 w-9 flex-shrink-0">{b.pct}%</span>
        </div>
      ))}
    </div>
  );
}

/** Gráfico final consolidado: proporção das 9 dimensões em cada nível de risco (substitui o antigo gráfico único global). */
function TierProportionBar({ tierDistribution }: { tierDistribution: { tier: string; label: string; count: number; pct: number }[] }) {
  if (!tierDistribution?.length) return null;
  const nonZero = tierDistribution.filter(t => t.count > 0);
  return (
    <div>
      <div className="w-full h-5 rounded-full overflow-hidden flex bg-slate-100">
        {nonZero.map((t) => (
          <div key={t.tier} style={{ width: `${t.pct}%`, backgroundColor: TIER_HEX[t.tier] ?? '#94a3b8' }} title={`${t.label}: ${t.count}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-3 mt-2">
        {tierDistribution.map((t) => (
          <div key={t.tier} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TIER_HEX[t.tier] ?? '#94a3b8' }} />
            {t.label.replace(/🟢|🟡|🟠|🔴/g, '').trim()}: {t.count} dimensão(ões) — {t.pct}%
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PsychosocialAssessmentPage() {
  return (
    <Suspense fallback={<AppLayout><div className="p-8 text-center text-slate-400 py-20">Carregando...</div></AppLayout>}>
      <PsychosocialAssessmentContent />
    </Suspense>
  );
}

function PsychosocialAssessmentContent() {
  const router = useRouter();
  const params = useSearchParams();
  const viewId = params.get('view');

  const [step, setStep] = useState<'intro'|'form'|'result'>(viewId ? 'result' : 'intro');
  const [questions, setQuestions]   = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [scale, setScale]           = useState<any[]>([]);
  const [answers, setAnswers]       = useState<Record<string, number>>({});
  const [catIndex, setCatIndex]     = useState(0);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');
  const [result, setResult]         = useState<any>(null);
  const [sharingBusy, setSharingBusy] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const [context, setContext] = useState({
    sector: '', role: '', workRegime: '', employmentType: '',
    weeklyOvertimeHours: '', consentGiven: false,
  });

  useEffect(() => {
    if (viewId) {
      occupationalHealthApi.getAssessment(viewId)
        .then(res => { setResult(res.data); setLoading(false); })
        .catch(() => { setError('Nao foi possivel carregar esta avaliacao.'); setLoading(false); });
      return;
    }
    occupationalHealthApi.getQuestionnaire().then(res => {
      setQuestions(res.data.questions ?? []);
      setCategories(res.data.categories ?? []);
      setScale(res.data.scale ?? []);
      setLoading(false);
    }).catch(() => { setError('Nao foi possivel carregar o questionario.'); setLoading(false); });
  }, [viewId]);

  const questionsByCategory = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const q of questions) (map[q.category] ??= []).push(q);
    return map;
  }, [questions]);

  const currentCategory  = categories[catIndex];
  const currentQuestions = currentCategory ? (questionsByCategory[currentCategory.key] ?? []) : [];
  const answeredCount    = Object.keys(answers).length;
  const progressPct      = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;
  const minRequired      = Math.ceil(questions.length * 0.7);

  function selectAnswer(qid: string, value: number) {
    setAnswers(prev => ({ ...prev, [qid]: value }));
  }

  function isCategoryComplete(catKey: string) {
    return (questionsByCategory[catKey] ?? []).every(q => answers[q.id] !== undefined);
  }

  function nextCategory() {
    if (catIndex < categories.length - 1) setCatIndex(c => c + 1);
    else setStep('result'); // vai para preview antes de submeter
  }

  async function handleSubmit() {
    if (!context.consentGiven) {
      setError('E necessario concordar com o uso dos dados (LGPD) para gerar o laudo.');
      return;
    }
    if (answeredCount < minRequired) {
      setError(`Questionario incompleto: ${answeredCount}/${questions.length} respondidas. Minimo: ${minRequired}.`);
      return;
    }
    setSubmitting(true); setError('');
    try {
      const payload = {
        // Garante que value e sempre inteiro
        answers: Object.entries(answers).map(([questionId, value]) => ({ questionId, value: Number(value) })),
        sector:               context.sector             || undefined,
        role:                 context.role               || undefined,
        workRegime:           context.workRegime         || undefined,
        employmentType:       context.employmentType     || undefined,
        weeklyOvertimeHours:  context.weeklyOvertimeHours ? Number(context.weeklyOvertimeHours) : undefined,
        consentGiven:         context.consentGiven,
      };
      const res = await occupationalHealthApi.createAssessment(payload);
      setResult(res.data);
      setStep('result');
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'Erro ao enviar avaliacao. Tente novamente.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleSharing(next: boolean) {
    if (!result?.id) return;
    setSharingBusy(true);
    try {
      const res = await occupationalHealthApi.setSharing(result.id, next);
      setResult(res.data);
    } catch {
      setError('Não foi possível atualizar o compartilhamento. Tente novamente.');
    } finally {
      setSharingBusy(false);
    }
  }

  async function downloadPdf() {
    if (!result?.id) return;
    setDownloadingPdf(true);
    try {
      const blob = await occupationalHealthApi.getLaudo(result.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `laudo-psicossocial-${String(result.id).slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('Não foi possível gerar o PDF do laudo. Tente novamente.');
    } finally {
      setDownloadingPdf(false);
    }
  }

  if (loading) {
    return <AppLayout><div className="p-8 text-center text-slate-400 py-20">Carregando...</div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="bg-[#7B1E1E] px-8 py-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-white text-xl font-bold">Avaliacao de Riscos Psicossociais (NR-01)</h1>
            <p className="text-white/55 text-sm mt-0.5">
              {step === 'form' ? `Progresso: ${progressPct}% — ${answeredCount}/${questions.length} respondidas` :
               step === 'result' ? (result ? 'Laudo gerado' : 'Confirme e envie') : `${questions.length || 54} perguntas em ${categories.length || 9} dimensoes`}
            </p>
          </div>
          {step === 'form' && (
            <div className="bg-white/10 rounded-xl px-4 py-2 text-white text-sm font-bold">
              {progressPct}%
            </div>
          )}
        </div>
        {/* Barra de progresso */}
        {step === 'form' && (
          <div className="max-w-3xl mx-auto mt-3">
            <div className="bg-white/20 rounded-full h-1.5">
              <div className="bg-white h-1.5 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="p-6 md:p-8 max-w-3xl mx-auto">

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-5 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* ── INTRO ── */}
        {step === 'intro' && (
          <div className="space-y-5">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
              Responda pensando nas ultimas 4 semanas de trabalho. {questions.length || 54} perguntas em {categories.length || 9} dimensoes.
              Minimo de 70% respondidas para gerar o laudo.
            </div>

            {/* Contexto */}
            <div className="card p-5 space-y-4">
              <h3 className="font-bold text-slate-700">Contexto ocupacional (opcional)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Setor / Departamento</label>
                  <input className="input-field" placeholder="Ex: TI, RH, Producao"
                    value={context.sector} onChange={e => setContext(c => ({ ...c, sector: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Cargo</label>
                  <input className="input-field" placeholder="Ex: Analista, Gerente"
                    value={context.role} onChange={e => setContext(c => ({ ...c, role: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Regime de trabalho</label>
                  <select className="input-field" value={context.workRegime}
                    onChange={e => setContext(c => ({ ...c, workRegime: e.target.value }))}>
                    <option value="">Selecione...</option>
                    <option value="presencial">Presencial</option>
                    <option value="remoto">Remoto</option>
                    <option value="hibrido">Hibrido</option>
                  </select>
                </div>
                <div>
                  <label className="label">Vinculo</label>
                  <select className="input-field" value={context.employmentType}
                    onChange={e => setContext(c => ({ ...c, employmentType: e.target.value }))}>
                    <option value="">Selecione...</option>
                    <option value="clt">CLT</option>
                    <option value="pj">PJ</option>
                    <option value="terceirizado">Terceirizado</option>
                    <option value="estagio">Estagio</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="label">Horas extras semanais (aprox.)</label>
                  <input type="number" min="0" max="60" className="input-field" placeholder="0"
                    value={context.weeklyOvertimeHours}
                    onChange={e => setContext(c => ({ ...c, weeklyOvertimeHours: e.target.value }))} />
                </div>
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer card p-4">
              <input type="checkbox" className="mt-0.5 w-4 h-4 accent-red-700"
                checked={context.consentGiven}
                onChange={e => setContext(c => ({ ...c, consentGiven: e.target.checked }))} />
              <span className="text-sm text-slate-600">
                <strong>Consentimento LGPD:</strong> Autorizo o armazenamento e processamento das minhas respostas para fins de avaliacao de saude ocupacional, de acordo com a LGPD (Lei 13.709/2018).
              </span>
            </label>

            <button onClick={() => { setStep('form'); setCatIndex(0); }}
              disabled={!context.consentGiven}
              className="w-full bg-[#7B1E1E] text-white font-bold py-4 rounded-xl hover:bg-[#5f1616] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base">
              Iniciar avaliacao →
            </button>
          </div>
        )}

        {/* ── FORMULÁRIO ── */}
        {step === 'form' && currentCategory && (
          <div className="space-y-5">
            {/* Seletor de categorias */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map((cat, i) => (
                <button key={cat.key} onClick={() => setCatIndex(i)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border
                    ${catIndex === i
                      ? 'bg-[#7B1E1E] text-white border-[#7B1E1E]'
                      : isCategoryComplete(cat.key)
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                  {isCategoryComplete(cat.key) ? '✓ ' : ''}{i + 1}
                </button>
              ))}
            </div>

            {/* Categoria atual */}
            <div className="card p-5">
              <h3 className="font-bold text-slate-800 mb-1">{currentCategory.label}</h3>
              <div className="text-xs text-slate-400 mb-5">{currentQuestions.length} perguntas nesta dimensao</div>

              <div className="space-y-6">
                {currentQuestions.map((q: any, qi: number) => (
                  <div key={q.id}>
                    <p className="text-sm text-slate-700 font-medium mb-3">
                      <span className="text-slate-400 text-xs mr-1">{qi + 1}.</span>
                      {q.text}
                    </p>
                    <div className="grid grid-cols-5 gap-2">
                      {scale.map((s: any) => (
                        <button key={s.value} type="button"
                          onClick={() => selectAnswer(q.id, s.value)}
                          className={`py-2 px-1 rounded-lg text-xs font-semibold border transition-all text-center
                            ${answers[q.id] === s.value
                              ? 'bg-[#7B1E1E] text-white border-[#7B1E1E]'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                          <div className="text-base mb-0.5">{s.value}</div>
                          <div className="leading-tight text-[10px] opacity-70">{s.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navegacao */}
            <div className="flex gap-3">
              {catIndex > 0 && (
                <button onClick={() => setCatIndex(c => c - 1)} className="btn-secondary flex-1">
                  ← Anterior
                </button>
              )}
              <button onClick={nextCategory}
                className="flex-1 bg-[#7B1E1E] text-white font-semibold py-3 rounded-xl hover:bg-[#5f1616] transition-colors">
                {catIndex < categories.length - 1 ? 'Proxima dimensao →' : 'Revisar e finalizar →'}
              </button>
            </div>

            {/* Progresso detalhado */}
            <div className="text-xs text-slate-400 text-center">
              {answeredCount} de {questions.length} respondidas · Minimo para gerar laudo: {minRequired}
            </div>
          </div>
        )}

        {/* ── RESULTADO / CONFIRMAÇÃO ── */}
        {step === 'result' && (
          <div className="space-y-5">

            {/* Se ainda não submeteu (preview) */}
            {!result && (
              <div className="card p-6 space-y-4">
                <h2 className="font-bold text-slate-800">Confirmar envio</h2>
                <div className="text-sm text-slate-600">
                  <strong>{answeredCount}</strong> de <strong>{questions.length}</strong> perguntas respondidas ({progressPct}%).
                  {answeredCount < minRequired
                    ? ` ⚠️ Abaixo do minimo (${minRequired}). Volte e responda mais perguntas.`
                    : ' ✅ Suficiente para gerar o laudo.'}
                </div>
                {/* Resumo por dimensão */}
                <div className="space-y-2">
                  {categories.map((cat: any) => {
                    const done = (questionsByCategory[cat.key] ?? []).filter((q: any) => answers[q.id] !== undefined).length;
                    const total = (questionsByCategory[cat.key] ?? []).length;
                    const pct = total ? Math.round((done / total) * 100) : 0;
                    return (
                      <div key={cat.key} className="flex items-center gap-3">
                        <span className="text-xs w-4 text-center">{done === total ? '✅' : done > 0 ? '🟡' : '⬜'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-slate-600 truncate">{cat.label}</div>
                          <div className="bg-slate-100 rounded-full h-1.5 mt-1">
                            <div className="h-1.5 rounded-full bg-[#7B1E1E] transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <span className="text-xs text-slate-400 flex-shrink-0">{done}/{total}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setStep('form')} className="btn-secondary flex-1">
                    ← Voltar e responder
                  </button>
                  <button onClick={handleSubmit} disabled={submitting || answeredCount < minRequired}
                    className="flex-1 bg-[#7B1E1E] text-white font-bold py-3 rounded-xl hover:bg-[#5f1616] transition-colors disabled:opacity-50">
                    {submitting ? 'Gerando laudo...' : 'Gerar laudo →'}
                  </button>
                </div>
              </div>
            )}

            {/* Laudo completo */}
            {result && (
              <div className="space-y-5">
                {/* Titulo */}
                <div className={`rounded-2xl p-6 border ${
                  result.overallTier === 'critico' ? 'bg-red-50 border-red-200' :
                  result.overallTier === 'alto'    ? 'bg-orange-50 border-orange-200' :
                  result.overallTier === 'moderado'? 'bg-amber-50 border-amber-200' :
                  'bg-green-50 border-green-200'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-500 mb-1">Laudo de Avaliacao Psicossocial (NR-01)</div>
                      <div className="text-3xl font-bold text-slate-800 mb-1">
                        {result.overallScore ?? result.overallScore}/100
                      </div>
                      <span className={`inline-block text-sm font-bold px-3 py-1 rounded-full ${TIER_BADGE[result.overallTier]}`}>
                        {TIER_LABEL[result.overallTier]}
                      </span>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      {result.sector && <div>Setor: {result.sector}</div>}
                      {result.role && <div>Cargo: {result.role}</div>}
                      <div>{new Date(result.createdAt ?? Date.now()).toLocaleDateString('pt-BR')}</div>
                    </div>
                  </div>
                </div>

                {/* Compartilhamento com médico/clínica + download do PDF */}
                <div className="card p-5 space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" className="mt-0.5 w-4 h-4 accent-[#7B1E1E]"
                      checked={!!result.sharedWithDoctor} disabled={sharingBusy}
                      onChange={e => toggleSharing(e.target.checked)} />
                    <span className="text-sm text-slate-600">
                      <strong>Compartilhar com meu médico/clínica:</strong> autorizo que este laudo apareça no ASO e
                      seja visto pelo médico do trabalho responsável. Consentimento específico (LGPD), independente
                      do consentimento de armazenamento — pode ser desativado a qualquer momento.
                    </span>
                  </label>
                  <button onClick={downloadPdf} disabled={downloadingPdf}
                    className="w-full border-2 border-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 text-sm">
                    {downloadingPdf ? 'Gerando PDF...' : '📄 Baixar laudo em PDF'}
                  </button>
                </div>

                {/* Scores por dominio + tendência das respostas por item avaliado */}
                {(result.categoryScores ?? result.categories)?.length > 0 && (
                  <div className="card p-5">
                    <h3 className="font-bold text-slate-800 mb-1">Scores por dimensao (NR-01)</h3>
                    <p className="text-xs text-slate-400 mb-4">
                      Cada dimensão traz um mini-gráfico com a tendência das respostas na escala (Nunca → Sempre) e um pré-laudo.
                    </p>
                    <div className="space-y-5">
                      {(result.categoryScores ?? result.categories).map((cat: any) => (
                        <div key={cat.category ?? cat.key} className="pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-slate-700 font-medium">{cat.label}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-800">{cat.score0to100}/100</span>
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TIER_BADGE[cat.tier]}`}>
                                {TIER_LABEL[cat.tier]?.replace(/🟢|🟡|🟠|🔴/g,'').trim()}
                              </span>
                            </div>
                          </div>
                          <ScoreBar score={cat.score0to100} tier={cat.tier} />
                          {cat.nrReference && (
                            <div className="text-[10px] text-slate-400 mt-0.5">{cat.nrReference}</div>
                          )}
                          {cat.distribution && <LikertDistributionChart distribution={cat.distribution} />}
                          {cat.miniLaudo && (
                            <p className="text-xs text-slate-500 mt-2 leading-relaxed italic">{cat.miniLaudo}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gráfico final consolidado — substitui a antiga referência global única */}
                {result.overallChart?.tierDistribution && (
                  <div className="card p-5">
                    <h3 className="font-bold text-slate-800 mb-1">Gráfico Final Consolidado</h3>
                    <p className="text-xs text-slate-400 mb-4">
                      Proporção das 9 dimensões em cada nível de risco, embasada nos pré-laudos individuais acima.
                    </p>
                    <TierProportionBar tierDistribution={result.overallChart.tierDistribution} />
                  </div>
                )}

                {/* Top riscos */}
                {result.topRisks?.length > 0 && (
                  <div className="card p-5">
                    <h3 className="font-bold text-slate-800 mb-3">Principais riscos identificados</h3>
                    <div className="flex flex-wrap gap-2">
                      {result.topRisks.map((r: string) => (
                        <span key={r} className="bg-red-50 text-red-700 text-sm px-3 py-1 rounded-full font-medium">{r}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recomendacoes */}
                {result.recommendations?.length > 0 && (
                  <div className="card p-5">
                    <h3 className="font-bold text-slate-800 mb-3">Recomendacoes</h3>
                    <div className="space-y-2">
                      {result.recommendations.map((rec: string, i: number) => (
                        <div key={i} className="flex gap-3 p-3 bg-slate-50 rounded-xl">
                          <span className="flex-shrink-0 mt-0.5">💡</span>
                          <p className="text-sm text-slate-700 leading-relaxed">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Laudo narrativo */}
                {result.laudo && (
                  <div className="card p-5">
                    <h3 className="font-bold text-slate-800 mb-3">Laudo Narrativo Completo</h3>
                    <pre className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed font-sans">{result.laudo}</pre>
                  </div>
                )}

                {/* Disclaimer */}
                {result.disclaimer && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-700">
                    {result.disclaimer}
                  </div>
                )}

                <button onClick={() => router.push('/occupational-health')}
                  className="w-full border-2 border-slate-200 text-slate-600 font-semibold py-3 rounded-xl hover:bg-slate-50 transition-colors">
                  ← Voltar para Medicina do Trabalho
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
