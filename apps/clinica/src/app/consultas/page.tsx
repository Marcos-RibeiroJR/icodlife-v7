'use client';
// apps/clinica/src/app/consultas/page.tsx — Base de Consultas
import { useEffect, useState } from 'react';
import ClinicShell from '@/components/ui/ClinicShell';
import { clinicApi, consultationRequestsApi } from '@/lib/api';
import { IcodlifeUserPicker, type IcodlifeUser } from '@/components/ui/IcodlifeUserPicker';

const EXAM_LABEL: Record<string, string> = {
  admissional: 'Admissional', periodico: 'Periódico', retorno: 'Retorno ao trabalho',
  mudanca_funcao: 'Mudança de função', demissional: 'Demissional',
};
const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-600', linked: 'bg-blue-100 text-blue-700',
  queued: 'bg-amber-100 text-amber-700', in_service: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700', canceled: 'bg-red-100 text-red-700',
};
const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente (ICODE não localizado)', linked: 'Vinculado', queued: 'Na fila',
  in_service: 'Em atendimento', completed: 'Concluído', canceled: 'Cancelado',
};

const emptyForm = { companyId: '', patientName: '', patientIcode: '', examType: 'periodico', notes: '' };

export default function ConsultasPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [linkedUser, setLinkedUser] = useState<IcodlifeUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [linkCompanyId, setLinkCompanyId] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');

  const load = () => {
    setLoading(true);
    setLoadError('');
    Promise.all([
      consultationRequestsApi.list(statusFilter ? { status: statusFilter } : undefined),
      clinicApi.listCompanies(),
    ])
      .then(([r, c]) => { setRequests(r.data ?? []); setCompanies(c.data ?? []); })
      .catch((err) => setLoadError(err.response?.data?.message ?? 'Erro ao carregar a base de consultas'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!form.companyId || !form.patientName) return;
    setSaving(true);
    setError('');
    try {
      await consultationRequestsApi.create(form);
      setShowForm(false);
      setForm(emptyForm);
      setLinkedUser(null);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Erro ao registrar solicitação.');
    } finally { setSaving(false); }
  };

  const generateLink = async (companyId: string) => {
    setLinkCompanyId(companyId);
    setGeneratedLink('');
    try {
      const { data } = await clinicApi.rotateIntakeToken(companyId);
      const url = `${window.location.origin}/solicitar/${data.intakeToken}`;
      setGeneratedLink(url);
      if (navigator.clipboard) await navigator.clipboard.writeText(url);
    } catch {
      setGeneratedLink('Erro ao gerar link.');
    }
  };

  return (
    <ClinicShell>
      <div className="p-6 max-w-6xl">
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Base de Consultas</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Solicitações de exame/consulta enviadas pelas empresas clientes ({requests.length})
            </p>
          </div>
          <button onClick={() => setShowForm((s) => !s)}
            className="bg-[#B91C1C] hover:bg-[#7B1E1E] text-white font-semibold text-sm px-4 py-2 rounded-xl transition-colors">
            + Lançar solicitação manual
          </button>
        </div>

        {/* Link de intake por empresa */}
        <div className="mb-6 card p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="text-sm font-semibold text-slate-700 mb-2">Link de solicitação para a empresa preencher</div>
          <div className="flex items-center gap-2 flex-wrap">
            <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm" value={linkCompanyId}
              onChange={(e) => setLinkCompanyId(e.target.value)}>
              <option value="">Selecione a empresa...</option>
              {companies.map((c: any) => (
                <option key={c.id} value={c.id}>{c.nomeFantasia || c.razaoSocial}</option>
              ))}
            </select>
            <button disabled={!linkCompanyId} onClick={() => generateLink(linkCompanyId)}
              className="bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white text-sm font-semibold px-3 py-2 rounded-lg transition-colors">
              Gerar / copiar link
            </button>
            {generatedLink && <span className="text-xs text-slate-500 break-all">{generatedLink}</span>}
          </div>
        </div>

        {showForm && (
          <div className="card p-6 border-red-100 mb-6">
            <h3 className="font-bold text-slate-800 mb-1">Nova solicitação manual</h3>
            <p className="text-slate-500 text-xs mb-4">
              Busque o paciente no cadastro único iCODLIFE (pelo nome, ICODE ou e-mail) — o vínculo é automático.
              Se ele ainda não tiver conta na plataforma, preencha o nome manualmente.
            </p>

            <div className="mb-4">
              <label className="label">Buscar paciente no iCODLIFE</label>
              <IcodlifeUserPicker
                selected={linkedUser}
                onSelect={(u) => { setLinkedUser(u); setForm((f) => ({ ...f, patientName: u.fullName, patientIcode: u.icode || '' })); }}
                onClear={() => { setLinkedUser(null); setForm((f) => ({ ...f, patientIcode: '' })); }}
                placeholder="Buscar por nome, ICODE ou e-mail..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 md:col-span-1">
                <label className="label">Empresa *</label>
                <select className="input-field" value={form.companyId}
                  onChange={(e) => setForm((f) => ({ ...f, companyId: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {companies.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.nomeFantasia || c.razaoSocial}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Tipo de exame</label>
                <select className="input-field" value={form.examType}
                  onChange={(e) => setForm((f) => ({ ...f, examType: e.target.value }))}>
                  {Object.entries(EXAM_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Nome do paciente *</label>
                <input className="input-field" value={form.patientName}
                  disabled={!!linkedUser}
                  onChange={(e) => setForm((f) => ({ ...f, patientName: e.target.value }))} />
              </div>
              <div>
                <label className="label">ICODE</label>
                <input className="input-field" value={form.patientIcode}
                  disabled={!!linkedUser}
                  onChange={(e) => setForm((f) => ({ ...f, patientIcode: e.target.value }))}
                  placeholder="Preenchido automaticamente se vinculado" />
              </div>
              <div className="col-span-2">
                <label className="label">Observações</label>
                <textarea className="input-field" rows={2} value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>

            {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">{error}</div>}

            <div className="flex gap-3 mt-4">
              <button onClick={() => { setShowForm(false); setForm(emptyForm); setLinkedUser(null); setError(''); }}
                className="flex-1 border border-slate-200 text-slate-600 font-semibold py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={save} disabled={saving || !form.companyId || !form.patientName}
                className="flex-1 bg-[#B91C1C] text-white font-semibold py-2.5 rounded-xl hover:bg-[#7B1E1E] transition-colors disabled:opacity-60">
                {saving ? 'Salvando...' : 'Registrar'}
              </button>
            </div>
          </div>
        )}

        <div className="mb-4 flex gap-2 flex-wrap">
          <button onClick={() => setStatusFilter('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${!statusFilter ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
            Todos
          </button>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <button key={k} onClick={() => setStatusFilter(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${statusFilter === k ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
              {v}
            </button>
          ))}
        </div>

        {loadError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg flex items-center justify-between gap-3">
            <span>{loadError}</span>
            <button onClick={load} className="font-semibold underline flex-shrink-0">Tentar novamente</button>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Carregando...</div>
          ) : requests.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">Nenhuma solicitação registrada ainda.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-medium">Paciente</th>
                  <th className="px-4 py-3 font-medium">Empresa</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Origem</th>
                  <th className="px-4 py-3 font-medium">Recebido em</th>
                  <th className="px-4 py-3 font-medium">Laudo psicossocial</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r: any) => (
                  <tr key={r.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {r.patientName}
                      {r.patientIcode && <span className="ml-2 text-xs text-slate-400 font-mono">{r.patientIcode}</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.company?.nomeFantasia || r.company?.razaoSocial}</td>
                    <td className="px-4 py-3 text-slate-600">{EXAM_LABEL[r.examType] ?? r.examType}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{r.source === 'form' ? 'Formulário' : r.source === 'manual' ? 'Manual' : 'E-mail'}</td>
                    <td className="px-4 py-3 text-slate-600">{new Date(r.receivedAt).toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-3">
                      {r.psychosocialSnapshot ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                          {r.psychosocialSnapshot.overallScore}/100 · {r.psychosocialSnapshot.overallTier}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[r.status] ?? 'bg-slate-100 text-slate-600'}`}>
                        {STATUS_LABEL[r.status] ?? r.status}
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
