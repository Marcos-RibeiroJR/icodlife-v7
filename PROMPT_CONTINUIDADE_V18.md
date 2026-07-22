# Prompt de Continuidade — ICODLIFE / Sou Doutor (V18)
Cole o bloco da **Seção 2** como primeira mensagem na próxima sessão (outro Cowork). As demais seções são referência de progresso, pendências e roadmap.

---

## 1. Visão geral do progresso

### Entregue nesta jornada (V17 → V18)
Diferente da sessão V17 (sandbox indisponível o tempo todo), esta sessão teve sandbox Linux disponível na maior parte do tempo — deu pra rodar `pnpm install`, `tsc --noEmit`, testes de sintaxe e (parcialmente) git. **Limitação que se manteve o tempo todo**: o Prisma Query Engine gerado (`src/generated/prisma`) só tem binário Windows — rodar a API de verdade (banco/migrations/testes e2e reais) continua exigindo o Windows do usuário; `binaries.prisma.sh` segue bloqueado pelo allowlist de rede da sandbox.

| Área | O que ficou pronto |
|---|---|
| **Backup + Git/GitHub** | Backup completo gerado em `icodlife-v8` (snapshot congelado, tag `v8.0`, commit `a10bd52`). Corrigido bug real de configuração: branch padrão do GitHub estava em `master` (defasado), trocado para `develop`. A partir daqui, GitHub é a fonte de verdade — `icodlife-v8` não precisa ficar sincronizado. |
| **Mapa de sprints** | `MAPA_SPRINTS_COMPLETO.md` — reconstrução completa do histórico (sprints 1-19 paciente/mobile, trilha SST V13-V17, módulo Clínicas, backlog de 4 itens grandes, timeline de bugs). Documento vivo, atualizado a cada bug corrigido/sprint iniciada nesta sessão. |
| **Plano de deploy** | `PLANO_MODULO_DEPLOY_PRODUCAO.md` (Sprint 23) — plano completo (domínio, DigitalOcean SP, DNS, SSL, secrets do CI). Corrigidos 5 bugs reais e não documentados no scaffolding de deploy pré-existente: contexto de build errado nos Dockerfiles (`context: ./apps/X` sem lockfile), `pnpm --filter api\|web` nunca batia (precisa ser `--filter ./apps/api`), faltavam Dockerfiles inteiros de `apps/doutor`/`apps/clinica`, faltava `tsconfig.build.json` (dist saía em `dist/src/main.js` em vez de `dist/main.js`), bug de `Suspense` faltando em `psychosocial-assessment/page.tsx`. Deploy real (domínio/servidor pagos) **não executado** — depende do usuário registrar/pagar.
| **3 decks .pptx gerados** | `IcodLife_Pitch_Deck_Investidores_V2.pptx` (13 slides), `IcodLife_Apresentacao_Comercial.pptx` (11 slides), `IcodLife_Modelo_Negocio.pptx` (10 slides) — a partir dos `*_CONTEUDO.md` já prontos desde V17. QA visual completo (todos os slides lidos como imagem), bugs de overflow/contraste encontrados e corrigidos em 2 dos 3 decks. Content-QA via `markitdown` limpo. Arquivos já na raiz do repo. |
| **Módulo Clínicas — pendências fechadas** | Testes e2e completos (`apps/api/test/clinic.e2e-spec.ts`) cobrindo become-clinic-admin, médicos, salas, procedimentos, staff, agenda (+débito automático de sala), empresas, financeiro — **escritos e validados por sintaxe, mas nunca executados de fato** (mesmo bloqueio de Prisma engine Linux). ASO ganhou cabeçalho de clínica opcional (`Aso.clinicId` já existia no schema, só não era usado) — médico escolhe clínica emissora ao gerar o ASO, PDF mostra seção "Clínica/Estabelecimento Emissor" quando aplicável. |
| **3 bugs do backlog corrigidos** | (1) `medications.service.ts` — `scheduled_times` (NOT NULL sem default) nunca era preenchido no `create()`, causava 500 ao cadastrar medicamento; corrigido, e de brinde corrigido bug irmão (campo `frequency` gravado como JSON string mas nunca desserializado na leitura — tela de horários sempre mostrava o default). (2) `LifestyleProfile.healthScore` — referenciado em 4 telas do frontend mas nunca existiu como coluna; em vez de migrar o schema, passou a ser **calculado em tempo real** em `LifestyleService.computeHealthScore()` a partir dos campos já existentes (IMC, pressão, tabagismo, álcool, exercício, sono, estresse), usado em `/lifestyle` e no `trend-report`. (3) "Erro ao carregar médicos" — **continua em aberto**, ver Seção 4. |
| **Sprint 20 — Dashboard Analytics do médico (NOVA, do zero)** | Essa sprint nunca tinha nem planejamento. Criado `PLANO_MODULO_DASHBOARD_ANALYTICS.md` + implementado: backend novo módulo `apps/api/src/modules/doctor-analytics/` (endpoint único `GET /doutor/analytics/dashboard?months=N`, 100% derivado de dados já existentes — sem migration), frontend `apps/doutor/src/app/analytics/page.tsx` com KPIs, gráficos (recharts: barras de consultas, linha de receita, pizza de gênero, barras de faixa etária) e tabela de tipos de atendimento. Item novo no menu do Doutor. **`recharts` adicionado como dependência nova em `apps/doutor/package.json` — rodar `pnpm install` antes de testar.** |

