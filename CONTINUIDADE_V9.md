# CONTINUIDADE — Sou Doutor / ICODELIFE
Atualizado em: 2026-06-26  
Usar como prompt de abertura na próxima sessão Cowork.

## PROMPT DE CONTINUIDADE

Cole isso exatamente no início da próxima sessão:

```
Continuando desenvolvimento do monorepo ICODELIFE / Sou Doutor.

Stack: pnpm monorepo — apps/api (NestJS, porta 3001), apps/web (Next.js 14, porta
3000), apps/doutor (Next.js 14, porta 3002), apps/mobile (Expo React Native).
Prisma 5.22, PostgreSQL (Docker porta 5434, container icodlife_postgres),
output customizado em src/generated/prisma (NÃO @prisma/client).

## Estado atual (2026-06-26) — Sprint 16 CONCLUÍDA

Sprint 16 — Notificações Push (Firebase FCM) está completa.
A última migration aplicada é: 20260626_sprint16_push_fcm

### Sequência de build obrigatória (apps/api):
  cd C:\Users\marcos.junior.3\Downloads\icodlife-v7\apps\api
  pnpm install          ← instala firebase-admin ^12.3.0 (novo)
  npx prisma migrate deploy
  npx prisma generate
  npx nest build
  robocopy src\generated dist\src\generated /E /XF *.dll.node /NFL /NDL /NJH /NJS
  node dist/src/main

OBS: nest-cli.json já tem deleteOutDir: false para evitar EPERM no .dll.node.
OBS: taskkill na porta 3001 às vezes exige PowerShell como Administrador.

### Quirks críticos:
- User model usa `fullName` (não `name`), coluna `full_name`.
- Import Prisma sempre: import { X } from '../../generated/prisma'
- CrmStatus enum: pending, verified, suspended, canceled (sem 'active')
- PatientDoctorStatus enum: pending, active, ended
- AppointmentStatus enum: scheduled, completed, canceled, no_show

## Credenciais demo:
- joao@demo.icodlife.com / Demo@12345  (paciente masculino)
- ana@demo.icodlife.com / Demo@12345   (paciente feminino)
- dr.marcos@demo.icodlife.com / Demo@12345 (médico)

## Sprints concluídas (1–16):
1–4: Auth, Perfil, Registros, Upload
5: Pressão Arterial
6: Ciclo Menstrual
7: IA Health Chat
8: Compartilhamento / Token
9: Medicamentos
10: Agenda / Consultas
11: Família / ICODE + Notificações SSE
12: Painel Médico base
13: Painel Médico completo (agenda, receitas, staff, financeiro)
14: Glicemia + HbA1c
15: Telemedicina WebRTC (sala de espera + videochamada + prescrição)
16: Notificações Push — Firebase FCM (web + mobile)

## Próximas sprints sugeridas:
17: App Mobile Expo (telas principais)
18: Pagamentos (Stripe/Pagar.me)
19: Prontuário Digital PDF assinado
20: Dashboard Analytics para médico
21: Multi-tenant Clínicas

## Arquivos principais da Sprint 16:
- apps/api/src/modules/push/push.service.ts      ← firebase-admin, sendToUser(), registerToken()
- apps/api/src/modules/push/push.controller.ts   ← POST/DELETE /api/v1/push/token
- apps/api/src/modules/push/push.module.ts
- apps/api/prisma/migrations/20260626_sprint16_push_fcm/migration.sql
- apps/web/public/firebase-messaging-sw.js        ← Service Worker FCM background
- apps/web/src/hooks/usePushNotifications.ts      ← hook React para solicitar permissão
- apps/web/src/components/push/PushPermissionBanner.tsx
- apps/doutor/public/firebase-messaging-sw.js     ← idem para app do médico
- apps/doutor/src/hooks/usePushNotifications.ts
- apps/doutor/src/components/push/PushPermissionBanner.tsx
- apps/mobile/src/services/push.service.ts        ← expo-notifications + @react-native-firebase
- apps/mobile/App.tsx                             ← setupBackgroundHandler() + setupForegroundHandler()

## Eventos que disparam push (Sprint 16):
- Consulta agendada          → AppointmentsService.create() → FCM imediato
- Lembrete 24h de consulta   → NotificationSchedulerService (cron 8h) → via NotificationService.create()
- Lembrete de medicamento    → NotificationSchedulerService (cron horário) → via NotificationService.create()
- Reforço de vacina          → NotificationSchedulerService (cron 9h) → via NotificationService.create()
- Estoque baixo de med.      → NotificationSchedulerService (cron 7h) → via NotificationService.create()
- Médico admite paciente     → TelemedicineGateway.handleAdmit() → FCM direto ao patientId

## Arquitetura Push:
- NotificationService.create() auto-dispara FCM via PushService (injetado com @Optional)
- PushService faz cleanup automático de tokens inválidos/expirados após sendEachForMulticast
- Tabela device_tokens: (userId, token, platform, deviceId) com unique(userId, token)
- Web: usa firebase SDK ^10.12.0 (import dinâmico, client-side only)
- Mobile: usa @react-native-firebase/messaging ^20.3.0

## Variáveis de ambiente necessárias (Sprint 16):
### apps/api/.env:
  FIREBASE_PROJECT_ID=...
  FIREBASE_CLIENT_EMAIL=...
  FIREBASE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n"

### apps/web/.env.local e apps/doutor/.env.local:
  NEXT_PUBLIC_FIREBASE_API_KEY=...
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
  NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
  NEXT_PUBLIC_FIREBASE_APP_ID=...
  NEXT_PUBLIC_FIREBASE_VAPID_KEY=...

## Como usar o PushPermissionBanner (web):
```tsx
import { PushPermissionBanner } from '@/components/push/PushPermissionBanner';
// No dashboard do paciente ou médico:
<PushPermissionBanner authToken={session?.accessToken ?? null} />
```

## Como registrar push no mobile (após login):
```ts
import { registerForPushNotifications } from '@/services/push.service';
await registerForPushNotifications(authToken);
```
```

