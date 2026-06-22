'use client';
// apps/web/src/app/cirurgias/page.tsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import { AppLayout } from '../../components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('icodlife_token') : null;
}
function authHeaders() {
  return { headers: { Authorization: `Bearer ${getToken()}` } };
}

const ANESTHESIA_OPTS = ['Geral', 'Local', 'Raquianestesia', 'Sedação', 'Bloqueio'];
const TECHNIQUE_OPTS  = ['Laparoscopia', 'Aberta', 'Robótica', 'Endoscopia', 'Videolaparoscopia'];
const STATUS_MAP: Record<string, { label: string; color: string; icon: string }> = {
  completed: { label: 'Realizada',   color: 'bg-green-100 text-green-700',  icon: '✓' },
  scheduled: { label: 'Agendada',    color: 'bg-blue-100 text-blue-700',    icon: '📅' },
  canceled:  { label: 'Cancelada',   color: 'bg-slate-100 text-slate-500',  icon: '✕' },
};

const EMPTY_FORM = {
  procedureName: '', procedureCode: '', status: 'completed',
  surgeryDate: '', scheduledDate: '', hospitalName: '', hospitalCity: '',
  surgeonName: '', anesthesiaType: '', indication: '', technique: '',
  duration: '', bloodLoss: '', hospitalDays: '', returnToWork: '',
  complications: '', implants: '', familyMemberId: '', notes: '',
};

