'use client';
// apps/web/src/app/occupational-health/page.tsx
// Página principal da especialidade Medicina do Trabalho — IcodLife
import { useState, useEffect } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { occupationalHealthApi } from '../../lib/api';
import Link from 'next/link';

interface Assessment {
  id: string;
  createdAt: string;
  overallScore: number;
  overallTier: 'baixo' | 'moderado' | 'alto' | 'critico';
  sector: string | null;
  role: string | null;
  topRisks: string[];
  laudo: string | null;
}

const TIER_BADGE: Record<string, string> = {
  baixo: 'bg-green-100 text-green-700',
  moderado: 'bg-yellow-100 text-yellow-700',
  alto: 'bg-orange-100 text-orange-700',
  critico: 'bg-red-100 text-red-700',
};
const TIER_LABEL: Record<string, string> = {
  baixo: '🟢 Baixo', moderado: '🟡 Moderado', alto: '🟠 Alto', critico: '🔴 Crítico',
};

export default function OccupationalHealthPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'home' | 'assessments'>('home');

  useEffect(() => {
    occupationalHealthApi.listAssessments()
      .then(res => setAssessments(res.data))
      .catch(() => setAssessments([]))
      .finally(() => setLoading(false));
  }, []);

  const last = assessments[0];

  const TABS = [
    { id: 'home',        label: '🏠 Início' },
    { id: 'assessments', label: '📋 Avaliações' },
  ];

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-3xl">🦺</span>
              <h1 className="text-2xl font-bold text-slate-800">Medicina do Trabalho</h1>
            </div>
            <p className="text-slate-500 text-sm">Saúde e segurança ocupacional — NR-01</p>
          </div>
          <Link href="/occupational-health/psychosocial-assessment"
            className="bg-blue-600 text-white font-bold px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors text-sm flex items-center gap-2">
            🧠 Nova avaliação
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition-all
                ${tab === t.id ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── HOME ── */}
        {tab === 'home' && (
          <div className="space-y-5">

            {/* CTA Avaliação psicossocial */}
            <Link href="/occupational-health/psychosocial-assessment">
              <div className="bg-gradient-to-br from-indigo-600 to-blue-800 rounded-2xl p-6 text-white cursor-pointer hover:shadow-lg transition-all">
                <div className="text-4xl mb-3">🧠</div>
                <h2 className="text-lg font-bold mb-1">Avaliação de Riscos Psicossociais (NR-01)</h2>
                <p className="text-blue-100 text-sm leading-relaxed">
                  Questionário com 54 perguntas baseado nas diretrizes da NR-01 (Portaria MTE nº 1.419/2024) e em
                  instrumentos validados (COPSOQ, JCQ, ERI, MBI). Gera um laudo de risco psicossocial ocupacional
                  pronto para alimentar o PGR/PCMSO. ~12–15 minutos.
                </p>
                <div className="mt-4 inline-flex items-center gap-2 bg-white/20 rounded-xl px-4 py-2 text-sm font-semibold">
                  Iniciar avaliação →
                </div>
              </div>
            </Link>

            {/* Último resultado */}
            {last && (
              <div className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-700">📋 Última avaliação</h3>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${TIER_BADGE[last.overallTier] ?? TIER_BADGE.baixo}`}>
                    {TIER_LABEL[last.overallTier] ?? 'Sem dado'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div className="text-center">
                    <div className="text-xs text-slate-400 mb-0.5">Data</div>
                    <div className="text-sm font-semibold text-slate-700">
                      {new Date(last.createdAt).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-400 mb-0.5">Escore geral</div>
                    <div className="text-sm font-bold text-blue-700">{last.overallScore}/100</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-400 mb-0.5">Setor</div>
                    <div className="text-sm font-bold text-purple-700">{last.sector ?? '—'}</div>
                  </div>
                </div>
                {last.topRisks?.length > 0 && (
                  <div className="flex flex-wrap gap-1 border-t border-slate-100 pt-3">
                    {last.topRisks.map(r => (
                      <span key={r} className="bg-red-50 text-red-700 text-[11px] px-2 py-0.5 rounded-full">{r}</span>
                    ))}
                  </div>
                )}
                <Link href={`/occupational-health/psychosocial-assessment?view=${last.id}`}
                  className="block mt-3 text-center text-xs font-semibold text-blue-700 hover:underline">
                  Ver laudo completo →
                </Link>
              </div>
            )}

            {/* Info dimensões avaliadas */}
            <div className="card p-5">
              <h3 className="font-bold text-slate-700 mb-4">🧪 Dimensões avaliadas (NR-01, item 1.5.1.6.2)</h3>
              <div className="space-y-3">
                {[
                  { icon: '⏱️', title: 'Exigências e Demandas do Trabalho', desc: 'Sobrecarga, ritmo acelerado, prazos incompatíveis.' },
                  { icon: '🧭', title: 'Organização do Trabalho e Autonomia', desc: 'Clareza de papel, participação nas decisões, previsibilidade.' },
                  { icon: '🔄', title: 'Conteúdo da Tarefa e Esforço-Recompensa', desc: 'Repetitividade, reconhecimento, desenvolvimento.' },
                  { icon: '🤝', title: 'Relações Interpessoais e Suporte', desc: 'Apoio entre colegas, conflitos, comunicação.' },
                  { icon: '🎓', title: 'Qualidade da Liderança e Gestão', desc: 'Feedback, justiça, disponibilidade da liderança.' },
                  { icon: '🚨', title: 'Assédio Moral, Sexual e Violência', desc: 'Humilhações, discriminação, canais de denúncia.' },
                  { icon: '📢', title: 'Insegurança no Emprego e Mudanças', desc: 'Estabilidade, comunicação de mudanças organizacionais.' },
                  { icon: '⏰', title: 'Conflito Trabalho-Vida e Jornada', desc: 'Desconexão digital, horas extras, pausas.' },
                  { icon: '🩺', title: 'Indicadores de Bem-Estar e Exaustão', desc: 'Estresse, sono, sintomas de esgotamento percebido.' },
                ].map((m, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-xl">{m.icon}</span>
                    <div>
                      <div className="text-sm font-semibold text-slate-700">{m.title}</div>
                      <div className="text-xs text-slate-500">{m.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Aviso legal */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              ⚠️ <strong>Aviso importante:</strong> Esta triagem avalia a <strong>percepção sobre condições organizacionais
              do trabalho</strong>, conforme a NR-01. Não é um diagnóstico clínico individual. Resultados em nível alto
              ou crítico devem ser levados ao SESMT, médico do trabalho ou psicólogo organizacional responsável pelo PGR.
            </div>

            {/* Agendar */}
            <Link href="/appointments?specialty=Medicina%20do%20Trabalho"
              className="block w-full text-center border-2 border-blue-200 text-blue-700 font-semibold py-3.5 rounded-xl hover:bg-blue-50 transition-colors">
              📅 Agendar consulta com médico do trabalho
            </Link>
          </div>
        )}

        {/* ── AVALIAÇÕES ── */}
        {tab === 'assessments' && (
          <div className="space-y-3">
            {loading && <p className="text-slate-400 text-sm text-center py-8">Carregando…</p>}
            {!loading && assessments.length === 0 && (
              <div className="text-center py-12">
                <div className="text-5xl mb-3">🦺</div>
                <p className="text-slate-400 text-sm mb-4">Nenhuma avaliação realizada ainda.</p>
                <Link href="/occupational-health/psychosocial-assessment"
                  className="bg-blue-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors text-sm">
                  Fazer primeira avaliação
                </Link>
              </div>
            )}
            {assessments.map(a => (
              <Link key={a.id} href={`/occupational-health/psychosocial-assessment?view=${a.id}`}>
                <div className="card p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-bold text-slate-700">
                      {new Date(a.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${TIER_BADGE[a.overallTier] ?? TIER_BADGE.baixo}`}>
                      {TIER_LABEL[a.overallTier]}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-2">
                    <div className="text-center">
                      <div className="text-[10px] text-slate-400">Escore</div>
                      <div className="text-xs font-bold text-blue-700">{a.overallScore}/100</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] text-slate-400">Setor</div>
                      <div className="text-xs font-bold text-slate-700">{a.sector ?? '—'}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] text-slate-400">Cargo</div>
                      <div className="text-xs font-bold text-slate-700">{a.role ?? '—'}</div>
                    </div>
                  </div>
                  {a.topRisks?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {a.topRisks.map(r => (
                        <span key={r} className="bg-red-50 text-red-700 text-[10px] px-2 py-0.5 rounded-full">{r}</span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
