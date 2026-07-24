// apps/api/src/modules/clinic/esocial/tabela24-riscos.ts
// Tabela 24 do eSocial (Agentes Nocivos e Atividades — Aposentadoria Especial).
// A tabela oficial completa tem ~150 códigos e é mantida pelo governo; para não
// arriscar gravar um código incorreto num evento com efeito jurídico/fiscal,
// mantemos aqui apenas o código de "ausência de risco" (confirmado em fontes
// oficiais) como atalho de UI. Para qualquer risco real, o código deve ser
// digitado pela clínica a partir da Tabela 24 vigente (MoS do eSocial).
export const TABELA24_SEM_RISCO = {
  code: '09.01.001',
  description: 'Ausência de fator de risco ou atividades previstas no Anexo IV do Decreto 3.048/1999',
};

export interface RiskFactorEsocial {
  code: string;
  description: string;
  epiEffective: boolean;
  epiCA?: string;
  startDate?: string;
}
