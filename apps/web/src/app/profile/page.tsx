'use client';
// apps/web/src/app/profile/page.tsx
import { useState, useEffect } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { useAuthStore } from '../../store/auth.store';
import { usersApi, authApi } from '../../lib/api';

const BLOOD_TYPES = ['A+','A-','B+','B-','AB+','AB-','O+','O-','unknown'];

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [tab, setTab] = useState<'personal'|'security'|'privacy'|'danger'>('personal');
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [consents, setConsents] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    if (user) setForm({ ...user });
    if (tab === 'privacy') loadConsents();
    if (tab === 'security') loadSessions();
  }, [user, tab]);

  const loadConsents = async () => {
    try { const { data } = await authApi.getConsents(); setConsents(data); } catch {}
  };

  const loadSessions = async () => {
    try { const { data } = await usersApi.getSessions(); setSessions(data); } catch {}
  };

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const saveProfile = async () => {
    setLoading(true); setSaved(false);
    try {
      const { data } = await usersApi.updateProfile(form);
      setUser(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {} finally { setLoading(false); }
  };

  const revokeConsent = async (type: string) => {
    if (!confirm(`Revogar consentimento de "${type}"?`)) return;
    await authApi.revokeConsent(type);
    loadConsents();
  };

  const revokeSession = async (id: string) => {
    await usersApi.revokeSession(id);
    loadSessions();
  };

  const TABS = [
    { id: 'personal', label: '👤 Perfil' },
    { id: 'security', label: '🔐 Segurança' },
    { id: 'privacy',  label: '🛡️ Privacidade' },
    { id: 'danger',   label: '⚠️ Conta' },
  ];

  return (
    <AppLayout>
      <div className="p-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Meu Perfil</h1>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all
                ${tab === t.id ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* PERSONAL */}
        {tab === 'personal' && form && (
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center text-white text-2xl font-bold">
                {user?.fullName?.charAt(0)}
              </div>
              <div>
                <div className="font-bold text-slate-800">{user?.fullName}</div>
                <div className="text-sm text-slate-500">{user?.email}</div>
                <span className="badge-blue">{user?.status}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Nome completo</label>
                <input className="input-field" value={form.fullName || ''} onChange={e => set('fullName', e.target.value)} />
              </div>
              <div>
                <label className="label">Telefone</label>
                <input className="input-field" value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
              </div>
              <div>
                <label className="label">Data de nascimento</label>
                <input className="input-field" type="date" value={form.dateOfBirth?.split('T')[0] || ''} onChange={e => set('dateOfBirth', e.target.value)} />
              </div>
              <div>
                <label className="label">Tipo sanguíneo</label>
                <select className="input-field" value={form.bloodType || ''} onChange={e => set('bloodType', e.target.value)}>
                  {BLOOD_TYPES.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="label">Alergias (separadas por vírgula)</label>
              <input className="input-field" value={(form.allergies || []).join(', ')}
                onChange={e => set('allergies', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))}
                placeholder="Penicilina, látex..." />
            </div>
            <div>
              <label className="label">Condições crônicas</label>
              <input className="input-field" value={(form.chronicConditions || []).join(', ')}
                onChange={e => set('chronicConditions', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))}
                placeholder="Hipertensão, diabetes..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Contato de emergência</label>
                <input className="input-field" value={form.emergencyContactName || ''} onChange={e => set('emergencyContactName', e.target.value)} placeholder="Nome" />
              </div>
              <div>
                <label className="label">Telefone emergência</label>
                <input className="input-field" value={form.emergencyContactPhone || ''} onChange={e => set('emergencyContactPhone', e.target.value)} placeholder="+55 11..." />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" className="w-4 h-4 accent-blue-600" checked={form.isDonor || false} onChange={e => set('isDonor', e.target.checked)} />
                Sou doador(a) de órgãos
              </label>
            </div>

            {saved && <div className="bg-green-50 text-green-700 rounded-xl p-3 text-sm">✓ Perfil atualizado com sucesso!</div>}

            <button onClick={saveProfile} disabled={loading} className="btn-primary">
              {loading ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        )}

        {/* SECURITY */}
        {tab === 'security' && (
          <div className="space-y-4">
            <div className="card p-6">
              <h3 className="font-bold text-slate-800 mb-4">🔐 Autenticação em dois fatores (MFA)</h3>
              <p className="text-sm text-slate-500 mb-4">Adicione uma camada extra de segurança com Google Authenticator ou Authy.</p>
              <button className="btn-outline" onClick={async () => {
                const { data } = await authApi.setupMfa();
                alert(`Escaneie este QR no seu app autenticador:\n${data.qrCode}`);
              }}>Configurar MFA</button>
            </div>

            <div className="card p-6">
              <h3 className="font-bold text-slate-800 mb-4">📱 Sessões ativas</h3>
              <div className="space-y-3">
                {sessions.length === 0 && <p className="text-sm text-slate-400">Nenhuma sessão ativa além desta.</p>}
                {sessions.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div>
                      <div className="text-sm font-semibold text-slate-700">{s.deviceInfo?.userAgent?.slice(0, 40) ?? 'Dispositivo desconhecido'}</div>
                      <div className="text-xs text-slate-400">{s.ipAddress} · {new Date(s.lastUsedAt).toLocaleDateString('pt-BR')}</div>
                    </div>
                    <button onClick={() => revokeSession(s.id)} className="text-red-500 hover:text-red-700 text-sm font-semibold">Encerrar</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <h3 className="font-bold text-slate-800 mb-4">🔑 Alterar senha</h3>
              <button className="btn-outline" onClick={async () => {
                if (user?.email) { await authApi.forgotPassword(user.email); alert('Link de redefinição enviado para seu e-mail.'); }
              }}>Enviar link de redefinição</button>
            </div>
          </div>
        )}

        {/* PRIVACY */}
        {tab === 'privacy' && (
          <div className="space-y-4">
            <div className="card p-6">
              <h3 className="font-bold text-slate-800 mb-1">🛡️ Seus consentimentos (LGPD)</h3>
              <p className="text-sm text-slate-500 mb-4">Gerencie quais usos de dados você autorizou. Você pode revogar a qualquer momento.</p>
              <div className="space-y-3">
                {consents.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div>
                      <div className="text-sm font-semibold text-slate-700">{c.consentType}</div>
                      <div className="text-xs text-slate-400">
                        Versão {c.version} · {new Date(c.acceptedAt).toLocaleDateString('pt-BR')}
                        {c.revokedAt && <span className="text-red-500 ml-2">Revogado</span>}
                      </div>
                    </div>
                    {!c.revokedAt && c.consentType !== 'terms_of_use' && c.consentType !== 'data_processing' && (
                      <button onClick={() => revokeConsent(c.consentType)} className="text-red-500 hover:text-red-700 text-sm font-semibold">Revogar</button>
                    )}
                    {(c.consentType === 'terms_of_use' || c.consentType === 'data_processing') && (
                      <span className="text-xs text-slate-400 italic">Obrigatório</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <h3 className="font-bold text-slate-800 mb-1">📤 Portabilidade de dados</h3>
              <p className="text-sm text-slate-500 mb-4">Exporte todos os seus dados em formato JSON (LGPD Art. 18).</p>
              <button className="btn-outline" onClick={() => alert('Exportação solicitada. Você receberá um e-mail com o link em até 24h.')}>
                Exportar meus dados
              </button>
            </div>
          </div>
        )}

        {/* DANGER ZONE */}
        {tab === 'danger' && (
          <div className="card p-6 border-red-200">
            <h3 className="font-bold text-red-700 mb-1">⚠️ Zona de perigo</h3>
            <p className="text-sm text-slate-500 mb-6">Ações irreversíveis. Prossiga com cuidado.</p>
            <div className="space-y-4">
              <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                <div className="font-semibold text-red-700 mb-1">Deletar minha conta</div>
                <p className="text-sm text-red-600 mb-3">
                  Todos os seus dados serão permanentemente removidos (LGPD Art. 18 — direito ao esquecimento).
                  Esta ação não pode ser desfeita.
                </p>
                <button className="bg-red-600 text-white font-semibold rounded-xl px-4 py-2 text-sm hover:bg-red-700 transition-colors"
                  onClick={async () => {
                    const confirm1 = window.confirm('Tem certeza? Todos os seus dados serão removidos permanentemente.');
                    if (!confirm1) return;
                    const confirm2 = window.confirm('Esta ação NÃO PODE ser desfeita. Confirmar?');
                    if (!confirm2) return;
                    await authApi.deleteAccount();
                    useAuthStore.getState().logout();
                    window.location.href = '/auth/login';
                  }}>
                  Deletar minha conta permanentemente
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
