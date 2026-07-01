// apps/api/src/modules/mental-health/scales/cbi.ts
// CBI — Copenhagen Burnout Inventory (Kristensen, Borritz, Villadsen, Christensen, 2005).
// Instrumento de domínio público, de uso livre mediante citação. Implementadas as duas subescalas
// universais para a população trabalhadora em geral: Burnout Pessoal (6 itens) e Burnout Relacionado
// ao Trabalho (7 itens; o último é item protetivo, pontuado de forma invertida).

import {
  Answer, ScaleDefinition, ScoringResult, SeverityBand, SubscaleResult, bandFor, round1,
} from './types';

// Escala de 5 pontos unificada (frequência/grau). value 0..4 → 0,25,50,75,100.
const OPTIONS = [
  { value: 0, label: 'Nunca / quase nunca (grau muito baixo)' },
  { value: 1, label: 'Raramente (grau baixo)' },
  { value: 2, label: 'Às vezes (grau moderado)' },
  { value: 3, label: 'Frequentemente (grau alto)' },
  { value: 4, label: 'Sempre (grau muito alto)' },
];

const QUESTIONS = [
  // ── Burnout pessoal ──────────────────────────────────────────────
  { id: 'cbi_p1', subscale: 'pessoal',  text: 'Com que frequência você se sente cansado(a)?' },
  { id: 'cbi_p2', subscale: 'pessoal',  text: 'Com que frequência você se sente fisicamente esgotado(a)?' },
  { id: 'cbi_p3', subscale: 'pessoal',  text: 'Com que frequência você se sente emocionalmente esgotado(a)?' },
  { id: 'cbi_p4', subscale: 'pessoal',  text: 'Com que frequência você pensa "não aguento mais"?' },
  { id: 'cbi_p5', subscale: 'pessoal',  text: 'Com que frequência você se sente exausto(a)?' },
  { id: 'cbi_p6', subscale: 'pessoal',  text: 'Com que frequência você se sente fraco(a) e mais suscetível a adoecer?' },
  // ── Burnout relacionado ao trabalho ──────────────────────────────
  { id: 'cbi_t1', subscale: 'trabalho', text: 'O seu trabalho é emocionalmente desgastante?' },
  { id: 'cbi_t2', subscale: 'trabalho', text: 'Você se sente esgotado(a) por causa do seu trabalho?' },
  { id: 'cbi_t3', subscale: 'trabalho', text: 'O seu trabalho deixa você frustrado(a)?' },
  { id: 'cbi_t4', subscale: 'trabalho', text: 'Você se sente esgotado(a) ao final de um dia de trabalho?' },
  { id: 'cbi_t5', subscale: 'trabalho', text: 'Você se sente exausto(a) pela manhã ao pensar em mais um dia de trabalho?' },
  { id: 'cbi_t6', subscale: 'trabalho', text: 'Você sente que cada hora de trabalho é cansativa para você?' },
  { id: 'cbi_t7', subscale: 'trabalho', reverse: true,
    text: 'Você tem energia suficiente para a família e os amigos durante o seu tempo livre?' },
];

const SUBSCALES = [
  { key: 'pessoal',  label: 'Burnout Pessoal' },
  { key: 'trabalho', label: 'Burnout Relacionado ao Trabalho' },
];

// Faixas sobre o escore 0–100 (maior = mais burnout).
const BANDS: SeverityBand[] = [
  { min: 0,  max: 49,  severity: 'baixo',    label: 'Burnout baixo / ausente', color: 'green',
    interpretation: 'Nível de burnout baixo ou ausente no domínio avaliado.' },
  { min: 50, max: 74,  severity: 'moderado', label: 'Burnout moderado',        color: 'yellow',
    interpretation: 'Nível moderado de burnout. Recomenda-se atenção a fatores de carga e recuperação.' },
  { min: 75, max: 99,  severity: 'alto',     label: 'Burnout alto',            color: 'orange',
    interpretation: 'Nível alto de burnout. Indicada avaliação e medidas de proteção à saúde.' },
  { min: 100, max: 100, severity: 'severo',  label: 'Burnout severo',          color: 'red',
    interpretation: 'Nível severo de burnout. Avaliação clínica/ocupacional prioritária recomendada.' },
];

function scoreSubscale(key: string, label: string, answers: Answer[]): SubscaleResult | null {
  const items = QUESTIONS.filter(q => q.subscale === key);
  const byId = new Map(answers.map(a => [a.questionId, a.value]));
  const vals: number[] = [];
  for (const q of items) {
    const v = byId.get(q.id);
    if (v === undefined) continue;
    const idx = q.reverse ? 4 - v : v;
    vals.push(idx * 25); // 0..100
  }
  if (vals.length === 0) return null;
  const normalizedScore = round1(vals.reduce((s, v) => s + v, 0) / vals.length);
  const band = bandFor(normalizedScore, BANDS);
  return {
    key, label,
    rawScore: normalizedScore,
    normalizedScore,
    severity: band.severity,
    severityLabel: band.label,
    color: band.color,
    interpretation: band.interpretation,
  };
}

export const CBI: ScaleDefinition = {
  code: 'CBI',
  name: 'CBI — Inventário de Burnout de Copenhague',
  shortName: 'CBI',
  category: 'burnout',
  categoryLabel: 'Burnout',
  license: 'free',
  attribution: 'Copenhagen Burnout Inventory © Kristensen et al. (2005). Domínio público — uso livre com citação.',
  version: '1.0',
  timeframe: 'período recente',
  instructions:
    'Responda pensando em como você tem se sentido recentemente, tanto na vida pessoal quanto no trabalho.',
  direction: 'higher_worse',
  options: OPTIONS,
  questions: QUESTIONS,
  detects: ['exaustão emocional', 'exaustão física', 'desgaste relacionado ao trabalho'],
  disclaimer:
    'Instrumento de RASTREIO de burnout — não substitui avaliação clínica/ocupacional individual.',

  score(answers: Answer[]): ScoringResult {
    const subscores = SUBSCALES
      .map(s => scoreSubscale(s.key, s.label, answers))
      .filter((x): x is SubscaleResult => x !== null);

    const normalizedScore = subscores.length
      ? round1(subscores.reduce((s, v) => s + v.normalizedScore, 0) / subscores.length)
      : 0;
    const band = bandFor(normalizedScore, BANDS);

    return {
      rawScore: normalizedScore,
      rawMax: 100,
      normalizedScore,
      severity: band.severity,
      severityLabel: band.label,
      color: band.color,
      interpretation: band.interpretation,
      subscores,
      detects: this.detects,
      flags: {
        recommendFollowUp: normalizedScore >= 50,
      },
    };
  },
};
