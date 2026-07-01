'use client';
// apps/web/src/app/records/page.tsx — Biblioteca de Exames com OCR + confirmação de itens
import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { recordsApi, examResultsApi } from '../../lib/api';
import { useDropzone } from 'react-dropzone';
import Link from 'next/link';

const CATEGORIES = ['Todos','Sangue','Cardiologia','Imagem','Neurologia','Outros'];

interface OcrMarker { marker: string; value: number; unit: string; rawLine?: string; }
interface OcrResult  { record: any; ocr: { success: boolean; markers: OcrMarker[]; examDate: string|null; labName: string|null; confidence: number; }; message: string; }

export default function RecordsPage() {
  const [records,       setRecords]       = useState<any[]>([]);
  const [filter,        setFilter]        = useState('Todos');
  const [loading,       setLoading]       = useState(true);
  const [uploading,     setUploading]     = useState(false);
  const [search,        setSearch]        = useState('');
  const [ocrResult,     setOcrResult]     = useState<OcrResult | null>(null);
  const [ocrMarkers,    setOcrMarkers]    = useState<(OcrMarker & { enabled: boolean })[]>([]);
  const [ocrMeta,       setOcrMeta]       = useState({ examDate: '', labName: '' });
  const [saving,        setSaving]        = useState(false);

  const load = async () => {
    setLoading(true);
    try { const { data } = await recordsApi.list(); setRecords(data); }
    catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const onDrop = useCallback(async (files: File[]) => {
    if (!files[0]) return;
    setUploading(true);
    try {
      const { data } = await recordsApi.upload(files[0], {
        title:      files[0].name.replace(/\.[^.]+$/, ''),
        recordType: 'exam',
        category:   'blood',
        recordDate: new Date().toISOString().split('T')[0],
      });
      // PDF → OCR resultado disponível
      if (data?.ocr) {
        setOcrResult(data);
        setOcrMarkers((data.ocr.markers ?? []).map((m: OcrMarker) => ({ ...m, enabled: true })));
        setOcrMeta({ examDate: data.ocr.examDate ?? new Date().toISOString().split('T')[0], labName: data.ocr.labName ?? '' });
      } else {
        load();
      }
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Erro no upload');
    } finally { setUploading(false); }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'], 'image/*': ['.jpg','.jpeg','.png'] },
  });

  const confirmOcr = async () => {
    if (!ocrResult) return;
    setSaving(true);
    try {
      const items = ocrMarkers.filter(m => m.enabled && m.value > 0).map(m => ({
        marker: m.marker, value: m.value, unit: m.unit,
      }));
      // Cria ExamResult com os itens confirmados
      await examResultsApi.create({
        examDate:  ocrMeta.examDate,
        labName:   ocrMeta.labName || undefined,
        examType:  'sangue',
        items,
      });
      setOcrResult(null);
      load();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Erro ao salvar exame');
    } finally { setSaving(false); }
  };

  const filtered = records.filter(r => {
    const matchCat = filter === 'Todos' || r.category?.toLowerCase().includes(filter.toLowerCase());
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
        {!ocrResult && (
          <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all mb-6
            ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'}`}>
            <input {...getInputProps()} />
            <div className="text-4xl mb-3">{uploading ? '⏳' : '📄'}</div>
            <div className="font-semibold text-slate-700">
              {uploading ? 'Lendo exame com OCR...' : isDragActive ? 'Solte o arquivo aqui' : 'Arraste um exame PDF ou clique para upload'}
            </div>
            <div className="text-sm text-slate-400 mt-1">PDF ou imagem · OCR automático para exames de sangue</div>
          </div>
        )}

        {/* ── Modal de confirmação OCR ───────────────────────────────── */}
        {ocrResult && (
          <div className="bg-white border border-blue-200 rounded-2xl p-6 mb-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">📋 Confirmar itens extraídos do PDF</h2>
                <p className="text-sm text-slate-500 mt-0.5">{ocrResult.message}</p>
                {ocrResult.ocr.confidence > 0 && (
                  <div className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full mt-1
                    ${ocrResult.ocr.confidence >= 60 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    Confiança: {ocrResult.ocr.confidence}%
                  </div>
                )}
              </div>
              <button onClick={() => setOcrResult(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
            </div>

            {/* Meta do exame */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs text-slate-500 font-medium">Data do exame</label>
                <input type="date" value={ocrMeta.examDate} onChange={e => setOcrMeta(m => ({ ...m, examDate: e.target.value }))}
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium">Laboratório</label>
                <input type="text" value={ocrMeta.labName} onChange={e => setOcrMeta(m => ({ ...m, labName: e.target.value }))}
                  placeholder="Nome do laboratório" className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
            </div>

            {/* Marcadores extraídos */}
            {ocrMarkers.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p className="text-sm">Nenhum marcador foi detectado automaticamente.</p>
                <p className="text-xs mt-1">Use o lançamento manual para inserir os valores.</p>
                <Link href="/records/new">
                  <button className="mt-3 text-sm text-blue-600 border border-blue-200 rounded-lg px-4 py-2 hover:bg-blue-50 transition-colors">
                    Inserir manualmente
                  </button>
                </Link>
              </div>
            ) : (
              <>
                <div className="text-xs text-slate-500 font-medium mb-2">
                  Revise e corrija os valores antes de salvar — desmarque os que não deseja importar
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
                <div className="flex gap-3 mt-4">
                  <button onClick={confirmOcr} disabled={saving}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors">
                    {saving ? 'Salvando...' : `Salvar ${ocrMarkers.filter(m => m.enabled).length} marcador(es)`}
                  </button>
                  <button onClick={() => setOcrResult(null)}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Filtros */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <input className="input-field max-w-xs text-sm" placeholder="🔍 Buscar exame..." value={search} onChange={e => setSearch(e.target.value)} />
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(c => (
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
              <p className="text-sm text-slate-300 mt-1">Faça upload de um PDF ou insira manualmente.</p>
            </div>
          )}
          <div className="divide-y divide-slate-50">
            {filtered.map((r: any) => (
              <div key={r.id} className="p-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-2xl flex-shrink-0">🧪</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800">{r.title}</div>
                  <div className="text-sm text-slate-400 mt-0.5">
                    {r.labName && `${r.labName} · `}{new Date(r.recordDate).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <button className="text-sm text-red-400 hover:text-red-600 font-semibold px-3 py-1.5 rounded-lg border border-red-100 hover:bg-red-50 transition-colors"
                  onClick={async () => { if (!confirm('Deletar este exame?')) return; await recordsApi.delete(r.id); load(); }}>✕</button>
              </div>
            ))}
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
