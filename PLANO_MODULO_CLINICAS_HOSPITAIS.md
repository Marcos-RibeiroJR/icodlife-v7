# Plano — Módulo 3: Clínicas e Hospitais (+ Evolução Big Data / Data Lake / ML)

> ICODLIFE / Sou Doutor · Documento de planejamento técnico
> Formaliza e detalha o item de backlog **"Sprint 21 — Multi-tenant (clínica com vários médicos)"**, que deixa de ser um item solto e vira o **3º módulo/app** da plataforma, ao lado de Paciente (`apps/web`) e Doutor (`apps/doutor`).

---

## 1. Resumo executivo

Hoje a plataforma tem dois pilares: o **paciente** (dono dos seus dados de saúde) e o **médico solo** (`Doctor` — 1 CRM, 1 agenda, 1 financeiro, 1 carteira de empresas/ASOs). Todo o schema de agenda/financeiro/ASO/empresa é **doctorId-cêntrico**: cada tabela (`Company`, `Aso`, `DoctorAppointment`, `DoctorPrescription`, `DoctorExamOrder`, `DoctorCashEntry`, `DoctorWorkingHours`, `ChatRoom`, `DoctorStaff`) pertence a exatamente um `Doctor`.

O módulo **Clínicas e Hospitais** introduz uma 3ª persona — a **organização** (clínica, consultório multiprofissional, hospital, empresa de medicina do trabalho) — que **agrega vários médicos**, compartilha uma carteira de empresas/pacientes, tem seu próprio financeiro consolidado, sua própria agenda multi-profissional e seu próprio catálogo de procedimentos com preço.

**Decisão de arquitetura central:** não recriar Paciente/Médico/Empresa/ASO/Financeiro do zero. Adicionar uma camada de **agregação multi-tenant** por cima do que já existe, via um novo model `Clinic` + FKs opcionais (`clinicId String?`) nas tabelas atuais. Médico solo continua funcionando exatamente como hoje (`clinicId = null`); ao entrar numa clínica, os mesmos registros passam a carregar `clinicId`, e a clínica passa a enxergar a união de todos os seus médicos.

Isso também é o que viabiliza a Seção 10 (Big Data / Data Lake / ML): quanto mais estruturado e relacional o dado (paciente ↔ família ↔ médico ↔ clínica ↔ empresa ↔ exame), melhor a matéria-prima para o motor de risco populacional que já existe embrionariamente (`ai-chat/trends`, `FamilyMember`, massa de 400 usuários/15 famílias gerada nesta sessão).

---

## 2. Como se encaixa na arquitetura atual

```
apps/web     (paciente)   → login role='user'   → dados próprios
apps/doutor  (médico)     → login role='doctor' → Doctor 1:1 User, tudo doctorId-cêntrico
apps/clinica (NOVO)       → login role='clinic_admin' (+ staff role='user' com ClinicStaff)
                           → Clinic 1:1 User admin, agrega N Doctor via ClinicDoctor
```

Módulos backend hoje **doctorId-cêntricos** que o módulo Clínica precisa **enxergar de forma agregada** (sem duplicar lógica):

| Módulo atual | Arquivo | O que muda |
|---|---|---|
| `company` | `apps/api/src/modules/company/` | `Company.clinicId` opcional — clínica compartilha carteira de empresas entre médicos |
| `aso` | `apps/api/src/modules/aso/` | `Aso.clinicId` opcional — ASOs de todos os médicos da clínica, visão consolidada |
| `doctor-agenda` | `apps/api/src/modules/doctor-agenda/` | Agenda multi-médico = `WHERE doctorId IN (SELECT doctorId FROM clinic_doctors WHERE clinicId=X)` |
| `doctor-financeiro` | `apps/api/src/modules/doctor-financeiro/` | `DoctorCashEntry.clinicId` opcional — DRE consolidado da clínica + por médico |
| `doctor-prescriptions`, `doctor` (examOrder) | idem | mesma lógica de agregação por `clinicId` |
| `doctor-staff` | `apps/api/src/modules/doctor-staff/` | Passa a existir também `ClinicStaff` (recepção/financeiro da clínica, não vinculado a 1 médico específico) |
| `chat` | `apps/api/src/modules/chat/` | `ChatRoom.clinicId` opcional (roteamento de mensagens para a recepção da clínica) |

Nada é reescrito — tudo ganha uma coluna opcional e um novo controller de agregação (`clinic.controller.ts`) que faz as mesmas queries com `doctorId IN (...)` em vez de `doctorId = X`.

---

## 3. Modelo de dados (Prisma) — novo e alterado

### 3.1 Novos models

