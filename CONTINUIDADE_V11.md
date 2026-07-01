# CONTINUIDADE V11 — IcodeLife / Sou Doutor

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
- `DeviceToken` model + `PushService` + web SW + hooks + mobile push.service
- Integrado em Notifications, Appointments, TelemedicineGateway
- **Pendente pelo usuário:** preencher credenciais Firebase nos .env e rodar migração

### Sprint 17 — App Mobile Expo ✅
- DashboardScreen: score de saúde, próxima consulta, próximo med, badge notif, medições
- AppointmentsScreen: tabs próximas/histórico, modal agendar, cancelar, telemedicina
- MedicationsScreen: timeline do dia, "Tomar/✓ Tomado", modal novo med, estoque
- HistoryScreen (novo): BP + glicemia + sparkline + consultas + vacinas + exames
- NotificationsScreen (novo): marcar lidas, badge contador
- AppNavigator: tabs Início|Consultas|Medicamentos|Histórico|Perfil

### Sprint 18 — Dados Vitais Mobile ✅
**Novos arquivos:**
- `apps/mobile/src/components/charts/MiniLineChart.tsx` — gráfico SVG de linha via `react-native-svg` (sem dep extra — disponível via Expo SDK e peer dep de `react-native-qrcode-svg`)
- `apps/mobile/src/screens/vitals/BloodPressureScreen.tsx` — pressão arterial completa:
  - Último valor com classificação (Normal/Elevada/Estágio1/Estágio2/Crise) e cor
  - Gráfico sistólica (vermelho) + diastólica (azul) com linhas de referência
  - Filtro de período 7d/30d/90d
  - Formulário: sistólica, diastólica, FC, notas — com preview de classificação em tempo real
  - Lista histórico com swipe-para-excluir (long press)
  - DELETE `/blood-pressure/:id`
- `apps/mobile/src/screens/vitals/GlucoseScreen.tsx` — glicemia completa:
  - Último valor com classificação por contexto (jejum/pós-refeição etc.)
  - Estatísticas do período: média, mínima, máxima, contagem
  - Gráfico amarelo com linhas de referência clínicas (70/100/126/180)
  - Legenda de zonas glicêmicas
  - 6 contextos de medição (Jejum/Pré-refeição/Pós-refeição/Pré-exercício/Pós-exercício/Aleatório)
  - Preview de classificação em tempo real
  - DELETE `/glucose/:id`

**AppNavigator atualizado:**
- Rotas BloodPressure e Glucose agora apontam para as telas reais (antes apontavam para HistoryScreen como placeholder)

**Componente MiniLineChart:**
```typescript
// Usa: Svg, Path, Circle, Line, Rect, Text de 'react-native-svg'
// Props: datasets (values+color+label), width, height, refLines, xLabels, yMin, yMax
// Usa curvas Bezier suaves, eixo Y com 4 ticks, rótulos X esparsos (máx 5)
```

---

## Rotas de API usadas pelo mobile (confirmadas)

```
GET  /appointments          → lista consultas do paciente
POST /appointments          → criar consulta
PATCH /appointments/:id     → atualizar status (canceled etc.)
GET  /medications           → lista medicamentos
POST /medications           → criar medicamento
GET  /notifications         → lista notificações
GET  /notifications/unread-count → { count: number }
PATCH /notifications/:id/read   → marcar lida
PATCH /notifications/read-all   → marcar todas lidas
GET  /blood-pressure?limit=N → lista medições BP
POST /blood-pressure        → criar medição BP
DELETE /blood-pressure/:id  → excluir medição BP
GET  /glucose?limit=N        → lista medições glicose
POST /glucose               → criar medição glicose
DELETE /glucose/:id         → excluir medição glicose
GET  /ai-chat/history?days=1 → histórico chat IA
GET  /blood-pressure?limit=1 → última medição BP (Dashboard)
GET  /glucose?limit=1        → última medição glicose (Dashboard)
GET  /vaccines              → lista vacinas
GET  /exams?limit=10        → lista exames
```

---

## Estrutura mobile atual

```
apps/mobile/src/
├── components/charts/MiniLineChart.tsx  ← NOVO Sprint 18
├── navigation/AppNavigator.tsx          ← atualizado Sprint 17+18
├── screens/
│   ├── auth/LoginScreen.tsx
│   ├── auth/RegisterScreen.tsx
│   ├── dashboard/DashboardScreen.tsx    ← Sprint 17
│   ├── appointments/AppointmentsScreen.tsx ← Sprint 17
│   ├── medications/MedicationsScreen.tsx   ← Sprint 17
│   ├── history/HistoryScreen.tsx           ← Sprint 17
│   ├── notifications/NotificationsScreen.tsx ← Sprint 17
│   ├── vitals/BloodPressureScreen.tsx    ← Sprint 18
│   ├── vitals/GlucoseScreen.tsx          ← Sprint 18
│   ├── records/RecordsScreen.tsx
│   ├── chat/HealthChatScreen.tsx
│   ├── profile/ProfileScreen.tsx
│   ├── vaccines/VaccinesScreen.tsx
│   ├── menstrual/MenstrualScreen.tsx
│   ├── family/FamilyScreen.tsx
│   └── vida/VidaScreen.tsx
├── services/api.client.ts
├── services/push.service.ts
└── store/auth.store.ts
```

---

## Próximas Sprints planejadas

### Sprint 19 — Telemedicina Mobile
- `TelemedicineWaitingScreen` — sala de espera com countdown
- Integração WebRTC via WebView (Jitsi Meet URL ou similar)
- Notificação "médico disponível" já funciona (Sprint 16 FCM)
- Usar `telemedicineToken` da consulta para entrar na sala

### Sprint 20 — App Médico Web (apps/doutor melhorias)
- Prontuário inline na tela de paciente
- Timeline de saúde do paciente (exames, BP, glicose)
- Agenda do médico com view calendário

### Sprint 21 — Testes e2e + CI
- Playwright para web e doutor
- Detox para mobile
- GitHub Actions pipeline

---

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

## Para iniciar Sprint 19

Leia este arquivo e diga: "Sprint 19 — Telemedicina Mobile"
