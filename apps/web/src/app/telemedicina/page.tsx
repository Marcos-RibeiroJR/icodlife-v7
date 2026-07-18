'use client';
// apps/web/src/app/telemedicina/page.tsx
// Página do paciente: entrar em sala de telemedicina via link/token
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/api\/v1\/?$/, '');

export default function TelemedicinaPacientePage() {
  const router  = useRouter();
  const [token, setToken]       = useState('');
  const [name,  setName]        = useState('');
  const [reason, setReason]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState('');

  const handleEnter = async () => {
    if (!token.trim() || !name.trim()) { setError('Preencha o código e seu nome.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/v1/telemedicine/join/${token.trim()}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ patientName: name.trim(), reason: reason.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? 'Sala não encontrada');
      }
      router.push(`/telemedicina/${token.trim()}?name=${encodeURIComponent(name.trim())}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🩺</div>
          <h1 className="text-2xl font-bold text-slate-800">Teleconsulta</h1>
          <p className="text-slate-500 text-sm mt-1">Insira o código enviado pelo seu médico</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Código da consulta</label>
            <input
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="Ex: 3f8a-2c1d-..."
              className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Seu nome completo</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="João da Silva"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Motivo da consulta (opcional)</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Dor de cabeça, acompanhamento..."
              rows={2}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <button
            onClick={handleEnter}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
          >
            {loading ? 'Entrando...' : 'Entrar na sala de espera →'}
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Sua privacidade é protegida. A chamada é criptografada.
        </p>
      </div>
    </div>
  );
}
