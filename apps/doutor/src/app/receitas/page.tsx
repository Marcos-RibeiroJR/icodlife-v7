'use client';
// apps/doutor/src/app/receitas/page.tsx
// Sprint 16 — Meus Exames / Receitas
// Abas: Receitas | Pedidos de Exame | Nova Emissão

import { useEffect, useRef, useState, useCallback } from 'react';
import DoctorShell from '@/components/ui/DoctorShell';
import { api } from '@/lib/api';
import { AutocompleteInput } from '@/components/ui/AutocompleteInput';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (s: string) => new Date(s).toLocaleDateString('pt-BR');
const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  active:   { label: 'Ativa',     cls: 'bg-green-100 text-green-700' },
  used:     { label: 'Utilizada', cls: 'bg-blue-100 text-blue-700'   },
  expired:  { label: 'Expirada',  cls: 'bg-slate-100 text-slate-500' },
  canceled: { label: 'Cancelada', cls: 'bg-red-100 text-red-600'     },
  completed:{ label: 'Concluído', cls: 'bg-blue-100 text-blue-700'   },
};
const URGENCY_LABEL: Record<string, { label: string; cls: string }> = {
  routine:   { label: 'Rotina',    cls: 'bg-slate-100 text-slate-600'   },
  urgent:    { label: 'Urgente',   cls: 'bg-orange-100 text-orange-700' },
  emergency: { label: 'Emergência',cls: 'bg-red-100 text-red-700'       },
};

