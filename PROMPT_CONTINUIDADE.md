# Prompt de Continuidade — ICODELIFE / Sou Doutor
# Cole o bloco abaixo como primeira mensagem na nova sessão Cowork

---

Continuando desenvolvimento do monorepo **ICODELIFE / Sou Doutor**.

## Stack

- **Monorepo:** pnpm workspaces
- **apps/api** → NestJS, porta 3001
- **apps/web** → Next.js 14, porta 3000 (paciente)
- **apps/doutor** → Next.js 14, porta 3002 (médico)
- **apps/mobile** → Expo React Native (scaffolded)
- **ORM:** Prisma 5.22 — output customizado em `src/generated/prisma` (NUNCA `@prisma/client`)
- **Banco:** PostgreSQL via Docker, container `icodlife_postgres`, porta 5434
- **Node:** v24 · **pnpm** workspaces

## Sequência de build da API (obrigatória, nessa ordem)

```powershell
cd C:\Users\marcos.junior.3\Downloads\icodlife-v7\apps\api
npx prisma migrate deploy
npx prisma generate
npx nest build
robocopy src\generated dist\src\generated /E /XF *.dll.node /NFL /NDL /NJH /NJS
node dist/src/main
```

- `nest-cli.json` já tem `"deleteOutDir": false` — não mudar (evita EPERM no .dll.node do Prisma).
- Se a porta 3001 estiver ocupada: `netstat -ano | findstr :3001` → `taskkill /F /PID <pid>` (Admin PS se der "access denied").

## Credenciais de demo

| Usuário | E-mail | Senha |
|---|---|---|
| Paciente (M) | joao@demo.icodlife.com | Demo@12345 |
| Paciente (F) | ana@demo.icodlife.com | Demo@12345 |
| Médico | dr.marcos@demo.icodlife.com | Demo@12345 |

## Quirks críticos do projeto

1. **`fullName` (não `name`)** — o model `User` usa `fullName` mapeado para coluna `full_name`. Toda query Prisma no User usa `fullName`.
2. **Import Prisma** sempre relativo: `import { X } from '../../generated/prisma'`
3. **CrmStatus** enum: `pending | verified | suspended | canceled` (sem `active`)
4. **PatientDoctorStatus** enum: `pending | active | ended`
5. **AppointmentStatus** enum: `scheduled | completed | canceled | no_show`
6. **Appointment** tem campo `appointmentAt` (não `scheduledAt`)

## Estado das sprints

### ✅ Concluídas

| Sprint | Entregue |
|---|---|
| 1–4 | Auth, Perfil, Registros médicos, Upload S3 |
| 5 | Pressão Arterial |
| 6 | Ciclo Menstrual |
| 7 | IA Health Chat |
| 8 | Compartilhamento via Token |
| 9 | Medicamentos + aderência |
| 10 | Agenda / Consultas do paciente |
| 11 | Família / ICODE + Notificações SSE |
| 12–13 | Painel Médico completo (agenda, receitas, staff, financeiro, currículo) |
| 14 | Glicemia + HbA1c |
| 15 | **Telemedicina WebRTC** (sala de espera, videochamada, prescrição digital) |
| 16 | **Push Notifications FCM** (device_tokens, PushService, endpoints registro/envio) |

Última migration aplicada: `20260626_sprint16_push_fcm`

### 🔜 Próximas (sugeridas)

| Sprint | Tema |
|---|---|
| 17 | App Mobile Expo — telas principais (Login, Dashboard, HealthBot) |
| 18 | Pagamentos — Stripe ou Pagar.me, planos de assinatura |
| 19 | Prontuário PDF assinado digitalmente |
| 20 | Dashboard Analytics para o médico (gráficos, relatórios) |
| 21 | Multi-tenant — uma clínica com múltiplos médicos |
| 22 | Integração gov.br / RNDS |
| 23 | Hardening + Deploy VPS |

## Módulos da API (27 no total)

```
ai-chat · appointments · auth · blood-pressure · body-metrics
chat · doctor · doctor-agenda · doctor-financeiro · doctor-prescriptions
doctor-staff · exam-results · export · family · glucose
lifestyle · medications · menstrual · meus-medicos · notifications
occupational-health · ophthalmology · prontuario · push   ← Sprint 16
records · share · surgery · telemedicine · users · vaccines
```

## Arquitetura da Telemedicina (Sprint 15)

```
Paciente (port 3000)             Médico (port 3002)
       │                                │
  /telemedicina                  /telemedicina
  formulário entrada             sala de espera
       │                                │
       │    POST /telemedicine/join/:token
       │─────────────────────────────── ▶ API salva patientName/reason
       │                                │
       │    WS /telemedicine            WS /telemedicine
       │    join_room {role:'patient'}  join_room {role:'doctor'}
       │                                │
       │    ◀── admitted (socket) ──────│  (médico clica "Admitir")
       │                                │
       │    offer (SDP) ───────────────▶│
       │    ◀──────── answer (SDP) ─────│
       │    ↔ ice_candidate (bilateral) │
       │                                │
       │    ════════ WebRTC P2P ════════│
       │                         chat / anotações / prescrição
```

STUN: `stun.l.google.com:19302`

## Estrutura de arquivos — Sprint 15 e 16

```
apps/api/src/modules/
  telemedicine/
    telemedicine.service.ts      (createRoom, patientJoin, admitPatient, endRoom…)
    telemedicine.gateway.ts      (WS namespace /telemedicine)
    telemedicine.controller.ts   (REST endpoints)
    telemedicine.module.ts
  push/
    push.service.ts              (Firebase Admin SDK)
    push.controller.ts           (POST /push/register, POST /push/send)
    push.module.ts

apps/web/src/app/
  telemedicina/
    page.tsx                     (formulário de entrada do paciente)
    [token]/page.tsx             (videochamada — lado paciente)

apps/doutor/src/app/
  telemedicina/
    page.tsx                     (sala de espera + criar sala)
    [roomId]/page.tsx            (videochamada + chat + notas + prescrição)
```

## Variáveis de ambiente necessárias

```env
# apps/api/.env
DATABASE_URL="postgresql://icodlife:icodlife@localhost:5434/icodlife_db"
JWT_SECRET="seu_secret"
REDIS_URL="redis://localhost:6379"
PORT=3001
# Sprint 16 — Firebase (opcional para dev local)
FIREBASE_PROJECT_ID=""
FIREBASE_CLIENT_EMAIL=""
FIREBASE_PRIVATE_KEY=""

# apps/web/.env.local e apps/doutor/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```
