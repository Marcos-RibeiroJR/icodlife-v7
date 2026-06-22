'use client';
// apps/web/src/app/ophthalmology/page.tsx
// Página principal da especialidade Oftalmologia — IcodLife
import { useState, useEffect } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { ophthalmologyApi } from '../../lib/api';
import Link from 'next/link';

interface Exam {
  id: string;
  createdAt: string;
  riskLevel: string;
  acuityRightEye: string | null;
  acuityLeftEye: string | null;
  reportSummary: string | null;
  confidenceScore: number | null;
  estimatedMyopiaRight: number | null;
  estimatedMyopiaLeft: number | null;
}

const RISK_BADGE: Record<string, string> = {
  none:     'bg-green-100 text-green-700',
  low:      'bg-yellow-100 text-yellow-700',
  moderate: 'bg-orange-100 text-orange-700',
  high:     'bg-red-100 text-red-700',
};
const RISK_LABEL: Record<string, string> = {
  none: '🟢 Normal', low: '🟡 Leve', moderate: '🟠 Moderado', high: '🔴 Elevado',
};

export default function OphthalmologyPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'home' | 'exams' | 'history'>('home');

  useEffect(() => {
    Promise.allSettled([
      ophthalmologyApi.listExams(),
      ophthalmologyApi.getHistory(),
    ]).then(([e, h]) => {
      setExams(e.status === 'fulfilled' ? e.value.data : []);
      setHistory(h.status === 'fulfilled' ? h.value.data : []);
      setLoading(false);
    });
  }, []);

  const lastExam = exams[0];

  const TABS = [
    { id: 'home',    label: '🏠 Início' },
    { id: 'exams',   label: '📋 Triagens' },
    { id: 'history', label: '📁 Histórico' },
  ];

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-3xl">👁️</span>
              <h1 className="text-2xl font-bold text-slate-800">Oftalmologia</h1>
            </div>
            <p className="text-slate-500 text-sm">Saúde ocular — triagem digital e acompanhamento</p>
          </div>
          <Link href="/ophthalmology/auto-exam"
            className="bg-blue-600 text-white font-bold px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors text-sm flex items-center gap-2">
            👁️ Novo exame
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

            {/* CTA auto-exame */}
            <Link href="/ophthalmology/auto-exam">
              <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white cursor-pointer hover:shadow-lg transition-all">
                <div className="text-4xl mb-3">🔍</div>
                <h2 className="text-lg font-bold mb-1">Pré-Triagem Oftalmológica</h2>
                <p className="text-blue-100 text-sm leading-relaxed">
                  Teste de acuidade visual (Snellen), astigmatismo, sensibilidade ao contraste e estimativa de grau por IA. ~5–8 minutos.
                </p>
                <div className="mt-4 inline-flex items-center gap-2 bg-white/20 rounded-xl px-4 py-2 text-sm font-semibold">
                  Iniciar exame digital →
                </div>
              </div>
            </Link>

            {/* Último resultado */}
            {lastExam && (
              <div className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-700">📋 Última triagem</h3>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${RISK_BADGE[lastExam.riskLevel] ?? RISK_BADGE.none}`}>
                    {RISK_LABEL[lastExam.riskLevel] ?? 'Sem dado'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div className="text-center">
                    <div className="text-xs text-slate-400 mb-0.5">Data</div>
                    <div className="text-sm font-semibold text-slate-700">
                      {new Date(lastExam.createdAt).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-400 mb-0.5">Acuidade OD</div>
                    <div className="text-sm font-bold text-blue-700">{lastExam.acuityRightEye ?? '—'}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-400 mb-0.5">Acuidade OE</div>
                    <div className="text-sm font-bold text-purple-700">{lastExam.acuityLeftEye ?? '—'}</div>
                  </div>
                </div>
                {lastExam.reportSummary && (
                  <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-3">
                    {lastExam.reportSummary}
                  </p>
                )}
              </div>
            )}

            {/* Info módulos */}
            <div className="card p-5">
              <h3 className="font-bold text-slate-700 mb-4">🧪 O que o exame avalia</h3>
              <div className="space-y-3">
                {[
                  { icon: '📏', title: 'Distância calibrada', desc: 'Câmera frontal estima a distância do usuário à tela para calibrar os testes.' },
                  { icon: '🔤', title: 'Acuidade Visual (Snellen)', desc: 'Tabela optométrica digital que estima miopia, hipermetropia e severidade.' },
                  { icon: '⭕', title: 'Teste de Astigmatismo', desc: 'Roda de linhas radiais para detectar e estimar eixo do astigmatismo.' },
                  { icon: '🔲', title: 'Sensibilidade ao Contraste', desc: 'Detecta possível catarata inicial, alterações de córnea ou retina.' },
                  { icon: '🤖', title: 'IA de Estimativa de Grau', desc: 'Algoritmo combina todos os resultados para estimar a refração ocular.' },
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

            {/* Aviso */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              ⚠️ <strong>Aviso importante:</strong> Este é um exame de <strong>pré-triagem digital</strong>. Não substitui
              avaliação presencial com oftalmologista. Em caso de alteração, agende uma consulta.
            </div>

            {/* Agendar */}
            <Link href="/appointments?specialty=Oftalmologia"
              className="block w-full text-center border-2 border-blue-200 text-blue-700 font-semibold py-3.5 rounded-xl hover:bg-blue-50 transition-colors">
              📅 Agendar consulta com oftalmologista
            </Link>
          </div>
        )}

        {/* ── TRIAGENS ── */}
        {tab === 'exams' && (
          <div className="space-y-3">
            {loading && <p className="text-slate-400 text-sm text-center py-8">Carregando…</p>}
            {!loading && exams.length === 0 && (
              <div className="text-center py-12">
                <div className="text-5xl mb-3">👁️</div>
                <p className="text-slate-400 text-sm mb-4">Nenhuma triagem realizada ainda.</p>
                <Link href="/ophthalmology/auto-exam"
                  className="bg-blue-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors text-sm">
                  Fazer primeira triagem
                </Link>
              </div>
            )}
            {exams.map(e => (
              <div key={e.id} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-bold text-slate-700">
                    {new Date(e.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${RISK_BADGE[e.riskLevel] ?? RISK_BADGE.none}`}>
                    {RISK_LABEL[e.riskLevel]}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-3 mb-2">
                  <div className="text-center">
                    <div className="text-[10px] text-slate-400">Ac. OD</div>
                    <div className="text-xs font-bold text-blue-700">{e.acuityRightEye ?? '—'}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-slate-400">Ac. OE</div>
                    <div className="text-xs font-bold text-purple-700">{e.acuityLeftEye ?? '—'}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-slate-400">Miopia OD</div>
                    <div className="text-xs font-bold text-slate-700">{e.estimatedMyopiaRight ?? '0'}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-slate-400">Miopia OE</div>
                    <div className="text-xs font-bold text-slate-700">{e.estimatedMyopiaLeft ?? '0'}</div>
                  </div>
                </div>
                {e.reportSummary && (
                  <p className="text-xs text-slate-500 leading-relaxed">{e.reportSummary}</p>
                )}
                {e.confidenceScore && (
                  <div className="mt-2 text-[10px] text-slate-400">Confiança: {e.confidenceScore}%</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── HISTÓRICO CONSULTAS ── */}
        {tab === 'history' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
              📁 Aqui você pode registrar os resultados das suas consultas reais com o oftalmologista, para comparar com as triagens digitais.
            </div>

            {!loading && history.length === 0 && (
              <div className="text-center py-10">
                <div className="text-4xl mb-3">📁</div>
                <p className="text-slate-400 text-sm">Nenhum histórico de consulta registrado.</p>
              </div>
            )}

            {history.map((h: any) => (
              <div key={h.id} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-bold text-slate-700">{h.doctorName ?? 'Oftalmologista'}</div>
                  <div className="text-xs text-slate-400">
                    {h.consultDate ? new Date(h.consultDate).toLocaleDateString('pt-BR') : new Date(h.createdAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-slate-400 mb-0.5">Olho Direito</div>
                    <div className="text-sm font-semibold text-slate-700">
                      Esf: {h.sphericalRight ?? '—'} / Cil: {h.cylinderRight ?? '—'} / Eixo: {h.axisRight ?? '—'}°
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-0.5">Olho Esquerdo</div>
                    <div className="text-sm font-semibold text-slate-700">
                      Esf: {h.sphericalLeft ?? '—'} / Cil: {h.cylinderLeft ?? '—'} / Eixo: {h.axisLeft ?? '—'}°
                    </div>
                  </div>
                </div>
                {h.diagnoses?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {h.diagnoses.map((d: string) => (
                      <span key={d} className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{d}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
