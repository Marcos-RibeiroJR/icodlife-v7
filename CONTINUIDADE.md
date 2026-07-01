# CONTINUIDADE — Sou Doutor / ICODELIFE

> Atualizado em: 2026-06-25  
> Usar como prompt de abertura na próxima sessão Cowork.

---

## PROMPT DE CONTINUIDADE

Cole isso exatamente no início da próxima sessão:

---

```
Continuando desenvolvimento do monorepo ICODELIFE / Sou Doutor.

Stack: pnpm monorepo — apps/api (NestJS, porta 3001), apps/web (Next.js 14, porta
3000), apps/doutor (Next.js 14, porta 3002), apps/mobile (Expo React Native).
Prisma 5.22, PostgreSQL (Docker porta 5434, container icodlife_postgres),
output customizado em src/generated/prisma (NÃO @prisma/client).

## Estado atual (2026-06-25) — Sprint 15 CONCLUÍDA

Sprint 15 — Telemedicina WebRTC está completa.
A última migration aplicada é: 20260625_sprint15_telemedicine

### Sequência de build obrigatória (apps/api):
  cd C:\Users\marcos.junior.3\Downloads\icodlife-v7\apps\api
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

## Sprints concluídas (1–15):
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

## Próximas sprints sugeridas:
16: Notificações Push (Firebase FCM)
17: App Mobile Expo (telas principais)
18: Pagamentos (Stripe/Pagar.me)
19: Prontuário Digital PDF assinado
20: Dashboard Analytics para médico
21: Multi-tenant Clínicas

## Arquivos principais da Sprint 15:
- apps/api/src/modules/telemedicine/telemedicine.service.ts
- apps/api/src/modules/telemedicine/telemedicine.gateway.ts  (WS /telemedicine)
- apps/api/src/modules/telemedicine/telemedicine.controller.ts
- apps/api/src/modules/telemedicine/telemedicine.module.ts
- apps/web/src/app/telemedicina/page.tsx       (entrada paciente)
- apps/web/src/app/telemedicina/[token]/page.tsx  (videochamada paciente)
- apps/doutor/src/app/telemedicina/page.tsx    (sala de espera médico)
- apps/doutor/src/app/telemedicina/[roomId]/page.tsx  (videochamada médico)

WebRTC: peer-to-peer via STUN (stun.l.google.com:19302).
Fluxo: paciente envia offer → médico responde answer → ICE candidates trocados.
Prescrição digital no painel lateral do médico durante a consulta.
```

---

## Estrutura de arquivos chave

```
apps/api/
  nest-cli.json                        ← deleteOutDir: false (CRÍTICO)
  src/
    app.module.ts                      ← todos módulos registrados aqui
    modules/
      telemedicine/                    ← Sprint 15
        telemedicine.service.ts
        telemedicine.gateway.ts        ← WS namespace /telemedicine
        telemedicine.controller.ts
        telemedicine.module.ts
      glucose/                         ← Sprint 14
      notifications/                   ← Sprint 11
      doctor/                          ← Sprints 12-13
      ... (26 módulos no total)
  prisma/
    schema.prisma                      ← TelemedicineRoom + TelemedicineStatus
    seed.ts
    migrations/
      20260625_sprint15_telemedicine/  ← última migration

apps/web/                              ← paciente (porta 3000)
  src/app/telemedicina/
    page.tsx                           ← formulário entrada
    [token]/page.tsx                   ← videochamada

apps/doutor/                           ← médico (porta 3002)
  src/app/telemedicina/
    page.tsx                           ← sala de espera
    [roomId]/page.tsx                  ← videochamada + prescrição
```

## Comandos rápidos

```powershell
# Iniciar banco
docker start icodlife_postgres

# Build e start API
cd C:\Users\marcos.junior.3\Downloads\icodlife-v7\apps\api
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
```

## Endpoints Telemedicina

```
POST   /api/v1/telemedicine/rooms              criar sala (médico)
GET    /api/v1/telemedicine/rooms              salas ativas do médico
GET    /api/v1/telemedicine/rooms/history      histórico
PATCH  /api/v1/telemedicine/rooms/:id/admit    admitir paciente
PATCH  /api/v1/telemedicine/rooms/:id/end      encerrar consulta
DELETE /api/v1/telemedicine/rooms/:id          cancelar
GET    /api/v1/telemedicine/join/:token        buscar sala (público)
POST   /api/v1/telemedicine/join/:token        paciente entra na sala

WS     /telemedicine  (Socket.io namespace)
  eventos: join_room, offer, answer, ice_candidate,
           admit_patient, end_call, chat_message
```
