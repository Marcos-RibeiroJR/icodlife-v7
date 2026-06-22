# IcodLife — Makefile
# Uso: make <comando>

.PHONY: help install up down dev migrate seed studio logs clean reset

help: ## Mostrar todos os comandos
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-18s\033[0m %s\n", $$1, $$2}'

# ── SETUP ─────────────────────────────────────────────────────────────────────

install: ## Instalar todas as dependências
	pnpm install

setup: install up wait migrate seed ## Setup completo do zero
	@echo "✅ Setup completo! Rode: make dev"

# ── INFRA ─────────────────────────────────────────────────────────────────────

up: ## Subir containers (banco, redis, keycloak, minio)
	docker compose up -d

down: ## Parar containers
	docker compose down

restart: ## Reiniciar containers
	docker compose restart

wait: ## Aguardar PostgreSQL ficar pronto
	@echo "⏳ Aguardando PostgreSQL..."
	@until docker compose exec -T postgres pg_isready -U icodlife 2>/dev/null; do sleep 2; done
	@echo "✅ PostgreSQL pronto!"

logs: ## Ver logs de todos os containers
	docker compose logs -f

logs-pg: ## Ver logs do PostgreSQL
	docker compose logs -f postgres

logs-kc: ## Ver logs do Keycloak
	docker compose logs -f keycloak

ps: ## Status dos containers
	docker compose ps

# ── BANCO ─────────────────────────────────────────────────────────────────────

migrate: ## Rodar migrações do Prisma
	cd apps/api && npx prisma db push --skip-generate

seed: ## Popular banco com dados de demonstração
	cd apps/api && npx ts-node prisma/seed.ts

studio: ## Abrir Prisma Studio (visualizar banco no browser)
	cd apps/api && npx prisma studio

generate: ## Gerar Prisma Client
	cd apps/api && npx prisma generate

# ── DESENVOLVIMENTO ────────────────────────────────────────────────────────────

dev: ## Iniciar todos os apps em modo dev
	pnpm dev

dev-web: ## Iniciar apenas o Web
	pnpm --filter web dev

dev-api: ## Iniciar apenas a API
	pnpm --filter api dev

dev-mobile: ## Iniciar Expo (mobile)
	cd apps/mobile && npx expo start

# ── BUILD ─────────────────────────────────────────────────────────────────────

build: ## Build de todos os apps
	pnpm build

# ── LIMPEZA ───────────────────────────────────────────────────────────────────

clean: ## Limpar node_modules e caches
	find . -name "node_modules" -type d -prune -exec rm -rf {} + 2>/dev/null || true
	find . -name ".next" -type d -prune -exec rm -rf {} + 2>/dev/null || true
	find . -name "dist" -type d -prune -exec rm -rf {} + 2>/dev/null || true
	@echo "✅ Limpeza concluída"

reset: down clean ## Reset completo (para containers + remove node_modules)
	docker compose down -v
	@echo "✅ Reset completo. Rode: make setup"

# ── UTILS ─────────────────────────────────────────────────────────────────────

env: ## Criar .env a partir dos .env.example
	cp -n apps/api/.env.example apps/api/.env 2>/dev/null && echo "✅ apps/api/.env criado" || echo "⚠️  apps/api/.env já existe"
	cp -n apps/web/.env.example apps/web/.env.local 2>/dev/null && echo "✅ apps/web/.env.local criado" || echo "⚠️  apps/web/.env.local já existe"
