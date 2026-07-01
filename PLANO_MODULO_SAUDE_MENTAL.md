# Plano — Submódulo 1: Saúde Mental (Módulo Medicina do Trabalho)

> ICODELIFE / Sou Doutor · Documento de planejamento técnico
> Objetivo do submódulo: **detectar precocemente alterações emocionais antes que se tornem doenças**, aplicando escalas psicométricas reconhecidas, gerando um **laudo por teste** que é **armazenado no prontuário médico**.

---

## 1. Resumo executivo

O submódulo "Saúde Mental" segue exatamente o padrão que já existe no módulo `occupational-health` (banco de perguntas declarativo em TypeScript → motor de cálculo → laudo em texto → persistência em Prisma). A diferença é que aqui temos **múltiplas escalas independentes**, cada uma com sua própria pontuação e pontos de corte, agrupadas em **6 categorias**:

1. Ansiedade · 2. Depressão · 3. Burnout · 4. Estresse · 5. Qualidade do Sono · 6. Bem-estar

Cada escala vira um "teste" que o paciente/trabalhador responde; o sistema calcula o escore, classifica a gravidade, gera um laudo estruturado e grava tudo como um registro no prontuário. Há um mecanismo transversal de **segurança para ideação suicida** (PHQ-9 / inventários de depressão).

**Decisão-chave antes de codar:** nem todas as escalas listadas podem ser embutidas livremente no software — há questões de **direito autoral** e de **regulação do CFP/SATEPSI no Brasil**. A Seção 3 traz o veredito por escala e a recomendação de MVP.

---

## 2. Como se encaixa na arquitetura atual

O projeto já tem o molde ideal em `apps/api/src/modules/occupational-health/`:

- `psychosocial-questions.ts` → banco de itens declarativo (id, categoria, texto, reverse).
- `occupational-health.service.ts` → motor de cálculo + `buildLaudo()` + persistência.
- `occupational-health.controller.ts` → `GET questionnaire`, `GET/list`, `GET/:id`, `POST` respostas.
- Model Prisma `PsychosocialAssessment` (answers Json, score, riskLevel, aiAnalysis/laudo).

Vamos **replicar esse padrão**, mas generalizado para N escalas. Não é preciso reinventar nada — só parametrizar o motor de scoring por escala.

---

## 3. Licenciamento e regulação (LER ANTES DE IMPLEMENTAR)

Muitas escalas são **proprietárias** e/ou, no Brasil, classificadas como **teste psicológico de uso privativo do psicólogo** (Resolução CFP nº 31/2022 + sistema SATEPSI). Embutir os itens literais de um instrumento proprietário no app **sem licença é violação de direito autoral**. Além disso, instrumentos privativos não podem ser aplicados/interpretados fora do escopo do psicólogo.

Legenda: 🟢 uso livre (gratuito, com atribuição) · 🟡 licença gratuita mediante registro/uso não comercial · 🔴 proprietário/pago ou de uso restrito.

| Categoria | Escala | Itens | Licença / Restrição | Recomendação |
|---|---|---|---|---|
| Ansiedade | **GAD-7** | 7 | 🟢 Livre (Spitzer/Pfizer, sem taxa) | **Embutir (MVP)** |
| Ansiedade | Beck Anxiety Inventory (BAI) | 21 | 🔴 Pearson; CFP-privativo no BR | Não embutir itens; integrar via licença |
| Ansiedade | Hamilton Anxiety (HAM-A) | 14 | 🟢 Domínio público — **aplicada por clínico** | Embutir (uso clínico) |
| Depressão | **PHQ-9** | 9 | 🟢 Livre (Pfizer, sem taxa) | **Embutir (MVP)** |
| Depressão | Beck Depression Inventory II (BDI-II) | 21 | 🔴 Pearson; CFP-privativo no BR | Não embutir itens; integrar via licença |
| Depressão | Hamilton Depression (HAM-D/HDRS) | 17 | 🟢 Domínio público — **aplicada por clínico** | Embutir (uso clínico) |
| Burnout | Maslach (MBI) | 22 | 🔴 Mind Garden — **~US$2,50/aplicação** | Não embutir; licenciar se exigido |
| Burnout | Oldenburg (OLBI) | 16 | 🟡 Livre para pesquisa/uso não comercial | Embutir com atribuição |
| Burnout | **Copenhagen (CBI)** | 19 | 🟢 Livre (Kristensen, com citação) | **Embutir (MVP)** |
| Estresse | **Perceived Stress Scale (PSS-10)** | 10 | 🟢 Livre não comercial (Cohen) | **Embutir (MVP)** |
| Estresse | Escala de Estresse de Lipp (ISSL) | ~53 | 🔴 Pearson BR; CFP-privativo | Não embutir; requer psicólogo |
| Estresse | Holmes & Rahe (SRRS) | 43 eventos | 🔴 Licenciada (American Institute of Stress) | Avaliar licença |
| Sono | Pittsburgh (PSQI) | 19 | 🟡 Univ. Pittsburgh — licença gratuita não comercial | Embutir com licença gratuita |
| Sono | Epworth (ESS) | 8 | 🔴 Licença (MW Johns/Mapi), paga p/ comercial | Avaliar licença |
| Sono | Insomnia Severity Index (ISI) | 7 | 🔴 Copyright Morin, licença | Avaliar licença |
| Bem-estar | **WHO-5** | 5 | 🟢 Livre (OMS, sem taxa, com atribuição) | **Embutir (MVP)** |
| Bem-estar | PERMA Profiler | 23 | 🟡 Livre não comercial | Embutir com atribuição |
| Bem-estar | Escala de Felicidade Subjetiva (SHS) | 4 | 🟡 Livre para pesquisa | Embutir com atribuição |

