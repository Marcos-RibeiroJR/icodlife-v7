# ─────────────────────────────────────────────────────────────────────────────
# apps/clinica/Dockerfile  —  Produção (Next.js, monorepo pnpm)
#
# IMPORTANTE: buildar com CONTEXTO NA RAIZ DO MONOREPO (não em apps/clinica/),
# pois o pnpm-lock.yaml é único e fica na raiz do workspace.
#   docker build -f apps/clinica/Dockerfile -t icodlife-clinica .   (rodar da raiz)
#   No GitHub Actions: context: .  /  file: ./apps/clinica/Dockerfile
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

COPY . .
RUN pnpm install --frozen-lockfile

# Variáveis públicas necessárias no build (embutidas no bundle do Next.js)
ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

WORKDIR /app/apps/clinica
RUN pnpm build

# ── Stage 2: runner ────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3003
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app ./

RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app
USER appuser

WORKDIR /app/apps/clinica

EXPOSE 3003
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3003/ || exit 1

CMD ["pnpm", "start"]
