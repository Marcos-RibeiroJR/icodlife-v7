'use client';
// apps/doutor/src/app/aso/page.tsx
// Módulo ASO — Atestado de Saúde Ocupacional (NR-07). Emissão, listagem e impressão.
import { useEffect, useState, useCallback } from 'react';
import DoctorShell from '@/components/ui/DoctorShell';
import { asoApi, empresaApi } from '@/lib/api';

const EXAM_TYPES = [
  { key: 'admissional',    label: 'Admissional' },
  { key: 'periodico',      label: 'Periódico' },
  { key: 'retorno',        label: 'Retorno ao Trabalho' },
  { key: 'mudanca_funcao', label: 'Mudança de Função' },
  { key: 'demissional',    label: 'Demissional' },
];
const RESULTS = [
  { key: 'apto',            label: 'APTO',                  color: 'text-green-700 border-green-400 bg-green-50' },
  { key: 'apto_restricoes', label: 'APTO COM RESTRIÇÕES',   color: 'text-orange-700 border-orange-400 bg-orange-50' },
  { key: 'inapto',          label: 'INAPTO',                color: 'text-red-700 border-red-400 bg-red-50' },
];
const RISK_OPTIONS = [
  'Ruído', 'Calor', 'Frio', 'Vibração', 'Poeira', 'Produtos Químicos',
  'Agentes Biológicos', 'Trabalho em Altura', 'Eletricidade', 'Ergonomia',
];
const EXAM_OPTIONS = [
  'Audiometria', 'Espirometria', 'ECG', 'EEG', 'Acuidade Visual', 'Hemograma', 'Glicemia', 'RX',
];

const EXAM_LABEL: Record<string, string> = Object.fromEntries(EXAM_TYPES.map(t => [t.key, t.label]));
const RESULT_LABEL: Record<string, string> = Object.fromEntries(RESULTS.map(r => [r.key, r.label]));
const RESULT_BADGE: Record<string, string> = {
  apto: 'bg-green-100 text-green-700', apto_restricoes: 'bg-orange-100 text-orange-700', inapto: 'bg-red-100 text-red-700',
};

const EMPTY = {
  companyId: '',
  companyName: '', companyCnpj: '', companyAddress: '', companyPhone: '',
  workerName: '', workerCpf: '', workerRg: '', workerBirthDate: '', workerSex: '',
  workerRole: '', workerSector: '', workerRegistration: '', admissionDate: '',
  examType: 'admissional', examDate: '', jobDescription: '',
  risks: [] as string[], risksOther: '',
  complementaryExams: [] as string[], examsOther: '',
  result: 'apto', restrictions: '', observations: '',
  doctorName: '', doctorCrm: '', doctorUf: '', doctorSpecialty: '',
};

function fmtDate(d?: string | null) {
  return d ? new Date(d).toLocaleDateString('pt-BR') : '—';
}

