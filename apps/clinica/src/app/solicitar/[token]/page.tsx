'use client';
// apps/clinica/src/app/solicitar/[token]/page.tsx
// Formulário PÚBLICO (sem login) para a empresa cliente enviar uma
// solicitação de exame/consulta — substitui o envio informal por e-mail.
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { publicIntakeApi } from '@/lib/api';

const EXAM_LABEL: Record<string, string> = {
  admissional: 'Admissional', periodico: 'Periódico', retorno: 'Retorno ao trabalho',
  mudanca_funcao: 'Mudança de função', demissional: 'Demissional',
};

export default function SolicitarAtendimentoPage() {
  const params = useParams();
  const token = String(params?.token ?? '');

  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState({
    patientName: '', patientIcode: '', examType: 'periodico',
    requestedBy: '', requesterEmail: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<any>(null);

  useEffect(() => {
    if (!token) return;
    publicIntakeApi.getCompany(token)
      .then((r) => setCompany(r.data))
      .catch((err) => setLoadError(err.response?.data?.message ?? 'Link inválido ou expirado.'))
      .finally(() => setLoading(false));
  }, [token]);

  const submit = async () => {
    if (!form.patientName || !form.examType) return;
    setSaving(true);
    setError('');
    try {
      const { data } = await publicIntakeApi.submit(token, form);
      setDone(data);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Erro ao enviar solicitação. Tente novamente.');
    } finally { setSaving(false); }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Carregando...</div>;
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-6 text-center">{loadError}</div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
          <div className="text-4xl mb-3">✅</div>
          <h1 className="font-bold text-slate-800 text-lg mb-2">Solicitação enviada</h1>
          <p className="text-slate-600 text-sm">
            {done.status === 'linked'
              ? 'O paciente já está cadastrado no IcodLife e foi vinculado automaticamente pelo ICODE. A clínica foi notificada.'
              : 'Recebemos a solicitação. Se o funcionário ainda não tiver conta no IcodLife, peça para ele se cadastrar e preencher o questionário de exame de trabalho antes do atendimento.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-lg mx-auto py-10">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-800">Solicitação de exame/consulta</h1>
          <p className="text-slate-500 text-sm mt-1">
            {company?.nomeFantasia || company?.razaoSocial} — Medicina do Trabalho / IcodLife
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-100 text-blue-700 text-xs rounded-xl p-3">
            Se o funcionário já possui conta no IcodLife e informar o ICODE, o laudo psicossocial (se compartilhado)
            será enviado automaticamente para a clínica junto com esta solicitação.
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500">Nome do funcionário/paciente *</label>
            <input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
              value={form.patientName} onChange={(e) => setForm((f) => ({ ...f, patientName: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">ICODE do funcionário (se já cadastrado no IcodLife)</label>
            <input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
              value={form.patientIcode} onChange={(e) => setForm((f) => ({ ...f, patientIcode: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Tipo de exame *</label>
            <select className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
              value={form.examType} onChange={(e) => setForm((f) => ({ ...f, examType: e.target.value }))}>
              {Object.entries(EXAM_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500">Seu nome (RH/responsável)</label>
              <input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                value={form.requestedBy} onChange={(e) => setForm((f) => ({ ...f, requestedBy: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Seu e-mail</label>
              <input type="email" className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                value={form.requesterEmail} onChange={(e) => setForm((f) => ({ ...f, requesterEmail: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Observações</label>
            <textarea rows={3} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
              value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">{error}</div>}

          <button onClick={submit} disabled={saving || !form.patientName}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
            {saving ? 'Enviando...' : 'Enviar solicitação'}
          </button>
        </div>
      </div>
    </div>
  );
}
