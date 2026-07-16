// apps/api/src/modules/ai-chat/health-signals.ts
// Motor de Sinais e Risco de Saúde — extração determinística das respostas do check-in
// diário e cálculo de flags/score/tendência. Funções puras (sem I/O), fáceis de testar.

export type QuestionKey =
  | 'sleep' | 'bloodpressure' | 'pain' | 'energy'
  | 'mood' | 'lifestyle' | 'symptoms' | 'nutrition';

export interface DailyQuestion {
  key: QuestionKey;
  text: string;
}

// Sequência do questionário diário (ordem importa).
export const DAILY_QUESTIONS: DailyQuestion[] = [
  { key: 'sleep',         text: 'Como foi o seu sono esta noite? Dormiu bem? 😴' },
  { key: 'bloodpressure', text: 'Você aferiu a pressão arterial hoje? Se sim, quais foram os valores (ex.: 120/80)?' },
  { key: 'pain',          text: 'Está sentindo alguma dor hoje? De 0 a 10, qual a intensidade?' },
  { key: 'energy',        text: 'Como está o seu nível de energia? Sentiu cansaço ou fadiga incomum?' },
  { key: 'mood',          text: 'Como está o seu humor hoje? Sentiu ansiedade ou tristeza?' },
  { key: 'lifestyle',     text: 'Comeu alguma refeição pesada hoje (fritura, churrasco, muito sal)?' },
  { key: 'symptoms',      text: 'Teve algum sintoma incomum? E tomou todos os seus medicamentos nos horários certos?' },
  { key: 'nutrition',     text: 'Como foi a sua alimentação e hidratação hoje? Bebeu água suficiente?' },
];

export type Polarity = 'positive' | 'neutral' | 'negative';

export interface ExtractedSignal {
  type: string;
  valueNum?: number;
  valueText?: string;
  polarity: Polarity;
}

