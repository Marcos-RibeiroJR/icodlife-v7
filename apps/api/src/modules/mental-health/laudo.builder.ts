// apps/api/src/modules/mental-health/laudo.builder.ts
// Geração dos laudos em texto: individual (por escala) e consolidado (centralizado, todas as escalas).

import { ScaleDefinition, ScoringResult } from './scales';

const COLOR_ICON: Record<string, string> = {
  green: '🟢', yellow: '🟡', orange: '🟠', red: '🔴',
};

function fmtDate(d: Date): string {
  return new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export interface AssessmentSummary {
  scaleCode: string;
  scaleName: string;
  categoryLabel: string;
  rawScore: number | null;
  normalizedScore: number | null;
  severity: string | null;
  severityLabel: string;
  color: string;
  interpretation: string;
  createdAt: Date;
  flags?: Record<string, any> | null;
}

/** Laudo individual de uma aplicação de escala. */
export function buildIndividualLaudo(
  scale: ScaleDefinition,
  result: ScoringResult,
  meta: { appliedBy: string; when: Date; patientName?: string; sector?: string; role?: string },
): string {
  const L: string[] = [];
  L.push(`LAUDO DE TRIAGEM — SAÚDE MENTAL`);
  L.push(`Instrumento: ${scale.name} (v${scale.version})`);
  L.push(`Categoria: ${scale.categoryLabel}`);
  if (meta.patientName) L.push(`Paciente: ${meta.patientName}`);
  L.push(`Aplicação: ${meta.appliedBy === 'clinician' ? 'aplicado por profissional' : 'autoaplicado'} · ${fmtDate(meta.when)}`);
  if (meta.sector || meta.role) L.push(`Contexto: ${[meta.role, meta.sector].filter(Boolean).join(' — ')}`);
  L.push(`Referência temporal: ${scale.timeframe}`);
  L.push('');

  // Bloco de segurança sempre no topo, quando houver risco.
  if (result.flags?.suicideRisk) {
    L.push(`⚠️ ALERTA DE SEGURANÇA — SINAL DE IDEAÇÃO SUICIDA`);
    L.push(`Foi identificada indicação de pensamentos de morte/autolesão. Recomenda-se avaliação clínica ` +
           `IMEDIATA e acionamento da rede de apoio. Recursos: CVV 188 (24h), SAMU 192, emergência mais próxima.`);
    L.push('');
  } else if (result.flags?.crisisRisk) {
    L.push(`⚠️ ATENÇÃO — SOFRIMENTO SIGNIFICATIVO`);
    L.push(`Resultado indica sofrimento relevante; sugere-se avaliação profissional em breve. Apoio: CVV 188 (24h).`);
    L.push('');
  }

  L.push(`RESULTADO`);
  L.push(`Escore bruto: ${result.rawScore}/${result.rawMax}  ·  Escore normalizado: ${result.normalizedScore}/100`);
  L.push(`Classificação: ${COLOR_ICON[result.color] ?? ''} ${result.severityLabel}`);
  L.push(`Interpretação: ${result.interpretation}`);

  if (result.subscores?.length) {
    L.push('');
    L.push(`SUBESCALAS`);
    for (const s of result.subscores) {
      L.push(`• ${s.label}: ${s.normalizedScore}/100 ${COLOR_ICON[s.color] ?? ''} ${s.severityLabel} — ${s.interpretation}`);
    }
  }

  L.push('');
  L.push(`O QUE ESTE INSTRUMENTO AVALIA`);
  L.push(result.detects.map(d => `• ${d}`).join('\n'));

  L.push('');
  L.push(`RECOMENDAÇÕES`);
  L.push(...buildRecommendations(scale, result).map(r => `• ${r}`));

  L.push('');
  L.push(`ATRIBUIÇÃO: ${scale.attribution}`);
  L.push(`AVISO: ${scale.disclaimer}`);

  return L.join('\n');
}

function buildRecommendations(scale: ScaleDefinition, result: ScoringResult): string[] {
  const recs: string[] = [];
  if (result.flags?.suicideRisk) {
    recs.push('Encaminhamento clínico imediato e acionamento da rede de apoio/emergência.');
  }
  if (result.flags?.recommendPHQ9) {
    recs.push('Aplicar o PHQ-9 para rastreio complementar de depressão.');
  }
  if (result.flags?.recommendFollowUp) {
    recs.push('Encaminhar para avaliação com profissional de saúde (médico e/ou psicólogo).');
    recs.push('Reavaliar com o mesmo instrumento em 2–4 semanas para acompanhar a evolução.');
  } else {
    recs.push('Manter hábitos protetivos (sono, atividade física, suporte social) e reavaliação periódica.');
  }
  recs.push('Este resultado é de rastreio e não substitui avaliação clínica individual.');
  return recs;
}

/** Laudo consolidado — visão centralizada com a última aplicação de cada escala. */
export function buildConsolidatedLaudo(
  items: AssessmentSummary[],
  meta: { patientName?: string; when: Date },
): string {
  const L: string[] = [];
  L.push(`LAUDO CONSOLIDADO DE SAÚDE MENTAL`);
  if (meta.patientName) L.push(`Paciente: ${meta.patientName}`);
  L.push(`Emitido em: ${fmtDate(meta.when)}`);
  L.push(`Escalas consideradas: ${items.length} (última aplicação de cada instrumento)`);
  L.push('');

  const anySuicide = items.some(i => i.flags?.suicideRisk);
  const anyCrisis = items.some(i => i.flags?.crisisRisk);
  if (anySuicide) {
    L.push(`⚠️ ALERTA DE SEGURANÇA — SINAL DE IDEAÇÃO SUICIDA em uma ou mais avaliações.`);
    L.push(`Avaliação clínica IMEDIATA recomendada. Recursos: CVV 188 (24h), SAMU 192.`);
    L.push('');
  } else if (anyCrisis) {
    L.push(`⚠️ ATENÇÃO — sofrimento significativo em uma ou mais avaliações. Apoio: CVV 188 (24h).`);
    L.push('');
  }

  L.push(`PANORAMA POR CATEGORIA`);
  for (const i of items) {
    const icon = COLOR_ICON[i.color] ?? '';
    const score = i.normalizedScore != null ? `${i.normalizedScore}/100` : '—';
    L.push(`• ${i.categoryLabel} — ${i.scaleName}: ${icon} ${i.severityLabel} (${score}) · ${fmtDate(i.createdAt)}`);
  }

  const attention = items.filter(i => ['orange', 'red'].includes(i.color));
  L.push('');
  L.push(`SÍNTESE`);
  if (attention.length) {
    L.push(`Áreas que requerem atenção: ${attention.map(a => a.categoryLabel).join(', ')}.`);
    L.push(`Recomenda-se avaliação profissional integrada e plano de acompanhamento.`);
  } else {
    L.push(`Nenhuma área em nível alto/crítico nas últimas aplicações. Manter monitoramento periódico.`);
  }

  L.push('');
  L.push(`AVISO: triagem de rastreio — não substitui avaliação clínica individual. ` +
         `Instrumentos de uso livre, aplicados com atribuição aos autores originais.`);

  return L.join('\n');
}
