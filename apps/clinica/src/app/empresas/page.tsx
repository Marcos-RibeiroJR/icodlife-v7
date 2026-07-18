'use client';
// apps/clinica/src/app/empresas/page.tsx
import { useEffect, useState } from 'react';
import ClinicShell from '@/components/ui/ClinicShell';
import { clinicApi } from '@/lib/api';

export default function EmpresasPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  useEffect(() => {
    clinicApi.listCompanies()
      .then(r => setCompanies(r.data))
      .catch(err => setError(err.response?.data?.message ?? 'Erro ao carregar empresas'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ClinicShell>
      <div className="p-6 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-800">Empresas</h1>
          <p className="text-slate-500 text-sm mt-0.5">Carteira de empresas (Medicina do Trabalho) de todos os médicos da clínica ({companies.length})</p>
        </div>

        {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Carregando...</div>
          ) : companies.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">Nenhuma empresa cadastrada ainda.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-medium">Razão social</th>
                  <th className="px-4 py-3 font-medium">CNPJ</th>
                  <th className="px-4 py-3 font-medium">Cidade/UF</th>
                  <th className="px-4 py-3 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c: any) => (
                  <tr key={c.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{c.nomeFantasia || c.razaoSocial}</p>
                      <p className="text-xs text-slate-400">{c.razaoSocial}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">{c.cnpj}</td>
                    <td className="px-4 py-3 text-slate-600">{[c.cidade, c.estado].filter(Boolean).join('/') || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.situacao === 'ativa' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                        {c.situacao}
                      </span>
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
