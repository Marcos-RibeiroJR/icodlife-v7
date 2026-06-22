'use client';
// apps/web/src/app/appointments/page.tsx
import { useState, useEffect } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { appointmentsApi } from '../../lib/api';

export default function AppointmentsPage() {
  const [appts, setAppts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    doctorName:'', specialty:'', location:'', cnesCode:'',
    appointmentAt: '', notes:''
  });

  const load = async () => {
    setLoading(true);
    try { const { data } = await appointmentsApi.list(); setAppts(data); }
    catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.doctorName || !form.appointmentAt) return;
    setSaving(true);
    try {
      await appointmentsApi.create(form);
      setShowForm(false);
      setForm({ doctorName:'', specialty:'', location:'', cnesCode:'', appointmentAt:'', notes:'' });
      load();
    } catch {} finally { setSaving(false); }
  };

  const upcoming = appts.filter(a => new Date(a.appointmentAt) >= new Date());
  const past     = appts.filter(a => new Date(a.appointmentAt) <  new Date());

  return (
    <AppLayout>
      <div className="p-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-800">📅 Agenda de Consultas</h1>
          <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white font-semibold rounded-xl px-4 py-2.5 hover:bg-blue-700 transition-colors text-sm">
            + Agendar consulta
          </button>
        </div>

        {showForm && (
          <div className="card p-6 mb-6 border-blue-200">
            <h3 className="font-bold text-slate-800 mb-4">Nova consulta</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Médico *</label>
                <input className="input-field" value={form.doctorName} onChange={e => setForm(f=>({...f,doctorName:e.target.value}))} placeholder="Dr. Nome" />
              </div>
              <div>
                <label className="label">Especialidade</label>
                <input className="input-field" value={form.specialty} onChange={e => setForm(f=>({...f,specialty:e.target.value}))} placeholder="Cardiologia" />
              </div>
              <div>
                <label className="label">Data e hora *</label>
                <input type="datetime-local" className="input-field" value={form.appointmentAt} onChange={e => setForm(f=>({...f,appointmentAt:e.target.value}))} />
              </div>
              <div>
                <label className="label">Local</label>
                <input className="input-field" value={form.location} onChange={e => setForm(f=>({...f,location:e.target.value}))} placeholder="Clínica / Hospital" />
              </div>
              <div className="col-span-2">
                <label className="label">Observações</label>
                <textarea className="input-field" rows={2} value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} placeholder="Levar exames, receituários..." />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={save} disabled={saving} className="btn-primary flex-1">{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        )}

        {loading && <div className="card p-8 text-center text-slate-400">Carregando...</div>}

        {!loading && upcoming.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Próximas</h2>
            <div className="space-y-3">
              {upcoming.map((a: any) => (
                <div key={a.id} className="card p-5 border-l-4 border-blue-400">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl">👨‍⚕️</div>
                    <div className="flex-1">
                      <div className="font-bold text-slate-800">{a.doctorName}</div>
                      <div className="text-sm text-slate-500">{a.specialty}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-blue-600">
                        {new Date(a.appointmentAt).toLocaleDateString('pt-BR', { weekday:'short', day:'numeric', month:'short' })}
                      </div>
                      <div className="text-sm text-slate-400">
                        {new Date(a.appointmentAt).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}
                      </div>
                    </div>
                  </div>
                  {a.location && <div className="mt-2 text-sm text-slate-400">📍 {a.location}</div>}
                  {a.notes    && <div className="mt-1 text-sm text-slate-400">📝 {a.notes}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && past.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Histórico</h2>
            <div className="space-y-2">
              {past.map((a: any) => (
                <div key={a.id} className="card p-4 opacity-60 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-lg">👨‍⚕️</div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-slate-700">{a.doctorName}</div>
                    <div className="text-xs text-slate-400">{a.specialty} · {new Date(a.appointmentAt).toLocaleDateString('pt-BR')}</div>
                  </div>
                  <span className="badge-amber">Passada</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && appts.length === 0 && (
          <div className="card p-10 text-center">
            <div className="text-4xl mb-3">📅</div>
            <p className="text-slate-400">Nenhuma consulta agendada.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
