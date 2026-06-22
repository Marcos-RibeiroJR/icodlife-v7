'use client';
// apps/web/src/app/vacinas/page.tsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { AppLayout } from '../../components/layout/AppLayout';

// ── Catálogo estático (fallback quando API não retorna) ───────────────────────
const STATIC_VACCINES = [
  { id: 's-bcg',     name: 'BCG',                          tradeName: '',              diseases: ['Tuberculose'],                                    recommendedDoses: 1, intervalDays: null, boosterYears: null, ageGroups: ['recém-nascido'],   calendar: 'PNI',          notes: 'Dose única ao nascer' },
  { id: 's-hepb',    name: 'Hepatite B',                   tradeName: 'Engerix-B',     diseases: ['Hepatite B'],                                    recommendedDoses: 3, intervalDays: 30,   boosterYears: null, ageGroups: ['recém-nascido','adulto'], calendar: 'PNI', notes: '' },
  { id: 's-penta',   name: 'Pentavalente (DTP+Hib+HepB)',  tradeName: '',              diseases: ['Difteria','Tétano','Coqueluche','Haemophilus b','Hepatite B'], recommendedDoses: 3, intervalDays: 60, boosterYears: null, ageGroups: ['criança'], calendar: 'PNI', notes: '' },
  { id: 's-vip',     name: 'Poliomielite VIP',             tradeName: '',              diseases: ['Poliomielite'],                                  recommendedDoses: 3, intervalDays: 60,   boosterYears: null, ageGroups: ['criança'],   calendar: 'PNI',          notes: '' },
  { id: 's-vop',     name: 'Poliomielite VOP (oral)',       tradeName: '',              diseases: ['Poliomielite'],                                  recommendedDoses: 1, intervalDays: null, boosterYears: null, ageGroups: ['criança'],   calendar: 'PNI',          notes: 'Reforço oral a partir dos 15 meses' },
  { id: 's-rota',    name: 'Rotavírus',                    tradeName: 'Rotarix',       diseases: ['Gastroenterite por rotavírus'],                  recommendedDoses: 2, intervalDays: 30,   boosterYears: null, ageGroups: ['criança'],   calendar: 'PNI',          notes: '' },
  { id: 's-pneu10',  name: 'Pneumocócica 10-valente',       tradeName: 'Synflorix',     diseases: ['Pneumonia','Meningite pneumocócica','Otite média'], recommendedDoses: 3, intervalDays: 60, boosterYears: null, ageGroups: ['criança'], calendar: 'PNI', notes: '' },
  { id: 's-menC',    name: 'Meningocócica C',               tradeName: 'Menjugate',     diseases: ['Meningite meningocócica C'],                     recommendedDoses: 2, intervalDays: 60,   boosterYears: null, ageGroups: ['criança'],   calendar: 'PNI',          notes: '' },
  { id: 's-fa',      name: 'Febre Amarela',                 tradeName: 'Bio-Manguinhos',diseases: ['Febre Amarela'],                                 recommendedDoses: 1, intervalDays: null, boosterYears: 10,   ageGroups: ['criança','adulto'], calendar: 'PNI', notes: 'Reforço a cada 10 anos para viajantes' },
  { id: 's-scr',     name: 'Tríplice Viral (SCR)',          tradeName: 'Priorix',       diseases: ['Sarampo','Caxumba','Rubéola'],                   recommendedDoses: 2, intervalDays: 30,   boosterYears: null, ageGroups: ['criança'],   calendar: 'PNI',          notes: '' },
  { id: 's-scrv',    name: 'Tetraviral (SCRV)',              tradeName: 'Proquad',       diseases: ['Sarampo','Caxumba','Rubéola','Varicela'],         recommendedDoses: 1, intervalDays: null, boosterYears: null, ageGroups: ['criança'],   calendar: 'PNI',          notes: '' },
  { id: 's-hepa',    name: 'Hepatite A',                    tradeName: 'Havrix',        diseases: ['Hepatite A'],                                    recommendedDoses: 1, intervalDays: null, boosterYears: null, ageGroups: ['criança'],   calendar: 'PNI',          notes: '' },
  { id: 's-vz',      name: 'Varicela',                      tradeName: 'Varivax',       diseases: ['Catapora'],                                      recommendedDoses: 1, intervalDays: null, boosterYears: null, ageGroups: ['criança','adulto'], calendar: 'PNI', notes: '' },
  { id: 's-dtp',     name: 'DTP (tríplice bacteriana)',     tradeName: '',              diseases: ['Difteria','Tétano','Coqueluche'],                 recommendedDoses: 1, intervalDays: null, boosterYears: 10,   ageGroups: ['adolescente','adulto'], calendar: 'PNI', notes: 'Reforço a cada 10 anos' },
  { id: 's-dt',      name: 'dT (dupla adulto)',              tradeName: '',              diseases: ['Difteria','Tétano'],                             recommendedDoses: 3, intervalDays: 60,   boosterYears: 10,   ageGroups: ['adulto'],    calendar: 'PNI',          notes: '' },
  { id: 's-hpv',     name: 'HPV Quadrivalente',             tradeName: 'Gardasil',      diseases: ['HPV (tipos 6,11,16,18)'],                        recommendedDoses: 2, intervalDays: 180,  boosterYears: null, ageGroups: ['adolescente'], calendar: 'PNI', notes: '' },
  { id: 's-menACWY', name: 'Meningocócica ACWY',            tradeName: 'Menactra',      diseases: ['Meningite meningocócica A/C/W/Y'],               recommendedDoses: 1, intervalDays: null, boosterYears: null, ageGroups: ['adolescente'], calendar: 'PNI', notes: '' },
  { id: 's-flu',     name: 'Influenza (gripe)',              tradeName: 'Vaxigrip Tetra',diseases: ['Influenza'],                                     recommendedDoses: 1, intervalDays: null, boosterYears: 1,    ageGroups: ['criança','adulto','idoso'], calendar: 'PNI', notes: 'Dose anual — campanha nacional' },
  { id: 's-pneu23',  name: 'Pneumocócica 23-valente',        tradeName: 'Pneumovax 23',  diseases: ['Pneumonia pneumocócica'],                        recommendedDoses: 1, intervalDays: null, boosterYears: null, ageGroups: ['idoso'],      calendar: 'PNI',          notes: '' },
  { id: 's-cov-cv',  name: 'COVID-19 — CoronaVac',           tradeName: 'CoronaVac',     diseases: ['COVID-19'],                                      recommendedDoses: 2, intervalDays: 28,   boosterYears: 1,    ageGroups: ['adulto','idoso'], calendar: 'PNI', notes: '' },
  { id: 's-cov-pf',  name: 'COVID-19 — Pfizer/BioNTech',    tradeName: 'Comirnaty',     diseases: ['COVID-19'],                                      recommendedDoses: 2, intervalDays: 21,   boosterYears: 1,    ageGroups: ['adulto','adolescente'], calendar: 'PNI', notes: '' },
  { id: 's-cov-az',  name: 'COVID-19 — AstraZeneca',        tradeName: 'Vaxzevria',     diseases: ['COVID-19'],                                      recommendedDoses: 2, intervalDays: 84,   boosterYears: 1,    ageGroups: ['adulto','idoso'], calendar: 'PNI', notes: '' },
  { id: 's-cov-jj',  name: 'COVID-19 — Janssen',            tradeName: 'Janssen',       diseases: ['COVID-19'],                                      recommendedDoses: 1, intervalDays: null, boosterYears: 1,    ageGroups: ['adulto'],    calendar: 'PNI',          notes: '' },
  { id: 's-cov-mo',  name: 'COVID-19 — Moderna',            tradeName: 'Spikevax',      diseases: ['COVID-19'],                                      recommendedDoses: 2, intervalDays: 28,   boosterYears: 1,    ageGroups: ['adulto'],    calendar: 'Internacional', notes: '' },
  { id: 's-dengue',  name: 'Dengue (Dengvaxia)',             tradeName: 'Dengvaxia',     diseases: ['Dengue'],                                        recommendedDoses: 3, intervalDays: 180,  boosterYears: null, ageGroups: ['criança','adolescente'], calendar: 'PNI', notes: 'Somente soropositivos confirmados' },
  { id: 's-menB',    name: 'Meningocócica B',               tradeName: 'Bexsero',       diseases: ['Meningite meningocócica B'],                     recommendedDoses: 2, intervalDays: 60,   boosterYears: null, ageGroups: ['criança','adulto'], calendar: 'Recomendada', notes: '' },
  { id: 's-hz',      name: 'Herpes Zóster (Shingrix)',       tradeName: 'Shingrix',      diseases: ['Herpes Zóster'],                                 recommendedDoses: 2, intervalDays: 60,   boosterYears: null, ageGroups: ['idoso'],      calendar: 'Recomendada',  notes: 'Indicada para maiores de 50 anos' },
];

