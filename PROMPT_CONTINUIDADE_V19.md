# Prompt de Continuidade — ICODLIFE / Sou Doutor (V19)
Cole o bloco da **Seção 2** como primeira mensagem na próxima sessão (outro Cowork). As demais seções são referência de progresso, pendências e roadmap.

---

## 1. Visão geral do progresso

### Entregue nesta jornada (V18 → V19)
Sessão inteira rodada em Cowork (não Claude Code), com pasta do projeto conectada diretamente — todo o
trabalho já está no disco do usuário, não precisa de "restore" de sandbox. Sandbox Linux disponível o tempo
todo para leitura/edição/processamento de imagem (Python/PIL funcionou bem), mas **sem** acesso de rede ao
`binaries.prisma.sh` (mesma limitação de sempre) e **sem** permissão de escrita de baixo nível no `.git` do
Windows montado (`rm`/`mv` em `.git/index.lock` retornam "Operation not permitted" — mesmo padrão já descrito
no V18, ver Quirks).

| Área | O que ficou pronto |
|---|---|
| **Novo logo (marca)** | Logo heart+pulso/"ICODELIFE" aplicada nos 4 apps (web, doutor, clínica, landing), com fundo branco removido (transparente) via processamento alpha por canal mínimo RGB. |
| **Carteirinha digital** | `apps/web/src/app/carteirinha` — cartão com logo, nome, tipo sanguíneo, doador de órgãos, ICODE + QR Code, botão "Baixar" (`html-to-image` → PNG). Item novo no menu do paciente. |
| **Cadastro único (iCODLIFE) unificado** | Endpoint `GET /clinic/users/search` + componente `IcodlifeUserPicker` reutilizado em 3 lugares da Clínica: Meus Funcionários (cadastro), Base de Consultas, e Atendimento/Guichê (paciente avulso) — evita cadastro duplicado entre os módulos. |
| **Financeiro da Clínica — filtros + cobrança automática** | Modelo novo `ClinicExamPrice` (preço por tipo de exame) + campos novos em `DoctorCashEntry` (`counterId`, `examType`, `serviceSessionId` único). Ao concluir atendimento no guichê com ASO, o sistema lança a cobrança sozinho (idempotente via `serviceSessionId` único). Filtros por sala/guichê/médico/exame no extrato (DRE, conta corrente, por médico). Tela de configuração de preços por exame. |
| **Cadastro de Doutor pelo login + plano da plataforma** | Botão "Cadastrar Doutor" na aba Doutor do login (`apps/web`). Cadastro em 3 passos no `apps/doutor/register` (dados → perfil → plano), com `PlatformPlan`/`platformPlanStatus` no schema (terreno pronto para cobrança futura, sem checkout real ainda). Ao finalizar, leva direto pro Currículo (`/profile`). |
| **2 bugs reais corrigidos no cadastro de Doutor** (relatados como "trava e não cria nada") | (1) Campo `specialties` no schema Zod exigia `min(1)` mas nunca era registrado via `react-hook-form` (só existia em estado local `selectedSpecs`) — `handleSubmit` falhava a validação silenciosamente e nunca chamava `onSubmit`. Corrigido: schema passou a `.optional()`, validação real já existia em `goStep3()`. (2) A função `login()` de `apps/doutor/src/lib/auth.ts` exige `role==='doctor'` — mas no fluxo de cadastro o usuário só vira doutor **depois** de `become-doctor`, então `login()` sempre lançava exceção e o passo 3 nunca era alcançado. Corrigido: `login()` (usado só na tela `/login` de verdade) foi separado de uma nova `authenticate()` (sem checagem de role, usada dentro do próprio fluxo de cadastro). |
| **`apps/landing` — site institucional novo (do zero)** | App Next.js novo, porta 3004, servido na raiz do domínio (`icodlife.com.br`) — diferente de web/doutor/clinica, que ficam em subdomínios. Landing criativa com hero animado (linha de batimento cardíaco em SVG), seção de cadastro único, os 3 módulos apresentados em zig-zag, grid de recursos, "como funciona", teaser de planos, CTA final. Sem dependência de libs pesadas (Tailwind + vanilla JS, scroll-reveal via IntersectionObserver). |
| **Infra/deploy — landing conectado ao pipeline** | `docker-compose.prod.yml` ganhou o serviço `landing`; `infra/nginx/nginx.conf` — bloco da raiz do domínio agora aponta pra `landing:3004` (antes apontava pra `web`), e um bloco novo `app.seudominio.com.br` foi criado pro portal do paciente (que perdeu a raiz); `.github/workflows/ci.yml` builda/publica/deploya `landing` junto dos outros 3 apps; CORS da API (`main.ts`) liberado pra `localhost:3004` e `www.icodlife.com.br`. |
| **Diagrama de arquitetura e banco de dados** | `ICODLIFE_Arquitetura_e_Banco_de_Dados.md` (Mermaid — visão geral + 6 diagramas ER por domínio de negócio, ~65 modelos do `schema.prisma` agrupados) e `ICODLIFE_Arquitetura_Alto_Nivel.svg` (infra: clientes → nginx → API → banco, desenhado à mão, sem dependência de ferramenta externa). |
| **Otimização de performance — assets de logo** | Investigação encontrou a causa concreta de lentidão percebida no Doutor/Clínica: `logo.svg`/`logo-dark.svg`/`logo-icon.svg`/`logo.png` carregavam um PNG bruto de 646×540px embutido em base64 (**330KB cada**), exibido a ~32-48px, em **toda página** dos 4 apps (sidebar, login, cadastro). Reprocessado (resize + quantização de cores preservando transparência) para ~19-20KB por arquivo — **94% menor**, sem perda visual perceptível (conferido visualmente antes/depois). Outros pontos checados e OK: Firebase só carrega na página de dashboard (não global), socket.io só em chat/telemedicina, `output: 'standalone'` presente nos 4 apps. **Observação importante passada ao usuário**: rodar em `pnpm dev` é sempre mais lento que produção (`next build && next start`) — parte da lentidão percebida pode ser só isso. |
| **`CHECKLIST_DEPLOY_PRODUCAO.md` (novo)** | Checklist completo e ordenado pra subir em domínio real: DNS, segredos/`.env.production`, certbot/SSL, ajuste do `nginx.conf` (placeholder `seudominio.com.br` → domínio real), migrations em produção, build/deploy via CI ou manual, firewall, smoke test pós-deploy, monitoramento, rollback, e uma seção final de pendências conhecidas antes de abrir pra usuários reais. |