```prisma
enum ClinicDoctorRole {
  owner        // sócio/proprietário
  associated   // médico associado (atende na clínica, agenda própria)
  visiting     // médico visitante/eventual
}

enum ClinicStaffRole {
  admin         // gestor administrativo (não é médico)
  reception     // recepção/agendamento
  financeiro    // financeiro/faturamento
  nurse         // enfermagem/apoio clínico
}

model ClinicCounter {
  id        Int    @id @default(autoincrement())
  uf        String @unique
  nextValue Int    @default(1) @map("next_value")
  @@map("clinic_counter")
}

// ORGANIZAÇÃO — clínica, consultório multiprofissional ou hospital.
model Clinic {
  id                 String    @id @default(uuid())
  clinicCode         String    @unique @map("clinic_code")   // formato "CL.00001.SP", igual ao Doctor.doctorId
  ownerUserId        String    @map("owner_user_id")
  ownerUser          User      @relation("ClinicOwner", fields: [ownerUserId], references: [id])

  razaoSocial        String    @map("razao_social")
  nomeFantasia       String?   @map("nome_fantasia")
  cnpj               String    @unique
  tipoEstabelecimento String   @default("clinica") @map("tipo_estabelecimento") // clinica|consultorio|hospital|laboratorio
  cnes               String?   // Cadastro Nacional de Estabelecimentos de Saúde (se tiver)

  cep                String?
  logradouro         String?
  numero             String?
  complemento        String?
  bairro             String?
  cidade             String?
  estado             String?
  latitude           Float?
  longitude          Float?

  telefone           String?
  whatsapp           String?
  email              String?
  site               String?
  logoUrl            String?   @map("logo_url")

  healthPlans        String[]  @map("health_plans")     // convênios aceitos pela clínica (herdado/consolidado dos médicos)
  specialties        String[]                            // especialidades oferecidas
  config             Json?                               // cores, horário de funcionamento geral, IA, notificações

  status             String    @default("active")
  createdAt          DateTime  @default(now()) @map("created_at")
  updatedAt          DateTime  @updatedAt @map("updated_at")

  doctors            ClinicDoctor[]
  staff              ClinicStaff[]
  procedures         ClinicProcedure[]
  rooms              ClinicRoom[]
  companies          Company[]
  asos               Aso[]
  appointments       DoctorAppointment[]
  cashEntries        DoctorCashEntry[]
  chatRooms          ChatRoom[]

  @@index([cidade, estado])
  @@map("clinics")
}

// vínculo N:N — um médico pode atender em várias clínicas; uma clínica tem vários médicos
model ClinicDoctor {
  id             String            @id @default(uuid())
  clinicId       String            @map("clinic_id")
  clinic         Clinic            @relation(fields: [clinicId], references: [id], onDelete: Cascade)
  doctorId       String            @map("doctor_id")
  doctor         Doctor            @relation(fields: [doctorId], references: [id], onDelete: Cascade)
  role           ClinicDoctorRole  @default(associated)
  commissionPct  Decimal?          @map("commission_pct")   // % de repasse — usado no financeiro consolidado
  roomId         String?           @map("room_id")
  room           ClinicRoom?       @relation(fields: [roomId], references: [id])
  status         String            @default("active")
  joinedAt       DateTime          @default(now()) @map("joined_at")
  leftAt         DateTime?         @map("left_at")

  @@unique([clinicId, doctorId])
  @@index([clinicId])
  @@map("clinic_doctors")
}

// staff administrativo da clínica (não médico) — recepção, financeiro, gestão
model ClinicStaff {
  id         String          @id @default(uuid())
  clinicId   String          @map("clinic_id")
  clinic     Clinic          @relation(fields: [clinicId], references: [id], onDelete: Cascade)
  userId     String          @map("user_id")
  user       User            @relation(fields: [userId], references: [id])
  role       ClinicStaffRole @default(reception)
  status     String          @default("active")
  startedAt  DateTime        @default(now()) @map("started_at")
  endedAt    DateTime?       @map("ended_at")

  @@index([clinicId])
  @@map("clinic_staff")
}

// sala/consultório físico — usado para não sobrepor agenda no mesmo espaço
model ClinicRoom {
  id         String         @id @default(uuid())
  clinicId   String         @map("clinic_id")
  clinic     Clinic         @relation(fields: [clinicId], references: [id], onDelete: Cascade)
  name       String                                  // "Consultório 1", "Sala de Coleta"
  floor      String?
  isActive   Boolean        @default(true) @map("is_active")
  assigned   ClinicDoctor[]

  @@map("clinic_rooms")
}

// catálogo de procedimentos da clínica — com preço e duração padrão (base do financeiro/agenda)
model ClinicProcedure {
  id              String    @id @default(uuid())
  clinicId        String    @map("clinic_id")
  clinic          Clinic    @relation(fields: [clinicId], references: [id], onDelete: Cascade)
  name            String
  tussCode        String?   @map("tuss_code")          // reaproveita apps/api/src/modules/catalog (TUSS)
  category        String    @default("consulta")        // consulta|exame|procedimento|cirurgia
  defaultPrice    Decimal   @map("default_price")
  durationMinutes Int       @default(30) @map("duration_minutes")
  healthPlanPrices Json?    @map("health_plan_prices")   // { "Unimed": 180.00, "particular": 250.00 }
  isActive        Boolean   @default(true) @map("is_active")
  createdAt       DateTime  @default(now()) @map("created_at")

  @@index([clinicId])
  @@map("clinic_procedures")
}
```

