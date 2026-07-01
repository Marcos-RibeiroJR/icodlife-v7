// apps/api/src/modules/mental-health/scales/types.ts
// Contratos genéricos do submódulo Saúde Mental.
// Cada escala é um "módulo" independente que implementa ScaleDefinition e é registrado no index.ts.
// Somente escalas de USO LIVRE e não privativas são embutidas (ver PLANO_MODULO_SAUDE_MENTAL.md).

export type ScaleCategory =
  | 'ansiedade'
  | 'depressao'
  | 'burnout'
  | 'estresse'
  | 'sono'
  | 'bem_estar';

export type BandColor = 'green' | 'yellow' | 'orange' | 'red';

/** Direção do escore normalizado (0–100):
 *  higher_worse  → quanto maior, pior (GAD-7, PHQ-9, CBI)
 *  higher_better → quanto maior, melhor (WHO-5) */
export type ScoreDirection = 'higher_worse' | 'higher_better';

export interface Answer {
  questionId: string;
  value: number; // índice da opção Likert escolhida
}

export interface ScaleOption {
  value: number;
  label: string;
}

export interface ScaleQuestion {
  id: string;
  text: string;
  reverse?: boolean;      // item invertido no cálculo
  subscale?: string;      // chave da subescala (escalas multidimensionais)
  isSafetyItem?: boolean; // item sensível (ex.: ideação suicida) — dispara safety.service
}

export interface SeverityBand {
  min: number;            // limite inferior (inclusive) sobre o escore de referência
  max: number;            // limite superior (inclusive)
  severity: string;       // chave: 'minima' | 'leve' | 'moderada' | 'severa' ...
  label: string;          // rótulo exibível
  color: BandColor;
  interpretation: string; // frase clínica da faixa (entra no laudo)
}

export interface SubscaleResult {
  key: string;
  label: string;
  rawScore: number;
  normalizedScore: number;
  severity: string;
  severityLabel: string;
  color: BandColor;
  interpretation: string;
}

export interface ScoringResult {
  rawScore: number;         // escore bruto do instrumento
  rawMax: number;           // teto do escore bruto
  normalizedScore: number;  // 0–100
  severity: string;
  severityLabel: string;
  color: BandColor;
  interpretation: string;
  subscores?: SubscaleResult[];
  flags?: {
    suicideRisk?: boolean;
    crisisRisk?: boolean;
    recommendFollowUp?: boolean;
    [key: string]: any;
  };
  detects: string[];        // o que a escala detecta (para o laudo)
}

export interface ScaleDefinition {
  code: string;             // "GAD7"
  name: string;             // nome completo
  shortName: string;        // "GAD-7"
  category: ScaleCategory;
  categoryLabel: string;
  license: 'free' | 'licensed' | 'proprietary';
  attribution: string;      // crédito obrigatório
  version: string;
  timeframe: string;        // janela de referência ("últimas 2 semanas")
  instructions: string;     // instrução ao respondente
  direction: ScoreDirection;
  options: ScaleOption[];   // escala Likert (default; subescalas podem sobrescrever)
  optionsByReverse?: { normal: ScaleOption[]; reverse: ScaleOption[] };
  questions: ScaleQuestion[];
  detects: string[];
  disclaimer: string;
  score(answers: Answer[]): ScoringResult;
}

// ── Helpers compartilhados ────────────────────────────────────────────────

/** Retorna a faixa de gravidade que contém `score`. */
export function bandFor(score: number, bands: SeverityBand[]): SeverityBand {
  const b = bands.find(x => score >= x.min && score <= x.max);
  return b ?? bands[bands.length - 1];
}

/** Soma simples dos valores (aplicando reverse quando indicado). */
export function sumAnswers(
  answers: Answer[],
  questions: ScaleQuestion[],
  maxOptionIndex: number,
): number {
  const byId = new Map(answers.map(a => [a.questionId, a.value]));
  let total = 0;
  for (const q of questions) {
    const v = byId.get(q.id);
    if (v === undefined) continue;
    total += q.reverse ? maxOptionIndex - v : v;
  }
  return total;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