export default function CirurgiasPage() {
  const [surgeries,     setSurgeries]     = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [showForm,      setShowForm]      = useState(false);
  const [editing,       setEditing]       = useState<any>(null);
  const [form,          setForm]          = useState<any>({ ...EMPTY_FORM });
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState('');
  const [tab,           setTab]           = useState<'mine' | 'family'>('mine');
  const [familySurg,    setFamilySurg]    = useState<any[]>([]);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const [sRes, fRes, mRes] = await Promise.all([
        axios.get(`${API}/surgery`,        authHeaders()),
        axios.get(`${API}/surgery/family`, authHeaders()),
        axios.get(`${API}/family`,         authHeaders()),
      ]);
      setSurgeries(sRes.data);
      setFamilySurg(fRes.data);
      setFamilyMembers(mRes.data ?? []);
    } catch { setSurgeries([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const setField = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));

  const openNew = () => {
    setEditing(null); setForm({ ...EMPTY_FORM }); setError(''); setShowForm(true);
  };

  const openEdit = (s: any) => {
    setEditing(s);
    setForm({
      procedureName:  s.procedureName  ?? '',
      procedureCode:  s.procedureCode  ?? '',
      status:         s.status,
      surgeryDate:    s.surgeryDate    ? s.surgeryDate.slice(0, 10)   : '',
      scheduledDate:  s.scheduledDate  ? s.scheduledDate.slice(0, 10) : '',
      hospitalName:   s.hospitalName   ?? '',
      hospitalCity:   s.hospitalCity   ?? '',
      surgeonName:    s.surgeonName    ?? '',
      anesthesiaType: s.anesthesiaType ?? '',
      indication:     s.indication     ?? '',
      technique:      s.technique      ?? '',
      duration:       s.duration       ? String(s.duration)        : '',
      bloodLoss:      s.bloodLoss      ? String(s.bloodLoss)       : '',
      hospitalDays:   s.hospitalDays   ? String(s.hospitalDays)    : '',
      returnToWork:   s.returnToWork   ? String(s.returnToWork)    : '',
      complications:  s.complications?.join(', ') ?? '',
      implants:       s.implants?.join(', ')       ?? '',
      familyMemberId: s.familyMemberId ?? '',
      notes:          s.notes          ?? '',
    });
    setError(''); setShowForm(true);
  };

  const save = async () => {
    if (!form.procedureName.trim()) { setError('Nome do procedimento é obrigatório'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        procedureName:  form.procedureName,
        procedureCode:  form.procedureCode  || undefined,
        status:         form.status,
        surgeryDate:    form.surgeryDate    || undefined,
        scheduledDate:  form.scheduledDate  || undefined,
        hospitalName:   form.hospitalName   || undefined,
        hospitalCity:   form.hospitalCity   || undefined,
        surgeonName:    form.surgeonName    || undefined,
        anesthesiaType: form.anesthesiaType || undefined,
        indication:     form.indication     || undefined,
        technique:      form.technique      || undefined,
        duration:       form.duration       ? Number(form.duration)     : undefined,
        bloodLoss:      form.bloodLoss      ? Number(form.bloodLoss)    : undefined,
        hospitalDays:   form.hospitalDays   ? Number(form.hospitalDays) : undefined,
        returnToWork:   form.returnToWork   ? Number(form.returnToWork) : undefined,
        complications:  form.complications  ? form.complications.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        implants:       form.implants       ? form.implants.split(',').map((s: string) => s.trim()).filter(Boolean)       : [],
        familyMemberId: form.familyMemberId || undefined,
        notes:          form.notes          || undefined,
      };
      if (editing) {
        await axios.patch(`${API}/surgery/${editing.id}`, payload, authHeaders());
      } else {
        await axios.post(`${API}/surgery`, payload, authHeaders());
      }
      setShowForm(false);
      await load();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Erro ao salvar');
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Remover esta cirurgia?')) return;
    try {
      await axios.delete(`${API}/surgery/${id}`, authHeaders());
      await load();
    } catch { alert('Erro ao remover'); }
  };

  const mine      = surgeries.filter(s => !s.familyMemberId);
  const scheduled = mine.filter(s => s.status === 'scheduled');
  const past      = mine.filter(s => s.status === 'completed');
  const canceled  = mine.filter(s => s.status === 'canceled');

  return (
    <AppLayout>
      <div className="min-h-screen bg-[#FFF8F8]">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-5">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div>
              <h1 className="text-xl font-bold text-slate-800">Cirurgias</h1>
              <p className="text-slate-500 text-sm mt-0.5">Histórico cirúrgico e procedimentos agendados</p>
            </div>
            <button onClick={openNew}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg">
              + Nova cirurgia
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-6">
          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit mb-6">
            {(['mine', 'family'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors
                  ${tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {t === 'mine' ? `Minhas (${mine.length})` : `Família (${familySurg.length})`}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-slate-400 text-sm">Carregando...</p>
          ) : tab === 'mine' ? (
            <div className="space-y-6">
              {scheduled.length > 0 && (
                <Section title="Agendadas" icon="📅">
                  {scheduled.map(s => <SurgeryCard key={s.id} surgery={s} onEdit={openEdit} onDelete={remove} />)}
                </Section>
              )}
              <Section title={`Realizadas (${past.length})`} icon="✓">
                {past.length === 0
                  ? <EmptyState text="Nenhuma cirurgia registrada." onAdd={openNew} />
                  : past.map(s => <SurgeryCard key={s.id} surgery={s} onEdit={openEdit} onDelete={remove} />)}
              </Section>
              {canceled.length > 0 && (
                <Section title="Canceladas" icon="✕">
                  {canceled.map(s => <SurgeryCard key={s.id} surgery={s} onEdit={openEdit} onDelete={remove} />)}
                </Section>
              )}
            </div>
          ) : (
            <div>
              {familySurg.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
                  <p className="text-slate-400 text-sm mb-2">Nenhuma cirurgia registrada para familiares.</p>
                  <p className="text-slate-400 text-xs">Ao cadastrar uma cirurgia, você pode associá-la a um familiar.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {familySurg.map(s => <SurgeryCard key={s.id} surgery={s} onEdit={openEdit} onDelete={remove} showFamily />)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-4">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                <h2 className="text-base font-bold text-slate-800">
                  {editing ? 'Editar cirurgia' : 'Nova cirurgia'}
                </h2>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700 text-xl">✕</button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Status *</label>
                  <div className="flex gap-2">
                    {(['completed', 'scheduled', 'canceled'] as const).map(s => (
                      <button key={s} type="button" onClick={() => setField('status', s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                          ${form.status === s
                            ? s === 'completed' ? 'bg-green-600 text-white border-green-600'
                              : s === 'scheduled' ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-slate-600 text-white border-slate-600'
                            : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                        {STATUS_MAP[s].label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Procedimento *</label>
                    <input value={form.procedureName} onChange={e => setField('procedureName', e.target.value)}
                      placeholder="Ex: Apendicectomia..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">CID-10 / TUSS</label>
                    <input value={form.procedureCode} onChange={e => setField('procedureCode', e.target.value)}
                      placeholder="K37"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {form.status === 'scheduled' ? 'Data agendada' : 'Data da cirurgia'}
                  </label>
                  <input type="date"
                    value={form.status === 'scheduled' ? form.scheduledDate : form.surgeryDate}
                    onChange={e => setField(form.status === 'scheduled' ? 'scheduledDate' : 'surgeryDate', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Hospital / Clínica</label>
                    <input value={form.hospitalName} onChange={e => setField('hospitalName', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Cidade</label>
                    <input value={form.hospitalCity} onChange={e => setField('hospitalCity', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Cirurgião</label>
                    <input value={form.surgeonName} onChange={e => setField('surgeonName', e.target.value)}
                      placeholder="Dr. ..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Anestesia</label>
                    <select value={form.anesthesiaType} onChange={e => setField('anesthesiaType', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none">
                      <option value="">—</option>
                      {ANESTHESIA_OPTS.map(a => <option key={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Técnica</label>
                    <select value={form.technique} onChange={e => setField('technique', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none">
                      <option value="">—</option>
                      {TECHNIQUE_OPTS.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {[
                    { k: 'duration',     label: 'Duração (min)',    ph: '120' },
                    { k: 'hospitalDays', label: 'Internação (dias)', ph: '2'  },
                    { k: 'returnToWork', label: 'Retorno (dias)',    ph: '30' },
                    { k: 'bloodLoss',    label: 'Sangramento (ml)',  ph: '200'},
                  ].map(({ k, label, ph }) => (
                    <div key={k}>
                      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                      <input type="number" value={form[k]} onChange={e => setField(k, e.target.value)}
                        placeholder={ph}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none" />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Indicação / Diagnóstico</label>
                  <textarea value={form.indication} onChange={e => setField('indication', e.target.value)} rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none resize-none" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Complicações (vírgula)</label>
                    <input value={form.complications} onChange={e => setField('complications', e.target.value)}
                      placeholder="Ex: Infecção, Hematoma"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Implantes (vírgula)</label>
                    <input value={form.implants} onChange={e => setField('implants', e.target.value)}
                      placeholder="Ex: Stent, Prótese"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none" />
                  </div>
                </div>

                {familyMembers.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Associar a familiar</label>
                    <select value={form.familyMemberId} onChange={e => setField('familyMemberId', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none">
                      <option value="">Minha própria cirurgia</option>
                      {familyMembers.map((m: any) => (
                        <option key={m.id} value={m.id}>
                          {m.fullName ?? m.relationship} ({m.relationship})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Notas</label>
                  <textarea value={form.notes} onChange={e => setField('notes', e.target.value)} rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none resize-none" />
                </div>

                {error && <p className="text-red-600 text-xs">{error}</p>}

                <div className="flex gap-2 pt-2">
                  <button onClick={() => setShowForm(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50">
                    Cancelar
                  </button>
                  <button onClick={save} disabled={saving}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-medium py-2 rounded-lg text-sm transition-colors">
                    {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Cadastrar cirurgia'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-1.5">
        <span>{icon}</span>{title}
      </h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function EmptyState({ text, onAdd }: { text: string; onAdd: () => void }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
      <p className="text-slate-400 text-sm mb-3">{text}</p>
      <button onClick={onAdd} className="text-red-600 hover:underline text-sm font-medium">
        Cadastrar primeira cirurgia
      </button>
    </div>
  );
}

function SurgeryCard({ surgery: s, onEdit, onDelete, showFamily = false }: {
  surgery: any; onEdit: (s: any) => void; onDelete: (id: string) => void; showFamily?: boolean;
}) {
  const st = STATUS_MAP[s.status] ?? STATUS_MAP['completed'];
  const date = s.status === 'scheduled' ? s.scheduledDate : s.surgeryDate;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-sm font-semibold text-slate-800">{s.procedureName}</h3>
            {s.procedureCode && <span className="text-xs font-mono text-slate-400">{s.procedureCode}</span>}
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.color}`}>
              {st.icon} {st.label}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500 mb-2">
            {date && <span>{new Date(date).toLocaleDateString('pt-BR')}</span>}
            {s.hospitalName && <span>{s.hospitalName}{s.hospitalCity ? `, ${s.hospitalCity}` : ''}</span>}
            {s.surgeonName  && <span>Dr(a). {s.surgeonName}</span>}
            {s.technique    && <span>{s.technique}</span>}
            {s.duration     && <span>{s.duration} min</span>}
            {s.hospitalDays && <span>{s.hospitalDays} dia(s) internado</span>}
          </div>
          {showFamily && s.familyMember && (
            <p className="text-xs text-purple-600 mb-1">
              Familiar: {s.familyMember.fullName ?? s.familyMember.relationship}
            </p>
          )}
          {s.complications?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1">
              {s.complications.map((c: string) => (
                <span key={c} className="bg-red-50 text-red-700 text-xs px-2 py-0.5 rounded-full">{c}</span>
              ))}
            </div>
          )}
          {s.implants?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {s.implants.map((imp: string) => (
                <span key={imp} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">🔩 {imp}</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => onEdit(s)}
            className="text-xs text-slate-500 hover:text-slate-800 border border-slate-200 px-2 py-1 rounded">
            Editar
          </button>
          <button onClick={() => onDelete(s.id)}
            className="text-xs text-red-400 hover:text-red-600 border border-red-100 px-2 py-1 rounded">
            Remover
          </button>
        </div>
      </div>
    </div>
  );
}
