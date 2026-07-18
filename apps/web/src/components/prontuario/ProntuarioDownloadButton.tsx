'use client';
// apps/web/src/components/prontuario/ProntuarioDownloadButton.tsx
// Sprint 19 — Botão de download do prontuário em PDF com assinatura digital
import { useState } from 'react';
import { useAuthStore } from '../../store/auth.store';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/api\/v1\/?$/, '');

export function ProntuarioDownloadButton() {
  const { accessToken } = useAuthStore.getState() as any;
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const download = async () => {
    const token = (useAuthStore.getState() as any).accessToken ?? accessToken;
    if (!token) { setError('Sessão expirada. Faça login novamente.'); return; }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/v1/export/pdf/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`Erro ${res.status}`);

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `prontuario-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message ?? 'Erro ao gerar prontuário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">📄</span>
        <div>
          <p className="font-bold text-slate-800 text-sm">Prontuário Digital</p>
          <p className="text-slate-500 text-xs">PDF com assinatura digital · QR de verificação</p>
        </div>
      </div>

      {error && (
        <p className="text-red-500 text-xs mb-2">⚠️ {error}</p>
      )}

      <button
        onClick={download}
        disabled={loading}
        className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all
          ${loading
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
            : 'bg-[#002B5C] hover:bg-[#003a7a] text-white shadow-sm'
          }`}
      >
        {loading ? (
          <>
            <span className="animate-spin">⏳</span>
            Gerando PDF...
          </>
        ) : (
          <>
            <span>📥</span>
            Baixar Prontuário PDF
          </>
        )}
      </button>
      <p className="text-slate-400 text-[10px] text-center mt-2">
        Válido por 1 ano · Proteção LGPD
      </p>
    </div>
  );
}
