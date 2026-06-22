'use client';
// apps/web/src/app/medicos/page.tsx
import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { AppLayout } from '../../components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const SPECIALTIES = [
  'Todos', 'Clínica Geral', 'Cardiologia', 'Dermatologia', 'Endocrinologia',
  'Gastroenterologia', 'Geriatria', 'Ginecologia', 'Neurologia',
  'Oftalmologia', 'Ortopedia', 'Pediatria', 'Psiquiatria', 'Urologia',
  'Oncologia', 'Pneumologia', 'Reumatologia', 'Nefrologia', 'Hematologia',
];

const UFS = ['Todos','AC','AL','AM','BA','CE','DF','ES','GO','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

const PLANS = ['Todos','Amil','Bradesco Saúde','Golden Cross','Hapvida',
  'NotreDame Intermédica','SulAmérica','Unimed','Particular'];

// ── Mock doctors (fallback quando API retorna vazio) ──────────────────────────
const MOCK_DOCTORS = [
  {
    id: 'm1', doctorId: 'DR.00001.SP', crm: '123456', uf: 'SP', crmStatus: 'verified',
    specialties: ['Cardiologia', 'Clínica Geral'],
    healthPlans: ['Unimed', 'Bradesco Saúde', 'SulAmérica'],
    bio: 'Cardiologista com 15 anos de experiência. Especialização em insuficiência cardíaca e hipertensão arterial.',
    consultPrice: 350, addressCity: 'São Paulo',
    user: { fullName: 'Dr. Carlos Eduardo Mendes', avatarUrl: null },
    _count: { patients: 42 },
  },
  {
    id: 'm2', doctorId: 'DR.00002.SP', crm: '234567', uf: 'SP', crmStatus: 'verified',
    specialties: ['Endocrinologia', 'Clínica Geral'],
    healthPlans: ['Unimed', 'Amil', 'Hapvida'],
    bio: 'Endocrinologista especializada em diabetes tipo 1 e 2, tireoide e obesidade.',
    consultPrice: 380, addressCity: 'Campinas',
    user: { fullName: 'Dra. Ana Paula Ferreira', avatarUrl: null },
    _count: { patients: 78 },
  },
  {
    id: 'm3', doctorId: 'DR.00003.RJ', crm: '345678', uf: 'RJ', crmStatus: 'verified',
    specialties: ['Neurologia'],
    healthPlans: ['Bradesco Saúde', 'Golden Cross', 'SulAmérica'],
    bio: 'Neurologista com foco em enxaqueca, epilepsia e doenças neurodegenerativas.',
    consultPrice: 420, addressCity: 'Rio de Janeiro',
    user: { fullName: 'Dr. Roberto Lima Santos', avatarUrl: null },
    _count: { patients: 56 },
  },
  {
    id: 'm4', doctorId: 'DR.00004.MG', crm: '456789', uf: 'MG', crmStatus: 'verified',
    specialties: ['Pediatria'],
    healthPlans: ['Unimed', 'Hapvida', 'NotreDame Intermédica'],
    bio: 'Pediatra com especialização em neonatologia. Atende recém-nascidos e crianças até 12 anos.',
    consultPrice: 280, addressCity: 'Belo Horizonte',
    user: { fullName: 'Dra. Fernanda Costa Oliveira', avatarUrl: null },
    _count: { patients: 124 },
  },
  {
    id: 'm5', doctorId: 'DR.00005.SP', crm: '567890', uf: 'SP', crmStatus: 'verified',
    specialties: ['Dermatologia'],
    healthPlans: ['Particular', 'Amil', 'Bradesco Saúde'],
    bio: 'Dermatologista com expertise em dermatologia cosmética, psoríase e tratamento de acne.',
    consultPrice: 450, addressCity: 'São Paulo',
    user: { fullName: 'Dra. Juliana Alves Rocha', avatarUrl: null },
    _count: { patients: 89 },
  },
  {
    id: 'm6', doctorId: 'DR.00006.PR', crm: '678901', uf: 'PR', crmStatus: 'verified',
    specialties: ['Ortopedia', 'Medicina Esportiva'],
    healthPlans: ['Unimed', 'SulAmérica', 'Amil'],
    bio: 'Ortopedista especializado em joelho e quadril. Cirurgião de artroscopia e próteses.',
    consultPrice: 390, addressCity: 'Curitiba',
    user: { fullName: 'Dr. Marcos Vinícius Teixeira', avatarUrl: null },
    _count: { patients: 63 },
  },
  {
    id: 'm7', doctorId: 'DR.00007.RS', crm: '789012', uf: 'RS', crmStatus: 'verified',
    specialties: ['Gastroenterologia', 'Hepatologia'],
    healthPlans: ['Unimed', 'Bradesco Saúde', 'Golden Cross'],
    bio: 'Gastroenterologista com foco em doenças inflamatórias intestinais e hepatologia clínica.',
    consultPrice: 360, addressCity: 'Porto Alegre',
    user: { fullName: 'Dr. Paulo Henrique Nascimento', avatarUrl: null },
    _count: { patients: 47 },
  },
  {
    id: 'm8', doctorId: 'DR.00008.BA', crm: '890123', uf: 'BA', crmStatus: 'verified',
    specialties: ['Ginecologia', 'Obstetrícia'],
    healthPlans: ['Unimed', 'Hapvida', 'NotreDame Intermédica'],
    bio: 'Ginecologista e obstetra com 12 anos de experiência. Especialização em gestação de alto risco.',
    consultPrice: 320, addressCity: 'Salvador',
    user: { fullName: 'Dra. Mariana Souza Pereira', avatarUrl: null },
    _count: { patients: 91 },
  },
  {
    id: 'm9', doctorId: 'DR.00009.CE', crm: '901234', uf: 'CE', crmStatus: 'verified',
    specialties: ['Psiquiatria'],
    healthPlans: ['Particular', 'Unimed', 'Bradesco Saúde'],
    bio: 'Psiquiatra especializado em depressão, ansiedade, transtorno bipolar e TDAH em adultos.',
    consultPrice: 400, addressCity: 'Fortaleza',
    user: { fullName: 'Dr. Leonardo Araújo Freitas', avatarUrl: null },
    _count: { patients: 73 },
  },
  {
    id: 'm10', doctorId: 'DR.00010.GO', crm: '012345', uf: 'GO', crmStatus: 'verified',
    specialties: ['Oftalmologia'],
    healthPlans: ['Amil', 'Unimed', 'SulAmérica'],
    bio: 'Oftalmologista especializado em cirurgia refrativa (LASIK), catarata e glaucoma.',
    consultPrice: 330, addressCity: 'Goiânia',
    user: { fullName: 'Dra. Camila Ribeiro Monteiro', avatarUrl: null },
    _count: { patients: 58 },
  },
  {
    id: 'm11', doctorId: 'DR.00011.SP', crm: '112233', uf: 'SP', crmStatus: 'verified',
    specialties: ['Urologia'],
    healthPlans: ['Bradesco Saúde', 'Unimed', 'Amil'],
    bio: 'Urologista com foco em urooncologia, próstata e litíase renal. Cirurgia laparoscópica.',
    consultPrice: 410, addressCity: 'Santo André',
    user: { fullName: 'Dr. Ricardo Moreira Campos', avatarUrl: null },
    _count: { patients: 44 },
  },
  {
    id: 'm12', doctorId: 'DR.00012.RJ', crm: '223344', uf: 'RJ', crmStatus: 'verified',
    specialties: ['Pneumologia'],
    healthPlans: ['Unimed', 'NotreDame Intermédica', 'Golden Cross'],
    bio: 'Pneumologista especializado em asma, DPOC, apneia do sono e doenças intersticiais.',
    consultPrice: 370, addressCity: 'Niterói',
    user: { fullName: 'Dra. Beatriz Fonseca Cardoso', avatarUrl: null },
    _count: { patients: 52 },
  },
];

interface Doctor {
  id: string; doctorId: string; crm: string; uf: string;
  crmStatus: string; specialties: string[]; healthPlans: string[];
  bio?: string; consultPrice?: number; addressCity?: string;
  user: { fullName: string; avatarUrl?: string | null };
  _count: { patients: number };
}

export default function MedicosPage() {
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading]  = useState(true);
  const [specialty, setSpecialty] = useState('Todos');
  const [uf,        setUf]        = useState('Todos');
  const [plan,      setPlan]      = useState('Todos');
  const [name,      setName]      = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/doctors`, { params: { limit: 100 } });
      const apiData: Doctor[] = r.data?.data ?? r.data ?? [];
      setAllDoctors(apiData.length > 0 ? apiData : MOCK_DOCTORS as Doctor[]);
    } catch {
      setAllDoctors(MOCK_DOCTORS as Doctor[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Client-side filter
  const filtered = allDoctors.filter(d => {
    const matchSpec = specialty === 'Todos' || d.specialties.some(s => s === specialty);
    const matchUf   = uf === 'Todos' || d.uf === uf;
    const matchPlan = plan === 'Todos' || d.healthPlans.some(p => p === plan);
    const matchName = !name.trim() || d.user.fullName.toLowerCase().includes(name.toLowerCase());
    return matchSpec && matchUf && matchPlan && matchName;
  });

  const resetFilters = () => { setSpecialty('Todos'); setUf('Todos'); setPlan('Todos'); setName(''); };

  return (
    <AppLayout>
    <div className="min-h-screen bg-[#FFF8F8]">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-xl font-bold text-slate-800">🩺 Encontrar Médico</h1>
          <p className="text-slate-500 text-sm mt-0.5">Médicos cadastrados no IcodLife · Adicione aos seus médicos</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* Filtros */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 mb-6 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Buscar por nome..."
              className="col-span-1 sm:col-span-2 lg:col-span-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
            <select value={specialty} onChange={e => setSpecialty(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:outline-none">
              {SPECIALTIES.map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={uf} onChange={e => setUf(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:outline-none">
              {UFS.map(u => <option key={u}>{u}</option>)}
            </select>
            <select value={plan} onChange={e => setPlan(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:outline-none">
              {PLANS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          {(specialty !== 'Todos' || uf !== 'Todos' || plan !== 'Todos' || name) && (
            <button onClick={resetFilters} className="mt-3 text-xs text-slate-500 hover:text-red-600 underline">
              Limpar filtros
            </button>
          )}
        </div>

        {/* Contador */}
        <p className="text-sm text-slate-500 mb-4">
          {loading ? 'Buscando médicos...' : `${filtered.length} médico(s) encontrado(s)`}
        </p>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white border border-slate-100 rounded-2xl p-4 animate-pulse">
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
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-slate-500">Nenhum médico encontrado com esses filtros.</p>
            <button onClick={resetFilters} className="mt-3 text-sm text-red-600 underline">Limpar filtros</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(doc => (
              <DoctorCard key={doc.id} doctor={doc} />
            ))}
          </div>
        )}
      </div>
    </div>
    </AppLayout>
  );
}

function DoctorCard({ doctor }: { doctor: Doctor }) {
  const [linked,  setLinked]  = useState(false);
  const [linking, setLinking] = useState(false);

  const initial = doctor.user.fullName?.[0]?.toUpperCase() ?? '?';
  const colors  = ['bg-red-100 text-red-700','bg-blue-100 text-blue-700','bg-purple-100 text-purple-700',
                   'bg-green-100 text-green-700','bg-amber-100 text-amber-700','bg-teal-100 text-teal-700'];
  const colorIdx = doctor.id.charCodeAt(doctor.id.length - 1) % colors.length;

  const handleLink = async () => {
    setLinking(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('icodlife_token') : null;
      if (!token) { alert('Faça login para vincular um médico'); return; }
      await axios.post(`${API}/meus-medicos`,
        { doctorId: doctor.doctorId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setLinked(true);
    } catch (e: any) {
      const msg = e.response?.data?.message;
      if (typeof msg === 'string' && msg.toLowerCase().includes('já')) { setLinked(true); return; }
      alert(typeof msg === 'string' ? msg : 'Erro ao vincular médico');
    } finally {
      setLinking(false);
    }
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3 mb-3">
        {doctor.user.avatarUrl ? (
          <img src={doctor.user.avatarUrl} alt={doctor.user.fullName}
            className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className={`w-11 h-11 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0 ${colors[colorIdx]}`}>
            {initial}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-sm truncate">{doctor.user.fullName}</p>
          <p className="text-xs text-slate-400">CRM {doctor.crm}/{doctor.uf}</p>
        </div>
        {doctor.crmStatus === 'verified' && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex-shrink-0">✓ CFM</span>
        )}
      </div>

      {/* Especialidades */}
      <div className="flex flex-wrap gap-1 mb-2">
        {doctor.specialties.slice(0, 3).map(s => (
          <span key={s} className="bg-red-50 text-red-700 text-xs px-2 py-0.5 rounded-full">{s}</span>
        ))}
        {doctor.specialties.length > 3 && (
          <span className="text-slate-400 text-xs self-center">+{doctor.specialties.length - 3}</span>
        )}
      </div>

      {/* Bio */}
      {doctor.bio && (
        <p className="text-xs text-slate-500 mb-2 line-clamp-2">{doctor.bio}</p>
      )}

      {/* Cidade · Preço */}
      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
        <span>{doctor.addressCity ? `${doctor.addressCity}/${doctor.uf}` : doctor.uf}</span>
        {doctor.consultPrice
          ? <span className="font-semibold text-slate-700">R$ {Number(doctor.consultPrice).toFixed(0)}</span>
          : <span>A combinar</span>}
      </div>

      {/* Planos */}
      {doctor.healthPlans?.length > 0 && (
        <p className="text-xs text-slate-400 mb-3 truncate">
          {doctor.healthPlans.slice(0, 3).join(' · ')}
          {doctor.healthPlans.length > 3 && ` +${doctor.healthPlans.length - 3}`}
        </p>
      )}

      {/* Pacientes */}
      <p className="text-xs text-slate-400 mb-3">{doctor._count.patients} pacientes vinculados</p>

      <button
        onClick={handleLink}
        disabled={linking || linked}
        className={`w-full py-2 rounded-xl text-sm font-medium transition-colors
          ${linked
            ? 'bg-green-50 text-green-700 border border-green-200 cursor-default'
            : 'bg-[#7B1E1E] hover:bg-[#6a1a1a] text-white disabled:opacity-60'}`}>
        {linked ? '✓ Vinculado!' : linking ? 'Vinculando...' : '+ Adicionar aos meus médicos'}
      </button>
    </div>
  );
}
