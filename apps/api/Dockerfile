# ─────────────────────────────────────────────────────────────────────────────
# apps/api/Dockerfile  —  Produção (NestJS multi-stage)
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: dependências ────────────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Gera Prisma Client antes de compilar
RUN npx prisma generate

# Compila TypeScript → dist/
RUN pnpm build

# ── Stage 3: runner (imagem final) ────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

ENV NODE_ENV=production

# Instala só prod deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Copia build e prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma

# Cria usuário não-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

# Roda migration + seed antes de iniciar (via entrypoint)
COPY entrypoint.sh ./entrypoint.sh
CMD ["sh", "entrypoint.sh"]