### 3.2 Alterações incrementais (não-destrutivas) em models existentes

Todas as colunas novas são **opcionais** — nada quebra para médico solo.

```prisma
model User {
  // ...existentes
  clinicOwned    Clinic?         @relation("ClinicOwner")
  clinicStaff    ClinicStaff[]
}

model Doctor {
  // ...existentes
  clinics        ClinicDoctor[]
}

model Company {
  clinicId String? @map("clinic_id")
  clinic   Clinic? @relation(fields: [clinicId], references: [id])
  // doctorId continua existindo (quem cadastrou) — clinicId é o "dono" agregador
}

model Aso {
  clinicId String? @map("clinic_id")
  clinic   Clinic? @relation(fields: [clinicId], references: [id])
}

model DoctorAppointment {
  clinicId    String?          @map("clinic_id")
  clinic      Clinic?          @relation(fields: [clinicId], references: [id])
  procedureId String?          @map("procedure_id")
  procedure   ClinicProcedure? @relation(fields: [procedureId], references: [id])
  roomId      String?          @map("room_id")
  // "type" (string livre) some a existir lado a lado com procedureId (migração suave: procedureId opcional)
}

model DoctorCashEntry {
  clinicId String? @map("clinic_id")
  clinic   Clinic? @relation(fields: [clinicId], references: [id])
}

model ChatRoom {
  clinicId String? @map("clinic_id")
  clinic   Clinic? @relation(fields: [clinicId], references: [id])
}
```

Migration: `npx prisma migrate dev --name sprint21_clinicas_hospitais` (sequência de sempre: migrate deploy → generate → nest build → restart api).

---

## 4. Login / autenticação (3º perfil)

Reaproveita 100% o `AuthService` e o `POST /auth/login` atual — só muda o **role** retornado e a lógica de redirecionamento no front:

- `role: 'user'` → app Paciente (`apps/web`)
- `role: 'doctor'` → app Doutor (`apps/doutor`), já existe `Doctor` 1:1
- `role: 'clinic_admin'` → **novo** → app Clínica (`apps/clinica`), já existe `Clinic` 1:1 (`ownerUserId`)
- Funcionário da clínica (recepção/financeiro) → continua `role: 'user'`, mas com registro em `ClinicStaff`; o guard do app Clínica libera acesso a telas específicas checando `ClinicStaff` (mesmo padrão que `DoctorStaff` já usa hoje para funcionários de médico — ver `apps/api/src/modules/doctor-staff/`).

Mudanças mínimas de backend:
1. `enum UserRole { user doctor admin clinic_admin }` no `schema.prisma`.
2. `apps/api/src/modules/auth/auth.service.ts` → endpoint de registro de clínica (`POST /auth/register-clinic` ou fluxo dentro do `clinic.controller.ts`: cria `User(role=clinic_admin)` + `Clinic` + `ClinicCounter` num só passo, espelhando como `doctor.controller.ts` faz para CRM).
3. `RolesGuard` (`apps/api/src/common/guards/roles.guard.ts`) já funciona sem alteração — só passar `@Roles('clinic_admin')` nos novos controllers.
4. Novo `ClinicAuthGuard`/checagem composta para staff: `role==='clinic_admin' OR existe ClinicStaff ativo para este userId+clinicId` (mesmo espírito do que autoriza `DoctorStaff` hoje).

---

## 5. Estrutura de pastas

```
apps/api/src/modules/clinic/
  clinic.module.ts
  clinic.controller.ts          # CRUD clínica, vincular/desvincular médico, staff, salas
  clinic.service.ts
  clinic-aggregation.service.ts # queries "doctorId IN (...)" reaproveitando os services existentes
  dto/
    create-clinic.dto.ts
    link-doctor.dto.ts
    clinic-staff.dto.ts
    clinic-procedure.dto.ts

apps/clinica/                    # NOVO APP Next.js — mesmo esqueleto de apps/doutor
  src/app/
    login/                       # copiado de apps/doutor/src/app/login, ajustando role esperado
    dashboard/                   # visão consolidada: agenda do dia (todos os médicos), faturamento, ASOs pendentes
    medicos/                     # roster de médicos da clínica (convidar por icode/CRM, comissão, sala)
    agenda/                      # agenda multi-médico (calendário por profissional/sala, igual apps/doutor/agenda mas com filtro de médico)
    pacientes/                   # união de PatientDoctor de todos os médicos da clínica
    empresas/                    # igual apps/doutor/empresas, mas clinicId em vez de doctorId
    aso/                         # igual apps/doutor/aso, consolidado
    procedimentos/               # NOVO — catálogo de procedimentos + preço + convênio
    financeiro/                  # DRE consolidado + por médico + por procedimento
    staff/                       # funcionários administrativos da clínica
    salas/                       # NOVO — cadastro de consultórios/salas
    layout.tsx
  package.json                   # copiar de apps/doutor, ajustar nome/porta (ex.: 3003)
```