> **Nota importante sobre o Brasil:** como isto está no módulo de **medicina do trabalho**, o público-alvo pode incluir aplicação por médico. Escalas de rastreio de uso médico consolidado (GAD-7, PHQ-9, WHO-5, PSS, PSQI) são amplamente usadas por médicos e serviços de saúde. Já instrumentos **privativos do psicólogo** (BAI, BDI-II, ISSL/Lipp) só devem ser aplicados/interpretados por psicólogo registrado. Recomendo validar o fluxo com o responsável técnico (médico do trabalho + psicólogo) e, para instrumentos pagos, adquirir a licença antes de embutir os itens.

### 3.1 Recomendação de MVP (Fase 1) — apenas escalas 🟢
Implementar primeiro com as escalas de **uso livre**, que já cobrem as 6 categorias:
**GAD-7 · PHQ-9 · CBI · PSS-10 · (PSQI com licença gratuita) · WHO-5.**
As proprietárias entram na Fase 2, com a licença/integração adequada, sem reproduzir itens sem autorização.

---

## 4. Modelo de dados (Prisma)

Novo model genérico que serve para qualquer escala (evita criar uma tabela por teste). Segue o estilo de `PsychosocialAssessment`.

```prisma
model MentalHealthAssessment {
  id             String   @id @default(uuid())
  userId         String   @map("user_id")
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  scaleCode      String   @map("scale_code")     // ex.: "GAD7", "PHQ9", "CBI", "PSS10", "PSQI", "WHO5"
  category       String                          // "ansiedade" | "depressao" | "burnout" | "estresse" | "sono" | "bem_estar"
  version        String   @default("1.0")        // versão do instrumento/tradução usada

  answers        Json                            // [{ questionId, value }]
  rawScore       Float?   @map("raw_score")       // escore bruto do instrumento
  normalizedScore Float?  @map("normalized_score")// 0–100 para comparabilidade entre escalas
  subscores      Json?                            // subescalas (ex.: MBI/CBI/PERMA)
  severity       String?                          // "minima" | "leve" | "moderada" | "severa" | ...
  interpretation String?  @db.Text @map("interpretation") // LAUDO em texto

  flags          Json?                            // { suicideRisk: true, crisisRisk: true, ... }
  reviewedBy     String?  @map("reviewed_by")     // id do médico que validou (opcional)
  reviewedAt     DateTime? @map("reviewed_at")

  appliedBy      String   @default("self") @map("applied_by") // "self" | "clinician"
  createdAt      DateTime @default(now()) @map("created_at")

  @@index([userId, createdAt])
  @@index([userId, scaleCode])
  @@map("mental_health_assessments")
}
```

Migration: `npx prisma migrate dev --name sprintXX_mental_health` (lembrar da sequência de build da API: migrate deploy → generate → nest build → robocopy → node dist/src/main).

---

## 5. Estrutura de arquivos

