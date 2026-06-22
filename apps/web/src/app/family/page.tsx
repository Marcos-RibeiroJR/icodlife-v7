'use client';
// apps/web/src/app/family/page.tsx
import { useState, useEffect } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { familyApi } from '../../lib/api';

const RELATIONSHIPS = [
  { value:'father', label:'Pai' }, { value:'mother', label:'Mae' },
  { value:'sibling', label:'Irmao/Irma' }, { value:'child', label:'Filho(a)' },
  { value:'grandparent', label:'Avo/Avo' }, { value:'grandchild', label:'Neto(a)' },
  { value:'spouse', label:'Conjuge' }, { value:'partner', label:'Parceiro(a)' },
  { value:'other', label:'Outro' },
];

const REL_ICON: Record<string,string> = {
  father:'👨', mother:'👩', sibling:'👫', child:'👶',
  grandparent:'👴', grandchild:'🧒', spouse:'💑', partner:'🤝', other:'👤',
};

// Gera posicoes SVG para a arvore familiar
// Layout: avos (linha 0), pais/conjuge (linha 1), EU (linha 2), filhos (linha 3), irmaos (mesmo nivel que pais)
type NodeData = { id: string; name: string; rel: string; gender: string; status: string; x: number; y: number; avatar?: string; conditions?: string[] };

function buildTree(members: any[], selfName: string, selfGender: string): NodeData[] {
  const nodes: NodeData[] = [];
  const W = 600;

  // Eu
  nodes.push({ id: 'self', name: selfName || 'Voce', rel: 'self', gender: selfGender, status: 'self', x: W / 2, y: 220 });

  const grandparents = members.filter(m => m.relationship === 'grandparent');
  const father       = members.find(m => m.relationship === 'father');
  const mother       = members.find(m => m.relationship === 'mother');
  const siblings     = members.filter(m => m.relationship === 'sibling');
  const children     = members.filter(m => m.relationship === 'child');
  const spouse       = members.find(m => m.relationship === 'spouse' || m.relationship === 'partner');
  const others       = members.filter(m => !['grandparent','father','mother','sibling','child','spouse','partner'].includes(m.relationship));

  // Avos
  const gpSpacing = W / (grandparents.length + 1);
  grandparents.forEach((gp, i) => nodes.push({
    id: gp.id, name: gp.memberUser?.fullName ?? gp.fullName ?? 'Avo/Ava',
    rel: gp.relationship, gender: gp.memberUser?.gender ?? gp.gender ?? 'male',
    status: gp.inviteStatus, x: gpSpacing * (i + 1), y: 60,
    conditions: gp.memberUser?.conditions,
  }));

  // Pai e mae
  if (father) nodes.push({ id: father.id, name: father.memberUser?.fullName ?? father.fullName ?? 'Pai',
    rel: 'father', gender: 'male', status: father.inviteStatus, x: W / 2 - 130, y: 140, avatar: father.memberUser?.avatarUrl });
  if (mother) nodes.push({ id: mother.id, name: mother.memberUser?.fullName ?? mother.fullName ?? 'Mae',
    rel: 'mother', gender: 'female', status: mother.inviteStatus, x: W / 2 - 10, y: 140, avatar: mother.memberUser?.avatarUrl });

  // Conjuge
  if (spouse) nodes.push({ id: spouse.id, name: spouse.memberUser?.fullName ?? spouse.fullName ?? 'Conjuge',
    rel: spouse.relationship, gender: spouse.memberUser?.gender ?? 'other',
    status: spouse.inviteStatus, x: W / 2 + 130, y: 220, avatar: spouse.memberUser?.avatarUrl });

  // Irmaos
  const sibSpacing = 90;
  siblings.forEach((s, i) => nodes.push({
    id: s.id, name: s.memberUser?.fullName ?? s.fullName ?? 'Irmao',
    rel: 'sibling', gender: s.memberUser?.gender ?? s.gender ?? 'male',
    status: s.inviteStatus, x: 80 + i * sibSpacing, y: 220, avatar: s.memberUser?.avatarUrl,
  }));

  // Filhos
  const childSpacing = W / (children.length + 1);
  children.forEach((c, i) => nodes.push({
    id: c.id, name: c.memberUser?.fullName ?? c.fullName ?? 'Filho(a)',
    rel: 'child', gender: c.memberUser?.gender ?? c.gender ?? 'other',
    status: c.inviteStatus, x: childSpacing * (i + 1), y: 310, avatar: c.memberUser?.avatarUrl,
  }));

  // Outros
  others.forEach((o, i) => nodes.push({
    id: o.id, name: o.memberUser?.fullName ?? o.fullName ?? 'Familiar',
    rel: o.relationship, gender: o.memberUser?.gender ?? 'other',
    status: o.inviteStatus, x: W - 80 - i * 80, y: 310,
  }));

  return nodes;
}

