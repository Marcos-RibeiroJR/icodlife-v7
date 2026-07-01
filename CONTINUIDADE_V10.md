# CONTINUIDADE V10 — IcodeLife / Sou Doutor

> Copie este arquivo inteiro como primeira mensagem do próximo contexto.

## Projeto

pnpm monorepo:
- `apps/api` — NestJS 3001
- `apps/web` — Next.js 14 3000 (paciente)
- `apps/doutor` — Next.js 14 3002 (médico)
- `apps/mobile` — Expo React Native (paciente)

**Prisma:** `apps/api/prisma/schema.prisma`, output em `src/generated/prisma` (NÃO @prisma/client)  
**DB:** PostgreSQL Docker porta 5434, container `icodlife_postgres`  
**Campo crítico:** `fullName` (não `name`) no modelo User  
**AppointmentStatus:** scheduled | completed | canceled | no_show  
**CrmStatus:** pending | verified | suspended | canceled

---

## Sprints concluídas

### Sprint 16 — Push FCM ✅
- `DeviceToken` model no Prisma (migration `20260626_sprint16_push_fcm`)
- `PushService` + `PushController` + `PushModule` em `apps/api/src/modules/push/`
- `PushService` integrado em `NotificationService`, `AppointmentsService`, `TelemedicineGateway`
- Service Workers FCM em `apps/web/public/firebase-messaging-sw.js` e `apps/doutor/public/`
- Hook `usePushNotifications.ts` + banner `PushPermissionBanner.tsx` em web e doutor
- `apps/mobile/src/services/push.service.ts` (expo-notifications + @react-native-firebase)
- Variáveis de ambiente: `apps/web/.env.local`, `apps/doutor/.env.local`, `apps/api/.env.example`
- **Pendente pelo usuário:** preencher credenciais Firebase nos .env e rodar migração+rebuild

### Sprint 17 — App Mobile Expo ✅
Todas as telas do paciente foram elevadas ao nível completo:

#### `apps/mobile/src/screens/dashboard/DashboardScreen.tsx` — REESCRITO
- Score de saúde calculado dinamicamente
- Widget de próxima consulta (com badge de telemedicina)
- Widget de próximo medicamento (com horário)
- Badge de notificações não lidas com contador
- Medições recentes (BP + glicemia)
- Alertas do HealthBot (flags do check-in diário)
- Grid de acesso rápido com 6 shortcuts

#### `apps/mobile/src/screens/appointments/AppointmentsScreen.tsx` — REESCRITO
- Tabs: Próximas / Histórico
- Modal de novo agendamento (médico, especialidade, data/hora, telemedicina toggle, observações)
- Cancelar consulta com confirmação
- Botão "Entrar na videochamada" para consultas tele

#### `apps/mobile/src/screens/medications/MedicationsScreen.tsx` — REESCRITO
- Tab "Hoje": SectionList com períodos do dia (Manhã/Tarde/Noite/Madrugada)
- Botão "Tomar" / "✓ Tomado" por dose
- Alerta de estoque baixo
- Tab "Todos": lista completa com status
- Modal de novo medicamento (nome, dosagem, via, frequência, horários, estoque, notas)

#### `apps/mobile/src/screens/history/HistoryScreen.tsx` — NOVO
- Seção Pressão Arterial: último valor + classificação + sparkline de tendência
- Seção Glicemia: idem com classificação (normal/pré-diab/diabetes)
- Seção Consultas Realizadas: histórico com datas
- Seção Vacinas: status válida/vencida
- Seção Exames: com badge PDF
- Pull-to-refresh, links "Ver tudo →" para telas específicas

#### `apps/mobile/src/screens/notifications/NotificationsScreen.tsx` — NOVO
- Lista de notificações com ícones por tipo
- Marcar como lida (individual ou "Marcar todas lidas")
- Badge de não lidas no header

#### `apps/mobile/src/navigation/AppNavigator.tsx` — REESCRITO
- Bottom tabs reorganizados: **Início | Consultas | Medicamentos | Histórico | Perfil**
- Stack: Records, Chat, Notifications, Vaccines, Menstrual, Family, Vida
- BloodPressure e Glucose como stack screens (placeholder → HistoryScreen, substituir em sprint futura)

---

## Próximas Sprints planejadas

### Sprint 18 — Telas de Dados Vitais Mobile
- `BloodPressureScreen`: lista + adicionar medição (form sistólica/diastólica/FC)
- `GlucoseScreen`: lista + adicionar medição (form valor/contexto)
- Gráfico de linha (recharts-like via Victory Native ou SVG simples)
- Integrar com `/blood-pressure` e `/glucose` da API

### Sprint 19 — Telemedicina Mobile
- Tela de sala de espera (`TelemedicineWaitingScreen`)
- Integração WebRTC via `@livekit/react-native` ou WebView com Jitsi
- Entrada na sala via token da consulta (`telemedicineToken`)
- Notificação de "médico disponível" já funciona (Sprint 16 FCM)

### Sprint 20 — App Médico (Doutor Mobile)
- Telas separadas para o médico: lista de pacientes, agenda do dia, prontuário rápido
- Ou: adaptar via role do usuário dentro do mesmo app

### Sprint 21 — Testes e2e + CI
- Playwright para web e doutor
- Detox para mobile
- GitHub Actions pipeline

---

## Arquivos críticos (caminhos Windows)

```
apps/mobile/src/navigation/AppNavigator.tsx
apps/mobile/src/screens/dashboard/DashboardScreen.tsx
apps/mobile/src/screens/appointments/AppointmentsScreen.tsx
apps/mobile/src/screens/medications/MedicationsScreen.tsx
apps/mobile/src/screens/history/HistoryScreen.tsx
apps/mobile/src/screens/notifications/NotificationsScreen.tsx
apps/mobile/src/services/api.client.ts
apps/mobile/src/store/auth.store.ts
apps/api/src/modules/push/push.service.ts
apps/api/src/modules/push/push.module.ts
apps/api/prisma/schema.prisma
```

## Variáveis de ambiente pendentes (preencher manualmente)

**apps/api/.env:**
```
FIREBASE_PROJECT_ID=seu-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@projeto.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**apps/web/.env.local e apps/doutor/.env.local:**
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu-project-id
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BK...
```

## Para iniciar Sprint 18

Leia este arquivo e diga: "Sprint 18 — Telas de Dados Vitais Mobile (BP + Glicose)"
