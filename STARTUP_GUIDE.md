# IcodLife — Guia de Inicialização (Versão 7)

## Pré-requisitos

Antes de iniciar, certifique-se de ter instalado:
- **Node.js 20+** — https://nodejs.org
- **pnpm 9+** — `npm install -g pnpm`
- **Docker Desktop** — https://docker.com/products/docker-desktop (em execução)

---

## TERMINAL 1 — Banco de Dados (Docker)

```bash
# Entre na pasta do projeto
cd icodlife-v7

# Suba o PostgreSQL via Docker
docker compose up -d

# Verifique se o container subiu (deve aparecer "healthy" ou "running")
docker compose ps

# Se for a primeira vez: aplique o schema no banco
cd apps/api
npx prisma db push
cd ../..
```

> **Porta do PostgreSQL:** 5434 (não 5432 — evita conflito com instalações locais)

---

## TERMINAL 2 — API + Web (NestJS + Next.js)

```bash
cd icodlife-v7

# Instale dependências (apenas na primeira vez ou após pull)
pnpm install

# Inicie todos os serviços em paralelo
pnpm dev
```

Aguarde aparecer:
```
▶ api    🚀 IcodLife API rodando em http://localhost:3001
▶ web    ready on http://localhost:3000
▶ doutor ready on http://localhost:3002
```

---

## TERMINAL 3 — App Mobile (Expo)

```bash
cd icodlife-v7/apps/mobile

# Instale pacotes Expo (apenas na primeira vez)
npx expo install expo-file-system expo-sharing

# Inicie o Expo
npx expo start
```

Após iniciar, escolha:
- `a` → Android (precisa de emulador Android Studio ou dispositivo USB)
- `i` → iOS (apenas macOS, precisa do Xcode)
- Escanear o **QR Code** com o app **Expo Go** no celular (iOS/Android)

> **Importante:** O app mobile usa o IP da sua máquina, não `localhost`.
> Edite `apps/mobile/.env` ou `app.json` com seu IP local:
> ```
> EXPO_PUBLIC_API_URL=http://192.168.x.x:3001/api/v1
> ```
> Descubra seu IP: `ipconfig` (Windows) | `ifconfig` (Mac/Linux)

---

## URLs de Acesso

| Serviço | URL | Credenciais |
|---|---|---|
| **Web (Paciente)** | http://localhost:3000 | Criar conta em /auth/register |
| **Web (Médico)** | http://localhost:3002 | Criar conta com role=doctor |
| **API REST** | http://localhost:3001/api/v1 | Bearer JWT token |
| **Swagger** | http://localhost:3001/api | — |
| **Prisma Studio** | `cd apps/api && npx prisma studio` | — |
| **MinIO** | http://localhost:9001 | icodlife / icodlife_dev_secret_key |

---

## Variáveis de Ambiente (.env)

### apps/api/.env

```env
DATABASE_URL="postgresql://icodlife:icodlife_dev_secret@localhost:5434/icodlife"
JWT_SECRET="seu-segredo-jwt-muito-forte-aqui"
API_URL="http://localhost:3001"

# Firebase FCM (push notifications) — preencha após criar projeto no Firebase
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# MinIO (uploads de arquivos)
AWS_ENDPOINT=http://localhost:9000
AWS_BUCKET_NAME=icodlife
AWS_ACCESS_KEY_ID=icodlife
AWS_SECRET_ACCESS_KEY=icodlife_dev_secret_key
AWS_REGION=us-east-1
```

### apps/web/.env.local

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Firebase Web (push notifications) — preencha após criar projeto no Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
```

### apps/doutor/.env.local

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3002
```

### apps/mobile/.env (ou app.json)

```env
EXPO_PUBLIC_API_URL=http://192.168.x.x:3001/api/v1
```

---

## Solução de Problemas

### ❌ Docker não sobe

```bash
# Ver logs do container
docker compose logs postgres

# Reiniciar tudo do zero (apaga dados!)
docker compose down -v
docker compose up -d
```

### ❌ Porta já em uso

```bash
# Windows — ver quem usa a porta 5434
netstat -ano | findstr :5434

# Mac/Linux
lsof -i :5434
```

### ❌ pnpm install falha

```bash
pnpm store prune
rm -rf node_modules apps/*/node_modules
pnpm install
```

### ❌ prisma db push falha

```bash
cd apps/api
cat .env | grep DATABASE_URL
# Confirme que o Docker está rodando e a porta 5434 está acessível
npx prisma db push --schema=prisma/schema.prisma
```

### ❌ Mobile não conecta na API

O Expo precisa do IP da sua máquina (não localhost). Descubra com:
- Windows: `ipconfig | findstr "IPv4"`
- Mac: `ipconfig getifaddr en0`
- Linux: `hostname -I | awk '{print $1}'`

Depois atualize `EXPO_PUBLIC_API_URL` com o IP encontrado.

---

## Sequência Rápida (tudo funcionando)

```bash
# Terminal 1
docker compose up -d

# Terminal 2
pnpm install && pnpm dev

# Terminal 3
cd apps/mobile && npx expo start
```
