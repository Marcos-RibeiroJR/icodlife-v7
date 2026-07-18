'use client';
// apps/web/src/app/records/page.tsx — Biblioteca de Exames com OCR, classificação por tipo e confirmação de categoria
import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { recordsApi, examResultsApi } from '../../lib/api';
import { useDropzone } from 'react-dropzone';
import Link from 'next/link';

// ── Categorias canônicas (key salva no banco ↔ rótulo exibido) ──────────────
const CATS = [
  { key: 'sangue',      label: 'Sangue',      icon: '🩸' },
  { key: 'imagem',      label: 'Imagem',      icon: '🩻' },
  { key: 'cardiologia', label: 'Cardiologia', icon: '❤️' },
  { key: 'neurologia',  label: 'Neurologia',  icon: '🧠' },
  { key: 'urina',       label: 'Urina',       icon: '🧫' },
  { key: 'outros',      label: 'Outros',      icon: '📄' },
];
const TABS = ['Todos', ...CATS.map(c => c.label)];

// Mapeia valores legados / sinônimos para a key canônica
const LEGACY: Record<string, string> = {
  blood: 'sangue', sangue: 'sangue', hemograma: 'sangue', bioquimica: 'sangue',
  image: 'imagem', imagem: 'imagem', imaging: 'imagem', raiox: 'imagem', 'raio-x': 'imagem', radiologia: 'imagem',
  cardio: 'cardiologia', cardiologia: 'cardiologia',
  neuro: 'neurologia', neurologia: 'neurologia',
  urina: 'urina', urine: 'urina',
  general: 'outros', geral: 'outros', exam: 'outros', outros: 'outros', other: 'outros',
};
const normCat = (raw?: string) => LEGACY[(raw || '').toLowerCase().trim()] ?? 'outros';
const catMeta = (key: string) => CATS.find(c => c.key === key) ?? CATS[CATS.length - 1];
const labelToKey = (label: string) => CATS.find(c => c.label === label)?.key ?? 'outros';

interface OcrMarker { marker: string; value: number; unit: string; rawLine?: string; }
interface OcrResult  { record: any; ocr: { success: boolean; markers: OcrMarker[]; examDate: string|null; labName: string|null; confidence: number; category?: string; }; message: string; }

