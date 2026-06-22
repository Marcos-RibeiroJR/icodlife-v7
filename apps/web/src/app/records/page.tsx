'use client';
// apps/web/src/app/records/page.tsx
import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { recordsApi } from '../../lib/api';
import { useDropzone } from 'react-dropzone';
import Link from 'next/link';

const CATEGORIES = ['Todos','Sangue','Cardiologia','Imagem','Neurologia','Outros'];
const STATUS_BADGE: Record<string, string> = {
  normal: 'badge-green', alert: 'badge-amber', critical: 'badge-red', pending: 'badge-blue',
};
const STATUS_LABEL: Record<string, string> = {
  normal: '✓ Normal', alert: '⚠ Atenção', critical: '🔴 Crítico', pending: '⏳ Pendente',
};

export default function RecordsPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [filter, setFilter] = useState('Todos');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [search, setSearch] = useState('');

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
      await recordsApi.upload(files[0], {
        title: files[0].name.replace(/\.[^.]+$/, ''),
        recordType: 'exam',
        category: 'blood',
        recordDate: new Date().toISOString().split('T')[0],
      });
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
      load();
    } catch {} finally { setUploading(false); }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'], 'image/*': ['.jpg','.jpeg','.png'] },
  });

  const filtered = records.filter(r => {
    const matchCat = filter === 'Todos' || r.category?.toLowerCase().includes(filter.toLowerCase());
    const matchSearch = !search || r.title?.toLowerCase().includes(search.toLowerCase()) || r.labName?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
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

        {/* Upload */}
        <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all mb-6
          ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'}`}>
          <input {...getInputProps()} />
          <div className="text-4xl mb-3">{uploading ? '⏳' : uploadSuccess ? '✅' : '📄'}</div>
          <div className="font-semibold text-slate-700">
            {uploading ? 'Processando OCR...' : uploadSuccess ? 'Exame adicionado!' : isDragActive ? 'Solte o arquivo aqui' : 'Arraste um exame ou clique para upload'}
          </div>
          <div className="text-sm text-slate-400 mt-1">PDF ou imagem · Máximo 50MB · OCR automático</div>
        </div>

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
                  {r.resultNotes && <div className="text-xs text-slate-400 mt-1 truncate">{r.resultNotes}</div>}
                </div>
                <span className={STATUS_BADGE[r.resultStatus] ?? 'badge-blue'}>
                  {STATUS_LABEL[r.resultStatus] ?? r.resultStatus}
                </span>
                <div className="flex gap-2">
                  <button className="text-sm text-blue-600 hover:text-blue-800 font-semibold px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors"
                    onClick={async () => {
                      try { const { data } = await recordsApi.getSignedUrl(r.id); window.open(data.url, '_blank'); }
                      catch { alert('Arquivo não disponível'); }
                    }}>
                    Baixar
                  </button>
                  <button className="text-sm text-red-400 hover:text-red-600 font-semibold px-3 py-1.5 rounded-lg border border-red-100 hover:bg-red-50 transition-colors"
                    onClick={async () => {
                      if (!confirm('Deletar este exame?')) return;
                      await recordsApi.delete(r.id); load();
                    }}>
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
          {filtered.length > 0 && (
            <div className="p-3 text-center text-xs text-slate-400 border-t border-slate-50">
              {filtered.length} exame{filtered.length > 1 ? 's' : ''} encontrado{filtered.length > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
