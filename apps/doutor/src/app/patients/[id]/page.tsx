'use client';
// apps/doutor/src/app/patients/[id]/page.tsx
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import DoctorShell from '@/components/ui/DoctorShell';
import { api } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';
import axios from 'axios';

const PRONTUARIO_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

const BP_CLASS: Record<string, { label: string; color: string }> = {
  normal:       { label: 'Normal',        color: 'bg-green-100 text-green-700'  },
  elevado:      { label: 'Elevado',       color: 'bg-yellow-100 text-yellow-700'},
  hipertensao1: { label: 'Hipert. G1',    color: 'bg-orange-100 text-orange-700'},
  hipertensao2: { label: 'Hipert. G2',    color: 'bg-red-100 text-red-700'      },
  crise:        { label: 'Crise Hipert.', color: 'bg-red-200 text-red-900'      },
};

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [patient, setPatient]   = useState<any>(null);
  const [loading, setLoading]   = useState(true);

  // Prontuário QR
  const [token,      setToken]      = useState('');
  const [prontuario, setProntuario] = useState<any>(null);
  const [pLoading,   setPLoading]   = useState(false);
  const [pError,     setPError]     = useState('');

  useEffect(() => {
    api.get('/doutor/patients').then(r => {
      const p = r.data.find((x: any) => x.id === id);
      setPatient(p ?? null);
    }).finally(() => setLoading(false));
  }, [id]);

  const readProntuario = async () => {
    if (!token.trim()) { setPError('Informe o token ou escaneie o QR Code'); return; }
    setPLoading(true); setPError(''); setProntuario(null);
    try {
      const doctorUser = getStoredUser();
      const name = doctorUser?.fullName ?? 'Médico IcodLife';
      const r = await axios.get(
        `${PRONTUARIO_API}/prontuario/public/${token.trim()}?name=${encodeURIComponent(name)}`
      );
      setProntuario(r.data);
    } catch (e: any) {
      setPError(e.response?.data?.message || 'Token inválido ou expirado');
    } finally { setPLoading(false); }
  };

  if (loading) return <DoctorShell><div className="p-6 text-slate-400">Carregando...</div></DoctorShell>;
  if (!patient) return (
    <DoctorShell>
      <div className="p-6">
        <p className="text-slate-500">Paciente nao encontrado.</p>
        <Link href="/patients" className="text-blue-600 hover:underline text-sm mt-2 block">Voltar</Link>
      </div>
    </DoctorShell>
  );

  const u = patient.user;
  const age = u?.dateOfBirth
    ? Math.floor((Date.now() - new Date(u.dateOfBirth).getTime()) / 31_536_000_000)
    : null;

  return (
    <DoctorShell>
      <div className="p-6 max-w-3xl space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Link href="/patients" className="text-blue-600 hover:underline text-sm">Pacientes</Link>
          <span className="text-slate-400 text-sm">/</span>
          <span className="text-sm text-slate-600">{u?.fullName}</span>
        </div>

        {/* Cabecalho */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-2xl font-bold text-blue-700">
              {u?.fullName?.[0]}
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-slate-800">{u?.fullName}</h1>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {age && <span className="text-sm text-slate-500">{age} anos</span>}
                {u?.gender && <span className="text-sm text-slate-500">{u.gender === 'male' ? 'Masc.' : u.gender === 'female' ? 'Fem.' : 'Outro'}</span>}
                {u?.bloodType && u.bloodType !== 'unknown' && (
                  <span className="text-sm font-medium text-red-600">
                    {u.bloodType.replace('_PLUS', '+').replace('_MINUS', '-')}
                  </span>
                )}
                {u?.icode && <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{u.icode}</span>}
              </div>
            </div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
              ${patient.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
              {patient.status === 'active' ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        </div>

        {/* Dados basicos */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-medium text-slate-500 mb-2">Alergias</p>
            {u?.allergies?.length
              ? u.allergies.map((a: string) => <span key={a} className="bg-red-50 text-red-700 text-xs px-2 py-0.5 rounded-full mr-1">{a}</span>)
              : <p className="text-xs text-slate-400">Nenhuma</p>}
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-medium text-slate-500 mb-2">Condições crônicas</p>
            {u?.chronicConditions?.length
              ? u.chronicConditions.map((c: string) => <span key={c} className="bg-amber-50 text-amber-700 text-xs px-2 py-0.5 rounded-full mr-1">{c}</span>)
              : <p className="text-xs text-slate-400">Nenhuma</p>}
          </div>
        </div>

        {/* Acesso ao prontuario via QR Code */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-1">Ler prontuario compartilhado</h2>
          <p className="text-xs text-slate-500 mb-4">
            Solicite ao paciente que abra seu prontuario no IcodLife e mostre o QR Code.
            Digite o token abaixo ou escaneie com seu dispositivo.
          </p>

          <div className="flex gap-2 mb-3">
            <input
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="Cole o token aqui (UUID do QR Code)..."
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
            />
            <button
              onClick={readProntuario}
              disabled={pLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
              {pLoading ? 'Lendo...' : 'Ler'}
            </button>
          </div>

          {pError && <p className="text-red-600 text-xs">{pError}</p>}
        </div>

        {/* Dados do prontuario */}
        {prontuario && <ProntuarioView data={prontuario} />}
      </div>
    </DoctorShell>
  );
}

// ── Visualizador do prontuário ─────────────────────────────────────────────

function ProntuarioView({ data }: { data: any }) {
  const { meta, personal, allergies, chronicConditions, emergency,
          medications, lifestyle, examResults, bloodPressureReadings } = data;

  const levelLabel: Record<string, string> = { basic: 'Básico', medium: 'Médio', complete: 'Completo' };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2">
        <span className="text-blue-600 text-sm font-medium">
          Prontuario {levelLabel[meta?.level] ?? meta?.level} · {personal?.fullName}
        </span>
        <span className="ml-auto text-xs text-blue-500">
          Expira {new Date(meta?.expiresAt).toLocaleString('pt-BR')}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 mb-2">Alergias</p>
          {allergies?.length
            ? allergies.map((a: string) => <span key={a} className="bg-red-50 text-red-700 text-xs px-2 py-0.5 rounded-full mr-1">{a}</span>)
            : <p className="text-xs text-slate-400">Nenhuma</p>}
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 mb-2">Condições crônicas</p>
          {chronicConditions?.length
            ? chronicConditions.map((c: string) => <span key={c} className="bg-amber-50 text-amber-700 text-xs px-2 py-0.5 rounded-full mr-1">{c}</span>)
            : <p className="text-xs text-slate-400">Nenhuma</p>}
        </div>
      </div>

      {medications && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 mb-2">Medicamentos ativos</p>
          {medications.length === 0
            ? <p className="text-xs text-slate-400">Nenhum</p>
            : medications.map((m: any, i: number) => (
                <div key={i} className="text-sm text-slate-700 mb-1">
                  <span className="font-medium">{m.name}</span>
                  {m.dosage && <span className="text-slate-500 ml-1">— {m.dosage}</span>}
                </div>
              ))}
        </div>
      )}

      {examResults && examResults.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 mb-3">Exames recentes</p>
          {examResults.map((ex: any, i: number) => (
            <div key={i} className="border-b border-slate-100 last:border-0 pb-2 mb-2">
              <p className="text-sm font-medium text-slate-800">
                {ex.examType} · {new Date(ex.examDate).toLocaleDateString('pt-BR')}
              </p>
              {ex.aiSummary && <p className="text-xs text-slate-500 mt-0.5">{ex.aiSummary}</p>}
            </div>
          ))}
        </div>
      )}

      {bloodPressureReadings && bloodPressureReadings.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 mb-3">Pressão arterial</p>
          {bloodPressureReadings.slice(0, 5).map((bp: any, i: number) => {
            const cls = BP_CLASS[bp.classification] ?? { label: bp.classification, color: 'bg-slate-100 text-slate-600' };
            return (
              <div key={i} className="flex items-center justify-between text-sm mb-1">
                <span className="text-xs text-slate-400 w-24">{new Date(bp.measuredAt).toLocaleDateString('pt-BR')}</span>
                <span className="font-mono font-semibold text-slate-800">{bp.systolic}/{bp.diastolic}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${cls.color}`}>{cls.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
