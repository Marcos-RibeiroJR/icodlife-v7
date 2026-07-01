'use client';
// apps/web/src/app/saude-mental/page.tsx
// Submódulo Saúde Mental (paciente) — catálogo de escalas, histórico e laudo consolidado.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '../../components/layout/AppLayout';
import { mentalHealthApi } from '../../lib/api';

interface ScaleInfo {
  code: string; name: string; shortName: string;
  category: string; categoryLabel: string;
  license: string; itemCount: number; timeframe: string; detects: string[];
}
interface Assessment {
  id: string; scaleCode: string; category: string;
  normalizedScore: number | null; severity: string | null;
  createdAt: string; flags?: any;
}
interface ConsolidatedItem {
  scaleCode: string; scaleName: string; categoryLabel: string;
  normalizedScore: number | null; severityLabel: string; color: string;
  createdAt: string; flags?: any;
}

const COLOR_BADGE: Record<string, string> = {
  green:  'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  orange: 'bg-orange-100 text-orange-700',
  red:    'bg-red-100 text-red-700',
};
const CAT_ICON: Record<string, string> = {
  ansiedade: '😰', depressao: '🌧️', burnout: '🔥', estresse: '⚡', sono: '😴', bem_estar: '🌱',
};

export default function SaudeMentalPage() {
  const [tab, setTab] = useState<'testes' | 'historico' | 'consolidado'>('testes');
  const [byCategory, setByCategory] = useState<Record<string, ScaleInfo[]>>({});
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [consolidated, setConsolidated] = useState<{ items: ConsolidatedItem[]; laudo: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      mentalHealthApi.listScales().then(r => setByCategory(r.data.byCategory ?? {})).catch(() => {}),
      mentalHealthApi.listAssessments().then(r => setAssessments(r.data ?? [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const loadConsolidated = () => {
    setConsolidated(null);
    mentalHealthApi.consolidated().then(r => setConsolidated(r.data)).catch(() => setConsolidated({ items: [], laudo: '' }));
  };

  const shortNameOf = (code: string) =>
    Object.values(byCategory).flat().find(s => s.code === code)?.shortName ?? code;

  const TABS = [
    { id: 'testes',      label: '🧩 Testes' },
    { id: 'historico',   label: '📋 Histórico' },
    { id: 'consolidado', label: '🗂️ Laudo consolidado' },
  ];

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-3xl">🧠</span>
            <h1 className="text-2xl font-bold text-slate-800">Saúde Mental</h1>
          </div>
          <p className="text-slate-500 text-sm">
            Detecção precoce de alterações emocionais com escalas reconhecidas. Rastreio — não substitui avaliação clínica.
          </p>
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
          {TABS.map(t => (
            <button key={t.id}
              onClick={() => { setTab(t.id as any); if (t.id === 'consolidado' && !consolidated) loadConsolidated(); }}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition-all
                ${tab === t.id ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading && <p className="text-slate-400 text-sm">Carregando…</p>}

        {/* ── TESTES ── */}
        {!loading && tab === 'testes' && (
          <div className="space-y-6">
            {Object.keys(byCategory).length === 0 && (
              <p className="text-slate-400 text-sm">Nenhuma escala disponível.</p>
            )}
            {Object.entries(byCategory).map(([cat, scales]) => (
              <div key={cat}>
                <h2 className="text-sm font-bold text-slate-600 mb-2 flex items-center gap-2">
                  <span>{CAT_ICON[cat] ?? '•'}</span>{scales[0]?.categoryLabel ?? cat}
                </h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {scales.map(s => (
                    <Link key={s.code} href={`/saude-mental/${s.code}`}>
                      <div className="card p-4 hover:shadow-md transition-all cursor-pointer h-full">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-bold text-slate-800">{s.shortName}</h3>
                          <span className="text-[10px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">uso livre</span>
                        </div>
                        <p className="text-xs text-slate-500 mb-2">{s.name}</p>
                        <div className="text-[11px] text-slate-400">{s.itemCount} perguntas · {s.timeframe}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── HISTÓRICO ── */}
        {!loading && tab === 'historico' && (
          <div className="space-y-3">
            {assessments.length === 0 && <p className="text-slate-400 text-sm">Você ainda não realizou nenhum teste.</p>}
            {assessments.filter(a => a.scaleCode !== 'CONSOLIDATED').map(a => (
              <Link key={a.id} href={`/saude-mental/resultado/${a.id}`}>
                <div className="card p-4 flex items-center justify-between hover:shadow-md transition-all cursor-pointer">
                  <div>
                    <div className="font-semibold text-slate-800">{shortNameOf(a.scaleCode)}</div>
                    <div className="text-xs text-slate-400">{new Date(a.createdAt).toLocaleString('pt-BR')}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.flags?.suicideRisk && <span className="text-red-600 text-lg" title="Alerta de segurança">⚠️</span>}
                    {a.normalizedScore != null && <span className="text-sm font-bold text-slate-600">{a.normalizedScore}/100</span>}
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${COLOR_BADGE[a.flags?.color] ?? 'bg-slate-100 text-slate-600'}`}>
                      {a.flags?.severityLabel ?? a.severity ?? '—'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* ── CONSOLIDADO ── */}
        {!loading && tab === 'consolidado' && (
          <div className="space-y-4">
            {!consolidated && <p className="text-slate-400 text-sm">Carregando laudo…</p>}
            {consolidated && consolidated.items.length === 0 && (
              <p className="text-slate-400 text-sm">Realize ao menos um teste para gerar o laudo consolidado.</p>
            )}
            {consolidated && consolidated.items.length > 0 && (
              <>
                <div className="grid sm:grid-cols-2 gap-3">
                  {consolidated.items.map(i => (
                    <div key={i.scaleCode} className="card p-4">
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
                <div className="card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-slate-700">🗂️ Laudo consolidado</h3>
                    <button onClick={() => mentalHealthApi.saveConsolidated().then(() => alert('Laudo consolidado salvo no prontuário.'))}
                      className="text-xs font-semibold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700">
                      Salvar no prontuário
                    </button>
                  </div>
                  <pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">{consolidated.laudo}</pre>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
