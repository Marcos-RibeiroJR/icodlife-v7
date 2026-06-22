// apps/api/src/modules/occupational-health/psychosocial-questions.ts
// Banco de perguntas — Triagem de Riscos Psicossociais Ocupacionais (NR-01, item 1.5.1.6.2 / Portaria MTE 1.419/2024)
// Inspirado nas dimensões do COPSOQ III (versão validada no Brasil), JCQ (Karasek), ERI (Siegrist) e MBI (Maslach),
// organizado segundo as categorias de fatores indicadas pelo Guia do MTE para Gerenciamento de Riscos Ocupacionais.
//
// Escala de resposta (Likert 0–4): 0 Nunca · 1 Raramente · 2 Às vezes · 3 Frequentemente · 4 Sempre
// `reverse: true`  → item de fator PROTETIVO (ex.: autonomia, suporte). Frequência alta = risco BAIXO,
//                     por isso o escore de risco do item é invertido (4 - valor) antes de compor a categoria.
// `reverse: false` → item de fator de RISCO direto (ex.: sobrecarga, assédio). Frequência alta = risco ALTO.

export type PsychosocialCategory =
  | 'demandas_trabalho'        // 1. Exigências/demandas do trabalho (carga, ritmo, prazos)
  | 'organizacao_trabalho'     // 2. Organização do trabalho (autonomia, clareza de papel, participação)
  | 'conteudo_tarefa'          // 3. Conteúdo da tarefa (repetitividade, equilíbrio esforço-recompensa)
  | 'relacoes_suporte'         // 4. Relações interpessoais e suporte social
  | 'lideranca_gestao'         // 5. Qualidade da liderança e da gestão
  | 'assedio_violencia'        // 6. Assédio moral, sexual e violência no trabalho
  | 'inseguranca_mudanca'      // 7. Insegurança no emprego e gestão de mudanças
  | 'conflito_trabalho_vida'   // 8. Conflito trabalho-vida, jornada e desconexão digital
  | 'sintomas_bemestar';       // 9. Indicadores de bem-estar, estresse e exaustão (efeitos percebidos)

export interface PsychosocialQuestion {
  id: string;
  category: PsychosocialCategory;
  text: string;
  reverse: boolean;
}

export const CATEGORY_LABELS: Record<PsychosocialCategory, string> = {
  demandas_trabalho:      'Exigências e Demandas do Trabalho',
  organizacao_trabalho:   'Organização do Trabalho e Autonomia',
  conteudo_tarefa:        'Conteúdo da Tarefa e Esforço-Recompensa',
  relacoes_suporte:       'Relações Interpessoais e Suporte Social',
  lideranca_gestao:       'Qualidade da Liderança e Gestão',
  assedio_violencia:      'Assédio Moral, Sexual e Violência no Trabalho',
  inseguranca_mudanca:    'Insegurança no Emprego e Mudanças Organizacionais',
  conflito_trabalho_vida: 'Conflito Trabalho-Vida e Jornada',
  sintomas_bemestar:      'Indicadores de Bem-Estar e Exaustão',
};

// Referência normativa exibida no laudo, por categoria
export const CATEGORY_NR01_REF: Record<PsychosocialCategory, string> = {
  demandas_trabalho:      'NR-01, item 1.5.1.6.2 — fatores relativos às exigências do trabalho',
  organizacao_trabalho:   'NR-01, item 1.5.1.6.2 — fatores relativos à organização do trabalho',
  conteudo_tarefa:        'NR-01, item 1.5.1.6.2 — conteúdo e desenho das tarefas',
  relacoes_suporte:       'NR-01, item 1.5.1.6.2 — relações socioprofissionais',
  lideranca_gestao:       'NR-01, item 1.5.1.6.2 — qualidade da liderança e gestão de pessoas',
  assedio_violencia:      'NR-01, item 1.5.1.6.2 — violência, assédio moral e sexual no trabalho',
  inseguranca_mudanca:    'NR-01, item 1.5.1.6.2 — insegurança no emprego e gestão de mudanças',
  conflito_trabalho_vida: 'NR-01, item 1.5.1.6.2 — equilíbrio trabalho-vida e jornada',
  sintomas_bemestar:      'NR-01 + NR-17 — indicadores de efeito (a correlacionar com o PCMSO)',
};