### Estado do Git — nada commitado nesta sessão (mesmo padrão de risco do V13-V17)
A sandbox desta sessão **não tem** credencial do GitHub nem consegue mexer no `.git` (ver Quirks) — então,
diferente do V18 (que conseguiu commitar/empurrar com ajuda do usuário no PowerShell), **nesta sessão nada
foi commitado ainda**. Achei inclusive um `.git/index.lock` **já travado desde antes desta sessão começar**
(timestamp de 23/07, ~17h) — ou seja, o V18 pode ter deixado esse lock pra trás sem perceber. Antes de
qualquer `git add`, resolver isso primeiro no PowerShell:

```powershell
cd <raiz do projeto>
Remove-Item .git\index.lock -Force -ErrorAction SilentlyContinue
Remove-Item .git\HEAD.lock -Force -ErrorAction SilentlyContinue
```

**Arquivos novos/alterados nesta sessão, prontos pra commit** (lista completa — conferir com `git status`):
```
apps/web/public/logo*.{svg,png}  apps/web/public/logo-icon.svg           (marca + otimização)
apps/doutor/public/logo*.{svg,png}                                      (marca + otimização)
apps/clinica/public/logo*.svg                                            (marca + otimização)
apps/web/src/app/auth/register/page.tsx                                  (logo em vez de emoji)
apps/web/src/app/carteirinha/page.tsx                                    (novo)
apps/web/src/components/layout/Sidebar.tsx                               (nav "Carteirinha")
apps/web/package.json                                                    (html-to-image)
apps/web/src/store/auth.store.ts                                         (dateOfBirth no User)
apps/api/src/modules/users/users.service.ts                              (fix: não vazar passwordHash)
apps/api/src/modules/atendimento/consultation-requests.service.ts        (searchIcodlifeUsers)
apps/api/src/modules/atendimento/consultation-requests.controller.ts     (rota users/search)
apps/clinica/src/lib/api.ts                                              (icodlifeApi + preços de exame)
apps/clinica/src/components/ui/IcodlifeUserPicker.tsx                    (novo)
apps/clinica/src/app/funcionarios/page.tsx                               (reescrito)
apps/clinica/src/app/consultas/page.tsx                                  (picker)
apps/clinica/src/app/atendimento/page.tsx                                (paciente avulso)
apps/clinica/src/app/globals.css                                        (.card/.label/.input-field)
apps/clinica/src/app/financeiro/page.tsx                                 (reescrito — filtros + preços)
apps/api/prisma/schema.prisma                                            (ClinicExamPrice, PlatformPlan, campos novos)
apps/api/prisma/migrations/20260723_160000_financeiro_guiche_exame/      (nova)
apps/api/prisma/migrations/20260723_180000_doctor_platform_plan/         (nova)
apps/api/src/modules/atendimento/atendimento.service.ts                  (chargeExamFee)
apps/api/src/modules/clinic/clinic.service.ts                            (filtros + preços de exame)
apps/api/src/modules/clinic/clinic.controller.ts                         (rotas novas)
apps/web/src/app/auth/login/page.tsx                                     (link Cadastrar Doutor)
apps/api/src/modules/doctor/dto/become-doctor.dto.ts                     (planCode)
apps/api/src/modules/doctor/doctor.service.ts                            (listPlans + lógica de plano)
apps/api/src/modules/doctor/doctor.controller.ts                         (rota /doctors/plans)
apps/doutor/src/app/register/page.tsx                                    (passo 3 + 2 bugs corrigidos)
apps/doutor/src/lib/auth.ts                                              (authenticate() separado de login())
apps/landing/                                                            (app inteiro, novo)
apps/api/src/main.ts                                                     (CORS: :3004 + www.icodlife.com.br)
docker-compose.prod.yml                                                  (serviço landing)
infra/nginx/nginx.conf                                                   (raiz -> landing, novo bloco app.)
.github/workflows/ci.yml                                                 (landing no pipeline)
ICODLIFE_Arquitetura_e_Banco_de_Dados.md                                 (novo)
ICODLIFE_Arquitetura_Alto_Nivel.svg                                      (novo)
CHECKLIST_DEPLOY_PRODUCAO.md                                             (novo)
PROMPT_CONTINUIDADE_V19.md                                               (novo — este arquivo)
```

