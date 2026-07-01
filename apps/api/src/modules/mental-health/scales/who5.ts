// apps/api/src/modules/mental-health/scales/who5.ts
// WHO-5 — Índice de Bem-Estar da OMS (WHO-5 Well-Being Index, 1998).
// Uso livre e gratuito (Organização Mundial da Saúde), mediante atribuição. Escore mais ALTO = melhor bem-estar.

import {
  Answer, ScaleDefinition, ScoringResult, SeverityBand, bandFor, sumAnswers,
} from './types';

const OPTIONS = [
  { value: 5, label: 'O tempo todo' },
  { value: 4, label: 'A maior parte do tempo' },
  { value: 3, label: 'Mais da metade do tempo' },
  { value: 2, label: 'Menos da metade do tempo' },
  { value: 1, label: 'De vez em quando' },
  { value: 0, label: 'Em nenhum momento' },
];

const QUESTIONS = [
  { id: 'who5_1', text: 'Eu me senti alegre e de bom humor.' },
  { id: 'who5_2', text: 'Eu me senti calmo(a) e relaxado(a).' },
  { id: 'who5_3', text: 'Eu me senti ativo(a) e cheio(a) de energia.' },
  { id: 'who5_4', text: 'Eu acordei me sentindo descansado(a) e revigorado(a).' },
  { id: 'who5_5', text: 'Meu dia a dia foi preenchido por coisas que me interessam.' },
];

// Faixas aplicadas sobre o escore NORMALIZADO (0–100). Maior = melhor.
const BANDS: SeverityBand[] = [
  { min: 0,  max: 28,  severity: 'muito_baixo', label: 'Bem-estar muito baixo', color: 'red',
    interpretation: 'Bem-estar muito reduzido. Escore igual ou abaixo de 28 é indicativo de rastreio positivo para depressão — recomenda-se aplicar o PHQ-9 e avaliação clínica.' },
  { min: 29, max: 50,  severity: 'baixo',       label: 'Bem-estar baixo',       color: 'orange',
    interpretation: 'Bem-estar abaixo do adequado. Escore igual ou abaixo de 50 sugere necessidade de acompanhamento e de rastreio complementar de depressão.' },
  { min: 51, max: 72,  severity: 'moderado',    label: 'Bem-estar moderado',    color: 'yellow',
    interpretation: 'Bem-estar em nível intermediário. Manter hábitos protetivos e monitorar.' },
  { min: 73, max: 100, severity: 'bom',         label: 'Bem-estar bom',         color: 'green',
    interpretation: 'Bom nível de bem-estar subjetivo no período avaliado.' },
];

export const WHO5: ScaleDefinition = {
  code: 'WHO5',
  name: 'WHO-5 — Índice de Bem-Estar da OMS',
  shortName: 'WHO-5',
  category: 'bem_estar',
  categoryLabel: 'Bem-estar',
  license: 'free',
  attribution: 'WHO-5 Well-Being Index © World Health Organization, 1998. Uso livre com atribuição.',
  version: '1.0',
  timeframe: 'últimas 2 semanas',
  instructions:
    'Para cada afirmação, indique o que mais se aproxima de como você se sentiu nas ÚLTIMAS 2 SEMANAS.',
  direction: 'higher_better',
  options: OPTIONS,
  questions: QUESTIONS,
  detects: ['nível de bem-estar subjetivo', 'rastreio de baixo bem-estar / depressão'],
  disclaimer:
    'Instrumento de RASTREIO de bem-estar — não substitui avaliação clínica. ' +
    'Escore baixo indica necessidade de rastreio complementar (ex.: PHQ-9) e/ou avaliação profissional.',

  score(answers: Answer[]): ScoringResult {
    const rawMax = QUESTIONS.length * 5; // 25
    const rawScore = sumAnswers(answers, QUESTIONS, 5);
    const normalizedScore = rawScore * 4; // 0–100
    const band = bandFor(normalizedScore, BANDS);

    return {
      rawScore,
      rawMax,
      normalizedScore,
      severity: band.severity,
      severityLabel: band.label,
      color: band.color,
      interpretation: band.interpretation,
      detects: this.detects,
      flags: {
        recommendFollowUp: normalizedScore <= 50,
        recommendPHQ9: normalizedScore <= 28,
      },
    };
  },
};