// ── Download do PDF assinado do ASO (server-side, com QR de validação) ────────
async function downloadAsoPdf(a: any) {
  try {
    const res = await asoApi.pdf(a.id);
    const url = URL.createObjectURL(res.data as Blob);
    const link = document.createElement('a');
    link.href = url;
    const safe = (a.workerName || 'aso').normalize('NFD').replace(/[^\w]+/g, '-').toLowerCase();
    link.download = `aso-${safe}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch {
    alert('Erro ao gerar o PDF do ASO. Tente novamente.');
  }
}

export default function AsoPage() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState<any[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    asoApi.list().then(r => setList(r.data?.data ?? [])).catch(() => setList([])).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openForm = () => {
    setError('');
    empresaApi.list().then(r => setCompanies(r.data?.data ?? [])).catch(() => setCompanies([]));
    asoApi.context()
      .then(r => setForm({ ...EMPTY, ...r.data, examDate: new Date().toISOString().slice(0, 10) }))
      .catch(() => setForm({ ...EMPTY, examDate: new Date().toISOString().slice(0, 10) }));
    setShowForm(true);
  };

  const selectCompany = (id: string) => {
    const c = companies.find(x => x.id === id);
    if (!c) { setForm(f => ({ ...f, companyId: '' })); return; }
    const addr = [c.logradouro, c.numero, c.bairro, c.cidade, c.estado].filter(Boolean).join(', ');
    setForm(f => ({
      ...f,
      companyId: c.id,
      companyName: c.razaoSocial ?? '',
      companyCnpj: c.cnpj ?? '',
      companyAddress: addr,
      companyPhone: c.telefonePrincipal ?? c.telefoneRh ?? '',
    }));
  };

  const toggle = (field: 'risks' | 'complementaryExams', value: string) =>
    setForm(f => ({
      ...f,
      [field]: f[field].includes(value) ? f[field].filter(x => x !== value) : [...f[field], value],
    }));

  const submit = () => {
    setSaving(true); setError('');
    const risks = [...form.risks, ...(form.risksOther ? [form.risksOther] : [])];
    const complementaryExams = [...form.complementaryExams, ...(form.examsOther ? [form.examsOther] : [])];
    const { risksOther, examsOther, ...rest } = form;
    asoApi.create({ ...rest, risks, complementaryExams })
      .then(() => { setShowForm(false); setForm({ ...EMPTY }); return load(); })
      .catch(e => {
        const m = e?.response?.data?.message;
        setError(Array.isArray(m) ? m.join(' | ') : (m ?? 'Erro ao emitir o ASO.'));
      })
      .finally(() => setSaving(false));
  };

  const cancel = (id: string) => {
    if (!confirm('Cancelar este ASO?')) return;
    asoApi.cancel(id).then(() => load());
  };

  const inp = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm';
  const lbl = 'text-xs font-medium text-slate-500 mb-1 block';

  return (
    <DoctorShell>
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">📄 ASO — Atestado de Saúde Ocupacional</h1>
            <p className="text-slate-500 text-sm">Emissão conforme a NR-07. Somente o médico examinador emite o ASO.</p>
          </div>
          {!showForm && (
            <button onClick={openForm} className="bg-blue-600 text-white font-bold px-4 py-2.5 rounded-xl hover:bg-blue-700 text-sm">
              + Novo ASO
            </button>
          )}
        </div>

        {/* ── FORMULÁRIO ── */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-6 mb-6">
            <Section title="1. Dados da Empresa">
              <Field l="Empresa cadastrada" full>
                <select className={inp} value={form.companyId} onChange={e => selectCompany(e.target.value)}>
                  <option value="">— Selecione para preencher automaticamente —</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.nomeFantasia || c.razaoSocial}</option>
                  ))}
                </select>
              </Field>
              <Field l="Razão Social *"><input className={inp} value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} /></Field>
              <Field l="CNPJ"><input className={inp} value={form.companyCnpj} onChange={e => setForm(f => ({ ...f, companyCnpj: e.target.value }))} /></Field>
              <Field l="Endereço" full><input className={inp} value={form.companyAddress} onChange={e => setForm(f => ({ ...f, companyAddress: e.target.value }))} /></Field>
              <Field l="Telefone"><input className={inp} value={form.companyPhone} onChange={e => setForm(f => ({ ...f, companyPhone: e.target.value }))} /></Field>
            </Section>

            <Section title="2. Dados do Trabalhador">
              <Field l="Nome *"><input className={inp} value={form.workerName} onChange={e => setForm(f => ({ ...f, workerName: e.target.value }))} /></Field>
              <Field l="CPF"><input className={inp} value={form.workerCpf} onChange={e => setForm(f => ({ ...f, workerCpf: e.target.value }))} /></Field>
              <Field l="RG"><input className={inp} value={form.workerRg} onChange={e => setForm(f => ({ ...f, workerRg: e.target.value }))} /></Field>
              <Field l="Nascimento"><input type="date" className={inp} value={form.workerBirthDate} onChange={e => setForm(f => ({ ...f, workerBirthDate: e.target.value }))} /></Field>
              <Field l="Sexo">
                <select className={inp} value={form.workerSex} onChange={e => setForm(f => ({ ...f, workerSex: e.target.value }))}>
                  <option value="">—</option><option>Masculino</option><option>Feminino</option>
                </select>
              </Field>
              <Field l="Matrícula"><input className={inp} value={form.workerRegistration} onChange={e => setForm(f => ({ ...f, workerRegistration: e.target.value }))} /></Field>
              <Field l="Cargo"><input className={inp} value={form.workerRole} onChange={e => setForm(f => ({ ...f, workerRole: e.target.value }))} /></Field>
              <Field l="Setor"><input className={inp} value={form.workerSector} onChange={e => setForm(f => ({ ...f, workerSector: e.target.value }))} /></Field>
              <Field l="Data de admissão"><input type="date" className={inp} value={form.admissionDate} onChange={e => setForm(f => ({ ...f, admissionDate: e.target.value }))} /></Field>
            </Section>

            <Section title="3. Tipo de Exame">
              <Field l="Tipo *">
                <select className={inp} value={form.examType} onChange={e => setForm(f => ({ ...f, examType: e.target.value }))}>
                  {EXAM_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </Field>
              <Field l="Data do exame"><input type="date" className={inp} value={form.examDate} onChange={e => setForm(f => ({ ...f, examDate: e.target.value }))} /></Field>
              <Field l="Função exercida" full><textarea className={inp} rows={2} value={form.jobDescription} onChange={e => setForm(f => ({ ...f, jobDescription: e.target.value }))} /></Field>
            </Section>

            <div>
              <h3 className="font-bold text-slate-700 text-sm mb-2">5. Riscos Ocupacionais</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {RISK_OPTIONS.map(r => (
                  <label key={r} className="flex items-center gap-2 text-sm text-slate-600">
                    <input type="checkbox" checked={form.risks.includes(r)} onChange={() => toggle('risks', r)} /> {r}
                  </label>
                ))}
              </div>
              <input className={`${inp} mt-2`} placeholder="Outros riscos..." value={form.risksOther} onChange={e => setForm(f => ({ ...f, risksOther: e.target.value }))} />
            </div>

            <div>
              <h3 className="font-bold text-slate-700 text-sm mb-2">6. Exames Complementares</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {EXAM_OPTIONS.map(x => (
                  <label key={x} className="flex items-center gap-2 text-sm text-slate-600">
                    <input type="checkbox" checked={form.complementaryExams.includes(x)} onChange={() => toggle('complementaryExams', x)} /> {x}
                  </label>
                ))}
              </div>
              <input className={`${inp} mt-2`} placeholder="Outros exames..." value={form.examsOther} onChange={e => setForm(f => ({ ...f, examsOther: e.target.value }))} />
            </div>

            <div>
              <h3 className="font-bold text-slate-700 text-sm mb-2">7. Parecer Médico</h3>
              <div className="flex flex-wrap gap-2">
                {RESULTS.map(r => (
                  <button key={r.key} onClick={() => setForm(f => ({ ...f, result: r.key }))}
                    className={`px-4 py-2 rounded-lg border text-sm font-bold ${form.result === r.key ? r.color : 'border-slate-200 text-slate-500'}`}>
                    {r.label}
                  </button>
                ))}
              </div>
              {form.result === 'apto_restricoes' && (
                <div className="mt-2"><label className={lbl}>Restrições *</label>
                  <textarea className={inp} rows={2} value={form.restrictions} onChange={e => setForm(f => ({ ...f, restrictions: e.target.value }))} /></div>
              )}
              <div className="mt-2"><label className={lbl}>Observações</label>
                <textarea className={inp} rows={2} value={form.observations} onChange={e => setForm(f => ({ ...f, observations: e.target.value }))} /></div>
            </div>

            <Section title="8. Médico Examinador">
              <Field l="Nome"><input className={inp} value={form.doctorName} onChange={e => setForm(f => ({ ...f, doctorName: e.target.value }))} /></Field>
              <Field l="Especialidade"><input className={inp} value={form.doctorSpecialty} onChange={e => setForm(f => ({ ...f, doctorSpecialty: e.target.value }))} /></Field>
              <Field l="CRM"><input className={inp} value={form.doctorCrm} onChange={e => setForm(f => ({ ...f, doctorCrm: e.target.value }))} /></Field>
              <Field l="UF"><input className={inp} value={form.doctorUf} onChange={e => setForm(f => ({ ...f, doctorUf: e.target.value }))} /></Field>
            </Section>

            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button onClick={submit} disabled={saving} className="bg-blue-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-40">
                {saving ? 'Emitindo…' : 'Emitir ASO'}
              </button>
              <button onClick={() => { setShowForm(false); setError(''); }} className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-600">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* ── LISTA ── */}
        {!showForm && (
          loading ? <p className="text-slate-400 text-sm">Carregando…</p> :
          list.length === 0 ? <p className="text-slate-400 text-sm">Nenhum ASO emitido ainda.</p> :
          <div className="space-y-2">
            {list.map(a => (
              <div key={a.id} className="bg-white rounded-xl border border-slate-100 p-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800">
                    {a.workerName}
                    {a.status === 'canceled' && <span className="ml-2 text-xs text-red-500">(cancelado)</span>}
                  </div>
                  <div className="text-xs text-slate-400">
                    {EXAM_LABEL[a.examType] ?? a.examType} · {a.companyName} · {fmtDate(a.examDate)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${RESULT_BADGE[a.result] ?? 'bg-slate-100 text-slate-600'}`}>
                    {RESULT_LABEL[a.result] ?? a.result}
                  </span>
                  <button onClick={() => downloadAsoPdf(a)} className="text-xs text-blue-600 hover:underline font-medium">📄 Baixar PDF</button>
                  {a.status !== 'canceled' && <button onClick={() => cancel(a.id)} className="text-xs text-slate-400 hover:text-red-500">Cancelar</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DoctorShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-bold text-slate-700 text-sm mb-2">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}
function Field({ l, full, children }: { l: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="text-xs font-medium text-slate-500 mb-1 block">{l}</label>
      {children}
    </div>
  );
}