Reaproveitamento de componentes: `apps/doutor/src/components/ui/AutocompleteInput.tsx` e o restante da UI podem ser promovidos para um pacote compartilhado (`packages/ui` — hoje não existe, ficaria para uma fase de *hardening* do monorepo) ou simplesmente duplicados no início para não travar o MVP.

---

## 6. Endpoints (REST) — módulo `clinic`

Prefixo `/clinic`, `JwtAuthGuard` + `RolesGuard('clinic_admin')` (staff libera endpoints específicos via checagem `ClinicStaff`):

| Método | Rota | Descrição |
|---|---|---|
| POST | `/clinic/register` | Cria `User(clinic_admin)` + `Clinic` + `clinicCode` |
| GET | `/clinic/me` | Dados da clínica logada |
| PATCH | `/clinic/me` | Atualiza dados cadastrais |
| POST | `/clinic/doctors` | Vincula médico existente (busca por `icode`/CRM, igual `POST /doutor/patients` busca por icode) |
| GET | `/clinic/doctors` | Lista médicos vinculados (`ClinicDoctor` + dados do `Doctor`) |
| DELETE | `/clinic/doctors/:id` | Desvincula (soft — `leftAt`) |
| GET | `/clinic/patients` | União de pacientes de todos os médicos da clínica (dedupe por `userId`) |
| GET | `/clinic/agenda?date=&doctorId=&roomId=` | Agenda consolidada, filtrável |
| GET | `/clinic/companies` | Empresas da clínica |
| GET | `/clinic/asos` | ASOs emitidos por qualquer médico da clínica |
| GET/POST | `/clinic/procedures` | Catálogo de procedimentos |
| GET/POST | `/clinic/rooms` | Salas |
| GET/POST | `/clinic/staff` | Funcionários administrativos |
| GET | `/clinic/financeiro/dre?from=&to=` | Consolidado (soma `DoctorCashEntry` por `clinicId`) |
| GET | `/clinic/financeiro/por-medico?from=&to=` | Quebra por médico, aplica `commissionPct` |

---

## 7. Fluxos principais

1. **Onboarding da clínica**: cadastro (CNPJ via BrasilAPI, já existe `company.service.ts`/robusto) → gera `clinicCode` → convida médicos já cadastrados no ICODLIFE (por `icode` ou CRM+UF) → médico aceita convite (`ClinicDoctor.status: pending → active`, análogo ao fluxo de convite de `FamilyMember`).
2. **Agenda consolidada**: tela única com colunas por médico (ou por sala), reaproveitando o motor de slots que já existe em `doctor-agenda` (`DoctorWorkingHours`/`DoctorBlockedSlot`) — só passa a filtrar por `doctorId IN (SELECT doctorId FROM clinic_doctors WHERE clinicId=X AND status='active')`.
3. **Procedimento com preço**: ao marcar consulta, escolher `ClinicProcedure` em vez de digitar tipo livre → preço já sugerido (por convênio) → gera automaticamente rascunho de `DoctorCashEntry` (como já acontece hoje ao concluir `DoctorAppointment`, só que herdando `clinicId`).
4. **ASO em nome da clínica**: o PDF de ASO (`ophthalmology-pdf.service.ts` é o padrão a seguir, já existe geração server-side assinada para ASO em `Aso` + Sprint 19 HMAC) passa a poder exibir o **cabeçalho da clínica** (logo, CNPJ da clínica) além dos dados do médico examinador — útil quando o cliente contrata a clínica, não um médico específico.
5. **Financeiro consolidado**: DRE por clínica = soma de `DoctorCashEntry` de todos os médicos vinculados; visão "por médico" aplica `commissionPct` de `ClinicDoctor` para calcular repasse.

---

## 8. Compatibilidade e migração

- **Médico solo (hoje)**: nada muda. `clinicId` fica `null` em tudo, telas de `apps/doutor` continuam idênticas.
- **Médico que entra numa clínica**: os registros novos (`DoctorAppointment`, `Aso`, `DoctorCashEntry` etc.) passam a nascer com `clinicId` preenchido; os antigos podem ser migrados em lote (`UPDATE ... SET clinic_id = X WHERE doctor_id = Y`) se o médico quiser "doar" o histórico para a clínica — deve ser uma ação explícita e opcional, não automática (LGPD/consentimento).
- **App Doutor continua sendo o app principal do médico**, mesmo vinculado a uma clínica — o app Clínica é uma camada de gestão, não substitui o dia a dia clínico do médico.

