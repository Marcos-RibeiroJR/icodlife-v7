'use client';
// apps/clinica/src/app/financeiro/page.tsx
import { useEffect, useState } from 'react';
import ClinicShell from '@/components/ui/ClinicShell';
import StatCard from '@/components/ui/StatCard';
import { clinicApi } from '@/lib/api';

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function FinanceiroPage() {
  const [from, setFrom] = useState('');
  const [to, setTo]     = useState('');
  const [dre, setDre]   = useState<any>(null);
  const [porMedico, setPorMedico] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  const load = () => {
    setLoading(true); setError('');
    const params = { from: from || undefined, to: to || undefined };
    Promise.all([
      clinicApi.financeiroDre(params).then(r => r.data),
      clinicApi.financeiroPorMedico(params).then(r => r.data),
    ]).then(([d, pm]) => { setDre(d); setPorMedico(pm); })
      .catch(err => setError(err.response?.data?.message ?? 'Erro ao carregar financeiro'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <ClinicShell>
      <div className="p-6 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-800">Financeiro</h1>
          <p className="text-slate-500 text-sm mt-0.5">DRE consolidado da clínica e repasse por médico</p>
        </div>

        <div className="flex items-end gap-3 mb-6">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">De</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Até</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <button onClick={load}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            Filtrar
          </button>
        </div>

        {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Carregando...</div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-8">
              <StatCard label="Entradas" value={fmtBRL(dre?.entradas ?? 0)} />
              <StatCard label="Saídas" value={fmtBRL(dre?.saidas ?? 0)} />
              <StatCard label="Saldo" value={fmtBRL(dre?.saldo ?? 0)} />
            </div>

            {dre?.porCategoria?.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
                <p className="text-sm font-medium text-slate-800 mb-3">Por categoria</p>
                <div className="space-y-2">
                  {dre.porCategoria.map((c: any) => (
                    <div key={c.category} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 last:border-0">
                      <span className="text-slate-600">{c.category}</span>
                      <span className={c.total >= 0 ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>
                        {fmtBRL(c.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <p className="text-sm font-medium text-slate-800 px-4 pt-4 pb-2">Repasse por médico</p>
              {porMedico.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">Nenhum lançamento no período.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                      <th className="px-4 py-3 font-medium">Médico</th>
                      <th className="px-4 py-3 font-medium">Comissão</th>
                      <th className="px-4 py-3 font-medium">Faturamento bruto</th>
                      <th className="px-4 py-3 font-medium">Repasse ao médico</th>
                      <th className="px-4 py-3 font-medium">Margem da clínica</th>
                    </tr>
                  </thead>
                  <tbody>
                    {porMedico.map((m: any) => (
                      <tr key={m.doctorId} className="border-b border-slate-50 last:border-0">
                        <td className="px-4 py-3 font-medium text-slate-800">Dr(a). {m.doctorName}</td>
                        <td className="px-4 py-3 text-slate-600">{m.commissionPct}%</td>
                        <td className="px-4 py-3 text-slate-600">{fmtBRL(m.faturamentoBruto)}</td>
                        <td className="px-4 py-3 text-slate-600">{fmtBRL(m.repasseMedico)}</td>
                        <td className="px-4 py-3 text-slate-800 font-medium">{fmtBRL(m.margemClinica)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </ClinicShell>
  );
}
