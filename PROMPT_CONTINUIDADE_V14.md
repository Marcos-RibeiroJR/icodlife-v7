# Prompt de Continuidade — ICODLIFE / Sou Doutor (V14)

Cole o bloco da **Seção 2** como primeira mensagem na próxima sessão. As demais seções são referência de progresso, backlog e roadmap.

---

## 1. Visão geral do progresso

### Rumo atual
O projeto segue forte em **Medicina/Segurança do Trabalho (SST)** e no **app do paciente**, e neste ciclo ganhou o alicerce do grande objetivo do produto: um **Motor de Sinais e Risco de Saúde** que cruza várias fontes de dados do paciente (chat diário, exames, medicamentos, pressão, etc.), gera flags/score/tendência de risco e vai alimentar um dashboard de tendência (o "prontuário online centralizador").

### Entregue neste ciclo (V13 → V14)

| Módulo | O que ficou pronto | Migration |
|---|---|---|
| **ASO — PDF assinado (Sprint 19)** | Geração server-side do ASO (NR-07) em PDF com PDFKit, assinatura digital HMAC-SHA256, hash SHA-256 e **QR de validação pública**. Endpoint de download e verificação pública. Botão "Baixar PDF" no app do médico substituiu o `window.print`. | `20260705204115_sprint19_aso_signature` |
| **Fix PushController** | Corrigido prefixo duplicado `/api/v1/api/v1/push` → `@Controller('push')`. Push notifications destravados end-to-end. | — |
| **Motor de Sinais e Risco de Saúde (Fase 1+2)** | Modelos `HealthCheckin` (1/dia: sentimento, riskScore 0–100, riskLevel, tendência, flags, resumo) e `HealthSignal` (sinais estruturados). Interpretador determinístico + motor de risco. Chat diário (HealthBot) reescrito e **corrigido**. | `20260705212035_health_risk_engine` |
| **Fix Módulo Vida (lifestyle)** | Save que sempre dava erro 400 agora funciona: causa era o `ValidationPipe` global rejeitando DTO sem decorators. Solução: `@Body() dto: any` + coerção de tipos robusta no service. Persiste tudo em `lifestyle_profiles` + snapshot histórico. | — |
| **Fix chat (corrida)** | `POST /ai-chat/start` ficou **idempotente** (trata `P2002` de índice único) — React StrictMode disparava 2 chamadas e estourava. | — |

### Estado do Git (IMPORTANTE)
- **No GitHub (origin/develop):** até o commit `48eb62f` — *feat(sprint19): ASO em PDF assinado + QR*.
- **Local, NÃO enviado ainda:** motor de risco de saúde, `health-signals.ts`, reescrita do `ai-chat`, fix do Módulo Vida (`lifestyle`), fix do chat, e a migration `20260705212035_health_risk_engine`.
- **Lock pendente:** existe um `.git/index.lock` travado — remover antes de commitar.

**Comandos para enviar tudo (PowerShell, raiz do projeto):**
```
Remove-Item .git\index.lock -ErrorAction SilentlyContinue
git add -A
git commit -m "feat: motor de sinais e risco de saude (checkin diario) + fix save Modulo Vida + fix chat idempotente"
git push origin develop
```

### Pendências técnicas / dívidas
- **Enviar o commit acima ao GitHub** (feito localmente, falta push).
- Migration `20260705212035_health_risk_engine` já aplicada no banco local; aplicar no ambiente se rodar em outra máquina (`npx prisma migrate deploy`).
- Padronizar o "PDF" das **receitas** também para server-side assinável (o ASO já está; receitas ainda usam `window.print`).
- `LifestyleProfile` não tem coluna `healthScore`, mas a tela do Módulo Vida referencia `profile.healthScore` (card nunca aparece) — decidir se cria o score ou remove a referência.
- Operacional recorrente: porta **3001** presa por `node` órfão (EADDRINUSE) — parar com Ctrl+C, nunca no X.

---

## 2. BLOCO DE CONTINUIDADE (colar na próxima sessão)