export default function RecordsPage() {
  const [records,     setRecords]     = useState<any[]>([]);
  const [filter,      setFilter]      = useState('Todos');
  const [loading,     setLoading]     = useState(true);
  const [uploading,   setUploading]   = useState(false);
  const [search,      setSearch]      = useState('');
  const [pending,     setPending]     = useState<{ recordId: string; hasMarkers: boolean } | null>(null);
  const [ocrMarkers,  setOcrMarkers]  = useState<(OcrMarker & { enabled: boolean })[]>([]);
  const [ocrMeta,     setOcrMeta]     = useState({ examDate: '', labName: '' });
  const [category,    setCategory]    = useState('sangue');
  const [confidence,  setConfidence]  = useState(0);
  const [saving,      setSaving]      = useState(false);

  const load = async () => {
    setLoading(true);
    try { const { data } = await recordsApi.list(); setRecords(data); }
    catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const today = () => new Date().toISOString().split('T')[0];

  const onDrop = useCallback(async (files: File[]) => {
    if (!files[0]) return;
    const isPdf = files[0].type === 'application/pdf';
    setUploading(true);
    try {
      const { data } = await recordsApi.upload(files[0], {
        title:      files[0].name.replace(/\.[^.]+$/, ''),
        recordType: 'exam',
        category:   isPdf ? 'outros' : 'imagem', // imagem é o palpite p/ upload de imagem; PDF é classificado no servidor
        recordDate: today(),
      });

      if (data?.ocr) {
        // PDF processado pelo OCR
        const sugg = normCat(data.ocr.category);
        setPending({ recordId: data.record?.id, hasMarkers: (data.ocr.markers ?? []).length > 0 });
        setOcrMarkers((data.ocr.markers ?? []).map((m: OcrMarker) => ({ ...m, enabled: true })));
        setOcrMeta({ examDate: data.ocr.examDate ?? today(), labName: data.ocr.labName ?? '' });
        setCategory(sugg);
        setConfidence(data.ocr.confidence ?? 0);
      } else {
        // Imagem / arquivo sem OCR → confirma categoria mesmo assim
        setPending({ recordId: data?.id, hasMarkers: false });
        setOcrMarkers([]);
        setOcrMeta({ examDate: (data?.recordDate ?? today()).slice(0, 10), labName: '' });
        setCategory(normCat(data?.category) || 'imagem');
        setConfidence(0);
      }
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Erro no upload');
    } finally { setUploading(false); }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'], 'image/*': ['.jpg','.jpeg','.png'] },
  });

  const closeModal = () => { setPending(null); setOcrMarkers([]); };

  const confirmSave = async () => {
    if (!pending) return;
    setSaving(true);
    try {
      // 1) Se houver marcadores de sangue confirmados, cria o ExamResult (alimenta timeline/estatística)
      const items = ocrMarkers.filter(m => m.enabled && m.value > 0).map(m => ({ marker: m.marker, value: m.value, unit: m.unit }));
      if (items.length > 0) {
        await examResultsApi.create({
          examDate: ocrMeta.examDate,
          labName:  ocrMeta.labName || undefined,
          examType: category,
          items,
        });
      }
      // 2) Atualiza a categoria/data do arquivo para aparecer na aba correta
      if (pending.recordId) {
        await recordsApi.update(pending.recordId, { category, recordDate: ocrMeta.examDate });
      }
      closeModal();
      load();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Erro ao salvar exame');
    } finally { setSaving(false); }
  };

  const filtered = records.filter(r => {
    const matchCat = filter === 'Todos' || normCat(r.category) === labelToKey(filter);
    const matchSrc = !search || r.title?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSrc;
  });

  return (
    <AppLayout>
      <div className="p-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-800">🧪 Biblioteca de Exames</h1>
          <Link href="/records/new">
            <button className="bg-[#B91C1C] hover:bg-[#7B1E1E] text-white font-semibold rounded-xl px-4 py-2.5 transition-colors text-sm">
              + Inserir manualmente
            </button>
          </Link>
        </div>

        {/* Upload dropzone */}
        {!pending && (
          <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all mb-6
            ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'}`}>
            <input {...getInputProps()} />
            <div className="text-4xl mb-3">{uploading ? '⏳' : '📄'}</div>
            <div className="font-semibold text-slate-700">
              {uploading ? 'Lendo exame com OCR...' : isDragActive ? 'Solte o arquivo aqui' : 'Arraste um exame PDF ou imagem, ou clique para upload'}
            </div>
            <div className="text-sm text-slate-400 mt-1">Identificamos o tipo do exame automaticamente e organizamos na aba certa</div>
          </div>
        )}

        {/* ── Modal de confirmação ───────────────────────────────── */}
        {pending && (
          <div className="bg-white border border-blue-200 rounded-2xl p-6 mb-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">📋 Confirmar exame</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {pending.hasMarkers
                    ? 'Revise a categoria e os valores extraídos antes de salvar.'
                    : 'Confirme em qual categoria este exame deve ficar.'}
                </p>
                {confidence > 0 && (
                  <div className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full mt-1
                    ${confidence >= 60 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    Confiança OCR: {confidence}%
                  </div>
                )}
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
            </div>

            {/* Categoria sugerida */}
            <div className="mb-4">
              <label className="text-xs text-slate-500 font-medium">Categoria (aba) — sugerida automaticamente, ajuste se necessário</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {CATS.map(c => (
                  <button key={c.key} onClick={() => setCategory(c.key)}
                    className={`text-sm font-semibold px-3 py-1.5 rounded-lg border-2 transition-all
                      ${category === c.key ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Meta do exame */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs text-slate-500 font-medium">Data da coleta</label>
                <input type="date" value={ocrMeta.examDate} onChange={e => setOcrMeta(m => ({ ...m, examDate: e.target.value }))}
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium">Laboratório</label>
                <input type="text" value={ocrMeta.labName} onChange={e => setOcrMeta(m => ({ ...m, labName: e.target.value }))}
                  placeholder="Nome do laboratório" className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
            </div>

            {/* Marcadores extraídos (só p/ sangue) */}
            {pending.hasMarkers && ocrMarkers.length > 0 && (
              <>
                <div className="text-xs text-slate-500 font-medium mb-2">
                  Revise e corrija os valores — desmarque os que não deseja importar
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {ocrMarkers.map((m, i) => (
                    <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors
                      ${m.enabled ? 'border-blue-100 bg-blue-50/40' : 'border-slate-100 bg-slate-50 opacity-50'}`}>
                      <input type="checkbox" checked={m.enabled}
                        onChange={e => setOcrMarkers(ms => ms.map((x, j) => j === i ? { ...x, enabled: e.target.checked } : x))}
                        className="w-4 h-4 rounded accent-blue-600 flex-shrink-0" />
                      <span className="text-sm font-medium text-slate-700 w-44 truncate">{m.marker}</span>
                      <input type="number" value={m.value}
                        onChange={e => setOcrMarkers(ms => ms.map((x, j) => j === i ? { ...x, value: Number(e.target.value) } : x))}
                        className="w-24 border border-slate-200 rounded-lg px-2 py-1 text-sm text-center focus:ring-1 focus:ring-blue-400 focus:outline-none" />
                      <input type="text" value={m.unit}
                        onChange={e => setOcrMarkers(ms => ms.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))}
                        className="w-24 border border-slate-200 rounded-lg px-2 py-1 text-sm text-center focus:ring-1 focus:ring-blue-400 focus:outline-none" />
                    </div>
                  ))}
                </div>
              </>
            )}

            {pending.hasMarkers && ocrMarkers.length === 0 && (
              <div className="text-center py-4 text-slate-400 text-sm">
                Nenhum marcador detectado — o exame será salvo apenas na categoria escolhida.
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button onClick={confirmSave} disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors">
                {saving ? 'Salvando...' : ocrMarkers.filter(m => m.enabled).length > 0
                  ? `Salvar em ${catMeta(category).label} · ${ocrMarkers.filter(m => m.enabled).length} marcador(es)`
                  : `Salvar em ${catMeta(category).label}`}
              </button>
              <button onClick={closeModal}
                className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <input className="input-field max-w-xs text-sm" placeholder="🔍 Buscar exame..." value={search} onChange={e => setSearch(e.target.value)} />
          <div className="flex gap-2 flex-wrap">
            {TABS.map(c => (
              <button key={c} onClick={() => setFilter(c)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all
                  ${filter === c ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        <div className="card">
          {loading && <div className="p-8 text-center text-slate-400">Carregando exames...</div>}
          {!loading && filtered.length === 0 && (
            <div className="p-10 text-center">
              <div className="text-4xl mb-3">🧪</div>
              <p className="text-slate-400">Nenhum exame encontrado.</p>
              <p className="text-sm text-slate-300 mt-1">Faça upload de um PDF/imagem ou insira manualmente.</p>
            </div>
          )}
          <div className="divide-y divide-slate-50">
            {filtered.map((r: any) => {
              const cm = catMeta(normCat(r.category));
              return (
                <div key={r.id} className="p-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-2xl flex-shrink-0">{cm.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-800 truncate">{r.title}</div>
                    <div className="text-sm text-slate-400 mt-0.5">
                      <span className="inline-block text-[11px] font-semibold text-slate-500 bg-slate-100 rounded-full px-2 py-0.5 mr-2">{cm.label}</span>
                      {r.labName && `${r.labName} · `}{new Date(r.recordDate).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <button className="text-sm text-red-400 hover:text-red-600 font-semibold px-3 py-1.5 rounded-lg border border-red-100 hover:bg-red-50 transition-colors"
                    onClick={async () => { if (!confirm('Deletar este exame?')) return; await recordsApi.delete(r.id); load(); }}>✕</button>
                </div>
              );
            })}
          </div>
          {filtered.length > 0 && (
            <div className="p-3 text-center text-xs text-slate-400 border-t border-slate-50">
              {filtered.length} exame{filtered.length > 1 ? 's' : ''} encontrado{filtered.length > 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Link para timeline */}
        <div className="mt-4 text-center">
          <Link href="/exam-timeline" className="text-sm text-blue-600 hover:text-blue-800 font-semibold">
            Ver evolução dos exames de sangue →
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
