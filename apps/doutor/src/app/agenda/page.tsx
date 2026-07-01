'use client';
// apps/doutor/src/app/agenda/page.tsx
// Sprint 15 — Minha Agenda
// Views: Dia / Semana / Mês + Configuração de carga horária

import { useEffect, useState, useCallback, useRef } from 'react';
import DoctorShell from '@/components/ui/DoctorShell';
import { api } from '@/lib/api';

type ViewMode = 'day' | 'week' | 'month';

const DAYS_PT  = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DAYS_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const TYPE_COLORS: Record<string, string> = {
  consulta:    'bg-blue-500',
  retorno:     'bg-teal-500',
  exame:       'bg-purple-500',
  procedimento:'bg-orange-500',
};
const STATUS_RING: Record<string, string> = {
  scheduled:  'ring-blue-400',
  completed:  'ring-green-400',
  canceled:   'ring-red-300 opacity-50',
  no_show:    'ring-slate-300 opacity-50',
};

function fmt(date: Date) { return date.toISOString().slice(0, 10); }
function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}
function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate();
}

// ─── Modal Novo Agendamento ───────────────────────────────────────────────────
function ApptModal({
  date, time, onClose, onSave, patients,
}: {
  date: string; time?: string; onClose: () => void;
  onSave: (data: any) => void; patients: any[];
}) {
  const [form, setForm] = useState({
    patientName:     '',
    patientPhone:    '',
    patientIcode:    '',
    patientDoctorId: '',
    scheduledAt:     `${date}T${time || '08:00'}`,
    durationMinutes: 30,
    type:            'consulta',
    notes:           '',
    price:           '',
    paymentStatus:   'pending',
    color:           '#2563EB',
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.patientName.trim()) return;
    setSaving(true);
    try {
      await onSave({
        ...form,
        durationMinutes: Number(form.durationMinutes),
        price: form.price ? Number(form.price) : undefined,
      });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-800">Novo Agendamento</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        <div className="space-y-3">
          {/* Paciente */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Paciente *</label>
            {patients.length > 0 ? (
              <select
                value={form.patientDoctorId}
                onChange={e => {
                  const p = patients.find((x: any) => x.id === e.target.value);
                  set('patientDoctorId', e.target.value);
                  if (p) { set('patientName', p.user?.fullName ?? ''); set('patientIcode', p.user?.icode ?? ''); }
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">— Selecionar paciente vinculado —</option>
                {patients.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.user?.fullName} ({p.user?.icode ?? 'sem código'})</option>
                ))}
              </select>
            ) : null}
            <input
              value={form.patientName}
              onChange={e => set('patientName', e.target.value)}
              placeholder="Nome do paciente (ou externo)"
              className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Data e hora</label>
              <input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={e => set('scheduledAt', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Duração (min)</label>
              <select
                value={form.durationMinutes}
                onChange={e => set('durationMinutes', Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {[15, 20, 30, 45, 60, 90, 120].map(m => (
                  <option key={m} value={m}>{m} min</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
              <select
                value={form.type}
                onChange={e => set('type', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="consulta">Consulta</option>
                <option value="retorno">Retorno</option>
                <option value="exame">Exame</option>
                <option value="procedimento">Procedimento</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Valor (R$)</label>
              <input
                type="number"
                value={form.price}
                onChange={e => set('price', e.target.value)}
                placeholder="0,00"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Observações</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              placeholder="Motivo da consulta, observações..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
          </div>

          {/* Cor */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Cor</label>
            <div className="flex gap-2">
              {['#2563EB','#0D9488','#7C3AED','#EA580C','#DC2626','#16A34A'].map(c => (
                <button
                  key={c}
                  onClick={() => set('color', c)}
                  className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={save}
            disabled={saving || !form.patientName.trim()}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? 'Salvando...' : 'Agendar'}
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

// ─── Modal Configuração de Carga Horária ─────────────────────────────────────
function WorkingHoursModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const defaultHours = DAYS_FULL.map((_, i) => ({
    dayOfWeek:   i,
    startTime:   '08:00',
    endTime:     '18:00',
    slotMinutes: 30,
    isActive:    i >= 1 && i <= 5,
  }));
  const [days, setDays]   = useState(defaultHours);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/doutor/agenda/working-hours').then(r => {
      if (r.data?.length) {
        const map = Object.fromEntries(r.data.map((d: any) => [d.dayOfWeek, d]));
        setDays(prev => prev.map(d => map[d.dayOfWeek] ? { ...d, ...map[d.dayOfWeek] } : d));
      }
    }).catch(() => {});
  }, []);

  const setDay = (i: number, key: string, value: any) =>
    setDays(prev => prev.map((d, idx) => idx === i ? { ...d, [key]: value } : d));

  const save = async () => {
    setSaving(true);
    try {
      await api.post('/doutor/agenda/working-hours', { days });
      onSave();
      onClose();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Erro ao salvar');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-800">Carga Horária</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>

        <div className="space-y-3">
          {days.map((d, i) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
              d.isActive ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-slate-50'
            }`}>
              <label className="flex items-center gap-2 w-24 flex-shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={d.isActive}
                  onChange={e => setDay(i, 'isActive', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium text-slate-700">{DAYS_FULL[i]}</span>
              </label>

              {d.isActive && (
                <>
                  <input
                    type="time"
                    value={d.startTime}
                    onChange={e => setDay(i, 'startTime', e.target.value)}
                    className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none w-24"
                  />
                  <span className="text-slate-400 text-xs">até</span>
                  <input
                    type="time"
                    value={d.endTime}
                    onChange={e => setDay(i, 'endTime', e.target.value)}
                    className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none w-24"
                  />
                  <select
                    value={d.slotMinutes}
                    onChange={e => setDay(i, 'slotMinutes', Number(e.target.value))}
                    className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {[15, 20, 30, 45, 60].map(m => <option key={m} value={m}>{m}min</option>)}
                  </select>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
          >
            {saving ? 'Salvando...' : 'Salvar Carga Horária'}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 border border-slate-300 text-slate-600 text-sm rounded-lg">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── View: Semana ─────────────────────────────────────────────────────────────
function WeekView({
  weekStart, appointments, slots, onSlotClick, onApptClick,
}: {
  weekStart: Date;
  appointments: any[];
  slots: Record<string, any[]>;
  onSlotClick: (date: string, time: string) => void;
  onApptClick: (appt: any) => void;
}) {
  const hours = Array.from({ length: 13 }, (_, i) => i + 7); // 07:00 – 19:00
  const days  = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  return (
    <div className="overflow-auto border border-slate-200 rounded-xl bg-white">
      {/* Header */}
      <div className="grid grid-cols-8 border-b border-slate-200 sticky top-0 bg-white z-10">
        <div className="py-3 px-2 text-xs text-slate-400 border-r border-slate-100" />
        {days.map(d => (
          <div key={d.toISOString()}
            className={`py-3 text-center border-r border-slate-100 last:border-0 ${sameDay(d, today) ? 'bg-blue-50' : ''}`}>
            <p className="text-xs text-slate-500">{DAYS_PT[d.getDay()]}</p>
            <p className={`text-lg font-bold mt-0.5 ${sameDay(d, today) ? 'text-blue-600' : 'text-slate-800'}`}>
              {d.getDate()}
            </p>
          </div>
        ))}
      </div>

      {/* Grade de horas */}
      {hours.map(h => (
        <div key={h} className="grid grid-cols-8 border-b border-slate-100 last:border-0">
          <div className="py-2 px-2 text-xs text-slate-400 border-r border-slate-100 text-right">
            {String(h).padStart(2, '0')}:00
          </div>
          {days.map(d => {
            const dateStr  = fmt(d);
            const daySlots = (slots[dateStr] ?? []).filter((s: any) => {
              const [sh] = s.time.split(':').map(Number);
              return sh === h;
            });
            const dayAppts = appointments.filter(a => {
              const at = new Date(a.scheduledAt);
              return sameDay(at, d) && at.getHours() === h;
            });

            return (
              <div key={d.toISOString()}
                className={`relative min-h-[48px] border-r border-slate-100 last:border-0 p-0.5 group
                  ${sameDay(d, today) ? 'bg-blue-50/40' : 'hover:bg-slate-50'}`}
                onClick={() => onSlotClick(dateStr, `${String(h).padStart(2,'0')}:00`)}
              >
                {dayAppts.map((a: any) => (
                  <div
                    key={a.id}
                    onClick={e => { e.stopPropagation(); onApptClick(a); }}
                    className={`text-xs text-white px-1.5 py-1 rounded-md mb-0.5 cursor-pointer
                      hover:opacity-90 transition-opacity ring-2 ${STATUS_RING[a.status] ?? 'ring-blue-400'}`}
                    style={{ backgroundColor: a.color || '#2563EB' }}
                  >
                    <p className="font-semibold truncate">{a.patientName}</p>
                    <p className="opacity-80">
                      {new Date(a.scheduledAt).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}
                      {' '}· {a.type}
                    </p>
                  </div>
                ))}
                {daySlots.map((s: any) => s.available && (
                  <div
                    key={s.time}
                    className="text-xs text-slate-400 opacity-0 group-hover:opacity-100 px-1"
                  >
                    {s.time}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── View: Mês ────────────────────────────────────────────────────────────────
function MonthView({
  month, year, appointments, onDayClick,
}: {
  month: number; year: number;
  appointments: any[];
  onDayClick: (date: string) => void;
}) {
  const today    = new Date();
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay();
  const cells: (Date | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: lastDay.getDate() }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const apptsByDay = appointments.reduce((acc: any, a: any) => {
    const d = fmt(new Date(a.scheduledAt));
    if (!acc[d]) acc[d] = [];
    acc[d].push(a);
    return acc;
  }, {});

  return (
    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
      {/* Header dias */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
        {DAYS_PT.map(d => (
          <div key={d} className="py-2 text-center text-xs font-medium text-slate-500">{d}</div>
        ))}
      </div>
      {/* Células */}
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="min-h-[90px] border-r border-b border-slate-100 bg-slate-50/50 last:border-r-0" />;
          const dateStr   = fmt(d);
          const isToday   = sameDay(d, today);
          const dayAppts  = apptsByDay[dateStr] ?? [];
          return (
            <div
              key={i}
              onClick={() => onDayClick(dateStr)}
              className={`min-h-[90px] border-r border-b border-slate-100 last:border-r-0 p-1.5 cursor-pointer transition-colors
                ${isToday ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
            >
              <p className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1
                ${isToday ? 'bg-blue-600 text-white' : 'text-slate-700'}`}>
                {d.getDate()}
              </p>
              {dayAppts.slice(0, 3).map((a: any, j: number) => (
                <div
                  key={j}
                  className="text-xs text-white px-1.5 py-0.5 rounded mb-0.5 truncate"
                  style={{ backgroundColor: a.color || '#2563EB' }}
                >
                  {new Date(a.scheduledAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})} {a.patientName}
                </div>
              ))}
              {dayAppts.length > 3 && (
                <p className="text-xs text-slate-400 pl-1">+{dayAppts.length - 3}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── View: Dia ────────────────────────────────────────────────────────────────
function DayView({
  date, summary, onSlotClick, onApptClick,
}: {
  date: Date; summary: any;
  onSlotClick: (time: string) => void;
  onApptClick: (appt: any) => void;
}) {
  const slots = summary?.slots ?? [];
  const appts = summary?.appointments ?? [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Slots do dia */}
      <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">
            {date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <div className="flex gap-3 text-xs text-slate-500">
            <span className="text-green-600 font-medium">{summary?.freeSlots ?? 0} livres</span>
            <span>·</span>
            <span className="text-blue-600 font-medium">{summary?.bookedSlots ?? 0} agendados</span>
          </div>
        </div>
        {slots.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            {summary?.message ?? 'Sem horários configurados para este dia.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {slots.map((s: any) => {
              const appt = appts.find((a: any) => {
                const t = new Date(a.scheduledAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
                return t === s.time;
              });
              return (
                <div
                  key={s.time}
                  className={`flex items-center px-4 py-2.5 gap-3 transition-colors
                    ${s.available ? 'cursor-pointer hover:bg-slate-50' : 'bg-slate-50/60'}`}
                  onClick={() => s.available && onSlotClick(s.time)}
                >
                  <span className="text-xs font-mono text-slate-500 w-12 flex-shrink-0">{s.time}</span>
                  {appt ? (
                    <div
                      className="flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-white text-xs cursor-pointer hover:opacity-90"
                      style={{ backgroundColor: appt.color || '#2563EB' }}
                      onClick={e => { e.stopPropagation(); onApptClick(appt); }}
                    >
                      <span className="font-semibold">{appt.patientName}</span>
                      <span className="opacity-80">· {appt.type}</span>
                      {appt.price && <span className="ml-auto opacity-80">R$ {Number(appt.price).toFixed(2)}</span>}
                    </div>
                  ) : (
                    <span className="text-xs text-green-500 font-medium">Disponível</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resumo do dia */}
      <div className="space-y-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Resumo</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Total slots</span>
              <span className="font-medium">{summary?.totalSlots ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Agendados</span>
              <span className="font-medium text-blue-600">{summary?.bookedSlots ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Livres</span>
              <span className="font-medium text-green-600">{summary?.freeSlots ?? 0}</span>
            </div>
            {summary?.totalSlots > 0 && (
              <div className="mt-2 bg-slate-100 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.round((summary.bookedSlots / summary.totalSlots) * 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {appts.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Consultas</p>
            {appts.map((a: any) => (
              <div
                key={a.id}
                className="flex items-start gap-2 mb-2 cursor-pointer group"
                onClick={() => onApptClick(a)}
              >
                <div className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: a.color }} />
                <div>
                  <p className="text-xs font-semibold text-slate-800 group-hover:text-blue-600">
                    {a.patientName}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(a.scheduledAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})} · {a.durationMinutes}min
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function AgendaPage() {
  const [view,      setView]      = useState<ViewMode>('week');
  const [current,   setCurrent]   = useState(new Date());
  const [appts,     setAppts]     = useState<any[]>([]);
  const [slots,     setSlots]     = useState<Record<string, any[]>>({});
  const [daySummary, setDaySummary] = useState<any>(null);
  const [patients,  setPatients]  = useState<any[]>([]);
  const [loading,   setLoading]   = useState(false);

  const [showNewModal,  setShowNewModal]  = useState(false);
  const [showWHModal,   setShowWHModal]   = useState(false);
  const [newDate,       setNewDate]       = useState('');
  const [newTime,       setNewTime]       = useState('');
  const [selectedAppt,  setSelectedAppt]  = useState<any>(null);

  // Carrega pacientes vinculados
  useEffect(() => {
    api.get('/doutor/patients').then(r => setPatients(r.data)).catch(() => {});
  }, []);

  // Range de datas conforme view
  const getRange = useCallback(() => {
    if (view === 'day') {
      const s = fmt(current);
      return { from: s + 'T00:00:00', to: s + 'T23:59:59' };
    }
    if (view === 'week') {
      const ws = startOfWeek(current);
      return { from: fmt(ws) + 'T00:00:00', to: fmt(addDays(ws, 6)) + 'T23:59:59' };
    }
    // month
    const m = current.getMonth(), y = current.getFullYear();
    return {
      from: new Date(y, m, 1).toISOString(),
      to:   new Date(y, m + 1, 0, 23, 59, 59).toISOString(),
    };
  }, [view, current]);

  const loadAppts = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = getRange();
      const r = await api.get('/doutor/agenda/appointments', { params: { from, to } });
      setAppts(r.data);
    } finally { setLoading(false); }
  }, [getRange]);

  const loadSlots = useCallback(async () => {
    if (view === 'day') {
      const dateStr = fmt(current);
      const r = await api.get('/doutor/agenda/day-summary', { params: { date: dateStr } });
      setDaySummary(r.data);
      return;
    }
    if (view === 'week') {
      const ws = startOfWeek(current);
      const promises = Array.from({ length: 7 }, (_, i) => {
        const d = fmt(addDays(ws, i));
        return api.get('/doutor/agenda/slots', { params: { date: d } })
          .then(r => ({ date: d, slots: r.data.slots ?? [] }))
          .catch(() => ({ date: d, slots: [] }));
      });
      const results = await Promise.all(promises);
      const map: Record<string, any[]> = {};
      results.forEach(r => { map[r.date] = r.slots; });
      setSlots(map);
    }
  }, [view, current]);

  useEffect(() => { loadAppts(); loadSlots(); }, [loadAppts, loadSlots]);

  const navigate = (dir: 1 | -1) => {
    const d = new Date(current);
    if (view === 'day')   d.setDate(d.getDate() + dir);
    if (view === 'week')  d.setDate(d.getDate() + dir * 7);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    setCurrent(d);
  };

  const handleSlotClick = (date: string, time: string) => {
    setNewDate(date); setNewTime(time); setShowNewModal(true);
  };

  const handleSaveAppt = async (data: any) => {
    await api.post('/doutor/agenda/appointments', data);
    setShowNewModal(false);
    loadAppts();
    loadSlots();
  };

  const handleCancelAppt = async (appt: any) => {
    if (!confirm('Cancelar esta consulta?')) return;
    await api.patch(`/doutor/agenda/appointments/${appt.id}`, { status: 'canceled' });
    setSelectedAppt(null);
    loadAppts(); loadSlots();
  };

  const titleLabel = () => {
    if (view === 'day')
      return current.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (view === 'week') {
      const ws = startOfWeek(current);
      const we = addDays(ws, 6);
      return `${ws.getDate()} ${MONTHS_PT[ws.getMonth()]} – ${we.getDate()} ${MONTHS_PT[we.getMonth()]} ${we.getFullYear()}`;
    }
    return `${MONTHS_PT[current.getMonth()]} ${current.getFullYear()}`;
  };

  return (
    <DoctorShell>
      <div className="p-6">
        {/* Cabeçalho */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Minha Agenda</h1>
            <p className="text-sm text-slate-500 mt-0.5">{titleLabel()}</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Navegação */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg">
              <button
                onClick={() => navigate(-1)}
                className="px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-l-lg transition-colors"
              >
                ‹
              </button>
              <button
                onClick={() => setCurrent(new Date())}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-blue-600 transition-colors"
              >
                Hoje
              </button>
              <button
                onClick={() => navigate(1)}
                className="px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-r-lg transition-colors"
              >
                ›
              </button>
            </div>

            {/* View */}
            <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
              {(['day','week','month'] as ViewMode[]).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    view === v ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {v === 'day' ? 'Dia' : v === 'week' ? 'Semana' : 'Mês'}
                </button>
              ))}
            </div>

            <button
              onClick={() => { setNewDate(fmt(current)); setNewTime('08:00'); setShowNewModal(true); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              + Agendar
            </button>

            <button
              onClick={() => setShowWHModal(true)}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-600 text-sm rounded-lg transition-colors"
            >
              ⚙ Horários
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        {loading && (
          <div className="text-center py-8 text-slate-400 text-sm">Carregando...</div>
        )}

        {!loading && view === 'day' && (
          <DayView
            date={current}
            summary={daySummary}
            onSlotClick={t => handleSlotClick(fmt(current), t)}
            onApptClick={setSelectedAppt}
          />
        )}

        {!loading && view === 'week' && (
          <WeekView
            weekStart={startOfWeek(current)}
            appointments={appts}
            slots={slots}
            onSlotClick={handleSlotClick}
            onApptClick={setSelectedAppt}
          />
        )}

        {!loading && view === 'month' && (
          <MonthView
            month={current.getMonth()}
            year={current.getFullYear()}
            appointments={appts}
            onDayClick={d => { setCurrent(new Date(d + 'T12:00:00')); setView('day'); }}
          />
        )}

        {/* Modal detalhe consulta */}
        {selectedAppt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelectedAppt(null)}>
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
              onClick={e => e.stopPropagation()}
            >
              <div
                className="w-full h-1.5 rounded-full mb-4"
                style={{ backgroundColor: selectedAppt.color || '#2563EB' }}
              />
              <h2 className="text-base font-bold text-slate-800 mb-1">{selectedAppt.patientName}</h2>
              <p className="text-xs text-slate-400 mb-4">
                {new Date(selectedAppt.scheduledAt).toLocaleString('pt-BR')} · {selectedAppt.durationMinutes}min · {selectedAppt.type}
              </p>
              <div className="space-y-2 text-sm">
                {selectedAppt.patientPhone && (
                  <p><span className="text-slate-500">Telefone:</span> {selectedAppt.patientPhone}</p>
                )}
                {selectedAppt.price && (
                  <p><span className="text-slate-500">Valor:</span> R$ {Number(selectedAppt.price).toFixed(2)}</p>
                )}
                {selectedAppt.paymentStatus && (
                  <p><span className="text-slate-500">Pagamento:</span> {
                    selectedAppt.paymentStatus === 'paid' ? 'Pago'
                    : selectedAppt.paymentStatus === 'insurance' ? 'Convênio' : 'Pendente'
                  }</p>
                )}
                {selectedAppt.notes && <p><span className="text-slate-500">Obs:</span> {selectedAppt.notes}</p>}
              </div>
              <div className="flex gap-2 mt-5">
                {selectedAppt.status !== 'canceled' && (
                  <>
                    <button
                      onClick={async () => {
                        await api.patch(`/doutor/agenda/appointments/${selectedAppt.id}`, { status: 'completed' });
                        setSelectedAppt(null); loadAppts(); loadSlots();
                      }}
                      className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg"
                    >
                      Realizada
                    </button>
                    <button
                      onClick={() => handleCancelAppt(selectedAppt)}
                      className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm rounded-lg border border-red-200"
                    >
                      Cancelar
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSelectedAppt(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 text-sm rounded-lg"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modais */}
      {showNewModal && (
        <ApptModal
          date={newDate}
          time={newTime}
          patients={patients}
          onClose={() => setShowNewModal(false)}
          onSave={handleSaveAppt}
        />
      )}
      {showWHModal && (
        <WorkingHoursModal
          onClose={() => setShowWHModal(false)}
          onSave={() => { loadAppts(); loadSlots(); }}
        />
      )}
    </DoctorShell>
  );
}