---

## 9. Roadmap por sprints

| Sprint | Entrega |
|---|---|
| **21.1** | Schema (`Clinic`, `ClinicDoctor`, `ClinicStaff`, `ClinicRoom`, `ClinicProcedure` + colunas opcionais) + migration + seed de 1 clínica demo vinculando o Dr. Marcos |
| **21.2** | `apps/api/src/modules/clinic` completo (CRUD clínica, vínculo de médico, staff, salas, procedimentos) |
| **21.3** | `apps/clinica` — esqueleto Next.js (login, layout, dashboard) + telas `medicos/`, `agenda/` |
| **21.4** | Telas `pacientes/`, `empresas/`, `aso/` (todas reaproveitando componentes de `apps/doutor` com fonte de dados trocada para `/clinic/*`) |
| **21.5** | `procedimentos/`, `salas/`, `financeiro/` (DRE consolidado + por médico) |
| **21.6** | Convite/aceite de médico (fluxo assíncrono), permissões de staff por papel, auditoria |
| **21.7 (hardening)** | Testes e2e do módulo, ASO com cabeçalho de clínica, exportação/relatórios gerenciais |

Isso substitui o item solto "Sprint 21" do backlog anterior — o módulo Clínicas passa a ser o **Sprint 21 em 7 sub-entregas**, encaixando-se antes do Sprint 22 (gov.br/RNDS) e do Sprint 23 (hardening geral).

---

## 10. Evolução para Big Data / Data Lake / Machine Learning

Esta seção conecta o módulo Clínicas com o que foi montado na sessão anterior (massa de 400 usuários, 15 famílias com herança real de tipo sanguíneo/ABO-Rh, `ai-chat/trends`). Com Clínicas, o grafo de dados fica **paciente ↔ família ↔ médico ↔ clínica ↔ empresa ↔ exame/ASO** — a matéria-prima ideal para modelos populacionais.

### 10.1 Princípio: caminho incremental, sem reescrever a stack

A stack atual (NestJS + Postgres + Redis, tudo em Docker local) **não precisa virar Hadoop/Spark da noite pro dia**. Proposta em 4 fases, cada uma entregando valor sozinha:

**Fase A — Data Warehouse analítico (curto prazo, sem infra nova)**
- Réplica de leitura do Postgres (ou *materialized views*) dedicada a analytics, para não competir com a carga transacional da API.
- `dbt` (ou SQL puro versionado em `apps/api/prisma/analytics/`) para modelar tabelas "gold" já prontas para consumo: `fact_exam_result`, `fact_appointment`, `dim_patient`, `dim_family`, `dim_doctor`, `dim_clinic`.
- Já resolve 80% do pedido de "interpretar dados" — dashboards (`saude-tendencia` já existe) passam a consultar essas views em vez de tabelas transacionais.

**Fase B — Data Lake (médio prazo)**
- Object storage compatível com S3 rodando local em Docker: **MinIO** (leve, já citado como alternativa gratuita no ecossistema Postgres/Docker que o projeto já usa).
- Exportação batch (job noturno, `cron` + script Node/Python) do Postgres para Parquet em camadas:
  - **Bronze**: dump bruto das tabelas (append-only, imutável — auditoria e replay).
  - **Silver**: dados limpos/deduplicados/joinados (ex.: paciente + família + exames + ASOs numa visão desnormalizada).
  - **Gold**: features prontas para ML (ex.: por paciente — idade, sexo, IMC histórico, nº de condições crônicas, tipo sanguíneo, condições dos pais/avós via `FamilyMember`, risco calculado).
- Motor de consulta sobre os Parquet: **DuckDB** (roda embutido, sem cluster, ideal para o estágio atual do projeto) ou Spark só se o volume justificar depois.

**Fase C — Feature Store + Machine Learning (médio/longo prazo)**
- Modelos batch (não real-time no início): `scikit-learn` / `XGBoost` rodando em job agendado, lendo da camada Gold.
- Casos de uso concretos e já viáveis com o schema atual:
  1. **Risco hereditário** — usar o grafo `FamilyMember` (relationship + linkedUserId) para propagar `chronicConditions`/`bloodType` entre gerações e estimar risco do paciente (extensão direta do que foi modelado na massa de dados de teste desta sessão — ali a herança já é "real", aqui vira o motor de inferência).
  2. **Predição de absenteísmo em exames ocupacionais** — usar `DoctorAppointment` + `Aso` histórico por empresa/cargo para prever no-show e otimizar agenda da clínica.
  3. **Matching paciente-médico/especialidade** — a partir de `PatientDoctor` + `HealthSignal`/`aiHealthChats`, sugerir encaminhamento.
  4. **Previsão de demanda de agenda por clínica** — sazonalidade de `DoctorAppointment` para dimensionar sala/médico.
  5. **Score de risco populacional por empresa** (SST) — agregando ASOs + riscos ocupacionais (`Aso.risks`) por `Company`, útil para PCMSO/PGR.
