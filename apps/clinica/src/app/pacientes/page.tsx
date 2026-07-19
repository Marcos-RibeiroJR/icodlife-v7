'use client';
// apps/clinica/src/app/pacientes/page.tsx
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ClinicShell from '@/components/ui/ClinicShell';
import { clinicApi } from '@/lib/api';

function calcAge(dob?: string) {
  if (!dob) return null;
  const d = new Date(dob);
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

export default function PacientesPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<any[]>([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  // Abre a Agenda já com o paciente (e o médico, se houver só um) pré-selecionados,
  // pronto pra gerar a consulta que originará o ASO.
  const gerarConsulta = (p: any) => {
    const doctors = p.doctors ?? [];
    const doctorId = doctors.length === 1 ? doctors[0].doctorId : '';
    const params = new URLSearchParams({
      newPatientUserId: p.id,
      newPatientName:   p.fullName ?? '',
      newPatientIcode:  p.icode ?? '',
      newType:          'exame',
      ...(doctorId ? { newDoctorId: doctorId } : {}),
    });
    router.push(`/agenda?${params.toString()}`);
  };

  useEffect(() => {
    clinicApi.listPatients()
      .then(r => setPatients(r.data))
      .catch(err => setError(err.response?.data?.message ?? 'Erro ao carregar pacientes'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p: any) =>
      p.fullName?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.icode?.toLowerCase().includes(q)
    );
  }, [patients, search]);

  return (
    <ClinicShell>
      <div className="p-6 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-800">Pacientes</h1>
          <p className="text-slate-500 text-sm mt-0.5">Pacientes atendidos por qualquer médico da clínica ({patients.length})</p>
        </div>

        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome, e-mail ou ICODE..."
          className="w-full max-w-md mb-6 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />

        {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">Nenhum paciente encontrado.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-medium">Paciente</th>
                  <th className="px-4 py-3 font-medium">Idade</th>
                  <th className="px-4 py-3 font-medium">Tipo sanguíneo</th>
                  <th className="px-4 py-3 font-medium">Atendido por</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p: any) => (
                  <tr key={p.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{p.fullName}</p>
                      <p className="text-xs text-slate-400">{p.icode} · {p.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{calcAge(p.dateOfBirth) ?? '—'} anos</td>
                    <td className="px-4 py-3 text-slate-600">{p.bloodType ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {(p.doctors ?? []).map((d: any) => d.doctorName).filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => gerarConsulta(p)}
                        className="text-xs font-medium text-indigo-600 hover:underline whitespace-nowrap"
                        title="Abrir a Agenda com este paciente pré-selecionado, pronto pra gerar a consulta (ASO)"
                      >
                        + Gerar Consulta
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </ClinicShell>
  );
}
