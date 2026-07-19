# Prompt de Continuidade — ICODLIFE / Sou Doutor (V16)

Cole o bloco da **Seção 2** como primeira mensagem na próxima sessão (outro Cowork). As demais seções são referência de progresso, pendências e roadmap.

---

## 1. Visão geral do progresso

### Entregue nesta jornada (V15 → V16)

| Área | O que ficou pronto |
|---|---|
| **Fix login Clínica (BUG RESOLVIDO)** | `clinica.centro@demo.icodlife.com` dava "Internal server error". Causa: enum `UserRole.clinic_admin` existia no `schema.prisma`/migration e no banco, mas o **Prisma Client compilado em `dist/src/generated/prisma` estava desatualizado** — `nest-cli.json` só copia `generated/**/*` na build fria (`watchAssets: false`, `deleteOutDir: false` nunca limpa o `dist` velho). Fix: `npx prisma generate` + cópia manual `src/generated/prisma` → `dist/src/generated/prisma`. **Login validado, funcionando.** |
| **Validação completa do painel Clínica** | Todas as telas (dashboard, médicos, agenda, pacientes, empresas, ASO, procedimentos, salas, equipe, financeiro, configurações) confirmadas carregando sem erro em `localhost:3003`. |
| **Login centralizado (Usuário/Doutor/Clínica)** | `apps/web/src/app/auth/login/page.tsx` — toggle de 3 abas com validação de role antes de redirecionar. Corrigido bug real que já existia: o toggle Doutor mandava pro painel médico **sem token** (localStorage não se compartilha entre portas/origens diferentes). Criadas páginas `/auth/bridge` em `apps/doutor` e `apps/clinica` que recebem `token`+`user` via query string do hub e gravam no localStorage do app de destino (`doutor_token`/`doutor_user`, `clinica_token`/`clinica_user`) antes de ir pro dashboard. |
| **Plano Sprint 21 atualizado** | `PLANO_MODULO_CLINICAS_HOSPITAIS.md` — seção 12 atualizada com o fix do login e a validação das telas. |
| **Plano Sprint 22 (gov.br/RNDS)** | Novo `PLANO_MODULO_GOVBR_RNDS.md` — pesquisa completa feita. **Achado importante**: são 2 integrações independentes. gov.br Login Único (OIDC, credenciamento via `acesso.gov.br`, viável de codar já) vs **RNDS** (APIs FHIR R4 do DATASUS, exige CNES ativo + certificado ICP-Brasil + credenciamento formal — processo administrativo, não só código). Aguardando decisão do usuário pra retomar (status: "Aguardar"). |
| **Plano Sprint 18 (Pagamentos)** | Novo `PLANO_MODULO_PAGAMENTOS.md` — gateway Pagar.me v5, 3 frentes de receita confirmadas com o usuário: (A) SaaS médico/clínica, (B) pagamento de consulta com split marketplace, (C) premium paciente. Schema, endpoints e roadmap 18.1–18.7 detalhados. **Ainda não implementado** — próxima ação sugerida é 18.1 (schema + sandbox Pagar.me). |
| **Materiais de investidor/comercial — EM ANDAMENTO, bloqueado** | Solicitado: (1) Pitch Deck Investidores V2 (atualizar `IcodLife_Pitch_Deck_Investidores.pptx` enviado), (2) Apresentação comercial da plataforma (público: médicos/clínicas/empresas), (3) Modelo de Negócio em PPT separado (3 frentes de receita do Sprint 18). Números de negócio já coletados com o usuário (ver Seção 3). **Bloqueado**: o sandbox Linux (`mcp__workspace__bash`) ficou indisponível ("VM service not running") durante toda a tentativa de leitura do pptx enviado e geração dos arquivos — nenhum dos 3 PPTs foi gerado ainda. Reiniciar a sessão/Cowork costuma resolver. |

### Estado do Git — ⚠️ IMPORTANTE
Trabalho desta jornada está **local, não commitado**. Arquivos novos/editados:
```
PLANO_MODULO_CLINICAS_HOSPITAIS.md          (editado — seção 12)
PLANO_MODULO_GOVBR_RNDS.md                  (novo)
PLANO_MODULO_PAGAMENTOS.md                  (novo)
PROMPT_CONTINUIDADE_V16.md                  (novo — este arquivo)
apps/web/src/app/auth/login/page.tsx        (editado — seletor 3 vias)
apps/doutor/src/app/auth/bridge/page.tsx    (novo)
apps/clinica/src/app/auth/bridge/page.tsx   (novo)
apps/api/src/main.ts                        (modificado — origem de sessão anterior, conferir diff)
pnpm-lock.yaml                              (modificado — de sessão anterior)
apps/clinica/next-env.d.ts                  (novo, gerado automaticamente pelo Next — não precisa commitar)
```
Antes de commitar, no PowerShell na raiz do projeto:
```powershell
git status
git diff apps/api/src/main.ts   # conferir se é intencional (de sessão anterior)
git add -A
git commit -m "fix(clinica): prisma client desatualizado no dist; feat: login centralizado (usuario/doutor/clinica) com bridge pages; docs: planos Sprint 18 (pagamentos) e Sprint 22 (govbr/rnds)"
git push origin develop
```