```
apps/api/src/modules/mental-health/
  scales/
    index.ts                 # registry: mapa scaleCode -> definição da escala
    gad7.ts                  # definição + scoring + faixas (livre)
    phq9.ts                  # definição + scoring + item de ideação suicida
    cbi.ts                   # Copenhagen Burnout (3 subescalas)
    pss10.ts                 # Perceived Stress (itens reversos)
    psqi.ts                  # Pittsburgh (7 componentes) — sob licença gratuita
    who5.ts                  # WHO-5 (x4 -> 0..100)
    types.ts                 # ScaleDefinition, ScaleQuestion, ScoringResult
  mental-health.service.ts   # motor genérico: valida, pontua, gera laudo, persiste
  mental-health.controller.ts# endpoints REST
  mental-health.module.ts
  laudo.builder.ts           # geração do texto do laudo (por categoria)
  safety.service.ts          # detecção de risco (ideação suicida) + alerta

apps/web/src/app/saude-mental/          # paciente: lista de testes + responder + ver laudo
apps/doutor/src/app/saude-mental/       # médico: aplicar, revisar laudos, validar
```

### 5.1 Contrato da definição de escala (`types.ts`)
```ts
export type ScaleCategory = 'ansiedade'|'depressao'|'burnout'|'estresse'|'sono'|'bem_estar';

export interface ScaleQuestion {
  id: string;
  text: string;              // texto do item (apenas escalas de uso livre)
  reverse?: boolean;         // item invertido
  subscale?: string;         // p/ escalas multidimensionais
  isSafetyItem?: boolean;    // ex.: item 9 do PHQ-9 (ideação suicida)
}

export interface ScaleOption { value: number; label: string; }

export interface SeverityBand {
  min: number; max: number;  // faixa de escore
  severity: string;          // "leve" | "moderada" | ...
  label: string;             // rótulo exibível
  color: 'green'|'yellow'|'orange'|'red';
}

export interface ScaleDefinition {
  code: string;              // "GAD7"
  name: string;              // "GAD-7 — Transtorno de Ansiedade Generalizada"
  category: ScaleCategory;
  license: 'free'|'licensed'|'proprietary';
  attribution: string;       // crédito obrigatório
  timeframe: string;         // "últimas 2 semanas" etc.
  options: ScaleOption[];    // escala Likert
  questions: ScaleQuestion[];
  bands: SeverityBand[];     // pontos de corte sobre o rawScore
  subscales?: { key: string; label: string; bands: SeverityBand[] }[];
  score(answers: Answer[]): ScoringResult; // função de cálculo específica
}
```

O **motor genérico** no service só chama `definition.score(answers)`, aplica `bands`, roda o `safety.service`, monta o laudo e persiste. Adicionar uma nova escala = criar um arquivo em `scales/` e registrá-lo no `index.ts`.

---

## 6. Endpoints (REST)

Prefixo `mental-health`, protegido por `JwtAuthGuard` (mesmo estilo do occupational-health):

| Método | Rota | Descrição |
|---|---|---|
| GET | `/mental-health/scales` | Lista escalas disponíveis (código, nome, categoria, nº itens, licença) |
| GET | `/mental-health/scales/:code` | Retorna o questionário para renderizar o formulário |
| POST | `/mental-health/assessments/:code` | Envia respostas → calcula, gera laudo, persiste, retorna resultado |
| GET | `/mental-health/assessments` | Histórico do usuário (todas as escalas) |
| GET | `/mental-health/assessments/:id` | Um resultado + laudo completo |
| GET | `/mental-health/assessments/:id/pdf` | Laudo em PDF (usar skill/serviço de PDF já existente) |
| GET (médico) | `/mental-health/patients/:userId/assessments` | Médico vê laudos do paciente (autorização via `meus-medicos`) |
| POST (médico) | `/mental-health/assessments/:id/review` | Médico valida/assina o laudo |

---

## 7. Detalhamento por categoria (scoring e cortes)

> Abaixo estão **estruturas de pontuação e pontos de corte** (dados factuais dos instrumentos). Os **textos dos itens** só devem ser inseridos no código para escalas de **uso livre**; para as proprietárias, obter via licença. Nada de item literal proprietário no repositório sem autorização.

### 7.1 Ansiedade
- **GAD-7** 🟢 — 7 itens, resposta 0–3 (referência: últimas 2 semanas), total **0–21**.
  Faixas: 0–4 mínima · 5–9 leve · 10–14 moderada · 15–21 severa. Corte de rastreio ≥10.
  Detecta: ansiedade leve/moderada/severa. "Risco de crise" = escore severo + item(ns) de descontrole elevados → sinaliza encaminhamento.
- **HAM-A** 🟢 (aplicada por clínico) — 14 itens, 0–4, total **0–56**. <17 leve · 18–24 leve-moderada · 25–30 moderada-severa.
- **BAI** 🔴 — 21 itens, 0–3, total 0–63 (0–7 mínima · 8–15 leve · 16–25 moderada · 26–63 severa). Requer licença Pearson; privativo do psicólogo no BR.

