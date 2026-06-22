'use client';
// apps/web/src/app/share/[token]/page.tsx
// Página pública — sem autenticação — exibe dados médicos via token temporário
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const BP_CLASS_LABELS: Record<string, { label: string; color: string }> = {
  normal:       { label: 'Normal',          color: 'text-green-700 bg-green-100' },
  elevado:      { label: 'Elevado',         color: 'text-yellow-700 bg-yellow-100' },
  hipertensao1: { label: 'Hipertensão G1',  color: 'text-orange-700 bg-orange-100' },
  hipertensao2: { label: 'Hipertensão G2',  color: 'text-red-700 bg-red-100' },
  crise:        { label: 'Crise Hipert.',   color: 'text-red-900 bg-red-200' },
};

export default function ShareViewPage() {
  const params = useParams();
  const token = params?.token as string;
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    axios.get(`${API_BASE}/share/view/${token}`)
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.message || 'Link expirado ou inválido.'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-slate-500 text-sm">Carregando dados...</div>
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

  const { user, token: tokenInfo, exams, medications, bpReadings } = data;
  const isFullAccess = tokenInfo?.accessLevel === 'full' || tokenInfo?.accessLevel === 'custom';
  const expiresAt = tokenInfo?.expiresAt ? new Date(tokenInfo.expiresAt) : null;
  const age = user?.birthDate
    ? Math.floor((Date.now() - new Date(user.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50">
      {/* Header */}
      <div className="bg-[#7B1E1E] text-white px-6 py-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-xl">🩺</div>
        <div>
          <div className="font-bold text-lg">IcodLife</div>
          <div className="text-white/50 text-xs">Prontuário compartilhado temporário</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-xs text-white/60">Acesso {tokenInfo?.accessLevel === 'full' ? 'completo' : 'básico'}</div>
          {expiresAt && (
            <div className="text-xs text-white/40">
              Expira: {expiresAt.toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-6 space-y-5">

        {/* LGPD notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 flex gap-2">
          <span>🛡️</span>
          <span>Este acesso é temporário, auditado (IP registrado) e autorizado pelo paciente conforme a LGPD. Não armazene os dados exibidos.</span>
        </div>

        {/* Identificação */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Identificação</h2>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-300 to-rose-700 flex items-center justify-center text-white font-bold text-2xl">
              {user?.fullName?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            <div>
              <div className="text-xl font-bold text-slate-800">{user?.fullName}</div>
              <div className="text-sm text-slate-500 mt-1">
                {age !== null && `${age} anos · `}
                {user?.gender === 'male' ? 'Masculino' : user?.gender === 'female' ? 'Feminino' : 'Outro'}
              </div>
            </div>
          </div>
        </div>

        {/* Dados vitais */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Dados Médicos Essenciais</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-red-50 rounded-xl p-4">
              <div className="text-xs text-red-500 font-semibold uppercase tracking-wide mb-1">Tipo Sanguíneo</div>
              <div className="text-3xl font-bold text-red-700">{user?.bloodType || '—'}</div>
            </div>
            <div className="bg-amber-50 rounded-xl p-4">
              <div className="text-xs text-amber-600 font-semibold uppercase tracking-wide mb-1">Doador de Órgãos</div>
              <div className="text-xl font-bold text-amber-700">{user?.isDonor ? '✓ Sim' : 'Não'}</div>
            </div>
          </div>

          {user?.allergies?.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Alergias</div>
              <div className="flex flex-wrap gap-2">
                {user.allergies.map((a: string) => (
                  <span key={a} className="px-3 py-1.5 bg-orange-100 text-orange-800 rounded-lg text-sm font-medium">⚠️ {a}</span>
                ))}
              </div>
            </div>
          )}

          {user?.chronicConditions?.length > 0 && isFullAccess && (
            <div className="mt-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Condições Crônicas</div>
              <div className="flex flex-wrap gap-2">
                {user.chronicConditions.map((c: string) => (
                  <span key={c} className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Contato de emergência */}
        {(user?.emergencyContactName || user?.emergencyContactPhone) && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Contato de Emergência</h2>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-xl">📞</div>
              <div>
                <div className="font-semibold text-slate-800">{user.emergencyContactName || '—'}</div>
                <div className="text-slate-500 text-sm">{user.emergencyContactPhone || '—'}</div>
              </div>
            </div>
          </div>
        )}

        {/* Pressão Arterial */}
        {isFullAccess && bpReadings?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Pressão Arterial Recente</h2>
            <div className="space-y-2">
              {bpReadings.map((r: any, i: number) => {
                const cls = BP_CLASS_LABELS[r.classification] || { label: r.classification, color: 'text-slate-600 bg-slate-100' };
                return (
                  <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="text-lg font-bold text-slate-800">{r.systolic}/{r.diastolic}</div>
                    <div className="text-sm text-slate-400">mmHg</div>
                    {r.pulse && <div className="text-sm text-slate-500">❤️ {r.pulse} bpm</div>}
                    <span className={`ml-auto text-xs font-semibold px-2 py-1 rounded-full ${cls.color}`}>{cls.label}</span>
                    <div className="text-xs text-slate-400">
                      {new Date(r.measuredAt).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Medicamentos */}
        {isFullAccess && medications?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Medicamentos em Uso</h2>
            <div className="space-y-2">
              {medications.map((m: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <span className="text-xl">💊</span>
                  <div>
                    <div className="font-semibold text-slate-800 text-sm">{m.name}</div>
                    <div className="text-xs text-slate-500">{m.dosage} · {m.frequency}{m.condition ? ` · ${m.condition}` : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Exames recentes */}
        {isFullAccess && exams?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Exames Recentes</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                    <th className="pb-2">Exame</th>
                    <th className="pb-2">Resultado</th>
                    <th className="pb-2">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {exams.map((e: any) => {
                    const val = typeof e.results === 'object' ? JSON.stringify(e.results) : String(e.results ?? '—');
                    const inRange = e.normalRangeMin != null && e.normalRangeMax != null
                      ? (Number(e.results) >= e.normalRangeMin && Number(e.results) <= e.normalRangeMax)
                      : null;
                    return (
                      <tr key={e.id}>
                        <td className="py-2 font-medium text-slate-700">{e.examType}</td>
                        <td className="py-2">
                          <span className={`font-semibold ${inRange === false ? 'text-red-600' : 'text-slate-700'}`}>
                            {val} {e.unit || ''}
                          </span>
                          {inRange === false && <span className="ml-1 text-xs text-red-500">⚠️</span>}
                        </td>
                        <td className="py-2 text-slate-400">
                          {e.examDate ? new Date(e.examDate).toLocaleDateString('pt-BR') : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Aviso básico */}
        {!isFullAccess && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-500 text-center">
            🔒 Acesso básico — exames, medicamentos e PA não incluídos neste link.
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 pb-6">
          Gerado por IcodLife · Acesso autorizado pelo paciente · Dados confidenciais
        </div>
      </div>
    </div>
  );
}
