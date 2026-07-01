# CONTINUIDADE V12 — IcodeLife / Sou Doutor

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
**Modelo BP:** `BloodPressureReading` (campo: `pulse` não `heartRate`, `measuredAt` não `date`)
**Modelo Glicose:** `GlucoseReading` (campo: `context: GlucoseContext`, `measuredAt`)
**Modelo Vacinas:** `VaccinationRecord` → relação `vaccine: Vaccine`

---

## Sprints concluídas

### Sprint 16 — Push FCM ✅
- `DeviceToken` model + `PushService` + web SW + hooks + mobile push.service
- Integrado em Notifications, Appointments, TelemedicineGateway

### Sprint 17 — App Mobile Expo ✅
- DashboardScreen, AppointmentsScreen, MedicationsScreen (reescritos)
- HistoryScreen, NotificationsScreen (novos)
- Navigation: Início | Consultas | Medicamentos | Histórico | Perfil

### Sprint 18 — Dados Vitais Mobile ✅
- `MiniLineChart.tsx` — SVG nativo (react-native-svg via Expo)
- `BloodPressureScreen.tsx` — chart sistólica+diastólica, classificação clínica, filtro período
- `GlucoseScreen.tsx` — chart + 6 contextos + estatísticas + zonas glicêmicas

### Sprint 19 — Prontuário Digital PDF ✅

#### `apps/api/src/modules/export/export.service.ts` — MODIFICADO
- Adicionadas funções: `createDocumentSignature()` + `verifyDocumentToken()` (exportadas)
- Assinatura: HMAC-SHA256 com `JWT_SECRET`, token no formato `base64url(payload).base64url(sig)`
- Pré-computa assinatura ANTES de criar o PDFDocument (para evitar async no callback)
- QR Code: `qrcode.toDataURL()` → PNG buffer → `doc.image()` no canto superior direito
- Página extra de assinatura digital: tabela de metadados, QR, hash SHA-256, validade 1 ano
- Aviso legal LGPD, instrução de verificação
- URL de verificação: `${API_URL}/api/v1/prontuario/verify/${token}`

#### `apps/api/src/modules/prontuario/prontuario.controller.ts` — MODIFICADO
- Adicionado `ProntuarioVerifyController` com `GET /prontuario/verify/:token` (público)
- Importa e chama `verifyDocumentToken()` do export.service
- Retorna JSON: `{ valid, platform, document, patient, issuedAt, expiresAt, checkedAt, message }`

#### `apps/api/src/modules/prontuario/prontuario.module.ts` — MODIFICADO
- Registra `ProntuarioVerifyController`

#### `apps/mobile/src/screens/prontuario/ProntuarioScreen.tsx` — NOVO
- `fetch()` para `GET /export/pdf/me` com Bearer token
- `blobToBase64()` via FileReader
- `expo-file-system` para salvar em cache (`FileSystem.EncodingType.Base64`)
- `expo-sharing` para compartilhar (ShareAsync com mimeType `application/pdf`)
- UI: card do paciente, lista do que é incluído, info da assinatura digital, aviso LGPD

#### `apps/mobile/package.json` — MODIFICADO
- Adicionados: `"expo-file-system": "^17.0.0"`, `"expo-sharing": "^12.0.0"`

#### `apps/mobile/src/navigation/AppNavigator.tsx` — MODIFICADO
- Rota `Prontuario` → `ProntuarioScreen` (stack)

#### `apps/mobile/src/screens/dashboard/DashboardScreen.tsx` — MODIFICADO
- Atalho rápido `📄 Prontuário` no grid de acesso rápido (substituiu o ciclo menstrual no gender fixo)

#### `apps/web/src/components/prontuario/ProntuarioDownloadButton.tsx` — NOVO
- Botão client-side: `fetch('/export/pdf/me')` → blob → `URL.createObjectURL()` → click download
- Estado de loading com spinner, mensagem de erro inline, aviso LGPD

#### `apps/web/src/app/dashboard/page.tsx` — MODIFICADO
- Importa e renderiza `<ProntuarioDownloadButton />` após o PushPermissionBanner

---

## Endpoints disponíveis (PDF + Verificação)

```
GET  /api/v1/export/pdf/me         → PDF do próprio usuário (autenticado)
GET  /api/v1/export/pdf/:userId    → PDF de paciente (médico/admin, autenticado)
GET  /api/v1/prontuario/verify/:token → Verificar assinatura (público, sem auth)
GET  /api/v1/prontuario/public/:token → Prontuário compartilhado (público, por share token)
POST /api/v1/prontuario/share      → Criar share token (autenticado)
GET  /api/v1/prontuario/share      → Listar meus share tokens (autenticado)
DELETE /api/v1/prontuario/share/:id → Revogar share token (autenticado)
```

## Variáveis de ambiente necessárias

```bash
# apps/api/.env
JWT_SECRET=sua-chave-secreta-forte         # usada também para assinar o prontuário
API_URL=https://api.seudominio.com          # usado na URL do QR de verificação

# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001

# apps/mobile/.env  (ou app.config.js)
EXPO_PUBLIC_API_URL=http://localhost:3001
```

---

## Instalação necessária no mobile

```bash
cd apps/mobile
npx expo install expo-file-system expo-sharing
```

---

## Próximas Sprints planejadas

### Sprint 20 — Telemedicina Mobile
- `TelemedicineWaitingScreen` — sala de espera com timer
- Integração WebRTC via WebView (Jitsi Meet ou Daily.co)
- Token de acesso: `appointment.telemedicineToken`
- Notificação de "médico disponível" já funciona (Sprint 16 FCM)

### Sprint 21 — Share Prontuário (tela completa mobile)
- `ShareProntuarioScreen` — criar link temporário, listar shares ativos, revogar
- QR code na tela para o médico escanear sem download
- Navegação: `navigation.navigate('ShareProntuario')`

### Sprint 22 — App Médico Web (apps/doutor melhorias)
- Timeline de saúde do paciente no prontuário online
- Gráficos de tendência BP + glicemia inline

### Sprint 23 — Testes e2e + CI
- Playwright para web e doutor
- Detox para mobile
- GitHub Actions pipeline

---

## Estrutura de arquivos mobile atualizada

```
apps/mobile/src/
├── components/charts/MiniLineChart.tsx
├── navigation/AppNavigator.tsx
├── screens/
│   ├── auth/{Login,Register}Screen.tsx
│   ├── dashboard/DashboardScreen.tsx
│   ├── appointments/AppointmentsScreen.tsx
│   ├── medications/MedicationsScreen.tsx
│   ├── history/HistoryScreen.tsx
│   ├── notifications/NotificationsScreen.tsx
│   ├── vitals/BloodPressureScreen.tsx
│   ├── vitals/GlucoseScreen.tsx
│   ├── prontuario/ProntuarioScreen.tsx   ← Sprint 19
│   ├── records/RecordsScreen.tsx
│   ├── chat/HealthChatScreen.tsx
│   ├── profile/ProfileScreen.tsx
│   ├── vaccines/VaccinesScreen.tsx
│   ├── menstrual/MenstrualScreen.tsx
│   ├── family/FamilyScreen.tsx
│   └── vida/VidaScreen.tsx
├── services/{api.client,push.service}.ts
└── store/auth.store.ts
```

## Para iniciar Sprint 20

Leia este arquivo e diga: "Sprint 20 — Telemedicina Mobile"