// ─── Impressão em nova janela ─────────────────────────────────────────────────
function printDocument(html: string) {
  const w = window.open('', '_blank', 'width=794,height=1123');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head>
    <meta charset="utf-8">
    <title>Documento Médico — ICODLIFE</title>
    <style>
      @page { size: A4; margin: 20mm; }
      body { font-family: Arial, sans-serif; font-size: 11pt; color: #111; margin: 0; }
      h1 { font-size: 14pt; margin: 0; }
      h2 { font-size: 12pt; margin: 0 0 8px; }
      .header { border-bottom: 2px solid #7B1E1E; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
      .badge { display: inline-block; border: 1px solid currentColor; padding: 2px 8px; border-radius: 4px; font-size: 9pt; }
      table { width: 100%; border-collapse: collapse; margin: 8px 0; }
      th { background: #f5f5f5; padding: 6px 8px; text-align: left; font-size: 9pt; border: 1px solid #ddd; }
      td { padding: 6px 8px; border: 1px solid #ddd; font-size: 10pt; vertical-align: top; }
      .footer { margin-top: 40px; border-top: 1px solid #ccc; padding-top: 12px; display: flex; justify-content: space-between; font-size: 9pt; color: #555; }
      .sig-line { margin-top: 60px; border-top: 1px solid #333; width: 220px; text-align: center; font-size: 9pt; padding-top: 4px; }
      @media print { button { display: none; } }
    </style>
  </head><body>${html}<script>window.onload=()=>window.print();</script></body></html>`);
  w.document.close();
}

function buildPrescriptionHtml(rx: any, doctor: any) {
  const doctorName = doctor?.user?.fullName ?? 'Médico';
  const crm        = doctor?.crm ? `CRM ${doctor.crm}/${doctor.uf}` : '';
  const specialty  = doctor?.specialty ?? '';
  const city       = doctor?.addressCity ?? '';
  const date       = new Date().toLocaleDateString('pt-BR');
  const valid      = `${rx.validDays} dias`;
  const items: any[] = Array.isArray(rx.items) ? rx.items : [];

  return `
    <div class="header">
      <div>
        <h1>${doctorName}</h1>
        <p style="margin:4px 0 0; color:#555">${[crm, specialty, city].filter(Boolean).join(' · ')}</p>
      </div>
      <div style="text-align:right">
        <p style="font-size:9pt; color:#777">RECEITA MÉDICA</p>
        <p style="font-size:9pt">${date} · Válida por ${valid}</p>
      </div>
    </div>

    <p style="margin:0 0 16px"><strong>Paciente:</strong> ${rx.patientName}
      ${rx.patientAge ? ` · ${rx.patientAge} anos` : ''}
      ${rx.diagnosis  ? `<br><strong>CID/Diagnóstico:</strong> ${rx.diagnosis}` : ''}
    </p>

    <h2>Prescrição</h2>
    <table>
      <tr><th>#</th><th>Medicamento</th><th>Dosagem</th><th>Qtd</th><th>Instruções</th></tr>
      ${items.map((m: any, i: number) => `
        <tr>
          <td>${i + 1}</td>
          <td>${m.name}${m.controlled ? ' <span class="badge" style="color:#dc2626;border-color:#dc2626">Controlado</span>' : ''}</td>
          <td>${m.dosage ?? '—'}</td>
          <td>${m.quantity ?? '—'}</td>
          <td>${m.instructions ?? '—'}</td>
        </tr>`).join('')}
    </table>

    ${rx.notes ? `<p style="margin-top:12px"><strong>Observações:</strong> ${rx.notes}</p>` : ''}

    <div class="sig-line">${doctorName}<br>${crm}</div>

    <div class="footer">
      <span>Emitida em ${date} · ICODLIFE</span>
      <span>Receita #${rx.id?.slice(-8).toUpperCase()}</span>
    </div>`;
}

function buildExamOrderHtml(order: any, doctor: any) {
  const doctorName = doctor?.user?.fullName ?? 'Médico';
  const crm        = doctor?.crm ? `CRM ${doctor.crm}/${doctor.uf}` : '';
  const specialty  = doctor?.specialty ?? '';
  const date       = new Date().toLocaleDateString('pt-BR');
  const exams: any[] = Array.isArray(order.exams) ? order.exams : [];
  const urgency    = URGENCY_LABEL[order.urgency]?.label ?? order.urgency;

  return `
    <div class="header">
      <div>
        <h1>${doctorName}</h1>
        <p style="margin:4px 0 0; color:#555">${[crm, specialty].filter(Boolean).join(' · ')}</p>
      </div>
      <div style="text-align:right">
        <p style="font-size:9pt; color:#777">PEDIDO DE EXAMES</p>
        <p style="font-size:9pt">${date} · ${urgency}</p>
      </div>
    </div>

    <p style="margin:0 0 16px"><strong>Paciente:</strong> ${order.patientName}
      ${order.patientAge ? ` · ${order.patientAge} anos` : ''}
      ${order.clinicalInfo ? `<br><strong>Indicação clínica:</strong> ${order.clinicalInfo}` : ''}
    </p>

    <h2>Exames solicitados</h2>
    <table>
      <tr><th>#</th><th>Exame</th><th>Código</th><th>Lateralidade</th><th>Observações</th></tr>
      ${exams.map((e: any, i: number) => `
        <tr>
          <td>${i + 1}</td>
          <td>${e.name}</td>
          <td>${e.code ?? '—'}</td>
          <td>${e.laterality ?? '—'}</td>
          <td>${e.notes ?? '—'}</td>
        </tr>`).join('')}
    </table>

    ${order.notes ? `<p style="margin-top:12px"><strong>Observações:</strong> ${order.notes}</p>` : ''}

    <div class="sig-line">${doctorName}<br>${crm}</div>

    <div class="footer">
      <span>Emitido em ${date} · ICODLIFE</span>
      <span>Pedido #${order.id?.slice(-8).toUpperCase()}</span>
    </div>`;
}

// ─── Formulário — Nova Receita ────────────────────────────────────────────────
type RxItem = { name: string; dosage: string; quantity: string; instructions: string; controlled: boolean };

function NewPrescriptionForm({ patients, onSaved }: { patients: any[]; onSaved: () => void }) {
  const [form, setForm] = useState({
    patientName: '', patientAge: '', patientIcode: '', patientDoctorId: '',
    diagnosis: '', notes: '', validDays: '30',
  });
  const [items, setItems] = useState<RxItem[]>([
    { name: '', dosage: '', quantity: '', instructions: '', controlled: false },
  ]);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const setItem = (i: number, k: keyof RxItem, v: any) =>
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [k]: v } : item));
  const addItem    = () => setItems(p => [...p, { name:'', dosage:'', quantity:'', instructions:'', controlled:false }]);
  const removeItem = (i: number) => setItems(p => p.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!form.patientName.trim() || items.every(it => !it.name.trim())) {
      setError('Informe o paciente e pelo menos um medicamento.'); return;
    }
    setSaving(true); setError('');
    try {
      await api.post('/doutor/receitas/prescriptions', {
        ...form,
        patientAge:  form.patientAge ? Number(form.patientAge) : undefined,
        validDays:   Number(form.validDays),
        items:       items.filter(it => it.name.trim()),
      });
      onSaved();
      setForm({ patientName:'', patientAge:'', patientIcode:'', patientDoctorId:'', diagnosis:'', notes:'', validDays:'30' });
      setItems([{ name:'', dosage:'', quantity:'', instructions:'', controlled:false }]);
    } catch (e: any) { setError(e.response?.data?.message || 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      {/* Paciente */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Paciente</p>
        <div className="grid grid-cols-2 gap-3">
          {patients.length > 0 && (
            <div className="col-span-2">
              <label className="block text-xs text-slate-500 mb-1">Selecionar paciente vinculado</label>
              <select
                value={form.patientDoctorId}
                onChange={e => {
                  const p = patients.find((x: any) => x.id === e.target.value);
                  set('patientDoctorId', e.target.value);
                  if (p) { set('patientName', p.user?.fullName ?? ''); set('patientIcode', p.user?.icode ?? ''); }
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">— Paciente externo (preencher abaixo) —</option>
                {patients.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.user?.fullName} ({p.user?.icode ?? 'sem código'})</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Nome *</label>
            <input value={form.patientName} onChange={e => set('patientName', e.target.value)}
              placeholder="Nome completo" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Idade</label>
            <input type="number" value={form.patientAge} onChange={e => set('patientAge', e.target.value)}
              placeholder="Anos" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Diagnóstico / CID</label>
            <input value={form.diagnosis} onChange={e => set('diagnosis', e.target.value)}
              placeholder="ex: J45 — Asma" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Válida por (dias)</label>
            <select value={form.validDays} onChange={e => set('validDays', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
              {[7, 15, 30, 60, 90, 180].map(d => <option key={d} value={d}>{d} dias</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Itens */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Medicamentos</p>
          <button onClick={addItem} className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Adicionar</button>
        </div>
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-start">
              <div className="col-span-3">
                {i === 0 && <label className="block text-xs text-slate-400 mb-1">Medicamento *</label>}
                <AutocompleteInput
                  value={it.name}
                  onChange={v => setItem(i, 'name', v)}
                  fetcher={async q => {
                    const r = await api.get('/catalog/medications', { params: { q } });
                    return (r.data?.items ?? []).map((m: string) => ({ label: m }));
                  }}
                  placeholder="Nome do medicamento"
                  className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div className="col-span-2">
                {i === 0 && <label className="block text-xs text-slate-400 mb-1">Dosagem</label>}
                <input value={it.dosage} onChange={e => setItem(i, 'dosage', e.target.value)}
                  placeholder="500mg" className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div className="col-span-2">
                {i === 0 && <label className="block text-xs text-slate-400 mb-1">Quantidade</label>}
                <input value={it.quantity} onChange={e => setItem(i, 'quantity', e.target.value)}
                  placeholder="1 caixa" className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div className="col-span-4">
                {i === 0 && <label className="block text-xs text-slate-400 mb-1">Posologia</label>}
                <input value={it.instructions} onChange={e => setItem(i, 'instructions', e.target.value)}
                  placeholder="1 cp de 8/8h por 7 dias" className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div className="col-span-1 flex items-end gap-1 pb-0.5">
                {i === 0 && <div className="h-5" />}
                <label className="flex items-center gap-1 cursor-pointer" title="Controlado">
                  <input type="checkbox" checked={it.controlled} onChange={e => setItem(i, 'controlled', e.target.checked)} className="rounded" />
                  <span className="text-xs text-red-600">C</span>
                </label>
                {items.length > 1 && (
                  <button onClick={() => removeItem(i)} className="text-slate-300 hover:text-red-400 text-lg leading-none ml-1">×</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Observações */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Observações</label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
          rows={2} placeholder="Recomendações adicionais..."
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none" />
      </div>

      {error && <div className="px-4 py-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

      <button onClick={save} disabled={saving}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors">
        {saving ? 'Emitindo...' : 'Emitir Receita'}
      </button>
    </div>
  );
}

// ─── Formulário — Novo Pedido de Exame ────────────────────────────────────────
type ExamItem = { name: string; code: string; laterality: string; notes: string };

function NewExamOrderForm({ patients, onSaved }: { patients: any[]; onSaved: () => void }) {
  const [form, setForm] = useState({
    patientName: '', patientAge: '', patientIcode: '', patientDoctorId: '',
    clinicalInfo: '', urgency: 'routine', notes: '',
  });
  const [exams,  setExams]  = useState<ExamItem[]>([{ name:'', code:'', laterality:'', notes:'' }]);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const setExam = (i: number, k: keyof ExamItem, v: string) =>
    setExams(prev => prev.map((e, idx) => idx === i ? { ...e, [k]: v } : e));
  const addExam    = () => setExams(p => [...p, { name:'', code:'', laterality:'', notes:'' }]);
  const removeExam = (i: number) => setExams(p => p.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!form.patientName.trim() || exams.every(e => !e.name.trim())) {
      setError('Informe o paciente e pelo menos um exame.'); return;
    }
    setSaving(true); setError('');
    try {
      await api.post('/doutor/receitas/exam-orders', {
        ...form,
        patientAge: form.patientAge ? Number(form.patientAge) : undefined,
        exams: exams.filter(e => e.name.trim()),
      });
      onSaved();
      setForm({ patientName:'', patientAge:'', patientIcode:'', patientDoctorId:'', clinicalInfo:'', urgency:'routine', notes:'' });
      setExams([{ name:'', code:'', laterality:'', notes:'' }]);
    } catch (e: any) { setError(e.response?.data?.message || 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      {/* Paciente */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Paciente</p>
        <div className="grid grid-cols-2 gap-3">
          {patients.length > 0 && (
            <div className="col-span-2">
              <label className="block text-xs text-slate-500 mb-1">Selecionar paciente vinculado</label>
              <select value={form.patientDoctorId}
                onChange={e => {
                  const p = patients.find((x: any) => x.id === e.target.value);
                  set('patientDoctorId', e.target.value);
                  if (p) { set('patientName', p.user?.fullName ?? ''); set('patientIcode', p.user?.icode ?? ''); }
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="">— Paciente externo —</option>
                {patients.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.user?.fullName} ({p.user?.icode ?? 'sem código'})</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Nome *</label>
            <input value={form.patientName} onChange={e => set('patientName', e.target.value)}
              placeholder="Nome completo" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Idade</label>
            <input type="number" value={form.patientAge} onChange={e => set('patientAge', e.target.value)}
              placeholder="Anos" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-slate-500 mb-1">Indicação clínica</label>
            <input value={form.clinicalInfo} onChange={e => set('clinicalInfo', e.target.value)}
              placeholder="Ex: Avaliação pré-operatória, rastreio oncológico..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Urgência</label>
            <select value={form.urgency} onChange={e => set('urgency', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
              <option value="routine">Rotina</option>
              <option value="urgent">Urgente</option>
              <option value="emergency">Emergência</option>
            </select>
          </div>
        </div>
      </div>

      {/* Exames */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Exames</p>
          <button onClick={addExam} className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Adicionar</button>
        </div>
        <div className="space-y-3">
          {exams.map((ex, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-start">
              <div className="col-span-4">
                {i === 0 && <label className="block text-xs text-slate-400 mb-1">Exame *</label>}
                <AutocompleteInput
                  value={ex.name}
                  onChange={v => setExam(i, 'name', v)}
                  fetcher={async q => {
                    const r = await api.get('/catalog/exams', { params: { q } });
                    return (r.data?.items ?? []).map((e: any) => ({ label: e.name, sub: e.group, code: e.code }));
                  }}
                  onSelect={opt => { if (opt.code) setExam(i, 'code', opt.code); }}
                  placeholder="Hemograma completo"
                  className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div className="col-span-2">
                {i === 0 && <label className="block text-xs text-slate-400 mb-1">Código TUSS</label>}
                <input value={ex.code} onChange={e => setExam(i, 'code', e.target.value)}
                  placeholder="40305613" className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div className="col-span-2">
                {i === 0 && <label className="block text-xs text-slate-400 mb-1">Lateralidade</label>}
                <select value={ex.laterality} onChange={e => setExam(i, 'laterality', e.target.value)}
                  className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                  <option value="">—</option>
                  <option value="Bilateral">Bilateral</option>
                  <option value="Direita">Direita</option>
                  <option value="Esquerda">Esquerda</option>
                </select>
              </div>
              <div className="col-span-3">
                {i === 0 && <label className="block text-xs text-slate-400 mb-1">Observação</label>}
                <input value={ex.notes} onChange={e => setExam(i, 'notes', e.target.value)}
                  placeholder="Com contraste, jejum 4h..." className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div className="col-span-1 flex items-end pb-0.5">
                {i === 0 && <div className="h-5" />}
                {exams.length > 1 && (
                  <button onClick={() => removeExam(i)} className="text-slate-300 hover:text-red-400 text-lg leading-none">×</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Observações */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Observações</label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
          rows={2} placeholder="Informações adicionais..."
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none" />
      </div>

      {error && <div className="px-4 py-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

      <button onClick={save} disabled={saving}
        className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors">
        {saving ? 'Emitindo...' : 'Emitir Pedido de Exame'}
      </button>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
type Tab = 'prescriptions' | 'exam-orders' | 'new-rx' | 'new-exam';

export default function ReceitasPage() {
  const [tab,        setTab]        = useState<Tab>('prescriptions');
  const [rxList,     setRxList]     = useState<any[]>([]);
  const [examList,   setExamList]   = useState<any[]>([]);
  const [patients,   setPatients]   = useState<any[]>([]);
  const [doctor,     setDoctor]     = useState<any>(null);
  const [loading,    setLoading]    = useState(false);

  const loadRx = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get('/doutor/receitas/prescriptions'); setRxList(r.data.data ?? []); }
    finally { setLoading(false); }
  }, []);

  const loadExams = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get('/doutor/receitas/exam-orders'); setExamList(r.data.data ?? []); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    api.get('/doutor/receitas/context').then(r => setDoctor(r.data)).catch(() => {});
    api.get('/doutor/patients').then(r => setPatients(r.data)).catch(() => {});
    loadRx();
    loadExams();
  }, [loadRx, loadExams]);

  const handlePrintRx = async (id: string) => {
    try {
      const r = await api.get(`/doutor/receitas/prescriptions/${id}`);
      printDocument(buildPrescriptionHtml(r.data, doctor));
    } catch { alert('Erro ao carregar receita'); }
  };

  const handlePrintExam = async (id: string) => {
    try {
      const r = await api.get(`/doutor/receitas/exam-orders/${id}`);
      printDocument(buildExamOrderHtml(r.data, doctor));
    } catch { alert('Erro ao carregar pedido'); }
  };

  const handleCancel = async (type: 'rx' | 'exam', id: string) => {
    if (!confirm('Cancelar este documento?')) return;
    if (type === 'rx') { await api.delete(`/doutor/receitas/prescriptions/${id}`); loadRx(); }
    else               { await api.delete(`/doutor/receitas/exam-orders/${id}`);    loadExams(); }
  };

  const TAB_DEFS: { id: Tab; label: string }[] = [
    { id: 'prescriptions', label: '💊 Receitas' },
    { id: 'exam-orders',   label: '🔬 Pedidos de Exame' },
    { id: 'new-rx',        label: '+ Nova Receita' },
    { id: 'new-exam',      label: '+ Pedir Exame' },
  ];

  return (
    <DoctorShell>
      <div className="p-6 max-w-4xl">
        {/* Cabeçalho */}
        <div className="mb-5">
          <h1 className="text-xl font-bold text-slate-800">Meus Exames & Receitas</h1>
          <p className="text-sm text-slate-500 mt-0.5">Emita receitas e solicitações de exame com geração de documento para impressão.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6 w-fit">
          {TAB_DEFS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${
                tab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Receitas */}
        {tab === 'prescriptions' && (
          <div>
            {loading ? <p className="text-sm text-slate-400">Carregando...</p>
            : rxList.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-3xl mb-2">💊</p>
                <p className="text-sm">Nenhuma receita emitida ainda.</p>
                <button onClick={() => setTab('new-rx')} className="mt-3 text-sm text-blue-600 hover:underline">Emitir primeira receita</button>
              </div>
            ) : (
              <div className="space-y-2">
                {rxList.map((rx: any) => {
                  const st = STATUS_LABEL[rx.status] ?? STATUS_LABEL.active;
                  const items: any[] = Array.isArray(rx.items) ? rx.items : [];
                  return (
                    <div key={rx.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-4 hover:shadow-sm transition-shadow">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-slate-800 text-sm">{rx.patientName}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span>
                          {rx.diagnosis && <span className="text-xs text-slate-400">{rx.diagnosis}</span>}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {items.slice(0, 3).map((it: any) => it.name).join(', ')}
                          {items.length > 3 ? ` +${items.length - 3}` : ''}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">Emitida em {fmt(rx.issuedAt)} · Válida {rx.validDays} dias</p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => handlePrintRx(rx.id)}
                          className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">
                          🖨 Imprimir
                        </button>
                        {rx.status === 'active' && (
                          <button onClick={() => handleCancel('rx', rx.id)}
                            className="px-3 py-1.5 text-xs border border-red-200 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Pedidos de Exame */}
        {tab === 'exam-orders' && (
          <div>
            {loading ? <p className="text-sm text-slate-400">Carregando...</p>
            : examList.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-3xl mb-2">🔬</p>
                <p className="text-sm">Nenhum pedido de exame emitido ainda.</p>
                <button onClick={() => setTab('new-exam')} className="mt-3 text-sm text-blue-600 hover:underline">Emitir primeiro pedido</button>
              </div>
            ) : (
              <div className="space-y-2">
                {examList.map((order: any) => {
                  const st = STATUS_LABEL[order.status]    ?? STATUS_LABEL.active;
                  const ug = URGENCY_LABEL[order.urgency]  ?? URGENCY_LABEL.routine;
                  const exams: any[] = Array.isArray(order.exams) ? order.exams : [];
                  return (
                    <div key={order.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-4 hover:shadow-sm transition-shadow">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-slate-800 text-sm">{order.patientName}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ug.cls}`}>{ug.label}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {exams.slice(0, 3).map((e: any) => e.name).join(', ')}
                          {exams.length > 3 ? ` +${exams.length - 3}` : ''}
                        </p>
                        {order.clinicalInfo && <p className="text-xs text-slate-400 mt-0.5">{order.clinicalInfo}</p>}
                        <p className="text-xs text-slate-400 mt-1">Emitido em {fmt(order.issuedAt)}</p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => handlePrintExam(order.id)}
                          className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">
                          🖨 Imprimir
                        </button>
                        {order.status === 'active' && (
                          <button onClick={() => handleCancel('exam', order.id)}
                            className="px-3 py-1.5 text-xs border border-red-200 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Formulários */}
        {tab === 'new-rx' && (
          <NewPrescriptionForm patients={patients} onSaved={() => { loadRx(); setTab('prescriptions'); }} />
        )}
        {tab === 'new-exam' && (
          <NewExamOrderForm patients={patients} onSaved={() => { loadExams(); setTab('exam-orders'); }} />
        )}
      </div>
    </DoctorShell>
  );
}
