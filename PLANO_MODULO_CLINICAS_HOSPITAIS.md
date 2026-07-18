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
