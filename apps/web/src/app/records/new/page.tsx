'use client';
// apps/web/src/app/records/new/page.tsx — Lancamento manual de exame com classificacao SBPC/ML
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '../../../components/layout/AppLayout';
import { examResultsApi } from '../../../lib/api';

// Marcadores mais comuns com unidade padrao
const COMMON_MARKERS = [
  { name: 'Glicose', unit: 'mg/dL' },
  { name: 'Glicemia de jejum', unit: 'mg/dL' },
  { name: 'HbA1c', unit: '%' },
  { name: 'Hemoglobina Glicada', unit: '%' },
  { name: 'Colesterol Total', unit: 'mg/dL' },
  { name: 'Colesterol LDL', unit: 'mg/dL' },
  { name: 'Colesterol HDL', unit: 'mg/dL' },
  { name: 'Triglicerideos', unit: 'mg/dL' },
  { name: 'Hemoglobina', unit: 'g/dL' },
  { name: 'Hematocrito', unit: '%' },
  { name: 'Leucocitos', unit: '/uL' },
  { name: 'Plaquetas', unit: '/uL' },
  { name: 'Creatinina', unit: 'mg/dL' },
  { name: 'Ureia', unit: 'mg/dL' },
  { name: 'Acido Urico', unit: 'mg/dL' },
  { name: 'TFG', unit: 'mL/min/1.73m2' },
  { name: 'TGO', unit: 'U/L' },
  { name: 'TGP', unit: 'U/L' },
  { name: 'Gama GT', unit: 'U/L' },
  { name: 'Bilirrubina Total', unit: 'mg/dL' },
  { name: 'Albumina', unit: 'g/dL' },
  { name: 'Proteina C-Reativa', unit: 'mg/L' },
  { name: 'Ferritina', unit: 'ng/mL' },
  { name: 'Ferro Serico', unit: 'ug/dL' },
  { name: 'Vitamina D', unit: 'ng/mL' },
  { name: 'Vitamina B12', unit: 'pg/mL' },
  { name: 'TSH', unit: 'uUI/mL' },
  { name: 'T4 Livre', unit: 'ng/dL' },
  { name: 'PSA Total', unit: 'ng/mL' },
  { name: 'Sodio', unit: 'mEq/L' },
  { name: 'Potassio', unit: 'mEq/L' },
  { name: 'Calcio', unit: 'mg/dL' },
  { name: 'Magnesio', unit: 'mg/dL' },
  { name: 'Fosforo', unit: 'mg/dL' },
];

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  normal:        { bg: 'bg-green-50',  text: 'text-green-700',  label: 'Normal' },
  low:           { bg: 'bg-cyan-50',   text: 'text-cyan-700',   label: 'Abaixo' },
  high:          { bg: 'bg-amber-50',  text: 'text-amber-700',  label: 'Elevado' },
  critical_low:  { bg: 'bg-red-50',    text: 'text-red-700',    label: 'Critico baixo' },
  critical_high: { bg: 'bg-red-50',    text: 'text-red-700',    label: 'Critico alto' },
  pending:       { bg: 'bg-slate-50',  text: 'text-slate-500',  label: 'Sem referencia' },
};

interface MarkerRow {
  id: number;
  marker: string;
  unit: string;
  value: string;
  customMarker: boolean;
}