---

## 2. BLOCO DE CONTINUIDADE (colar na próxima sessão)

```
Continuando o desenvolvimento do monorepo ICODLIFE / Sou Doutor (Cowork/desktop).

STACK
- Monorepo pnpm workspaces (Node v24, pnpm v10)
- apps/api    -> NestJS, porta 3001, prefixo global /api/v1
- apps/web    -> Next.js 14, porta 3000 (paciente) — agora também hub de login centralizado
- apps/doutor -> Next.js 14, porta 3002 (médico)
- apps/clinica-> Next.js 14, porta 3003 (clínica/hospital, multi-tenant)
- apps/mobile -> Expo React Native
- ORM: Prisma 5.22, client gerado em src/generated/prisma (import relativo ../../generated/prisma; NUNCA @prisma/client)
- Banco: PostgreSQL via Docker (container icodlife_postgres, porta 5434) + redis 6379
- Gateway de pagamento escolhido (ainda não implementado): Pagar.me v5

COMO SUBIR
1) docker start icodlife_postgres icodlife_redis
2) apps/api:    pnpm dev   (porta 3001 — espere "API IcodLife rodando na porta 3001")
3) apps/web:    pnpm dev   -> localhost:3000
4) apps/doutor: pnpm dev   -> localhost:3002
5) apps/clinica:pnpm dev   -> localhost:3003
- Rodar a API SEMPRE via `pnpm dev` (nest start --watch), NÃO pelo dist antigo.
- EADDRINUSE 3001: taskkill /IM node.exe /F, esperar 3s, subir de novo.

CREDENCIAIS DEMO (senha Demo@12345)
- Paciente M: joao@demo.icodlife.com | Paciente F: ana@demo.icodlife.com
- Médico sócio: dr.marcos@demo.icodlife.com | Médica associada: dra.fernanda@demo.icodlife.com
- Admin clínica: clinica.centro@demo.icodlife.com | Recepção: recepcao.centro@demo.icodlife.com

LOGIN CENTRALIZADO (novo)
- localhost:3000/auth/login tem 3 abas: Usuário / Doutor / Clínica. Faz 1 login e redireciona pro app certo.
- Mecanismo: apps separados (portas diferentes) não compartilham localStorage. O hub manda token+user via query string pra uma página /auth/bridge em cada app de destino, que grava no localStorage local (doutor_token/doutor_user, clinica_token/clinica_user) antes de ir pro dashboard.
- Os logins diretos em localhost:3002/login e localhost:3003/login continuam funcionando também (standalone).

QUIRKS CRÍTICOS (aprendidos, cumulativo)
- PRISMA CLIENT DESATUALIZADO NO DIST (novo, importante): sempre que rodar `npx prisma generate` depois de mudar o schema, o `nest-cli.json` (assets: generated/**/*, watchAssets:false, deleteOutDir:false) NÃO recopia automaticamente pro dist em watch mode. Rodar manualmente: Copy-Item -Recurse -Force src\generated\prisma dist\src\generated\prisma — ou apagar a pasta dist inteira — antes de reiniciar a API. Sintoma do bug: erro Prisma "Value 'X' not found in enum" mesmo com prisma migrate status dizendo "up to date" e o valor existindo de fato no Postgres.
- A ferramenta de edição de arquivos deste ambiente TRUNCA o final de arquivos (especialmente com emojis) ao salvar no mount Windows. SEMPRE editar via terminal (python/bash: ler, substituir, gravar) e validar contagem de linhas/última linha.
- ValidationPipe global (whitelist+forbidNonWhitelisted). DTO sem decorators = 400. Controllers do doutor e lifestyle usam @Body() dto: any.
- Colunas Prisma String[] são NOT NULL sem default -> no CREATE, dar default [] senão viola null.
- Endpoints "1 por dia" devem ser idempotentes (React StrictMode dispara efeito 2x).
- Rotas :param com CNPJ -> enviar só dígitos.
- Base de API no front já inclui /api/v1; fetch manual NÃO deve concatenar de novo.
- git: se "index file corrupt" -> Remove-Item .git\index ; git reset.
- Bug conhecido, não bloqueante: apps/api/src/modules/medications/medications.service.ts:18 — prisma.medication.create() falha com "Null constraint violation on scheduled_times" quando salva medicamento sem frequência definida.

PENDÊNCIA IMEDIATA — Materiais comerciais/investidor
Solicitado pelo usuário: 3 PPTs.
1. IcodLife_Pitch_Deck_Investidores_V2.pptx — atualizar o pptx enviado (uploads/IcodLife_Pitch_Deck_Investidores.pptx) com tudo incrementado desde o início do projeto.
2. Apresentação comercial da plataforma como um todo — público: clientes/parceiros (médicos, clínicas, empresas). Foco em vender o uso, não captação.
3. Modelo de Negócio (PPT separado) — as 3 frentes de receita do PLANO_MODULO_PAGAMENTOS.md.

Números de negócio JÁ COLETADOS com o usuário (não inventar, usar estes):
- Captação: Seed de R$ 500.000
- Uso dos recursos: 45% Produto & Desenvolvimento (R$315K) | 18% Marketing & Aquisição (R$126K) | 15% Operações & Equipe (R$105K) | 12% Legal, DPO & LGPD (R$84K) | 10% Infraestrutura Cloud (R$70K)
- Plano SaaS Médico: R$ 99,00/mês
- Plano SaaS Clínica: R$ 388,00/mês
- Comissão marketplace (pagamento de consulta): 10%
- Plano Premium Paciente: R$ 19,90/mês

Ainda NÃO lidos (bloqueado por outage do sandbox — tentar de novo primeiro):
- uploads/IcodLife_Pitch_Deck_Investidores.pptx (arquivo enviado pelo usuário nesta jornada — extrair com markitdown antes de tudo)
- IcodLife_Plano_Negocio.docx (raiz do repo)
- IcodLife_Funcionalidades.pptx (raiz do repo)
- IcodLife_Novas_Features.docx (raiz do repo)

Fontes de conteúdo já disponíveis (sem precisar reler nada) pra montar os 3 decks: todo o histórico em PROMPT_CONTINUIDADE_V9 a V15.md + CONTEXTO-ICODLIFE.md + PLANO_MODULO_CLINICAS_HOSPITAIS.md + PLANO_MODULO_SAUDE_MENTAL.md + PLANO_MODULO_PAGAMENTOS.md + PLANO_MODULO_GOVBR_RNDS.md + `git log --oneline` (histórico completo de commits/features) + lista completa de rotas da API (todos os módulos: Auth, Family, Menstrual, AiChat/HealthBot, Medications, Appointments, Ophthalmology, Catalog, BloodPressure, OccupationalHealth, MentalHealth, Aso, Company, ExamResults, Lifestyle, Doctor*, Prontuario*, Surgery, Vaccines, BodyMetrics, Chat, Glucose, Export, Telemedicine, Clinic*).

PRÓXIMO PASSO SUGERIDO
1. Tentar mcp__workspace__bash de novo (echo ok) — se voltar, seguir direto pra: ler o pptx enviado + docs de referência (markitdown), depois gerar os 3 PPTs com pptxgenjs usando os números acima.
2. Se decidir não fazer os PPTs agora: retomar Sprint 18 (18.1 — schema Pagamentos, não depende de credencial) ou aguardar decisão sobre Sprint 22 (gov.br/RNDS).
```

