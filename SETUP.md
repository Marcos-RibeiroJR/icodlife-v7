# IcodLife — Guia de Setup Completo

## Índice
1. [Pré-requisitos por sistema operacional](#1-pré-requisitos)
2. [Descompactar e entrar na pasta](#2-descompactar)
3. [Rodar o script de setup](#3-setup)
4. [Iniciar os apps](#4-iniciar)
5. [Conectar ao GitHub](#5-github)
6. [Solução de problemas](#6-problemas)

---

## 1. Pré-requisitos

Instale **antes** de começar:

### macOS

```bash
# 1. Homebrew (se não tiver)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Node.js 20
brew install node@20
echo 'export PATH="/opt/homebrew/opt/node@20/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# 3. pnpm
npm install -g pnpm

# 4. Git
brew install git

# 5. Docker Desktop
# Baixe em: https://www.docker.com/products/docker-desktop/
# Instale o .dmg e inicie o Docker Desktop

# Verificar
node --version   # deve ser v20.x.x
pnpm --version   # deve ser 9.x
git --version
docker --version
```

### Windows

```powershell
# 1. Winget (já vem no Windows 11)
# Abra o PowerShell como Administrador

# 2. Node.js 20
winget install OpenJS.NodeJS.LTS

# 3. pnpm
npm install -g pnpm

# 4. Git
winget install Git.Git

# 5. Docker Desktop
winget install Docker.DockerDesktop
# Reinicie o computador após instalar
# Abra o Docker Desktop e aguarde inicializar

# Verificar (novo terminal)
node --version
pnpm --version
git --version
docker --version
```

### Linux (Ubuntu/Debian)

```bash
# 1. Node.js 20 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. pnpm
npm install -g pnpm

# 3. Git
sudo apt-get install -y git

# 4. Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Verificar
node --version
pnpm --version
git --version
docker --version
```

---

## 2. Descompactar

### macOS / Linux

```bash
# Mova o arquivo para onde quer o projeto
mv ~/Downloads/IcodLife_Completo_v2.tar.gz ~/projetos/

# Descompactar
cd ~/projetos
tar -xzf IcodLife_Completo_v2.tar.gz

# Entrar na pasta
cd icodlife

# Confirmar estrutura
ls -la
# Deve mostrar: apps/  infra/  scripts/  docker-compose.yml  package.json  README.md
```

### Windows (PowerShell)

```powershell
# Descompactar
cd C:\projetos
tar -xzf IcodLife_Completo_v2.tar.gz

# Entrar
cd icodlife

# Ver estrutura
dir
```

### Windows (sem tar — usar explorador)
Clique com botão direito no arquivo → **Extrair aqui**
Depois abra o PowerShell na pasta `icodlife`.

---

## 3. Setup automático

```bash
# Dentro da pasta icodlife/
bash scripts/init-git.sh
```

O script vai:
- ✅ Verificar Node, pnpm, Docker
- ✅ Criar `.env` a partir dos `.env.example`
- ✅ Rodar `pnpm install`
- ✅ Subir todos os containers com `docker compose up -d`
- ✅ Aguardar o PostgreSQL ficar pronto
- ✅ Rodar `prisma db push` (cria as tabelas)
- ✅ Fazer o primeiro commit Git

> **Windows:** Se `bash` não funcionar, use o **Git Bash** (vem com o Git for Windows)
> ou o **WSL2** (recomendado para desenvolvimento).

---

## 4. Iniciar os apps

```bash
# Todos os apps em paralelo
pnpm dev
```

Aguarde aparecer:
```
▶ web   ready on http://localhost:3000
▶ api   🚀 IcodLife API rodando em http://localhost:3001
```

### Acessar no browser

| Serviço | URL | Login |
|---|---|---|
| **Web App** | http://localhost:3000 | Criar conta em /auth/register |
| **API** | http://localhost:3001/api/v1 | Bearer token |
| **Keycloak** | http://localhost:8080 | admin / admin123 |
| **MinIO** | http://localhost:9001 | icodlife / icodlife_dev_secret_key |
| **Prisma Studio** | `cd apps/api && npx prisma studio` | — |

### App Mobile

```bash
# Em um terminal separado
cd apps/mobile
npx expo start

# Depois:
# Pressione 'a' para Android (precisa de emulador ou dispositivo)
# Pressione 'i' para iOS (apenas macOS)
# Escaneie o QR Code com o app Expo Go no celular
```

---

## 5. Conectar ao GitHub

### 5.1 Criar repositório no GitHub

1. Acesse https://github.com/new
2. Nome: `icodlife`
3. Visibilidade: **Private** (dados de saúde — nunca Public)
4. **NÃO** marque "Initialize repository"
5. Clique em **Create repository**

### 5.2 Conectar e fazer push

```bash
# Dentro da pasta icodlife/
git remote add origin https://github.com/SEU_USUARIO/icodlife.git

# Verificar remote
git remote -v

# Push inicial
git push -u origin main
```

Se pedir senha, use um **Personal Access Token**:
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token → selecione `repo` → Copy token
3. Use o token como senha quando solicitado

### 5.3 Configurar GitHub Actions (CI/CD)

O arquivo `.github/workflows/ci.yml` já está pronto. Para ativar:

1. No GitHub, vá em **Settings → Secrets and variables → Actions**
2. Adicione os secrets necessários:

```
DATABASE_URL         postgresql://...
MONGODB_URI          mongodb://...
REDIS_URL            redis://...
JWT_SECRET           (string longa aleatória)
```

---

## 6. Solução de Problemas

### ❌ `docker compose up` falha

```bash
# Ver qual container falhou
docker compose ps
docker compose logs postgres
docker compose logs keycloak

# Reiniciar apenas o que falhou
docker compose restart postgres

# Limpar tudo e começar do zero
docker compose down -v
docker compose up -d
```

### ❌ Porta já em uso

```bash
# macOS/Linux — ver quem usa a porta 5432
lsof -i :5432

# Windows
netstat -ano | findstr :5432

# Solução: parar o serviço conflitante ou mudar a porta no docker-compose.yml
# Exemplo — mudar porta do Postgres de 5432 para 5433:
#   ports:
#     - "5433:5432"
# E atualizar DATABASE_URL em .env
```

### ❌ `pnpm install` falha

```bash
# Limpar cache e tentar novamente
pnpm store prune
rm -rf node_modules apps/*/node_modules
pnpm install

# Se erro de permissão no macOS/Linux
sudo chown -R $(whoami) ~/.local/share/pnpm
pnpm install
```

### ❌ `prisma db push` falha

```bash
cd apps/api

# Verificar conexão com o banco
npx prisma db pull

# Se banco não acessível, verificar .env
cat .env | grep DATABASE_URL
# Deve ser: postgresql://icodlife:icodlife_dev_secret@localhost:5432/icodlife

# Rodar manualmente com log detalhado
DATABASE_URL="postgresql://icodlife:icodlife_dev_secret@localhost:5432/icodlife" \
npx prisma db push --schema=prisma/schema.prisma
```

### ❌ Keycloak demora para subir

O Keycloak pode demorar 2-3 minutos na primeira vez (baixa imagem + inicializa banco).

```bash
# Acompanhar progresso
docker compose logs -f keycloak

# Aguardar a linha:
# "Keycloak 24.0 on JVM ... started in X.XXXs"
```

### ❌ `git push` pede senha repetidamente

```bash
# Configurar cache de credenciais
git config --global credential.helper store   # Linux
git config --global credential.helper osxkeychain  # macOS
# Windows usa o Credential Manager automaticamente

# Ou usar SSH em vez de HTTPS
ssh-keygen -t ed25519 -C "seu@email.com"
cat ~/.ssh/id_ed25519.pub
# Cole a chave em GitHub → Settings → SSH Keys

git remote set-url origin git@github.com:SEU_USUARIO/icodlife.git
git push -u origin main
```

### ❌ App mobile não conecta na API

```bash
# O Expo usa o IP da sua máquina, não localhost
# Descubra seu IP local:

# macOS
ipconfig getifaddr en0

# Linux
hostname -I | awk '{print $1}'

# Windows
ipconfig | findstr "IPv4"

# Depois edite apps/mobile/.env ou app.json:
# EXPO_PUBLIC_API_URL=http://192.168.x.x:3001/api/v1
```

---

## Estrutura final esperada

```
icodlife/
├── .git/                          ← Repositório Git
├── .github/
│   └── workflows/ci.yml           ← CI/CD automático
├── apps/
│   ├── api/                       ← NestJS (porta 3001)
│   │   ├── .env                   ← Variáveis locais (não vai pro Git)
│   │   ├── prisma/schema.prisma   ← Schema do banco
│   │   └── src/
│   ├── web/                       ← Next.js (porta 3000)
│   │   ├── .env.local             ← Variáveis locais
│   │   └── src/
│   └── mobile/                    ← React Native + Expo
│       ├── App.tsx
│       └── src/
├── infra/
│   └── docker/
│       └── postgres-init.sql      ← Schema SQL completo
├── docker-compose.yml             ← Todos os serviços
├── package.json                   ← Monorepo root
└── pnpm-workspace.yaml
```

---

## Dúvidas?

- Documentação Expo: https://docs.expo.dev
- Documentação NestJS: https://docs.nestjs.com
- Documentação Next.js: https://nextjs.org/docs
- Prisma Studio (visualizar banco): `cd apps/api && npx prisma studio`