### 7.2 Depressão
- **PHQ-9** 🟢 — 9 itens, 0–3, total **0–27**. 1–4 mínima · 5–9 leve · 10–14 moderada · 15–19 moderadamente severa · 20–27 severa. Corte ≥10.
  **Item 9 = ideação suicida** → gatilho de segurança (Seção 8). Detecta: humor deprimido, desesperança, fadiga, perda de interesse, ideação suicida.
- **HAM-D/HDRS** 🟢 (aplicada por clínico) — 17 itens, total **0–52**. 0–7 normal · 8–16 leve · 17–23 moderada · ≥24 severa.
- **BDI-II** 🔴 — 21 itens, 0–3, total 0–63 (0–13 · 14–19 · 20–28 · 29–63). Licença Pearson; privativo do psicólogo no BR. (Contém item de ideação suicida → mesmo gatilho de segurança quando licenciado.)

### 7.3 Burnout
- **CBI** 🟢 (recomendada p/ MVP) — 19 itens em 3 subescalas: burnout **pessoal** (6), **relacionado ao trabalho** (7), **relacionado ao cliente** (6). Respostas convertidas para escala **0–100** por subescala; média ≥50 indica burnout naquele domínio. Avalia: exaustão emocional/física e distanciamento.
- **OLBI** 🟡 — 16 itens, 2 dimensões (exaustão, distanciamento), Likert 1–4 (itens reversos). Uso livre para pesquisa/não comercial.
- **MBI** 🔴 — 22 itens (HSS), 3 subescalas: exaustão emocional, despersonalização/cinismo, realização pessoal (reversa), frequência 0–6. **~US$2,50/aplicação** (Mind Garden). Só embutir com licença.

### 7.4 Estresse
- **PSS-10** 🟢 — 10 itens, 0–4, com 4 itens reversos, total **0–40**. 0–13 baixo · 14–26 moderado · 27–40 alto. Avalia estresse percebido (geral; pode ser contextualizado para profissional/financeiro/familiar via metadados do formulário).
- **Holmes & Rahe (SRRS)** 🔴 — 43 eventos de vida com pesos (LCU). <150 baixo · 150–299 moderado (~50% risco de adoecer) · ≥300 alto (~80%). Licença via American Institute of Stress.
- **ISSL (Lipp)** 🔴 — modelo quadrifásico (alerta, resistência, quase-exaustão, exaustão). Pearson BR; **privativo do psicólogo**. Não embutir; aplicar via psicólogo.

### 7.5 Qualidade do Sono
- **PSQI** 🟡 — 19 itens autoaplicados → **7 componentes** (qualidade subjetiva, latência, duração, eficiência habitual, distúrbios, uso de medicação, disfunção diurna), cada 0–3; escore global **0–21**. **>5 = má qualidade de sono**. Licença gratuita não comercial (Univ. Pittsburgh).
- **ESS** 🔴 — 8 itens, 0–3, total **0–24**. ≥10–11 = sonolência diurna excessiva. Licença (MW Johns/Mapi), paga p/ comercial.
- **ISI** 🔴 — 7 itens, 0–4, total **0–28**. 0–7 ausente · 8–14 subclínica · 15–21 moderada · 22–28 severa. Copyright Morin, licença.

### 7.6 Bem-estar
- **WHO-5** 🟢 — 5 itens, 0–5, total bruto **0–25**, ×4 → **0–100**. ≤50 (bruto ≤13) = baixo bem-estar / rastreio positivo p/ depressão → sugerir PHQ-9. Livre com atribuição à OMS.
- **PERMA Profiler** 🟡 — 23 itens, escala 0–10, 5 domínios (Emoção positiva, Engajamento, Relacionamentos, Sentido, Realização) + emoção negativa/solidão/saúde. Uso livre não comercial.
- **SHS (Felicidade Subjetiva)** 🟡 — 4 itens, 1–7 (1 reverso), média 1–7. Uso livre para pesquisa.

---

## 8. Segurança clínica — ideação suicida (obrigatório)

Este é o ponto mais sensível e **não pode ser tratado só como "mais um escore"**.

