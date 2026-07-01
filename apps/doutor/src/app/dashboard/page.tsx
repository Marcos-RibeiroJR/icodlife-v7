'use client';
// apps/doutor/src/app/dashboard/page.tsx
import { useEffect, useState } from 'react';
import DoctorShell from '@/components/ui/DoctorShell';
import { getMyDoctorProfile, getToken, type DoctorProfile } from '@/lib/auth';
import { api } from '@/lib/api';
import { PushPermissionBanner } from '@/components/push/PushPermissionBanner';

export default function DashboardPage() {
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      getMyDoctorProfile(),
      api.get('/doutor/patients').then(r => r.data),
    ]).then(([p, pats]) => {
      setProfile(p);
      setPatients(pats);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <DoctorShell>
      <div className="p-6 max-w-5xl">
        {/* Push notification opt-in — Sprint 16 */}
        <div className="mb-4">
          <PushPermissionBanner authToken={getToken()} />
        </div>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-800">
            {loading ? 'Carregando...' : `Ola, Dr. ${profile?.user.fullName?.split(' ')[0]}`}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Painel do Doutor — IcodLife</p>
        </div>

        {/* Status CRM */}
        {profile && profile.crmStatus === 'pending' && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <span className="text-amber-500 text-lg">⚠️</span>
            <div>
              <p className="text-sm font-medium text-amber-800">CRM em validacao</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Seu CRM {profile.crm}/{profile.uf} sera verificado em ate 24h. Voce ja pode usar o painel.
              </p>
            </div>
          </div>
        )}

        {/* Cards de resumo */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">DoctorID</p>
            <p className="text-lg font-bold text-blue-700 font-mono">{profile?.doctorId ?? '—'}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">Pacientes conectados</p>
            <p className="text-2xl font-bold text-slate-800">{patients.length}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">Status CRM</p>
            <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full
              ${profile?.crmStatus === 'verified' ? 'bg-green-100 text-green-700' :
                profile?.crmStatus === 'pending'  ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'}`}>
              {profile?.crmStatus === 'verified' ? 'Verificado' :
               profile?.crmStatus === 'pending'  ? 'Pendente'   : profile?.crmStatus ?? '—'}
            </span>
          </div>
        </div>

        {/* Especialidades */}
        {profile?.specialties?.length ? (
          <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
            <p className="text-xs font-medium text-slate-500 mb-3">Especialidades</p>
            <div className="flex flex-wrap gap-2">
              {profile.specialties.map(s => (
                <span key={s} className="bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1 rounded-full">
                  {s}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* Pacientes recentes */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-slate-800">Pacientes recentes</p>
            <a href="/patients" className="text-xs text-blue-600 hover:underline">Ver todos</a>
          </div>
          {patients.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              Nenhum paciente conectado ainda.<br />
              <span className="text-xs">Compartilhe seu DoctorID <span className="font-mono text-blue-600">{profile?.doctorId}</span> com seus pacientes.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {patients.slice(0, 5).map((p: any) => (
                <div key={p.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                  <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">
                    {p.user?.fullName?.[0] ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{p.user?.fullName}</p>
                    <p className="text-xs text-slate-400">{p.specialty || 'Geral'}</p>
                  </div>
                  <a href={`/patients/${p.id}`}
                    className="text-xs text-blue-600 hover:underline">Ver</a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DoctorShell>
  );
}
