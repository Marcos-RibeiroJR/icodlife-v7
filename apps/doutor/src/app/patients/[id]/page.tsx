'use client';
// apps/doutor/src/app/patients/[id]/page.tsx
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import DoctorShell from '@/components/ui/DoctorShell';
import { api } from '@/lib/api';

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/doutor/patients`).then(r => {
      const p = r.data.find((x: any) => x.id === id);
      setPatient(p ?? null);
    }).finally(() => setLoading(false));
  }, [id]);

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
      <div className="p-6 max-w-3xl">
        <div className="flex items-center gap-2 mb-6">
          <Link href="/patients" className="text-blue-600 hover:underline text-sm">Pacientes</Link>
          <span className="text-slate-400 text-sm">/</span>
          <span className="text-sm text-slate-600">{u?.fullName}</span>
        </div>

        {/* Cabecalho do paciente */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-2xl font-bold text-blue-700">
              {u?.fullName?.[0]}
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-slate-800">{u?.fullName}</h1>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {age && <span className="text-sm text-slate-500">{age} anos</span>}
                {u?.gender && <span className="text-sm text-slate-500">{u.gender === 'male' ? 'Masculino' : u.gender === 'female' ? 'Feminino' : 'Outro'}</span>}
                {u?.bloodType && u.bloodType !== 'unknown' && (
                  <span className="text-sm font-medium text-red-600">
                    {u.bloodType.replace('_PLUS', '+').replace('_MINUS', '-')}
                  </span>
                )}
                {u?.icode && <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{u.icode}</span>}
              </div>
            </div>
            <div className="text-right">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                ${patient.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                {patient.status === 'active' ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          </div>
        </div>

        {/* Dados de saude basicos */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Alergias */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-medium text-slate-500 mb-2">Alergias</p>
            {u?.allergies?.length ? (
              <div className="flex flex-wrap gap-1">
                {u.allergies.map((a: string) => (
                  <span key={a} className="bg-red-50 text-red-700 text-xs px-2 py-0.5 rounded-full">{a}</span>
                ))}
              </div>
            ) : <p className="text-xs text-slate-400">Nenhuma registrada</p>}
          </div>

          {/* Condicoes cronicas */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-medium text-slate-500 mb-2">Condicoes cronicas</p>
            {u?.chronicConditions?.length ? (
              <div className="flex flex-wrap gap-1">
                {u.chronicConditions.map((c: string) => (
                  <span key={c} className="bg-amber-50 text-amber-700 text-xs px-2 py-0.5 rounded-full">{c}</span>
                ))}
              </div>
            ) : <p className="text-xs text-slate-400">Nenhuma registrada</p>}
          </div>
        </div>

        {/* Notas do vinculo */}
        {patient.notes && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
            <p className="text-xs font-medium text-slate-500 mb-2">Notas do vinculo</p>
            <p className="text-sm text-slate-700">{patient.notes}</p>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
          <p className="font-medium mb-1">Prontuario completo</p>
          <p className="text-xs text-blue-600">
            Para acessar exames, medicamentos e historico completo, o paciente precisa compartilhar
            seu prontuario via QR Code. Este recurso estara disponivel no Sprint 7.
          </p>
        </div>
      </div>
    </DoctorShell>
  );
}