- Servir os resultados via um novo módulo `apps/api/src/modules/ml-insights/` (endpoints REST simples que leem previsões pré-calculadas — nada de inferência síncrona pesada dentro do request da API principal).

**Fase D — Streaming/CDC (só se o volume justificar)**
- Debezium + Kafka (ou Redpanda, mais leve) capturando mudanças do Postgres em tempo real, alimentando a camada Bronze continuamente em vez de batch noturno.
- Adiar até haver volume real de produção — hoje é over-engineering.

### 10.2 Governança e LGPD (não negociável, dado sensível de saúde)

- **Pseudonimização** na entrada do Data Lake: `userId` (UUID) nunca sai como PII direta nas camadas Silver/Gold sem necessidade; nome/CPF/e-mail ficam só na camada Bronze, com acesso restrito.
- Reaproveitar `UserConsent` (já existe no schema) — adicionar `consentType: data_processing_analytics` explícito antes de incluir o paciente no Data Lake/treinamento de modelo.
- Direito ao esquecimento (`deleteAccount`, já existe em `auth.service.ts`) precisa propagar para as camadas Bronze/Silver/Gold — deletar ou anonimizar nos exports subsequentes.
- Auditoria (`AuditLog`, já existe) deve registrar todo job de export para o Data Lake.

### 10.3 Por onde começar de verdade (recomendação prática)

1. Fechar o módulo Clínicas até a Fase Sprint 21.5 (schema + telas essenciais) — sem isso o grafo relacional fica incompleto.
2. Fase A (views analíticas) pode começar **em paralelo**, já usando os 400 usuários de teste — é a validação mais barata de que o pipeline "dado bruto → dado interpretável" funciona antes de investir em MinIO/DuckDB.
3. Só then Fase B/C, priorizando o caso de uso 1 (risco hereditário), que já tem dado real modelado (massa de teste + `FamilyMember`) e conecta diretamente com o que a Fase 3 do motor de saúde (backlog) já promete.

---

## 11. Próximos passos imediatos (o que codar primeiro)

1. `schema.prisma`: adicionar `Clinic`, `ClinicDoctor`, `ClinicStaff`, `ClinicRoom`, `ClinicProcedure`, `ClinicCounter`, enum `clinic_admin`, colunas opcionais em `Company`/`Aso`/`DoctorAppointment`/`DoctorCashEntry`/`ChatRoom`.
2. `npx prisma migrate dev --name sprint21_clinicas_hospitais`.
3. Seed: criar 1 `Clinic` demo ("Clínica ICODLIFE Centro") vinculando `dr.marcos@demo.icodlife.com` como `owner`, reaproveitando os 400 usuários de teste já existentes como pacientes da clínica (basta popular `clinicId` nos `PatientDoctor`/`DoctorAppointment` de teste, se quiser simular volume desde já).
4. `apps/api/src/modules/clinic/` — CRUD básico + `/clinic/doctors` + `/clinic/patients` (agregação simples primeiro, agenda/financeiro depois).
5. `apps/clinica/` — esqueleto copiado de `apps/doutor` (login + layout + dashboard) rodando na porta 3003.

---

## 12. Status de Execução (atualizado a cada sessão — LER PRIMEIRO ao retomar)

> Esta seção é a fonte da verdade de progresso do módulo. Antes de continuar em uma
> nova sessão, leia aqui o que já está feito, o que falta, e os detalhes técnicos
> (nomes de arquivos, contas demo) para não perder contexto.

### ✅ Feito (Sprint 21.1, 21.1b, 21.2, 21.2b, 21.3–21.7)

**Schema (`apps/api/prisma/schema.prisma`)** — adicionado sem quebrar nada existente:
- Novos models: `Clinic`, `ClinicDoctor`, `ClinicStaff`, `ClinicRoom`, `ClinicProcedure`, `ClinicCounter`.
- Novos enums: `ClinicDoctorRole` (owner/associated/visiting), `ClinicStaffRole` (admin/reception/financeiro/nurse), `UserRole.clinic_admin`.
- Colunas opcionais (`clinicId`) em `Company`, `Aso`, `DoctorAppointment` (+ `procedureId`, `roomId`), `DoctorCashEntry`, `ChatRoom`.
- Relações novas em `User` (`clinicOwned`, `clinicStaff`) e `Doctor` (`clinics`).
- `Clinic.ownerUserId` é `@unique` (1 clínica por usuário admin, mesmo padrão de `Doctor.userId`).
- Validado manualmente (sem acesso a banco neste ambiente): balanceamento de chaves/parênteses e checagem cruzada de toda `@relation(fields/references)` contra os models — **0 erros**. `prisma validate` real (com engine) precisa rodar na máquina do usuário antes da migration.

