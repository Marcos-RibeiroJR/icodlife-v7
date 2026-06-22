'use client';
// apps/web/src/app/exam-timeline/page.tsx
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '../../components/layout/AppLayout';
import { examResultsApi } from '../../lib/api';

const STATUS_COLOR: Record<string, string> = {
  normal:       '#16A34A',
  low:          '#0891B2',
  high:         '#D97706',
  critical_low: '#DC2626',
  critical_high:'#DC2626',
  pending:      '#94a3b8',
};
const STATUS_BADGE: Record<string, string> = {
  normal: 'badge-normal', low: 'badge-low', high: 'badge-warning',
  critical_low: 'badge-critical', critical_high: 'badge-critical', pending: 'badge-pending',
};
const STATUS_LABEL: Record<string, string> = {
  normal: 'Normal', low: 'Abaixo', high: 'Elevado',
  critical_low: 'Critico Baixo', critical_high: 'Critico Alto', pending: 'Pendente',
};

const PERIODS = [
  { label: '3m', months: 3 },
  { label: '6m', months: 6 },
  { label: '1a', months: 12 },
  { label: 'Tudo', months: 0 },
];

type MarkerItem = {
  id: string; examDate: string; value: number; unit: string;
  status: string; deltaPercent: number | null;
  refMin: number | null; refMax: number | null;
  examResult: { labName: string | null; examType: string };
};