- **Gatilho:** qualquer resposta > 0 no **item 9 do PHQ-9** (ou item de ideação do BDI-II, quando licenciado), ou escore de depressão severo.
- **Comportamento do sistema:**
  1. Marca `flags.suicideRisk = true` no registro.
  2. No laudo, insere bloco de **alerta destacado** no topo (não escondido no meio do texto).
  3. Exibe imediatamente ao paciente recursos de ajuda: **CVV — 188** (ligação gratuita, 24h) e orientação para procurar emergência/CAPS; nunca encerra a tela só com um número frio.
  4. Dispara **notificação ao médico responsável** (usar o `NotificationService`/SSE e o `PushService` já existentes) para revisão prioritária.
  5. Registra o evento para acompanhamento (auditoria via `audit.service`).
- **Tom:** o texto de risco deve ser acolhedor e direto, sem linguagem alarmista nem julgadora, e deve deixar claro que a triagem **não substitui avaliação profissional**.

> Esta triagem é de **rastreio**, não de diagnóstico. Todo laudo carrega disclaimer explícito e, em caso de risco, orienta encaminhamento humano.

---

## 9. Fluxo do laudo → prontuário

1. Paciente/médico abre `/mental-health/scales/:code` → responde.
2. `POST /mental-health/assessments/:code` → service valida completude (≥ mínimo de itens), roda `score()`, aplica `bands`, roda `safety.service`, chama `laudo.builder`, persiste `MentalHealthAssessment`.
3. O registro **é** o item de prontuário (aparece no histórico do paciente e nas visões de compartilhamento do `prontuario`/`share`). Incluir os laudos de saúde mental no nível **COMPLETE** do `prontuario.readByToken` (com opção de omitir por privacidade — dado sensível).
4. `GET /mental-health/assessments/:id/pdf` gera o laudo assinável (útil p/ PCMSO/atestados). Alinha com a Sprint 19 (Prontuário PDF assinado).

Estrutura sugerida do laudo (texto):
- Cabeçalho: instrumento, versão, atribuição/licença, data, quem aplicou.
- Escore bruto + escore normalizado (0–100) + classificação (com cor).
- Subescalas (quando houver).
- Interpretação clínica da faixa.
- **Bloco de risco** (se houver).
- Recomendações e encaminhamentos.
- Disclaimer clínico e de rastreio.

---

## 10. Roadmap de implementação

**Fase 0 — Fundação (1 sprint)**
- Model Prisma `MentalHealthAssessment` + migration.
- Módulo `mental-health` (module/controller/service) + `scales/` (types, registry).
- `laudo.builder` + `safety.service` + integração com `notifications`/`push`.

**Fase 1 — Escalas de uso livre / MVP (1–2 sprints)**
- GAD-7, PHQ-9 (com segurança), CBI, PSS-10, WHO-5, PSQI (licença gratuita).
- Front paciente (`apps/web/saude-mental`) e front médico (`apps/doutor/saude-mental`).
- Laudo em PDF.

**Fase 2 — Escalas clínicas aplicadas por médico (1 sprint)**
- HAM-A, HAM-D (domínio público, formulário de heteroaplicação pelo médico).

**Fase 3 — Escalas licenciadas/proprietárias (depende de contrato)**
- Após obter licença: MBI, BAI, BDI-II, ESS, ISI, Holmes-Rahe; ISSL/Lipp mediante psicólogo.
- Integração respeitando os termos (ex.: contagem de aplicações do MBI).

**Fase 4 — Inteligência e acompanhamento**
- Gráficos de evolução temporal por escala (reaproveitar `recharts`).
- Cruzamento com IA (`ai-chat`) para síntese longitudinal.
- Alertas de reavaliação periódica (usar tarefas agendadas).

---

## 11. Checklist de conformidade

- [ ] Não inserir itens literais de instrumentos proprietários sem licença.
- [ ] Registrar atribuição/licença de cada escala embutida.
- [ ] Validar com responsável técnico (médico do trabalho + psicólogo) o escopo de aplicação (CFP/SATEPSI).
- [ ] Bloco de segurança para ideação suicida testado (unit test do `safety.service`).
- [ ] Disclaimer de rastreio em todo laudo.
- [ ] Dados de saúde mental tratados como sensíveis (LGPD): consentimento, opção de ocultar no compartilhamento, auditoria de acesso.

---

## 12. Fontes consultadas
- CFP / SATEPSI — Resolução nº 31/2022 e diretrizes de avaliação psicológica: https://satepsi.cfp.org.br/ · https://satepsi.cfp.org.br/legislacao.cfm · https://satepsi.cfp.org.br/testesNaoPrivativos.cfm
- Mind Garden — licença/custo do MBI: https://www.mindgarden.com/117-maslach-burnout-inventory-mbi · https://www.mindgarden.com/maslach-burnout-inventory-mbi/765-mbi-license-to-administer.html
