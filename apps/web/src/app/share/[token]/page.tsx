'use client';
// apps/web/src/app/share/[token]/page.tsx
// Página pública — sem autenticação — exibe prontuário via QR Code token
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

const BP_CLASS: Record<string, { label: string; color: string }> = {
  normal:       { label: 'Normal',         color: 'text-green-700 bg-green-100'  },
  elevado:      { label: 'Elevado',        color: 'text-yellow-700 bg-yellow-100'},
  hipertensao1: { label: 'Hipert. G1',     color: 'text-orange-700 bg-orange-100'},
  hipertensao2: { label: 'Hipert. G2',     color: 'text-red-700 bg-red-100'      },
  crise:        { label: 'Crise Hipert.',  color: 'text-red-900 bg-red-200'      },
};

const LEVEL_LABELS: Record<string, { label: string; color: string }> = {
  basic:    { label: 'Básico',    color: 'bg-blue-100 text-blue-700'   },
  medium:   { label: 'Médio',     color: 'bg-purple-100 text-purple-700'},
  complete: { label: 'Completo',  color: 'bg-green-100 text-green-700' },
};

export default function ShareViewPage() {
  const { token }      = useParams<{ token: string }>();
  const searchParams   = useSearchParams();
  const name           = searchParams.get('name') ?? '';

  const [data,    setData]    = useState<any>(null);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const params = name ? `?name=${encodeURIComponent(name)}` : '';
    axios.get(`${API}/prontuario/public/${token}${params}`)
      .then(r  => setData(r.data))
      .catch(e => setError(e.response?.data?.message || 'Link expirado ou inválido.'))
      .finally(() => setLoading(false));
  }, [token, name]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-500 text-sm">Carregando prontuário...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">Acesso negado</h1>
        <p className="text-slate-500 text-sm">{error}</p>
        <p className="text-slate-400 text-xs mt-4">Este link pode ter expirado ou sido revogado pelo paciente.</p>
      </div>
    </div>
  );

  if (!data) return null;

  const { meta, personal, allergies, chronicConditions, emergency,
          medications, lifestyle, examResults, bloodPressureReadings } = data;

  const levelInfo = LEVEL_LABELS[meta?.level] ?? { label: meta?.level, color: 'bg-slate-100 text-slate-700' };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-4">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-400 mb-1">Prontuário IcodLife</p>
              <h1 className="text-xl font-bold text-slate-800">{personal.fullName}</h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {personal.icode && (
                  <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {personal.icode}
                  </span>
                )}
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${levelInfo.color}`}>
                  Acesso {levelInfo.label}
                </span>
              </div>
            </div>
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center text-2xl font-bold text-red-700">
              {personal.fullName?.[0]}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
            <div>
              <p className="text-xs text-slate-400">Tipo sanguíneo</p>
              <p className="text-sm font-semibold text-red-600 mt-0.5">
                {personal.bloodType !== 'unknown'
                  ? personal.bloodType.replace('_PLUS', '+').replace('_MINUS', '-')
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Sexo</p>
              <p className="text-sm font-medium text-slate-700 mt-0.5">
                {personal.gender === 'male' ? 'Masculino' : personal.gender === 'female' ? 'Feminino' : 'Outro'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Nascimento</p>
              <p className="text-sm font-medium text-slate-700 mt-0.5">
                {personal.dateOfBirth
                  ? new Date(personal.dateOfBirth).toLocaleDateString('pt-BR')
                  : '—'}
              </p>
            </div>
          </div>
          {meta?.expiresAt && (
            <p className="text-xs text-slate-400 mt-3">
              Expira em: {new Date(meta.expiresAt).toLocaleString('pt-BR')}
              {meta.generatedFor && ` · Para: ${meta.generatedFor}`}
            </p>
          )}
        </div>

        {/* Alergias + Condições */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-500 mb-2">ALERGIAS</p>
            {allergies?.length
              ? allergies.map((a: string) => (
                  <span key={a} className="inline-block bg-red-50 text-red-700 text-xs px-2 py-0.5 rounded-full mr-1 mb-1">{a}</span>
                ))
              : <p className="text-xs text-slate-400">Nenhuma</p>}
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-500 mb-2">CONDIÇÕES CRÔNICAS</p>
            {chronicConditions?.length
              ? chronicConditions.map((c: string) => (
                  <span key={c} className="inline-block bg-amber-50 text-amber-700 text-xs px-2 py-0.5 rounded-full mr-1 mb-1">{c}</span>
                ))
              : <p className="text-xs text-slate-400">Nenhuma</p>}
          </div>
        </div>

        {/* Contato de emergência */}
        {(emergency?.name || emergency?.phone) && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-500 mb-2">CONTATO DE EMERGÊNCIA</p>
            <p className="text-sm text-slate-700">{emergency.name}
              {emergency.rel && <span className="text-slate-400 ml-1">({emergency.rel})</span>}
            </p>
            {emergency.phone && <p className="text-sm text-slate-600 mt-0.5">{emergency.phone}</p>}
          </div>
        )}

        {/* MEDIUM: Medicamentos */}
        {medications && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-500 mb-3">MEDICAMENTOS ATIVOS</p>
            {medications.length === 0 ? (
              <p className="text-xs text-slate-400">Nenhum medicamento ativo</p>
            ) : (
              <div className="space-y-2">
                {medications.map((m: any, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{m.name}</p>
                      <p className="text-xs text-slate-500">{m.dosage} · {m.prescribingDoctor && `Dr(a). ${m.prescribingDoctor}`}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MEDIUM: Estilo de vida */}
        {lifestyle && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-500 mb-3">ESTILO DE VIDA</p>
            <div className="grid grid-cols-3 gap-3">
              {lifestyle.bmi && (
                <div>
                  <p className="text-xs text-slate-400">IMC</p>
                  <p className="text-sm font-semibold text-slate-800">{Number(lifestyle.bmi).toFixed(1)}</p>
                  <p className="text-xs text-slate-400">{lifestyle.bmiCategory}</p>
                </div>
              )}
              {lifestyle.smokingStatus && (
                <div>
                  <p className="text-xs text-slate-400">Tabagismo</p>
                  <p className="text-sm font-medium text-slate-700">
                    {lifestyle.smokingStatus === 'never' ? 'Não fuma' :
                     lifestyle.smokingStatus === 'former' ? 'Ex-fumante' : 'Fumante'}
                  </p>
                </div>
              )}
              {lifestyle.healthScore && (
                <div>
                  <p className="text-xs text-slate-400">Score saúde</p>
                  <p className="text-sm font-semibold text-green-600">{lifestyle.healthScore}/100</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* COMPLETE: Exames recentes */}
        {examResults && examResults.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-500 mb-3">EXAMES RECENTES (últimos 10)</p>
            <div className="space-y-3">
              {examResults.map((exam: any, i: number) => (
                <div key={i} className="border border-slate-100 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-slate-800">
                      {exam.examType} · {new Date(exam.examDate).toLocaleDateString('pt-BR')}
                    </p>
                    {exam.aiRiskLevel && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                        ${exam.aiRiskLevel === 'normal' ? 'bg-green-100 text-green-700' :
                          exam.aiRiskLevel === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'}`}>
                        {exam.aiRiskLevel}
                      </span>
                    )}
                  </div>
                  {exam.aiSummary && <p className="text-xs text-slate-500">{exam.aiSummary}</p>}
                  {exam.items?.length > 0 && (
                    <div className="mt-2 grid grid-cols-2 gap-1">
                      {exam.items.slice(0, 6).map((item: any, j: number) => (
                        <div key={j} className={`text-xs px-2 py-0.5 rounded flex items-center gap-1
                          ${item.status === 'normal' ? 'bg-slate-50 text-slate-600' :
                            ['high','critical_high'].includes(item.status) ? 'bg-red-50 text-red-700' :
                            'bg-yellow-50 text-yellow-700'}`}>
                          <span className="font-medium">{item.marker}</span>
                          <span>{Number(item.value).toFixed(1)} {item.unit}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* COMPLETE: Pressão arterial */}
        {bloodPressureReadings && bloodPressureReadings.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-500 mb-3">PRESSÃO ARTERIAL (últimas 10)</p>
            <div className="space-y-2">
              {bloodPressureReadings.map((bp: any, i: number) => {
                const cls = BP_CLASS[bp.classification] ?? { label: bp.classification, color: 'bg-slate-100 text-slate-600' };
                return (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 text-xs w-24 flex-shrink-0">
                      {new Date(bp.measuredAt).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="font-mono font-semibold text-slate-800">
                      {bp.systolic}/{bp.diastolic}
                      {bp.pulse ? ` · ${bp.pulse}bpm` : ''}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${cls.color}`}>{cls.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-400 pb-4">
          Prontuário digital IcodLife · Dados fornecidos pelo próprio paciente
        </p>
      </div>
    </div>
  );
}
