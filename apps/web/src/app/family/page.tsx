'use client';
// apps/web/src/app/family/page.tsx
import { useState, useEffect } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { familyApi } from '../../lib/api';

const RELATIONSHIPS = [
  { value:'father', label:'Pai' },
  { value:'mother', label:'Mãe' },
  { value:'sibling', label:'Irmão/Irmã' },
  { value:'child', label:'Filho(a)' },
  { value:'grandparent', label:'Avô/Avó' },
  { value:'grandchild', label:'Neto(a)' },
  { value:'spouse', label:'Cônjuge' },
  { value:'partner', label:'Parceiro(a)' },
  { value:'other', label:'Outro' },
];

const REL_EMOJI: Record<string, string> = {
  father:'👨', mother:'👩', sibling:'👫', child:'👦', grandparent:'👴',
  grandchild:'👶', spouse:'💑', partner:'🤝', other:'👤',
};

export default function FamilyPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [hereditary, setHereditary] = useState<any>(null);
  const [tab, setTab] = useState<'tree'|'hereditary'>('tree');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    relationship: 'father', customLabel: '', fullName: '',
    email: '', gender: 'male', shareHereditary: true, shareConditions: false,
  });
  const [loading, setLoading] = useState(false);
  const [invited, setInvited] = useState(false);

  useEffect(() => { loadFamily(); }, []);
  useEffect(() => { if (tab === 'hereditary') loadHereditary(); }, [tab]);

  const loadFamily = async () => {
    try { const { data } = await familyApi.list(); setMembers(data); } catch {}
  };

  const loadHereditary = async () => {
    try { const { data } = await familyApi.getHereditary(); setHereditary(data); } catch {}
  };

  const invite = async () => {
    setLoading(true);
    try {
      await familyApi.invite(inviteForm);
      setInvited(true); setShowInvite(false);
      await loadFamily();
      setTimeout(() => setInvited(false), 4000);
    } catch {} finally { setLoading(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Remover familiar da sua árvore?')) return;
    await familyApi.remove(id); loadFamily();
  };

  const statusBadge = (status: string) => ({
    accepted: <span className="badge-green">✓ Conectado</span>,
    pending:  <span className="badge-amber">⏳ Aguardando</span>,
    declined: <span className="badge-red">✗ Recusado</span>,
    expired:  <span className="text-xs text-slate-400">Expirado</span>,
  }[status] ?? null);

  const riskColor = (level: string) => ({
    high: 'bg-red-50 border-red-200 text-red-700',
    medium: 'bg-amber-50 border-amber-200 text-amber-700',
    low: 'bg-green-50 border-green-200 text-green-700',
  }[level] ?? 'bg-slate-50');

  return (
    <AppLayout>
      <div className="p-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Família</h1>
            <p className="text-slate-500 text-sm mt-1">Sua árvore familiar e dados hereditários.</p>
          </div>
          <button onClick={() => setShowInvite(true)}
            className="bg-blue-600 text-white font-semibold rounded-xl px-4 py-2.5 hover:bg-blue-700 transition-colors text-sm">
            + Convidar familiar
          </button>
        </div>

        {invited && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 text-sm mb-4">
            ✅ Convite enviado! O familiar receberá um e-mail para aceitar. Apenas usuários ativos no IcodLife podem aceitar convites.
          </div>
        )}

        {/* Convidar */}
        {showInvite && (
          <div className="card p-6 mb-6 border-blue-200">
            <h3 className="font-bold text-slate-800 mb-4">Convidar familiar</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 mb-4">
              ℹ️ <strong>Regra:</strong> O familiar convidado só poderá aceitar o convite se já for um usuário ativo no IcodLife.
              Se não tiver conta, o link de convite direcionará para o cadastro.
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Relação *</label>
                <select className="input-field" value={inviteForm.relationship}
                  onChange={e => setInviteForm(f => ({ ...f, relationship: e.target.value }))}>
                  {RELATIONSHIPS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Rótulo personalizado</label>
                <input className="input-field" value={inviteForm.customLabel}
                  onChange={e => setInviteForm(f => ({ ...f, customLabel: e.target.value }))}
                  placeholder="Ex: Avô materno" />
              </div>
              <div>
                <label className="label">Nome completo</label>
                <input className="input-field" value={inviteForm.fullName}
                  onChange={e => setInviteForm(f => ({ ...f, fullName: e.target.value }))}
                  placeholder="Nome do familiar" />
              </div>
              <div>
                <label className="label">E-mail (para convidar)</label>
                <input className="input-field" type="email" value={inviteForm.email}
                  onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="familiar@email.com" />
              </div>
              <div>
                <label className="label">Gênero</label>
                <select className="input-field" value={inviteForm.gender}
                  onChange={e => setInviteForm(f => ({ ...f, gender: e.target.value }))}>
                  <option value="male">♂ Masculino</option>
                  <option value="female">♀ Feminino</option>
                  <option value="other">⊕ Outro</option>
                </select>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" className="w-4 h-4 accent-blue-600"
                  checked={inviteForm.shareHereditary}
                  onChange={e => setInviteForm(f => ({ ...f, shareHereditary: e.target.checked }))} />
                Compartilhar dados hereditários mutuamente
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" className="w-4 h-4 accent-blue-600"
                  checked={inviteForm.shareConditions}
                  onChange={e => setInviteForm(f => ({ ...f, shareConditions: e.target.checked }))} />
                Compartilhar condições crônicas e alergias
              </label>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowInvite(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={invite} disabled={loading} className="btn-primary flex-1">
                {loading ? 'Enviando...' : 'Enviar convite'}
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
          {[{ id:'tree', label:'🌳 Árvore Familiar' }, { id:'hereditary', label:'🧬 Hereditariedade' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all
                ${tab === t.id ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* TREE */}
        {tab === 'tree' && (
          <div className="space-y-3">
            {members.length === 0 && (
              <div className="card p-10 text-center">
                <div className="text-5xl mb-3">👨‍👩‍👧‍👦</div>
                <div className="text-slate-500 text-sm">Adicione familiares para construir sua árvore.</div>
              </div>
            )}
            {members.map((m: any) => (
              <div key={m.id} className="card p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-2xl flex-shrink-0">
                  {m.memberUser?.avatarUrl
                    ? <img src={m.memberUser.avatarUrl} className="w-full h-full rounded-full object-cover" alt="" />
                    : REL_EMOJI[m.relationship] ?? '👤'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800">
                      {m.memberUser?.fullName ?? m.fullName ?? 'Sem nome'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {RELATIONSHIPS.find(r => r.value === m.relationship)?.label}
                      {m.customLabel && ` (${m.customLabel})`}
                    </span>
                    {statusBadge(m.inviteStatus)}
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-slate-400">
                    {m.shareHereditary && <span>🧬 Hereditariedade</span>}
                    {m.shareConditions && <span>🏥 Condições</span>}
                    {m.inviteEmail && <span>📧 {m.inviteEmail}</span>}
                  </div>
                </div>
                <button onClick={() => remove(m.id)} className="text-slate-300 hover:text-red-400 transition-colors text-lg">✕</button>
              </div>
            ))}
          </div>
        )}

        {/* HEREDITARY */}
        {tab === 'hereditary' && hereditary && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="card p-4 text-center">
                <div className="text-3xl font-bold text-blue-600">{hereditary.familyCount}</div>
                <div className="text-sm text-slate-500">Familiares conectados</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-3xl font-bold text-amber-600">{Object.keys(hereditary.hereditaryConditions || {}).length}</div>
                <div className="text-sm text-slate-500">Condições mapeadas</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-3xl font-bold text-red-600">
                  {hereditary.riskFactors?.filter((r: any) => r.riskLevel === 'high').length ?? 0}
                </div>
                <div className="text-sm text-slate-500">Fatores de alto risco</div>
              </div>
            </div>

            {hereditary.riskFactors?.length > 0 && (
              <div className="card p-5">
                <h3 className="font-bold text-slate-800 mb-3">🧬 Análise de risco hereditário</h3>
                <div className="space-y-2">
                  {hereditary.riskFactors.map((r: any) => (
                    <div key={r.condition} className={`p-3 rounded-xl border ${riskColor(r.riskLevel)}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{r.condition}</span>
                        <span className="text-xs font-bold">
                          {r.riskLevel === 'high' ? '🔴 Alto risco' : r.riskLevel === 'medium' ? '🟡 Risco médio' : '🟢 Baixo risco'}
                        </span>
                      </div>
                      <div className="text-xs mt-1 opacity-75">
                        Afeta: {r.affectedMembers.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-3">
                  ⚠️ Esta análise é informativa. Consulte um médico para avaliação clínica.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
