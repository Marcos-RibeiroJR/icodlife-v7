'use client';
// apps/clinica/src/app/dashboard/page.tsx
import { useEffect, useState } from 'react';
import ClinicShell from '@/components/ui/ClinicShell';
import StatCard from '@/components/ui/StatCard';
import { getMyClinicProfile, type ClinicProfile } from '@/lib/auth';
import { clinicApi } from '@/lib/api';

export default function DashboardPage() {
  const [profile, setProfile]   = useState<ClinicProfile | null>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [agenda, setAgenda]     = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    Promise.all([
      getMyClinicProfile(),
      clinicApi.listPatients().then(r => r.data).catch(() => []),
      clinicApi.listAgenda({ date: today }).then(r => r.data).catch(() => []),
    ]).then(([p, pats, ag]) => {
      setProfile(p);
      setPatients(pats);
      setAgenda(ag);
    }).catch((err) => {
      setError(err.response?.data?.message ?? 'Erro ao carregar dados da clínica');
    }).finally(() => setLoading(false));
  }, []);

  return (
    <ClinicShell>
      <div className="p-6 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-800">
            {loading ? 'Carregando...' : profile?.nomeFantasia || profile?.razaoSocial}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Painel da Clínica — IcodLife</p>
        </div>

        {error && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            {error}
          </div>
        )}

        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard label="ClinicID" value={profile?.clinicCode ?? '—'} />
          <StatCard label="Médicos vinculados" value={profile?.doctorsCount ?? 0} />
          <StatCard label="Equipe" value={profile?.staffCount ?? 0} />
          <StatCard label="Pacientes" value={patients.length} />
        </div>

        {profile?.specialties?.length ? (
          <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
            <p className="text-xs font-medium text-slate-500 mb-3">Especialidades atendidas</p>
            <div className="flex flex-wrap gap-2">
              {profile.specialties.map(s => (
                <span key={s} className="bg-indigo-50 text-indigo-700 text-xs font-medium px-3 py-1 rounded-full">
                  {s}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-slate-800">Agenda de hoje</p>
            <a href="/agenda" className="text-xs text-indigo-600 hover:underline">Ver agenda completa</a>
          </div>
          {agenda.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              Nenhum atendimento agendado para hoje.
            </div>
          ) : (
            <div className="space-y-2">
              {agenda.slice(0, 6).map((a: any) => (
                <div key={a.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                  <div className="w-14 text-xs font-mono text-slate-500">
                    {new Date(a.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      Dr(a). {a.doctor?.user?.fullName ?? '—'}
                    </p>
                    <p className="text-xs text-slate-400">{a.procedure?.name ?? a.type ?? 'Consulta'}</p>
                  </div>
                  <span className="text-xs text-slate-400">{a.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ClinicShell>
  );
}
