'use client';
// apps/web/src/app/saude-mental/resultado/[id]/page.tsx
// Detalhe de um resultado armazenado (laudo individual).
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '../../../../components/layout/AppLayout';
import { mentalHealthApi } from '../../../../lib/api';

interface Assessment {
  id: string; scaleCode: string; category: string;
  normalizedScore: number | null; rawScore: number | null;
  severity: string | null; interpretation: string | null;
  createdAt: string; flags?: any;
}

const COLOR_BG: Record<string, string> = {
  green: 'bg-green-50 border-green-200', yellow: 'bg-yellow-50 border-yellow-200',
  orange: 'bg-orange-50 border-orange-200', red: 'bg-red-50 border-red-200',
};

export default function ResultadoPage() {
  const { id } = useParams<{ id: string }>();
  const [a, setA] = useState<Assessment | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    mentalHealthApi.getAssessment(id).then(r => setA(r.data)).catch(() => setErr(true));
  }, [id]);

  if (err) return <AppLayout><div className="p-8 max-w-2xl mx-auto text-slate-500">Resultado não encontrado.</div></AppLayout>;
  if (!a) return <AppLayout><div className="p-8 max-w-2xl mx-auto text-slate-400">Carregando…</div></AppLayout>;

  const color = a.flags?.suicideRisk ? 'red' : (a.flags?.color ?? 'yellow');

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-4">
        <Link href="/saude-mental" className="text-sm text-indigo-600">← Voltar</Link>

        <div className={`rounded-2xl border p-5 ${COLOR_BG[color] ?? 'bg-slate-50 border-slate-200'}`}>
          <div className="text-xs text-slate-500">{a.scaleCode} · {new Date(a.createdAt).toLocaleString('pt-BR')}</div>
          <div className="text-2xl font-bold text-slate-800">{a.flags?.severityLabel ?? a.severity ?? '—'}</div>
          {a.normalizedScore != null && <div className="text-sm text-slate-500 mt-1">{a.normalizedScore}/100</div>}
        </div>

        <div className="card p-5">
          <h3 className="font-bold text-slate-700 mb-2">Laudo</h3>
          <pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">{a.interpretation}</pre>
        </div>
      </div>
    </AppLayout>
  );
}
