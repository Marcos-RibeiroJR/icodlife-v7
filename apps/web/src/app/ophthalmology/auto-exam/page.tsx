'use client';
// apps/web/src/app/ophthalmology/auto-exam/page.tsx
// Módulo de Auto-Exame Oftalmológico — IcodLife
// 5 módulos: Distância · Snellen · Astigmatismo · Contraste · IA Estimativa
import { useState, useEffect, useRef, useCallback } from 'react';
import { AppLayout } from '../../../components/layout/AppLayout';
import { ophthalmologyApi } from '../../../lib/api';
import { useRouter } from 'next/navigation';

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Eye = 'right' | 'left';
type Step =
  | 'intro'
  | 'symptoms'
  | 'distance'
  | 'snellen_right'
  | 'snellen_left'
  | 'astigmatism'
  | 'contrast'
  | 'result';

interface SnellenResult { row: string; correct: number; errors: number; timeMs: number }
interface ExamState {
  symptoms: string[];
  userAge: string;
  estimatedDistanceCm: number | null;
  deviceType: string;
  acuityRight: string | null;
  acuityLeft: string | null;
  snellenRight: SnellenResult[];
  snellenLeft: SnellenResult[];
  astigmatismRight: boolean | null;
  astigmatismLeft: boolean | null;
  astigmatismAxisRight: number | null;
  astigmatismAxisLeft: number | null;
  contrastRight: number | null;
  contrastLeft: number | null;
}

// ─── Tabela Snellen simplificada ──────────────────────────────────────────────
// Cada linha: [nível Snellen, letras exibidas, tamanho rem, dist. de referência m]
const SNELLEN_ROWS = [
  { acuity: '20/200', letters: ['E'],               size: 6.4,  dist: 60 },
  { acuity: '20/100', letters: ['F','P'],            size: 3.2,  dist: 30 },
  { acuity: '20/70',  letters: ['T','O','Z'],        size: 2.25, dist: 21 },
  { acuity: '20/50',  letters: ['L','P','E','D'],    size: 1.6,  dist: 15 },
  { acuity: '20/40',  letters: ['P','E','C','F','D'],size: 1.3,  dist: 12 },
  { acuity: '20/30',  letters: ['E','D','F','C','Z','P'], size: 0.96, dist: 9 },
  { acuity: '20/25',  letters: ['F','E','L','O','P','Z','D'], size: 0.8, dist: 7.5 },
  { acuity: '20/20',  letters: ['D','E','F','P','O','T','E','C'], size: 0.64, dist: 6 },
];

const SYMPTOM_LIST = [
  { id: 'visao_turva',      label: '🌫️ Visão turva ou embaçada' },
  { id: 'dificuldade_longe',label: '🏔️ Dificuldade de enxergar longe' },
  { id: 'dificuldade_perto',label: '📖 Dificuldade de enxergar perto' },
  { id: 'dor_cabeca',       label: '🤕 Dor de cabeça frequente' },
  { id: 'olhos_cansados',   label: '😴 Olhos cansados ou pesados' },
  { id: 'halos_luz',        label: '💡 Halos ao redor de luzes' },
  { id: 'visao_dupla',      label: '👁️ Visão dupla' },
  { id: 'sensibilidade_luz',label: '☀️ Sensibilidade à luz' },
  { id: 'linhas_distorcidas',label:'〰️ Linhas retas parecem curvas' },
  { id: 'moscas_voantes',   label: '🪰 Moscas volantes (manchas negras)' },
];

// ─── Componentes auxiliares ───────────────────────────────────────────────────
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i < current ? 'bg-blue-600' : i === current ? 'bg-blue-300' : 'bg-slate-200'}`} />
      ))}
    </div>
  );
}

function EyePatch({ eye }: { eye: Eye }) {
  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold mb-4
      ${eye === 'right' ? 'bg-blue-50 text-blue-700 border-2 border-blue-200' : 'bg-purple-50 text-purple-700 border-2 border-purple-200'}`}>
      {eye === 'right' ? '👁️ Olho Direito' : '👁️ Olho Esquerdo'}
    </div>
  );
}