const norm = (s: string) =>
  (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const any = (t: string, words: string[]) => words.some((w) => t.includes(w));

// ── Interpretação de uma resposta conforme a pergunta atual ───────────────────
export function interpretAnswer(key: QuestionKey, raw: string): ExtractedSignal[] {
  const t = norm(raw);
  if (!t.trim()) return [];

  switch (key) {
    case 'sleep': {
      const bad = any(t, ['nao dormi', 'dormi mal', 'mal', 'ruim', 'insoni', 'acordei', 'pouco', 'pessim', 'agitad', 'nao consegui']);
      const good = any(t, ['dormi bem', 'bem', 'otim', 'tranquil', 'descans', 'profund', 'maravilh']);
      const polarity: Polarity = bad ? 'negative' : good ? 'positive' : 'neutral';
      return [{ type: 'sleep', valueText: bad ? 'ruim' : good ? 'bom' : 'regular', polarity }];
    }

    case 'bloodpressure': {
      const m = t.match(/(\d{2,3})\s*(?:[\/x]|por|\s)\s*(\d{2,3})/);
      if (m) {
        const sys = parseInt(m[1], 10);
        const dia = parseInt(m[2], 10);
        const high = sys >= 140 || dia >= 90;
        const low = sys < 90 || dia < 60;
        return [{
          type: 'bp_measured',
          valueNum: sys,
          valueText: `${sys}/${dia}`,
          polarity: high || low ? 'negative' : 'positive',
        }];
      }
      if (any(t, ['nao afer', 'nao medi', 'nao verifiquei', 'nao'])) {
        return [{ type: 'bp_measured', valueText: 'nao_aferida', polarity: 'neutral' }];
      }
      return [];
    }

    case 'pain': {
      if (any(t, ['sem dor', 'nenhuma', 'nao', 'zero'])) {
        return [{ type: 'pain', valueNum: 0, valueText: 'sem dor', polarity: 'positive' }];
      }
      const m = t.match(/\b(10|[0-9])\b/);
      if (m) {
        const n = parseInt(m[1], 10);
        return [{ type: 'pain', valueNum: n, valueText: `${n}/10`, polarity: n >= 4 ? 'negative' : 'neutral' }];
      }
      const strong = any(t, ['forte', 'intens', 'muita dor', 'insuport']);
      return [{ type: 'pain', valueText: strong ? 'forte' : 'presente', polarity: strong ? 'negative' : 'neutral' }];
    }

    case 'energy': {
      const bad = any(t, ['cansa', 'fadiga', 'exaust', 'sem energia', 'fraco', 'indispos', 'sonolent', 'esgotad']);
      const good = any(t, ['bem', 'dispost', 'energia', 'ativ', 'otim', 'normal']);
      return [{ type: 'energy', valueText: bad ? 'baixa' : good ? 'boa' : 'regular', polarity: bad ? 'negative' : good ? 'positive' : 'neutral' }];
    }

    case 'mood': {
      const bad = any(t, ['ansi', 'trist', 'deprim', 'mal', 'angusti', 'estress', 'irritad', 'nervos', 'desanim']);
      const good = any(t, ['bem', 'feliz', 'calm', 'tranquil', 'otim', 'content', 'normal']);
      return [{ type: 'mood', valueText: bad ? 'negativo' : good ? 'positivo' : 'neutro', polarity: bad ? 'negative' : good ? 'positive' : 'neutral' }];
    }

    case 'lifestyle': {
      const heavy = any(t, ['sim', 'fritura', 'churrasco', 'sal', 'gordur', 'pesad', 'fast', 'refrigerante', 'doce', 'frit', 'muito']);
      const light = any(t, ['nao', 'leve', 'saudav', 'salada', 'natural', 'equilibr']);
      if (heavy && !light) return [{ type: 'heavy_meal', valueText: 'sim', polarity: 'negative' }];
      return [{ type: 'heavy_meal', valueText: 'nao', polarity: 'positive' }];
    }

    case 'symptoms': {
      const out: ExtractedSignal[] = [];
      // Adesão a medicamentos
      if (any(t, ['nao tomei', 'esqueci', 'deixei de tomar', 'nao tomou', 'faltou', 'nao consegui tomar'])) {
        out.push({ type: 'medication_adherence', valueText: 'faltou', polarity: 'negative' });
      } else if (any(t, ['tomei', 'sim', 'todos', 'em dia', 'certinho', 'nos horarios'])) {
        out.push({ type: 'medication_adherence', valueText: 'ok', polarity: 'positive' });
      }
      // Sintomas de alerta
      const worrisome = ['febre', 'vomit', 'tontura', 'falta de ar', 'dor no peito', 'desmai', 'sangr', 'formigament', 'visao'];
      const found = worrisome.find((w) => t.includes(w));
      if (found) {
        out.push({ type: 'symptom', valueText: found, polarity: 'negative' });
      } else if (any(t, ['nenhum', 'sem sintoma', 'nada', 'normal'])) {
        out.push({ type: 'symptom', valueText: 'nenhum', polarity: 'positive' });
      }
      return out;
    }

    case 'nutrition': {
      const bad = any(t, ['pouca agua', 'nao bebi', 'desidrat', 'pouco', 'mal', 'nao me alimentei']);
      const good = any(t, ['bebi', 'bastante', 'litros', 'suficiente', 'bem', 'saudav', 'agua']);
      return [{ type: 'hydration', valueText: bad ? 'baixa' : good ? 'boa' : 'regular', polarity: bad ? 'negative' : good ? 'positive' : 'neutral' }];
    }

    default:
      return [];
  }
}

// ── Motor de risco: cruza os sinais do dia em flags/score/tendência ───────────
export interface RiskResult {
  flags: string[];
  riskScore: number;   // 0..100
  riskLevel: 'low' | 'moderate' | 'high';
  sentimentScore: number; // -1..1
  bpFactors: string[];
  notes: string[];
}

export function computeRisk(signals: ExtractedSignal[]): RiskResult {
  const by = (type: string) => signals.filter((s) => s.type === type);
  const first = (type: string) => by(type)[0];

  const sleep = first('sleep');
  const bp = first('bp_measured');
  const pain = first('pain');
  const energy = first('energy');
  const mood = first('mood');
  const heavy = first('heavy_meal');
  const med = first('medication_adherence');
  const symptom = first('symptom');
  const hydration = first('hydration');

  const badSleep = sleep?.polarity === 'negative';
  const painNum = pain?.valueNum ?? 0;
  const highPain = painNum >= 7 || pain?.valueText === 'forte';
  const modPain = painNum >= 4;
  const missedMed = med?.valueText === 'faltou';
  const heavyMeal = heavy?.valueText === 'sim';
  const negMood = mood?.polarity === 'negative';
  const lowEnergy = energy?.polarity === 'negative';
  const bpHigh = bp?.polarity === 'negative' && bp?.valueText !== 'nao_aferida';
  const worrisome = symptom?.polarity === 'negative' ? symptom.valueText : undefined;
  const lowHydration = hydration?.polarity === 'negative';

  const flags: string[] = [];
  const bpFactors: string[] = [];
  const notes: string[] = [];

  if (badSleep) { flags.push('sleep_issue'); bpFactors.push('Sono ruim'); }
  if (highPain) flags.push('severe_pain');
  if (missedMed) { flags.push('missed_medication'); bpFactors.push('Medicação não tomada'); }
  if (heavyMeal) bpFactors.push('Refeição pesada/salgada');
  if (bpHigh) { bpFactors.push(`PA elevada aferida (${bp?.valueText})`); }

  const bpSymptom = worrisome && ['tontura', 'dor no peito', 'falta de ar', 'visao'].some((w) => worrisome.includes(w));
  const bpRisk = bpHigh
    || (missedMed && (badSleep || heavyMeal || negMood))
    || (heavyMeal && badSleep);
  if (bpRisk) flags.push('bp_risk_factors');
  if (bpSymptom || bpHigh) flags.push('bp_symptom');

  const feverish = worrisome && ['febre', 'vomit', 'sangr'].some((w) => worrisome!.includes(w));
  if (feverish) flags.push('possible_illness');

  // Score ponderado
  let score = 0;
  if (bpHigh) score += 30;
  if (worrisome) score += feverish ? 25 : 18;
  if (highPain) score += 20; else if (modPain) score += 8;
  if (missedMed) score += 20;
  if (badSleep) score += 10;
  if (heavyMeal) score += 8;
  if (negMood) score += 8;
  if (lowEnergy) score += 6;
  if (lowHydration) score += 4;
  const riskScore = Math.min(100, score);
  const riskLevel: RiskResult['riskLevel'] = riskScore >= 50 ? 'high' : riskScore >= 20 ? 'moderate' : 'low';

  // Sentimento (-1..1)
  const pos = signals.filter((s) => s.polarity === 'positive').length;
  const neg = signals.filter((s) => s.polarity === 'negative').length;
  const total = pos + neg;
  const sentimentScore = total === 0 ? 0 : Number(((pos - neg) / total).toFixed(2));

  if (flags.includes('bp_risk_factors')) {
    notes.push('Combinação de fatores que pode elevar a pressão arterial — recomendamos medir a PA e tomar a medicação prescrita.');
  }
  if (flags.includes('possible_illness')) {
    notes.push('Sintomas que podem indicar mal-estar — fique atento e procure avaliação se persistirem.');
  }
  if (flags.includes('severe_pain')) {
    notes.push('Dor intensa relatada — recomendamos avaliação médica.');
  }

  return { flags, riskScore, riskLevel, sentimentScore, bpFactors, notes };
}

// Mensagem de resumo ao final do check-in.
export function buildSummaryMessage(risk: RiskResult): string {
  const parts = ['Aqui está o resumo do seu check-in de hoje:'];
  if (risk.riskLevel === 'low') parts.push('\n✅ Seus indicadores estão dentro da normalidade. Continue assim! 💪');
  else if (risk.riskLevel === 'moderate') parts.push('\n💛 Alguns pontos de atenção hoje. Cuide-se e acompanhe.');
  else parts.push('\n🔴 Vários fatores de risco hoje. Recomendamos atenção redobrada.');

  for (const n of risk.notes) parts.push(`• ${n}`);
  parts.push('\nRegistros salvos no seu prontuário IcodLife. Até amanhã! 🌟');
  return parts.join('\n');
}
