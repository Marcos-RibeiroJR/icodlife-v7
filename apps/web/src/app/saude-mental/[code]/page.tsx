'use client';
// apps/web/src/app/saude-mental/[code]/page.tsx
// Responder uma escala e receber o laudo individual (com fluxo de segurança).
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '../../../components/layout/AppLayout';
import { mentalHealthApi } from '../../../lib/api';

interface Question { id: string; text: string; isSafetyItem?: boolean; }
interface Option { value: number; label: string; }
interface Questionnaire {
  code: string; name: string; shortName: string; categoryLabel: string;
  instructions: string; timeframe: string; attribution: string; disclaimer: string;
  options: Option[]; questions: Question[];
}
interface Resource { name: string; contact: string; description: string; }
interface Result {
  rawScore: number; rawMax: number; normalizedScore: number;
  severityLabel: string; color: string; interpretation: string;
  subscores?: { label: string; normalizedScore: number; severityLabel: string; color: string }[];
}
interface Safety { suicideRisk: boolean; crisisRisk: boolean; message?: string; resources: Resource[]; }

const COLOR_TEXT: Record<string, string> = {
  green: 'text-green-700', yellow: 'text-yellow-700', orange: 'text-orange-700', red: 'text-red-700',
};
const COLOR_BG: Record<string, string> = {
  green: 'bg-green-50 border-green-200', yellow: 'bg-yellow-50 border-yellow-200',
  orange: 'bg-orange-50 border-orange-200', red: 'bg-red-50 border-red-200',
};

export default function ResponderEscalaPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [q, setQ] = useState<Questionnaire | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ result: Result; safety: Safety; laudo: string } | null>(null);

  useEffect(() => {
    mentalHealthApi.getQuestionnaire(code)
      .then(r => setQ(r.data))
      .catch(() => setError('Não foi possível carregar o questionário.'));
  }, [code]);

  const answeredCount = q ? q.questions.filter(x => answers[x.id] !== undefined).length : 0;
  const allAnswered = q ? answeredCount === q.questions.length : false;

  const submit = () => {
    if (!q || !allAnswered) return;
    setSubmitting(true); setError(null);
    mentalHealthApi.submit(code, {
      answers: q.questions.map(x => ({ questionId: x.id, value: answers[x.id] })),
      appliedBy: 'self',
      consentGiven: consent,
    })
      .then(r => setResult({ result: r.data.result, safety: r.data.safety, laudo: r.data.assessment?.interpretation ?? '' }))
      .catch(e => setError(e?.response?.data?.message ?? 'Erro ao enviar as respostas.'))
      .finally(() => setSubmitting(false));
  };

  if (error && !q) return <AppLayout><div className="p-8 max-w-2xl mx-auto text-slate-500">{error}</div></AppLayout>;
  if (!q) return <AppLayout><div className="p-8 max-w-2xl mx-auto text-slate-400">Carregando…</div></AppLayout>;

  // ── Resultado ──
  if (result) {
    const { result: res, safety } = result;
    return (
      <AppLayout>
        <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-4">
          <Link href="/saude-mental" className="text-sm text-indigo-600">← Voltar</Link>

          {(safety.suicideRisk || safety.crisisRisk) && (
            <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-5">
              <h2 className="font-bold text-red-800 mb-2 flex items-center gap-2">⚠️ Apoio disponível agora</h2>
              <p className="text-sm text-red-700 mb-3">{safety.message}</p>
              <div className="space-y-2">
                {safety.resources.map(r => (
                  <div key={r.name} className="bg-white rounded-lg p-3 text-sm">
                    <span className="font-bold text-red-700">{r.name} — {r.contact}</span>
                    <p className="text-slate-500 text-xs">{r.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={`rounded-2xl border p-5 ${COLOR_BG[res.color] ?? 'bg-slate-50 border-slate-200'}`}>
            <div className="text-xs text-slate-500">{q.shortName} · {q.categoryLabel}</div>
            <div className={`text-2xl font-bold ${COLOR_TEXT[res.color] ?? 'text-slate-700'}`}>{res.severityLabel}</div>
            <div className="text-sm text-slate-500 mt-1">Escore: {res.rawScore}/{res.rawMax} · {res.normalizedScore}/100</div>
            <p className="text-sm text-slate-600 mt-3">{res.interpretation}</p>
            {res.subscores && res.subscores.length > 0 && (
              <div className="mt-3 space-y-1">
                {res.subscores.map(s => (
                  <div key={s.label} className="text-sm flex justify-between">
                    <span className="text-slate-600">{s.label}</span>
                    <span className={`font-semibold ${COLOR_TEXT[s.color] ?? ''}`}>{s.severityLabel} ({s.normalizedScore}/100)</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-5">
            <h3 className="font-bold text-slate-700 mb-2">Laudo</h3>
            <pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">{result.laudo}</pre>
          </div>

          <button onClick={() => router.push('/saude-mental')}
            className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700">
            Concluir
          </button>
        </div>
      </AppLayout>
    );
  }

  // ── Formulário ──
  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-2xl mx-auto">
        <Link href="/saude-mental" className="text-sm text-indigo-600">← Voltar</Link>
        <div className="mt-3 mb-5">
          <h1 className="text-xl font-bold text-slate-800">{q.name}</h1>
          <p className="text-sm text-slate-500 mt-1">{q.instructions}</p>
        </div>

        <div className="space-y-4">
          {q.questions.map((item, idx) => (
            <div key={item.id} className="card p-4">
              <div className="text-sm font-medium text-slate-700 mb-3">
                <span className="text-slate-400 mr-1">{idx + 1}.</span>{item.text}
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {q.options.map(opt => (
                  <button key={opt.value}
                    onClick={() => setAnswers(a => ({ ...a, [item.id]: opt.value }))}
                    className={`text-left text-sm px-3 py-2 rounded-lg border transition-all
                      ${answers[item.id] === opt.value
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <label className="flex items-start gap-2 mt-5 text-xs text-slate-500">
          <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5" />
          <span>Autorizo o registro deste rastreio no meu prontuário (dado sensível de saúde — LGPD).</span>
        </label>

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

        <div className="sticky bottom-4 mt-5">
          <button onClick={submit} disabled={!allAnswered || submitting}
            className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg">
            {submitting ? 'Enviando…' : `Ver resultado (${answeredCount}/${q.questions.length})`}
          </button>
        </div>

        <p className="text-[11px] text-slate-400 mt-4">{q.attribution}</p>
        <p className="text-[11px] text-slate-400 mt-1">{q.disclaimer}</p>
      </div>
    </AppLayout>
  );
}
