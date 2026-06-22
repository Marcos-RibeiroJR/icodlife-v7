# Contexto do Projeto IcodLife v7 — para continuar em nova conversa

## Sobre o projeto
- **Nome:** IcodLife v7 — Saúde Pessoal Inteligente
- **Stack:** Monorepo pnpm
  - `apps/api` — NestJS + Prisma (PostgreSQL) + Mongoose (MongoDB) + Redis
  - `apps/web` — Next.js 14
  - `apps/mobile` — Expo (React Native)
- **Infra local:** Docker Compose (Postgres, MongoDB, TimescaleDB, Redis, MinIO, Keycloak)
- **Ambiente do usuário:** Windows + PowerShell

## O que foi feito na versão v7

### 1. Fix crítico — Login
- Senha agora persistida no campo `password_hash` do PostgreSQL (fonte de verdade)
- Redis usado como cache opcional (reenche automaticamente no login)
- Fallback `Demo@12345` mantido apenas para dev (remover em produção)
- Adicionado método `changePassword()`

### 2. Redesign visual — Tema Médico Vermelho
- Paleta: `#7B1E1E` (sidebar), `#B91C1C` (ações), `#FFF8F8` (fundo)
- `tailwind.config.js` — nova paleta `brand.*` e `health.*`
- `globals.css` — novas classes `.btn-sm`, `.card-hover`, `.badge-normal`, `.badge-warning`, `.badge-critical`, `.timeline-dot-*`
- `Sidebar.tsx` — cor atualizada + novos itens: "Evolução de Exames" e "Módulo Vida"
- `AppLayout.tsx` — margin-left 248px
- `dashboard/page.tsx` — redesenhado com destaques para novos módulos
- `auth/login/page.tsx` — redesenhado com painel de features

### 3. Schema Prisma — novos models (v7)
Campos adicionados em `User`:
- `passwordHash` — senha persistida
- `cityName`, `stateCode`, `ibgeCode` — localização para BigData

Novos models:
- `ExamResult` — resultado estruturado de exame
- `ExamResultItem` — cada marcador (Hemoglobina, Glicose, etc.) com valor, referência SBPC/ML, status, delta %
- `LifestyleProfile` — perfil de estilo de vida completo (IMC, tabagismo, álcool, exercício, sono, emocional, sexual, ocupacional, alimentação)
- `LifestyleSnapshot` — histórico de snapshots com geolocalização para BigData

Migration: `apps/api/prisma/migrations/20260620_v7_exam_results_lifestyle/migration.sql`

### 4. API — módulo exam-results
- `POST   /api/v1/exam-results` — criar resultado com itens
- `GET    /api/v1/exam-results` — listar resultados
- `GET    /api/v1/exam-results/summary` — resumo: total, normais, fora de referência, críticos
- `GET    /api/v1/exam-results/markers` — marcadores disponíveis com status mais recente
- `GET    /api/v1/exam-results/timeline?marker=Hemoglobina&from=...&to=...` — timeline de um marcador
- `GET    /api/v1/exam-results/:id` — detalhe

Arquivo `sbpcml-references.ts`: tabela completa de referências SBPC/ML (40+ marcadores) com faixas por gênero e valores críticos.

### 5. API — módulo lifestyle
- `POST   /api/v1/lifestyle` — criar/atualizar perfil (upsert)
- `GET    /api/v1/lifestyle` — obter perfil atual
- `GET    /api/v1/lifestyle/history` — histórico de snapshots
- `GET    /api/v1/lifestyle/regional/:state` — estatísticas regionais anonimizadas (BigData)

Cálculos automáticos:
- BMI com classificação OMS
- Score de saúde 0–100 baseado em: IMC, tabagismo, álcool, exercício, sono, estresse, carga horária

### 6. Web — novas páginas
- `apps/web/src/app/exam-timeline/page.tsx` — dashboard de timeline com gráfico SVG, seletor de marcadores, alertas
- `apps/web/src/app/vida/page.tsx` — formulário em abas (Biometria, Hábitos, Saúde Emocional, Trabalho, Alimentação) com cards de resumo e score de saúde

## Como rodar a migration v7

```powershell
# Na pasta apps/api
npx prisma migrate dev --name v7_exam_results_lifestyle
# OU aplicar o SQL diretamente:
docker exec -i icodlife_postgres psql -U icodlife -d icodlife < prisma/migrations/20260620_v7_exam_results_lifestyle/migration.sql
```

## Pendências v7 (próximos passos)

### Alta prioridade
1. **OCR de exames** — integrar pdfjs-dist ou Tesseract.js para extrair texto do PDF e parsear com IA (Claude API)
2. **Tela de upload + processamento** — fluxo para o usuário ver o exame sendo processado e confirmado
3. **Alertas por push/email** — quando marcador fica crítico

### Média prioridade
4. **TimescaleDB** — criar hypertables para séries temporais anonimizadas (`health_metrics`)
5. **Integração IBGE API** — popular seletor de cidade/estado no perfil
6. **App mobile** — telas do Módulo Vida e Timeline

### Baixa prioridade / futuro
7. **Dashboard populacional** — análise regional com dados DATASUS + dados internos anonimizados
8. **Verificação de e-mail** (SMTP)
9. **Corrigir Expo CLI** para mobile

## APIs públicas de saúde identificadas
- **DATASUS OpenData**: https://opendatasus.saude.gov.br
- **IBGE API v3**: https://servicodados.ibge.gov.br/api/v3
- **SINAN**: agravos notificáveis por região
- **Vigitel**: fatores de risco por capital (OMS/MS)
- **CNES**: estabelecimentos de saúde por município

## Senhas e acessos de desenvolvimento
- PostgreSQL: `icodlife / icodlife_dev_secret`
- Redis: `icodlife_dev_secret`
- MinIO: `icodlife / icodlife_dev_secret_key`
- Keycloak: `admin / admin123`
- Usuário de teste: `teste2@icodlife.com` / `Demo@12345`