export default function NewExamPage() {
  const router = useRouter();

  const [meta, setMeta] = useState({
    labName: '',
    doctorName: '',
    examDate: new Date().toISOString().split('T')[0],
    examType: 'sangue',
  });

  const [rows, setRows] = useState<MarkerRow[]>([
    { id: 1, marker: 'Glicose', unit: 'mg/dL', value: '', customMarker: false },
    { id: 2, marker: 'Hemoglobina', unit: 'g/dL', value: '', customMarker: false },
    { id: 3, marker: 'Colesterol Total', unit: 'mg/dL', value: '', customMarker: false },
  ]);

  const [result, setResult] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addRow = () => setRows(r => [...r, { id: Date.now(), marker: 'Glicose', unit: 'mg/dL', value: '', customMarker: false }]);
  const removeRow = (id: number) => setRows(r => r.filter(x => x.id !== id));

  const updateRow = (id: number, field: keyof MarkerRow, val: string) => {
    setRows(r => r.map(x => {
      if (x.id !== id) return x;
      if (field === 'marker' && !x.customMarker) {
        const found = COMMON_MARKERS.find(m => m.name === val);
        return { ...x, marker: val, unit: found?.unit ?? x.unit };
      }
      return { ...x, [field]: val };
    }));
  };

  const handleSubmit = async () => {
    const filledRows = rows.filter(r => r.marker && r.value);
    if (!filledRows.length) { setError('Adicione ao menos um marcador com valor.'); return; }

    setSaving(true); setError('');
    try {
      const payload = {
        examDate: meta.examDate,
        labName: meta.labName || undefined,
        doctorName: meta.doctorName || undefined,
        examType: meta.examType,
        items: filledRows.map(r => ({
          marker: r.marker,
          value: Number(r.value),
          unit: r.unit,
          rawValue: r.value,
        })),
      };
      const { data } = await examResultsApi.create(payload);
      setResult(data);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Erro ao salvar. Tente novamente.');
    } finally { setSaving(false); }
  };

  if (result) {
    const critical = result.items?.filter((i: any) => i.status?.startsWith('critical')) ?? [];
    const abnormal = result.items?.filter((i: any) => i.status === 'high' || i.status === 'low') ?? [];
    const normal   = result.items?.filter((i: any) => i.status === 'normal') ?? [];

    return (
      <AppLayout>
        <div className="p-8 max-w-3xl mx-auto space-y-6">
          <div className={`rounded-2xl p-6 border text-center ${
            critical.length > 0 ? 'bg-red-50 border-red-200' :
            abnormal.length > 0 ? 'bg-amber-50 border-amber-200' :
            'bg-green-50 border-green-200'}`}>
            <div className="text-5xl mb-3">
              {critical.length > 0 ? '🔴' : abnormal.length > 0 ? '⚠️' : '✅'}
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-1">Exame registrado com sucesso!</h2>
            <p className="text-slate-600 text-sm">{result.aiSummary}</p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="card p-4">
              <div className="text-2xl font-bold text-green-600">{normal.length}</div>
              <div className="text-xs text-slate-500 mt-1">Normais</div>
            </div>
            <div className="card p-4">
              <div className="text-2xl font-bold text-amber-600">{abnormal.length}</div>
              <div className="text-xs text-slate-500 mt-1">Alterados</div>
            </div>
            <div className="card p-4">
              <div className="text-2xl font-bold text-red-600">{critical.length}</div>
              <div className="text-xs text-slate-500 mt-1">Criticos</div>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-bold text-slate-800 mb-4">Resultado detalhado</h3>
            <div className="space-y-2">
              {result.items?.map((item: any) => {
                const s = STATUS_STYLE[item.status] ?? STATUS_STYLE.pending;
                return (
                  <div key={item.id} className={`flex items-center justify-between p-3 rounded-xl ${s.bg}`}>
                    <div>
                      <span className="font-semibold text-slate-800">{item.marker}</span>
                      {item.refMin != null && item.refMax != null && (
                        <span className="text-xs text-slate-400 ml-2">ref: {Number(item.refMin).toFixed(1)} a {Number(item.refMax).toFixed(1)} {item.unit}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-800">{Number(item.value).toFixed(2)} {item.unit}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.bg} ${s.text} border border-current/20`}>{s.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setResult(null)}
              className="flex-1 border border-slate-200 text-slate-600 font-semibold py-3 rounded-xl hover:bg-slate-50 transition-colors">
              Lancar outro exame
            </button>
            <button onClick={() => router.push('/records')}
              className="flex-1 bg-[#B91C1C] text-white font-semibold py-3 rounded-xl hover:bg-[#7B1E1E] transition-colors">
              Ver todos os exames
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="bg-[#7B1E1E] px-8 py-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-white text-xl font-bold">Lancamento Manual de Exame</h1>
            <p className="text-white/50 text-sm mt-0.5">Classificacao automatica pelos criterios SBPC/ML</p>
          </div>
          <button onClick={() => router.push('/records')}
            className="text-white/60 hover:text-white text-sm transition-colors">
            Voltar
          </button>
        </div>
      </div>

      <div className="p-8 max-w-3xl mx-auto space-y-6">
        {/* Metadados do exame */}
        <div className="card p-5">
          <h2 className="font-bold text-slate-800 mb-4">Dados do exame</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className="label">Data do exame *</label>
              <input type="date" className="input-field"
                value={meta.examDate} onChange={e => setMeta(m => ({ ...m, examDate: e.target.value }))} />
            </div>
            <div>
              <label className="label">Tipo de exame</label>
              <select className="input-field" value={meta.examType} onChange={e => setMeta(m => ({ ...m, examType: e.target.value }))}>
                <option value="sangue">Hemograma / Sangue</option>
                <option value="bioquimica">Bioquimica</option>
                <option value="hormonal">Hormonal</option>
                <option value="urina">Urina / Fezes</option>
                <option value="cardiologia">Cardiologia</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div>
              <label className="label">Laboratorio</label>
              <input className="input-field" placeholder="Ex: Fleury, Sabin..."
                value={meta.labName} onChange={e => setMeta(m => ({ ...m, labName: e.target.value }))} />
            </div>
            <div>
              <label className="label">Medico solicitante</label>
              <input className="input-field" placeholder="Dr. Nome"
                value={meta.doctorName} onChange={e => setMeta(m => ({ ...m, doctorName: e.target.value }))} />
            </div>
          </div>
        </div>

        {/* Marcadores */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800">Marcadores laboratoriais</h2>
            <button onClick={addRow}
              className="text-sm text-red-700 font-semibold border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
              + Adicionar marcador
            </button>
          </div>

          <div className="space-y-3">
            {rows.map(row => (
              <div key={row.id} className="flex items-start gap-3">
                <div className="flex-1">
                  {row.customMarker ? (
                    <input className="input-field text-sm" placeholder="Nome do marcador"
                      value={row.marker} onChange={e => updateRow(row.id, 'marker', e.target.value)} />
                  ) : (
                    <select className="input-field text-sm"
                      value={row.marker} onChange={e => {
                        if (e.target.value === '__custom') {
                          setRows(r => r.map(x => x.id === row.id ? { ...x, customMarker: true, marker: '' } : x));
                        } else {
                          updateRow(row.id, 'marker', e.target.value);
                        }
                      }}>
                      {COMMON_MARKERS.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                      <option value="__custom">+ Outro marcador...</option>
                    </select>
                  )}
                </div>
                <div className="w-28">
                  <input type="number" step="any" className="input-field text-sm" placeholder="Valor"
                    value={row.value} onChange={e => updateRow(row.id, 'value', e.target.value)} />
                </div>
                <div className="w-24">
                  <input className="input-field text-sm text-slate-500" placeholder="Unidade"
                    value={row.unit} onChange={e => updateRow(row.id, 'unit', e.target.value)} />
                </div>
                <button onClick={() => removeRow(row.id)}
                  className="mt-2 text-slate-300 hover:text-red-400 transition-colors text-lg leading-none">
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-xl text-xs text-blue-700">
            Os valores serao comparados automaticamente com as referencias SBPC/ML e classificados como Normal, Alterado ou Critico.
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4">{error}</div>
        )}

        <div className="flex gap-3">
          <button onClick={() => router.push('/records')}
            className="flex-1 border border-slate-200 text-slate-600 font-semibold py-3 rounded-xl hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 bg-[#B91C1C] text-white font-bold py-3 rounded-xl hover:bg-[#7B1E1E] transition-colors disabled:opacity-60">
            {saving ? 'Classificando e salvando...' : 'Salvar exame'}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
