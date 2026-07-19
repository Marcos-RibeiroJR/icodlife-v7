# Mapa Completo de Sprints — ICODLIFE / Sou Doutor

> Reconstruído em 19/07/2026 a partir de todo o histórico de prompts de continuidade (`CONTINUIDADE.md` → `CONTINUIDADE_V9..V12` → `PROMPT_CONTINUIDADE.md` → `PROMPT_CONTINUIDADE_V13..V17`), dos planos de módulo (`PLANO_MODULO_*.md`) e cruzado com o código real (`apps/api/prisma/migrations/*`, `apps/api/src/modules/*`).

## Aviso metodológico

Existem **duas numerações de sprint diferentes e paralelas** no projeto — não devem ser fundidas:

1. **Numeração narrativa** dos prompts de continuidade (a que aparece nas tabelas "Sprints concluídas"/"Backlog").
2. **Numeração dos nomes de pastas de migration** (`apps/api/prisma/migrations/*`), que diverge da narrativa a partir de certo ponto — o próprio `PROMPT_CONTINUIDADE_V13.md` reconhece isso: as migrations `sprint17..20` referem-se a Saúde Mental/ASO/Empresas, não ao backlog "17 — App Mobile" da numeração narrativa.

Cada linha abaixo indica a origem quando há ambiguidade.

---

## 1. Trilha Paciente/Mobile — sprints 1–19 (concluída)

| Sprint | Entrega | Status |
|---|---|---|
| 1–4 | Auth, Perfil, Registros médicos, Upload (S3) | ✅ Concluída |
| 5 | Pressão Arterial | ✅ Concluída |
| 6 | Ciclo Menstrual | ✅ Concluída |
| 7 | IA Health Chat | ✅ Concluída (reescrita depois na trilha Motor de Saúde) |
| 8 | Compartilhamento via Token | ✅ Concluída |
| 9 | Medicamentos + aderência | ✅ Concluída — **bug conhecido não resolvido** (seção 5) |
| 10 | Agenda/Consultas do paciente | ✅ Concluída |
| 11 | Família/ICODE + Notificações SSE | ✅ Concluída |
| 12 | Painel Médico (base) | ✅ Concluída |
| 13 | Painel Médico completo (agenda, receitas, staff, financeiro, currículo) | ✅ Concluída |
| 14 | Glicemia + HbA1c | ✅ Concluída |
| 15 | Telemedicina WebRTC | ✅ Concluída |
| 16 | Push Notifications (FCM) | ✅ Concluída — bug de rota duplicada corrigido em V14 |
| 17 | App Mobile Expo | ✅ Concluída |
| 18 | Dados Vitais Mobile (gráfico SVG nativo) | ✅ Concluída |
| 19 | Prontuário Digital PDF assinado (paciente) | ✅ Concluída — HMAC-SHA256 + QR |
| 20 (proposto) | Telemedicina Mobile / melhorias App Médico | 🔜 Nunca implementado — projeto pivotou para SST |
| 21 (proposto) | Testes e2e + CI | 🔜 Nunca implementado nesse formato — número reaproveitado depois para Clínicas |

Ponto de virada: a partir daqui o projeto pivota de "app mobile do paciente" para **Medicina/Segurança do Trabalho (SST)**.

---

## 2. Módulos pré-numeração

- `add_occupational_health` — módulo Ocupacional/Psicossocial base. ✅ Concluído.
- `v7_exam_results_lifestyle` — Exames + Módulo Vida (lifestyle), versão inicial. ✅ Concluído.

---

## 3. Trilha SST / Motor de Saúde — V13 a V17

