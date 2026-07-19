# Prompt de Continuidade — ICODLIFE / Sou Doutor (V17)
Cole o bloco da **Seção 2** como primeira mensagem na próxima sessão (outro Cowork). As demais seções são referência de progresso, pendências e roadmap.

---

## 1. Visão geral do progresso

### Entregue nesta jornada (V16 → V17)
Sessão inteira rodou com o **sandbox Linux indisponível** ("VM service not running") do início ao fim — todo o trabalho abaixo foi feito só com Read/Edit/Write direto no disco, **sem rodar nada** (sem `pnpm dev`, sem `prisma generate/migrate`, sem `git`). Isso é a pendência nº1 da próxima sessão.

| Área | O que ficou pronto |
|---|---|
| **Diagnóstico — "Erro ao carregar médicos" (Clínica)** | Investigado `apps/clinica/src/app/medicos/page.tsx` → `clinic.controller.ts` → `clinic.service.ts`. Código, `schema.prisma`, client Prisma compilado e a migration `20260718211553_sprint21_clinicas_hospitais` batem entre si — sem bug de código. Hipótese mais provável: a migration existe no disco mas pode não ter sido **aplicada** no Postgres rodando (`npx prisma migrate status` vai confirmar). Não corrigido ainda — depende do sandbox. |
| **Módulo Agenda da Clínica (multi-médico) — NOVO** | Backend: `clinic.service.ts`/`clinic.controller.ts` ganharam `getDoctorSlots`, `getDoctorDaySummary`, `getDoctorWorkingHours`, `createAppointment`, `updateAppointment`, `cancelAppointment` (tudo por `doctorId`, com trava `assertDoctorInClinic`). `listAgenda` passou a aceitar `from`/`to` (intervalo), não só `date` único. Frontend: `apps/clinica/src/app/agenda/page.tsx` reescrita do zero — toggle Dia/Semana/Mês/**Ano** (Doutor só tem os 3 primeiros), filtro por médico ("Todos" = visão em swimlanes por médico no dia) e por **sala**, modal de criação igual ao do Doutor + campo Médico/Sala. |
| **Pacientes → "Gerar Consulta" → Agenda → ASO** | Botão na lista de pacientes (`apps/clinica/src/app/pacientes/page.tsx`) que abre `/agenda?newPatientUserId=...` já com paciente (e médico, se só houver 1 vínculo) pré-selecionados e tipo "exame". A Agenda (`useSearchParams`, wrapped em `<Suspense>`) auto-abre o modal, casa o `patientDoctorId` certo assim que o médico é escolhido, e mostra aviso: "emita o ASO no painel do médico responsável". **Importante**: ASO continua só podendo ser emitido no `apps/doutor` (role `doctor`) — `AsoService` é `doctorId`-cêntrico via `userId`, clinic_admin não passa nesse guard. Não dava pra "gerar ASO direto da Clínica" sem reabrir esse guard, então a integração é por vínculo de dados (`patientDoctorId`), não por permissão nova. |
| **Empresas na Clínica — NOVO** | Antes só listava (read-only). Agora: `CompanyService.mapWritable` virou público e é reaproveitado; `ClinicModule` importa `CompanyModule`; `clinic.service.ts`/`clinic.controller.ts` ganharam `GET /clinic/companies/lookup/:cnpj`, `POST/GET/PATCH/DELETE /clinic/companies(/:id)` (todo `Company` exige `doctorId` não-nulo no schema, então o form pede "Médico responsável"). Frontend: `apps/clinica/src/app/empresas/page.tsx` reescrita — mesmo formulário completo do `apps/doutor/empresas` (todas as seções: identificação, endereço, contato, trabalhista, responsáveis, medicina/SST) + busca por CNPJ (BrasilAPI/ReceitaWS) + seletor de médico. |
| **Salas: agenda + vínculo a médico + financeiro (conta corrente) — NOVO** | `ClinicRoom` ganhou `costPerHour`/`costPerUse`. Agenda da sala = o próprio `listAgenda` filtrado por `roomId` (novo filtro na tela de Agenda + rota `GET /clinic/rooms/:id/agenda`). Associar/desassociar médico a uma sala direto na tela de Salas (usa `ClinicDoctor.roomId` já existente) via `POST/DELETE /clinic/rooms/:id/doctors(/:doctorId)`. Ao marcar uma consulta como "Realizada" numa sala com custo definido, debita automaticamente a **conta corrente do médico** (`DoctorCashEntry`, categoria `custo_sala`, idempotente). Financeiro (`apps/clinica/financeiro`) ganhou colunas de custo de sala/saldo + modal "Ver extrato" por médico (`GET /clinic/financeiro/conta-corrente/:doctorId`) com lançamento manual de crédito/débito. |
| **Migration nova escrita à mão** | `apps/api/prisma/migrations/20260719_sprint25_salas_financeiro/migration.sql` — adiciona `cost_per_hour`/`cost_per_use` em `clinic_rooms` e `room_id` (+ FK) em `doctor_cash_entries`. Escrita manualmente (sem `prisma migrate dev`, sem sandbox) espelhando o `schema.prisma` já editado. **Precisa rodar `prisma migrate deploy` + `prisma generate` + copiar dist antes de qualquer teste**, senão o TypeScript novo (`costPerHour`, `roomId` em `DoctorCashEntry`, etc.) não compila contra o client Prisma antigo. |
| **Materiais de investidor/comercial — conteúdo pronto, PPT não gerado** | `IcodLife_Pitch_Deck_Investidores_V2_CONTEUDO.md`, `IcodLife_Apresentacao_Comercial_CONTEUDO.md`, `IcodLife_Modelo_Negocio_CONTEUDO.md` — conteúdo completo slide a slide, na raiz do repo. Ainda **não virou `.pptx`** — depende do sandbox (skill `pptx` roda via bash). |

### Estado do Git — ⚠️ CRÍTICO, nada commitado ainda (V16 + V17 acumulados)
Sandbox indisponível a sessão inteira → **zero comandos git rodados**. Lista completa do que está pendente de commit:
```
# Da sessão V16 (já estava pendente):
PLANO_MODULO_CLINICAS_HOSPITAIS.md          (editado — seção 12)
PLANO_MODULO_GOVBR_RNDS.md                  (novo)
PLANO_MODULO_PAGAMENTOS.md                  (novo)
PROMPT_CONTINUIDADE_V16.md                  (novo)
apps/web/src/app/auth/login/page.tsx        (editado — seletor 3 vias)
apps/doutor/src/app/auth/bridge/page.tsx    (novo)
apps/clinica/src/app/auth/bridge/page.tsx   (novo)
apps/api/src/main.ts                        (modificado — conferir diff, origem sessão anterior)
pnpm-lock.yaml                              (modificado)

# Desta sessão V17 (novo):
PROMPT_CONTINUIDADE_V17.md                          (novo — este arquivo)
IcodLife_Pitch_Deck_Investidores_V2_CONTEUDO.md     (novo — conteúdo, ainda não é .pptx)
IcodLife_Apresentacao_Comercial_CONTEUDO.md         (novo — conteúdo, ainda não é .pptx)
IcodLife_Modelo_Negocio_CONTEUDO.md                 (novo — conteúdo, ainda não é .pptx)
apps/api/prisma/schema.prisma                       (editado — ClinicRoom.costPerHour/costPerUse, DoctorCashEntry.roomId)
apps/api/prisma/migrations/20260719_sprint25_salas_financeiro/migration.sql  (novo, escrito à mão)
apps/api/src/modules/clinic/clinic.controller.ts    (editado — rotas agenda/companies/rooms/financeiro)
apps/api/src/modules/clinic/clinic.service.ts       (editado — métodos agenda/companies/rooms/conta corrente)
apps/api/src/modules/clinic/clinic.module.ts        (editado — importa CompanyModule)
apps/api/src/modules/clinic/dto/clinic-room.dto.ts  (editado — costPerHour/costPerUse)
apps/api/src/modules/company/company.service.ts     (editado — mapWritable público)
apps/clinica/src/lib/api.ts                         (editado — muitos endpoints novos)
apps/clinica/src/app/agenda/page.tsx                (reescrita completa — multi-médico, Dia/Semana/Mês/Ano)
apps/clinica/src/app/pacientes/page.tsx             (editado — botão "Gerar Consulta")
apps/clinica/src/app/empresas/page.tsx              (reescrita completa — form completo + API)
apps/clinica/src/app/salas/page.tsx                 (reescrita completa — custo + vínculo médico)
apps/clinica/src/app/financeiro/page.tsx            (editado — conta corrente/extrato)
```
Antes de commitar, no PowerShell na raiz do projeto:
```powershell
git status
git diff apps/api/src/main.ts   # conferir se é intencional (de sessão anterior)
git add -A
git commit -m "feat(clinica): agenda multi-medico (dia/semana/mes/ano), empresas com API completa, salas com custo/agenda/conta-corrente; fix: pendencia erro medicos; docs: conteudo dos 3 decks + prompt V17"
git push origin develop
```

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

COMO SUBIR
1) docker start icodlife_postgres icodlife_redis
2) apps/api:    cd apps/api && npx prisma migrate deploy && npx prisma generate  (OBRIGATÓRIO antes do dev — ver seção "AÇÃO IMEDIATA")
3) apps/api:    pnpm dev   (porta 3001)
4) apps/web:    pnpm dev   -> localhost:3000
5) apps/doutor: pnpm dev   -> localhost:3002
6) apps/clinica:pnpm dev   -> localhost:3003
- EADDRINUSE 3001: taskkill /IM node.exe /F, esperar 3s, subir de novo.

CREDENCIAIS DEMO (senha Demo@12345)
- Paciente: joao@demo.icodlife.com | ana@demo.icodlife.com
- Médico sócio: dr.marcos@demo.icodlife.com | Médica associada: dra.fernanda@demo.icodlife.com
- Admin clínica: clinica.centro@demo.icodlife.com | Recepção: recepcao.centro@demo.icodlife.com

AÇÃO IMEDIATA (bloqueia tudo o resto — fazer assim que o sandbox voltar, NESTA ORDEM)
1. cd apps/api && npx prisma migrate status
   - Se "20260718211553_sprint21_clinicas_hospitais" estiver pendente: isso provavelmente é a causa do bug "Erro ao carregar médicos" no painel Clínica (schema/código já batem, só falta aplicar no banco).
   - Se "20260719_sprint25_salas_financeiro" (migration nova, escrita à mão nesta sessão, ainda não testada) estiver pendente: também precisa aplicar.
2. npx prisma migrate deploy  (aplica as pendentes)
3. npx prisma generate
4. Copy-Item -Recurse -Force src\generated\prisma dist\src\generated\prisma  (só necessário se rodar via dist/build frio; em dev com `pnpm dev` normalmente não precisa, mas é o quirk histórico documentado abaixo)
5. Subir tudo (ver "COMO SUBIR") e testar na tela:
   - Clínica > Médicos (o erro deve ter sumido)
   - Clínica > Agenda (Dia/Semana/Mês/Ano, criar consulta, filtro por médico e por sala)
   - Clínica > Pacientes > "Gerar Consulta" (deve abrir a Agenda com paciente pré-selecionado)
   - Clínica > Empresas (criar empresa nova, testar "Buscar dados" por CNPJ)
   - Clínica > Salas (criar sala com custo, associar médico, "Ver agenda")
   - Clínica > Financeiro (marcar uma consulta de sala com custo como "Realizada" e conferir se debitou; abrir "Ver extrato")
6. Só depois de validado: git add -A / commit / push (ver Seção 1 do PROMPT_CONTINUIDADE_V17.md — mensagem sugerida já pronta lá).
7. Depois disso: gerar os 3 .pptx (conteúdo já pronto nos arquivos *_CONTEUDO.md na raiz) usando a skill pptx.

QUIRKS CRÍTICOS (aprendidos, cumulativo)
- PRISMA CLIENT DESATUALIZADO NO DIST: sempre que rodar `npx prisma generate` depois de mudar o schema, o `nest-cli.json` (assets: generated/**/*, watchAssets:false, deleteOutDir:false) NÃO recopia automaticamente pro dist em watch mode. Rodar manualmente: Copy-Item -Recurse -Force src\generated\prisma dist\src\generated\prisma — ou apagar a pasta dist inteira — antes de reiniciar a API. Sintoma: erro Prisma "Value/column not found" mesmo com o schema certo.
- A ferramenta de edição de arquivos deste ambiente TRUNCA o final de arquivos (especialmente com emojis) ao salvar no mount Windows. Editar via terminal quando for um arquivo grande, e validar contagem de linhas.
- ValidationPipe global (whitelist+forbidNonWhitelisted). DTO sem decorators = 400 (por isso os endpoints novos de agenda/empresas/salas usam `@Body() dto: any` como o resto do módulo doutor, exceto onde já havia DTO tipado como `ClinicRoomDto` — esse eu atualizei com os campos novos em vez de trocar por `any`).
- Colunas Prisma String[] são NOT NULL sem default -> no CREATE, dar default [] senão viola null.
- `DoctorAppointment.status` de cancelamento é `'canceled'` (inglês americano, 1 L) em todo o código — a tela antiga de agenda da clínica (já substituída) tinha um bug de digitar 'cancelled' (2 Ls) que nunca batia; a nova tela usa 'canceled' consistente.
- `Company.doctorId` é obrigatório (NOT NULL) mesmo com `clinicId` opcional — por isso toda tela de criar Empresa (Doutor ou Clínica) precisa de um médico associado.
- `AsoService`/`CompanyService`/`DoctorFinanceiroService` (antigos) são 100% `doctorId`-cêntricos via `getDoctor(userId)` — só funcionam com JWT de médico (role=doctor), não de clinic_admin. Qualquer nova funcionalidade "da Clínica" que precise desses módulos tem que ganhar uma versão própria dentro de `ClinicService` (foi o padrão usado pra Empresas e Financeiro/conta-corrente nesta sessão), nunca reusar o controller do Doutor direto.
- Rotas NestJS com segmento estático + `:param` ambíguo (ex.: `companies/lookup/:cnpj` vs `companies/:id`) precisam do path mais específico declarado ANTES do genérico no controller, senão o genérico casa primeiro.
- git: se "index file corrupt" -> Remove-Item .git\index ; git reset.
- Bug conhecido, não bloqueante: apps/api/src/modules/medications/medications.service.ts:18 — "Null constraint violation on scheduled_times" ao salvar medicamento sem frequência definida.

