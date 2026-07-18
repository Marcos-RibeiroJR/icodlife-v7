'use client';
// apps/web/src/app/trend-report/page.tsx
import { useEffect, useState } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { examResultsApi } from '../../lib/api';

const RISK_CONFIG = {
  low:      { label: 'Risco Baixo',     bg: 'bg-green-50',  border: 'border-green-200', text: 'text-green-700',  icon: '🟢' },
  moderate: { label: 'Risco Moderado',  bg: 'bg-amber-50',  border: 'border-amber-200', text: 'text-amber-700',  icon: '🟡' },
  high:     { label: 'Risco Alto',      bg: 'bg-orange-50', border: 'border-orange-200',text: 'text-orange-700', icon: '🟠' },
  critical: { label: 'Risco Critico',   bg: 'bg-red-50',    border: 'border-red-200',   text: 'text-red-700',    icon: '🔴' },
};

const TREND_ICON: Record<string, string> = {
  improving: '📈',
  worsening: '📉',
  stable:    '➡️',
  single:    '•',
};

const HB_FLAGS: Record<string, string> = {
  sleep_issue: 'Sono ruim', severe_pain: 'Dor intensa', missed_medication: 'Medicação esquecida',
  bp_risk_factors: 'Risco de PA', bp_symptom: 'Sintoma de PA', possible_illness: 'Possível doença',
};

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  normal:        { bg: 'bg-green-50',  text: 'text-green-700',  label: 'Normal' },
  low:           { bg: 'bg-cyan-50',   text: 'text-cyan-700',   label: 'Abaixo' },
  high:          { bg: 'bg-amber-50',  text: 'text-amber-700',  label: 'Elevado' },
  critical_low:  { bg: 'bg-red-100',   text: 'text-red-800',    label: 'Critico Baixo' },
  critical_high: { bg: 'bg-red-100',   text: 'text-red-800',    label: 'Critico Alto' },
  pending:       { bg: 'bg-slate-50',  text: 'text-slate-500',  label: 'Sem ref.' },
};

const LS_LABELS: Record<string, string> = {
  never: 'Nao fumante', former: 'Ex-fumante', occasional: 'Fumante ocasional', daily: 'Fumante',
  sedentary: 'Sedentario', '1-2x': '1-2x/sem', '3-4x': '3-4x/sem', '5+x': '5+x/sem',
  underweight: 'Abaixo do peso', normal: 'Normal', overweight: 'Sobrepeso',
  obese_1: 'Obs. Grau I', obese_2: 'Obs. Grau II', obese_3: 'Obs. Grau III',
};

