# Prompt de Continuidade — ICODELIFE / Sou Doutor (V13)

> Cole o bloco da Seção 2 como primeira mensagem na próxima sessão. As demais seções são referência de progresso, backlog e roadmap.

---

## 1. Visão geral do progresso

### Rumo atual
O projeto pivotou fortemente para **Medicina e Segurança do Trabalho (SST)**, além do app do paciente. Nos últimos ciclos entregamos Saúde Mental, ASO, cadastro de Empresas e o vínculo ASO↔Empresa, e verificamos o app mobile.

### Entregue neste ciclo
| Módulo | O que ficou pronto | Migration |
|---|---|---|
| **Saúde Mental** | Escalas livres GAD-7, PHQ-9, CBI, WHO-5; laudo individual + consolidado; fluxo de segurança para ideação suicida; telas paciente (web) e médico (doutor) | `20260701032606_sprint17_mental_health` |
| **ASO (NR-07)** | Emissão, gestão e impressão do Atestado de Saúde Ocupacional no app do médico | `20260701040748_sprint18_aso` |
| **Empresa** | Cadastro/consulta com enriquecimento por CNPJ (BrasilAPI); model `Company`; tela no app do médico | `sprint19_companies` |
| **Vínculo ASO↔Empresa** | Campo `companyId` no ASO + preenchimento automático dos dados da empresa ao emitir | `sprint20_aso_company_link` |
| **Mobile (Sprint 17)** | Telas Login, Dashboard, HealthBot já existiam e foram verificadas; corrigidos 5 erros de tipo + adicionado `react-native-svg` | — |

> Observação sobre numeração: os nomes de migration `sprint17..20` referem-se a estes 4 módulos de SST/saúde mental, e **não** ao backlog original de sprints (Seção 4). O backlog original segue com sua própria numeração.

### Estado do Git (IMPORTANTE)
- Commit `c211844` (Saúde Mental + ASO) — **local na branch `develop`, ainda NÃO enviado** ao GitHub.
- Commit `e480510` (Empresa + vínculo + fixes mobile) — objeto criado, mas a branch não foi movida por causa de locks travados no `.git`.
- **Ação pendente no Windows** (raiz do projeto, PowerShell):
  ```
  Remove-Item .git\index.lock, .git\HEAD.lock, .git\refs\heads\develop.lock -ErrorAction SilentlyContinue
  git add -A
  git commit -m "feat(sprint19-20): modulo Empresa + vinculo ASO-Empresa + fixes mobile"
  git push origin develop
  ```
  Isso envia os dois commits de uma vez.

### Pendências técnicas / dívidas
- **`pnpm install`** para as deps novas: `socket.io-client` (web), `lucide-react` (doutor), `react-native-svg` (mobile).
- **Migrations** a aplicar no Windows se ainda não rodou: `sprint19_companies`, `sprint20_aso_company_link` (via `npx prisma migrate dev`).
- **Bug pré-existente**: rotas do Push com prefixo duplicado — `/api/v1/api/v1/push/...` (o `@Controller('api/v1/push')` soma ao prefixo global). Corrigir para `@Controller('push')`.
- **Operacional recorrente**: porta 3001 fica presa por processos `node` órfãos (`EADDRINUSE`). Parar a API sempre com **Ctrl+C** na janela dela; nunca fechar no X. Se travar: PowerShell **como Administrador** → `taskkill /F /IM node.exe` (ou por PID) → subir de novo; último recurso, reiniciar o Windows.
- Locks do `.git` (index/HEAD/develop) precisam ser removidos no Windows para novos commits.

---

## 2. BLOCO DE CONTINUIDADE (colar na próxima sessão)

```
Continuando o desenvolvimento do monorepo ICODELIFE / Sou Doutor.

STACK
- Monorepo pnpm workspaces
- apps/api → NestJS, porta 3001, prefixo global /api/v1
- apps/web → Next.js 14, porta 3000 (paciente)
- apps/doutor → Next.js 14, porta 3002 (médico)
- apps/mobile → Expo React Native (Login, Dashboard, HealthBot prontos)
- ORM: Prisma 5.22, output customizado em src/generated/prisma (NUNCA @prisma/client; import relativo ../../generated/prisma)
- Banco: PostgreSQL via Docker, container icodlife_postgres, porta 5434
- Node v24 · pnpm workspaces

SEQUÊNCIA DE BUILD DA API (nessa ordem)
cd apps\api
npx prisma migrate dev --name <nome>   (ou migrate deploy)
npx prisma generate
npx nest build
robocopy src\generated dist\src\generated /E /XF *.dll.node /NFL /NDL /NJH /NJS
node dist/src/main
- Parar a API com Ctrl+C (nunca fechar no X — deixa node preso na 3001).
- Se EADDRINUSE: PowerShell Admin → taskkill /F /IM node.exe → subir de novo.

CREDENCIAIS DEMO (senha Demo@12345)
- Paciente M: joao@demo.icodlife.com
- Paciente F: ana@demo.icodlife.com
- Médico: dr.marcos@demo.icodlife.com (portal 3002)

QUIRKS CRÍTICOS
- User usa fullName (coluna full_name), não name.
- Import Prisma sempre relativo: import { X } from '../../generated/prisma'
- CrmStatus: pending|verified|suspended|canceled
- PatientDoctorStatus: pending|active|ended
- AppointmentStatus: scheduled|completed|canceled|no_show
- Appointment usa appointmentAt (não scheduledAt); DoctorAppointment/Surgery usam scheduledAt
- ValidationPipe global: whitelist + forbidNonWhitelisted + transform. Controllers de doutor usam @Body() dto: any para evitar rejeição.
- Rotas com :param que recebem CNPJ/valores → enviar só dígitos (barra do CNPJ quebra a rota).

MÓDULOS DE SST / SAÚDE MENTAL (novos)
- mental-health: escalas GAD-7, PHQ-9, CBI, WHO-5. Registry em scales/. Laudo individual + consolidado. safety.service (ideação suicida). Endpoints /mental-health/*.
- aso: Atestado de Saúde Ocupacional (NR-07). Model Aso, endpoints /doutor/aso/*, impressão client-side (window.print). Campo companyId (vínculo com empresa).
- company: cadastro de empresas. Model Company (colunas core + JSON: responsaveis, medicina, esocial, financeiro, config, metadata). Enriquecimento por CNPJ via BrasilAPI (GET https://brasilapi.com.br/api/cnpj/v1/{cnpj}, grátis, sem chave). Endpoints /doutor/empresas/* incluindo lookup/:cnpj. CNPJ único por médico.

ESTADO
- Saúde Mental, ASO, Empresa e vínculo ASO↔Empresa concluídos (API + telas do médico; Saúde Mental também no app do paciente).
- Mobile: Login/Dashboard/HealthBot verificados.
- Git: 2 commits locais a enviar (ver pendências). Rodar pnpm install (socket.io-client, lucide-react, react-native-svg).

PRÓXIMO PASSO SUGERIDO
[escolher da Seção 4/5 do PROMPT_CONTINUIDADE_V13.md]
```