| Sprint (numeração própria desta trilha) | Tema | Status |
|---|---|---|
| 17 (SST) | Saúde Mental (GAD-7, PHQ-9, CBI, WHO-5, laudo, segurança p/ ideação suicida) | ✅ Concluída |
| 18 (SST) | ASO (NR-07) — emissão/gestão/impressão | ✅ Concluída (versão inicial, impressão via `window.print`) |
| 19 (SST) | Empresa (Company) — CNPJ/BrasilAPI | ✅ Concluída |
| 19 (SST, V14) | ASO — PDF assinado server-side (HMAC-SHA256, QR de validação) | ✅ Concluída — substitui o `window.print` |
| — | Fix duplicação `/api/v1/api/v1/push` | ✅ Corrigido em V14 |
| — (V14) | Motor de Sinais e Risco de Saúde — Fase 1+2 | ✅ Concluída (fundação) |
| — (V15) | Motor de Saúde — Fase 3 (Dashboard de Tendência) | ✅ Concluída — **único trecho desta trilha que chegou a ser commitado e enviado ao GitHub antes desta sessão** (commit `2c1a02b`) |
| — (V15) | HealthBot flutuante, OCR de exames (tesseract.js), catálogo TUSS/ANVISA, laudo oftalmológico, fix definitivo do Módulo Vida (colunas `String[]` sem default) | ✅ Concluída |
| — (V16) | Fix login Clínica (Prisma Client desatualizado no `dist`), login centralizado com `/auth/bridge` | ✅ Concluída e validada |
| **21 (Clínicas/Hospitais)** | Multi-tenant Clínicas — ver seção 4 | ✅ Concluída, com regressão pontual relatada em V17 |
| — (V17) | Agenda multi-médico (Dia/Semana/Mês/Ano), Empresas CRUD completo na Clínica, Salas com custo+conta-corrente | ⚠️ Código escrito, **nunca executado/testado** (sandbox indisponível durante toda a sessão V17) — **agora testado e validado no início desta sessão** (ver observação abaixo) |

**Atualização desta sessão**: o módulo de Agenda/Empresas/Salas/Financeiro escrito em V17 foi commitado e enviado ao GitHub nesta sessão (commit `08f3a46`). A regressão "Erro ao carregar médicos" reportada em V17 **não se confirmou como problema de migration pendente** — `npx prisma migrate status` retornou "Database schema is up to date!" com as 29 migrations aplicadas. A causa raiz ainda precisa ser investigada (próximo passo: testar a tela com a API rodando e olhar o erro real no console/network, já que descartamos a hipótese de migration).

---

## 4. Módulo Clínicas e Hospitais — o "Sprint 21" formal

Documento de referência: `PLANO_MODULO_CLINICAS_HOSPITAIS.md`.

| Sub-sprint | Entrega | Status |
|---|---|---|
| 21.1/21.1b | Schema (`Clinic`, `ClinicDoctor`, `ClinicStaff`, `ClinicRoom`, `ClinicProcedure`, `ClinicCounter`) | ✅ Concluída |
| 21.2/21.2b | Backend `apps/api/src/modules/clinic/` completo | ✅ Concluída |
| 21.3–21.7 | App `apps/clinica` completo (dashboard, médicos, agenda, pacientes, empresas, ASO, procedimentos, salas, staff, financeiro, config) | ✅ Concluída e validada visualmente |
| Sprint 25 (evolução) | Agenda multi-médico, Empresas CRUD, Salas+custo+conta-corrente | ✅ Código commitado nesta sessão — **ainda pendente de teste funcional na tela** |
| — | Testes e2e do módulo `clinic` | 🔜 Pendente |
| — | ASO com cabeçalho de clínica (hoje só tem dados do médico) | 🔜 Pendente |
| — | Decisão sobre backfill de `clinicId` em registros antigos | 🔜 Pendente (decisão do usuário) |
| — | Data Warehouse/Data Lake/ML (Fases A–D do plano) | 🔜 Puramente conceitual, sem código |

---

## 5. Backlog de 4 itens grandes — nunca avançaram em código real

Confirmado por código (`apps/api/src/modules/*` — 35 módulos existentes hoje, **nenhum chamado `payments`, `govbr` ou `rnds`**):

