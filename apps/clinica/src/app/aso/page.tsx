'use client';
// apps/clinica/src/app/aso/page.tsx
import { useEffect, useState } from 'react';
import ClinicShell from '@/components/ui/ClinicShell';
import { clinicApi } from '@/lib/api';

const EXAM_LABEL: Record<string, string> = {
  admissional: 'Admissional', periodico: 'Periódico', retorno: 'Retorno ao trabalho',
  mudanca_funcao: 'Mudança de função', demissional: 'Demissional',
};
const RESULT_COLOR: Record<string, string> = {
  apto: 'bg-green-100 text-green-700',
  apto_restricoes: 'bg-amber-100 text-amber-700',
  inapto: 'bg-red-100 text-red-700',
};
const RESULT_LABEL: Record<string, string> = {
  apto: 'Apto', apto_restricoes: 'Apto c/ restrições', inapto: 'Inapto',
};
const PSY_TIER_BADGE: Record<string, string> = {
  baixo: 'bg-green-100 text-green-700', moderado: 'bg-yellow-100 text-yellow-700',
  alto: 'bg-orange-100 text-orange-700', critico: 'bg-red-100 text-red-700',
};

export default function AsoPage() {
  const [asos, setAsos]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    clinicApi.listAsos()
      .then(r => setAsos(r.data))
      .catch(err => setError(err.response?.data?.message ?? 'Erro ao carregar ASOs'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ClinicShell>
      <div className="p-6 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-800">ASO — Atestados de Saúde Ocupacional</h1>
          <p className="text-slate-500 text-sm mt-0.5">Emitidos por qualquer médico da clínica ({asos.length})</p>
        </div>

        {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Carregando...</div>
          ) : asos.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">Nenhum ASO emitido ainda.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-medium">Trabalhador</th>
                  <th className="px-4 py-3 font-medium">Empresa</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Data do exame</th>
                  <th className="px-4 py-3 font-medium">Resultado</th>
                  <th className="px-4 py-3 font-medium">Risco psicossocial</th>
                </tr>
              </thead>
              <tbody>
                {asos.map((a: any) => (
                  <tr key={a.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-800">{a.workerName}</td>
                    <td className="px-4 py-3 text-slate-600">{a.companyName}</td>
                    <td className="px-4 py-3 text-slate-600">{EXAM_LABEL[a.examType] ?? a.examType}</td>
                    <td className="px-4 py-3 text-slate-600">{new Date(a.examDate).toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${RESULT_COLOR[a.result] ?? 'bg-slate-100 text-slate-700'}`}>
                        {RESULT_LABEL[a.result] ?? a.result}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {a.psychosocialSnapshot ? (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PSY_TIER_BADGE[a.psychosocialSnapshot.overallTier] ?? 'bg-slate-100 text-slate-700'}`}>
                          🧠 {a.psychosocialSnapshot.overallScore}/100
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">— não compartilhado —</span>
                      )}
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