Comando completo (PowerShell, raiz do projeto), **depois** de resolver o lock acima:
```powershell
git add -A
git status   # conferir a lista antes de commitar — não deve aparecer nada de outputs/scratch
git commit -m "Landing page, cadastro de Doutor (2 bugs corrigidos), financeiro por guichê/exame, cadastro unico iCODLIFE, carteirinha digital, logo otimizado (-94%), diagramas de arquitetura e checklist de deploy"
git push origin develop
pnpm install
```

---

## 2. BLOCO DE CONTINUIDADE (colar na próxima sessão)
```
Continuando o desenvolvimento do monorepo ICODLIFE / Sou Doutor (Cowork/desktop).

STACK
- Monorepo pnpm workspaces (Node v24, pnpm v10)
- apps/api     -> NestJS, porta 3001, prefixo global /api/v1
- apps/web     -> Next.js 14, porta 3000 (paciente) — hub de login centralizado
- apps/doutor  -> Next.js 14, porta 3002 (médico)
- apps/clinica -> Next.js 14, porta 3003 (clínica/hospital, multi-tenant)
- apps/landing -> Next.js 14, porta 3004 (site institucional, raiz do domínio) — NOVO nesta sessão
- apps/mobile  -> Expo React Native
- ORM: Prisma 5.22, client gerado em src/generated/prisma (import relativo ../../generated/prisma; NUNCA @prisma/client)
- Banco: PostgreSQL via Docker (container icodlife_postgres, porta 5434) + redis 6379
- GitHub: github.com/Marcos-RibeiroJR/icodlife-v7, branch padrão e ativa = develop — CONFIRMAR se o commit
  desta sessão (ver Seção 1) já foi feito; se não, HEAD local está à frente do origin/develop.

COMO SUBIR
1) docker start icodlife_postgres icodlife_redis
2) apps/api:    cd apps/api && npx prisma migrate deploy && npx prisma generate  (2 migrations novas desta
   sessão: financeiro_guiche_exame e doctor_platform_plan — OBRIGATÓRIO rodar antes do dev)
3) Se o client gerado não refletir no dist (bug recorrente de sessões anteriores): apagar apps/api/dist
   inteiro e reiniciar do zero, NUNCA confiar no watch/build incremental depois de migration nova.
4) apps/api:     pnpm dev   (porta 3001)
5) apps/web:     pnpm dev   -> localhost:3000
6) apps/doutor:  pnpm dev   -> localhost:3002
7) apps/clinica: pnpm dev   -> localhost:3003
8) apps/landing: pnpm install (workspace novo, ainda não estava no lockfile) && pnpm dev -> localhost:3004
- EADDRINUSE 3001: taskkill /IM node.exe /F, esperar 3s, subir de novo.

CREDENCIAIS DEMO (senha Demo@12345)
- Paciente: joao@demo.icodlife.com | ana@demo.icodlife.com
- Médico sócio: dr.marcos@demo.icodlife.com | Médica associada: dra.fernanda@demo.icodlife.com
- Admin clínica: clinica.centro@demo.icodlife.com | Recepção: recepcao.centro@demo.icodlife.com

AÇÃO IMEDIATA (fazer nesta ordem)
1. Resolver .git/index.lock (travado desde antes desta sessão) e commitar/empurrar TUDO (lista completa e
   comandos prontos na Seção 1) — sem isso, mais uma sessão inteira fica só local (risco já materializado
   entre V13-V17).
2. pnpm install na raiz do monorepo (apps/landing é workspace novo).
3. cd apps/api && npx prisma migrate deploy && npx prisma generate — 2 migrations novas, depois apagar
   dist/ e reiniciar a API do zero.
4. Testar de ponta a ponta o cadastro de Doutor (2 bugs corrigidos nesta sessão, NUNCA testado em ambiente
   real ainda): apps/doutor/register, 3 passos completos, confirmar que o usuário vira doutor de verdade
   (crmStatus=pending) e é redirecionado pro /profile.
5. Testar apps/landing rodando (localhost:3004) — conferir os links pros 3 portais, responsividade mobile,
   animações.
6. Investigar AO VIVO (DevTools F12 -> Network) o bug "Buscando..." travado em Meus Funcionários (Clínica).
   3 rodadas de investigação estática (nesta sessão e na anterior) não encontraram bug de código — o
   padrão do sintoma (falha silenciosa, sem mensagem de erro real) é MUITO parecido com o bug histórico
   "Erro ao carregar médicos" (aberto desde V17/V18, nunca diagnosticado por falta do mesmo dado). Podem
   ser a mesma causa raiz — abrir os dois ao mesmo tempo e comparar o Network.
7. Antes de qualquer deploy real: seguir CHECKLIST_DEPLOY_PRODUCAO.md — trocar "seudominio.com.br" pelo
   domínio real em infra/nginx/nginx.conf e .github/workflows/ci.yml (5+ ocorrências).

BUGS PRIORITÁRIOS EM ABERTO
1. "Buscando..." travado em Meus Funcionários (Clínica) — ver AÇÃO IMEDIATA item 6. Suspeita de mesma causa
   raiz do bug histórico abaixo.
2. "Erro ao carregar médicos" (painel Clínica) — em aberto desde V17. 3+ rodadas de investigação estática
   (controller/service/schema/CORS/porta/token) não encontraram bug de código. Precisa do status HTTP +
   corpo real da requisição via DevTools Network — sem isso, nova tentativa estática só repete o que já foi
   descartado.
3. Validação de CRM do médico — o formulário diz "validado manualmente em até 24h" mas não foi encontrado
   nenhum painel administrativo pra aprovar/reprovar CRM durante esta sessão. Confirmar se isso é processo
   manual fora do sistema (direto no banco) ou se falta essa tela — se faltar, todo médico cadastrado fica
   com crmStatus=pending permanentemente.

QUIRKS CRÍTICOS (aprendidos, cumulativo — ler antes de mexer)
- PRISMA CLIENT DESATUALIZADO NO DIST: depois de `npx prisma generate`, copiar manualmente pro dist se
  rodar via build frio: Copy-Item -Recurse -Force src\generated\prisma dist\src\generated\prisma
- GIT INDEX/HEAD.lock TRAVA SOZINHO (recorrente desde V18): a sandbox Linux NUNCA consegue apagar
  .git/index.lock ou .git/HEAD.lock (erro "Operation not permitted", mount cross-OS Windows<->sandbox) —
  nem com mv, nem criando/apagando outros arquivos dentro de .git/ (confirmado nesta sessão: um arquivo de
  teste recém-criado por escrita também não pôde ser removido). Resolver SEMPRE do lado Windows, PowerShell,
  antes de qualquer git novo.
- Prisma Query Engine só existe compilado pra Windows no client gerado — testar a API de verdade (banco,
  migrations, e2e) só funciona no Windows do usuário, nunca dentro da sandbox Linux.
- REACT-HOOK-FORM + ZOD: campo validado no schema Zod mas nunca registrado via register() (só existe em
  estado local do componente) faz handleSubmit falhar a validação SEMPRE, silenciosamente, sem chamar
  onSubmit e sem erro visível se a tela de erro não estiver montada no step atual. Causa raiz real do bug
  "cadastro de Doutor trava" nesta sessão (campo specialties). Antes de exigir min()/required em schema,
  conferir se o campo é de fato populado via register().
- FUNÇÕES DE LOGIN COMPARTILHADAS: nunca embutir checagem de role (ex: role==='doctor') dentro de uma
  função authenticate/login genérica se ela também for reusada dentro de um fluxo de CADASTRO — nesse
  fluxo a role ainda não foi promovida. Separar sempre: authenticate() cru (sem checagem) + login() com
  checagem (usado só na tela de login de verdade). Causa raiz real do 2º bug do cadastro de Doutor.
- LOGOS/ASSETS BASE64-EM-SVG: fácil gerar um "logo.svg" que na verdade é um PNG bruto de resolução total
  (ex: 646x540) embutido em base64 — mesmo exibido a 32-48px na tela, isso vira 300KB+ por arquivo,
  carregado em TODA página que usa o layout/sidebar. Sempre redimensionar pro tamanho de exibição real
  (com folga de retina, ~3-4x) e comprimir/quantizar antes de embutir.
- Colunas Prisma String[] são NOT NULL sem default -> no CREATE, sempre passar [] ou o array de verdade
  explicitamente.
- ValidationPipe global (whitelist+forbidNonWhitelisted). Controllers sem DTO tipado usam @Body() dto: any
  de propósito (padrão do projeto) — não "corrigir" adicionando DTO tipado sem necessidade.
- git: se "index file corrupt" -> Remove-Item .git\index ; git reset.

BACKLOG (atualizado nesta sessão)
- Sprint 18 — Pagamentos (Pagar.me): plano pronto em PLANO_MODULO_PAGAMENTOS.md, nada implementado. Terreno
  de dados já existe (PlatformPlan/platformPlanStatus no médico) desde esta sessão, mas sem checkout real.
- Sprint 20 — Dashboard Analytics: implementado em V18, sem mudança nesta sessão.
- Sprint 22 — gov.br / RNDS: aguardando decisão do usuário, plano pronto em PLANO_MODULO_GOVBR_RNDS.md.
- Sprint 23 — Hardening + Deploy VPS: CHECKLIST_DEPLOY_PRODUCAO.md pronto nesta sessão (passo a passo
  completo). Deploy real ainda não executado — depende do usuário registrar domínio/servidor e seguir o
  checklist. apps/landing agora faz parte do pipeline de deploy.
- Performance: causa concreta de lentidão percebida (assets de logo 330KB) corrigida nesta sessão (-94%).
  Recomendações NÃO implementadas ainda (maior esforço, avaliar com o usuário antes): migrar páginas de
  'use client' pra server components onde fizer sentido, lazy-load do recharts nas telas de gráfico,
  next/image em vez de <img> cru.
- Fix estrutural do Prisma Client (mover generator output pra dentro de node_modules, resolver de vez o
  bug recorrente de dist desatualizado) — oferecido em sessões anteriores, ainda não confirmado/feito.
- Backup automático do Postgres em produção — não configurado (ver CHECKLIST_DEPLOY_PRODUCAO.md item 6).
- Módulo Clínicas: só restam decisão sobre backfill de clinicId em registros antigos (decisão do usuário) e
  Data Warehouse/ML (conceitual).
- Bug "Buscando..." (Meus Funcionários) e "Erro ao carregar médicos": EM ABERTO, ver seção de bugs acima.
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

Nota: nesta sessão o plano "Profissional" cadastrado no schema (`PlatformPlan`) ficou com R$ 99,90/mês —
conferir se bate com o número oficial acima (R$ 99,00) antes de divulgar publicamente; pequena divergência
de centavos entre o dado seedado e a tabela de referência dos decks.

---

## 4. Pendências técnicas / a validar (nesta ordem de prioridade)
1. **Resolver o lock do git e commitar/empurrar tudo desta sessão** (Seção 1) — sem isso, todo o trabalho
   (landing page, 2 bugs corrigidos, financeiro por guichê, otimização de logo, diagramas, checklist) fica
   só local, repetindo o risco histórico de V13-V17.
2. **Bug "Buscando..." travado (Meus Funcionários) + bug histórico "Erro ao carregar médicos"** — investigar
   juntos via DevTools Network, suspeita de causa raiz compartilhada.
3. `pnpm install` na raiz (apps/landing é workspace novo) + rodar as 2 migrations novas + apagar dist da API.
4. Testar de ponta a ponta o cadastro de Doutor corrigido (nunca testado em ambiente real após o fix).
5. Confirmar se existe (ou falta) painel administrativo de validação de CRM.
6. Trocar `seudominio.com.br` pelo domínio real (`icodlife.com.br`) em `infra/nginx/nginx.conf` e
   `.github/workflows/ci.yml` antes de qualquer deploy.
7. Seguir `CHECKLIST_DEPLOY_PRODUCAO.md` quando o usuário estiver pronto para subir em servidor real.
8. Sprint 18 (Pagamentos) e Sprint 22 (gov.br/RNDS) — sem mudança, aguardando decisão/priorização do usuário.
9. Decidir se vale a pena o fix estrutural do Prisma Client (mover generator output) — recorrente em várias
   sessões, nunca priorizado.