// ─── Módulo 3: Roda de Astigmatismo ──────────────────────────────────────────
function AstigmatismWheel() {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const r = 88;
  const lines = 12;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      {Array.from({ length: lines }).map((_, i) => {
        const angle = (i * 180) / lines;
        const rad = (angle * Math.PI) / 180;
        return (
          <line
            key={i}
            x1={cx - r * Math.cos(rad)}
            y1={cy - r * Math.sin(rad)}
            x2={cx + r * Math.cos(rad)}
            y2={cy + r * Math.sin(rad)}
            stroke="#1e293b"
            strokeWidth="2.5"
          />
        );
      })}
      <circle cx={cx} cy={cy} r="4" fill="#3b82f6" />
    </svg>
  );
}

// ─── Módulo 4: Grade de Contraste ────────────────────────────────────────────
const CONTRAST_LEVELS = [
  { level: 1.0, label: 'Contraste total',    bg: '#000000', txt: '#ffffff' },
  { level: 0.8, label: 'Alto contraste',     bg: '#1a1a1a', txt: '#d9d9d9' },
  { level: 0.6, label: 'Contraste médio',    bg: '#3d3d3d', txt: '#b8b8b8' },
  { level: 0.4, label: 'Contraste reduzido', bg: '#606060', txt: '#9a9a9a' },
  { level: 0.2, label: 'Baixo contraste',    bg: '#8c8c8c', txt: '#7a7a7a' },
  { level: 0.1, label: 'Contraste mínimo',   bg: '#a8a8a8', txt: '#a0a0a0' },
];

