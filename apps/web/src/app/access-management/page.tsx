'use client';
// apps/web/src/app/access-management/page.tsx
import { useState, useEffect } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { shareApi } from '../../lib/api';
import QRCode from 'qrcode.react';

const ACCESS_LEVELS = [
  { value: 'basic', label: 'Básico', desc: 'Tipo sanguíneo, alergias, contato de emergência' },
  { value: 'full',  label: 'Completo', desc: 'Todos os exames, medicamentos, histórico' },
  { value: 'custom', label: 'Personalizado', desc: 'Você escolhe o que compartilhar' },
];

const DURATIONS = [
  { value: 1,  label: '1 hora' },
  { value: 4,  label: '4 horas' },
  { value: 24, label: '24 horas' },
  { value: 72, label: '72 horas' },
];

export default function AccessManagementPage() {
  const [shares, setShares] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [newShare, setNewShare] = useState<any>(null);
  const [form, setForm] = useState({ accessLevel: 'basic', durationHours: 1 });
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadShares(); }, []);

  const loadShares = async () => {
    try { const { data } = await shareApi.list(); setShares(data); } catch {}
  };

  const createShare = async () => {
    setLoading(true);
    try {
      const expiresAt = new Date(Date.now() + form.durationHours * 60 * 60 * 1000);
      const { data } = await shareApi.create({ ...form, expiresAt });
      setNewShare(data);
      loadShares();
    } catch {} finally { setLoading(false); }
  };

  const revoke = async (id: string) => {
    if (!confirm('Revogar este acesso?')) return;
    await shareApi.revoke(id);
    loadShares();
  };

  const shareUrl = (token: string) =>
    `${typeof window !== 'undefined' ? window.location.origin : 'https://app.icodlife.com.br'}/share/${token}`;

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  return (
    <AppLayout>
      <div className="p-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Gestão de Acessos</h1>
            <p className="text-slate-500 text-sm mt-1">Controle quem acessa seus dados médicos e por quanto tempo.</p>
          </div>
          <button onClick={() => setCreating(true)} className="bg-blue-600 text-white font-semibold rounded-xl px-5 py-2.5 hover:bg-blue-700 transition-colors text-sm">
            🔗 Gerar novo acesso
          </button>
        </div>

        {/* CRIAR NOVO */}
        {creating && (
          <div className="card p-6 mb-6 border-blue-200">
            <h3 className="font-bold text-slate-800 mb-4">Novo link de acesso</h3>

            <div className="mb-4">
              <label className="label">Nível de acesso</label>
              <div className="grid grid-cols-3 gap-3">
                {ACCESS_LEVELS.map(l => (
                  <button key={l.value} type="button"
                    onClick={() => setForm(f => ({ ...f, accessLevel: l.value }))}
                    className={`p-3 rounded-xl border-2 text-left transition-all
                      ${form.accessLevel === l.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <div className="font-semibold text-sm text-slate-800">{l.label}</div>
                    <div className="text-xs text-slate-500 mt-1">{l.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="label">Duração do acesso</label>
              <div className="flex gap-2">
                {DURATIONS.map(d => (
                  <button key={d.value} type="button"
                    onClick={() => setForm(f => ({ ...f, durationHours: d.value }))}
                    className={`flex-1 py-2 rounded-lg border-2 text-sm font-semibold transition-all
                      ${form.durationHours === d.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setCreating(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={createShare} disabled={loading} className="btn-primary flex-1">
                {loading ? 'Gerando...' : 'Gerar link + QR Code'}
              </button>
            </div>
          </div>
        )}

        {/* QR CODE GERADO */}
        {newShare && (
          <div className="card p-6 mb-6 border-teal-200 bg-teal-50">
            <h3 className="font-bold text-teal-800 mb-4">✅ Acesso criado com sucesso!</h3>
            <div className="flex gap-6 items-start">
              <div className="bg-white p-3 rounded-xl shadow-sm">
                <QRCode value={shareUrl(newShare.token)} size={140} />
              </div>
              <div className="flex-1">
                <div className="text-sm text-teal-700 mb-2 font-semibold">Link de acesso:</div>
                <div className="bg-white border border-teal-200 rounded-lg p-3 font-mono text-xs text-teal-800 break-all mb-3">
                  {shareUrl(newShare.token)}
                </div>
                <button onClick={() => navigator.clipboard.writeText(shareUrl(newShare.token))}
                  className="text-sm text-teal-700 font-semibold hover:text-teal-900">
                  📋 Copiar link
                </button>
                <div className="text-xs text-teal-600 mt-2">
                  ⏱ Expira em: {new Date(newShare.expiresAt).toLocaleString('pt-BR')}
                </div>
                <div className="text-xs text-teal-600 mt-1">
                  🔒 Nível: {ACCESS_LEVELS.find(l => l.value === newShare.accessLevel)?.label}
                </div>
              </div>
            </div>
            <button onClick={() => setNewShare(null)} className="mt-4 text-sm text-teal-600 hover:text-teal-800 font-semibold">
              Fechar
            </button>
          </div>
        )}

        {/* HISTÓRICO */}
        <div className="card">
          <div className="p-5 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Histórico de compartilhamentos</h3>
            <p className="text-xs text-slate-400 mt-1">Log auditável conforme LGPD</p>
          </div>
          <div className="divide-y divide-slate-50">
            {shares.length === 0 && (
              <div className="p-8 text-center text-slate-400">
                <div className="text-4xl mb-2">🔒</div>
                <div className="text-sm">Nenhum compartilhamento criado ainda.</div>
              </div>
            )}
            {shares.map((s: any) => {
              const expired = isExpired(s.expiresAt);
              const revoked = !!s.revokedAt;
              return (
                <div key={s.id} className="p-4 flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${revoked ? 'bg-red-400' : expired ? 'bg-slate-300' : 'bg-green-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-700">
                        {ACCESS_LEVELS.find(l => l.value === s.accessLevel)?.label}
                      </span>
                      {!expired && !revoked && <span className="badge-green">Ativo</span>}
                      {expired && !revoked && <span className="badge-amber">Expirado</span>}
                      {revoked && <span className="badge-red">Revogado</span>}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Criado: {new Date(s.createdAt).toLocaleString('pt-BR')} ·
                      Expira: {new Date(s.expiresAt).toLocaleString('pt-BR')}
                      {s.accessedAt && ` · Acessado: ${new Date(s.accessedAt).toLocaleString('pt-BR')}`}
                      {s.accessedByName && ` por ${s.accessedByName}`}
                    </div>
                  </div>
                  {!expired && !revoked && (
                    <button onClick={() => revoke(s.id)}
                      className="text-red-500 hover:text-red-700 text-sm font-semibold flex-shrink-0">
                      Revogar
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Info LGPD */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
          🛡️ <strong>LGPD:</strong> Todo acesso é registrado com data, hora e IP.
          Links expiram automaticamente e você pode revogar a qualquer momento.
          Os dados não são armazenados por quem acessa — apenas visualizados.
        </div>
      </div>
    </AppLayout>
  );
}