---

## 3. Módulos da API (visão)

Auth · Users · Family · Records · Menstrual · AiChat · Share · Medications · Appointments · Notifications · Ophthalmology · BloodPressure · OccupationalHealth · **MentalHealth** · **Aso** · **Company** · ExamResults · Lifestyle · Doctor · MeusMedicos · Prontuario · Surgery · Vaccines · BodyMetrics · DoctorAgenda · DoctorPrescriptions · DoctorStaff · DoctorFinanceiro · Chat · Glucose · Export · Telemedicine · Push

Relações novas: `Doctor.companies`, `Doctor.asos`, `Company.asos`, `Aso.companyId`, `User.mentalHealthAssessments`.

---

## 4. Backlog de sprints planejadas/pendentes (numeração original)

| Sprint | Tema | Status |
|---|---|---|
| 17 | App Mobile Expo — telas principais (Login, Dashboard, HealthBot) | ✅ Concluído (telas já existiam, verificadas) |
| 18 | Pagamentos — Stripe ou Pagar.me, planos de assinatura | 🔜 Pendente |
| 19 | Prontuário PDF assinado digitalmente | 🔜 Pendente |
| 20 | Dashboard Analytics para o médico (gráficos, relatórios) | 🔜 Pendente |
| 21 | Multi-tenant — uma clínica com múltiplos médicos | 🔜 Pendente |
| 22 | Integração gov.br / RNDS | 🔜 Pendente |
| 23 | Hardening + Deploy VPS | 🔜 Pendente |

---

## 5. Sugestões de evolução e novas features

### Trilha SST / Medicina do Trabalho (alinhada ao rumo atual)
- **Assinatura digital + QR de validação no ASO** (casa com Sprint 19 — PDF assinado).
- **Filiais/unidades por empresa** (uma empresa com vários CNPJs/estabelecimentos).
- **Vincular o trabalhador do ASO a um paciente cadastrado** (puxar dados clínicos).
- **Agenda de exames ocupacionais** (admissional, periódico, retorno, mudança de função, demissional) com **alertas de vencimento**.
- **Parametrização de riscos e exames por cargo** — base do PGR/PCMSO; gerar automaticamente os exames obrigatórios por NR-07.
- **Gestão documental**: PGR, PCMSO, LTCAT, PCA, PPR, AET, Laudo Ergonômico (upload, validade, alertas).
- **Integração eSocial** (eventos S-2220, S-2210, S-2240) — grande, exige certificado digital A1/A3, ambiente de homologação.
- **Dashboards SST**: vencimentos de ASO/exames, absenteísmo, afastamentos, restrições, distribuição de risco.

### Trilha IA (ICODELIFE)
- **IA preditiva** usando os dados de Saúde Mental: predição de burnout, absenteísmo, afastamento e risco psicossocial.
- **Assistente para o médico/SST**: conferência documental, sugestão de riscos por CNAE/cargo, rascunho de relatórios (decisão sempre do médico).
- **Síntese longitudinal** dos rastreios de saúde mental por trabalhador/empresa.

### Trilha Mobile
- Telas mobile para **Saúde Mental** (responder escalas) e **ASO** (consulta).
- Push notifications end-to-end (corrigir o prefixo duplicado do PushController primeiro).
- Biometria (expo-local-authentication) para login rápido.

### Trilha Plataforma
- **Multi-tenant / clínica** (Sprint 21): organização com múltiplos médicos, papéis e permissões.
- **Pagamentos e planos** (Sprint 18): assinatura por licenças/funcionários (o model Company já tem grupo `financeiro`).
- **Portal da empresa** (área read-only para o RH acompanhar ASOs/vencimentos) — lembrando que empresa não faz login hoje.
- **Auditoria e LGPD**: trilha de acesso a dados sensíveis, consentimento, retenção.
- **Hardening + Deploy** (Sprint 23): CI/CD, variáveis de ambiente, observabilidade, backup do Postgres.

### Correções técnicas a agendar
- PushController prefixo duplicado (`/api/v1/api/v1/push`).
- Padronizar o "PDF" dos documentos (ASO/receitas) — hoje é `window.print`; migrar para PDF server-side assinável (Sprint 19).
- Limpeza de diretórios-lixo no `apps/mobile` (pastas com nomes `{...}` de brace-expansion).