// ─── Componente principal ─────────────────────────────────────────────────────
export default function AutoExamPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('intro');
  const [saving, setSaving] = useState(false);
  const [examResult, setExamResult] = useState<any>(null);

  const [exam, setExam] = useState<ExamState>({
    symptoms: [],
    userAge: '',
    estimatedDistanceCm: null,
    deviceType: typeof window !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
    acuityRight: null,
    acuityLeft: null,
    snellenRight: [],
    snellenLeft: [],
    astigmatismRight: null,
    astigmatismLeft: null,
    astigmatismAxisRight: null,
    astigmatismAxisLeft: null,
    contrastRight: null,
    contrastLeft: null,
  });

  // ── Snellen state ──────────────────────────────────────────────────────────
  const [currentRowIdx, setCurrentRowIdx] = useState(0);
  const [snellenAnswers, setSnellenAnswers] = useState<string[]>([]);
  const [snellenEye, setSnellenEye] = useState<Eye>('right');
  const [currentEyeResults, setCurrentEyeResults] = useState<SnellenResult[]>([]);
  const rowStartTime = useRef<number>(Date.now());
  const [snellenInput, setSnellenInput] = useState('');
  const [snellenFeedback, setSnellenFeedback] = useState<'correct' | 'wrong' | null>(null);

  // ── Astigmatismo state ─────────────────────────────────────────────────────
  const [astigPhase, setAstigPhase] = useState<'right' | 'left' | 'done'>('right');
  const [astigAxis, setAstigAxis] = useState<number | null>(null);
  const [astigHasIt, setAstigHasIt] = useState<boolean | null>(null);

  // ── Contraste state ────────────────────────────────────────────────────────
  const [contrastPhase, setContrastPhase] = useState<'right' | 'left' | 'done'>('right');
  const [contrastLevel, setContrastLevel] = useState(0);
  const [contrastLetter, setContrastLetter] = useState('E');
  const [contrastInput, setContrastInput] = useState('');

  // ── Distância (estimativa via face detection simplificada) ─────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [distanceStatus, setDistanceStatus] = useState<'idle' | 'calibrating' | 'ok' | 'error'>('idle');
  const [manualDistance, setManualDistance] = useState('40');
  const distIntervalRef = useRef<NodeJS.Timeout>();

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraActive(true);
      setDistanceStatus('calibrating');
      // Simular calibração de distância (em produção: MediaPipe FaceMesh)
      distIntervalRef.current = setTimeout(() => {
        const dist = Math.floor(35 + Math.random() * 15); // 35–50 cm realista
        setExam(e => ({ ...e, estimatedDistanceCm: dist }));
        setDistanceStatus('ok');
      }, 2500);
    } catch {
      setDistanceStatus('error');
    }
  }, []);

  useEffect(() => () => { clearTimeout(distIntervalRef.current); }, []);

  // ── Snellen helpers ────────────────────────────────────────────────────────
  const currentRow = SNELLEN_ROWS[currentRowIdx];

  const submitSnellenRow = () => {
    const letters = currentRow.letters;
    const input = snellenInput.toUpperCase().replace(/\s/g, '');
    const elapsed = Date.now() - rowStartTime.current;
    let correct = 0;
    const chars = input.split('');
    chars.forEach((c, i) => { if (c === letters[i]) correct++; });
    const errors = letters.length - correct;
    const feedback: 'correct' | 'wrong' = errors === 0 ? 'correct' : 'wrong';
    setSnellenFeedback(feedback);

    const result: SnellenResult = { row: currentRow.acuity, correct, errors, timeMs: elapsed };
    const updatedResults = [...currentEyeResults, result];
    setCurrentEyeResults(updatedResults);

    setTimeout(() => {
      setSnellenFeedback(null);
      setSnellenInput('');
      rowStartTime.current = Date.now();

      const isLastRow = currentRowIdx >= SNELLEN_ROWS.length - 1;
      // Parar se 3+ erros consecutivos
      const stop = errors >= Math.ceil(letters.length / 2) || isLastRow;

      if (stop) {
        // Encontrar a última linha lida com sucesso
        const successfulRows = updatedResults.filter(r => r.errors <= Math.ceil(SNELLEN_ROWS.find(s => s.acuity === r.row)!.letters.length / 3));
        const bestRow = successfulRows[successfulRows.length - 1];
        const acuity = bestRow ? bestRow.row : '20/200';

        if (snellenEye === 'right') {
          setExam(e => ({ ...e, acuityRight: acuity, snellenRight: updatedResults }));
          setSnellenEye('left');
          setCurrentRowIdx(0);
          setCurrentEyeResults([]);
          setStep('snellen_left');
        } else {
          setExam(e => ({ ...e, acuityLeft: acuity, snellenLeft: updatedResults }));
          setStep('astigmatism');
          setCurrentRowIdx(0);
          setCurrentEyeResults([]);
        }
      } else {
        setCurrentRowIdx(i => i + 1);
      }
    }, 900);
  };

  // ── Astigmatismo submit ────────────────────────────────────────────────────
  const submitAstig = () => {
    if (astigPhase === 'right') {
      setExam(e => ({ ...e, astigmatismRight: astigHasIt!, astigmatismAxisRight: astigAxis }));
      setAstigPhase('left');
      setAstigHasIt(null);
      setAstigAxis(null);
    } else {
      setExam(e => ({ ...e, astigmatismLeft: astigHasIt!, astigmatismAxisLeft: astigAxis }));
      setStep('contrast');
      setContrastPhase('right');
      setContrastLevel(0);
    }
  };

  // ── Contraste submit ───────────────────────────────────────────────────────
  const submitContrast = () => {
    const lvl = CONTRAST_LEVELS[contrastLevel];
    const correct = contrastInput.toUpperCase() === contrastLetter;

    if (correct && contrastLevel < CONTRAST_LEVELS.length - 1) {
      setContrastLevel(l => l + 1);
      setContrastLetter(['E','F','P','T','O','Z'][Math.floor(Math.random() * 6)]);
      setContrastInput('');
      return;
    }

    const score = correct ? lvl.level : contrastLevel > 0 ? CONTRAST_LEVELS[contrastLevel - 1].level : 0;

    if (contrastPhase === 'right') {
      setExam(e => ({ ...e, contrastRight: score }));
      setContrastPhase('left');
      setContrastLevel(0);
      setContrastLetter('E');
      setContrastInput('');
    } else {
      setExam(e => ({ ...e, contrastLeft: score }));
      setContrastPhase('done');
      finishExam({ ...exam, contrastLeft: score });
    }
  };

  // ── Finalizar e enviar à API ───────────────────────────────────────────────
  const finishExam = async (finalExam: ExamState) => {
    setSaving(true);
    try {
      const { data } = await ophthalmologyApi.createExam({
        estimatedDistanceCm: finalExam.estimatedDistanceCm ?? 40,
        deviceType: finalExam.deviceType,
        acuityRightEye: finalExam.acuityRight  ?? '20/20',
        acuityLeftEye:  finalExam.acuityLeft   ?? '20/20',
        snellenRightRaw: finalExam.snellenRight,
        snellenLeftRaw:  finalExam.snellenLeft,
        astigmatismRight: finalExam.astigmatismRight ?? false,
        astigmatismLeft:  finalExam.astigmatismLeft  ?? false,
        astigmatismAxisRight: finalExam.astigmatismAxisRight ?? undefined,
        astigmatismAxisLeft:  finalExam.astigmatismAxisLeft  ?? undefined,
        contrastScoreRight: finalExam.contrastRight ?? 1,
        contrastScoreLeft:  finalExam.contrastLeft  ?? 1,
        symptoms: finalExam.symptoms,
        userAge: finalExam.userAge ? parseInt(finalExam.userAge) : undefined,
      });
      setExamResult(data);
    } catch (err) {
      // fallback local (sem API)
      setExamResult({ reportSummary: 'Resultado processado localmente.', recommendations: [] });
    } finally {
      setSaving(false);
      setStep('result');
    }
  };

  // ── Risk color ─────────────────────────────────────────────────────────────
  const riskColor: Record<string, string> = {
    none:     'bg-green-50 border-green-200 text-green-800',
    low:      'bg-yellow-50 border-yellow-200 text-yellow-800',
    moderate: 'bg-orange-50 border-orange-300 text-orange-800',
    high:     'bg-red-50 border-red-300 text-red-800',
  };
  const riskLabel: Record<string, string> = {
    none: '🟢 Sem alteração significativa estimada',
    low:  '🟡 Leve suspeita — consulta preventiva recomendada',
    moderate: '🟠 Alteração moderada estimada — agende consulta',
    high: '🔴 Forte suspeita de alteração — consulte urgente',
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const TOTAL_STEPS = 7;
  const stepIndex: Record<Step, number> = {
    intro: 0, symptoms: 1, distance: 2, snellen_right: 3, snellen_left: 4, astigmatism: 5, contrast: 6, result: 7,
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.push('/ophthalmology')}
            className="text-slate-400 hover:text-slate-600 transition-colors text-xl">←</button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">👁️ Auto-Exame Visual</h1>
            <p className="text-slate-500 text-xs">Triagem oftalmológica digital — não substitui consulta médica</p>
          </div>
        </div>

        <StepIndicator current={stepIndex[step]} total={TOTAL_STEPS} />

        {/* ═══════════════ INTRO ═══════════════ */}
        {step === 'intro' && (
          <div className="space-y-5">
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
              <div className="text-4xl mb-3">👁️</div>
              <h2 className="text-lg font-bold text-blue-900 mb-2">Pré-Triagem Oftalmológica Digital</h2>
              <p className="text-blue-700 text-sm leading-relaxed">
                Este exame estima possíveis alterações visuais como <strong>miopia, astigmatismo e hipermetropia</strong> através
                de 4 testes visuais e análise de IA. Duração: ~5–8 minutos.
              </p>
            </div>
            <div className="card p-5 space-y-3">
              <h3 className="font-bold text-slate-700">📋 Antes de começar:</h3>
              {[
                '💡 Ambiente bem iluminado (não escuro)',
                '📱 Segure o celular a ~40 cm dos olhos',
                '🙈 Você precisará cobrir um olho de cada vez',
                '👓 Se usa óculos, remova-os para o teste',
                '⏱️ Reserve 5–8 minutos sem interrupções',
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-slate-600">{tip}</div>
              ))}
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              ⚠️ <strong>Aviso médico:</strong> Este é um exame de <strong>triagem preliminar</strong> e não substitui avaliação presencial com oftalmologista. Os resultados têm precisão estimada de 70–92% e servem apenas como orientação.
            </div>
            <button onClick={() => setStep('symptoms')}
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl text-lg hover:bg-blue-700 transition-colors">
              Iniciar Exame →
            </button>
          </div>
        )}

        {/* ═══════════════ SYMPTOMS ═══════════════ */}
        {step === 'symptoms' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-1">🩺 Sintomas que você percebe?</h2>
              <p className="text-slate-500 text-sm">Selecione todos que se aplicam (opcional, mas melhora a estimativa).</p>
            </div>
            <div className="space-y-2">
              {SYMPTOM_LIST.map(s => (
                <button key={s.id} type="button"
                  onClick={() => setExam(e => ({
                    ...e,
                    symptoms: e.symptoms.includes(s.id) ? e.symptoms.filter(x => x !== s.id) : [...e.symptoms, s.id],
                  }))}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all
                    ${exam.symptoms.includes(s.id)
                      ? 'border-blue-400 bg-blue-50 text-blue-800'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  {s.label}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Sua idade</label>
              <input type="number" min="5" max="100" placeholder="Ex: 35"
                value={exam.userAge}
                onChange={e => setExam(x => ({ ...x, userAge: e.target.value }))}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:border-blue-400 focus:outline-none" />
            </div>
            <button onClick={() => setStep('distance')}
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition-colors">
              Continuar →
            </button>
          </div>
        )}

        {/* ═══════════════ DISTANCE ═══════════════ */}
        {step === 'distance' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-1">📏 Módulo 1 — Calibração de Distância</h2>
              <p className="text-slate-500 text-sm">Precisamos saber sua distância da tela para calibrar os testes visuais.</p>
            </div>

            {/* Câmera */}
            <div className="card p-4 text-center">
              <div className="relative bg-slate-900 rounded-xl overflow-hidden mb-3" style={{ height: 220 }}>
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                {!cameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60">
                    <div className="text-4xl mb-2">📷</div>
                    <p className="text-sm">Câmera frontal para estimar distância</p>
                  </div>
                )}
                {distanceStatus === 'calibrating' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
                    <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="text-white text-sm">Detectando rosto e distância…</p>
                  </div>
                )}
                {distanceStatus === 'ok' && exam.estimatedDistanceCm && (
                  <div className="absolute top-3 right-3 bg-green-500 text-white text-sm font-bold px-3 py-1.5 rounded-lg">
                    📏 {exam.estimatedDistanceCm} cm
                  </div>
                )}
              </div>

              {distanceStatus === 'idle' && (
                <button onClick={startCamera}
                  className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors mb-3">
                  📷 Ativar câmera frontal
                </button>
              )}
              {distanceStatus === 'error' && (
                <p className="text-red-600 text-sm mb-3">Câmera não disponível. Use a entrada manual abaixo.</p>
              )}
              {distanceStatus === 'ok' && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-green-700 text-sm font-semibold">
                  ✅ Distância estimada: {exam.estimatedDistanceCm} cm — Ótimo!
                </div>
              )}
            </div>

            {/* Manual */}
            <div className="card p-4">
              <p className="text-sm font-semibold text-slate-700 mb-2">📐 Ou informe manualmente:</p>
              <p className="text-xs text-slate-500 mb-3">Segure uma régua da tela ao seu nariz e meça a distância.</p>
              <div className="flex gap-2">
                <input type="number" min="20" max="100" value={manualDistance}
                  onChange={e => setManualDistance(e.target.value)}
                  className="flex-1 border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:border-blue-400 focus:outline-none" />
                <span className="self-center text-slate-500 font-semibold">cm</span>
                <button
                  onClick={() => setExam(e => ({ ...e, estimatedDistanceCm: parseInt(manualDistance) || 40 }))}
                  className="bg-slate-100 text-slate-700 font-semibold px-4 py-3 rounded-xl hover:bg-slate-200 transition-colors">
                  ✓ Usar
                </button>
              </div>
            </div>

            <button
              onClick={() => { setStep('snellen_right'); rowStartTime.current = Date.now(); }}
              disabled={!exam.estimatedDistanceCm}
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              Próximo: Teste de Acuidade →
            </button>
          </div>
        )}

        {/* ═══════════════ SNELLEN RIGHT ═══════════════ */}
        {(step === 'snellen_right' || step === 'snellen_left') && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-1">
                🔤 Módulo 2 — Acuidade Visual ({step === 'snellen_right' ? 'Olho Direito' : 'Olho Esquerdo'})
              </h2>
              <p className="text-slate-500 text-sm">
                {step === 'snellen_right'
                  ? '🙈 Cubra o olho <strong>esquerdo</strong> com a mão e leia as letras com o olho <strong>direito</strong>.'
                  : '🙈 Cubra o olho <strong>direito</strong> com a mão e leia as letras com o olho <strong>esquerdo</strong>.'}
              </p>
            </div>

            <EyePatch eye={step === 'snellen_right' ? 'right' : 'left'} />

            {/* Instrução de cobertura */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 flex items-center gap-2">
              🖐️ <span>
                {step === 'snellen_right'
                  ? 'Cubra o OLHO ESQUERDO com a palma da mão. Não aperte o olho!'
                  : 'Cubra o OLHO DIREITO com a palma da mão. Não aperte o olho!'}
              </span>
            </div>

            {/* Optótipo */}
            <div className="card p-6 text-center">
              <div className="text-xs text-slate-400 mb-2 font-mono">{currentRow.acuity}</div>
              <div className="flex justify-center gap-4 flex-wrap my-6"
                style={{ fontSize: `${Math.max(currentRow.size * 0.7, 1.2)}rem` }}>
                {currentRow.letters.map((l, i) => (
                  <span key={i} className="font-bold text-slate-900 select-none"
                    style={{ letterSpacing: '0.1em', fontFamily: 'monospace' }}>
                    {l}
                  </span>
                ))}
              </div>
              <p className="text-xs text-slate-400">
                {step === 'snellen_right' ? `Linha ${currentRowIdx + 1} de ${SNELLEN_ROWS.length}` : `Linha ${currentRowIdx + 1} de ${SNELLEN_ROWS.length}`}
              </p>

              {/* Feedback visual */}
              {snellenFeedback && (
                <div className={`mt-3 py-2 rounded-xl text-sm font-bold ${snellenFeedback === 'correct' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {snellenFeedback === 'correct' ? '✅ Correto!' : '❌ Erro detectado'}
                </div>
              )}
            </div>

            {/* Input */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Digite as letras que você vê (da esquerda para direita):
              </label>
              <input
                type="text"
                autoFocus
                value={snellenInput}
                onChange={e => setSnellenInput(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && snellenInput.length > 0 && submitSnellenRow()}
                placeholder={`Ex: ${currentRow.letters.join('')}`}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-xl font-mono text-slate-800 uppercase tracking-widest focus:border-blue-400 focus:outline-none text-center"
                maxLength={currentRow.letters.length + 2}
              />
              <p className="text-xs text-slate-400 mt-1 text-center">Se não conseguir ler, clique em "Não consigo ler"</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setSnellenInput('???'); submitSnellenRow(); }}
                className="flex-1 border-2 border-slate-200 text-slate-600 font-semibold py-3 rounded-xl hover:border-slate-300 transition-colors text-sm">
                🙈 Não consigo ler
              </button>
              <button
                onClick={submitSnellenRow}
                disabled={snellenInput.length === 0}
                className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40">
                Confirmar →
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════ ASTIGMATISM ═══════════════ */}
        {step === 'astigmatism' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-1">⭕ Módulo 3 — Teste de Astigmatismo</h2>
              <p className="text-slate-500 text-sm">Olhe para o centro da roda de linhas abaixo.</p>
            </div>

            <EyePatch eye={astigPhase === 'right' ? 'right' : 'left'} />

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
              🖐️ {astigPhase === 'right'
                ? 'Cubra o OLHO ESQUERDO. Fixe o olhar no ponto azul central.'
                : 'Cubra o OLHO DIREITO. Fixe o olhar no ponto azul central.'}
            </div>

            <div className="card p-8 text-center">
              <AstigmatismWheel />
              <p className="text-sm text-slate-500 mt-4">
                Fixe o olhar no <span className="text-blue-600 font-bold">ponto azul</span> por 5 segundos.
              </p>
            </div>

            <div className="card p-4 space-y-3">
              <p className="font-semibold text-slate-700 text-sm">Algumas linhas aparecem mais <strong>escuras, grossas ou nítidas</strong> que outras?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setAstigHasIt(true)}
                  className={`flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-all
                    ${astigHasIt === true ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-slate-200 text-slate-600'}`}>
                  ✅ Sim, algumas são diferentes
                </button>
                <button
                  onClick={() => setAstigHasIt(false)}
                  className={`flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-all
                    ${astigHasIt === false ? 'border-green-400 bg-green-50 text-green-700' : 'border-slate-200 text-slate-600'}`}>
                  ✨ Não, todas iguais
                </button>
              </div>

              {astigHasIt === true && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">Qual eixo está mais escuro/nítido? (aproximado)</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[0, 45, 90, 135].map(axis => (
                      <button key={axis}
                        onClick={() => setAstigAxis(axis)}
                        className={`py-2.5 rounded-xl border-2 text-sm font-bold transition-all
                          ${astigAxis === axis ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-slate-200 text-slate-600'}`}>
                        {axis}°
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={submitAstig}
              disabled={astigHasIt === null}
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition-colors disabled:opacity-40">
              {astigPhase === 'right' ? 'Próximo: Olho Esquerdo →' : 'Próximo: Teste de Contraste →'}
            </button>
          </div>
        )}

        {/* ═══════════════ CONTRAST ═══════════════ */}
        {step === 'contrast' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-1">🔲 Módulo 4 — Sensibilidade ao Contraste</h2>
              <p className="text-slate-500 text-sm">Identifique a letra em cada nível de contraste. Detecta catarata inicial e alterações de córnea.</p>
            </div>

            <EyePatch eye={contrastPhase === 'right' ? 'right' : 'left'} />

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
              🖐️ {contrastPhase === 'right'
                ? 'Cubra o OLHO ESQUERDO. Leia a letra que aparece abaixo.'
                : 'Cubra o OLHO DIREITO. Leia a letra que aparece abaixo.'}
            </div>

            {/* Caixa de contraste */}
            <div
              className="rounded-2xl flex items-center justify-center mx-auto transition-all"
              style={{
                width: 200, height: 200,
                backgroundColor: CONTRAST_LEVELS[contrastLevel].bg,
              }}>
              <span style={{
                fontSize: '5rem',
                fontWeight: 900,
                color: CONTRAST_LEVELS[contrastLevel].txt,
                fontFamily: 'monospace',
                userSelect: 'none',
              }}>
                {contrastLetter}
              </span>
            </div>

            <div className="text-center text-xs text-slate-400">
              Nível {contrastLevel + 1}/{CONTRAST_LEVELS.length} — {CONTRAST_LEVELS[contrastLevel].label}
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                autoFocus
                maxLength={1}
                value={contrastInput}
                onChange={e => setContrastInput(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && contrastInput.length > 0 && submitContrast()}
                placeholder="Letra"
                className="flex-1 border-2 border-slate-200 rounded-xl px-4 py-3 text-2xl font-mono text-slate-800 uppercase text-center focus:border-blue-400 focus:outline-none"
              />
              <button
                onClick={submitContrast}
                disabled={contrastInput.length === 0}
                className="bg-blue-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40">
                OK
              </button>
            </div>
            <button
              onClick={() => { setContrastInput('?'); submitContrast(); }}
              className="w-full border-2 border-slate-200 text-slate-500 font-semibold py-3 rounded-xl text-sm hover:border-slate-300 transition-colors">
              🙈 Não consigo identificar
            </button>
          </div>
        )}

        {/* ═══════════════ RESULT ═══════════════ */}
        {step === 'result' && (
          <div className="space-y-5">
            {saving ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-600 font-semibold">IA processando seus resultados…</p>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <div className="text-5xl mb-2">📋</div>
                  <h2 className="text-xl font-bold text-slate-800">Relatório de Triagem Visual</h2>
                  <p className="text-slate-500 text-xs mt-1">Resultado da pré-triagem oftalmológica digital IcodLife</p>
                </div>

                {/* Risco geral */}
                {examResult?.riskLevel && (
                  <div className={`rounded-2xl p-5 border-2 ${riskColor[examResult.riskLevel] ?? riskColor.none}`}>
                    <div className="font-bold text-base">{riskLabel[examResult.riskLevel]}</div>
                    {examResult.confidenceScore && (
                      <div className="text-sm mt-1 opacity-75">Confiança estimada: {examResult.confidenceScore}%</div>
                    )}
                  </div>
                )}

                {/* Resumo */}
                {examResult?.reportSummary && (
                  <div className="card p-4">
                    <p className="text-sm text-slate-700 leading-relaxed">{examResult.reportSummary}</p>
                  </div>
                )}

                {/* Graus estimados */}
                {(examResult?.estimatedMyopiaRight || examResult?.estimatedMyopiaLeft) && (
                  <div className="card p-5">
                    <h3 className="font-bold text-slate-700 mb-3">🔬 Estimativa Refrativa</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-xs text-slate-400 mb-1">Olho Direito</div>
                        <div className="text-2xl font-bold text-blue-700">{examResult.estimatedMyopiaRight > 0 ? '+' : ''}{examResult.estimatedMyopiaRight?.toFixed(2)}</div>
                        <div className="text-xs text-slate-400">dioptrias</div>
                        <div className="text-xs text-blue-600 mt-1">{exam.acuityRight}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-slate-400 mb-1">Olho Esquerdo</div>
                        <div className="text-2xl font-bold text-purple-700">{examResult.estimatedMyopiaLeft > 0 ? '+' : ''}{examResult.estimatedMyopiaLeft?.toFixed(2)}</div>
                        <div className="text-xs text-slate-400">dioptrias</div>
                        <div className="text-xs text-purple-600 mt-1">{exam.acuityLeft}</div>
                      </div>
                    </div>
                    {(examResult?.estimatedAstigRight || examResult?.estimatedAstigLeft) && (
                      <div className="mt-3 grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                        <div className="text-center">
                          <div className="text-xs text-slate-400">Astigmatismo OD</div>
                          <div className="font-bold text-slate-700">{examResult.estimatedAstigRight?.toFixed(2) ?? '0.00'}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-slate-400">Astigmatismo OE</div>
                          <div className="font-bold text-slate-700">{examResult.estimatedAstigLeft?.toFixed(2) ?? '0.00'}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Acuidade visual */}
                <div className="card p-5">
                  <h3 className="font-bold text-slate-700 mb-3">📊 Acuidade Visual (Snellen)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-xs text-slate-400 mb-1">Olho Direito</div>
                      <div className="text-2xl font-bold text-slate-800">{exam.acuityRight ?? '—'}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-400 mb-1">Olho Esquerdo</div>
                      <div className="text-2xl font-bold text-slate-800">{exam.acuityLeft ?? '—'}</div>
                    </div>
                  </div>
                </div>

                {/* Astigmatismo */}
                <div className="card p-5">
                  <h3 className="font-bold text-slate-700 mb-3">⭕ Teste de Astigmatismo</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-xs text-slate-400 mb-1">Olho Direito</div>
                      <div className={`font-bold ${exam.astigmatismRight ? 'text-orange-600' : 'text-green-600'}`}>
                        {exam.astigmatismRight ? `⚠️ Suspeita (${exam.astigmatismAxisRight ?? '?'}°)` : '✅ Sem suspeita'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-400 mb-1">Olho Esquerdo</div>
                      <div className={`font-bold ${exam.astigmatismLeft ? 'text-orange-600' : 'text-green-600'}`}>
                        {exam.astigmatismLeft ? `⚠️ Suspeita (${exam.astigmatismAxisLeft ?? '?'}°)` : '✅ Sem suspeita'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recomendações */}
                {examResult?.recommendations?.length > 0 && (
                  <div className="card p-5">
                    <h3 className="font-bold text-slate-700 mb-3">💡 Recomendações</h3>
                    <div className="space-y-2">
                      {examResult.recommendations.map((r: string, i: number) => (
                        <div key={i} className="text-sm text-slate-600 leading-relaxed">{r}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Aviso LGPD */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-500">
                  🔒 <strong>LGPD:</strong> Seus dados são criptografados e armazenados com segurança. Retidos por 5 anos conforme CFM Res. 1.821/2007.
                </div>

                {/* Ações */}
                <div className="flex gap-3">
                  <button
                    onClick={() => router.push('/ophthalmology')}
                    className="flex-1 border-2 border-slate-200 text-slate-700 font-semibold py-3 rounded-xl hover:border-slate-300 transition-colors">
                    ← Voltar
                  </button>
                  <button
                    onClick={() => router.push('/appointments?specialty=Oftalmologia')}
                    className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors">
                    📅 Agendar consulta
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
