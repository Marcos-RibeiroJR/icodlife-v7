#!/bin/bash
# =============================================================
# IcodLife — Setup inicial completo
# Roda: bash scripts/init-git.sh
# =============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✅ $1${NC}"; }
info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
fail() { echo -e "${RED}❌ $1${NC}"; exit 1; }
step() { echo -e "\n${CYAN}▶ $1${NC}"; }

echo -e "${BLUE}"
echo "  ██╗ ██████╗ ██████╗ ██████╗ ██╗     ██╗███████╗███████╗"
echo "  ██║██╔════╝██╔═══██╗██╔══██╗██║     ██║██╔════╝██╔════╝"
echo "  ██║██║     ██║   ██║██║  ██║██║     ██║█████╗  █████╗  "
echo "  ██║██║     ██║   ██║██║  ██║██║     ██║██╔══╝  ██╔══╝  "
echo "  ██║╚██████╗╚██████╔╝██████╔╝███████╗██║██║     ███████╗"
echo "  ╚═╝ ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝╚═╝╚═╝     ╚══════╝"
echo -e "${NC}"
echo "  O Futuro dos Dados Médicos — Setup Inicial"
echo "  ============================================"

# ── VERIFICAR PRÉ-REQUISITOS ─────────────────────────────────

step "Verificando pré-requisitos..."

check_cmd() {
  if command -v "$1" &>/dev/null; then
    ok "$1 encontrado: $(command -v $1)"
  else
    fail "$1 não encontrado. Instale antes de continuar.\n  → $2"
  fi
}

check_cmd git    "https://git-scm.com"
check_cmd node   "https://nodejs.org (versão 20+)"
check_cmd docker "https://docker.com/get-started"

# Node version
NODE_VER=$(node -e "process.stdout.write(process.version.slice(1).split('.')[0])")
if [ "$NODE_VER" -lt 18 ]; then
  fail "Node.js $NODE_VER detectado. Precisa de versão 18 ou superior."
fi
ok "Node.js v$(node --version) OK"

# pnpm
if ! command -v pnpm &>/dev/null; then
  warn "pnpm não encontrado. Instalando..."
  npm install -g pnpm
  ok "pnpm instalado"
else
  ok "pnpm $(pnpm --version) OK"
fi

# Docker running
if ! docker info &>/dev/null 2>&1; then
  fail "Docker não está rodando. Inicie o Docker Desktop e tente novamente."
fi
ok "Docker rodando"

# ── GIT INIT ─────────────────────────────────────────────────

step "Inicializando repositório Git..."

if [ -d ".git" ]; then
  warn "Repositório Git já existe. Pulando git init."
else
  git init
  git branch -M main
  ok "Git inicializado"
fi

# Configurar git se necessário
if [ -z "$(git config --global user.email 2>/dev/null)" ]; then
  echo ""
  warn "Git não está configurado com seu nome/email."
  read -p "  Seu nome completo: " GIT_NAME
  read -p "  Seu e-mail: " GIT_EMAIL
  git config --global user.name "$GIT_NAME"
  git config --global user.email "$GIT_EMAIL"
  ok "Git configurado"
fi

# ── COPIAR .ENV ───────────────────────────────────────────────

step "Configurando variáveis de ambiente..."

if [ ! -f "apps/api/.env" ]; then
  cp apps/api/.env.example apps/api/.env
  ok "apps/api/.env criado a partir do .env.example"
  info "Edite apps/api/.env com suas chaves antes de rodar em produção"
else
  warn "apps/api/.env já existe. Mantendo."
fi

if [ ! -f "apps/web/.env.local" ]; then
  cp apps/web/.env.example apps/web/.env.local
  ok "apps/web/.env.local criado"
else
  warn "apps/web/.env.local já existe. Mantendo."
fi

# ── INSTALAR DEPENDÊNCIAS ─────────────────────────────────────

step "Instalando dependências (pnpm install)..."
pnpm install
ok "Dependências instaladas"

# ── DOCKER COMPOSE ────────────────────────────────────────────

step "Subindo infraestrutura com Docker Compose..."