```
Continuando o desenvolvimento do monorepo ICODLIFE / Sou Doutor.

STACK
- Monorepo pnpm workspaces
- apps/api    -> NestJS, porta 3001, prefixo global /api/v1
- apps/web    -> Next.js 14, porta 3000 (paciente)
- apps/doutor -> Next.js 14, porta 3002 (médico)
- apps/mobile -> Expo React Native (Login, Dashboard, HealthBot prontos)
- ORM: Prisma 5.22, output customizado em src/generated/prisma (NUNCA @prisma/client; import relativo ../../generated/prisma)
- Banco: PostgreSQL via Docker, container icodlife_postgres, porta 5434 (+ redis 6379)
- Node v24 - pnpm workspaces

COMO SUBIR TUDO (4 janelas PowerShell, nesta ordem)
1) Docker:  docker start icodlife_postgres icodlife_redis   (Docker Desktop aberto)
2) API:     cd apps\api
            npx nest build
            robocopy src\generated dist\src\generated /E /XF *.dll.node /NFL /NDL /NJH /NJS
            node dist/src/main        (esperar "API IcodLife rodando na porta 3001")
3) Paciente: cd apps\web  ; pnpm dev  -> http://localhost:3000
4) Médico:   cd apps\doutor ; pnpm dev -> http://localhost:3002
- Parar sempre com Ctrl+C (nunca fechar no X). EADDRINUSE 3001:
  Get-NetTCPConnection -LocalPort 3001 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
- Após mudar schema.prisma: npx prisma migrate dev --name <nome> ; npx prisma generate ; rebuild.

CREDENCIAIS DEMO (senha Demo@12345)
- Paciente M: joao@demo.icodlife.com
- Paciente F: ana@demo.icodlife.com
- Médico:     dr.marcos@demo.icodlife.com (portal 3002)

QUIRKS CRÍTICOS
- User usa fullName (coluna full_name), não name.
- Import Prisma sempre relativo: import { X } from '../../generated/prisma'
- ValidationPipe global = whitelist + forbidNonWhitelisted + transform.
  => DTO sem decorators do class-validator faz o Nest REJEITAR a requisição inteira (400).
     Controllers do doutor e o lifestyle usam @Body() dto: any para evitar isso.
     (Foi essa a causa do bug do Módulo Vida.)
- Endpoints de "start/criar 1 por dia" precisam ser IDEMPOTENTES: React StrictMode dispara
  o efeito 2x em dev; tratar unique violation P2002 (lição do chat).
- Rotas com :param que recebem CNPJ/valores -> enviar só dígitos (barra do CNPJ quebra a rota).
- Appointment usa appointmentAt; DoctorAppointment/Surgery usam scheduledAt.

MÓDULOS DE SAÚDE/RISCO (novos neste ciclo)
- ai-chat (HealthBot): check-in diário. Cada resposta é interpretada por regras determinísticas
  (health-signals.ts) em sinais estruturados (health_signals) e consolidada em health_checkins
  (1 por dia) com flags/riskScore/riskLevel/tendência. Endpoints:
  POST /ai-chat/start, POST /ai-chat/message, GET /ai-chat/history, GET /ai-chat/trends?period=daily|weekly|monthly|annual
- aso: ASO em PDF assinado (HMAC-SHA256 + QR). GET /doutor/aso/:id/pdf (download),
  GET /aso/verify/:token (validação pública). Campos Aso.signatureHash/verifyToken/signatureExpiresAt.

ESTADO
- ASO PDF assinado, motor de risco (Fase 1+2), fix Módulo Vida e fix chat: concluídos.
- GitHub em origin/develop = 48eb62f; o motor de risco + fixes ainda estão LOCAIS (fazer push).

PRÓXIMO PASSO SUGERIDO
[escolher da Seção 4/5 deste arquivo — recomendado: Fase 3, Dashboard de Tendência de Saúde]
```

---

## 3. Módulos da API (visão)

Auth · Users · Family · Records · Menstrual · **AiChat (HealthBot + risco)** · Share · Medications · Appointments · Notifications · Ophthalmology · BloodPressure · OccupationalHealth · MentalHealth · **Aso (PDF assinado)** · Company · ExamResults · **Lifestyle (corrigido)** · Doctor · MeusMedicos · Prontuario · Surgery · Vaccines · BodyMetrics · DoctorAgenda · DoctorPrescriptions · DoctorStaff · DoctorFinanceiro · Chat · Glucose · Export · Telemedicine · Push

**Novos modelos:** `HealthCheckin`, `HealthSignal`. **Relações novas:** `User.healthCheckins`, `User.healthSignals`, `HealthCheckin.signals`, `Aso.signatureHash/verifyToken/signatureExpiresAt`.

---

## 4. Backlog de sprints planejadas/pendentes

| Sprint | Tema | Status |
|---|---|---|
| 17 | App Mobile Expo — telas principais | ✅ Concluído |
| 18 | Pagamentos — Stripe ou Pagar.me, assinaturas | 🔜 Pendente |
| 19 | Prontuário/ASO PDF assinado | ✅ ASO concluído; receitas pendentes |
| 20 | Dashboard Analytics para o médico | 🔜 Pendente |
| 21 | Multi-tenant — clínica com múltiplos médicos | 🔜 Pendente |
| 22 | Integração gov.br / RNDS | 🔜 Pendente |
| 23 | Hardening + Deploy VPS | 🔜 Pendente |

---

## 5. Motor de Saúde — roadmap (a trilha principal do produto)

- **Fase 1 — Fundação de dados** ✅ (models HealthCheckin/HealthSignal, extração, gravação).
- **Fase 2 — Motor de risco** ✅ (regras determinísticas, flags, score, tendência).
- **Fase 3 — Dashboard de Tendência de Saúde** 🔜 (RECOMENDADO): página no app do paciente com gráficos **diário/semanal/mensal/anual**, consumindo `GET /ai-chat/trends`, cruzando também exames, medicamentos, pressão, glicemia, saúde mental e Módulo Vida. É o "prontuário online centralizador".
- **Fase 4 — Big data global + IA** 🔜: agregação populacional (anônima) e camada de IA para interpretação mais fina das respostas em texto livre.

### Ideias de evolução (SST / IA / mobile / plataforma)
- ASO: filiais por empresa; vincular trabalhador a paciente; agenda de exames ocupacionais com alertas de vencimento; PGR/PCMSO por cargo; gestão documental (LTCAT, PCA, etc.); eSocial (S-2220/S-2210/S-2240).
- IA preditiva sobre saúde mental/risco (burnout, absenteísmo, risco psicossocial).
- Mobile: telas de Saúde Mental e ASO; push end-to-end; biometria (expo-local-authentication).
- Plataforma: multi-tenant/clínica; pagamentos/planos; portal read-only da empresa (RH); auditoria/LGPD; CI/CD + deploy.

---

## 6. Correções técnicas a agendar
- **Push do commit local** com o motor de risco + fixes (ver Seção 1).
- Receitas em PDF server-side assinável (como o ASO).
- Definir/remover `healthScore` no Módulo Vida.
- Limpeza de diretórios-lixo em `apps/mobile` (pastas com nomes `{...}`), se ainda existirem.