export default function TrendReportPage() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [months, setMonths]   = useState(6);
  const [error, setError]     = useState('');

  const load = async (m: number) => {
    setLoading(true); setError('');
    try {
      const { data } = await examResultsApi.trendReport(m);
      setReport(data);
    } catch {
      setError('Erro ao gerar laudo. Verifique se existem exames cadastrados.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(months); }, []);

  const risk = report ? RISK_CONFIG[report.overallRisk as keyof typeof RISK_CONFIG] : null;

  return (
    <AppLayout>
      <div className="bg-[#7B1E1E] px-8 py-6">
        <div className="max-w-4xl mx-auto flex items-start justify-between">
          <div>
            <h1 className="text-white text-2xl font-bold">Laudo de Tendencia</h1>
            <p className="text-white/55 text-sm mt-1">Analise evolutiva cruzada com Modulo Vida</p>
          </div>
          {/* Filtro de periodo */}
          <div className="flex gap-2">
            {[3, 6, 12].map(m => (
              <button key={m} onClick={() => { setMonths(m); load(m); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all
                  ${months === m
                    ? 'bg-white text-[#7B1E1E]'
                    : 'bg-white/20 text-white hover:bg-white/30'}`}>
                {m}m
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-8 max-w-4xl mx-auto space-y-6">

        {loading && (
          <div className="card p-16 text-center text-slate-400">
            <div className="text-4xl mb-4">📊</div>
            <div className="font-semibold">Analisando seus exames...</div>
            <div className="text-sm mt-1">Cruzando dados com Modulo Vida</div>
          </div>
        )}

        {error && (
          <div className="card p-10 text-center">
            <div className="text-4xl mb-3">🧪</div>
            <p className="text-slate-500 font-semibold">{error}</p>
            <p className="text-sm text-slate-400 mt-2">Cadastre exames em Exames ou lance manualmente.</p>
          </div>
        )}

        {!loading && report && (
          <>
            {/* Banner de risco geral */}
            <div className={`rounded-2xl p-6 border ${risk!.bg} ${risk!.border}`}>
              <div className="flex items-start gap-4">
                <div className="text-4xl">{risk!.icon}</div>
                <div className="flex-1">
                  <div className={`text-xl font-bold ${risk!.text}`}>{risk!.label}</div>
                  <div className="text-slate-700 text-sm mt-2 leading-relaxed">
                    {report.narrativeSummary}
                  </div>
                  <div className="text-slate-400 text-xs mt-2">
                    Gerado em {new Date(report.generatedAt).toLocaleString('pt-BR')} · {report.period}
                  </div>
                </div>
              </div>
            </div>

            {/* Cards de contagem */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Marcadores', value: report.totalMarkers, color: 'text-slate-700', bg: 'bg-slate-50' },
                { label: 'Normais',    value: report.normal,       color: 'text-green-700', bg: 'bg-green-50' },
                { label: 'Alterados',  value: report.abnormal,     color: 'text-amber-700', bg: 'bg-amber-50' },
                { label: 'Criticos',   value: report.critical,     color: 'text-red-700',   bg: 'bg-red-50' },
                { label: 'Melhorando', value: report.improving,    color: 'text-emerald-700', bg: 'bg-emerald-50' },
              ].map(c => (
                <div key={c.label} className={`${c.bg} rounded-2xl p-4 text-center`}>
                  <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
                  <div className="text-xs text-slate-500 mt-1">{c.label}</div>
                </div>
              ))}
            </div>

            {/* Cruzamento Modulo Vida */}
            {report.lifestyle && (
              <div className="card p-5">
                <h2 className="font-bold text-slate-800 mb-4">Modulo Vida — Contexto Atual</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {report.lifestyle.healthScore != null && (
                    <div className="bg-pink-50 rounded-xl p-3 text-center">
                      <div className={`text-2xl font-bold ${report.lifestyle.healthScore >= 70 ? 'text-green-600' : report.lifestyle.healthScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                        {report.lifestyle.healthScore}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">Score de Saude</div>
                    </div>
                  )}
                  {report.lifestyle.bmi != null && (
                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold text-slate-700">{Number(report.lifestyle.bmi).toFixed(1)}</div>
                      <div className="text-xs text-slate-500 mt-1">IMC · {LS_LABELS[report.lifestyle.bmiCategory] ?? report.lifestyle.bmiCategory}</div>
                    </div>
                  )}
                  {report.lifestyle.smokingStatus && report.lifestyle.smokingStatus !== 'never' && (
                    <div className="bg-orange-50 rounded-xl p-3 text-center">
                      <div className="text-2xl">🚬</div>
                      <div className="text-xs text-slate-500 mt-1">{LS_LABELS[report.lifestyle.smokingStatus]}</div>
                    </div>
                  )}
                  {report.lifestyle.exerciseFrequency && (
                    <div className="bg-blue-50 rounded-xl p-3 text-center">
                      <div className="text-2xl">🏃</div>
                      <div className="text-xs text-slate-500 mt-1">{LS_LABELS[report.lifestyle.exerciseFrequency] ?? report.lifestyle.exerciseFrequency}</div>
                    </div>
                  )}
                  {report.lifestyle.systolicBp && report.lifestyle.diastolicBp && (
                    <div className={`rounded-xl p-3 text-center ${report.lifestyle.systolicBp >= 140 ? 'bg-red-50' : report.lifestyle.systolicBp >= 130 ? 'bg-amber-50' : 'bg-green-50'}`}>
                      <div className="text-xl font-bold text-slate-700">{report.lifestyle.systolicBp}/{report.lifestyle.diastolicBp}</div>
                      <div className="text-xs text-slate-500 mt-1">PA mmHg</div>
                    </div>
                  )}
                  {report.lifestyle.stressLevel != null && (
                    <div className={`rounded-xl p-3 text-center ${report.lifestyle.stressLevel >= 8 ? 'bg-red-50' : 'bg-slate-50'}`}>
                      <div className="text-2xl font-bold text-slate-700">{report.lifestyle.stressLevel}/10</div>
                      <div className="text-xs text-slate-500 mt-1">Estresse</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cruzamento HealthBot */}
            {report.healthBot && (
              <div className="card p-5">
                <h2 className="font-bold text-slate-800 mb-1">HealthBot — Check-ins do período</h2>
                <p className="text-xs text-slate-400 mb-4">Cruzamento com o motor de risco (chat diário)</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-slate-50 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-slate-700">{report.healthBot.totalCheckins}</div>
                    <div className="text-xs text-slate-500 mt-1">Check-ins</div>
                  </div>
                  <div className={`rounded-xl p-3 text-center ${report.healthBot.avgRisk >= 50 ? 'bg-red-50' : report.healthBot.avgRisk >= 20 ? 'bg-amber-50' : 'bg-green-50'}`}>
                    <div className="text-2xl font-bold text-slate-700">{report.healthBot.avgRisk}</div>
                    <div className="text-xs text-slate-500 mt-1">Risco médio</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-slate-700">{Number(report.healthBot.avgSentiment).toFixed(2)}</div>
                    <div className="text-xs text-slate-500 mt-1">Sentimento</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 text-center">
                    <div className="text-2xl">{TREND_ICON[report.healthBot.currentTrend] ?? '➡️'}</div>
                    <div className="text-xs text-slate-500 mt-1">Tendência</div>
                  </div>
                </div>
                {report.healthBot.topFlags?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {report.healthBot.topFlags.map((f: any) => (
                      <span key={f.flag} className="text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                        {HB_FLAGS[f.flag] ?? f.flag} · {f.count}x
                      </span>
                    ))}
                  </div>
                )}
                <a href="/saude-tendencia" className="inline-block mt-3 text-sm text-blue-600 hover:text-blue-800 font-semibold">
                  Ver dashboard de tendência →
                </a>
              </div>
            )}

            {/* Marcadores detalhados */}
            {report.markers.length > 0 && (
              <div className="card p-5">
                <h2 className="font-bold text-slate-800 mb-4">Marcadores Analisados</h2>
                <div className="space-y-2">
                  {report.markers.map((m: any) => {
                    const sc = STATUS_CONFIG[m.currentStatus] ?? STATUS_CONFIG.pending;
                    const isWorse = m.trend === 'worsening';
                    const isImprov = m.trend === 'improving';
                    return (
                      <div key={m.marker} className={`rounded-xl p-3 border ${sc.bg} border-transparent`}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-base flex-shrink-0">{TREND_ICON[m.trend]}</span>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-800 truncate">{m.marker}</div>
                              <div className="text-xs text-slate-400 mt-0.5">
                                {new Date(m.lastDate).toLocaleDateString('pt-BR')} · {m.readings} medicao(oes)
                                {m.refMin != null && m.refMax != null &&
                                  ` · ref: ${m.refMin}-${m.refMax} ${m.unit}`}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {m.deltaPercent !== null && Math.abs(m.deltaPercent) >= 3 && (
                              <span className={`text-xs font-bold ${isWorse ? 'text-red-600' : isImprov ? 'text-green-600' : 'text-slate-400'}`}>
                                {m.deltaPercent > 0 ? '+' : ''}{Number(m.deltaPercent).toFixed(1)}%
                              </span>
                            )}
                            <span className="font-bold text-slate-800 text-sm">
                              {Number(m.currentValue).toFixed(2)} {m.unit}
                            </span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
                              {sc.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recomendacoes */}
            {report.recommendations.length > 0 && (
              <div className="card p-5">
                <h2 className="font-bold text-slate-800 mb-4">Recomendacoes</h2>
                <div className="space-y-3">
                  {report.recommendations.map((rec: string, i: number) => (
                    <div key={i} className="flex gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className="text-lg flex-shrink-0 mt-0.5">
                        {rec.toLowerCase().includes('urgente') || rec.toLowerCase().includes('critico') ? '🚨' :
                         rec.toLowerCase().includes('medico') || rec.toLowerCase().includes('consulte') ? '👨‍⚕️' :
                         rec.toLowerCase().includes('exerc') ? '🏃' :
                         rec.toLowerCase().includes('aliment') || rec.toLowerCase().includes('diet') ? '🥗' : '💡'}
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">{rec}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-xl text-xs text-blue-600">
                  Este laudo e gerado automaticamente com base nos dados cadastrados e nao substitui avaliacao medica profissional.
                </div>
              </div>
            )}

            {/* Sem dados */}
            {report.totalMarkers === 0 && (
              <div className="card p-10 text-center">
                <div className="text-4xl mb-3">🧪</div>
                <p className="font-semibold text-slate-600">Nenhum exame encontrado nos {report.period}.</p>
                <p className="text-sm text-slate-400 mt-1">Cadastre exames para ver o laudo de tendencia.</p>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