PENDÊNCIA IMEDIATA (comercial) — Materiais de investidor
Conteúdo já redigido (não reler, só converter):
- IcodLife_Pitch_Deck_Investidores_V2_CONTEUDO.md
- IcodLife_Apresentacao_Comercial_CONTEUDO.md
- IcodLife_Modelo_Negocio_CONTEUDO.md
Faltam: (1) ler a skill pptx, (2) gerar os 3 .pptx de verdade com pptxgenjs a partir desse conteúdo.
Números de negócio (não inventar, usar só estes — ver Seção 3 do PROMPT_CONTINUIDADE_V17.md pra tabela completa):
Seed R$500.000 | SaaS Médico R$99/mês | SaaS Clínica R$388/mês | comissão marketplace 10% | Premium paciente R$19,90/mês.
Pontos marcados como [completar] nos arquivos de conteúdo (mercado/TAM, time, valuation) — não inventar, perguntar ao usuário se for preciso preencher.

BACKLOG (sem mudança desde V16)
- Sprint 18 — Pagamentos (Pagar.me): plano pronto em PLANO_MODULO_PAGAMENTOS.md, nada implementado, começar por 18.1 (schema + sandbox Pagar.me).
- Sprint 22 — gov.br / RNDS: aguardando decisão do usuário, plano pronto em PLANO_MODULO_GOVBR_RNDS.md.
- Sprint 20 — Dashboard Analytics pro médico.
- Sprint 23 — Hardening + Deploy VPS.
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

---

## 4. Pendências técnicas / a validar (nesta ordem de prioridade)
1. **Sandbox voltar** — bloqueia tudo abaixo.
2. `npx prisma migrate status` + `migrate deploy` + `prisma generate` (ver "AÇÃO IMEDIATA" na Seção 2) — inclui a migration nova `20260719_sprint25_salas_financeiro` que nunca foi testada contra um banco de verdade.
3. Testar na tela as 5 frentes novas/corrigidas: Médicos (fix), Agenda multi-médico, Pacientes→Gerar Consulta, Empresas na Clínica, Salas+Financeiro/conta-corrente.
4. **Commitar tudo** (lista completa na Seção 1).
5. Gerar os 3 `.pptx`.
6. Sprint 18 (Pagamentos) e Sprint 22 (gov.br/RNDS) — sem mudança, aguardando.
7. Bug não bloqueante: `medications.service.ts` (Null constraint em `scheduled_times`).
