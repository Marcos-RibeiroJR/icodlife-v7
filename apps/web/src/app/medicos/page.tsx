'use client';
// apps/web/src/app/medicos/page.tsx
// Busca pública de médicos cadastrados no IcodLife
import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

const SPECIALTIES = [
  'Todos', 'Clínica Geral', 'Cardiologia', 'Dermatologia', 'Endocrinologia',
  'Gastroenterologia', 'Geriatria', 'Ginecologia', 'Neurologia',
  'Oftalmologia', 'Ortopedia', 'Pediatria', 'Psiquiatria',
];

const UFS = ['Todos','AC','AL','AM','BA','CE','DF','ES','GO','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

const PLANS = ['Todos','Amil','Bradesco Saude','Golden Cross','Hapvida',
  'NotreDame Intermedica','SulAmérica','Unimed','Particular'];

interface Doctor {
  id: string; doctorId: string; crm: string; uf: string;
  crmStatus: string; specialties: string[]; healthPlans: string[];
  bio?: string; consultPrice?: number; addressCity?: string;
  user: { fullName: string; avatarUrl?: string };
  _count: { patients: number };
}

export default function MedicosPage() {
  const [doctors, setDoctors]   = useState<Doctor[]>([]);
  const [total,   setTotal]     = useState(0);
  const [loading, setLoading]   = useState(true);
  const [specialty, setSpecialty] = useState('Todos');
  const [uf,        setUf]        = useState('Todos');
  const [plan,      setPlan]      = useState('Todos');
  const [name,      setName]      = useState('');
  const [page,      setPage]      = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 12 };
      if (specialty !== 'Todos') params.specialty = specialty;
      if (uf        !== 'Todos') params.uf        = uf;
      if (plan      !== 'Todos') params.healthPlan = plan;
      if (name.trim())           params.name       = name.trim();

      const r = await axios.get(`${API}/doctors`, { params });
      setDoctors(r.data.data);
      setTotal(r.data.total);
    } catch {
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  }, [specialty, uf, plan, name, page]);

  useEffect(() => { load(); }, [load]);

  const resetFilters = () => {
    setSpecialty('Todos'); setUf('Todos'); setPlan('Todos'); setName(''); setPage(1);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <h1 className="text-xl font-bold text-slate-800">Encontrar Medico</h1>
        <p className="text-slate-500 text-sm mt-0.5">Medicos cadastrados no IcodLife</p>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Filtros */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <input
              value={name}
              onChange={e => { setName(e.target.value); setPage(1); }}
              placeholder="Buscar por nome..."
              className="col-span-2 md:col-span-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
            <select value={specialty} onChange={e => { setSpecialty(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none">
              {SPECIALTIES.map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={uf} onChange={e => { setUf(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none">
              {UFS.map(u => <option key={u}>{u}</option>)}
            </select>
            <select value={plan} onChange={e => { setPlan(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none">
              {PLANS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          {(specialty !== 'Todos' || uf !== 'Todos' || plan !== 'Todos' || name) && (
            <button onClick={resetFilters} className="mt-3 text-xs text-slate-500 hover:text-red-600 underline">
              Limpar filtros
            </button>
          )}
        </div>

        {/* Resultados */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-500">
            {loading ? 'Buscando...' : `${total} medico(s) encontrado(s)`}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 animate-pulse">
                <div className="flex gap-3 mb-3">
                  <div className="w-12 h-12 bg-slate-200 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-3 bg-slate-200 rounded mb-2" />
                <div className="h-3 bg-slate-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : doctors.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <p className="text-slate-400">Nenhum medico encontrado com esses filtros.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {doctors.map(doc => (
              <DoctorCard key={doc.id} doctor={doc} />
            ))}
          </div>
        )}

        {/* Paginacao */}
        {total > 12 && (
          <div className="flex justify-center gap-2 mt-8">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm disabled:opacity-40 hover:bg-slate-50">
              Anterior
            </button>
            <span className="px-4 py-2 text-sm text-slate-600">
              Pagina {page} de {Math.ceil(total / 12)}
            </span>
            <button disabled={page >= Math.ceil(total / 12)} onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm disabled:opacity-40 hover:bg-slate-50">
              Proxima
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DoctorCard({ doctor }: { doctor: Doctor }) {
  const [linked, setLinked]   = useState(false);
  const [linking, setLinking] = useState(false);

  const handleLink = async () => {
    setLinking(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('icodlife_token') : null;
      if (!token) { alert('Faca login para vincular um medico'); return; }
      await axios.post(`${API}/meus-medicos`,
        { doctorId: doctor.doctorId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setLinked(true);
    } catch (e: any) {
      const msg = e.response?.data?.message;
      alert(typeof msg === 'string' ? msg : 'Erro ao vincular medico');
    } finally {
      setLinking(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-11 h-11 bg-blue-100 rounded-full flex items-center justify-center text-lg font-bold text-blue-700 flex-shrink-0">
          {doctor.user.fullName?.[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-sm truncate">{doctor.user.fullName}</p>
          <p className="text-xs text-slate-500">CRM {doctor.crm}/{doctor.uf}</p>
          <span className="text-xs font-mono text-blue-600">{doctor.doctorId}</span>
        </div>
        {doctor.crmStatus === 'verified' && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex-shrink-0">
            Verificado
          </span>
        )}
      </div>

      {/* Especialidades */}
      <div className="flex flex-wrap gap-1 mb-2">
        {doctor.specialties.slice(0, 3).map(s => (
          <span key={s} className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{s}</span>
        ))}
        {doctor.specialties.length > 3 && (
          <span className="text-slate-400 text-xs">+{doctor.specialties.length - 3}</span>
        )}
      </div>

      {/* Cidade e valor */}
      <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
        <span>{doctor.addressCity ? `${doctor.addressCity} / ${doctor.uf}` : doctor.uf}</span>
        {doctor.consultPrice
          ? <span className="font-medium text-slate-700">R$ {Number(doctor.consultPrice).toFixed(0)}</span>
          : <span>A combinar</span>}
      </div>

      {/* Planos */}
      {doctor.healthPlans?.length > 0 && (
        <p className="text-xs text-slate-400 mb-3 truncate">
          {doctor.healthPlans.slice(0, 3).join(' · ')}
          {doctor.healthPlans.length > 3 && ` +${doctor.healthPlans.length - 3}`}
        </p>
      )}

      <button
        onClick={handleLink}
        disabled={linking || linked}
        className={`w-full py-2 rounded-lg text-sm font-medium transition-colors
          ${linked
            ? 'bg-green-50 text-green-700 border border-green-200 cursor-default'
            : 'bg-red-600 hover:bg-red-700 text-white disabled:opacity-60'}`}>
        {linked ? 'Vinculado!' : linking ? 'Vinculando...' : 'Adicionar aos meus medicos'}
      </button>
    </div>
  );
}