# Verificar portas disponíveis
check_port() {
  if lsof -i ":$1" &>/dev/null 2>&1 || ss -tlnp "sport = :$1" &>/dev/null 2>&1; then
    warn "Porta $1 em uso. Pode conflitar com $2."
  fi
}

check_port 5432 "PostgreSQL"
check_port 27017 "MongoDB"
check_port 6379 "Redis"
check_port 8080 "Keycloak"
check_port 3000 "Web"
check_port 3001 "API"

docker compose up -d

ok "Containers iniciando..."
info "Aguardando PostgreSQL ficar pronto (pode levar 20-30s)..."

# Aguardar PostgreSQL
RETRIES=15
until docker compose exec -T postgres pg_isready -U icodlife &>/dev/null 2>&1; do
  RETRIES=$((RETRIES-1))
  if [ $RETRIES -le 0 ]; then
    fail "PostgreSQL não ficou pronto a tempo. Veja: docker compose logs postgres"
  fi
  echo -n "."
  sleep 2
done
echo ""
ok "PostgreSQL pronto"

# ── PRISMA MIGRATE ────────────────────────────────────────────

step "Rodando migrações do banco de dados..."

# Checar se prisma está disponível
if [ -f "apps/api/prisma/schema.prisma" ]; then
  cd apps/api
  npx prisma generate 2>/dev/null && ok "Prisma client gerado"
  npx prisma db push --skip-generate 2>/dev/null || warn "db push falhou — tente manualmente: cd apps/api && npx prisma db push"
  cd ../..
else
  warn "Schema Prisma não encontrado. Pulando migrate."
fi

# ── GIT COMMIT ────────────────────────────────────────────────

step "Fazendo primeiro commit Git..."

git add .
git status --short

if git diff --cached --quiet 2>/dev/null; then
  warn "Nada para commitar (repo limpo)."
else
  git commit -m "feat: IcodLife MVP inicial

- Monorepo: Next.js 14 + React Native (Expo) + NestJS
- Schema PostgreSQL 16 completo (LGPD, CITEXT, triggers)
- Docker Compose: Postgres, MongoDB, TimescaleDB, Redis, MinIO, Keycloak
- Auth: registro M/F, MFA, termos LGPD, gov.br
- Família: árvore + regra usuário ativo + hereditariedade
- Ciclo menstrual: log diário, calendário, predição
- IA Chatbot: check-in de saúde diário (mobile-first)
- Gestão de acessos: QR Code, link temporário, audit LGPD
- GitHub Actions CI/CD"
  ok "Commit realizado"
fi

# ── RESUMO FINAL ──────────────────────────────────────────────

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         ✅  SETUP CONCLUÍDO COM SUCESSO!                 ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${CYAN}Serviços rodando:${NC}"
echo "    🐘 PostgreSQL  → localhost:5432"
echo "    🍃 MongoDB     → localhost:27017"
echo "    ⚡ Redis        → localhost:6379"
echo "    🗄️  MinIO        → localhost:9001  (admin: icodlife / icodlife_dev_secret_key)"
echo "    🔐 Keycloak    → localhost:8080   (admin: admin / admin123)"
echo ""
echo -e "  ${CYAN}Próximos passos:${NC}"
echo ""
echo "  1. Iniciar os apps em modo dev:"
echo "     ${YELLOW}pnpm dev${NC}"
echo ""
echo "  2. Web em:  ${YELLOW}http://localhost:3000${NC}"
echo "     API em:  ${YELLOW}http://localhost:3001${NC}"
echo ""
echo "  3. Conectar ao GitHub:"
echo "     ${YELLOW}git remote add origin https://github.com/SEU_USER/icodlife.git${NC}"
echo "     ${YELLOW}git push -u origin main${NC}"
echo ""
echo -e "  ${CYAN}Comandos úteis:${NC}"
echo "    docker compose logs -f          → ver todos os logs"
echo "    docker compose logs -f postgres → logs do banco"
echo "    docker compose ps               → status dos containers"
echo "    docker compose down             → parar tudo"
echo "    cd apps/api && npx prisma studio → visualizar banco no browser"
echo ""
