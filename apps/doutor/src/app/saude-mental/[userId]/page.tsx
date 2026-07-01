'use client';
// apps/doutor/src/app/saude-mental/[userId]/page.tsx
// Visão do médico: avaliações de Saúde Mental de um paciente vinculado + laudo consolidado + revisão.
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import DoctorShell from '@/components/ui/DoctorShell';
import { api } from '@/lib/api';

interface Assessment {
  id: string; scaleCode: string; category: string;
  normalizedScore: number | null; severity: string | null;
  interpretation: string | null; createdAt: string;
  reviewedAt: string | null; flags?: any;
}
interface ConsolidatedItem {
  scaleCode: string; scaleName: string; categoryLabel: string;
  normalizedScore: number | null; severityLabel: string; color: string; createdAt: string; flags?: any;
}

const COLOR_BADGE: Record<string, string> = {
  green: 'bg-green-100 text-green-700', yellow: 'bg-yellow-100 text-yellow-700',
  orange: 'bg-orange-100 text-orange-700', red: 'bg-red-100 text-red-700',
};

export default function DoctorSaudeMentalPage() {
  const { userId } = useParams<{ userId: string }>();
  const [items, setItems] = useState<Assessment[]>([]);
  const [consolidated, setConsolidated] = useState<{ items: ConsolidatedItem[]; laudo: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/mental-health/patients/${userId}/assessments`)
      .then(r => { setItems(r.data.items ?? []); setConsolidated(r.data.consolidated ?? null); })
      .catch(e => setErr(e?.response?.data?.message ?? 'Não foi possível carregar as avaliações.'))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const review = (id: string) => {
    const notes = prompt('Observações da revisão (opcional):') ?? undefined;
    setReviewing(id);
    api.post(`/mental-health/assessments/${id}/review`, { notes })
      .then(() => load())
      .catch(e => alert(e?.response?.data?.message ?? 'Erro ao revisar.'))
      .finally(() => setReviewing(null));
  };

  return (
    <DoctorShell>
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <Link href="/patients" className="text-sm text-blue-600">← Meus Pacientes</Link>
        <h1 className="text-2xl font-bold text-slate-800 mt-3 mb-1">🧠 Saúde Mental do Paciente</h1>
        <p className="text-slate-500 text-sm mb-6">Rastreios aplicados e laudo consolidado. Rastreio — não substitui avaliação clínica.</p>

        {loading && <p className="text-slate-400 text-sm">Carregando…</p>}
        {err && <p className="text-red-600 text-sm">{err}</p>}

        {!loading && !err && (
          <>
            {consolidated && consolidated.items.length > 0 && (
              <div className="mb-6">
                <div className="grid sm:grid-cols-2 gap-3 mb-3">
                  {consolidated.items.map(i => (
                    <div key={i.scaleCode} className="bg-white rounded-xl border border-slate-100 p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-400">{i.categoryLabel}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${COLOR_BADGE[i.color] ?? 'bg-slate-100 text-slate-600'}`}>
                          {i.severityLabel}
                        </span>
                      </div>
                      <div className="font-bold text-slate-800">{i.scaleName}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        {i.normalizedScore != null ? `${i.normalizedScore}/100` : '—'} · {new Date(i.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  ))}
                </div>
                <details className="bg-white rounded-xl border border-slate-100 p-4">
                  <summary className="font-bold text-slate-700 cursor-pointer text-sm">🗂️ Laudo consolidado</summary>
                  <pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans leading-relaxed mt-3">{consolidated.laudo}</pre>
                </details>
              </div>
            )}

            <h2 className="text-sm font-bold text-slate-600 mb-2">Histórico de avaliações</h2>
            {items.filter(a => a.scaleCode !== 'CONSOLIDATED').length === 0 && (
              <p className="text-slate-400 text-sm">Este paciente ainda não realizou rastreios.</p>
            )}
            <div className="space-y-2">
              {items.filter(a => a.scaleCode !== 'CONSOLIDATED').map(a => (
                <div key={a.id} className="bg-white rounded-xl border border-slate-100">
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {a.flags?.suicideRisk && <span className="text-red-600 text-lg" title="Alerta de segurança">⚠️</span>}
                      <div>
                        <div className="font-semibold text-slate-800">{a.scaleCode}</div>
                        <div className="text-xs text-slate-400">{new Date(a.createdAt).toLocaleString('pt-BR')}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {a.normalizedScore != null && <span className="text-sm font-bold text-slate-600">{a.normalizedScore}/100</span>}
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${COLOR_BADGE[a.flags?.color] ?? 'bg-slate-100 text-slate-600'}`}>
                        {a.flags?.severityLabel ?? a.severity ?? '—'}
                      </span>
                      <button onClick={() => setOpen(open === a.id ? null : a.id)} className="text-xs text-blue-600 hover:underline">
                        {open === a.id ? 'Ocultar' : 'Ver laudo'}
                      </button>
                    </div>
                  </div>
                  {open === a.id && (
                    <div className="border-t border-slate-100 p-4">
                      <pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">{a.interpretation}</pre>
                      <div className="mt-3 flex items-center gap-3">
                        {a.reviewedAt
                          ? <span className="text-xs text-green-600 font-semibold">✓ Revisado em {new Date(a.reviewedAt).toLocaleDateString('pt-BR')}</span>
                          : <button onClick={() => review(a.id)} disabled={reviewing === a.id}
                              className="text-xs font-semibold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-40">
                              {reviewing === a.id ? 'Salvando…' : 'Revisar / validar'}
                            </button>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </DoctorShell>
  );
}
