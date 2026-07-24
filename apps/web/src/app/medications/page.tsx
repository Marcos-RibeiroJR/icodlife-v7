'use client';
// apps/web/src/app/medications/page.tsx
import { useState, useEffect, useRef } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { medicationsApi, catalogApi } from '../../lib/api';

type View = 'lista' | 'agenda';

const TODAY_DAYS = ['sun','mon','tue','wed','thu','fri','sat'] as const;
const TODAY_KEY  = TODAY_DAYS[new Date().getDay()];

function todayTaken(med: any, logs: any[]): string[] {
  const todayStr = new Date().toISOString().split('T')[0];
  return logs
    // Bug real encontrado: o log retornado pelo backend só tem `takenAt`
    // (não existe coluna `scheduledAt`) — usar `l.scheduledAt.slice(...)`
    // lançava TypeError (undefined) sempre que havia algum log de hoje,
    // quebrando a renderização da Agenda de hoje.
    .filter(l => l.medicationId === med.id && l.takenAt && l.takenAt.startsWith(todayStr))
    .map(l => l.takenAt.slice(11, 16));
}

export default function MedicationsPage() {
  const [meds, setMeds]       = useState<any[]>([]);
  const [logs, setLogs]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView]       = useState<View>('agenda');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [anvisaQ, setAnvisaQ] = useState('');
  const [anvisaSuggestions, setAnvisaSuggestions] = useState<string[]>([]);
  const [loadError, setLoadError] = useState('');
  const [error, setError]     = useState('');
  const anvisaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emptyForm = {
    name: '', dosage: '', times: '08:00',
    startDate: new Date().toISOString().split('T')[0],
    prescribingDoctor: '', notes: '',
    lastPurchaseDate: '', totalPills: '', remainingPills: '',
  };
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await medicationsApi.list();
      setMeds(data);
      // Carregar logs de hoje de todos os meds
      const allLogs: any[] = [];
      for (const m of data.filter((x: any) => x.isActive)) {
        try {
          const { data: adh } = await medicationsApi.getAdherence(m.id);
          allLogs.push(...adh);
        } catch {}
      }
      setLogs(allLogs);
    } catch (e: any) {
      setLoadError(e?.response?.data?.message ?? 'Erro ao carregar medicamentos.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Busca no catalogo real (base local ANVISA + consulta ao vivo), com debounce.
  useEffect(() => {
    if (anvisaTimer.current) clearTimeout(anvisaTimer.current);
    if (anvisaQ.trim().length < 2) { setAnvisaSuggestions([]); return; }
    anvisaTimer.current = setTimeout(() => {
      catalogApi.searchMedications(anvisaQ, 8)
        .then(({ data }) => setAnvisaSuggestions(data?.items ?? []))
        .catch(() => setAnvisaSuggestions([]));
    }, 300);
    return () => { if (anvisaTimer.current) clearTimeout(anvisaTimer.current); };
  }, [anvisaQ]);

  const save = async () => {
    if (!form.name) return;
    setSaving(true);
    setError('');
    try {
      await medicationsApi.create({
        ...form,
        frequency: { times: form.times.split(',').map(t => t.trim()), days: ['mon','tue','wed','thu','fri','sat','sun'] },
        startDate: form.startDate,
        lastPurchaseDate: form.lastPurchaseDate || undefined,
        totalPills:     form.totalPills     ? Number(form.totalPills)     : undefined,
        remainingPills: form.remainingPills ? Number(form.remainingPills) : undefined,
      });
      setShowForm(false);
      setForm(emptyForm);
      setAnvisaQ('');
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Erro ao salvar medicamento. Tente novamente.');
    } finally { setSaving(false); }
  };

  const markTaken = async (medId: string, time: string) => {
    const today = new Date().toISOString().split('T')[0];
    await medicationsApi.logTaken(medId, { scheduledAt: `${today}T${time}:00` });
    load();
  };

  const deactivate = async (id: string) => {
    if (!confirm('Desativar este medicamento?')) return;
    await medicationsApi.update(id, { isActive: false }); load();
  };

  // Agrupar por horário para a agenda
  type SlotMap = Record<string, { time: string; meds: Array<{ med: any; taken: boolean }> }>;
  const agendaSlots: SlotMap = {};
  meds.filter(m => m.isActive).forEach(m => {
    const times: string[] = m.frequency?.times ?? ['08:00'];
    const days: string[]  = m.frequency?.days  ?? ['mon','tue','wed','thu','fri','sat','sun'];
    if (!days.includes(TODAY_KEY)) return;
    times.forEach(t => {
      if (!agendaSlots[t]) agendaSlots[t] = { time: t, meds: [] };
      const taken = todayTaken(m, logs).includes(t);
      agendaSlots[t].meds.push({ med: m, taken });
    });
  });
  const sortedSlots = Object.values(agendaSlots).sort((a, b) => a.time.localeCompare(b.time));

  const activeMeds   = meds.filter(m => m.isActive);
  const inactiveMeds = meds.filter(m => !m.isActive);

  const stockColor = (rem: number, tot: number) => {
    const pct = tot > 0 ? rem / tot : 1;
    return pct <= 0.2 ? 'text-red-600' : pct <= 0.4 ? 'text-amber-600' : 'text-green-600';
  };

  return (
    <AppLayout>
      <div className="bg-[#7B1E1E] px-8 py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-white text-xl font-bold">Medicamentos</h1>
            <p className="text-white/50 text-sm mt-0.5">{activeMeds.length} ativo{activeMeds.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="bg-white/15 hover:bg-white/25 text-white font-semibold text-sm px-4 py-2 rounded-xl transition-colors">
            + Adicionar
          </button>
        </div>
      </div>

      <div className="p-8 max-w-4xl mx-auto space-y-5">
        {/* Tabs de view */}
        <div className="flex gap-2">
          {(['agenda', 'lista'] as View[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all
                ${view === v ? 'bg-[#B91C1C] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {v === 'agenda' ? '⏰ Agenda de hoje' : '📋 Todos os medicamentos'}
            </button>
          ))}
        </div>

        {loadError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between gap-3">
            <span>{loadError}</span>
            <button onClick={load} className="font-semibold underline flex-shrink-0">Tentar novamente</button>
          </div>
        )}

        {/* ── FORMULARIO ── */}
        {showForm && (
          <div className="card p-6 border-red-100">
            <h3 className="font-bold text-slate-800 mb-4">Novo medicamento</h3>

            {/* Busca ANVISA */}
            <div className="mb-4 relative">
              <label className="label">Buscar medicamento</label>
              <input className="input-field" placeholder="Digite o nome (ex: Losartana)"
                value={anvisaQ} onChange={e => { setAnvisaQ(e.target.value); setForm(f => ({ ...f, name: e.target.value })); }} />
              {anvisaSuggestions.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                  {anvisaSuggestions.map(s => (
                    <button key={s} className="w-full text-left px-4 py-2.5 text-sm hover:bg-red-50 transition-colors"
                      onClick={() => {
                        const parts = s.split(' ');
                        const dosage = parts[parts.length - 1];
                        setForm(f => ({ ...f, name: s, dosage }));
                        setAnvisaQ(s);
                        // close dropdown
                        setTimeout(() => setAnvisaQ(''), 100);
                      }}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Nome confirmado *</label>
                <input className="input-field" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome e dosagem" />
              </div>
              <div>
                <label className="label">Dosagem</label>
                <input className="input-field" value={form.dosage}
                  onChange={e => setForm(f => ({ ...f, dosage: e.target.value }))} placeholder="ex: 50mg" />
              </div>
              <div>
                <label className="label">Horarios (separar por virgula)</label>
                <input className="input-field" value={form.times}
                  onChange={e => setForm(f => ({ ...f, times: e.target.value }))} placeholder="07:00, 19:00" />
              </div>
              <div>
                <label className="label">Data de inicio</label>
                <input type="date" className="input-field" value={form.startDate}
                  onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div>
                <label className="label">Medico prescritor</label>
                <input className="input-field" value={form.prescribingDoctor}
                  onChange={e => setForm(f => ({ ...f, prescribingDoctor: e.target.value }))} placeholder="Dr. Nome" />
              </div>

              {/* Controle de estoque */}
              <div>
                <label className="label">Ultima compra</label>
                <input type="date" className="input-field" value={form.lastPurchaseDate}
                  onChange={e => setForm(f => ({ ...f, lastPurchaseDate: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Total de comprimidos</label>
                  <input type="number" className="input-field" value={form.totalPills}
                    onChange={e => setForm(f => ({ ...f, totalPills: e.target.value }))} placeholder="30" />
                </div>
                <div>
                  <label className="label">Restantes</label>
                  <input type="number" className="input-field" value={form.remainingPills}
                    onChange={e => setForm(f => ({ ...f, remainingPills: e.target.value }))} placeholder="30" />
                </div>
              </div>

              <div className="col-span-2">
                <label className="label">Observacoes</label>
                <textarea className="input-field" rows={2} value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Tomar com agua..." />
              </div>
            </div>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">{error}</div>
            )}

            <div className="flex gap-3 mt-4">
              <button onClick={() => { setShowForm(false); setForm(emptyForm); setAnvisaQ(''); setError(''); }}
                className="flex-1 border border-slate-200 text-slate-600 font-semibold py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={save} disabled={saving || !form.name}
                className="flex-1 bg-[#B91C1C] text-white font-semibold py-2.5 rounded-xl hover:bg-[#7B1E1E] transition-colors disabled:opacity-60">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        )}

        {loading && <div className="card p-8 text-center text-slate-400">Carregando...</div>}

        {/* ── AGENDA DE HOJE ── */}
        {!loading && view === 'agenda' && (
          <>
            {sortedSlots.length === 0 ? (
              <div className="card p-10 text-center">
                <div className="text-4xl mb-3">✅</div>
                <p className="text-slate-500 font-semibold">Nenhum medicamento agendado para hoje.</p>
                <p className="text-slate-400 text-sm mt-1">Adicione um medicamento para iniciar a agenda.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedSlots.map(slot => (
                  <div key={slot.time} className="card overflow-hidden">
                    <div className="bg-slate-50 border-b border-slate-100 px-5 py-3 flex items-center gap-2">
                      <span className="text-slate-500 text-lg">⏰</span>
                      <span className="font-bold text-slate-700 text-lg">{slot.time}</span>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {slot.meds.map(({ med, taken }) => (
                        <div key={med.id} className={`px-5 py-4 flex items-center justify-between gap-4 ${taken ? 'opacity-60' : ''}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${taken ? 'bg-green-50' : 'bg-amber-50'}`}>
                              {taken ? '✅' : '💊'}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-800">{med.name}</div>
                              <div className="text-xs text-slate-400">{med.dosage}</div>
                              {med.remainingPills != null && med.totalPills != null && (
                                <div className={`text-xs font-semibold mt-0.5 ${stockColor(med.remainingPills, med.totalPills)}`}>
                                  Estoque: {med.remainingPills}/{med.totalPills} comprimidos
                                  {med.remainingPills <= 5 && ' ⚠ Comprar em breve'}
                                </div>
                              )}
                            </div>
                          </div>
                          {!taken ? (
                            <button onClick={() => markTaken(med.id, slot.time)}
                              className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                              Tomei
                            </button>
                          ) : (
                            <span className="text-green-600 text-sm font-semibold">Tomado</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── LISTA COMPLETA ── */}
        {!loading && view === 'lista' && (
          <div className="space-y-4">
            {meds.length === 0 && (
              <div className="card p-10 text-center">
                <div className="text-4xl mb-3">💊</div>
                <p className="text-slate-400">Nenhum medicamento cadastrado.</p>
              </div>
            )}
            {activeMeds.map((m: any) => (
              <div key={m.id} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center text-2xl flex-shrink-0">💊</div>
                    <div>
                      <div className="font-bold text-slate-800">{m.name}</div>
                      <div className="text-sm text-slate-500">
                        {m.dosage && `${m.dosage} · `}
                        {m.frequency?.times?.join(', ')}
                      </div>
                      {m.prescribingDoctor && <div className="text-xs text-slate-400 mt-0.5">{m.prescribingDoctor}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs bg-green-50 text-green-700 font-semibold px-2 py-1 rounded-full">Ativo</span>
                    <button onClick={() => deactivate(m.id)} className="text-slate-300 hover:text-red-400 transition-colors text-lg">×</button>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                  {m.lastPurchaseDate && (
                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                      <div className="text-xs text-slate-400">Ultima compra</div>
                      <div className="text-sm font-semibold text-slate-700">
                        {new Date(m.lastPurchaseDate).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  )}
                  {m.remainingPills != null && m.totalPills != null && (
                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                      <div className="text-xs text-slate-400">Estoque</div>
                      <div className={`text-sm font-bold ${stockColor(m.remainingPills, m.totalPills)}`}>
                        {m.remainingPills}/{m.totalPills}
                      </div>
                    </div>
                  )}
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    <div className="text-xs text-slate-400">Inicio</div>
                    <div className="text-sm font-semibold text-slate-700">
                      {new Date(m.startDate).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>

                {m.notes && (
                  <div className="mt-3 text-sm text-slate-500 bg-slate-50 rounded-lg p-2.5">{m.notes}</div>
                )}
              </div>
            ))}

            {inactiveMeds.length > 0 && (
              <details className="card">
                <summary className="p-4 text-sm text-slate-500 cursor-pointer font-semibold hover:text-slate-700">
                  {inactiveMeds.length} medicamento{inactiveMeds.length > 1 ? 's' : ''} inativo{inactiveMeds.length > 1 ? 's' : ''}
                </summary>
                <div className="divide-y divide-slate-50 border-t border-slate-100">
                  {inactiveMeds.map((m: any) => (
                    <div key={m.id} className="p-4 flex items-center gap-3 opacity-50">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-base">💊</div>
                      <div>
                        <div className="text-sm font-semibold text-slate-600">{m.name}</div>
                        <div className="text-xs text-slate-400">{m.dosage}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