function NodeCircle({ n, onClick }: { n: NodeData; onClick: (id: string) => void }) {
  const fill =
    n.status === 'self'     ? '#7B1E1E' :
    n.status === 'accepted' ? '#1e40af' :
    n.status === 'pending'  ? '#d97706' : '#94a3b8';
  const relIcon = REL_ICON[n.rel] ?? '👤';

  return (
    <g onClick={() => n.id !== 'self' && onClick(n.id)} style={{ cursor: n.id !== 'self' ? 'pointer' : 'default' }}>
      <circle cx={n.x} cy={n.y} r={22} fill={fill} opacity={0.15} />
      <circle cx={n.x} cy={n.y} r={18} fill={fill} />
      <text x={n.x} y={n.y + 1} textAnchor="middle" dominantBaseline="middle" fontSize={14}>{relIcon}</text>
      <text x={n.x} y={n.y + 30} textAnchor="middle" fontSize={8} fill="#475569" fontWeight="600">
        {n.name.split(' ')[0].slice(0, 10)}
      </text>
      {n.status === 'pending' && (
        <circle cx={n.x + 13} cy={n.y - 13} r={5} fill="#f59e0b" stroke="white" strokeWidth={1} />
      )}
    </g>
  );
}

function TreeConnectors({ nodes }: { nodes: NodeData[] }) {
  const self   = nodes.find(n => n.id === 'self');
  const father = nodes.find(n => n.rel === 'father');
  const mother = nodes.find(n => n.rel === 'mother');
  if (!self) return null;

  const lines: React.ReactElement[] = [];
  const stroke = '#cbd5e1';
  const sw = 1.5;

  // Avos → pais
  const gps = nodes.filter(n => n.rel === 'grandparent');
  const parentY = father?.y ?? mother?.y ?? 140;
  if (gps.length > 0 && (father || mother)) {
    const midParentX = ((father?.x ?? 0) + (mother?.x ?? 0)) / 2;
    gps.forEach(gp => {
      lines.push(<line key={`gp-${gp.id}`} x1={gp.x} y1={gp.y + 18} x2={midParentX} y2={parentY - 18}
        stroke={stroke} strokeWidth={sw} strokeDasharray="4,3" />);
    });
  }

  // Pais → eu
  if (father || mother) {
    const midX = ((father?.x ?? self.x) + (mother?.x ?? self.x)) / 2;
    const midY = ((father?.y ?? 0) + (mother?.y ?? 0)) / 2;
    if (father) lines.push(<line key="father-self" x1={father.x} y1={father.y + 18} x2={midX} y2={midY + 20} stroke={stroke} strokeWidth={sw} />);
    if (mother) lines.push(<line key="mother-self" x1={mother.x} y1={mother.y + 18} x2={midX} y2={midY + 20} stroke={stroke} strokeWidth={sw} />);
    lines.push(<line key="mid-self" x1={midX} y1={midY + 20} x2={self.x} y2={self.y - 18} stroke={stroke} strokeWidth={sw} />);
  }

  // Conjuge
  const spouse = nodes.find(n => n.rel === 'spouse' || n.rel === 'partner');
  if (spouse) {
    lines.push(<line key="spouse" x1={self.x + 18} y1={self.y} x2={spouse.x - 18} y2={spouse.y}
      stroke="#ec4899" strokeWidth={1.5} strokeDasharray="3,2" />);
  }

  // Irmaos
  nodes.filter(n => n.rel === 'sibling').forEach(s => {
    lines.push(<line key={`sib-${s.id}`} x1={s.x} y1={s.y - 18} x2={self.x} y2={self.y - 18}
      stroke={stroke} strokeWidth={sw} strokeDasharray="4,3" />);
  });

  // Filhos → eu
  nodes.filter(n => n.rel === 'child').forEach(c => {
    lines.push(<line key={`child-${c.id}`} x1={self.x} y1={self.y + 18} x2={c.x} y2={c.y - 18}
      stroke={stroke} strokeWidth={sw} />);
  });

  return <>{lines}</>;
}

