'use client';
// apps/web/src/app/menstrual/page.tsx
import { useState, useEffect } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { menstrualApi } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { useRouter } from 'next/navigation';

const SYMPTOMS = ['Cólica','Dor de cabeça','Inchaço','Fadiga','Náusea','Dor nas costas','Sensibilidade nos seios','Acne'];
const MOODS    = ['Normal','Irritada','Ansiosa','Triste','Feliz','Energizada','Cansada','Sensível'];
const MUCUS    = ['Seco','Pastoso','Cremoso','Aquoso','Clara de ovo'];

const PHASE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  menstrual:  { bg: 'bg-red-400',    text: 'text-white',   dot: 'bg-red-400' },
  follicular: { bg: 'bg-green-400',  text: 'text-white',   dot: 'bg-green-400' },
  ovulation:  { bg: 'bg-pink-500',   text: 'text-white',   dot: 'bg-pink-500' },
  luteal:     { bg: 'bg-purple-400', text: 'text-white',   dot: 'bg-purple-400' },
  predicted:  { bg: '',              text: 'text-red-400', dot: 'bg-red-300' },
};

const PHASE_LABELS: Record<string, string> = {
  menstrual: '🩸 Menstrual', follicular: '🌱 Folicular', ovulation: '🌸 Ovulação', luteal: '🌙 Lútea', predicted: '🔮 Previsto',
};

function buildCalendarDays(year: number, month: number, cycles: any[], dailyLogs: any[]) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const phaseMap: Record<string, string> = {};
  const logMap: Record<string, any> = {};

  for (const log of dailyLogs) {
    const d = new Date(log.loggedDate);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    logMap[key] = log;
  }

  for (const cycle of cycles) {
    const start = new Date(cycle.cycleStart);
    const periodLen = cycle.periodLength || 5;
    const cycleLen = cycle.cycleLength || 28;
    const ovDay = Math.round(cycleLen / 2) - 1;

    for (let d = 0; d < cycleLen; d++) {
      const date = new Date(start);
      date.setDate(start.getDate() + d);
      const key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
      let phase: string;
      if (d < periodLen) phase = 'menstrual';
      else if (d < ovDay - 1) phase = 'follicular';
      else if (d <= ovDay + 1) phase = 'ovulation';
      else phase = 'luteal';
      phaseMap[key] = phase;
    }

    if (cycle.nextCyclePredicted) {
      const pred = new Date(cycle.nextCyclePredicted);
      for (let d = 0; d < (cycle.periodLength || 5); d++) {
        const date = new Date(pred);
        date.setDate(pred.getDate() + d);
        if (date >= today) {
          const key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
          if (!phaseMap[key]) phaseMap[key] = 'predicted';
        }
      }
    }
  }

  return { firstDay, daysInMonth, phaseMap, logMap };
}