export const PSYCHOSOCIAL_QUESTIONS: PsychosocialQuestion[] = [
  // 1. Demandas de trabalho ────────────────────────────────────────────────
  { id: 'd01', category: 'demandas_trabalho', text: 'Tenho que trabalhar muito rápido para cumprir minhas tarefas.', reverse: false },
  { id: 'd02', category: 'demandas_trabalho', text: 'Recebo mais tarefas do que consigo concluir dentro do meu horário de trabalho.', reverse: false },
  { id: 'd03', category: 'demandas_trabalho', text: 'Os prazos que recebo são incompatíveis com o tempo necessário para realizar o trabalho com qualidade.', reverse: false },
  { id: 'd04', category: 'demandas_trabalho', text: 'Preciso lidar com várias demandas urgentes e contraditórias ao mesmo tempo.', reverse: false },
  { id: 'd05', category: 'demandas_trabalho', text: 'Preciso esconder ou controlar minhas emoções diante de clientes, pacientes ou colegas, mesmo me sentindo mal.', reverse: false },
  { id: 'd06', category: 'demandas_trabalho', text: 'Sinto que tenho recursos (tempo, pessoal, equipamentos) insuficientes para realizar bem o meu trabalho.', reverse: false },

  // 2. Organização do trabalho ─────────────────────────────────────────────
  { id: 'o01', category: 'organizacao_trabalho', text: 'Tenho liberdade para decidir como organizar minhas próprias tarefas.', reverse: true },
  { id: 'o02', category: 'organizacao_trabalho', text: 'Sou consultado(a) sobre decisões que afetam diretamente o meu trabalho.', reverse: true },
  { id: 'o03', category: 'organizacao_trabalho', text: 'Sei exatamente o que se espera de mim no meu cargo.', reverse: true },
  { id: 'o04', category: 'organizacao_trabalho', text: 'Recebo instruções contraditórias de diferentes superiores sobre como fazer meu trabalho.', reverse: false },
  { id: 'o05', category: 'organizacao_trabalho', text: 'Minha escala ou rotina de trabalho muda de forma imprevisível, com pouca antecedência.', reverse: false },
  { id: 'o06', category: 'organizacao_trabalho', text: 'Tenho influência sobre o ritmo em que realizo minhas tarefas.', reverse: true },

  // 3. Conteúdo da tarefa ──────────────────────────────────────────────────
  { id: 'c01', category: 'conteudo_tarefa', text: 'Meu trabalho é repetitivo, monótono ou pouco desafiador.', reverse: false },
  { id: 'c02', category: 'conteudo_tarefa', text: 'Sinto que o esforço que dedico ao trabalho é proporcional ao reconhecimento e às recompensas que recebo.', reverse: true },
  { id: 'c03', category: 'conteudo_tarefa', text: 'Meu trabalho me dá oportunidade de desenvolver novas habilidades.', reverse: true },
  { id: 'c04', category: 'conteudo_tarefa', text: 'Sinto que minhas tarefas têm sentido e contribuem para algo importante.', reverse: true },
  { id: 'c05', category: 'conteudo_tarefa', text: 'Executo tarefas abaixo da minha qualificação, o que me deixa entediado(a) ou desmotivado(a).', reverse: false },
  { id: 'c06', category: 'conteudo_tarefa', text: 'Tenho que realizar movimentos ou ações repetitivas por longos períodos sem pausas adequadas.', reverse: false },

  // 4. Relações interpessoais e suporte ────────────────────────────────────
  { id: 'r01', category: 'relacoes_suporte', text: 'Posso contar com o apoio dos meus colegas quando preciso.', reverse: true },
  { id: 'r02', category: 'relacoes_suporte', text: 'Existe um bom ambiente de cooperação na minha equipe.', reverse: true },
  { id: 'r03', category: 'relacoes_suporte', text: 'Sinto-me isolado(a) ou excluído(a) das interações no meu ambiente de trabalho.', reverse: false },
  { id: 'r04', category: 'relacoes_suporte', text: 'Ocorrem conflitos interpessoais frequentes na minha equipe sem mediação adequada.', reverse: false },
  { id: 'r05', category: 'relacoes_suporte', text: 'Sinto que sou tratado(a) com respeito pelos meus colegas de trabalho.', reverse: true },
  { id: 'r06', category: 'relacoes_suporte', text: 'Há comunicação clara e aberta entre os membros da minha equipe.', reverse: true },

  // 5. Liderança e gestão ───────────────────────────────────────────────────
  { id: 'l01', category: 'lideranca_gestao', text: 'Minha liderança direta me dá retorno (feedback) construtivo sobre o meu trabalho.', reverse: true },
  { id: 'l02', category: 'lideranca_gestao', text: 'Minha liderança reconhece e valoriza o trabalho bem feito.', reverse: true },
  { id: 'l03', category: 'lideranca_gestao', text: 'Sinto que sou tratado(a) de forma injusta pela liderança em relação a outros colegas.', reverse: false },
  { id: 'l04', category: 'lideranca_gestao', text: 'Minha liderança está disponível para ouvir quando tenho dificuldades no trabalho.', reverse: true },
  { id: 'l05', category: 'lideranca_gestao', text: 'As metas que recebo da liderança são definidas sem considerar minha capacidade real de entrega.', reverse: false },
  { id: 'l06', category: 'lideranca_gestao', text: 'Sinto medo de represálias ao expressar desacordo com decisões da liderança.', reverse: false },

  // 6. Assédio e violência ─────────────────────────────────────────────────
  { id: 'a01', category: 'assedio_violencia', text: 'Já fui alvo de humilhações, gritos ou comentários ofensivos no ambiente de trabalho.', reverse: false },
  { id: 'a02', category: 'assedio_violencia', text: 'Já recebi comentários, propostas ou contato físico de natureza sexual indesejados no trabalho.', reverse: false },
  { id: 'a03', category: 'assedio_violencia', text: 'Já fui perseguido(a) ou tive minhas tarefas sabotadas deliberadamente por colegas ou superiores.', reverse: false },
  { id: 'a04', category: 'assedio_violencia', text: 'Já sofri discriminação no trabalho por motivo de gênero, raça, idade, orientação sexual, religião ou deficiência.', reverse: false },
  { id: 'a05', category: 'assedio_violencia', text: 'Sinto que poderia relatar uma situação de assédio sem medo de retaliação.', reverse: true },
  { id: 'a06', category: 'assedio_violencia', text: 'Já presenciei episódios de violência verbal ou física no meu ambiente de trabalho.', reverse: false },

  // 7. Insegurança e mudanças ──────────────────────────────────────────────
  { id: 'i01', category: 'inseguranca_mudanca', text: 'Sinto insegurança quanto à estabilidade do meu emprego.', reverse: false },
  { id: 'i02', category: 'inseguranca_mudanca', text: 'Mudanças organizacionais (reestruturações, novos processos) são comunicadas com clareza e antecedência.', reverse: true },
  { id: 'i03', category: 'inseguranca_mudanca', text: 'Tenho medo de ser substituído(a) por automação, terceirização ou redução de quadro.', reverse: false },
  { id: 'i04', category: 'inseguranca_mudanca', text: 'Sinto que tenho oportunidades reais de crescimento ou desenvolvimento na empresa.', reverse: true },
  { id: 'i05', category: 'inseguranca_mudanca', text: 'Fico apreensivo(a) com a possibilidade de perder benefícios, função ou remuneração.', reverse: false },
  { id: 'i06', category: 'inseguranca_mudanca', text: 'Confio nas informações que a empresa transmite sobre o futuro do meu cargo.', reverse: true },

  // 8. Conflito trabalho-vida e jornada ────────────────────────────────────
  { id: 't01', category: 'conflito_trabalho_vida', text: 'Preciso responder mensagens ou e-mails de trabalho fora do meu horário, inclusive em folgas e férias.', reverse: false },
  { id: 't02', category: 'conflito_trabalho_vida', text: 'Minha jornada de trabalho prejudica meu tempo de descanso, sono ou convívio familiar.', reverse: false },
  { id: 't03', category: 'conflito_trabalho_vida', text: 'Consigo me desconectar mentalmente do trabalho quando estou fora do expediente.', reverse: true },
  { id: 't04', category: 'conflito_trabalho_vida', text: 'Faço horas extras com frequência além do previsto na minha jornada contratual.', reverse: false },
  { id: 't05', category: 'conflito_trabalho_vida', text: 'Tenho pausas e intervalos suficientes durante a jornada de trabalho.', reverse: true },
  { id: 't06', category: 'conflito_trabalho_vida', text: 'Sinto que o trabalho consome tempo que eu gostaria de dedicar a mim mesmo(a) ou à minha família.', reverse: false },

  // 9. Sintomas e bem-estar (indicadores de efeito) ────────────────────────
  { id: 's01', category: 'sintomas_bemestar', text: 'Tenho me sentido esgotado(a) ou sem energia por causa do trabalho.', reverse: false },
  { id: 's02', category: 'sintomas_bemestar', text: 'Tenho dificuldade para dormir por pensar em assuntos do trabalho.', reverse: false },
  { id: 's03', category: 'sintomas_bemestar', text: 'Tenho me sentido ansioso(a), tenso(a) ou irritado(a) com mais frequência por causa do trabalho.', reverse: false },
  { id: 's04', category: 'sintomas_bemestar', text: 'Sinto que perdi o entusiasmo ou o interesse pelo meu trabalho.', reverse: false },
  { id: 's05', category: 'sintomas_bemestar', text: 'Tenho sentido sintomas físicos (dor de cabeça, tensão muscular, problemas digestivos) que associo ao trabalho.', reverse: false },
  { id: 's06', category: 'sintomas_bemestar', text: 'No geral, sinto-me satisfeito(a) e bem com o meu trabalho.', reverse: true },
];

export const TOTAL_QUESTIONS = PSYCHOSOCIAL_QUESTIONS.length; // 54
