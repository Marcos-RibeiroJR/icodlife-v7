'use client';
// apps/doutor/src/app/patients/page.tsx
import { useEffect, useState } from 'react';
import Link from 'next/link';
import DoctorShell from '@/components/ui/DoctorShell';
import { api } from '@/lib/api';

export default function PatientsPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');

  useEffect(() => {
    api.get('/doutor/patients').then(r => setPatients(r.data)).finally(() => setLoading(false));
  }, []);

  const filtered = patients.filter(p =>
    p.user?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    p.user?.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DoctorShell>
      <div className="p-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Pacientes</h1>
            <p className="text-slate-500 text-sm mt-0.5">{patients.length} paciente(s) conectado(s)</p>
          </div>
        </div>

        {/* Busca */}
        <div className="mb-4">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {loading ? (
          <div className="text-slate-400 text-sm">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <p className="text-slate-400 text-sm">
              {search ? 'Nenhum paciente encontrado.' : 'Nenhum paciente conectado ainda.'}
            </p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Paciente</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">ICODE</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Especialidade</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Conectado em</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p: any) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-700">
                          {p.user?.fullName?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{p.user?.fullName}</p>
                          <p className="text-xs text-slate-400">{p.user?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-slate-600">{p.user?.icode ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-600">{p.specialty || 'Geral'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-400">
                        {new Date(p.connectedAt).toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/patients/${p.id}`}
                        className="text-xs text-blue-600 hover:underline font-medium">
                        Ver prontuario
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DoctorShell>
  );
}
