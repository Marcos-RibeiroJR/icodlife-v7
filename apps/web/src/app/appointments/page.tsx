'use client';
// apps/web/src/app/appointments/page.tsx
// Agenda médica com calendário mensal visual
import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('icodlife_token') : null; }
function authH()    { return { headers: { Authorization: `Bearer ${getToken()}` } }; }

const STATUS_MAP = {
  scheduled: { label: 'Agendada',  color: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500'  },
  completed: { label: 'Realizada', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  canceled:  { label: 'Cancelada', color: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400' },
  no_show:   { label: 'Faltou',    color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
};

const REMINDER_OPTS = [
  { value: 15,   label: '15 min antes' },
  { value: 30,   label: '30 min antes' },
  { value: 60,   label: '1 hora antes' },
  { value: 1440, label: '1 dia antes'  },
];

const WEEKDAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const MONTHS   = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const EMPTY_FORM = {
  doctorName:'', specialty:'', location:'', address:'', cnesCode:'',
  appointmentAt:'', duration:'30', status:'scheduled' as const,
  telehealth: false, meetingUrl:'', reminderMinutes:'', color:'#DC2626', notes:'',
};

export default function AppointmentsPage() {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const [allAppts,   setAllAppts]   = useState<any[]>([]);
  const [monthAppts, setMonthAppts] = useState<any[]>([]);
  const [upcoming,   setUpcoming]   = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [view,  setView]  = useState<'calendar' | 'list' | 'upcoming'>('calendar');
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState<any>(null);
  const [form,     setForm]     = useState({ ...EMPTY_FORM });
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [myDoctors, setMyDoctors] = useState<any[]>([]);

  const loadMonth = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/appointments/calendar`, { params: { year, month }, ...authH() });
      setMonthAppts(r.data);
    } catch {}
  }, [year, month]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, uRes, dRes] = await Promise.all([
        axios.get(`${API}/appointments`,               authH()),
        axios.get(`${API}/appointments/upcoming?limit=5`, authH()),
        axios.get(`${API}/meus-medicos`,               authH()),
      ]);
      setAllAppts(aRes.data);
      setUpcoming(uRes.data);
      setMyDoctors(dRes.data ?? []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); },      [load]);
  useEffect(() => { loadMonth(); }, [loadMonth]);

  const prevMonth = () => { if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1); };

  const setField = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const openNew = (day?: number) => {
    setEditing(null);
    const dt = day ? `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}T09:00` : '';
    setForm({ ...EMPTY_FORM, appointmentAt: dt });
    setError(''); setShowForm(true);
  };

  const openEdit = (a: any) => {
    setEditing(a);
    setForm({
      doctorName:     a.doctorName     ?? '',
      specialty:      a.specialty      ?? '',
      location:       a.location       ?? '',
      address:        a.address        ?? '',
      cnesCode:       a.cnesCode       ?? '',
      appointmentAt:  a.appointmentAt  ? a.appointmentAt.slice(0, 16) : '',
      duration:       String(a.duration ?? 30),
      status:         a.status         ?? 'scheduled',
      telehealth:     a.telehealth     ?? false,
      meetingUrl:     a.meetingUrl     ?? '',
      reminderMinutes: a.reminderMinutes ? String(a.reminderMinutes) : '',
      color:          a.color          ?? '#DC2626',
      notes:          a.notes          ?? '',
    });
    setError(''); setShowForm(true);
  };

  const save = async () => {
    if (!form.doctorName.trim()) { setError('Nome do médico é obrigatório'); return; }
    if (!form.appointmentAt)     { setError('Data e hora são obrigatórias'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        doctorName:      form.doctorName,
        specialty:       form.specialty      || undefined,
        location:        form.location       || undefined,
        address:         form.address        || undefined,
        cnesCode:        form.cnesCode       || undefined,
        appointmentAt:   form.appointmentAt,
        duration:        Number(form.duration) || 30,
        status:          form.status,
        telehealth:      form.telehealth,
        meetingUrl:      form.meetingUrl     || undefined,
        reminderMinutes: form.reminderMinutes ? Number(form.reminderMinutes) : undefined,
        color:           form.color,
        notes:           form.notes          || undefined,
      };
      if (editing) await axios.patch(`${API}/appointments/${editing.id}`, payload, authH());
      else         await axios.post(`${API}/appointments`, payload, authH());
      setShowForm(false);
      await Promise.all([load(), loadMonth()]);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Erro ao salvar');
    } finally { setSaving(false); }
  };

  const changeStatus = async (id: string, status: string) => {
    try { await axios.patch(`${API}/appointments/${id}`, { status }, authH()); await Promise.all([load(), loadMonth()]); } catch {}
  };

  const remove = async (id: string) => {
    if (!confirm('Remover esta consulta?')) return;
    try { await axios.delete(`${API}/appointments/${id}`, authH()); await Promise.all([load(), loadMonth()]); } catch {}
  };

  // Calendário
  const firstDay    = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const apptsByDay: Record<number, any[]> = {};
  monthAppts.forEach(a => {
    const d = new Date(a.appointmentAt).getDate();
    if (!apptsByDay[d]) apptsByDay[d] = [];
    apptsByDay[d].push(a);
  });
  const dayAppts     = selectedDay ? (apptsByDay[selectedDay] ?? []) : [];
  const upcomingList = allAppts.filter(a => a.status === 'scheduled' && new Date(a.appointmentAt) >= today);
  const pastList     = allAppts.filter(a => a.status !== 'scheduled' || new Date(a.appointmentAt) < today);

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Agenda Médica</h1>
            <p className="text-slate-500 text-sm mt-0.5">{allAppts.length} consulta(s) registrada(s)</p>
          </div>
          <button onClick={() => openNew()} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg">
            + Nova consulta
          </button>
        </div>

        {/* Banner próxima consulta */}
        {upcoming.length > 0 && view !== 'upcoming' && (
          <div className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-2xl p-4 mb-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">📅</div>
            <div className="flex-1">
              <p className="text-xs text-white/70 mb-0.5">Próxima consulta</p>
              <p className="font-bold">{upcoming[0].doctorName}</p>
              <p className="text-sm text-white/80">
                {new Date(upcoming[0].appointmentAt).toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' })}
                {' às '}{new Date(upcoming[0].appointmentAt).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}
                {upcoming[0].telehealth ? ' · Online' : upcoming[0].location ? ` · ${upcoming[0].location}` : ''}
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit mb-6">
          {(['calendar','list','upcoming'] as const).map(t => (
            <button key={t} onClick={() => setView(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors
                ${view === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {t === 'calendar' ? 'Calendário' : t === 'list' ? 'Histórico' : 'Próximas'}
            </button>
          ))}
        </div>

        {/* CALENDÁRIO */}
        {view === 'calendar' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-4">
              {/* Nav mês */}
              <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 text-lg">‹</button>
                <h2 className="text-base font-bold text-slate-800">{MONTHS[month - 1]} {year}</h2>
                <button onClick={nextMonth} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 text-lg">›</button>
              </div>
              {/* Dias da semana */}
              <div className="grid grid-cols-7 mb-2">
                {WEEKDAYS.map(w => <div key={w} className="text-center text-xs font-medium text-slate-400 py-1">{w}</div>)}
              </div>
              {/* Células */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day    = i + 1;
                  const isToday = day === today.getDate() && month === today.getMonth()+1 && year === today.getFullYear();
                  const hasAppt = !!apptsByDay[day]?.length;
                  const isSel   = selectedDay === day;
                  return (
                    <button key={day} onClick={() => setSelectedDay(isSel ? null : day)}
                      className={`relative h-10 rounded-xl text-sm font-medium transition-all flex flex-col items-center justify-center
                        ${isToday ? 'ring-2 ring-red-500' : ''}
                        ${isSel   ? 'bg-red-600 text-white' : 'hover:bg-slate-50 text-slate-700'}`}>
                      {day}
                      {hasAppt && (
                        <div className="flex gap-0.5 mt-0.5">
                          {(apptsByDay[day] ?? []).slice(0,3).map((a: any, ai: number) => (
                            <div key={ai} className={`w-1 h-1 rounded-full
                              ${isSel ? 'bg-white/70' : (STATUS_MAP[a.status as keyof typeof STATUS_MAP]?.dot ?? 'bg-slate-400')}`} />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => openNew(selectedDay ?? undefined)}
                className="mt-4 w-full text-xs text-red-600 hover:text-red-700 font-medium py-2 border border-dashed border-red-200 rounded-xl hover:bg-red-50 transition-colors">
                + Agendar {selectedDay ? `em ${selectedDay}/${month}` : 'nova consulta'}
              </button>
            </div>

            {/* Painel lateral */}
            <div className="space-y-3">
              {selectedDay ? (
                <>
                  <h3 className="text-sm font-semibold text-slate-700">
                    {selectedDay}/{month}/{year}
                    {dayAppts.length === 0 && <span className="text-slate-400 ml-2 font-normal">sem consultas</span>}
                  </h3>
                  {dayAppts.length === 0
                    ? <button onClick={() => openNew(selectedDay)}
                        className="w-full bg-white border border-dashed border-slate-300 rounded-xl p-6 text-sm text-slate-400 hover:border-red-300 hover:text-red-500 transition-colors">
                        + Agendar consulta neste dia
                      </button>
                    : dayAppts.map(a => <AppointmentCard key={a.id} appt={a} onEdit={openEdit} onDelete={remove} onStatus={changeStatus} />)}
                </>
              ) : (
                <>
                  <h3 className="text-sm font-semibold text-slate-700">Próximas</h3>
                  {upcoming.slice(0,4).map(a => <AppointmentCard key={a.id} appt={a} onEdit={openEdit} onDelete={remove} onStatus={changeStatus} compact />)}
                  {upcoming.length === 0 && (
                    <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-xs text-slate-400">Nenhuma consulta agendada</div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* HISTÓRICO */}
        {view === 'list' && (
          <div className="space-y-3">
            {loading ? <p className="text-slate-400 text-sm">Carregando...</p> : (
              <>
                {upcomingList.length > 0 && <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Próximas</p>
                  {upcomingList.map(a => <AppointmentCard key={a.id} appt={a} onEdit={openEdit} onDelete={remove} onStatus={changeStatus} />)}
                </div>}
                {pastList.length > 0 && <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2 mt-4 uppercase tracking-wide">Anteriores</p>
                  {pastList.map(a => <AppointmentCard key={a.id} appt={a} onEdit={openEdit} onDelete={remove} onStatus={changeStatus} />)}
                </div>}
                {allAppts.length === 0 && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                    <p className="text-slate-400 text-sm mb-3">Nenhuma consulta registrada ainda.</p>
                    <button onClick={() => openNew()} className="text-red-600 hover:underline text-sm font-medium">Agendar primeira consulta</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* PRÓXIMAS */}
        {view === 'upcoming' && (
          <div className="space-y-3">
            {upcomingList.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                <div className="text-4xl mb-3">📅</div>
                <p className="text-slate-500 text-sm mb-3">Nenhuma consulta agendada.</p>
                <button onClick={() => openNew()} className="text-red-600 hover:underline text-sm font-medium">Agendar agora</button>
              </div>
            ) : upcomingList.map(a => <AppointmentCard key={a.id} appt={a} onEdit={openEdit} onDelete={remove} onStatus={changeStatus} />)}
          </div>
        )}
      </div>

      {/* MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-800">{editing ? 'Editar consulta' : 'Nova consulta'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Médico *</label>
                  <input value={form.doctorName} onChange={e => setField('doctorName', e.target.value)}
                    placeholder="Dr. Nome" list="doctors-list"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none" />
                  <datalist id="doctors-list">
                    {myDoctors.map((d: any) => (
                      <option key={d.id} value={d.doctor?.user?.fullName ?? d.externalName ?? ''} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Especialidade</label>
                  <input value={form.specialty} onChange={e => setField('specialty', e.target.value)}
                    placeholder="Ex: Cardiologia"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Duração (min)</label>
                  <select value={form.duration} onChange={e => setField('duration', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none">
                    {[15,20,30,45,60,90,120].map(d => <option key={d} value={d}>{d} min</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Data e hora *</label>
                <input type="datetime-local" value={form.appointmentAt} onChange={e => setField('appointmentAt', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none" />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <div onClick={() => setField('telehealth', !form.telehealth)}
                  className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${form.telehealth ? 'bg-red-600' : 'bg-slate-300'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.telehealth ? 'left-5' : 'left-0.5'}`} />
                </div>
                <span className="text-sm text-slate-700">Consulta online (telehealth)</span>
              </label>

              {form.telehealth ? (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Link da videochamada</label>
                  <input value={form.meetingUrl} onChange={e => setField('meetingUrl', e.target.value)}
                    placeholder="https://meet.google.com/..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Clínica / Hospital</label>
                    <input value={form.location} onChange={e => setField('location', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Endereço</label>
                    <input value={form.address} onChange={e => setField('address', e.target.value)}
                      placeholder="Rua, número"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Lembrete</label>
                  <select value={form.reminderMinutes} onChange={e => setField('reminderMinutes', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none">
                    <option value="">Sem lembrete</option>
                    {REMINDER_OPTS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                  <select value={form.status} onChange={e => setField('status', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none">
                    <option value="scheduled">Agendada</option>
                    <option value="completed">Realizada</option>
                    <option value="canceled">Cancelada</option>
                    <option value="no_show">Faltou</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 items-end">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Cor</label>
                  <input type="color" value={form.color} onChange={e => setField('color', e.target.value)}
                    className="w-full h-9 border border-slate-300 rounded-lg cursor-pointer" />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Notas</label>
                  <input value={form.notes} onChange={e => setField('notes', e.target.value)}
                    placeholder="Exames a levar, observações..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none" />
                </div>
              </div>

              {error && <p className="text-red-600 text-xs">{error}</p>}
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
                <button onClick={save} disabled={saving}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-medium py-2 rounded-lg text-sm">
                  {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Agendar consulta'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function AppointmentCard({ appt: a, onEdit, onDelete, onStatus, compact = false }: {
  appt: any; onEdit: (a: any) => void; onDelete: (id: string) => void;
  onStatus: (id: string, s: string) => void; compact?: boolean;
}) {
  const st  = STATUS_MAP[a.status as keyof typeof STATUS_MAP] ?? STATUS_MAP.scheduled;
  const dt  = new Date(a.appointmentAt);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4"
      style={{ borderLeftWidth: 3, borderLeftColor: a.color ?? '#DC2626' }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="text-sm font-semibold text-slate-800 truncate">{a.doctorName}</p>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
            {a.telehealth && <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">Online</span>}
          </div>
          {a.specialty && <p className="text-xs text-slate-500">{a.specialty}</p>}
          <p className="text-xs text-slate-500 mt-0.5">
            {dt.toLocaleDateString('pt-BR', { weekday: compact ? undefined : 'short', day: 'numeric', month: 'short' })}
            {' às '}{dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            {!compact && a.duration ? ` · ${a.duration} min` : ''}
            {!compact && a.location ? ` · ${a.location}` : ''}
          </p>
          {!compact && a.reminderMinutes && a.status === 'scheduled' && (
            <p className="text-xs text-amber-600 mt-0.5">
              🔔 {REMINDER_OPTS.find(r => r.value === a.reminderMinutes)?.label ?? `${a.reminderMinutes} min antes`}
            </p>
          )}
          {!compact && a.notes && <p className="text-xs text-slate-400 mt-1 italic truncate">{a.notes}</p>}
          {!compact && a.telehealth && a.meetingUrl && (
            <a href={a.meetingUrl} target="_blank" rel="noreferrer"
              className="text-xs text-blue-600 hover:underline block mt-1">Entrar na videochamada →</a>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {a.status === 'scheduled' && !compact && (
            <button onClick={() => onStatus(a.id, 'completed')}
              className="text-xs text-green-600 border border-green-200 px-2 py-1 rounded hover:bg-green-50">✓</button>
          )}
          <button onClick={() => onEdit(a)}
            className="text-xs text-slate-500 border border-slate-200 px-2 py-1 rounded hover:bg-slate-50">Editar</button>
          <button onClick={() => onDelete(a.id)}
            className="text-xs text-red-400 border border-red-100 px-2 py-1 rounded hover:bg-red-50">✕</button>
        </div>
      </div>
    </div>
  );
}
