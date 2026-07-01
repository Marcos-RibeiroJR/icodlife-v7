// apps/api/src/modules/mental-health/scales/phq9.ts
// PHQ-9 — Patient Health Questionnaire 9-item depression module (Kroenke, Spitzer, Williams, 2001).
// Instrumento de rastreio de uso livre (Pfizer Inc. autoriza reprodução, tradução e distribuição sem
// necessidade de permissão). O item 9 avalia ideação suicida e aciona o fluxo de segurança do módulo.

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
  { id: 'phq9_1', text: 'Pouco interesse ou pouco prazer em fazer as coisas.' },
  { id: 'phq9_2', text: 'Sentir-se para baixo, deprimido(a) ou sem esperança.' },
  { id: 'phq9_3', text: 'Dificuldade para adormecer, permanecer dormindo ou dormir mais do que o habitual.' },
  { id: 'phq9_4', text: 'Sentir-se cansado(a) ou com pouca energia.' },
  { id: 'phq9_5', text: 'Falta de apetite ou comer em excesso.' },
  { id: 'phq9_6', text: 'Sentir-se mal consigo mesmo(a), achar que é um fracasso ou que decepcionou a si ou a sua família.' },
  { id: 'phq9_7', text: 'Dificuldade para se concentrar nas coisas, como ler ou assistir à televisão.' },
  { id: 'phq9_8', text: 'Mover-se ou falar tão devagar a ponto de outras pessoas notarem — ou, ao contrário, estar tão agitado(a) que se mexe muito mais que o normal.' },
  { id: 'phq9_9', text: 'Pensar que seria melhor estar morto(a) ou em se machucar de alguma forma.', isSafetyItem: true },
];

const BANDS: SeverityBand[] = [
  { min: 0,  max: 4,  severity: 'minima',              label: 'Depressão mínima',              color: 'green',
    interpretation: 'Sintomas depressivos mínimos ou ausentes no período avaliado.' },
  { min: 5,  max: 9,  severity: 'leve',                label: 'Depressão leve',                color: 'yellow',
    interpretation: 'Sintomas depressivos leves. Recomenda-se monitoramento e reavaliação.' },
  { min: 10, max: 14, severity: 'moderada',            label: 'Depressão moderada',            color: 'orange',
    interpretation: 'Sintomas moderados; escore igual ou acima de 10 sugere quadro depressivo clinicamente relevante. Avaliação clínica indicada.' },
  { min: 15, max: 19, severity: 'moderada_severa',     label: 'Depressão moderadamente severa', color: 'red',
    interpretation: 'Sintomas moderadamente severos. Avaliação clínica e plano terapêutico recomendados.' },
  { min: 20, max: 27, severity: 'severa',              label: 'Depressão severa',              color: 'red',
    interpretation: 'Sintomas severos de depressão. Avaliação clínica prioritária e conduta terapêutica recomendadas.' },
];

export const PHQ9: ScaleDefinition = {
  code: 'PHQ9',
  name: 'PHQ-9 — Questionário de Saúde do Paciente (Depressão)',
  shortName: 'PHQ-9',
  category: 'depressao',
  categoryLabel: 'Depressão',
  license: 'free',
  attribution: 'PHQ-9 © Kroenke, Spitzer, Williams (2001). Uso livre autorizado (Pfizer Inc.).',
  version: '1.0',
  timeframe: 'últimas 2 semanas',
  instructions:
    'Durante as ÚLTIMAS 2 SEMANAS, com que frequência você foi incomodado(a) por cada um dos problemas abaixo?',
  direction: 'higher_worse',
  options: OPTIONS,
  questions: QUESTIONS,
  detects: ['humor deprimido', 'desesperança', 'fadiga', 'perda de interesse', 'ideação suicida'],
  disclaimer:
    'Instrumento de RASTREIO — não substitui avaliação clínica nem estabelece diagnóstico. ' +
    'Em caso de ideação suicida ou sintomas severos, procure avaliação profissional imediatamente.',

  score(answers: Answer[]): ScoringResult {
    const rawMax = QUESTIONS.length * 3; // 27
    const rawScore = sumAnswers(answers, QUESTIONS, 3);
    const band = bandFor(rawScore, BANDS);
    const normalizedScore = Math.round((rawScore / rawMax) * 100);

    // Item 9 — ideação suicida: qualquer resposta > 0 aciona o fluxo de segurança.
    const item9 = answers.find(a => a.questionId === 'phq9_9')?.value ?? 0;
    const suicideRisk = item9 >= 1;
    const crisisRisk = item9 >= 2 || rawScore >= 20;

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
        suicideRisk,
        crisisRisk,
        recommendFollowUp: rawScore >= 10 || suicideRisk,
      },
    };
  },
};
