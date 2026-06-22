'use client';
// apps/web/src/app/meus-medicos/page.tsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('icodlife_token') : null;
}

function authHeaders() {
  return { headers: { Authorization: `Bearer ${getToken()}` } };
}

export default function MeusMedicosPage() {
  const [list,   setList]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Adicionar médico externo
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ externalName: '', externalCrm: '', externalUf: '', specialty: '' });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/meus-medicos`, authHeaders());
      setList(r.data);
    } catch { setList([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const addExternal = async () => {
    if (!form.externalName || !form.externalCrm || !form.externalUf) {
      setError('Nome, CRM e UF sao obrigatorios'); return;
    }
    setSaving(true); setError('');
    try {
      await axios.post(`${API}/meus-medicos`, {
        externalName: form.externalName,
        externalCrm:  form.externalCrm,
        externalUf:   form.externalUf.toUpperCase(),
        specialty:    form.specialty || undefined,
      }, authHeaders());
      setShowForm(false);
      setForm({ externalName: '', externalCrm: '', externalUf: '', specialty: '' });
      await load();
    } catch (e: any) {
      const msg = e.response?.data?.message;
      setError(typeof msg === 'string' ? msg : 'Erro ao adicionar');
    } finally { setSaving(false); }
  };

  const changeStatus = async (id: string, status: 'active' | 'ended') => {
    try {
      await axios.patch(`${API}/meus-medicos/${id}`, { status }, authHeaders());
      await load();
    } catch { alert('Erro ao atualizar'); }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Meus Medicos</h1>
            <p className="text-slate-500 text-sm mt-0.5">Medicos com quem voce se relaciona</p>
          </div>
          <div className="flex gap-2">
            <Link href="/medicos"
              className="px-4 py-2 border border-red-600 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50">
              Buscar medicos
            </Link>
            <button onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
              + Adicionar externo
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* Formulario adicionar externo */}
        {showForm && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
            <h2 className="text-sm font-semibold text-slate-800 mb-4">Adicionar medico nao cadastrado no IcodLife</h2>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Nome do medico *</label>
                <input value={form.externalName} onChange={e => setForm(f => ({ ...f, externalName: e.target.value }))}
                  placeholder="Dr. Joao Silva"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">CRM *</label>
                <input value={form.externalCrm} onChange={e => setForm(f => ({ ...f, externalCrm: e.target.value }))}
                  placeholder="12345"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">UF *</label>
                <input value={form.externalUf} onChange={e => setForm(f => ({ ...f, externalUf: e.target.value }))}
                  placeholder="SP" maxLength={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none uppercase" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Especialidade</label>
                <input value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}
                  placeholder="Ex: Cardiologia"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none" />
              </div>
            </div>
            {error && <p className="text-red-600 text-xs mb-3">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setShowForm(false); setError(''); }}
                className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={addExternal} disabled={saving}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-60">
                {saving ? 'Salvando...' : 'Adicionar'}
              </button>
            </div>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="text-slate-400 text-sm">Carregando...</div>
        ) : list.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <p className="text-slate-400 text-sm mb-3">Voce ainda nao tem medicos vinculados.</p>
            <Link href="/medicos" className="text-red-600 hover:underline text-sm font-medium">
              Buscar medicos no IcodLife
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((item: any) => {
              const isInternal = !!item.doctor;
              const name     = isInternal ? item.doctor?.user?.fullName : item.externalName;
              const crm      = isInternal ? `${item.doctor?.crm}/${item.doctor?.uf}` : `${item.externalCrm}/${item.externalUf}`;
              const specs    = isInternal ? item.doctor?.specialties?.slice(0, 2).join(', ') : item.specialty;

              return (
                <div key={item.id} className={`bg-white border rounded-xl p-4 flex items-center gap-4
                  ${item.status === 'ended' ? 'opacity-60 border-slate-200' : 'border-slate-200'}`}>
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-700 flex-shrink-0">
                    {name?.[0] ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-800 text-sm truncate">{name}</p>
                      {isInternal && (
                        <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">IcodLife</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">CRM {crm}</p>
                    {specs && <p className="text-xs text-slate-400 mt-0.5">{specs}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                      ${item.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {item.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                    <button
                      onClick={() => changeStatus(item.id, item.status === 'active' ? 'ended' : 'active')}
                      className="text-xs text-slate-400 hover:text-slate-700 underline">
                      {item.status === 'active' ? 'Encerrar' : 'Reativar'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