// Regressao linear simples → retorna pontos [x0,y0, x1,y1]
function trendLine(points: { x: number; y: number }[]): [number, number, number, number] | null {
  const n = points.length;
  if (n < 2) return null;
  const sumX = points.reduce((a, p) => a + p.x, 0);
  const sumY = points.reduce((a, p) => a + p.y, 0);
  const sumXY = points.reduce((a, p) => a + p.x * p.y, 0);
  const sumX2 = points.reduce((a, p) => a + p.x * p.x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const x0 = points[0].x;
  const x1 = points[n - 1].x;
  return [x0, slope * x0 + intercept, x1, slope * x1 + intercept];
}

export default function ExamTimelinePage() {
  const [summary, setSummary]   = useState<any>(null);
  const [markers, setMarkers]   = useState<any[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [timeline, setTimeline] = useState<MarkerItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tlLoading, setTlLoading] = useState(false);
  const [period, setPeriod]     = useState(6); // meses; 0 = todos

  useEffect(() => {
    Promise.allSettled([examResultsApi.summary(), examResultsApi.markers()]).then(([s, m]) => {
      if (s.status === 'fulfilled') setSummary(s.value.data);
      if (m.status === 'fulfilled') {
        const ms = m.value.data;
        setMarkers(ms);
        if (ms.length > 0) setSelected(ms[0].marker);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    setTlLoading(true);
    const from = period === 0 ? undefined : (() => {
      const d = new Date(); d.setMonth(d.getMonth() - period); return d.toISOString().split('T')[0];
    })();
    examResultsApi.timeline(selected, from).then(r => {
      const raw = r.data?.data ?? r.data ?? [];
      setTimeline(raw);
      setTlLoading(false);
    }).catch(() => setTlLoading(false));
  }, [selected, period]);

  // Calcula limites do grafico com padding
  const vals = timeline.map(t => Number(t.value));
  const refMins = timeline.map(t => t.refMin !== null ? Number(t.refMin) : null).filter(Boolean) as number[];
  const refMaxs = timeline.map(t => t.refMax !== null ? Number(t.refMax) : null).filter(Boolean) as number[];
  const allVals = [...vals, ...refMins, ...refMaxs];
  const rawMin = allVals.length ? Math.min(...allVals) : 0;
  const rawMax = allVals.length ? Math.max(...allVals) : 100;
  const pad    = (rawMax - rawMin) * 0.15 || 5;
  const minVal = rawMin - pad;
  const maxVal = rawMax + pad;
  const range  = maxVal - minVal || 1;

  const chartH = 160;
  const chartW = Math.max(500, timeline.length * 80);
  const pX = (i: number) =>
    timeline.length === 1 ? chartW / 2 : (i / (timeline.length - 1)) * (chartW - 60) + 30;
  const pY = (v: number) => chartH - ((v - minVal) / range) * (chartH - 20) - 10;

  // Pontos para linha de tendencia
  const trendPoints = timeline.map((t, i) => ({ x: i, y: pY(Number(t.value)) }));
  const trend = trendLine(trendPoints);
  const trendDir = trend ? (trend[3] < trend[1] ? 'improving' : 'worsening') : null;

  return (
    <AppLayout>
      <div className="bg-[#7B1E1E] px-8 py-6">
        <div className="max-w-5xl mx-auto flex items-start justify-between gap-4">
          <div>
            <h1 className="text-white text-2xl font-bold">Evolucao de Exames</h1>
            <p className="text-white/55 text-sm mt-1">Linha do tempo por marcador com analise de tendencia</p>
          </div>
          <Link href="/trend-report">
            <div className="bg-white/20 hover:bg-white/30 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-all flex-shrink-0">
              Ver Laudo de Tendencia →
            </div>
          </Link>
        </div>
      </div>

      <div className="p-8 max-w-5xl mx-auto space-y-6">

        {/* Resumo */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Marcadores', value: summary.total,    color: 'text-slate-800', bg: 'bg-slate-50' },
              { label: 'Normais',    value: summary.normal,   color: 'text-green-700', bg: 'bg-green-50' },
              { label: 'Alterados',  value: summary.abnormal, color: 'text-amber-700', bg: 'bg-amber-50' },
              { label: 'Criticos',   value: summary.critical, color: 'text-red-700',   bg: 'bg-red-50'   },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-2xl p-4`}>
                <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-slate-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Seletor de marcadores */}
          <div className="card p-4">
            <h2 className="font-bold text-slate-800 mb-3 text-sm">Marcadores</h2>
            {loading ? (
              <div className="text-slate-400 text-sm p-4 text-center">Carregando...</div>
            ) : markers.length === 0 ? (
              <div className="text-slate-400 text-sm p-4 text-center">Nenhum exame processado ainda.</div>
            ) : (
              <div className="space-y-0.5 max-h-96 overflow-y-auto">
                {markers.map((m: any) => (
                  <button key={m.marker} onClick={() => setSelected(m.marker)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all
                      ${selected === m.marker ? 'bg-red-700 text-white' : 'hover:bg-red-50 text-slate-700'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">{m.marker}</span>
                      <span className="ml-2 flex-shrink-0 w-2 h-2 rounded-full"
                        style={{ backgroundColor: STATUS_COLOR[m.lastStatus] ?? '#94a3b8' }} />
                    </div>
                    <div className="text-xs opacity-55 mt-0.5">{m.count} leitura(s)</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Grafico */}
          <div className="md:col-span-2 card p-5">
            {selected ? (
              <>
                {/* Header com filtro de periodo */}
                <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
                  <div>
                    <h2 className="font-bold text-slate-800">{selected}</h2>
                    {timeline[0]?.unit && (
                      <span className="text-xs text-slate-400">{timeline[0].unit}</span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {PERIODS.map(p => (
                      <button key={p.label} onClick={() => setPeriod(p.months)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all
                          ${period === p.months
                            ? 'bg-red-700 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {tlLoading ? (
                  <div className="flex items-center justify-center h-44 text-slate-400">Carregando...</div>
                ) : timeline.length === 0 ? (
                  <div className="flex items-center justify-center h-44 text-slate-400 text-sm">
                    Nenhum dado neste periodo.
                  </div>
                ) : (
                  <>
                    {/* Indicador de tendencia */}
                    {trendDir && timeline.length >= 2 && (
                      <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full mb-3
                        ${trendDir === 'improving' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                        {trendDir === 'improving' ? '📈 Tendencia de melhora' : '📉 Tendencia de piora'}
                        <span className="font-normal opacity-70">({timeline.length} pontos)</span>
                      </div>
                    )}

                    {/* SVG */}
                    <div className="overflow-x-auto rounded-xl bg-slate-50 p-2">
                      <svg width={chartW} height={chartH + 35} style={{ minWidth: '100%', display: 'block' }}>
                        {/* Grade horizontal */}
                        {[0, 0.25, 0.5, 0.75, 1].map(f => {
                          const y = 10 + f * (chartH - 20);
                          const val = maxVal - f * range;
                          return (
                            <g key={f}>
                              <line x1={0} y1={y} x2={chartW} y2={y} stroke="#e2e8f0" strokeWidth={1} />
                              <text x={4} y={y - 2} fontSize={8} fill="#94a3b8">{Number(val).toFixed(1)}</text>
                            </g>
                          );
                        })}

                        {/* Faixa de referencia */}
                        {timeline[0]?.refMin !== null && timeline[0]?.refMax !== null && (() => {
                          const yBot = pY(Number(timeline[0].refMin));
                          const yTop = pY(Number(timeline[0].refMax));
                          return (
                            <rect x={0} y={yTop} width={chartW} height={Math.abs(yBot - yTop)}
                              fill="#BBF7D0" opacity={0.45} rx={3} />
                          );
                        })()}

                        {/* Linha de tendencia (regressao linear) */}
                        {trend && (
                          <line
                            x1={pX(0)} y1={trend[1]}
                            x2={pX(timeline.length - 1)} y2={trend[3]}
                            stroke={trendDir === 'improving' ? '#16A34A' : '#D97706'}
                            strokeWidth={1.5} strokeDasharray="5,4" opacity={0.7} />
                        )}

                        {/* Linha principal */}
                        {timeline.length > 1 && (
                          <polyline
                            points={timeline.map((t, i) => `${pX(i)},${pY(Number(t.value))}`).join(' ')}
                            fill="none" stroke="#B91C1C" strokeWidth={2.5} strokeLinejoin="round" />
                        )}

                        {/* Pontos */}
                        {timeline.map((t, i) => {
                          const cx = pX(i);
                          const cy = pY(Number(t.value));
                          const fill = STATUS_COLOR[t.status] ?? '#94a3b8';
                          return (
                            <g key={t.id}>
                              <circle cx={cx} cy={cy} r={5} fill={fill} stroke="white" strokeWidth={1.5} />
                              <text x={cx} y={cy - 9} textAnchor="middle" fontSize={9} fill="#475569" fontWeight="600">
                                {Number(t.value).toFixed(1)}
                              </text>
                              <text x={cx} y={chartH + 22} textAnchor="middle" fontSize={8} fill="#94a3b8">
                                {new Date(t.examDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                              </text>
                              <text x={cx} y={chartH + 33} textAnchor="middle" fontSize={7} fill="#cbd5e1">
                                {new Date(t.examDate).getFullYear()}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>

                    {/* Referencia */}
                    {timeline[0]?.refMin !== null && timeline[0]?.refMax !== null && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                        <span className="w-3 h-3 rounded-sm bg-green-200 inline-block" />
                        Ref: {Number(timeline[0].refMin).toFixed(1)} – {Number(timeline[0].refMax).toFixed(1)} {timeline[0].unit}
                      </div>
                    )}

                    {/* Tabela ultimos 5 */}
                    <div className="mt-4 space-y-1.5">
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Ultimas leituras</h3>
                      {[...timeline].reverse().slice(0, 5).map((t: MarkerItem) => (
                        <div key={t.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                          <div>
                            <div className="text-sm font-semibold text-slate-800">
                              {Number(t.value).toFixed(2)} {t.unit}
                            </div>
                            <div className="text-xs text-slate-400">
                              {new Date(t.examDate).toLocaleDateString('pt-BR')}
                              {t.examResult?.labName ? ` · ${t.examResult.labName}` : ''}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {t.deltaPercent !== null && Math.abs(Number(t.deltaPercent)) >= 3 && (
                              <span className={`text-xs font-bold ${Number(t.deltaPercent) > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                                {Number(t.deltaPercent) > 0 ? '↑' : '↓'} {Math.abs(Number(t.deltaPercent)).toFixed(1)}%
                              </span>
                            )}
                            <span className={STATUS_BADGE[t.status] ?? 'badge-pending'}>
                              {STATUS_LABEL[t.status] ?? t.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-44 text-slate-400 text-sm">
                Selecione um marcador para ver a evolucao
              </div>
            )}
          </div>
        </div>

        {/* Marcadores fora da referencia */}
        {markers.filter((m: any) => m.lastStatus !== 'normal' && m.lastStatus !== 'pending').length > 0 && (
          <div className="card p-6">
            <h2 className="font-bold text-slate-800 mb-4">Marcadores que requerem atencao</h2>
            <div className="space-y-1">
              {markers
                .filter((m: any) => m.lastStatus !== 'normal' && m.lastStatus !== 'pending')
                .map((m: any) => (
                  <button key={m.marker} onClick={() => setSelected(m.marker)}
                    className="w-full flex items-center justify-between py-2.5 px-4 rounded-xl hover:bg-red-50 transition-all text-left">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: STATUS_COLOR[m.lastStatus] ?? '#94a3b8' }} />
                      <span className="font-medium text-slate-800 text-sm">{m.marker}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">
                        {new Date(m.lastDate).toLocaleDateString('pt-BR')}
                      </span>
                      <span className={STATUS_BADGE[m.lastStatus] ?? 'badge-pending'}>
                        {STATUS_LABEL[m.lastStatus] ?? m.lastStatus}
                      </span>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* CTA laudo de tendencia */}
        <Link href="/trend-report">
          <div className="card-hover p-5 flex items-center gap-4 cursor-pointer bg-gradient-to-r from-red-50 to-white border border-red-100">
            <div className="text-3xl">📋</div>
            <div>
              <div className="font-bold text-slate-800">Laudo de Tendencia Completo</div>
              <div className="text-sm text-slate-500 mt-0.5">
                Analise cruzada de todos os marcadores com Modulo Vida, recomendacoes e risco geral.
              </div>
            </div>
            <div className="ml-auto text-red-700 font-semibold text-sm flex-shrink-0">Ver laudo →</div>
          </div>
        </Link>

      </div>
    </AppLayout>
  );
}