## Endpoints Push (Sprint 16):
```
POST   /api/v1/push/token    { token, platform: 'web'|'android'|'ios', deviceId? }
DELETE /api/v1/push/token    { token }
GET    /api/v1/push/tokens   (debug — lista tokens do usuário logado)
```

## Estrutura de arquivos chave (completa)

```
apps/api/
  nest-cli.json                        ← deleteOutDir: false (CRÍTICO)
  src/
    app.module.ts                      ← todos módulos registrados (+ PushModule)
    modules/
      push/                            ← Sprint 16
        push.service.ts
        push.controller.ts
        push.module.ts
      telemedicine/                    ← Sprint 15 (gateway atualizado com FCM)
      notifications/                   ← Sprint 11 (NotificationService injeta PushService)
      appointments/                    ← atualizado: push imediato ao criar consulta
      ... (26+ módulos no total)
  prisma/
    schema.prisma                      ← DeviceToken + DevicePlatform (Sprint 16)
    migrations/
      20260626_sprint16_push_fcm/      ← última migration

apps/web/                              ← paciente (porta 3000)
  public/firebase-messaging-sw.js
  src/
    hooks/usePushNotifications.ts
    components/push/PushPermissionBanner.tsx

apps/doutor/                           ← médico (porta 3002)
  public/firebase-messaging-sw.js
  src/
    hooks/usePushNotifications.ts
    components/push/PushPermissionBanner.tsx

apps/mobile/                           ← Expo React Native
  App.tsx                              ← setupBackgroundHandler + setupForegroundHandler
  src/services/push.service.ts
```

## Comandos rápidos
```powershell
# Iniciar banco
docker start icodlife_postgres

# Build e start API (com nova dep firebase-admin)
cd C:\Users\marcos.junior.3\Downloads\icodlife-v7\apps\api
pnpm install
npx prisma migrate deploy
npx prisma generate
npx nest build
robocopy src\generated dist\src\generated /E /XF *.dll.node /NFL /NDL /NJH /NJS
node dist/src/main

# Apps web
pnpm --filter @icodlife/web dev      # porta 3000
pnpm --filter @icodlife/doutor dev   # porta 3002

# Matar porta 3001 (Admin PS se necessário)
netstat -ano | findstr :3001
taskkill /F /PID <pid>

# Resetar e re-seed banco
pnpm --filter @icodlife/api db:reset

# Instalar deps web (firebase)
pnpm --filter @icodlife/web install
pnpm --filter @icodlife/doutor install

# Instalar deps mobile (firebase)
pnpm --filter @icodlife/mobile install
```
