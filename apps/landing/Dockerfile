# ─────────────────────────────────────────────────────────────────────────────
# apps/landing/Dockerfile  —  Produção (Next.js, monorepo pnpm)
#
# IMPORTANTE: buildar com CONTEXTO NA RAIZ DO MONOREPO (não em apps/landing/),
# pois o pnpm-lock.yaml é único e fica na raiz do workspace.
#   docker build -f apps/landing/Dockerfile -t icodlife-landing .   (rodar da raiz)
#   No GitHub Actions: context: .  /  file: ./apps/landing/Dockerfile
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

COPY . .
RUN pnpm install --frozen-lockfile

WORKDIR /app/apps/landing
RUN pnpm build

# ── Stage 2: runner ────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3004
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app ./

RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app
USER appuser

WORKDIR /app/apps/landing

EXPOSE 3004
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3004/ || exit 1

CMD ["pnpm", "start"]