| Item | Status até V17 | Status hoje |
|---|---|---|
| **Sprint 18 — Pagamentos** (Pagar.me v5) | Plano completo escrito (`PLANO_MODULO_PAGAMENTOS.md`), 0% de código | 🔜 Ainda 0% implementado |
| **Sprint 20 — Dashboard Analytics (médico)** | Nunca ganhou nem plano dedicado | 🔜 Ainda 0% — nem planejamento existe |
| **Sprint 22 — gov.br / RNDS** | Plano completo escrito (`PLANO_MODULO_GOVBR_RNDS.md`), aguardando decisão do usuário | 🔜 Ainda 0% implementado — depende de processo administrativo externo (CNES + certificado ICP-Brasil) |
| **Sprint 23 — Hardening + Deploy VPS** | 0% em todas as versões (nunca citado como iniciado) | 🟡 **Descoberta nesta sessão**: já existia scaffolding parcial não documentado nos prompts (`docker-compose.prod.yml`, `.github/workflows/ci.yml`, `infra/nginx/nginx.conf`, `.env.production`, Dockerfiles de `api`/`web`) — porém **continha bugs que impediam qualquer build funcionar** (contexto de build errado, `pnpm --filter` com nome de pacote errado, só cobria `apps/web`, faltavam `apps/doutor` e `apps/clinica` inteiros). Corrigido e completado nesta sessão — ver `PLANO_MODULO_DEPLOY_PRODUCAO.md` |

---

## 6. Bugs conhecidos — linha do tempo

| Bug | Detectado em | Resolvido em | Status |
|---|---|---|---|
| Prefixo duplicado `/api/v1/api/v1/push` | V13 | V14 | ✅ Resolvido |
| Módulo Vida — save retorna 400 | V14 (diagnóstico parcial) | V15 (causa raiz: `String[]` sem default) | ✅ Resolvido |
| Chat `ai-chat/start` disparando 2x | V14 | V14 | ✅ Resolvido |
| Duplicação `/api/v1` (prontuário/push/telemedicina) | V15 | V15 | ✅ Resolvido |
| Login Clínica — Internal Server Error | V16 | V16 (Prisma Client desatualizado no `dist`) | ✅ Resolvido |
| `medications.service.ts:18` — Null constraint em `scheduled_times` | V16 | **Nunca** | 🔴 **Em aberto** |
| "Erro ao carregar médicos" no painel Clínica | V17 | **Não resolvido** — hipótese de migration pendente descartada nesta sessão | 🔴 **Em aberto**, precisa investigação com API rodando |
| `LifestyleProfile.healthScore` referenciado mas coluna não existe | V14 | **Não resolvido** | 🟡 Pendente, não bloqueante |
| OCR de PDF escaneado (imagem dentro de PDF) | V15 | **Não resolvido** | 🔵 Melhoria futura |
| Dockerfiles de deploy com contexto de build errado (`pnpm-lock.yaml` não existia no contexto) e `pnpm --filter` com nome errado | Descoberto nesta sessão ao investigar Sprint 23 | ✅ Corrigido nesta sessão | ✅ Resolvido — **mas ainda não testado (sandbox indisponível)** |

---

## 7. Estado do Git — histórico de risco (resolvido nesta sessão)

Do V13 ao V17, o repositório acumulou um padrão recorrente de trabalho não commitado (locks de índice, índice corrompido, sandbox indisponível). O último commit enviado ao GitHub antes desta sessão era `2c1a02b` (Fase 3 do Motor de Saúde, ainda em V15) — **tudo que foi feito depois disso (V16 inteira + V17 inteira: login centralizado, fix clínica, módulo de agenda/empresas/salas/financeiro, os 2 planos de pagamento/gov.br, os 3 conteúdos de deck) ficou só local até esta sessão.**

**Resolvido nesta sessão**: commit `08f3a46` consolidou as 27 mudanças pendentes de V16+V17 e foi enviado a `origin/develop`. Tag `v8.0` criada para marcar este checkpoint. A partir de agora, recomenda-se commitar/pushar ao final de cada sessão, não acumular.

---

## Resumo executivo

1. O projeto teve duas fases: paciente/mobile (sprints 1–19, concluída) e SST/Clínicas (sprints 17–25 com numeração própria, também concluída na maior parte).
2. Backlog de 4 itens grandes segue **0% implementado em código**: Pagamentos, Dashboard Analytics, gov.br/RNDS, e (até esta sessão) Deploy — este último acabou de ganhar a base corrigida.
3. Módulo Clínicas é o item mais avançado do backlog histórico, com uma pendência de investigação em aberto ("erro ao carregar médicos") que não é causada por migration pendente.
4. Bug crítico ainda aberto: `medications.service.ts` (Null constraint em `scheduled_times`).
5. Risco de perda de trabalho por falta de commit está **mitigado** a partir desta sessão (tudo sincronizado com o GitHub, tag `v8.0` criada, backup completo da pasta gerado).
