'use client';
// apps/web/src/app/occupational-health/psychosocial-assessment/page.tsx
// Formulário de Triagem de Riscos Psicossociais (NR-01) + visualização do laudo — IcodLife
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AppLayout } from '../../../components/layout/AppLayout';
import { occupationalHealthApi } from '../../../lib/api';

interface Question { id: string; category: string; text: string; }
interface CategoryInfo { key: string; label: string; }
interface ScaleItem { value: number; label: string; }

const TIER_BADGE: Record<string, string> = {
  baixo: 'bg-green-100 text-green-700', moderado: 'bg-yellow-100 text-yellow-700',
  alto: 'bg-orange-100 text-orange-700', critico: 'bg-red-100 text-red-700',
};
const TIER_LABEL: Record<string, string> = {
  baixo: '🟢 Baixo', moderado: '🟡 Moderado', alto: '🟠 Alto', critico: '🔴 Crítico',
};

export default function PsychosocialAssessmentPage() {
  const router = useRouter();
  const params = useSearchParams();
  const viewId = params.get('view');

  const [step, setStep] = useState<'intro' | 'form' | 'result'>(viewId ? 'result' : 'intro');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [scale, setScale] = useState<ScaleItem[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [catIndex, setCatIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const [context, setContext] = useState({
    sector: '', role: '', workRegime: '', employmentType: '', weeklyOvertimeHours: '', consentGiven: false,
  });

  useEffect(() => {
    if (viewId) {
      occupationalHealthApi.getAssessment(viewId).then(res => { setResult(res.data); setLoading(false); })
        .catch(() => { setError('Não foi possível carregar esta avaliação.'); setLoading(false); });
      return;
    }
    occupationalHealthApi.getQuestionnaire().then(res => {
      setQuestions(res.data.questions);
      setCategories(res.data.categories);
      setScale(res.data.scale);
      setLoading(false);
    }).catch(() => { setError('Não foi possível carregar o questionário.'); setLoading(false); });
  }, [viewId]);

  const questionsByCategory = useMemo(() => {
    const map: Record<string, Question[]> = {};
    for (const q of questions) (map[q.category] ??= []).push(q);
    return map;
  }, [questions]);

  const currentCategory = categories[catIndex];
  const currentQuestions = currentCategory ? (questionsByCategory[currentCategory.key] ?? []) : [];
  const answeredCount = Object.keys(answers).length;
  const progressPct = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;

  function selectAnswer(qid: string, value: number) {
    setAnswers(prev => ({ ...prev, [qid]: value }));
  }

  function isCategoryComplete(catKey: string) {
    const qs = questionsByCategory[catKey] ?? [];
    return qs.every(q => answers[q.id] !== undefined);
  }

  async function handleSubmit() {
    if (!context.consentGiven) {
      setError('É necessário concordar com o uso dos dados (LGPD) para gerar o laudo.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        answers: Object.entries(answers).map(([questionId, value]) => ({ questionId, value })),
        sector: context.sector || undefined,
        role: context.role || undefined,
        workRegime: context.workRegime || undefined,
        employmentType: context.employmentType || undefined,
        weeklyOvertimeHours: context.weeklyOvertimeHours ? Number(context.weeklyOvertimeHours) : undefined,
        consentGiven: context.consentGiven,
      };
      const res = await occupationalHealthApi.createAssessment(payload);
      setResult(res.data);
      setStep('result');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Erro ao enviar avaliação. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <AppLayout><div className="p-8 text-center text-slate-400">Carregando…</div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-3xl mx-auto">

        {/* ── INTRO ── */}
        {step === 'intro' && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-3xl">🧠</span>
              <h1 className="text-2xl font-bold text-slate-800">Avaliação de Riscos Psicossociais</h1>
            </div>
            <p className="text-slate-500 text-sm mb-2">
              Triagem baseada na NR-01 (item 1.5.1.6.2 — Portaria MTE nº 1.419/2024) e em instrumentos validados
              (COPSOQ, JCQ/Karasek, ERI/Siegrist, MBI/Maslach). {questions.length || 54} perguntas em 9 dimensões.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
              📋 Responda com sinceridade pensando nas últimas 4 semanas de trabalho. Não há respostas certas ou
              erradas — o objetivo é identificar condições organizacionais que possam representar risco à saúde.
            </div>

            <div className="card p-5 space-y-3">
              <h3 className="font-bold text-slate-700 text-sm">Contexto ocupacional (opcional)</h3>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Setor / Departamento" value={context.sector}
                  onChange={e => setContext({ ...context, sector: e.target.value })}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Cargo / Função" value={context.role}
                  onChange={e => setContext({ ...context, role: e.target.value })}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                <select value={context.workRegime} onChange={e => setContext({ ...context, workRegime: e.target.value })}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Regime de trabalho</option>
                  <option value="presencial">Presencial</option>
                  <option value="remoto">Remoto</option>
                  <option value="hibrido">Híbrido</option>
                </select>
                <select value={context.employmentType} onChange={e => setContext({ ...context, employmentType: e.target.value })}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Vínculo</option>
                  <option value="clt">CLT</option>
                  <option value="pj">PJ</option>
                  <option value="terceirizado">Terceirizado</option>
                  <option value="estagio">Estágio</option>
                  <option value="outro">Outro</option>
                </select>
                <input type="number" min={0} max={60} placeholder="Horas extras / semana"
                  value={context.weeklyOvertimeHours}
                  onChange={e => setContext({ ...context, weeklyOvertimeHours: e.target.value })}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm col-span-2" />
              </div>
              <label className="flex items-start gap-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <input type="checkbox" checked={context.consentGiven}
                  onChange={e => setContext({ ...context, consentGiven: e.target.checked })}
                  className="mt-0.5" />
                Concordo com o uso dos meus dados de saúde (LGPD, art. 11) exclusivamente para gerar esta triagem
                ocupacional e alimentar, de forma agregada e anônima, o Programa de Gerenciamento de Riscos (PGR) da
                minha empresa.
              </label>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button onClick={() => setStep('form')}
              className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-colors">
              Iniciar avaliação →
            </button>
          </div>
        )}

        {/* ── FORM ── */}
        {step === 'form' && currentCategory && (
          <div className="space-y-5">
            {/* Progresso */}
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Dimensão {catIndex + 1}/{categories.length} · {currentCategory.label}</span>
                <span>{answeredCount}/{questions.length} respondidas</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 transition-all" style={{ width: `${progressPct}%` }} />
              </div>
            </div>

            <div className="space-y-4">
              {currentQuestions.map(q => (
                <div key={q.id} className="card p-4">
                  <p className="text-sm font-medium text-slate-700 mb-3">{q.text}</p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {scale.map(s => (
                      <button key={s.value} onClick={() => selectAnswer(q.id, s.value)}
                        className={`text-[11px] font-semibold py-2 rounded-lg transition-all
                          ${answers[q.id] === s.value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button disabled={catIndex === 0} onClick={() => setCatIndex(i => i - 1)}
                className="flex-1 border-2 border-slate-200 text-slate-600 font-semibold py-3 rounded-xl disabled:opacity-40">
                ← Anterior
              </button>
              {catIndex < categories.length - 1 ? (
                <button onClick={() => setCatIndex(i => i + 1)}
                  className="flex-1 bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700">
                  Próxima dimensão →
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={submitting}
                  className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 disabled:opacity-50">
                  {submitting ? 'Gerando laudo…' : 'Finalizar e gerar laudo ✓'}
                </button>
              )}
            </div>
            {error && <p className="text-red-600 text-sm text-center">{error}</p>}

            {/* Navegação rápida entre dimensões */}
            <div className="flex flex-wrap gap-1.5 justify-center pt-2">
              {categories.map((c, i) => (
                <button key={c.key} onClick={() => setCatIndex(i)}
                  className={`w-7 h-7 rounded-full text-[11px] font-bold flex items-center justify-center
                    ${i === catIndex ? 'bg-blue-600 text-white' : isCategoryComplete(c.key) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── RESULT / LAUDO ── */}
        {step === 'result' && result && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-slate-800">📄 Laudo de Triagem Psicossocial</h1>
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${TIER_BADGE[result.overallTier]}`}>
                {TIER_LABEL[result.overallTier]} · {Number(result.overallScore).toFixed(0)}/100
              </span>
            </div>

            <div className="card p-5">
              <h3 className="font-bold text-slate-700 text-sm mb-3">Resultado por dimensão (NR-01)</h3>
              <div className="space-y-2.5">
                {(result.categoryScores as any[]).map((c) => (
                  <div key={c.category}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-slate-600">{c.label}</span>
                      <span className={`font-semibold ${
                        c.tier === 'critico' ? 'text-red-600' : c.tier === 'alto' ? 'text-orange-600' :
                        c.tier === 'moderado' ? 'text-yellow-600' : 'text-green-600'}`}>
                        {c.score0to100}/100
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${
                        c.tier === 'critico' ? 'bg-red-500' : c.tier === 'alto' ? 'bg-orange-500' :
                        c.tier === 'moderado' ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${c.score0to100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <h3 className="font-bold text-slate-700 text-sm mb-2">📝 Laudo completo</h3>
              <pre className="whitespace-pre-wrap text-xs text-slate-600 leading-relaxed font-mono bg-slate-50 rounded-lg p-3">
                {result.laudo}
              </pre>
            </div>

            <div className="card p-5">
              <h3 className="font-bold text-slate-700 text-sm mb-2">✅ Recomendações</h3>
              <ul className="space-y-1.5">
                {(result.recommendations as string[]).map((r, i) => (
                  <li key={i} className="text-xs text-slate-600">{r}</li>
                ))}
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
              ⚠️ Esta triagem avalia a percepção sobre condições organizacionais do trabalho conforme a NR-01. Não
              constitui diagnóstico clínico individual. Encaminhe a casos de risco alto/crítico ao SESMT, médico do
              trabalho ou psicólogo organizacional.
            </div>

            <button onClick={() => router.push('/occupational-health')}
              className="w-full border-2 border-blue-200 text-blue-700 font-semibold py-3 rounded-xl hover:bg-blue-50">
              ← Voltar para Medicina do Trabalho
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