const HEREDITARY_DISEASES = ['Diabetes tipo 2','Hipertensao','Doenca cardiovascular','AVC','Cancer de mama','Cancer de colon','Cancer de prostata','Depressao','Alzheimer','Obesidade','Doenca renal','Tireoidite'];

export default function FamilyPage() {
  const [members, setMembers]       = useState<any[]>([]);
  const [hereditary, setHereditary] = useState<any>(null);
  const [tab, setTab]               = useState<'tree'|'hereditary'|'invite'>('tree');
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const [form, setForm] = useState({
    relationship: 'father', customLabel: '', fullName: '', email: '',
    gender: 'male', shareHereditary: true, shareConditions: false,
  });

  // Estado local para doenças hereditárias por membro (sem backend — localStorage)
  const [memberConditions, setMemberConditions] = useState<Record<string, string[]>>({});

  // Carrega condições do localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('icodlife-family-conditions');
      if (stored) setMemberConditions(JSON.parse(stored));
    } catch {}
  }, []);

  const saveConditions = (memberId: string, conditions: string[]) => {
    const updated = { ...memberConditions, [memberId]: conditions };
    setMemberConditions(updated);
    try { localStorage.setItem('icodlife-family-conditions', JSON.stringify(updated)); } catch {}
  };

  useEffect(() => { loadFamily(); }, []);
  useEffect(() => { if (tab === 'hereditary') loadHereditary(); }, [tab]);

  const loadFamily = async () => {
    setLoading(true);
    try { const { data } = await familyApi.list(); setMembers(data ?? []); }
    catch {} finally { setLoading(false); }
  };

  const loadHereditary = async () => {
    try { const { data } = await familyApi.getHereditary(); setHereditary(data); } catch {}
  };

  const invite = async () => {
    setSaving(true);
    try {
      await familyApi.invite(form);
      setSaved(true); setTab('tree');
      await loadFamily();
      setTimeout(() => setSaved(false), 4000);
    } catch {} finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Remover familiar da arvore?')) return;
    await familyApi.remove(id); loadFamily();
  };

  // Importa user do store para nome/genero
  const [userName, setUserName] = useState('');
  const [userGender, setUserGender] = useState('male');
  useEffect(() => {
    try {
      const raw = localStorage.getItem('icodlife-auth');
      if (raw) {
        const parsed = JSON.parse(raw);
        const u = parsed?.state?.user;
        if (u) { setUserName(u.fullName ?? ''); setUserGender(u.gender ?? 'male'); }
      }
    } catch {}
  }, []);

  const treeNodes = buildTree(members, userName, userGender);

  // Calcula risco hereditário local a partir de memberConditions
  const hereditaryRisk = (() => {
    const allConditions: string[] = [];
    Object.values(memberConditions).forEach(conds => allConditions.push(...conds));
    const counts: Record<string, number> = {};
    allConditions.forEach(c => counts[c] = (counts[c] ?? 0) + 1);
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([disease, count]) => ({
        disease,
        count,
        risk: count >= 3 ? 'high' : count >= 2 ? 'medium' : 'low',
      }));
  })();

  const selectedMember = members.find(m => m.id === selectedNode);
  const selectedConditions = memberConditions[selectedNode ?? ''] ?? [];

  const statusBadge = (status: string) => ({
    accepted: <span className="badge-normal">Conectado</span>,
    pending:  <span className="badge-warning">Aguardando</span>,
    declined: <span className="badge-critical">Recusado</span>,
    expired:  <span className="text-xs text-slate-400">Expirado</span>,
  }[status] ?? null);

  return (
    <AppLayout>
      <div className="bg-[#7B1E1E] px-8 py-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-white text-2xl font-bold">Modulo Familia</h1>
            <p className="text-white/55 text-sm mt-1">{members.length} familiar(es) · Arvore genealogica e hereditariedade</p>
          </div>
          <button onClick={() => setTab('invite')}
            className="bg-white/20 hover:bg-white/30 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all">
            + Convidar familiar
          </button>
        </div>
      </div>

      <div className="p-8 max-w-4xl mx-auto">

        {saved && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 text-sm mb-5">
            Convite enviado! O familiar recebera um e-mail.
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
          {[
            { id: 'tree',       label: 'Arvore Familiar' },
            { id: 'hereditary', label: 'Hereditariedade' },
            { id: 'invite',     label: '+ Convidar' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all
                ${tab === t.id ? 'bg-white shadow text-[#7B1E1E]' : 'text-slate-500 hover:text-slate-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── ÁRVORE ── */}
        {tab === 'tree' && (
          <div className="space-y-4">
            {loading && <div className="text-center text-slate-400 py-8">Carregando...</div>}

            {!loading && (
              <div className="card p-4">
                {members.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="text-5xl mb-3">👨‍👩‍👧‍👦</div>
                    <p className="text-slate-500 text-sm mb-4">Convide familiares para construir sua arvore.</p>
                    <button onClick={() => setTab('invite')}
                      className="bg-[#7B1E1E] text-white font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-[#5f1616] transition-colors">
                      + Convidar primeiro familiar
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <svg width={600} height={370} viewBox="0 0 600 370" style={{ minWidth: '100%', display: 'block' }}>
                        {/* Linhas de geração */}
                        {[{ y: 40, label: 'Avos' }, { y: 120, label: 'Pais' }, { y: 200, label: 'Voce' }, { y: 290, label: 'Filhos' }].map(row => (
                          <g key={row.y}>
                            <line x1={0} y1={row.y} x2={600} y2={row.y} stroke="#f1f5f9" strokeWidth={1} />
                            <text x={4} y={row.y - 4} fontSize={8} fill="#cbd5e1">{row.label}</text>
                          </g>
                        ))}
                        <TreeConnectors nodes={treeNodes} />
                        {treeNodes.map(n => (
                          <NodeCircle key={n.id} n={n} onClick={(id) => setSelectedNode(id === selectedNode ? null : id)} />
                        ))}
                      </svg>
                    </div>

                    {/* Painel lateral do nó selecionado */}
                    {selectedNode && selectedMember && (
                      <div className="mt-4 border-t border-slate-100 pt-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <div className="font-bold text-slate-800">
                              {selectedMember.memberUser?.fullName ?? selectedMember.fullName ?? 'Familiar'}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              {RELATIONSHIPS.find(r => r.value === selectedMember.relationship)?.label}
                              {selectedMember.customLabel && ` · ${selectedMember.customLabel}`}
                              {' · '}{statusBadge(selectedMember.inviteStatus)}
                            </div>
                          </div>
                          <button onClick={() => remove(selectedMember.id)}
                            className="text-slate-300 hover:text-red-400 text-sm px-2 py-1 rounded">✕ Remover</button>
                        </div>

                        {/* Doenças hereditárias deste familiar */}
                        <div>
                          <div className="text-xs font-semibold text-slate-500 mb-2">Historico de doencas (clique para marcar)</div>
                          <div className="flex flex-wrap gap-1.5">
                            {HEREDITARY_DISEASES.map(d => (
                              <button key={d} type="button"
                                onClick={() => {
                                  const current = memberConditions[selectedNode] ?? [];
                                  saveConditions(selectedNode, current.includes(d) ? current.filter(x => x !== d) : [...current, d]);
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all
                                  ${selectedConditions.includes(d)
                                    ? 'bg-[#7B1E1E] text-white border-[#7B1E1E]'
                                    : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                                {d}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Lista rápida */}
                    <div className="mt-4 border-t border-slate-100 pt-4 space-y-2">
                      {members.map((m: any) => (
                        <div key={m.id} className="flex items-center gap-3 text-sm">
                          <span className="text-base">{REL_ICON[m.relationship] ?? '👤'}</span>
                          <span className="font-medium text-slate-700 flex-1">
                            {m.memberUser?.fullName ?? m.fullName ?? 'Sem nome'}
                          </span>
                          <span className="text-xs text-slate-400">
                            {RELATIONSHIPS.find(r => r.value === m.relationship)?.label}
                          </span>
                          {statusBadge(m.inviteStatus)}
                          {(memberConditions[m.id] ?? []).length > 0 && (
                            <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                              {(memberConditions[m.id] ?? []).length} doencas
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── HEREDITARIEDADE ── */}
        {tab === 'hereditary' && (
          <div className="space-y-4">
            {/* Risco calculado localmente */}
            {hereditaryRisk.length > 0 ? (
              <div className="card p-5">
                <h3 className="font-bold text-slate-800 mb-1">Analise de risco hereditario</h3>
                <p className="text-xs text-slate-400 mb-4">Baseado nas doencas que voce marcou nos familiares.</p>
                <div className="space-y-2">
                  {hereditaryRisk.map(r => (
                    <div key={r.disease} className={`p-3 rounded-xl border flex items-center justify-between
                      ${r.risk === 'high' ? 'bg-red-50 border-red-200' : r.risk === 'medium' ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                      <div>
                        <div className="font-semibold text-sm text-slate-800">{r.disease}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{r.count} familiar(es) afetado(s)</div>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full
                        ${r.risk === 'high' ? 'bg-red-100 text-red-700' : r.risk === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                        {r.risk === 'high' ? 'Alto risco' : r.risk === 'medium' ? 'Risco medio' : 'Baixo risco'}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-3">⚠️ Analise informativa. Consulte medico para avaliacao clinica.</p>
              </div>
            ) : (
              <div className="card p-10 text-center">
                <div className="text-4xl mb-3">🧬</div>
                <p className="font-semibold text-slate-600 mb-2">Nenhuma doenca mapeada ainda</p>
                <p className="text-sm text-slate-400 mb-4">Vá para a Arvore Familiar, clique em um familiar e marque as doencas no historico.</p>
                <button onClick={() => setTab('tree')}
                  className="bg-[#7B1E1E] text-white font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-[#5f1616] transition-colors">
                  Ir para a arvore
                </button>
              </div>
            )}

            {/* Dados do backend */}
            {hereditary?.riskFactors?.length > 0 && (
              <div className="card p-5">
                <h3 className="font-bold text-slate-800 mb-3">Fatores de risco (dados compartilhados)</h3>
                <div className="space-y-2">
                  {hereditary.riskFactors.map((r: any) => (
                    <div key={r.condition} className={`p-3 rounded-xl border flex items-center justify-between
                      ${r.riskLevel === 'high' ? 'bg-red-50 border-red-200' : r.riskLevel === 'medium' ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                      <div>
                        <div className="font-semibold text-sm text-slate-800">{r.condition}</div>
                        <div className="text-xs text-slate-500">Afeta: {r.affectedMembers?.join(', ')}</div>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full
                        ${r.riskLevel === 'high' ? 'bg-red-100 text-red-700' : r.riskLevel === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                        {r.riskLevel === 'high' ? 'Alto' : r.riskLevel === 'medium' ? 'Medio' : 'Baixo'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CONVIDAR ── */}
        {tab === 'invite' && (
          <div className="card p-6 space-y-4">
            <h2 className="font-bold text-slate-800">Convidar familiar</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
              O familiar so pode aceitar o convite se ja tiver conta no IcodLife. Caso nao tenha, o link o direcionara para o cadastro.
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Relacao *</label>
                <select className="input-field" value={form.relationship}
                  onChange={e => setForm(f => ({ ...f, relationship: e.target.value }))}>
                  {RELATIONSHIPS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Rotulo personalizado</label>
                <input className="input-field" placeholder="Ex: Avo materno" value={form.customLabel}
                  onChange={e => setForm(f => ({ ...f, customLabel: e.target.value }))} />
              </div>
              <div>
                <label className="label">Nome completo</label>
                <input className="input-field" placeholder="Nome do familiar" value={form.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
              </div>
              <div>
                <label className="label">E-mail</label>
                <input type="email" className="input-field" placeholder="familiar@email.com" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="label">Genero</label>
                <select className="input-field" value={form.gender}
                  onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                  <option value="male">Masculino</option>
                  <option value="female">Feminino</option>
                  <option value="other">Outro</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" className="w-4 h-4 accent-red-700" checked={form.shareHereditary}
                  onChange={e => setForm(f => ({ ...f, shareHereditary: e.target.checked }))} />
                Compartilhar dados hereditarios mutuamente
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" className="w-4 h-4 accent-red-700" checked={form.shareConditions}
                  onChange={e => setForm(f => ({ ...f, shareConditions: e.target.checked }))} />
                Compartilhar condicoes cronicas e alergias
              </label>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setTab('tree')} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={invite} disabled={saving || !form.email}
                className="flex-1 bg-[#7B1E1E] text-white font-bold py-3 rounded-xl hover:bg-[#5f1616] transition-colors disabled:opacity-50">
                {saving ? 'Enviando...' : 'Enviar convite'}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