---

## 3. Números de negócio coletados (não perder)

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

## 4. Pendências técnicas / a validar
1. **Commitar tudo** desta jornada (ver Seção 1 — Estado do Git).
2. Gerar os 3 PPTs (pitch deck V2, apresentação comercial, modelo de negócio) assim que o sandbox voltar.
3. Sprint 18 (Pagamentos): nada implementado ainda, plano pronto em `PLANO_MODULO_PAGAMENTOS.md`.
4. Sprint 22 (gov.br/RNDS): em espera por decisão do usuário, plano pronto em `PLANO_MODULO_GOVBR_RNDS.md`.
5. Bug não bloqueante: `medications.service.ts` (Null constraint em `scheduled_times`).
6. Testes e2e do módulo `clinic`, ASO com cabeçalho de clínica, decisão sobre backfill de `clinicId` (ver `PLANO_MODULO_CLINICAS_HOSPITAIS.md`).

## 5. Backlog / próximos passos
- Sprint 18 — Pagamentos (Pagar.me): plano pronto, começar por 18.1 (schema + sandbox Pagar.me).
- Sprint 20 — Dashboard Analytics para o médico. 🔜
- Sprint 22 — gov.br / RNDS: aguardando decisão do usuário.
- Sprint 23 — Hardening + Deploy VPS. 🔜
- Receitas em PDF server-side assinável (como o ASO já é).
- Fase 4 do Motor de Saúde — big data populacional (anônimo) + IA sobre texto livre.
- SST: filiais por empresa, agenda de exames ocupacionais com vencimento, PGR/PCMSO por cargo, eSocial (S-2220/2210/2240).
- Seções 10/11 de `PLANO_MODULO_GOVBR_RNDS.md` (Data Warehouse/Data Lake/ML) — depois do módulo Clínicas validado (já está) e de gov.br/RNDS resolvidos.