### Estado do Git — commits feitos, mas com um padrão recorrente de lock travado
Diferente de V16/V17 (nada commitado a sessão toda), nesta sessão consegui commitar e (com ajuda do usuário rodando os comandos no PowerShell, já que a sandbox não tem credencial do GitHub) empurrar pro `origin/develop` várias vezes:
- `82c8a5d` — testes e2e do módulo clinic + ASO com cabeçalho de clínica
- `57e25d5` — fix medications.service.ts (scheduled_times) + healthScore calculado

**Recorrente a sessão toda**: `.git/index.lock` (ou `HEAD.lock`) trava sozinho depois de operações de escrita, e a sandbox Linux **não consegue removê-lo** (`rm`/`unlink` retorna "Operation not permitted" — é uma limitação do mount cross-OS Windows↔sandbox, não um bug do projeto). Sempre que isso acontece, só o usuário resolve, no PowerShell:
```powershell
Remove-Item .git\index.lock -Force
```
(às vezes precisa rodar 2x seguidas se o lock recriar. Depois só `git commit`/`git push` normalmente.)

**Pendente de commit nesta sessão (Sprint 20 inteira + este arquivo)** — já staged (`git add`) na sandbox, só falta o `git commit` (rodar no PowerShell):
```
MAPA_SPRINTS_COMPLETO.md                              (editado — histórico atualizado)
PLANO_MODULO_DASHBOARD_ANALYTICS.md                   (novo)
PROMPT_CONTINUIDADE_V18.md                             (novo — este arquivo, adicionar ao commit)
apps/api/src/app.module.ts                             (editado — registra DoctorAnalyticsModule)
apps/api/src/modules/doctor-analytics/                 (novo — módulo completo)
apps/doutor/package.json                               (editado — recharts)
apps/doutor/src/components/ui/DoctorShell.tsx           (editado — item de menu)
apps/doutor/src/lib/api.ts                              (editado — analyticsApi)
apps/doutor/src/app/analytics/page.tsx                  (novo — tela do dashboard)
```
Comando completo (PowerShell, raiz do projeto):
```powershell
Remove-Item .git\index.lock -Force
git add MAPA_SPRINTS_COMPLETO.md PLANO_MODULO_DASHBOARD_ANALYTICS.md PROMPT_CONTINUIDADE_V18.md apps/api/src/app.module.ts apps/api/src/modules/doctor-analytics/ apps/doutor/package.json apps/doutor/src/components/ui/DoctorShell.tsx apps/doutor/src/lib/api.ts apps/doutor/src/app/analytics/
git commit -m "Sprint 20: Dashboard Analytics do médico (backend + frontend); docs: prompt de continuidade V18"
git push origin develop
pnpm install
```
Não incluir `apps/clinica/next-env.d.ts` — só diferença de quebra de linha CRLF/LF, sem conteúdo real (aparece modificado sempre que o Windows re-normaliza o arquivo; pode ser ignorado ou revertido com `git checkout -- apps/clinica/next-env.d.ts`).

---

