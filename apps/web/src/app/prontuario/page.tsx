'use client';
// apps/web/src/app/prontuario/page.tsx
// Painel do paciente: gerar QR Code de prontuário compartilhável
import { useEffect, useState } from 'react';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('icodlife_token') : null;
}
function authHeaders() {
  return { headers: { Authorization: `Bearer ${getToken()}` } };
}

const LEVELS = [
  {
    id: 'basic' as const,
    label: 'Básico',
    icon: '🔵',
    description: 'Nome, data de nascimento, tipo sanguíneo, alergias e condições crônicas.',
    color: 'border-blue-300 bg-blue-50',
    badge: 'bg-blue-100 text-blue-700',
  },
  {
    id: 'medium' as const,
    label: 'Médio',
    icon: '🟣',
    description: 'Dados básicos + medicamentos ativos + estilo de vida (IMC, fumo, score).',
    color: 'border-purple-300 bg-purple-50',
    badge: 'bg-purple-100 text-purple-700',
  },
  {
    id: 'complete' as const,
    label: 'Completo',
    icon: '🟢',
    description: 'Todos os dados + últimos 10 exames + histórico de pressão arterial.',
    color: 'border-green-300 bg-green-50',
    badge: 'bg-green-100 text-green-700',
  },
];

interface ShareToken {
  id: string;
  token: string;
  accessLevel: string;
  expiresAt: string;
  viewCount: number;
  maxViews: number | null;
  accessedByName: string | null;
  revokedAt: string | null;
}

export default function ProntuarioPage() {
  const [tokens,  setTokens]  = useState<ShareToken[]>([]);
  const [level,   setLevel]   = useState<'basic' | 'medium' | 'complete'>('basic');
  const [hours,   setHours]   = useState(24);
  const [maxV,    setMaxV]    = useState('');
  const [docName, setDocName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState<ShareToken | null>(null);
  const [error,    setError]   = useState('');

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const load = async () => {
    try {
      const r = await axios.get(`${API}/prontuario/share`, authHeaders());
      setTokens(r.data);
    } catch { setTokens([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    setCreating(true); setError(''); setNewToken(null);
    try {
      const r = await axios.post(`${API}/prontuario/share`, {
        accessLevel:    level,
        expiresInHours: hours,
        maxViews:       maxV ? Number(maxV) : undefined,
        accessedByName: docName || undefined,
      }, authHeaders());
      setNewToken(r.data);
      await load();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Erro ao gerar token');
    } finally { setCreating(false); }
  };

  const revoke = async (id: string) => {
    try {
      await axios.delete(`${API}/prontuario/share/${id}`, authHeaders());
      await load();
      if (newToken?.id === id) setNewToken(null);
    } catch { alert('Erro ao revogar'); }
  };

  const shareUrl = (t: string) => `${origin}/share/${t}`;

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <h1 className="text-xl font-bold text-slate-800">Meu Prontuário</h1>
        <p className="text-slate-500 text-sm mt-0.5">Compartilhe seus dados com médicos via QR Code</p>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">

        {/* Gerador */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Gerar novo link de acesso</h2>

          {/* Escolha o nível */}
          <p className="text-xs font-medium text-slate-600 mb-2">Nível de acesso</p>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {LEVELS.map(l => (
              <button key={l.id} onClick={() => setLevel(l.id)}
                className={`text-left p-3 rounded-xl border-2 transition-all
                  ${level === l.id ? l.color + ' border-2' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span>{l.icon}</span>
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${level === l.id ? l.badge : 'bg-slate-100 text-slate-500'}`}>
                    {l.label}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-snug">{l.description}</p>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Validade (horas)</label>
              <select value={hours} onChange={e => setHours(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none">
                <option value={1}>1 hora</option>
                <option value={6}>6 horas</option>
                <option value={24}>24 horas</option>
                <option value={72}>3 dias</option>
                <option value={168}>7 dias</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Máx. visualizações</label>
              <input value={maxV} onChange={e => setMaxV(e.target.value)} type="number" min="1"
                placeholder="Ilimitado"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nome do médico</label>
              <input value={docName} onChange={e => setDocName(e.target.value)}
                placeholder="Dr. Silva (opcional)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none" />
            </div>
          </div>

          {error && <p className="text-red-600 text-xs mb-3">{error}</p>}

          <button onClick={create} disabled={creating}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
            {creating ? 'Gerando...' : 'Gerar QR Code'}
          </button>
        </div>

        {/* Token recém criado */}
        {newToken && (
          <div className="bg-white border-2 border-green-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-green-600 text-lg">✓</span>
              <p className="text-sm font-semibold text-slate-800">Link gerado com sucesso!</p>
            </div>

            {/* QR Code via API pública */}
            <div className="flex gap-4 items-start">
              <div className="bg-white border border-slate-200 rounded-lg p-2">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(shareUrl(newToken.token))}`}
                  alt="QR Code"
                  width={140}
                  height={140}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 mb-1">URL de acesso</p>
                <div className="flex items-center gap-2 mb-3">
                  <input readOnly value={shareUrl(newToken.token)}
                    className="flex-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded px-2 py-1 min-w-0" />
                  <button onClick={() => copyUrl(shareUrl(newToken.token))}
                    className="px-3 py-1 bg-slate-700 text-white text-xs rounded hover:bg-slate-800 flex-shrink-0">
                    Copiar
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  <span>Expira: {new Date(newToken.expiresAt).toLocaleString('pt-BR')}</span>
                  {newToken.maxViews && <span>· Máx: {newToken.maxViews} views</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tokens ativos */}
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">
            Links ativos ({loading ? '...' : tokens.length})
          </h2>
          {loading ? (
            <p className="text-slate-400 text-sm">Carregando...</p>
          ) : tokens.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
              <p className="text-slate-400 text-sm">Nenhum link ativo no momento.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tokens.map(t => {
                const lvl = LEVELS.find(l => l.id === t.accessLevel);
                const url = shareUrl(t.token);
                return (
                  <div key={t.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${lvl?.badge ?? 'bg-slate-100 text-slate-500'}`}>
                          {lvl?.label ?? t.accessLevel}
                        </span>
                        {t.accessedByName && <span className="text-xs text-slate-500">{t.accessedByName}</span>}
                      </div>
                      <p className="text-xs font-mono text-slate-500 truncate">{url}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Expira {new Date(t.expiresAt).toLocaleString('pt-BR')}
                        · {t.viewCount} visualização(ões)
                        {t.maxViews && ` / máx ${t.maxViews}`}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => copyUrl(url)}
                        className="text-xs text-slate-500 hover:text-slate-800 border border-slate-200 px-2 py-1 rounded">
                        Copiar
                      </button>
                      <button onClick={() => revoke(t.id)}
                        className="text-xs text-red-500 hover:text-red-700 border border-red-200 px-2 py-1 rounded">
                        Revogar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <p className="font-medium mb-1">Privacidade e controle</p>
          <p className="text-xs text-amber-700">
            Você controla quem vê seus dados. Links expiram automaticamente e você pode revogar qualquer um a qualquer momento.
            Nenhuma informação é compartilhada sem você gerar um link.
          </p>
        </div>
      </div>
    </div>
  );
}
