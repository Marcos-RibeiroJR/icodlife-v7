'use client';
// apps/web/src/app/dashboard/page.tsx
import { useEffect, useState } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { useAuthStore } from '../../store/auth.store';
import { recordsApi, medicationsApi, appointmentsApi, chatApi, examResultsApi, lifestyleApi } from '../../lib/api';
import Link from 'next/link';

const STATUS_BADGE: Record<string, string> = {
  normal:   'badge-normal',
  alert:    'badge-warning',
  critical: 'badge-critical',
  pending:  'badge-pending',
  low:      'badge-low',
};
const STATUS_LABEL: Record<string, string> = {
  normal:   'Normal',
  alert:    'Atencao',
  critical: 'Critico',
  pending:  'Pendente',
  low:      'Abaixo',
};

const BT_LABEL: Record<string, string> = {
  A_PLUS:'A+', A_MINUS:'A-', B_PLUS:'B+', B_MINUS:'B-',
  AB_PLUS:'AB+', AB_MINUS:'AB-', O_PLUS:'O+', O_MINUS:'O-',
};

const SCORE_COLOR = (s: number) =>
  s >= 85 ? 'text-green-600' : s >= 70 ? 'text-green-500' : s >= 55 ? 'text-amber-500' : 'text-red-600';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [data, setData]     = useState<any>({ records: [], meds: [], appts: [], chat: null });
  const [summary, setSummary] = useState<any>(null);
  const [lifestyle, setLifestyle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const safe = <T,>(p: Promise<T>): Promise<T | null> => p.catch(() => null);

    Promise.all([
      safe(recordsApi.list({ limit: 5 })),
      safe(medicationsApi.list()),
      safe(appointmentsApi.list()),
      safe(chatApi.getHistory(7)),
      safe(examResultsApi.summary()),
      safe(lifestyleApi.get()),
    ]).then(([r, m, a, c, s, l]) => {
      setData({
        records: r ? (r as any).data?.slice(0, 5) ?? [] : [],
        meds:    m ? (m as any).data?.filter((x: any) => x.isActive).slice(0, 4) ?? [] : [],
        appts:   a ? (a as any).data?.slice(0, 2) ?? [] : [],
        chat:    c ? (c as any).data?.[0] ?? null : null,
      });
      if (s) setSummary((s as any).data ?? null);
      if (l) setLifestyle((l as any).data ?? null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = user?.fullName?.split(' ')[0] ?? '';
  const bloodType = user?.bloodType ? (BT_LABEL[user.bloodType] ?? null) : null;

  // Proximo medicamento do dia
  const nextMed = data.meds.find((m: any) => {
    if (!m.frequency?.times?.length) return false;
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    return m.frequency.times.some((t: string) => t > hhmm);
  });

  return (
    <AppLayout>
      {/* Header */}
      <div className="bg-[#7B1E1E] px-8 py-6">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div>
            <h1 className="text-white text-2xl font-bold">{greeting}, {firstName}</h1>
            <p className="text-white/55 text-sm mt-1">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {bloodType && (
              <span className="bg-white/15 text-white text-sm font-semibold px-3 py-1.5 rounded-full">
                {bloodType}
              </span>
            )}
            {user?.isDonor && (
              <span className="bg-white/10 text-red-200 text-sm font-semibold px-3 py-1.5 rounded-full">
                Doador
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-8 max-w-5xl mx-auto space-y-6">

        {/* HealthBot CTA */}
        <Link href="/chat">
          <div className={`rounded-2xl p-5 flex items-center gap-4 cursor-pointer transition-all hover:shadow-md
            ${data.chat?.completed
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border-2 border-red-200'}`}>
            <div className="text-4xl">🤖</div>
            <div className="flex-1">
              <div className="font-bold text-slate-800">
                {data.chat?.completed ? 'Check-in de hoje concluido!' : 'Check-in de saude pendente'}
              </div>
              <div className="text-sm text-slate-500 mt-0.5">
                {data.chat?.completed
                  ? 'Voce ja respondeu as perguntas de saude de hoje.'
                  : 'Responda as perguntas diarias do HealthBot. Leva menos de 2 minutos.'}
              </div>
            </div>
            {!data.chat?.completed && (
              <div className="bg-red-700 text-white font-semibold px-4 py-2 rounded-xl text-sm flex-shrink-0">
                Responder
              </div>
            )}
          </div>
        </Link>

        {/* Cards de metricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Exames */}
          <Link href="/records">
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 hover:shadow-md transition-all cursor-pointer">
              <div className="text-2xl mb-2">🧪</div>
              <div className="text-2xl font-bold text-slate-800">{data.records.length || '—'}</div>
              <div className="text-xs text-slate-500 mt-1">Exames recentes</div>
            </div>
          </Link>

          {/* Marcadores de exame */}
          <Link href="/exam-timeline">
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 hover:shadow-md transition-all cursor-pointer">
              <div className="text-2xl mb-2">📈</div>
              <div className="text-2xl font-bold text-slate-800">
                {summary ? summary.total : '—'}
              </div>
              <div className="text-xs text-slate-500 mt-1">Marcadores</div>
              {summary && summary.critical > 0 && (
                <div className="text-[11px] text-red-600 font-semibold mt-1">{summary.critical} critico{summary.critical > 1 ? 's' : ''}</div>
              )}
            </div>
          </Link>

          {/* Score de vida */}
          <Link href="/vida">
            <div className="bg-pink-50 border border-pink-100 rounded-2xl p-4 hover:shadow-md transition-all cursor-pointer">
              <div className="text-2xl mb-2">🫀</div>
              <div className={`text-2xl font-bold ${lifestyle?.healthScore ? SCORE_COLOR(lifestyle.healthScore) : 'text-slate-800'}`}>
                {lifestyle?.healthScore ?? '—'}
              </div>
              <div className="text-xs text-slate-500 mt-1">Score de vida</div>
            </div>
          </Link>

          {/* Medicamentos ativos */}
          <Link href="/medications">
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 hover:shadow-md transition-all cursor-pointer">
              <div className="text-2xl mb-2">💊</div>
              <div className="text-2xl font-bold text-slate-800">{data.meds.length || '—'}</div>
              <div className="text-xs text-slate-500 mt-1">Medicamentos ativos</div>
              {nextMed && (
                <div className="text-[11px] text-amber-600 font-semibold mt-1">
                  Proximo: {nextMed.frequency.times.find((t: string) => t > `${String(new Date().getHours()).padStart(2,'0')}:${String(new Date().getMinutes()).padStart(2,'0')}`)}
                </div>
              )}
            </div>
          </Link>
        </div>

        {/* Resumo de saude (se tiver exames) */}
        {summary && summary.total > 0 && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-800">Resumo dos Marcadores</h2>
              <Link href="/exam-timeline" className="text-red-700 text-sm font-semibold hover:underline">Ver evolucao</Link>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center bg-green-50 rounded-xl p-3">
                <div className="text-2xl font-bold text-green-700">{summary.normal}</div>
                <div className="text-xs text-green-600 font-semibold mt-1">Normais</div>
              </div>
              <div className="text-center bg-amber-50 rounded-xl p-3">
                <div className="text-2xl font-bold text-amber-700">{summary.abnormal}</div>
                <div className="text-xs text-amber-600 font-semibold mt-1">Alterados</div>
              </div>
              <div className="text-center bg-red-50 rounded-xl p-3">
                <div className="text-2xl font-bold text-red-700">{summary.critical}</div>
                <div className="text-xs text-red-600 font-semibold mt-1">Criticos</div>
              </div>
            </div>
            {summary.critical > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 font-semibold">
                Voce tem {summary.critical} marcador{summary.critical > 1 ? 'es' : ''} em nivel critico. Consulte um medico.
              </div>
            )}
          </div>
        )}

        {/* Modulos em destaque */}
        {!summary?.total && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/exam-timeline">
              <div className="card-hover p-5 cursor-pointer">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-xl">📈</div>
                  <div>
                    <div className="font-bold text-slate-800">Evolucao de Exames</div>
                    <div className="text-xs text-slate-400">Analise de tendencias</div>
                  </div>
                </div>
                <div className="text-sm text-slate-600">
                  Acompanhe a evolucao de marcadores como Glicose, Hemoglobina e Colesterol ao longo do tempo.
                </div>
                <div className="mt-3 inline-flex items-center text-red-700 text-sm font-semibold">Ver dashboard</div>
              </div>
            </Link>
            <Link href="/vida">
              <div className="card-hover p-5 cursor-pointer">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center text-xl">🫀</div>
                  <div>
                    <div className="font-bold text-slate-800">Modulo Vida</div>
                    <div className="text-xs text-slate-400">Estilo de vida interpretado pela IA</div>
                  </div>
                </div>
                <div className="text-sm text-slate-600">
                  Cadastre altura, peso, habitos, sono e saude emocional. Calculamos IMC, PA e score de saude.
                </div>
                <div className="mt-3 inline-flex items-center text-red-700 text-sm font-semibold">Atualizar dados</div>
              </div>
            </Link>
          </div>
        )}

        {/* Ultimos exames */}
        {data.records.length > 0 && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-800">Ultimos Exames</h2>
              <Link href="/records" className="text-red-700 text-sm font-semibold hover:underline">Ver todos</Link>
            </div>
            <div className="space-y-3">
              {data.records.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-sm">🧪</div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{r.title}</div>
                      <div className="text-xs text-slate-400">
                        {r.labName ?? '—'} · {new Date(r.recordDate).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>
                  <span className={STATUS_BADGE[r.resultStatus] ?? 'badge-pending'}>
                    {STATUS_LABEL[r.resultStatus] ?? r.resultStatus}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Proximas consultas */}
        {data.appts.length > 0 && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-800">Proximas Consultas</h2>
              <Link href="/appointments" className="text-red-700 text-sm font-semibold hover:underline">Ver todas</Link>
            </div>
            {data.appts.map((a: any) => (
              <div key={a.id} className="flex items-center gap-4 py-3 border-b border-slate-50 last:border-0">
                <div className="w-12 h-12 rounded-xl bg-red-50 flex flex-col items-center justify-center flex-shrink-0">
                  <div className="text-red-700 font-bold text-sm leading-none">
                    {new Date(a.appointmentAt).getDate()}
                  </div>
                  <div className="text-red-400 text-[10px]">
                    {new Date(a.appointmentAt).toLocaleDateString('pt-BR', { month: 'short' })}
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-slate-800 text-sm">{a.doctorName}</div>
                  <div className="text-xs text-slate-400">{a.specialty ?? '—'} · {a.location ?? '—'}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Especialidades e módulos */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/ophthalmology">
            <div className="card-hover p-4 flex items-center gap-3 cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-xl flex-shrink-0">👁️</div>
              <div>
                <div className="font-semibold text-slate-800 text-sm">Oftalmologia</div>
                <div className="text-xs text-slate-400">Exame de acuidade visual</div>
              </div>
            </div>
          </Link>
          <Link href="/occupational-health">
            <div className="card-hover p-4 flex items-center gap-3 cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-xl flex-shrink-0">🦺</div>
              <div>
                <div className="font-semibold text-slate-800 text-sm">Med. do Trabalho</div>
                <div className="text-xs text-slate-400">Avaliacao psicossocial</div>
              </div>
            </div>
          </Link>
          <Link href="/cirurgias">
            <div className="card-hover p-4 flex items-center gap-3 cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-xl flex-shrink-0">🔪</div>
              <div>
                <div className="font-semibold text-slate-800 text-sm">Cirurgias</div>
                <div className="text-xs text-slate-400">Histórico cirúrgico</div>
              </div>
            </div>
          </Link>
          <Link href="/medicos">
            <div className="card-hover p-4 flex items-center gap-3 cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-xl flex-shrink-0">👨‍⚕️</div>
              <div>
                <div className="font-semibold text-slate-800 text-sm">Medicos</div>
                <div className="text-xs text-slate-400">Buscar e vincular</div>
              </div>
            </div>
          </Link>
        </div>

      </div>
    </AppLayout>
  );
}