## 2. BLOCO DE CONTINUIDADE (colar na próxima sessão)
```
Continuando o desenvolvimento do monorepo ICODLIFE / Sou Doutor (Cowork/desktop).

STACK
- Monorepo pnpm workspaces (Node v24, pnpm v10)
- apps/api    -> NestJS, porta 3001, prefixo global /api/v1
- apps/web    -> Next.js 14, porta 3000 (paciente) — hub de login centralizado
- apps/doutor -> Next.js 14, porta 3002 (médico)
- apps/clinica-> Next.js 14, porta 3003 (clínica/hospital, multi-tenant)
- apps/mobile -> Expo React Native
- ORM: Prisma 5.22, client gerado em src/generated/prisma (import relativo ../../generated/prisma; NUNCA @prisma/client)
- Banco: PostgreSQL via Docker (container icodlife_postgres, porta 5434) + redis 6379
- GitHub: github.com/Marcos-RibeiroJR/icodlife-v7, branch padrão e ativa = develop, tag de checkpoint mais recente v8.0 (commit a10bd52) — HEAD atual do develop está bem à frente disso, ver "git log" pro commit exato.

COMO SUBIR
1) docker start icodlife_postgres icodlife_redis
2) apps/api:    cd apps/api && npx prisma migrate deploy && npx prisma generate  (OBRIGATÓRIO antes do dev)
3) apps/api:    pnpm dev   (porta 3001)
4) apps/web:    pnpm dev   -> localhost:3000
5) apps/doutor: pnpm install (recharts é dependência NOVA desta sessão) && pnpm dev -> localhost:3002
6) apps/clinica:pnpm dev   -> localhost:3003
- EADDRINUSE 3001: taskkill /IM node.exe /F, esperar 3s, subir de novo.

CREDENCIAIS DEMO (senha Demo@12345)
- Paciente: joao@demo.icodlife.com | ana@demo.icodlife.com
- Médico sócio: dr.marcos@demo.icodlife.com | Médica associada: dra.fernanda@demo.icodlife.com
- Admin clínica: clinica.centro@demo.icodlife.com | Recepção: recepcao.centro@demo.icodlife.com

AÇÃO IMEDIATA (fazer nesta ordem)
1. Confirmar que o commit da Sprint 20 foi feito e empurrado (ver Seção 1 — comandos prontos). Rodar `git log --oneline -5` e conferir se bate com origin/develop (`git rev-parse HEAD` == `git rev-parse origin/develop`).
2. cd apps/doutor && pnpm install  (recharts é novo, sem isso a tela /analytics quebra)
3. cd apps/api && npx prisma migrate status && npx prisma generate  (nenhuma migration nova desta sessão, mas confirmar mesmo assim)
4. Subir tudo (ver "COMO SUBIR") e testar:
   - Doutor > Dashboard Analítico (tela nova — KPIs, gráficos, filtro 3/6/12 meses)
   - Doutor > ASO > selecionar clínica emissora (se o médico estiver vinculado a alguma) e conferir o PDF gerado
   - Medicamentos (paciente) > cadastrar um medicamento com horários — não deve mais dar erro 500
   - Módulo Vida (paciente) > conferir se o "Score de Saúde" aparece calculado (antes ficava sempre "não calculado")
   - Clínica > Médicos — **ainda com o bug "Erro ao carregar médicos" em aberto** (ver abaixo, é a prioridade #1 de investigação)
5. Rodar de verdade os testes e2e escritos nesta sessão (nunca rodados por falta de engine Linux no ambiente anterior):
   cd apps/api && npm run test:e2e
   (precisa de um Postgres de teste configurado via DATABASE_URL no .env — o script já roda `prisma db push --force-reset` sozinho)

BUG PRIORITÁRIO EM ABERTO — "Erro ao carregar médicos" (painel Clínica)
3 rodadas de investigação estática nesta sessão (controller/service/schema, CORS, portas dos 3 apps, interceptor de token) não encontraram bug de código — tudo consistente. O padrão do erro (cai no texto genérico "Erro ao carregar médicos" em vez de mostrar a mensagem real do backend) só acontece quando `err.response` chega vazio/sem `message` no axios — aponta pra erro de rede/CORS intermitente ou 500 sem corpo, não pra um 4xx normal de permissão. PRÓXIMO PASSO OBRIGATÓRIO: abrir DevTools (F12) → aba Network na tela Clínica > Médicos, tentar carregar, e capturar o status HTTP + corpo (body) real da requisição GET /clinic/doctors. Sem esse dado, qualquer nova tentativa de diagnóstico estático vai só repetir o que já foi descartado.

QUIRKS CRÍTICOS (aprendidos, cumulativo — ler antes de mexer)
- PRISMA CLIENT DESATUALIZADO NO DIST: depois de `npx prisma generate`, copiar manualmente pro dist se rodar via build frio: Copy-Item -Recurse -Force src\generated\prisma dist\src\generated\prisma
- GIT INDEX/HEAD.lock TRAVA SOZINHO (NOVO nesta sessão, recorrente): toda vez que uma ferramenta externa mexe no .git a partir do ambiente Linux da sandbox, pode deixar um `.git/index.lock` ou `.git/HEAD.lock` travado que o Linux não consegue apagar (erro "Operation not permitted", mount cross-OS). Resolver sempre do lado Windows: Remove-Item .git\index.lock -Force (e HEAD.lock se aparecer) antes de qualquer git novo.
- Prisma Query Engine só existe compilado pra Windows no client gerado — testar a API de verdade (subir + banco + e2e) só funciona no Windows do usuário, nunca dentro da sandbox Linux (binaries.prisma.sh bloqueado por allowlist).
- ValidationPipe global (whitelist+forbidNonWhitelisted). Controllers sem DTO tipado usam @Body() dto: any de propósito (padrão do projeto) — não "corrigir" adicionando DTO tipado sem necessidade, quebra o padrão estabelecido.
- Colunas Prisma String[] são NOT NULL sem default -> no CREATE, sempre passar [] ou o array de verdade explicitamente (foi a causa raiz do bug de medications.service.ts nesta sessão — não presumir que Prisma aceita ausência do campo só porque o TS não reclama).
- `DoctorAppointment.status`: valores reais em uso são 'scheduled' | 'completed' | 'canceled' | 'no_show' (confirmado no frontend de agenda do doutor).
- `AsoService`/`CompanyService`/`DoctorFinanceiroService` são 100% `doctorId`-cêntricos via `getDoctor(userId)` — só funcionam com JWT de médico (role=doctor). Funcionalidade nova "da Clínica" que precise desses dados ganha método próprio dentro de `ClinicService` (ou, como no caso do ASO com clínica, o médico contínua sendo quem chama, só que agora pode indicar `clinicId` opcional).
- `Aso.clinicId` já existia no schema desde sempre mas nunca era populado — não presumir que campo ausente do fluxo = precisa de migration; conferir o schema primeiro.
- git: se "index file corrupt" -> Remove-Item .git\index ; git reset.

BACKLOG (atualizado nesta sessão)
- Sprint 18 — Pagamentos (Pagar.me): plano pronto em PLANO_MODULO_PAGAMENTOS.md, nada implementado.
- Sprint 20 — Dashboard Analytics: IMPLEMENTADO nesta sessão (ver acima). Fora de escopo por ora: comparação entre médicos, exportação em PDF, métricas por convênio.
- Sprint 22 — gov.br / RNDS: aguardando decisão do usuário, plano pronto em PLANO_MODULO_GOVBR_RNDS.md.
- Sprint 23 — Hardening + Deploy VPS: scaffolding corrigido e completo (PLANO_MODULO_DEPLOY_PRODUCAO.md), deploy real ainda não executado (domínio/servidor precisam ser pagos pelo usuário).
- Módulo Clínicas: só restam decisão sobre backfill de clinicId em registros antigos (decisão do usuário) e Data Warehouse/ML (conceitual).
- Bug medications.service.ts e LifestyleProfile.healthScore: RESOLVIDOS nesta sessão.
- Bug "Erro ao carregar médicos": EM ABERTO, prioridade #1 — ver seção acima.
```

