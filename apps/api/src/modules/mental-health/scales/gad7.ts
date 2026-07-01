// apps/api/src/modules/mental-health/scales/gad7.ts
// GAD-7 — Generalized Anxiety Disorder 7-item scale (Spitzer, Kroenke, Williams, Löwe, 2006).
// Instrumento de rastreio de uso livre (Pfizer Inc. autoriza reprodução, tradução e distribuição sem
// necessidade de permissão). Não é teste psicológico privativo — uso amplamente aceito na atenção médica.

import {
  Answer, ScaleDefinition, ScoringResult, SeverityBand, bandFor, sumAnswers,
} from './types';

const OPTIONS = [
  { value: 0, label: 'Nenhuma vez' },
  { value: 1, label: 'Vários dias' },
  { value: 2, label: 'Mais da metade dos dias' },
  { value: 3, label: 'Quase todos os dias' },
];

const QUESTIONS = [
  { id: 'gad7_1', text: 'Sentir-se nervoso(a), ansioso(a) ou muito tenso(a).' },
  { id: 'gad7_2', text: 'Não conseguir parar de se preocupar ou controlar as preocupações.' },
  { id: 'gad7_3', text: 'Preocupar-se demais com diferentes coisas.' },
  { id: 'gad7_4', text: 'Ter dificuldade para relaxar.' },
  { id: 'gad7_5', text: 'Ficar tão agitado(a) que se torna difícil permanecer parado(a).' },
  { id: 'gad7_6', text: 'Ficar facilmente irritado(a) ou aborrecido(a).' },
  { id: 'gad7_7', text: 'Sentir medo, como se algo muito ruim fosse acontecer.' },
];

const BANDS: SeverityBand[] = [
  { min: 0,  max: 4,  severity: 'minima',   label: 'Ansiedade mínima',  color: 'green',
    interpretation: 'Sintomas de ansiedade mínimos ou ausentes no período avaliado.' },
  { min: 5,  max: 9,  severity: 'leve',     label: 'Ansiedade leve',    color: 'yellow',
    interpretation: 'Sintomas leves de ansiedade. Recomenda-se acompanhamento e reavaliação periódica.' },
  { min: 10, max: 14, severity: 'moderada', label: 'Ansiedade moderada', color: 'orange',
    interpretation: 'Sintomas moderados; escore igual ou acima de 10 sugere provável Transtorno de Ansiedade Generalizada. Indicada avaliação clínica.' },
  { min: 15, max: 21, severity: 'severa',   label: 'Ansiedade severa',  color: 'red',
    interpretation: 'Sintomas severos de ansiedade. Avaliação clínica prioritária e conduta terapêutica recomendadas.' },
];

export const GAD7: ScaleDefinition = {
  code: 'GAD7',
  name: 'GAD-7 — Escala de Transtorno de Ansiedade Generalizada',
  shortName: 'GAD-7',
  category: 'ansiedade',
  categoryLabel: 'Ansiedade',
  license: 'free',
  attribution: 'GAD-7 © Spitzer, Kroenke, Williams, Löwe (2006). Uso livre autorizado (Pfizer Inc.).',
  version: '1.0',
  timeframe: 'últimas 2 semanas',
  instructions:
    'Durante as ÚLTIMAS 2 SEMANAS, com que frequência você foi incomodado(a) por cada um dos problemas abaixo?',
  direction: 'higher_worse',
  options: OPTIONS,
  questions: QUESTIONS,
  detects: ['ansiedade leve', 'ansiedade moderada', 'ansiedade severa', 'risco de crise de ansiedade'],
  disclaimer:
    'Instrumento de RASTREIO — não substitui avaliação clínica nem estabelece diagnóstico. ' +
    'Resultados elevados indicam necessidade de avaliação por profissional de saúde.',

  score(answers: Answer[]): ScoringResult {
    const rawMax = QUESTIONS.length * 3; // 21
    const rawScore = sumAnswers(answers, QUESTIONS, 3);
    const band = bandFor(rawScore, BANDS);
    const normalizedScore = Math.round((rawScore / rawMax) * 100);

    // "Risco de crise": ansiedade severa + agitação/medo intensos (itens 5 e 7).
    const byId = new Map(answers.map(a => [a.questionId, a.value]));
    const agitacao = byId.get('gad7_5') ?? 0;
    const medo = byId.get('gad7_7') ?? 0;
    const crisisRisk = rawScore >= 15 && (agitacao >= 2 || medo >= 2);

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
        crisisRisk,
        recommendFollowUp: rawScore >= 10,
      },
    };
  },
};
