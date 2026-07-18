'use client';
// apps/web/src/app/vida/page.tsx
import { useEffect, useState } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { lifestyleApi } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';

const BMI_LABEL: Record<string, { label: string; color: string }> = {
  underweight: { label: 'Abaixo do peso', color: 'text-cyan-600' },
  normal:      { label: 'Peso normal',    color: 'text-green-600' },
  overweight:  { label: 'Sobrepeso',      color: 'text-amber-600' },
  obese_1:     { label: 'Obesidade Grau I',   color: 'text-orange-600' },
  obese_2:     { label: 'Obesidade Grau II',  color: 'text-red-600' },
  obese_3:     { label: 'Obesidade Grau III', color: 'text-red-800' },
};

const SCORE_LABEL = (s: number) =>
  s >= 85 ? { label: 'Excelente', color: 'text-green-600' } :
  s >= 70 ? { label: 'Bom',       color: 'text-green-500' } :
  s >= 55 ? { label: 'Regular',   color: 'text-amber-600' } :
  s >= 40 ? { label: 'Ruim',      color: 'text-orange-600' } :
            { label: 'Critico',   color: 'text-red-700' };

function bpClass(s: number, d: number) {
  if (s >= 180 || d >= 110) return { label: 'Hipertensao Grave', color: 'text-red-700',   bg: 'bg-red-50 border-red-200' };
  if (s >= 140 || d >= 90)  return { label: 'Hipertensao',       color: 'text-red-600',   bg: 'bg-red-50 border-red-200' };
  if (s >= 130 || d >= 80)  return { label: 'PA Elevada',         color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' };
  return { label: 'Normal', color: 'text-green-600', bg: 'bg-green-50 border-green-200' };
}

function waistRisk(waist: number, gender: string) {
  if (gender === 'female') {
    if (waist >= 88) return { label: 'Risco Alto',     color: 'text-red-600' };
    if (waist >= 80) return { label: 'Risco Moderado', color: 'text-amber-600' };
  } else {
    if (waist >= 102) return { label: 'Risco Alto',     color: 'text-red-600' };
    if (waist >=  94) return { label: 'Risco Moderado', color: 'text-amber-600' };
  }
  return { label: 'Normal', color: 'text-green-600' };
}

const BT_LABEL: Record<string, string> = {
  A_PLUS:'A+', A_MINUS:'A-', B_PLUS:'B+', B_MINUS:'B-',
  AB_PLUS:'AB+', AB_MINUS:'AB-', O_PLUS:'O+', O_MINUS:'O-', unknown:'?',
};

type Tab = 'biometria' | 'habitos' | 'emocional' | 'trabalho' | 'alimentacao';

export default function VidaPage() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm]       = useState<any>({});
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [tab, setTab]         = useState<Tab>('biometria');
  const [error, setError]     = useState('');
  const [revisitDismissed, setRevisitDismissed] = useState(false);

  useEffect(() => {
    lifestyleApi.get().then(r => {
      setProfile(r.data); setForm(r.data ?? {});
    }).catch(() => setForm({}));
  }, []);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      const r = await lifestyleApi.upsert(form);
      setProfile(r.data); setForm(r.data);
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Erro ao salvar. Reinicie a API após atualizar o código e tente novamente.');
    } finally { setSaving(false); }
  };

  const bmiVal = form.heightCm && form.weightKg
    ? (Number(form.weightKg) / Math.pow(Number(form.heightCm) / 100, 2)).toFixed(1) : null;

  const bmiCat = bmiVal ? (
    Number(bmiVal) < 18.5 ? 'underweight' :
    Number(bmiVal) < 25   ? 'normal' :
    Number(bmiVal) < 30   ? 'overweight' :
    Number(bmiVal) < 35   ? 'obese_1' :
    Number(bmiVal) < 40   ? 'obese_2' : 'obese_3'
  ) : null;

  const bp = (form.systolicBp && form.diastolicBp)
    ? bpClass(Number(form.systolicBp), Number(form.diastolicBp)) : null;

  const bloodType = user?.bloodType ? (BT_LABEL[user.bloodType] ?? user.bloodType) : null;

  const lastCollected = profile?.updatedAt ? new Date(profile.updatedAt) : null;
  const daysSince = lastCollected ? Math.floor((Date.now() - lastCollected.getTime()) / 86400000) : null;
  const needsRevisit = !!profile && (daysSince === null || daysSince >= 30);

  const TABS: { id: Tab; icon: string; label: string }[] = [
    { id: 'biometria',   icon: '⚖️',  label: 'Biometria' },
    { id: 'habitos',     icon: '🏃',  label: 'Habitos' },
    { id: 'emocional',   icon: '🧠',  label: 'Saude Emocional' },
    { id: 'trabalho',    icon: '💼',  label: 'Trabalho' },
    { id: 'alimentacao', icon: '🥗',  label: 'Alimentacao' },
  ];

  return (
    <AppLayout>
      <div className="bg-[#7B1E1E] px-8 py-6">
        <div className="flex items-start justify-between max-w-4xl mx-auto">
          <div>
            <h1 className="text-white text-2xl font-bold">Modulo Vida</h1>
            <p className="text-white/55 text-sm mt-1">Seu estilo de vida interpretado pela IA</p>
          </div>
          <div className="flex items-center gap-3">
            {bloodType && bloodType !== '?' && (
              <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
                <div className="text-white text-xl font-bold">{bloodType}</div>
                <div className="text-white/40 text-[10px]">Tipo Sanguineo</div>
              </div>
            )}
            {profile?.healthScore != null && (
              <div className="bg-white/10 rounded-2xl px-5 py-3 text-center">
                <div className="text-white text-3xl font-bold">{profile.healthScore}</div>
                <div className="text-white/70 text-sm font-semibold">{SCORE_LABEL(profile.healthScore).label}</div>
                <div className="text-white/40 text-[10px]">Score de Saude</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-8 max-w-4xl mx-auto space-y-6">
        {/* Lembrete mensal de revisão */}
        {needsRevisit && !revisitDismissed && (
          <div className="rounded-2xl p-4 border border-amber-200 bg-amber-50 flex items-start gap-3">
            <span className="text-2xl">🔔</span>
            <div className="flex-1">
              <div className="font-bold text-amber-800 text-sm">Hora de revisar seus dados de estilo de vida</div>
              <div className="text-amber-700 text-xs mt-0.5">
                {lastCollected
                  ? `Última coleta em ${lastCollected.toLocaleDateString('pt-BR')} (${daysSince} dias atrás). Recomendamos revisar mensalmente — esses dados são critérios centrais da sua avaliação de risco.`
                  : 'Você ainda não preencheu seus dados. Eles são critérios centrais da sua avaliação de risco.'}
              </div>
            </div>
            <button onClick={() => setRevisitDismissed(true)} className="text-amber-400 hover:text-amber-600 text-lg leading-none">✕</button>
          </div>
        )}

        {/* Cards resumo */}
        {profile && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {bmiVal && (
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold text-slate-800">{bmiVal}</div>
                <div className={`text-xs font-semibold mt-1 ${BMI_LABEL[bmiCat!]?.color}`}>
                  {BMI_LABEL[bmiCat!]?.label}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">IMC</div>
              </div>
            )}
            {profile.systolicBp && profile.diastolicBp && (
              <div className="card p-4 text-center">
                <div className="text-xl font-bold text-slate-800">{profile.systolicBp}/{profile.diastolicBp}</div>
                <div className={`text-xs font-semibold mt-1 ${bpClass(profile.systolicBp, profile.diastolicBp).color}`}>
                  {bpClass(profile.systolicBp, profile.diastolicBp).label}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Pressao (mmHg)</div>
              </div>
            )}
            {profile.smokingStatus && profile.smokingStatus !== 'never' && (
              <div className="card p-4 text-center">
                <div className="text-2xl">🚬</div>
                <div className="text-xs font-semibold text-slate-700 mt-1">
                  {{ former: 'Ex-fumante', occasional: 'Ocasional', daily: 'Fumante' }[profile.smokingStatus as string]}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Tabagismo</div>
              </div>
            )}
            {profile.stressLevel != null && (
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold text-slate-800">{profile.stressLevel}/10</div>
                <div className="text-xs font-semibold text-slate-700 mt-1">
                  {profile.stressLevel >= 8 ? '🔴 Alto' : profile.stressLevel >= 5 ? '🟡 Medio' : '🟢 Baixo'}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Estresse</div>
              </div>
            )}
          </div>
        )}

        {profile?.healthScoreNotes && (
          <div className={`rounded-2xl p-4 border text-sm ${
            profile.healthScore >= 70 ? 'bg-green-50 border-green-200 text-green-800' :
            profile.healthScore >= 50 ? 'bg-amber-50 border-amber-200 text-amber-800' :
                                        'bg-red-50 border-red-200 text-red-800'
          }`}>{profile.healthScoreNotes}</div>
        )}

        <div className="card overflow-hidden">
          <div className="flex border-b border-slate-100 overflow-x-auto">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-3 text-sm font-semibold transition-all
                  ${tab === t.id ? 'border-b-2 border-red-600 text-red-700' : 'text-slate-500 hover:text-slate-700'}`}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {tab === 'biometria' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="label">Altura (cm)</label>
                    <input type="number" className="input-field" placeholder="170"
                      value={form.heightCm ?? ''} onChange={e => set('heightCm', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Peso (kg)</label>
                    <input type="number" step="0.1" className="input-field" placeholder="70"
                      value={form.weightKg ?? ''} onChange={e => set('weightKg', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Cintura (cm)</label>
                    <input type="number" step="0.5" className="input-field" placeholder="88"
                      value={form.waistCm ?? ''} onChange={e => set('waistCm', e.target.value)} />
                    {form.waistCm && user?.gender && (
                      <div className={`text-xs mt-1 font-semibold ${waistRisk(Number(form.waistCm), user.gender).color}`}>
                        {waistRisk(Number(form.waistCm), user.gender).label}
                        <span className="font-normal text-slate-400 ml-1">
                          (ref: {user.gender === 'female' ? '<80cm' : '<94cm'})
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {bmiVal && bmiCat && (
                  <div className="bg-red-50 rounded-xl p-4 flex items-center gap-4">
                    <div className="text-4xl font-bold text-[#7B1E1E]">{bmiVal}</div>
                    <div>
                      <div className="font-semibold text-slate-800">IMC Calculado</div>
                      <div className={`text-sm font-semibold ${BMI_LABEL[bmiCat].color}`}>{BMI_LABEL[bmiCat].label}</div>
                      <div className="text-xs text-slate-500">Referencia OMS: 18.5 a 24.9</div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="label">Pressao Arterial (mmHg)</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <input type="number" className="input-field" placeholder="Sistolica ex: 120"
                        value={form.systolicBp ?? ''} onChange={e => set('systolicBp', e.target.value)} />
                      <div className="text-[11px] text-slate-400 mt-1">Sistolica</div>
                    </div>
                    <div>
                      <input type="number" className="input-field" placeholder="Diastolica ex: 80"
                        value={form.diastolicBp ?? ''} onChange={e => set('diastolicBp', e.target.value)} />
                      <div className="text-[11px] text-slate-400 mt-1">Diastolica</div>
                    </div>
                  </div>
                  {bp && (
                    <div className={`mt-3 rounded-xl p-3 border text-sm font-semibold ${bp.bg} ${bp.color}`}>
                      PA {form.systolicBp}/{form.diastolicBp} mmHg — {bp.label}
                      <span className="font-normal text-slate-500 ml-2 text-xs">Ref. normal: menos de 120/80 mmHg (SBC 2020)</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'habitos' && (
              <div className="space-y-5">
                <div>
                  <label className="label">Tabagismo</label>
                  <select className="input-field" value={form.smokingStatus ?? 'never'} onChange={e => set('smokingStatus', e.target.value)}>
                    <option value="never">Nunca fumei</option>
                    <option value="former">Ex-fumante</option>
                    <option value="occasional">Fumante ocasional</option>
                    <option value="daily">Fumante diario</option>
                  </select>
                </div>
                {form.smokingStatus === 'former' && (
                  <div>
                    <label className="label">Data de cessacao</label>
                    <input type="date" className="input-field"
                      value={form.quitDate ? form.quitDate.split('T')[0] : ''}
                      onChange={e => set('quitDate', e.target.value)} />
                  </div>
                )}
                {(form.smokingStatus === 'occasional' || form.smokingStatus === 'daily') && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Cigarros por dia</label>
                      <input type="number" className="input-field" value={form.cigarettesPerDay ?? ''} onChange={e => set('cigarettesPerDay', e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Anos fumando</label>
                      <input type="number" className="input-field" value={form.smokingYears ?? ''} onChange={e => set('smokingYears', e.target.value)} />
                    </div>
                  </div>
                )}
                <div>
                  <label className="label">Alcool</label>
                  <select className="input-field" value={form.alcoholStatus ?? 'none'} onChange={e => set('alcoholStatus', e.target.value)}>
                    <option value="none">Nao bebo</option>
                    <option value="occasional">Ocasionalmente</option>
                    <option value="weekly">Semanalmente</option>
                    <option value="daily">Diariamente</option>
                  </select>
                </div>
                <div>
                  <label className="label">Frequencia de exercicios</label>
                  <select className="input-field" value={form.exerciseFrequency ?? ''} onChange={e => set('exerciseFrequency', e.target.value)}>
                    <option value="">Selecionar...</option>
                    <option value="sedentary">Sedentario (nunca)</option>
                    <option value="1-2x">1 a 2x por semana</option>
                    <option value="3-4x">3 a 4x por semana</option>
                    <option value="5+x">5 ou mais vezes por semana</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Horas de sono por noite</label>
                    <input type="number" step="0.5" min="3" max="12" className="input-field" placeholder="7.5"
                      value={form.sleepHoursAvg ?? ''} onChange={e => set('sleepHoursAvg', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Qualidade do sono (1 a 5)</label>
                    <input type="range" min="1" max="5" className="w-full mt-2"
                      value={form.sleepQuality ?? 3} onChange={e => set('sleepQuality', Number(e.target.value))} />
                    <div className="text-xs text-slate-500 text-center mt-1">
                      {['', 'Muito ruim', 'Ruim', 'Regular', 'Boa', 'Excelente'][form.sleepQuality ?? 3]}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'emocional' && (
              <div className="space-y-5">
                <div>
                  <label className="label">Nivel de estresse (1 = baixo, 10 = muito alto)</label>
                  <input type="range" min="1" max="10" className="w-full"
                    value={form.stressLevel ?? 5} onChange={e => set('stressLevel', Number(e.target.value))} />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>Baixo (1)</span>
                    <span className="font-semibold text-slate-700">{form.stressLevel ?? 5}</span>
                    <span>Muito alto (10)</span>
                  </div>
                </div>
                <div>
                  <label className="label">Humor medio (1 a 10)</label>
                  <input type="range" min="1" max="10" className="w-full"
                    value={form.moodAvg ?? 7} onChange={e => set('moodAvg', Number(e.target.value))} />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>Deprimido (1)</span>
                    <span className="font-semibold text-slate-700">{form.moodAvg ?? 7}</span>
                    <span>Muito bem (10)</span>
                  </div>
                </div>
                <div>
                  <label className="label">Acompanhamento psicologico</label>
                  <select className="input-field" value={form.therapyFrequency ?? ''} onChange={e => set('therapyFrequency', e.target.value)}>
                    <option value="">Nao faco acompanhamento</option>
                    <option value="weekly">Semanal</option>
                    <option value="biweekly">Quinzenal</option>
                    <option value="monthly">Mensal</option>
                    <option value="sporadic">Esporadico</option>
                  </select>
                </div>
                <div>
                  <label className="label">Saude sexual ativa</label>
                  <div className="flex gap-3">
                    {['Sim', 'Nao'].map(v => (
                      <button key={v} type="button"
                        onClick={() => set('sexuallyActive', v === 'Sim')}
                        className={`flex-1 py-2 rounded-xl font-semibold text-sm border transition-all
                          ${form.sexuallyActive === (v === 'Sim')
                            ? 'bg-red-700 text-white border-red-700'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-red-200'}`}>{v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === 'trabalho' && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Horas de trabalho por semana</label>
                    <input type="number" className="input-field" placeholder="40"
                      value={form.workHoursPerWeek ?? ''} onChange={e => set('workHoursPerWeek', e.target.value)} />
                    {Number(form.workHoursPerWeek) > 44 && (
                      <div className="text-xs text-amber-600 mt-1">Acima do limite legal (44h/sem)</div>
                    )}
                  </div>
                  <div>
                    <label className="label">Ambiente de trabalho</label>
                    <select className="input-field" value={form.workEnvironment ?? ''} onChange={e => set('workEnvironment', e.target.value)}>
                      <option value="">Selecionar...</option>
                      <option value="office">Escritorio</option>
                      <option value="remote">Remoto / Home office</option>
                      <option value="field">Campo / Externo</option>
                      <option value="industrial">Industrial / Fabrica</option>
                      <option value="health">Saude / Hospital</option>
                      <option value="other">Outro</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Risco ergonomico (1 = baixo, 5 = alto)</label>
                  <input type="range" min="1" max="5" className="w-full"
                    value={form.ergonomicRisk ?? 2} onChange={e => set('ergonomicRisk', Number(e.target.value))} />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>Baixo</span><span className="font-semibold">{form.ergonomicRisk ?? 2}</span><span>Alto</span>
                  </div>
                </div>
                <div>
                  <label className="label">Exposicao a agentes quimicos / fisicos nocivos</label>
                  <div className="flex gap-3">
                    {['Sim', 'Nao'].map(v => (
                      <button key={v} type="button"
                        onClick={() => set('occupationalChemicals', v === 'Sim')}
                        className={`flex-1 py-2 rounded-xl font-semibold text-sm border transition-all
                          ${form.occupationalChemicals === (v === 'Sim')
                            ? 'bg-red-700 text-white border-red-700'
                            : 'bg-white text-slate-600 border-slate-200'}`}>{v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === 'alimentacao' && (
              <div className="space-y-5">
                <div>
                  <label className="label">Tipo de dieta</label>
                  <select className="input-field" value={form.dietType ?? ''} onChange={e => set('dietType', e.target.value)}>
                    <option value="">Selecionar...</option>
                    <option value="omnivore">Onivoro</option>
                    <option value="vegetarian">Vegetariano</option>
                    <option value="vegan">Vegano</option>
                    <option value="keto">Cetogenica</option>
                    <option value="mediterranean">Mediterranea</option>
                    <option value="other">Outro</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Refeicoes por dia</label>
                    <input type="number" min="1" max="8" className="input-field" placeholder="3"
                      value={form.mealsPerDay ?? ''} onChange={e => set('mealsPerDay', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Agua (litros/dia)</label>
                    <input type="number" step="0.1" min="0" max="10" className="input-field" placeholder="2.0"
                      value={form.waterLitersDay ?? ''} onChange={e => set('waterLitersDay', e.target.value)} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="px-6 pb-5 border-t border-slate-50 pt-4">
            {error && (
              <div className="mb-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                ⚠️ {error}
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="text-xs">
                {saved
                  ? <span className="text-green-600 font-semibold">Dados salvos com sucesso!</span>
                  : lastCollected
                    ? <span className="text-slate-400">Última coleta: {lastCollected.toLocaleDateString('pt-BR')}</span>
                    : <span />}
              </div>
              <button onClick={handleSave} disabled={saving}
                className="bg-[#B91C1C] hover:bg-[#7B1E1E] text-white font-bold px-8 py-2.5 rounded-xl transition-colors text-sm disabled:opacity-60">
                {saving ? 'Salvando...' : 'Salvar dados'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