// ── Types ────────────────────────────────────────────────────────────────────

interface Vaccine {
  id: string;
  name: string;
  tradeName?: string;
  diseases: string[];
  recommendedDoses: number;
  intervalDays?: number;
  boosterYears?: number;
  ageGroups: string[];
  calendar: string;
  notes?: string;
}

interface VaccinationRecord {
  id: string;
  vaccineId: string;
  vaccine: Vaccine;
  doseNumber: number;
  status: 'completed' | 'scheduled' | 'skipped';
  appliedAt?: string;
  scheduledAt?: string;
  lotNumber?: string;
  location?: string;
  professional?: string;
  manufacturer?: string;
  nextDoseAt?: string;
  notes?: string;
}

interface Summary {
  total: number;
  completed: number;
  vaccinesCompleted: number;
  pendingDoses: number;
  overdueBoosters: number;
  upcomingBoosters: number;
  pniNotStarted: number;
  alerts: { type: 'overdue' | 'upcoming'; vaccineName: string; doseNumber: number; dueAt: string }[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = { completed: 'Aplicada', scheduled: 'Agendada', skipped: 'Pulada' };
const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  scheduled: 'bg-blue-100 text-blue-700',
  skipped:   'bg-slate-100 text-slate-500',
};
const CALENDAR_COLORS: Record<string, string> = {
  PNI:           'bg-green-50 border-green-200',
  Internacional: 'bg-blue-50 border-blue-200',
  Recomendada:   'bg-amber-50 border-amber-200',
};

function formatDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function VacinasPage() {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();

  const [catalog,  setCatalog]  = useState<Vaccine[]>([]);
  const [records,  setRecords]  = useState<VaccinationRecord[]>([]);
  const [summary,  setSummary]  = useState<Summary | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [activeTab, setActiveTab] = useState<'carteira' | 'catalogo' | 'alertas'>('carteira');
  const [filterCalendar, setFilterCalendar] = useState<string>('todos');
  const [search, setSearch] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState<VaccinationRecord | null>(null);
  const [form, setForm] = useState({
    vaccineId: '', doseNumber: 1, status: 'completed',
    appliedAt: '', scheduledAt: '', lotNumber: '',
    location: '', professional: '', manufacturer: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    if (!accessToken) { router.push('/auth/login'); return; }
    load();
  }, [accessToken]);

  async function load() {
    setLoading(true);
    try {
      const [catRes, recRes, sumRes] = await Promise.all([
        api.get('/vaccines'),
        api.get('/vaccinations'),
        api.get('/vaccinations/summary'),
      ]);
      // Merge API data with static fallback (API takes priority)
      const apiCatalog: Vaccine[] = catRes.data ?? [];
      const merged = apiCatalog.length > 0
        ? apiCatalog
        : STATIC_VACCINES as unknown as Vaccine[];
      setCatalog(merged);
      setRecords(recRes.data ?? []);
      setSummary(sumRes.data ?? null);
    } catch {
      // API unavailable — use static catalog so UI is still functional
      setCatalog(STATIC_VACCINES as unknown as Vaccine[]);
    }
    setLoading(false);
  }

  // ── Vacinas com progresso ────────────────────────────────────────────────

  const vaccineProgress = useMemo(() => {
    const map: Record<string, { done: number; records: VaccinationRecord[] }> = {};
    for (const r of records) {
      if (!map[r.vaccineId]) map[r.vaccineId] = { done: 0, records: [] };
      map[r.vaccineId].records.push(r);
      if (r.status === 'completed') map[r.vaccineId].done = Math.max(map[r.vaccineId].done, r.doseNumber);
    }
    return map;
  }, [records]);

  const filteredCatalog = useMemo(() => {
    return catalog.filter(v => {
      const matchCal = filterCalendar === 'todos' || v.calendar === filterCalendar;
      const matchSearch = !search || v.name.toLowerCase().includes(search.toLowerCase()) ||
        v.diseases.some(d => d.toLowerCase().includes(search.toLowerCase()));
      return matchCal && matchSearch;
    });
  }, [catalog, filterCalendar, search]);

  // ── Modal ────────────────────────────────────────────────────────────────

  function openNew(vaccineId = '') {
    setEditing(null);
    setForm({ vaccineId, doseNumber: 1, status: 'completed', appliedAt: '', scheduledAt: '', lotNumber: '', location: '', professional: '', manufacturer: '', notes: '' });
    setError('');
    setShowModal(true);
  }

  function openEdit(r: VaccinationRecord) {
    setEditing(r);
    setForm({
      vaccineId:    r.vaccineId,
      doseNumber:   r.doseNumber,
      status:       r.status,
      appliedAt:    r.appliedAt ? r.appliedAt.slice(0, 10) : '',
      scheduledAt:  r.scheduledAt ? r.scheduledAt.slice(0, 10) : '',
      lotNumber:    r.lotNumber ?? '',
      location:     r.location ?? '',
      professional: r.professional ?? '',
      manufacturer: r.manufacturer ?? '',
      notes:        r.notes ?? '',
    });
    setError('');
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.vaccineId) { setError('Selecione uma vacina'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        appliedAt:   form.appliedAt   || undefined,
        scheduledAt: form.scheduledAt || undefined,
        lotNumber:   form.lotNumber   || undefined,
        location:    form.location    || undefined,
        professional:form.professional|| undefined,
        manufacturer:form.manufacturer|| undefined,
        notes:       form.notes       || undefined,
      };
      if (editing) {
        await api.patch(`/vaccinations/${editing.id}`, payload);
      } else {
        await api.post('/vaccinations', payload);
      }
      setShowModal(false);
      load();
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Erro ao salvar');
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este registro?')) return;
    await api.delete(`/vaccinations/${id}`);
    load();
  }

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Carregando carteira de vacinação...</div>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
    <div className="bg-[#FFF8F8] min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">💉 Carteira de Vacinação</h1>
            <p className="text-slate-500 text-sm">Calendário PNI + registros pessoais</p>
          </div>
          <button onClick={() => openNew()} className="btn-primary px-4 py-2 text-sm">
            + Registrar Dose
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">

        {/* Alertas */}
        {summary && summary.alerts.length > 0 && (
          <div className="space-y-2">
            {summary.alerts.slice(0, 3).map((a, i) => (
              <div key={i} className={`rounded-xl px-4 py-3 flex items-center gap-3 border ${
                a.type === 'overdue'
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}>
                <span className="text-lg">{a.type === 'overdue' ? '⚠️' : '🔔'}</span>
                <div className="flex-1">
                  <span className="font-semibold">{a.vaccineName}</span>
                  {' — '}
                  {a.type === 'overdue'
                    ? `Dose ${a.doseNumber} vencida desde ${formatDate(a.dueAt)}`
                    : `Dose ${a.doseNumber} prevista para ${formatDate(a.dueAt)}`}
                </div>
                <button onClick={() => openNew()} className="text-xs underline font-medium">
                  Registrar
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Doses registradas', value: summary.completed, color: 'text-green-600', icon: '✅' },
              { label: 'Vacinas completas', value: summary.vaccinesCompleted, color: 'text-blue-600', icon: '💉' },
              { label: 'Doses pendentes', value: summary.pendingDoses, color: 'text-amber-600', icon: '⏳' },
              { label: 'Reforços vencidos', value: summary.overdueBoosters, color: 'text-red-600', icon: '⚠️' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-slate-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          {(['carteira', 'catalogo', 'alertas'] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'carteira' ? '📋 Minha Carteira' : t === 'catalogo' ? '📚 Catálogo PNI' : '🔔 Alertas'}
              {t === 'alertas' && summary && summary.alerts.length > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5">{summary.alerts.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab: Minha Carteira ── */}
        {activeTab === 'carteira' && (
          <div>
            {records.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <div className="text-5xl mb-4">💉</div>
                <p className="font-medium">Nenhuma vacina registrada ainda</p>
                <p className="text-sm mt-1">Clique em "Registrar Dose" para começar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Agrupar por vacina */}
                {Object.entries(
                  records.reduce<Record<string, VaccinationRecord[]>>((acc, r) => {
                    (acc[r.vaccineId] = acc[r.vaccineId] || []).push(r);
                    return acc;
                  }, {})
                ).map(([vaccineId, recs]) => {
                  const vaccine = recs[0].vaccine;
                  const progress = vaccineProgress[vaccineId];
                  const pct = Math.min(100, Math.round((progress.done / vaccine.recommendedDoses) * 100));
                  return (
                    <div key={vaccineId} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <h3 className="font-semibold text-slate-800">{vaccine.name}</h3>
                            <p className="text-xs text-slate-500 mt-0.5">{vaccine.diseases.join(', ')}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              pct >= 100 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {progress.done}/{vaccine.recommendedDoses} doses
                            </span>
                            <button onClick={() => openNew(vaccineId)} className="text-xs text-[#7B1E1E] hover:underline">+ dose</button>
                          </div>
                        </div>
                        {/* Barra de progresso */}
                        <div className="w-full bg-slate-100 rounded-full h-1.5 mb-3">
                          <div className={`h-1.5 rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : 'bg-amber-400'}`}
                            style={{ width: `${pct}%` }} />
                        </div>
                        {/* Lista de doses */}
                        <div className="space-y-2">
                          {recs.sort((a, b) => a.doseNumber - b.doseNumber).map(r => (
                            <div key={r.id} className="flex items-center gap-3 text-sm">
                              <span className="text-slate-400 w-16 shrink-0">Dose {r.doseNumber}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status]}`}>
                                {STATUS_LABELS[r.status]}
                              </span>
                              <span className="text-slate-600">{formatDate(r.appliedAt || r.scheduledAt)}</span>
                              {r.location && <span className="text-slate-400 text-xs">· {r.location}</span>}
                              {r.nextDoseAt && new Date(r.nextDoseAt) > new Date() && (
                                <span className="text-xs text-blue-600 ml-auto">próximo: {formatDate(r.nextDoseAt)}</span>
                              )}
                              {r.nextDoseAt && new Date(r.nextDoseAt) < new Date() && (
                                <span className="text-xs text-red-600 ml-auto">reforço vencido</span>
                              )}
                              <div className="flex gap-1 ml-auto">
                                <button onClick={() => openEdit(r)} className="text-xs text-slate-400 hover:text-slate-600 px-1">✏️</button>
                                <button onClick={() => handleDelete(r.id)} className="text-xs text-slate-400 hover:text-red-500 px-1">🗑️</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Catálogo PNI ── */}
        {activeTab === 'catalogo' && (
          <div className="space-y-4">
            {/* Filtros */}
            <div className="flex gap-3 flex-wrap">
              <input
                type="text" placeholder="Buscar vacina ou doença..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="input-field max-w-xs text-sm"
              />
              {['todos', 'PNI', 'Internacional', 'Recomendada'].map(c => (
                <button key={c} onClick={() => setFilterCalendar(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    filterCalendar === c
                      ? 'bg-[#7B1E1E] text-white border-[#7B1E1E]'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}>
                  {c === 'todos' ? 'Todos' : c}
                </button>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredCatalog.map(v => {
                const progress = vaccineProgress[v.id];
                const done = progress?.done ?? 0;
                const pct = Math.min(100, Math.round((done / v.recommendedDoses) * 100));
                const isComplete = done >= v.recommendedDoses;
                return (
                  <div key={v.id} className={`rounded-2xl border p-4 ${CALENDAR_COLORS[v.calendar] ?? 'bg-white border-slate-100'} ${isComplete ? 'opacity-75' : ''}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h4 className="font-semibold text-slate-800 text-sm leading-tight">{v.name}</h4>
                        {v.tradeName && <p className="text-xs text-slate-500">{v.tradeName}</p>}
                      </div>
                      {isComplete && <span className="text-green-500 shrink-0">✅</span>}
                    </div>
                    <p className="text-xs text-slate-500 mb-2">{v.diseases.join(', ')}</p>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 bg-white/70 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: isComplete ? '#22c55e' : '#7B1E1E' }} />
                      </div>
                      <span className="text-xs text-slate-600 font-medium shrink-0">{done}/{v.recommendedDoses}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        v.calendar === 'PNI' ? 'bg-green-100 text-green-700' :
                        v.calendar === 'Internacional' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>{v.calendar}</span>
                      <button onClick={() => openNew(v.id)}
                        className="text-xs text-[#7B1E1E] hover:underline font-medium">
                        {isComplete ? '✓ Completa' : '+ Registrar dose'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Tab: Alertas ── */}
        {activeTab === 'alertas' && (
          <div>
            {!summary || summary.alerts.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <div className="text-5xl mb-4">✅</div>
                <p className="font-medium">Nenhum alerta de vacinação</p>
                <p className="text-sm mt-1">Sua carteira está em dia!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {summary.alerts.map((a, i) => (
                  <div key={i} className={`rounded-2xl p-4 border ${
                    a.type === 'overdue' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-lg mr-2">{a.type === 'overdue' ? '⚠️' : '🔔'}</span>
                        <span className="font-semibold text-slate-800">{a.vaccineName}</span>
                        <p className="text-sm text-slate-600 mt-1">
                          Dose {a.doseNumber} — {a.type === 'overdue'
                            ? `vencida desde ${formatDate(a.dueAt)}`
                            : `prevista para ${formatDate(a.dueAt)}`}
                        </p>
                      </div>
                      <button onClick={() => openNew()}
                        className="text-xs bg-[#7B1E1E] text-white px-3 py-1.5 rounded-lg hover:bg-[#6a1a1a] font-medium">
                        Registrar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-800">
                {editing ? 'Editar registro' : 'Registrar Dose'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Vacina *</label>
                <VaccineCombobox
                  catalog={catalog}
                  value={form.vaccineId}
                  onChange={id => setForm(f => ({ ...f, vaccineId: id }))}
                  disabled={!!editing}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Nº da dose</label>
                  <input type="number" min={1} max={10} value={form.doseNumber}
                    onChange={e => setForm(f => ({ ...f, doseNumber: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none">
                    <option value="completed">Aplicada</option>
                    <option value="scheduled">Agendada</option>
                    <option value="skipped">Pulada</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Data de aplicação</label>
                  <input type="date" value={form.appliedAt}
                    onChange={e => setForm(f => ({ ...f, appliedAt: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Data agendada</label>
                  <input type="date" value={form.scheduledAt}
                    onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Local</label>
                  <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    placeholder="Ex: UBS Centro"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Profissional</label>
                  <input value={form.professional} onChange={e => setForm(f => ({ ...f, professional: e.target.value }))}
                    placeholder="Nome do aplicador"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Lote</label>
                  <input value={form.lotNumber} onChange={e => setForm(f => ({ ...f, lotNumber: e.target.value }))}
                    placeholder="Número do lote"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Fabricante</label>
                  <input value={form.manufacturer} onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))}
                    placeholder="Ex: Bio-Manguinhos"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Observações</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} placeholder="Reações, observações..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none resize-none" />
              </div>

              {error && <p className="text-red-600 text-xs">{error}</p>}

              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50">
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 bg-[#7B1E1E] hover:bg-[#6a1a1a] disabled:opacity-60 text-white font-medium py-2 rounded-lg text-sm transition-colors">
                  {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Registrar Dose'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </AppLayout>
  );
}

// ── VaccineCombobox ──────────────────────────────────────────────────────────

function VaccineCombobox({
  catalog, value, onChange, disabled,
}: {
  catalog: Vaccine[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selected = catalog.find(v => v.id === value);
  const filtered = catalog.filter(v =>
    !query ||
    v.name.toLowerCase().includes(query.toLowerCase()) ||
    (v.tradeName && v.tradeName.toLowerCase().includes(query.toLowerCase())) ||
    v.diseases.some(d => d.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div ref={ref} className="relative">
      <div
        className={`w-full px-3 py-2 border rounded-lg text-sm flex items-center gap-2 cursor-text ${
          disabled ? 'bg-slate-50 border-slate-200' : 'border-slate-300 focus-within:ring-2 focus-within:ring-red-500'
        }`}
        onClick={() => !disabled && setOpen(true)}
      >
        {selected && !open ? (
          <span className="flex-1 truncate text-slate-800">{selected.name}</span>
        ) : (
          <input
            autoFocus={open}
            value={open ? query : (selected?.name ?? '')}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => !disabled && setOpen(true)}
            placeholder="Digite para buscar vacina..."
            disabled={disabled}
            className="flex-1 outline-none bg-transparent placeholder-slate-400"
          />
        )}
        {!disabled && <span className="text-slate-400 text-xs">{open ? '▲' : '▼'}</span>}
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400">Nenhuma vacina encontrada</div>
          ) : (
            filtered.map(v => (
              <button key={v.id} type="button"
                className={`w-full text-left px-4 py-2.5 hover:bg-red-50 text-sm transition-colors flex items-center justify-between gap-3 ${
                  v.id === value ? 'bg-red-50' : ''
                }`}
                onClick={() => { onChange(v.id); setQuery(''); setOpen(false); }}>
                <div>
                  <div className="font-medium text-slate-800">{v.name}</div>
                  {v.tradeName && <div className="text-xs text-slate-400">{v.tradeName}</div>}
                  <div className="text-xs text-slate-500">{v.diseases.slice(0, 2).join(', ')}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                  v.calendar === 'PNI' ? 'bg-green-100 text-green-700' :
                  v.calendar === 'Internacional' ? 'bg-blue-100 text-blue-700' :
                  'bg-amber-100 text-amber-700'
                }`}>{v.calendar}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