---

## 3. Números de negócio coletados (não perder, inalterado desde V16)
| Item | Valor |
|---|---|
| Rodada | Seed |
| Captação | R$ 500.000 |
| Uso — Produto & Desenvolvimento | 45% (R$ 315.000) |
| Uso — Marketing & Aquisição | 18% (R$ 126.000) |
| Uso — Operações & Equipe | 15% (R$ 105.000) |
| Uso — Legal, DPO & LGPD | 12% (R$ 84.000) |
| Uso — Infraestrutura Cloud | 10% (R$ 70.000) |
| Plano SaaS Médico | R$ 99,00/mês |
| Plano SaaS Clínica | R$ 388,00/mês |
| Comissão marketplace (consulta) | 10% |
| Plano Premium Paciente | R$ 19,90/mês |

Nota: os 3 decks (`IcodLife_Pitch_Deck_Investidores_V2.pptx`, `IcodLife_Apresentacao_Comercial.pptx`, `IcodLife_Modelo_Negocio.pptx`) já foram gerados nesta sessão usando esses números — alguns pontos de projeção financeira (TAM/SAM/SOM, valuation) continuam marcados como "[completar]" no slide de projeções por decisão deliberada (não inventar número sem validação do usuário).

---

## 4. Pendências técnicas / a validar (nesta ordem de prioridade)
1. **Confirmar commit + push da Sprint 20** (comandos prontos na Seção 1) — sem isso, o trabalho desta sessão fica só local de novo, repetindo o risco histórico de V13-V17.
2. **Bug "Erro ao carregar médicos"** — capturar o erro real via DevTools Network (ver bloco acima). Prioridade #1 de investigação, 3 tentativas estáticas já descartaram código/CORS/porta.
3. `pnpm install` em `apps/doutor` (recharts) antes de testar a tela `/analytics`.
4. Rodar de verdade (no Windows, com banco disponível) os testes e2e do módulo `clinic` escritos nesta sessão — nunca executados.
5. Testar na tela as novidades desta sessão: Dashboard Analítico (doutor), ASO com clínica emissora, cadastro de medicamento (bug corrigido), Score de Saúde no Módulo Vida (bug corrigido).
6. Sprint 18 (Pagamentos) e Sprint 22 (gov.br/RNDS) — sem mudança, aguardando decisão/priorização do usuário.
7. Sprint 23 — deploy real (registrar domínio, provisionar servidor) — depende do usuário executar as etapas pagas do `PLANO_MODULO_DEPLOY_PRODUCAO.md`.
8. Decisão pendente do usuário: backfill de `clinicId` em registros antigos do módulo Clínicas.