**Backend (`apps/api/src/modules/clinic/`)** — módulo completo:
- `clinic.module.ts`, `clinic.controller.ts` (2 controllers: `BecomeClinicAdminController` em `/auth/become-clinic-admin`, `ClinicPanelController` em `/clinic/*`), `clinic.service.ts`.
- DTOs em `dto/`: `create-clinic`, `update-clinic`, `link-doctor`, `clinic-staff`, `clinic-procedure`, `clinic-room` — todos com `class-validator` (respeitam o `ValidationPipe` global whitelist).
- Registrado em `apps/api/src/app.module.ts` (import + `ClinicModule` na lista de `imports`).
- Endpoints implementados: `becomeClinicAdmin`, `getMyClinic`, `updateClinic`, `linkDoctor` (busca por ICODE ou `CRM.UF`), `listDoctors`, `unlinkDoctor`, `listPatients` (união deduplicada de `PatientDoctor` de todos os médicos ativos da clínica), `listAgenda` (filtro por data/médico/sala), `listCompanies`, `listAsos`, `createRoom`/`listRooms`, `createProcedure`/`listProcedures`, `addStaff`/`listStaff`/`removeStaff`, `financeiroDre`, `financeiroPorMedico` (aplica `commissionPct`).
- **Decisão de design importante**: a agregação multi-médico (pacientes/agenda/empresas/ASOs/financeiro) filtra por `doctorId IN (médicos ativos da clínica)` — **não depende de backfill de `clinicId`** nos registros antigos. Um médico que entra numa clínica já aparece "consolidado" imediatamente, sem migração de dados.
- Confirmado: `JwtStrategy` (`apps/api/src/common/strategies/jwt.strategy.ts`) busca o `role` do usuário no banco a cada request (não fica preso no JWT) — então depois de `become-clinic-admin` o usuário já usa o token atual sem precisar logar de novo.

**Seeds**:
- `apps/api/prisma/seed-clinic-demo.js` — cria a clínica demo "Clínica ICODLIFE Centro" (CNPJ `12345678000199`), um 2º médico (`dra.fernanda@demo.icodlife.com`, Dermatologia) para provar o conceito multi-médico, vincula Dr. Marcos como sócio (`owner`, 100% comissão) e Dra. Fernanda como associada (70%), 3 salas, 6 procedimentos com preço, e um usuário de recepção (`recepcao.centro@demo.icodlife.com`).
- Script de conveniência: `pnpm --filter api run db:seed:clinic-demo`.

**Contas demo do módulo Clínicas** (senha `Demo@12345` para todas):
| Papel | E-mail |
|---|---|
| Admin da clínica | `clinica.centro@demo.icodlife.com` |
| Médico sócio | `dr.marcos@demo.icodlife.com` |
| Médica associada | `dra.fernanda@demo.icodlife.com` |
| Recepção | `recepcao.centro@demo.icodlife.com` |

**Frontend (`apps/clinica/`, porta 3003)** — app Next.js 14 completo, mesmo padrão de `apps/doutor`:
- Config base: `package.json` (`@icodlife/clinica`, script `dev` na porta 3003), `next.config.js`, `tsconfig.json`, `tailwind.config.js` (paleta índigo, para diferenciar visualmente de paciente/vermelho e médico/azul), `postcss.config.js`, `.env.local`/`.env.example` (`NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1`).
- `src/lib/api.ts` — client axios com interceptor de token (`clinica_token` no localStorage) + `clinicApi` cobrindo todas as rotas `/clinic/*` e `/auth/become-clinic-admin`.
- `src/lib/auth.ts` — `login()` (valida `role === 'clinic_admin'`), `logout()`, `getStoredUser()`, `getMyClinicProfile()`.
- `src/app/login/page.tsx` — tela de entrada (paleta índigo, "Portal Clínica").
- `src/app/register/page.tsx` — fluxo de **ativação de clínica em 2 passos**: 1) login com conta ICODLIFE já existente (paciente ou médico) 2) formulário de dados da clínica (razão social, CNPJ, tipo de estabelecimento, endereço) → chama `POST /auth/become-clinic-admin`. Não precisa relogar depois: o token antigo já passa a carregar `role=clinic_admin` porque o `JwtStrategy` busca o role no banco a cada request.
- `src/components/ui/ClinicShell.tsx` — sidebar/layout autenticado, guarda de rota por `role=clinic_admin`, menu: Dashboard, Médicos, Agenda, Pacientes, Empresas, ASO, Procedimentos, Salas, Equipe, Financeiro, Configurações.
- Páginas: `dashboard/` (cards de resumo + agenda do dia), `medicos/` (vincular/desvincular médico por ICODE ou CRM.UF, comissão, sala), `agenda/` (filtro por data/médico), `pacientes/` (lista deduplicada com busca), `empresas/`, `aso/` (com badges de resultado apto/inapto), `procedimentos/` (CRUD com preço/duração/TUSS), `salas/` (CRUD simples), `staff/` (adicionar/remover por ICODE ou e-mail, função), `financeiro/` (DRE consolidado + repasse por médico com filtro de data), `configuracoes/` (editar dados cadastrais da clínica).
- **Validado com o compilador TypeScript real** (`tsc --noEmit` contra os tipos de Next/React já presentes no monorepo) — **0 erros** em todos os arquivos do app. Achou e corrigiu 1 bug real (JSX mal fechado em `register/page.tsx`, causado por um truncamento de arquivo no ambiente de escrita — corrigido e revalidado).
- **Não rodou `pnpm dev` de verdade** (sandbox sem os pacotes instalados via rede) — só validação estática de tipos/sintaxe.

