'use client';
// apps/clinica/src/app/agenda/page.tsx
// Agenda da Clínica — mesmo processo de criação de agenda do módulo Doutor,
// só que multi-médico: o admin da clínica cria/gerencia agendamentos de
// qualquer médico vinculado, com visão Dia / Semana / Mês / Ano.

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ClinicShell from '@/components/ui/ClinicShell';
import { clinicApi } from '@/lib/api';

type ViewMode = 'day' | 'week' | 'month' | 'year';

const DAYS_PT   = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MONTHS_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Agendado', completed: 'Concluído', canceled: 'Cancelado', no_show: 'Faltou',
};
const STATUS_RING: Record<string, string> = {
  scheduled: 'ring-blue-400', completed: 'ring-green-400',
  canceled: 'ring-red-300 opacity-50', no_show: 'ring-slate-300 opacity-50',
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
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function doctorLabel(d: any) {
  return d?.doctor?.user?.fullName ?? d?.user?.fullName ?? '—';
}

// ─── Modal Novo Agendamento (multi-médico) ────────────────────────────────────
function ApptModal({
  date, time, doctorId: defaultDoctorId, doctors, rooms, patients, onClose, onSave,
  initialPatientUserId, initialPatientName, initialPatientIcode, defaultType, linkNotice,
}: {
  date: string; time?: string; doctorId?: string;
  doctors: any[]; rooms: any[]; patients: any[];
  onClose: () => void; onSave: (data: any) => void;
  initialPatientUserId?: string; initialPatientName?: string; initialPatientIcode?: string;
  defaultType?: string; linkNotice?: string;
}) {
  const [form, setForm] = useState({
    doctorId:        defaultDoctorId || '',
    patientDoctorId: '',
    patientName:     initialPatientName || '',
    patientPhone:    '',
    patientIcode:    initialPatientIcode || '',
    scheduledAt:     `${date}T${time || '08:00'}`,
    durationMinutes: 30,
    type:            defaultType || 'consulta',
    roomId:          '',
    notes:           '',
    price:           '',
    paymentStatus:   'pending',
    color:           '#2563EB',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const patientsForDoctor = form.doctorId
    ? patients.filter((p: any) => (p.doctors ?? []).some((x: any) => x.doctorId === form.doctorId))
    : [];

  // Quando o médico é escolhido (ou já vem pré-selecionado) e há um paciente-alvo
  // vindo da tela de Pacientes, casa automaticamente o vínculo paciente-médico certo.
  useEffect(() => {
    if (!initialPatientUserId || !form.doctorId || form.patientDoctorId) return;
    const p = patientsForDoctor.find((x: any) => x.id === initialPatientUserId);
    const link = p?.doctors?.find((d: any) => d.doctorId === form.doctorId);
    if (link) {
      set('patientDoctorId', link.patientDoctorId);
      set('patientName', p.fullName ?? initialPatientName ?? '');
      set('patientIcode', p.icode ?? initialPatientIcode ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.doctorId, patientsForDoctor.length]);

  const save = async () => {
    if (!form.doctorId || !form.patientName.trim()) return;
    setSaving(true);
    try {
      await onSave({
        ...form,
        durationMinutes: Number(form.durationMinutes),
        price: form.price ? Number(form.price) : undefined,
        roomId: form.roomId || undefined,
      });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-800">Novo Agendamento</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        {linkNotice && (
          <div className="mb-4 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs px-3 py-2 rounded-lg">
            {linkNotice}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Médico *</label>
            <select
              value={form.doctorId}
              onChange={e => { set('doctorId', e.target.value); set('patientDoctorId', ''); }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">— Selecionar médico —</option>
              {doctors.map((d: any) => (
                <option key={d.doctorId} value={d.doctorId}>Dr(a). {doctorLabel(d)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Paciente *</label>
            {form.doctorId && patientsForDoctor.length > 0 && (
              <select
                value={form.patientDoctorId}
                onChange={e => {
                  const p = patientsForDoctor.find((x: any) => x.doctors.some((d: any) => d.patientDoctorId === e.target.value));
                  set('patientDoctorId', e.target.value);
                  if (p) { set('patientName', p.fullName ?? ''); set('patientIcode', p.icode ?? ''); }
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">— Selecionar paciente vinculado —</option>
                {patientsForDoctor.map((p: any) => {
                  const link = p.doctors.find((d: any) => d.doctorId === form.doctorId);
                  return (
                    <option key={link.patientDoctorId} value={link.patientDoctorId}>
                      {p.fullName} ({p.icode ?? 'sem código'})
                    </option>
                  );
                })}
              </select>
            )}
            <input
              value={form.patientName}
              onChange={e => set('patientName', e.target.value)}
              placeholder="Nome do paciente (ou externo)"
              className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Data e hora</label>
              <input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={e => set('scheduledAt', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Duração (min)</label>
              <select
                value={form.durationMinutes}
                onChange={e => set('durationMinutes', Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {[15, 20, 30, 45, 60, 90, 120].map(m => <option key={m} value={m}>{m} min</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
              <select
                value={form.type}
                onChange={e => set('type', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="consulta">Consulta</option>
                <option value="retorno">Retorno</option>
                <option value="exame">Exame</option>
                <option value="procedimento">Procedimento</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Sala</label>
              <select
                value={form.roomId}
                onChange={e => set('roomId', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">Sem sala fixa</option>
                {rooms.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Valor (R$)</label>
            <input
              type="number"
              value={form.price}
              onChange={e => set('price', e.target.value)}
              placeholder="0,00"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Observações</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              placeholder="Motivo da consulta, observações..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
            />
          </div>

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
            disabled={saving || !form.doctorId || !form.patientName.trim()}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? 'Salvando...' : 'Agendar'}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-600 text-sm rounded-lg transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── View: Semana ─────────────────────────────────────────────────────────────
function WeekView({
  weekStart, appointments, slots, showDoctorTag, onSlotClick, onApptClick,
}: {
  weekStart: Date; appointments: any[]; slots: Record<string, any[]>; showDoctorTag: boolean;
  onSlotClick: (date: string, time: string) => void; onApptClick: (appt: any) => void;
}) {
  const hours = Array.from({ length: 13 }, (_, i) => i + 7); // 07:00 – 19:00
  const days  = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  return (
    <div className="overflow-auto border border-slate-200 rounded-xl bg-white">
      <div className="grid grid-cols-8 border-b border-slate-200 sticky top-0 bg-white z-10">
        <div className="py-3 px-2 text-xs text-slate-400 border-r border-slate-100" />
        {days.map(d => (
          <div key={d.toISOString()} className={`py-3 text-center border-r border-slate-100 last:border-0 ${sameDay(d, today) ? 'bg-indigo-50' : ''}`}>
            <p className="text-xs text-slate-500">{DAYS_PT[d.getDay()]}</p>
            <p className={`text-lg font-bold mt-0.5 ${sameDay(d, today) ? 'text-indigo-600' : 'text-slate-800'}`}>{d.getDate()}</p>
          </div>
        ))}
      </div>

      {hours.map(h => (
        <div key={h} className="grid grid-cols-8 border-b border-slate-100 last:border-0">
          <div className="py-2 px-2 text-xs text-slate-400 border-r border-slate-100 text-right">
            {String(h).padStart(2, '0')}:00
          </div>
          {days.map(d => {
            const dateStr  = fmt(d);
            const daySlots = (slots[dateStr] ?? []).filter((s: any) => Number(s.time.split(':')[0]) === h);
            const dayAppts = appointments.filter(a => {
              const at = new Date(a.scheduledAt);
              return sameDay(at, d) && at.getHours() === h;
            });
            return (
              <div key={d.toISOString()}
                className={`relative min-h-[48px] border-r border-slate-100 last:border-0 p-0.5 group
                  ${sameDay(d, today) ? 'bg-indigo-50/40' : 'hover:bg-slate-50'}`}
                onClick={() => onSlotClick(dateStr, `${String(h).padStart(2,'0')}:00`)}
              >
                {dayAppts.map((a: any) => (
                  <div key={a.id}
                    onClick={e => { e.stopPropagation(); onApptClick(a); }}
                    className={`text-xs text-white px-1.5 py-1 rounded-md mb-0.5 cursor-pointer hover:opacity-90 transition-opacity ring-2 ${STATUS_RING[a.status] ?? 'ring-blue-400'}`}
                    style={{ backgroundColor: a.color || '#2563EB' }}
                  >
                    <p className="font-semibold truncate">{a.patientName}</p>
                    <p className="opacity-80 truncate">
                      {new Date(a.scheduledAt).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}
                      {showDoctorTag && <> · Dr(a). {doctorLabel(a)}</>}
                    </p>
                  </div>
                ))}
                {daySlots.map((s: any) => s.available && (
                  <div key={s.time} className="text-xs text-slate-400 opacity-0 group-hover:opacity-100 px-1">{s.time}</div>
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
  month, year, appointments, showDoctorTag, onDayClick,
}: {
  month: number; year: number; appointments: any[]; showDoctorTag: boolean; onDayClick: (date: string) => void;
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
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
        {DAYS_PT.map(d => <div key={d} className="py-2 text-center text-xs font-medium text-slate-500">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="min-h-[90px] border-r border-b border-slate-100 bg-slate-50/50 last:border-r-0" />;
          const dateStr  = fmt(d);
          const isToday  = sameDay(d, today);
          const dayAppts = apptsByDay[dateStr] ?? [];
          return (
            <div key={i} onClick={() => onDayClick(dateStr)}
              className={`min-h-[90px] border-r border-b border-slate-100 last:border-r-0 p-1.5 cursor-pointer transition-colors ${isToday ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
              <p className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-indigo-600 text-white' : 'text-slate-700'}`}>
                {d.getDate()}
              </p>
              {dayAppts.slice(0, 3).map((a: any, j: number) => (
                <div key={j} className="text-xs text-white px-1.5 py-0.5 rounded mb-0.5 truncate" style={{ backgroundColor: a.color || '#2563EB' }}>
                  {new Date(a.scheduledAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})} {a.patientName}
                  {showDoctorTag && ` · ${doctorLabel(a)}`}
                </div>
              ))}
              {dayAppts.length > 3 && <p className="text-xs text-slate-400 pl-1">+{dayAppts.length - 3}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── View: Ano ────────────────────────────────────────────────────────────────
function YearView({ year, countsByMonth, onMonthClick }: { year: number; countsByMonth: number[]; onMonthClick: (m: number) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {MONTHS_FULL.map((name, m) => (
        <button
          key={m}
          onClick={() => onMonthClick(m)}
          className="text-left bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
        >
          <p className="text-sm font-semibold text-slate-800">{name}</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{countsByMonth[m] ?? 0}</p>
          <p className="text-xs text-slate-400">agendamento{(countsByMonth[m] ?? 0) === 1 ? '' : 's'}</p>
        </button>
      ))}
    </div>
  );
}

// ─── View: Dia (médico específico selecionado) ────────────────────────────────
function DaySingleDoctorView({ date, summary, onSlotClick, onApptClick }: {
  date: Date; summary: any; onSlotClick: (time: string) => void; onApptClick: (appt: any) => void;
}) {
  const slots = summary?.slots ?? [];
  const appts = summary?.appointments ?? [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">
            {date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <div className="flex gap-3 text-xs text-slate-500">
            <span className="text-green-600 font-medium">{summary?.freeSlots ?? 0} livres</span>
            <span>·</span>
            <span className="text-indigo-600 font-medium">{summary?.bookedSlots ?? 0} agendados</span>
          </div>
        </div>
        {slots.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">{summary?.message ?? 'Sem horários configurados para este dia.'}</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {slots.map((s: any) => {
              const appt = appts.find((a: any) => {
                const t = new Date(a.scheduledAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
                return t === s.time;
              });
              return (
                <div key={s.time}
                  className={`flex items-center px-4 py-2.5 gap-3 transition-colors ${s.available ? 'cursor-pointer hover:bg-slate-50' : 'bg-slate-50/60'}`}
                  onClick={() => s.available && onSlotClick(s.time)}
                >
                  <span className="text-xs font-mono text-slate-500 w-12 flex-shrink-0">{s.time}</span>
                  {appt ? (
                    <div className="flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-white text-xs cursor-pointer hover:opacity-90"
                      style={{ backgroundColor: appt.color || '#2563EB' }}
                      onClick={e => { e.stopPropagation(); onApptClick(appt); }}
                    >
                      <span className="font-semibold">{appt.patientName}</span>
                      <span className="opacity-80">· {appt.type}</span>
                      {appt.room?.name && <span className="opacity-80">· {appt.room.name}</span>}
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

      <div className="space-y-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Resumo</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Total slots</span><span className="font-medium">{summary?.totalSlots ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Agendados</span><span className="font-medium text-indigo-600">{summary?.bookedSlots ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Livres</span><span className="font-medium text-green-600">{summary?.freeSlots ?? 0}</span></div>
            {summary?.totalSlots > 0 && (
              <div className="mt-2 bg-slate-100 rounded-full h-2">
                <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${Math.round((summary.bookedSlots / summary.totalSlots) * 100)}%` }} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── View: Dia (todos os médicos — swimlanes por médico) ──────────────────────
function DayAllDoctorsView({ date, doctors, appointments, onAddFor, onApptClick }: {
  date: Date; doctors: any[]; appointments: any[];
  onAddFor: (doctorId: string) => void; onApptClick: (appt: any) => void;
}) {
  if (doctors.length === 0) {
    return <div className="p-8 text-center text-slate-400 text-sm bg-white border border-slate-200 rounded-xl">Nenhum médico vinculado à clínica ainda.</div>;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {doctors.map((d: any) => {
        const dayAppts = appointments
          .filter((a: any) => a.doctorId === d.doctorId)
          .sort((a: any, b: any) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
        return (
          <div key={d.doctorId} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800 truncate">Dr(a). {doctorLabel(d)}</p>
              <button onClick={() => onAddFor(d.doctorId)} className="text-xs text-indigo-600 hover:underline flex-shrink-0">+ Agendar</button>
            </div>
            {dayAppts.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-xs">Sem agendamentos neste dia.</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {dayAppts.map((a: any) => (
                  <div key={a.id} onClick={() => onApptClick(a)}
                    className="flex items-center gap-2 px-4 py-2.5 cursor-pointer hover:bg-slate-50">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: a.color || '#2563EB' }} />
                    <span className="text-xs font-mono text-slate-500 w-11 flex-shrink-0">
                      {new Date(a.scheduledAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
                    </span>
                    <span className="text-xs text-slate-800 font-medium truncate flex-1">{a.patientName}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${a.status === 'canceled' ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-600'}`}>
                      {STATUS_LABEL[a.status] ?? a.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function AgendaPage() {
  return (
    <Suspense fallback={<ClinicShell><div className="p-8 text-center text-slate-400 text-sm">Carregando...</div></ClinicShell>}>
      <AgendaPageInner />
    </Suspense>
  );
}

function AgendaPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [view, setView]         = useState<ViewMode>('week');
  const [current, setCurrent]   = useState(new Date());
  const [doctorFilter, setDoctorFilter] = useState('');
  const [roomFilter, setRoomFilter]     = useState('');

  const [doctors, setDoctors]   = useState<any[]>([]);
  const [rooms, setRooms]       = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);

  const [appts, setAppts]       = useState<any[]>([]);
  const [slots, setSlots]       = useState<Record<string, any[]>>({});
  const [daySummary, setDaySummary] = useState<any>(null);
  const [yearAppts, setYearAppts]   = useState<any[]>([]);

  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const [showNewModal, setShowNewModal] = useState(false);
  const [newDate, setNewDate]           = useState('');
  const [newTime, setNewTime]           = useState('');
  const [newDoctorId, setNewDoctorId]   = useState('');
  const [newType, setNewType]           = useState('');
  const [selectedAppt, setSelectedAppt] = useState<any>(null);

  // paciente vindo do botão "Gerar Consulta" da tela de Pacientes
  const [deepLinkPatient, setDeepLinkPatient] = useState<{ userId?: string; name?: string; icode?: string } | null>(null);

  // dados-base
  useEffect(() => {
    clinicApi.listDoctors().then(r => setDoctors(r.data)).catch(() => {});
    clinicApi.listRooms().then(r => setRooms(r.data)).catch(() => {});
    clinicApi.listPatients().then(r => setPatients(r.data)).catch(() => {});
  }, []);

  const getRange = useCallback(() => {
    if (view === 'day') {
      const s = fmt(current);
      return { from: s + 'T00:00:00', to: s + 'T23:59:59' };
    }
    if (view === 'week') {
      const ws = startOfWeek(current);
      return { from: fmt(ws) + 'T00:00:00', to: fmt(addDays(ws, 6)) + 'T23:59:59' };
    }
    if (view === 'month') {
      const m = current.getMonth(), y = current.getFullYear();
      return { from: new Date(y, m, 1).toISOString(), to: new Date(y, m + 1, 0, 23, 59, 59).toISOString() };
    }
    // year
    const y = current.getFullYear();
    return { from: new Date(y, 0, 1).toISOString(), to: new Date(y, 11, 31, 23, 59, 59).toISOString() };
  }, [view, current]);

  const loadAppts = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { from, to } = getRange();
      const r = await clinicApi.listAgenda({ from, to, doctorId: doctorFilter || undefined, roomId: roomFilter || undefined });
      if (view === 'year') setYearAppts(r.data); else setAppts(r.data);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao carregar agenda');
    } finally { setLoading(false); }
  }, [getRange, view, doctorFilter, roomFilter]);

  const loadSlots = useCallback(async () => {
    if (!doctorFilter) { setDaySummary(null); setSlots({}); return; }
    if (view === 'day') {
      const dateStr = fmt(current);
      try {
        const r = await clinicApi.getDoctorDaySummary({ doctorId: doctorFilter, date: dateStr });
        setDaySummary(r.data);
      } catch { setDaySummary(null); }
      return;
    }
    if (view === 'week') {
      const ws = startOfWeek(current);
      const promises = Array.from({ length: 7 }, (_, i) => {
        const d = fmt(addDays(ws, i));
        return clinicApi.getDoctorSlots({ doctorId: doctorFilter, date: d })
          .then(r => ({ date: d, slots: r.data.slots ?? [] }))
          .catch(() => ({ date: d, slots: [] }));
      });
      const results = await Promise.all(promises);
      const map: Record<string, any[]> = {};
      results.forEach(r => { map[r.date] = r.slots; });
      setSlots(map);
    }
  }, [view, current, doctorFilter]);

  useEffect(() => { loadAppts(); }, [loadAppts]);
  useEffect(() => { loadSlots(); }, [loadSlots]);

  const navigate = (dir: 1 | -1) => {
    const d = new Date(current);
    if (view === 'day')   d.setDate(d.getDate() + dir);
    if (view === 'week')  d.setDate(d.getDate() + dir * 7);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    if (view === 'year')  d.setFullYear(d.getFullYear() + dir);
    setCurrent(d);
  };

  const openNewModal = (date: string, time: string, forDoctorId?: string, clearDeepLink = true) => {
    setNewDate(date); setNewTime(time); setNewDoctorId(forDoctorId || doctorFilter || '');
    if (clearDeepLink) { setDeepLinkPatient(null); setNewType(''); }
    setShowNewModal(true);
  };

  // Chegou aqui pelo botão "Gerar Consulta" da tela de Pacientes — abre o modal
  // já com paciente (e médico, se só houver um vínculo) pré-selecionados.
  useEffect(() => {
    const pUserId = searchParams.get('newPatientUserId');
    if (pUserId) {
      setDeepLinkPatient({
        userId: pUserId,
        name:   searchParams.get('newPatientName') || '',
        icode:  searchParams.get('newPatientIcode') || '',
      });
      setNewType(searchParams.get('newType') || '');
      openNewModal(fmt(new Date()), '08:00', searchParams.get('newDoctorId') || '', false);
      router.replace('/agenda');
      return;
    }
    // Chegou aqui pelo botão "Ver agenda" da tela de Salas — filtra por essa sala.
    const roomId = searchParams.get('roomId');
    if (roomId) {
      setRoomFilter(roomId);
      router.replace('/agenda');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveAppt = async (data: any) => {
    await clinicApi.createAppointment(data);
    setShowNewModal(false);
    loadAppts(); loadSlots();
  };

  const handleCancelAppt = async (appt: any) => {
    if (!confirm('Cancelar este agendamento?')) return;
    await clinicApi.cancelAppointment(appt.id);
    setSelectedAppt(null);
    loadAppts(); loadSlots();
  };

  const handleComplete = async (appt: any) => {
    await clinicApi.updateAppointment(appt.id, { status: 'completed' });
    setSelectedAppt(null);
    loadAppts(); loadSlots();
  };

  const countsByMonth = Array.from({ length: 12 }, (_, m) =>
    yearAppts.filter((a: any) => new Date(a.scheduledAt).getMonth() === m).length
  );

  const titleLabel = () => {
    if (view === 'day')
      return current.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (view === 'week') {
      const ws = startOfWeek(current);
      const we = addDays(ws, 6);
      return `${ws.getDate()} ${MONTHS_PT[ws.getMonth()]} – ${we.getDate()} ${MONTHS_PT[we.getMonth()]} ${we.getFullYear()}`;
    }
    if (view === 'month') return `${MONTHS_PT[current.getMonth()]} ${current.getFullYear()}`;
    return `${current.getFullYear()}`;
  };

  return (
    <ClinicShell>
      <div className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Agenda</h1>
            <p className="text-sm text-slate-500 mt-0.5">{titleLabel()}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select value={doctorFilter} onChange={e => setDoctorFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Todos os médicos</option>
              {doctors.map((d: any) => (
                <option key={d.doctorId} value={d.doctorId}>Dr(a). {doctorLabel(d)}</option>
              ))}
            </select>

            <select value={roomFilter} onChange={e => setRoomFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Todas as salas</option>
              {rooms.map((r: any) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>

            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg">
              <button onClick={() => navigate(-1)} className="px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-l-lg transition-colors">‹</button>
              <button onClick={() => setCurrent(new Date())} className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-indigo-600 transition-colors">Hoje</button>
              <button onClick={() => navigate(1)} className="px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-r-lg transition-colors">›</button>
            </div>

            <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
              {(['day','week','month','year'] as ViewMode[]).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${view === v ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {v === 'day' ? 'Dia' : v === 'week' ? 'Semana' : v === 'month' ? 'Mês' : 'Ano'}
                </button>
              ))}
            </div>

            <button
              onClick={() => openNewModal(fmt(current), '08:00')}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              + Agendar
            </button>
          </div>
        </div>

        {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}

        {loading && <div className="text-center py-8 text-slate-400 text-sm">Carregando...</div>}

        {!loading && view === 'day' && (
          doctorFilter ? (
            <DaySingleDoctorView
              date={current}
              summary={daySummary}
              onSlotClick={t => openNewModal(fmt(current), t, doctorFilter)}
              onApptClick={setSelectedAppt}
            />
          ) : (
            <DayAllDoctorsView
              date={current}
              doctors={doctors}
              appointments={appts}
              onAddFor={(docId) => openNewModal(fmt(current), '08:00', docId)}
              onApptClick={setSelectedAppt}
            />
          )
        )}

        {!loading && view === 'week' && (
          <WeekView
            weekStart={startOfWeek(current)}
            appointments={appts}
            slots={slots}
            showDoctorTag={!doctorFilter}
            onSlotClick={(d, t) => openNewModal(d, t)}
            onApptClick={setSelectedAppt}
          />
        )}

        {!loading && view === 'month' && (
          <MonthView
            month={current.getMonth()}
            year={current.getFullYear()}
            appointments={appts}
            showDoctorTag={!doctorFilter}
            onDayClick={d => { setCurrent(new Date(d + 'T12:00:00')); setView('day'); }}
          />
        )}

        {!loading && view === 'year' && (
          <YearView
            year={current.getFullYear()}
            countsByMonth={countsByMonth}
            onMonthClick={m => { setCurrent(new Date(current.getFullYear(), m, 1)); setView('month'); }}
          />
        )}

        {selectedAppt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelectedAppt(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
              <div className="w-full h-1.5 rounded-full mb-4" style={{ backgroundColor: selectedAppt.color || '#2563EB' }} />
              <h2 className="text-base font-bold text-slate-800 mb-1">{selectedAppt.patientName}</h2>
              <p className="text-xs text-slate-400 mb-1">
                Dr(a). {doctorLabel(selectedAppt)}
              </p>
              <p className="text-xs text-slate-400 mb-4">
                {new Date(selectedAppt.scheduledAt).toLocaleString('pt-BR')} · {selectedAppt.durationMinutes}min · {selectedAppt.type}
              </p>
              <div className="space-y-2 text-sm">
                {selectedAppt.patientPhone && <p><span className="text-slate-500">Telefone:</span> {selectedAppt.patientPhone}</p>}
                {selectedAppt.room?.name && <p><span className="text-slate-500">Sala:</span> {selectedAppt.room.name}</p>}
                {selectedAppt.price && <p><span className="text-slate-500">Valor:</span> R$ {Number(selectedAppt.price).toFixed(2)}</p>}
                {selectedAppt.paymentStatus && (
                  <p><span className="text-slate-500">Pagamento:</span> {
                    selectedAppt.paymentStatus === 'paid' ? 'Pago' : selectedAppt.paymentStatus === 'insurance' ? 'Convênio' : 'Pendente'
                  }</p>
                )}
                {selectedAppt.notes && <p><span className="text-slate-500">Obs:</span> {selectedAppt.notes}</p>}
              </div>
              <div className="flex gap-2 mt-5">
                {selectedAppt.status !== 'canceled' && (
                  <>
                    <button onClick={() => handleComplete(selectedAppt)} className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg">Realizada</button>
                    <button onClick={() => handleCancelAppt(selectedAppt)} className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm rounded-lg border border-red-200">Cancelar</button>
                  </>
                )}
                <button onClick={() => setSelectedAppt(null)} className="px-4 py-2 border border-slate-300 text-slate-600 text-sm rounded-lg">Fechar</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showNewModal && (
        <ApptModal
          date={newDate}
          time={newTime}
          doctorId={newDoctorId}
          doctors={doctors}
          rooms={rooms}
          patients={patients}
          onClose={() => setShowNewModal(false)}
          onSave={handleSaveAppt}
          initialPatientUserId={deepLinkPatient?.userId}
          initialPatientName={deepLinkPatient?.name}
          initialPatientIcode={deepLinkPatient?.icode}
          defaultType={newType || undefined}
          linkNotice={deepLinkPatient
            ? 'Consulta vinculada a este paciente. Depois de realizada, emita o ASO no painel do médico responsável (módulo ASO), já com o paciente e a empresa vinculados.'
            : undefined}
        />
      )}
    </ClinicShell>
  );
}