export default function MenstrualPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [tab, setTab] = useState<'dashboard'|'log'|'calendar'|'stats'>('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [calendar, setCalendar] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [logForm, setLogForm] = useState({
    loggedDate: new Date().toISOString().split('T')[0],
    flowIntensity: 0, symptoms: [] as string[],
    mood: [] as string[], basalTemp: '', cervicalMucus: '', notes: '',
  });
  const [logSaved, setLogSaved] = useState(false);
  const [showStartCycle, setShowStartCycle] = useState(false);
  const [cycleForm, setCycleForm] = useState({ cycleStart: new Date().toISOString().split('T')[0], flowIntensity: 3, notes: '' });

  const now = new Date();
  const [calYear, setCalYear]     = useState(now.getFullYear());
  const [calMonth, setCalMonth]   = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    if (user && !['female','other'].includes(user.gender)) { router.push('/dashboard'); return; }
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([menstrualApi.getStats(), menstrualApi.getCalendar()]);
      setStats(s.data); setCalendar(c.data);
    } catch {} finally { setLoading(false); }
  };

  const toggleItem = (arr: string[], item: string): string[] =>
    arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];

  const saveLog = async () => {
    try {
      await menstrualApi.logDay({ ...logForm, basalTemp: logForm.basalTemp ? parseFloat(logForm.basalTemp) : undefined });
      setLogSaved(true); loadData();
      setTimeout(() => setLogSaved(false), 3000);
    } catch {}
  };

  const startCycle = async () => {
    await menstrualApi.startCycle(cycleForm);
    setShowStartCycle(false); loadData();
  };

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
    setSelectedDay(null);
  };

  const phaseCardColor: Record<string, string> = {
    menstrual: 'bg-red-50 text-red-700 border-red-200',
    follicular: 'bg-green-50 text-green-700 border-green-200',
    ovulation: 'bg-pink-50 text-pink-700 border-pink-200',
    luteal: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  const TABS = [
    { id:'dashboard', label:'📊 Resumo' },
    { id:'log',       label:'📝 Registrar' },
    { id:'calendar',  label:'📅 Calendário' },
    { id:'stats',     label:'📈 Histórico' },
  ];

  const renderCalendar = () => {
    if (!calendar) return <div className="card p-8 text-center text-slate-400">Carregando...</div>;
    const { firstDay, daysInMonth, phaseMap, logMap } = buildCalendarDays(
      calYear, calMonth, calendar.cycles || [], calendar.dailyLogs || []
    );
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const WEEK_DAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const selectedLog = selectedDay ? logMap[selectedDay] : null;
    const selectedPhase = selectedDay ? phaseMap[selectedDay] : null;

    return (
      <div className="card p-5">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 text-lg font-bold">‹</button>
          <div className="font-bold text-slate-800 text-base">{MONTH_NAMES[calMonth]} {calYear}</div>
          <button onClick={nextMonth} className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 text-lg font-bold">›</button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {WEEK_DAYS.map(d => (
            <div key={d} className="text-center text-[10px] font-semibold text-slate-400 py-1">{d}</div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, i) => {
            if (!day) return <div key={`e-${i}`} />;
            const key = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const phase = phaseMap[key];
            const log = logMap[key];
            const isToday = key === todayKey;
            const isSelected = key === selectedDay;
            const isPredicted = phase === 'predicted';
            const pc = phase ? PHASE_COLORS[phase] : null;

            return (
              <div key={key}
                className={`rounded-lg p-0.5 min-h-[2.8rem] flex flex-col items-center justify-start cursor-pointer transition-all
                  ${isSelected ? 'ring-2 ring-pink-500 ring-offset-1' : 'hover:ring-2 hover:ring-pink-200 hover:ring-offset-1'}`}
                onClick={() => setSelectedDay(key === selectedDay ? null : key)}>
                {/* Day number circle */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all
                  ${isPredicted
                    ? 'border-2 border-dashed border-red-300 text-red-400'
                    : pc
                      ? `${pc.bg} ${pc.text}`
                      : isToday
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-500'
                  }`}>
                  {day}
                </div>
                {/* Symptom dots */}
                {log?.symptoms?.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {(log.symptoms as string[]).slice(0, 3).map((_: string, idx: number) => (
                      <div key={idx} className="w-1 h-1 rounded-full bg-amber-400" />
                    ))}
                  </div>
                )}
                {/* Flow bar */}
                {log?.flowIntensity > 0 && (
                  <div className="flex gap-px mt-0.5">
                    {[1,2,3].map(n => (
                      <div key={n} className={`w-1 h-1 rounded-sm ${n <= Math.ceil(log.flowIntensity / 2) ? 'bg-red-500' : 'bg-transparent'}`} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-3">
          {(['menstrual','follicular','ovulation','luteal'] as const).map(p => (
            <div key={p} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-full ${PHASE_COLORS[p].dot}`} />
              <span className="text-[11px] text-slate-500">{PHASE_LABELS[p]?.replace(/\S+\s/,'')}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full border-2 border-dashed border-red-300" />
            <span className="text-[11px] text-slate-500">Previsto</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-[11px] text-slate-500">Sintomas</span>
          </div>
        </div>

        {/* Selected day detail */}
        {selectedDay && (
          <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="font-semibold text-slate-800 text-sm mb-2 flex items-center gap-2 flex-wrap">
              {new Date(selectedDay + 'T12:00:00').toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' })}
              {selectedPhase && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                  ${selectedPhase === 'menstrual' ? 'bg-red-100 text-red-700' :
                    selectedPhase === 'follicular' ? 'bg-green-100 text-green-700' :
                    selectedPhase === 'ovulation' ? 'bg-pink-100 text-pink-700' :
                    selectedPhase === 'luteal' ? 'bg-purple-100 text-purple-700' :
                    'bg-slate-100 text-slate-600'}`}>
                  {PHASE_LABELS[selectedPhase]}
                </span>
              )}
            </div>
            {selectedLog ? (
              <div className="space-y-1 text-sm text-slate-600">
                {selectedLog.flowIntensity > 0 && <div>🩸 Fluxo: {selectedLog.flowIntensity}/5</div>}
                {selectedLog.symptoms?.length > 0 && <div>⚠️ Sintomas: {(selectedLog.symptoms as string[]).join(', ')}</div>}
                {selectedLog.mood?.length > 0 && <div>💭 Humor: {(selectedLog.mood as string[]).join(', ')}</div>}
                {selectedLog.basalTemp && <div>🌡️ Temperatura: {selectedLog.basalTemp}°C</div>}
                {selectedLog.cervicalMucus && <div>💧 Muco: {selectedLog.cervicalMucus}</div>}
                {selectedLog.notes && <div>📝 {selectedLog.notes}</div>}
              </div>
            ) : (
              <div className="text-sm text-slate-400">
                Nenhum registro neste dia.
                <button
                  onClick={() => { setLogForm(f => ({ ...f, loggedDate: selectedDay })); setTab('log'); }}
                  className="ml-2 text-pink-600 font-semibold hover:text-pink-700">
                  Registrar agora →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">🌸 Ciclo Menstrual</h1>
            <p className="text-slate-500 text-sm mt-1">Acompanhe seu ciclo, sintomas e previsões.</p>
          </div>
          <button onClick={() => setShowStartCycle(true)}
            className="bg-pink-600 text-white font-semibold rounded-xl px-4 py-2.5 hover:bg-pink-700 transition-colors text-sm">
            + Iniciar novo ciclo
          </button>
        </div>

        {showStartCycle && (
          <div className="card p-5 mb-6 border-pink-200 bg-pink-50">
            <h3 className="font-bold text-pink-800 mb-3">Iniciar novo ciclo menstrual</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="label">Data de início</label>
                <input type="date" className="input-field" value={cycleForm.cycleStart}
                  onChange={e => setCycleForm(f => ({ ...f, cycleStart: e.target.value }))} />
              </div>
              <div>
                <label className="label">Intensidade do fluxo</label>
                <div className="flex gap-1 mt-1">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} type="button" onClick={() => setCycleForm(f => ({ ...f, flowIntensity: n }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-all
                        ${cycleForm.flowIntensity >= n ? 'border-pink-400 bg-pink-400 text-white' : 'border-slate-200 text-slate-400'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowStartCycle(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={startCycle} className="flex-1 bg-pink-600 text-white font-semibold rounded-xl px-4 py-2.5 hover:bg-pink-700 transition-colors">
                Registrar início
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition-all
                ${tab === t.id ? 'bg-white shadow text-pink-700' : 'text-slate-500 hover:text-slate-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* DASHBOARD */}
        {tab === 'dashboard' && stats && (
          <div className="space-y-4">
            {stats.currentPhase && (
              <div className={`rounded-2xl p-5 border ${phaseCardColor[stats.currentPhase] || 'bg-slate-50 border-slate-200'}`}>
                <div className="text-lg font-bold">{PHASE_LABELS[stats.currentPhase]}</div>
                {stats.daysUntilNextCycle !== null && (
                  <div className="text-sm mt-1 opacity-80">
                    {stats.daysUntilNextCycle > 0
                      ? `Próximo ciclo em ~${stats.daysUntilNextCycle} dias`
                      : 'Próximo ciclo previsto para hoje ou em breve'}
                  </div>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="card p-4">
                <div className="text-3xl font-bold text-pink-600">{stats.averageCycleLength}</div>
                <div className="text-sm text-slate-500">Dias de ciclo (média)</div>
              </div>
              <div className="card p-4">
                <div className="text-3xl font-bold text-pink-600">{stats.averagePeriodLength}</div>
                <div className="text-sm text-slate-500">Dias de menstruação (média)</div>
              </div>
              {stats.nextCyclePredicted && (
                <div className="card p-4">
                  <div className="text-sm font-bold text-slate-600">Próximo ciclo</div>
                  <div className="text-lg font-semibold text-pink-600 mt-1">
                    {new Date(stats.nextCyclePredicted).toLocaleDateString('pt-BR', { day:'2-digit', month:'long' })}
                  </div>
                </div>
              )}
              {stats.ovulationPredicted && (
                <div className="card p-4">
                  <div className="text-sm font-bold text-slate-600">Ovulação prevista</div>
                  <div className="text-lg font-semibold text-pink-600 mt-1">
                    {new Date(stats.ovulationPredicted).toLocaleDateString('pt-BR', { day:'2-digit', month:'long' })}
                  </div>
                </div>
              )}
            </div>
            {stats.topSymptoms?.length > 0 && (
              <div className="card p-4">
                <div className="text-sm font-bold text-slate-700 mb-3">Sintomas mais frequentes</div>
                <div className="space-y-2">
                  {stats.topSymptoms.map((s: any) => (
                    <div key={s.symptom} className="flex items-center gap-2">
                      <div className="text-sm text-slate-600 w-40">{s.symptom}</div>
                      <div className="flex-1 bg-slate-100 rounded-full h-2">
                        <div className="bg-pink-400 h-2 rounded-full" style={{ width: `${Math.min(100, s.count * 20)}%` }} />
                      </div>
                      <div className="text-xs text-slate-400">{s.count}x</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => setTab('calendar')}
              className="w-full card p-4 flex items-center justify-between hover:bg-pink-50 transition-colors group">
              <span className="text-sm font-semibold text-slate-700">📅 Ver calendário visual</span>
              <span className="text-pink-500 group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>
        )}

        {/* LOG DIÁRIO */}
        {tab === 'log' && (
          <div className="card p-6 space-y-5">
            <div>
              <label className="label">Data</label>
              <input type="date" className="input-field max-w-xs" value={logForm.loggedDate}
                onChange={e => setLogForm(f => ({ ...f, loggedDate: e.target.value }))} />
            </div>
            <div>
              <label className="label">Intensidade do fluxo</label>
              <div className="flex gap-2">
                {[0,1,2,3,4,5].map(n => (
                  <button key={n} type="button" onClick={() => setLogForm(f => ({ ...f, flowIntensity: n }))}
                    className={`w-10 h-10 rounded-lg text-sm font-bold border-2 transition-all
                      ${logForm.flowIntensity === n ? 'border-pink-400 bg-pink-400 text-white' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                    {n === 0 ? '–' : n}
                  </button>
                ))}
                <span className="self-center text-xs text-slate-400 ml-1">0 = sem fluxo</span>
              </div>
            </div>
            <div>
              <label className="label">Sintomas</label>
              <div className="flex flex-wrap gap-2">
                {SYMPTOMS.map(s => (
                  <button key={s} type="button" onClick={() => setLogForm(f => ({ ...f, symptoms: toggleItem(f.symptoms, s) }))}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all
                      ${logForm.symptoms.includes(s) ? 'border-pink-400 bg-pink-50 text-pink-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Humor</label>
              <div className="flex flex-wrap gap-2">
                {MOODS.map(m => (
                  <button key={m} type="button" onClick={() => setLogForm(f => ({ ...f, mood: toggleItem(f.mood, m) }))}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all
                      ${logForm.mood.includes(m) ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Temperatura basal (°C)</label>
                <input type="number" step="0.1" className="input-field" value={logForm.basalTemp}
                  onChange={e => setLogForm(f => ({ ...f, basalTemp: e.target.value }))} placeholder="36.5" />
              </div>
              <div>
                <label className="label">Muco cervical</label>
                <select className="input-field" value={logForm.cervicalMucus}
                  onChange={e => setLogForm(f => ({ ...f, cervicalMucus: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {MUCUS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Anotações</label>
              <textarea className="input-field" rows={3} value={logForm.notes}
                onChange={e => setLogForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Como você se sentiu hoje?" />
            </div>
            {logSaved && <div className="bg-green-50 text-green-700 rounded-xl p-3 text-sm">✓ Registro salvo!</div>}
            <button onClick={saveLog} className="btn-primary">Salvar registro do dia</button>
          </div>
        )}

        {/* CALENDÁRIO VISUAL */}
        {tab === 'calendar' && renderCalendar()}

        {/* HISTÓRICO */}
        {tab === 'stats' && stats && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold text-pink-600">{stats.cycles?.length ?? 0}</div>
                <div className="text-xs text-slate-500 mt-1">Ciclos registrados</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.averageCycleLength ?? '—'}</div>
                <div className="text-xs text-slate-500 mt-1">Média de dias</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold text-red-500">{stats.averagePeriodLength ?? '—'}</div>
                <div className="text-xs text-slate-500 mt-1">Dias de fluxo</div>
              </div>
            </div>

            <div className="card">
              <div className="p-4 border-b border-slate-100">
                <div className="text-sm font-bold text-slate-700">Histórico de ciclos</div>
              </div>
              <div className="divide-y divide-slate-50">
                {(!stats.cycles || stats.cycles.length === 0) && (
                  <p className="text-slate-400 text-sm text-center py-6">Nenhum ciclo registrado ainda.</p>
                )}
                {stats.cycles?.map((c: any, i: number) => (
                  <div key={c.id} className="flex items-center gap-3 p-4">
                    <span className="text-slate-400 text-sm w-5 text-right">{stats.cycles.length - i}</span>
                    <div className="w-2 h-2 rounded-full bg-pink-400 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-700">
                        {new Date(c.cycleStart).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' })}
                      </div>
                      {c.nextCyclePredicted && (
                        <div className="text-xs text-slate-400">
                          Próx. previsto: {new Date(c.nextCyclePredicted).toLocaleDateString('pt-BR', { day:'2-digit', month:'short' })}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      {c.cycleLength && <div className="text-sm font-semibold text-slate-600">{c.cycleLength} dias</div>}
                      {c.flowIntensity && (
                        <div className="flex gap-0.5 justify-end mt-1">
                          {[1,2,3,4,5].map(n => (
                            <div key={n} className={`w-2 h-3 rounded-sm ${n <= c.flowIntensity ? 'bg-red-400' : 'bg-slate-200'}`} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {stats.cycles?.length >= 3 && (() => {
              const lens: number[] = stats.cycles.filter((c: any) => c.cycleLength).map((c: any) => c.cycleLength as number);
              if (lens.length < 2) return null;
              const variability = Math.max(...lens) - Math.min(...lens);
              return (
                <div className={`card p-4 border ${variability <= 3 ? 'border-green-200 bg-green-50' : variability <= 7 ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50'}`}>
                  <div className="text-sm font-bold text-slate-700">📏 Regularidade do ciclo</div>
                  <div className={`text-2xl font-bold mt-1 ${variability <= 3 ? 'text-green-600' : variability <= 7 ? 'text-amber-600' : 'text-red-600'}`}>
                    ±{variability} dias
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {variability <= 3 ? 'Ciclo regular ✓' : variability <= 7 ? 'Variação moderada' : 'Ciclo irregular — considere consultar ginecologista'}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