### ✅ Login validado (19/07) — bug corrigido

O login do painel Clínica (`localhost:3003/login`, `clinica.centro@demo.icodlife.com` / `Demo@12345`) estava dando **"Internal server error"**. Causa raiz identificada e corrigida nesta sessão:
- O `schema.prisma` e a migration `20260718211553_sprint21_clinicas_hospitais` já tinham `clinic_admin` no enum `UserRole` corretamente, e `npx prisma migrate status` confirmava schema em dia — mas o **Prisma Client compilado em `dist/src/generated/prisma`** estava desatualizado (o `nest-cli.json` só copia a pasta `generated/**/*` como asset na build "fria", com `watchAssets: false`, e `deleteOutDir: false` nunca limpa o `dist` antigo).
- Fix aplicado: `npx prisma generate` (regenera `src/generated/prisma`) + cópia manual para `dist/src/generated/prisma` (`Remove-Item -Recurse -Force dist` sozinho não bastou — a cópia de assets do `nest-cli` não rodou a tempo; foi preciso `Copy-Item -Recurse -Force src\generated\prisma dist\src\generated\prisma` manualmente antes do `pnpm dev`).
- **Login confirmado funcionando** após o fix.
- ⚠️ **Atenção para próximas mudanças de schema**: sempre que rodar `npx prisma generate` de novo, repetir a cópia manual pra `dist/src/generated/prisma` (ou apagar o `dist` inteiro e copiar) antes de reiniciar a API — o `nest-cli.json` não recopia isso automaticamente em watch mode.

### ✅ Telas do painel Clínica validadas (19/07)

Validado manualmente pelo usuário no navegador (`localhost:3003`, logado como `clinica.centro@demo.icodlife.com`): dashboard (ClinicID `CL.00001.SP`, 2 médicos vinculados, 1 equipe, 402 pacientes, especialidades: Cardiologia/Clínica Geral/Dermatologia/Estética Médica, agenda do dia vazia), Médicos, Agenda, Pacientes, Empresas, ASO, Procedimentos, Salas, Equipe, Financeiro e Configurações — todas carregando sem erro.

### ⏳ Pendente (próxima sessão)

- Testes e2e do módulo `clinic` (backend).
- ASO com cabeçalho de clínica (hoje o PDF só tem dados do médico).
- Decidir se/como fazer o backfill opcional de `clinicId` nos 400 pacientes de teste e nos registros antigos de médicos que entrarem numa clínica (é uma ação explícita, não automática — ver Seção 8).
- Bug separado encontrado nos logs (não bloqueante): `medications.service.ts:18` — `prisma.medication.create()` falha com "Null constraint violation on `scheduled_times`" quando o medicamento é salvo sem frequência definida.
- Seções 10 e 11 do plano (Big Data / Data Lake / ML) seguem como próxima fase depois do módulo Clínicas estar validado ponta a ponta.

### 📁 Arquivos tocados nesta etapa (para referência rápida)
```
apps/api/prisma/schema.prisma                          (editado)
apps/api/prisma/seed-clinic-demo.js                     (novo)
apps/api/package.json                                   (editado — script db:seed:clinic-demo)
apps/api/src/app.module.ts                               (editado — registra ClinicModule)
apps/api/src/modules/clinic/clinic.module.ts             (novo)
apps/api/src/modules/clinic/clinic.controller.ts          (novo)
apps/api/src/modules/clinic/clinic.service.ts             (novo)
apps/api/src/modules/clinic/dto/*.ts                      (novo, 6 arquivos)
apps/clinica/                                             (novo — app Next.js completo, ~20 arquivos)
```
