'use client';
// apps/doutor/src/app/staff/page.tsx
// Sprint 18 — Meu Funcionários
// Gestão de equipe do médico via ICODE com cargo e função

import { useEffect, useState, useCallback } from 'react';
import DoctorShell from '@/components/ui/DoctorShell';
import { api } from '@/lib/api';

const ROLES = [
  { value: 'receptionist', label: 'Recepcionista' },
  { value: 'nurse',        label: 'Enfermeiro(a)' },
  { value: 'assistant',    label: 'Assistente' },
  { value: 'admin',        label: 'Administrativo' },
  { value: 'technician',   label: 'Técnico(a)' },
  { value: 'other',        label: 'Outro' },
];

const ROLE_COLORS: Record<string, string> = {
  receptionist: 'bg-blue-100 text-blue-700',
  nurse:        'bg-teal-100 text-teal-700',
  assistant:    'bg-purple-100 text-purple-700',
  admin:        'bg-amber-100 text-amber-700',
  technician:   'bg-indigo-100 text-indigo-700',
  other:        'bg-slate-100 text-slate-600',
};

function Avatar({ name, size = 10 }: { name: string; size?: number }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <div className={`w-${size} h-${size} rounded-full bg-gradient-to-br from-slate-400 to-slate-600
      flex items-center justify-center text-white font-semibold flex-shrink-0`}
      style={{ width: size * 4, height: size * 4, fontSize: size * 1.5 }}>
      {initials}
    </div>
  );
}

// ─── Modal Adicionar Funcionário ─────────────────────────────────────────────
function AddStaffModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [icode,      setIcode]      = useState('');
  const [role,       setRole]       = useState('receptionist');
  const [customRole, setCustomRole] = useState('');
  const [notes,      setNotes]      = useState('');
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');

  const save = async () => {
    if (!icode.trim()) { setError('Informe o ICODE do funcionário.'); return; }
    setSaving(true); setError('');
    try {
      await api.post('/doutor/staff', {
        icode: icode.trim(),
        role,
        customRole: role === 'other' ? customRole : undefined,
        notes: notes || undefined,
      });
      onAdded();
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Erro ao adicionar funcionário');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-800">Adicionar Funcionário</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">ICODE do funcionário *</label>
            <input
              value={icode}
              onChange={e => setIcode(e.target.value.toUpperCase())}
              placeholder="ex: IC-AB12-XY34"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <p className="text-xs text-slate-400 mt-1">O funcionário deve ter uma conta ativa no ICODLIFE.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Cargo / Função</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          {role === 'other' && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Cargo personalizado</label>
              <input
                value={customRole}
                onChange={e => setCustomRole(e.target.value)}
                placeholder="Ex: Biomédico, Fisioterapeuta..."
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Observações</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Horário de trabalho, responsabilidades..."
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
          </div>

          {error && (
            <div className="px-4 py-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>
          )}
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={save}
            disabled={saving || !icode.trim()}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? 'Adicionando...' : 'Adicionar'}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-600 text-sm rounded-lg transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Editar Funcionário ────────────────────────────────────────────────
function EditStaffModal({
  member, onClose, onSaved,
}: { member: any; onClose: () => void; onSaved: () => void }) {
  const [role,       setRole]       = useState(member.role ?? 'assistant');
  const [customRole, setCustomRole] = useState(member.customRole ?? '');
  const [notes,      setNotes]      = useState(member.notes ?? '');
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');

  const save = async () => {
    setSaving(true); setError('');
    try {
      await api.patch(`/doutor/staff/${member.id}`, {
        role,
        customRole: role === 'other' ? customRole : null,
        notes: notes || null,
      });
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Erro ao salvar');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-800">Editar {member.user?.fullName?.split(' ')[0]}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Cargo</label>
            <select value={role} onChange={e => setRole(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          {role === 'other' && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Cargo personalizado</label>
              <input value={customRole} onChange={e => setCustomRole(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Observações</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none" />
          </div>
          {error && <div className="px-4 py-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={save} disabled={saving}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
          <button onClick={onClose}
            className="px-5 py-2.5 border border-slate-300 text-slate-600 text-sm rounded-lg transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function StaffPage() {
  const [staff,       setStaff]       = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showAdd,     setShowAdd]     = useState(false);
  const [editing,     setEditing]     = useState<any>(null);
  const [removing,    setRemoving]    = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get('/doutor/staff'); setStaff(r.data); }
    catch { setStaff([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRemove = async (id: string) => {
    if (!confirm('Remover este funcionário da equipe?')) return;
    setRemoving(id);
    try { await api.delete(`/doutor/staff/${id}`); load(); }
    finally { setRemoving(null); }
  };

  const roleLabel = (m: any) => {
    if (m.customRole) return m.customRole;
    return ROLES.find(r => r.value === m.role)?.label ?? m.role;
  };

  const roleColor = (role: string) => ROLE_COLORS[role] ?? ROLE_COLORS.other;

  // Agrupa por cargo para o dashboard
  const roleCount = staff.reduce((acc: Record<string, number>, m) => {
    const key = m.role;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <DoctorShell>
      <div className="p-6 max-w-3xl">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Meu Funcionários</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Gerencie a equipe do seu consultório via ICODE ICODLIFE.
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            + Adicionar Funcionário
          </button>
        </div>

        {/* Resumo por cargo */}
        {staff.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-center">
              <p className="text-2xl font-bold text-slate-800">{staff.length}</p>
              <p className="text-xs text-slate-500">Total</p>
            </div>
            {Object.entries(roleCount).map(([role, count]) => (
              <div key={role} className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-center">
                <p className="text-2xl font-bold text-slate-800">{count}</p>
                <p className="text-xs text-slate-500">{ROLES.find(r => r.value === role)?.label ?? role}</p>
              </div>
            ))}
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
        ) : staff.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-4xl mb-3">🏥</p>
            <p className="text-sm font-medium text-slate-600">Nenhum funcionário cadastrado</p>
            <p className="text-xs mt-1 mb-4">Adicione sua equipe pelo ICODE deles no ICODLIFE.</p>
            <button
              onClick={() => setShowAdd(true)}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              + Adicionar primeiro funcionário
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {staff.map((m: any) => (
              <div
                key={m.id}
                className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow"
              >
                <Avatar name={m.user?.fullName ?? '?'} size={10} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800 text-sm">{m.user?.fullName}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColor(m.role)}`}>
                      {roleLabel(m)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span className="font-mono">{m.user?.icode}</span>
                    <span>·</span>
                    <span>{m.user?.email}</span>
                  </div>
                  {m.notes && (
                    <p className="text-xs text-slate-400 mt-1 italic">{m.notes}</p>
                  )}
                  <p className="text-xs text-slate-300 mt-1">
                    Desde {new Date(m.startedAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                <div className="flex gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => setEditing(m)}
                    className="px-3 py-1.5 text-xs border border-slate-300 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleRemove(m.id)}
                    disabled={removing === m.id}
                    className="px-3 py-1.5 text-xs border border-red-200 hover:bg-red-50 text-red-500 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {removing === m.id ? '...' : 'Remover'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <AddStaffModal onClose={() => setShowAdd(false)} onAdded={load} />
      )}
      {editing && (
        <EditStaffModal member={editing} onClose={() => setEditing(null)} onSaved={load} />
      )}
    </DoctorShell>
  );
}
