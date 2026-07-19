# ─────────────────────────────────────────────────────────────────────────────
# apps/api/Dockerfile  —  Produção (NestJS, monorepo pnpm)
#
# IMPORTANTE: este Dockerfile espera ser buildado com o CONTEXTO NA RAIZ DO
# MONOREPO (não em apps/api/), porque o projeto é um workspace pnpm com um
# único pnpm-lock.yaml na raiz — não existe pnpm-lock.yaml dentro de apps/api.
#   Build correto:
#     docker build -f apps/api/Dockerfile -t icodlife-api .   (rodar da raiz)
#   No GitHub Actions: context: .  /  file: ./apps/api/Dockerfile
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: build (instala o monorepo inteiro e compila só a API) ───────────
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# Copia o monorepo inteiro (workspace pnpm precisa da raiz pra resolver deps)
COPY . .

RUN pnpm install --frozen-lockfile

WORKDIR /app/apps/api

# Gera Prisma Client antes de compilar
RUN npx prisma generate

# Compila TypeScript → dist/
RUN pnpm build

# ── Stage 2: runner ────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

ENV NODE_ENV=production

# Copia o monorepo já buildado (inclui node_modules do workspace inteiro —
# maior que o ideal, mas evita os problemas clássicos de symlink quebrado
# ao tentar copiar só node_modules de produção num workspace pnpm)
COPY --from=builder /app ./

# Cria usuário não-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app
USER appuser

WORKDIR /app/apps/api

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

# Roda migration + inicia (entrypoint.sh já existe em apps/api/)
CMD ["sh", "entrypoint.sh"]
