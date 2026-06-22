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
      await menstrualApi.logDay({
        ...logForm,
        basalTemp: logForm.basalTemp ? parseFloat(logForm.basalTemp) : undefined,
      });
      setLogSaved(true);
      setTimeout(() => setLogSaved(false), 3000);
    } catch {}
  };

  const startCycle = async () => {
    await menstrualApi.startCycle(cycleForm);
    setShowStartCycle(false);
    loadData();
  };

  const phaseLabel: Record<string, string> = {
    menstrual: '🩸 Fase Menstrual', follicular: '🌱 Fase Folicular',
    ovulation: '🌸 Ovulação', luteal: '🌙 Fase Lútea',
  };
  const phaseColor: Record<string, string> = {
    menstrual: 'bg-red-50 text-red-700 border-red-200',
    follicular: 'bg-green-50 text-green-700 border-green-200',
    ovulation: 'bg-pink-50 text-pink-700 border-pink-200',
    luteal: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  const TABS = [
    { id:'dashboard', label:'📊 Resumo' },
    { id:'log',       label:'📝 Registrar dia' },
    { id:'calendar',  label:'📅 Calendário' },
    { id:'stats',     label:'📈 Estatísticas' },
  ];

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

        {/* Iniciar ciclo modal */}
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

        {/* Tabs */}
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
              <div className={`rounded-2xl p-5 border ${phaseColor[stats.currentPhase] || 'bg-slate-50 border-slate-200'}`}>
                <div className="text-lg font-bold">{phaseLabel[stats.currentPhase]}</div>
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
                      <div className="text-sm text-slate-600 w-32">{s.symptom}</div>
                      <div className="flex-1 bg-slate-100 rounded-full h-2">
                        <div className="bg-pink-400 h-2 rounded-full" style={{ width: `${Math.min(100, s.count * 20)}%` }} />
                      </div>
                      <div className="text-xs text-slate-400">{s.count}x</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

        {/* CALENDAR */}
        {tab === 'calendar' && calendar && (
          <div className="card p-5">
            <div className="text-sm font-bold text-slate-700 mb-4">Últimos 3 meses</div>
            <div className="space-y-3">
              {calendar.cycles?.map((c: any) => (
                <div key={c.id} className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                  <span className="text-xl">🩸</span>
                  <div>
                    <div className="text-sm font-semibold text-red-700">
                      Ciclo iniciado: {new Date(c.cycleStart).toLocaleDateString('pt-BR')}
                    </div>
                    {c.nextCyclePredicted && (
                      <div className="text-xs text-red-500">
                        Próximo previsto: {new Date(c.nextCyclePredicted).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {calendar.cycles?.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-6">Nenhum ciclo registrado ainda.</p>
              )}
            </div>
          </div>
        )}

        {/* STATS */}
        {tab === 'stats' && stats && (
          <div className="card p-5">
            <div className="text-sm font-bold text-slate-700 mb-4">Histórico de ciclos</div>
            <div className="space-y-2">
              {stats.cycles?.map((c: any, i: number) => (
                <div key={c.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 text-sm w-4">{i+1}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-700">
                      {new Date(c.cycleStart).toLocaleDateString('pt-BR')}
                    </div>
                    {c.cycleLength && <div className="text-xs text-slate-400">{c.cycleLength} dias</div>}
                  </div>
                  {c.flowIntensity && (
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(n => (
                        <div key={n} className={`w-2 h-4 rounded-sm ${n <= c.flowIntensity ? 'bg-pink-400' : 'bg-slate-200'}`} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
