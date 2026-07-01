// apps/api/src/modules/mental-health/scales/index.ts
// Registry de escalas do submódulo Saúde Mental.
// Para adicionar uma nova escala LIVRE: crie o arquivo em ./ e registre-o aqui.

import { ScaleDefinition } from './types';
import { GAD7 } from './gad7';
import { PHQ9 } from './phq9';
import { CBI } from './cbi';
import { WHO5 } from './who5';

export * from './types';

export const SCALES: Record<string, ScaleDefinition> = {
  [GAD7.code]: GAD7,
  [PHQ9.code]: PHQ9,
  [CBI.code]:  CBI,
  [WHO5.code]: WHO5,
};

export function getScale(code: string): ScaleDefinition | undefined {
  return SCALES[code?.toUpperCase()];
}

export function listScales() {
  return Object.values(SCALES).map(s => ({
    code: s.code,
    name: s.name,
    shortName: s.shortName,
    category: s.category,
    categoryLabel: s.categoryLabel,
    license: s.license,
    itemCount: s.questions.length,
    timeframe: s.timeframe,
    detects: s.detects,
  }));
}

/** Escalas agrupadas por categoria (para o front montar o catálogo). */
export function scalesByCategory() {
  const groups: Record<string, ReturnType<typeof listScales>> = {};
  for (const s of listScales()) {
    (groups[s.category] ??= []).push(s);
  }
  return groups;
}
