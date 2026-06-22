# IcodLife — O Futuro dos Dados Médicos

> Plataforma digital de prontuário médico pessoal — Web + Mobile + IA de Saúde

## Stack

| Camada | Tecnologia |
|---|---|
| Web | Next.js 14, React 18, Tailwind CSS, shadcn/ui |
| Mobile | React Native + Expo SDK 51 |
| Backend | NestJS (Node.js) + PostgreSQL + MongoDB |
| Auth | Keycloak (OAuth2/OIDC) + MFA |
| Cache | Redis 7 |
| Armazenamento | AWS S3 (região sa-east-1) |
| Métricas de saúde | TimescaleDB |
| IA Chatbot | Python FastAPI + LangChain |
| Infra | Docker + Docker Compose (dev) / Kubernetes (prod) |
| CI/CD | GitHub Actions |

## Pré-requisitos

- Node.js >= 20
- pnpm >= 9
- Docker & Docker Compose
- Expo CLI (`npm install -g expo-cli`)

## Início Rápido

```bash
# 1. Clonar
git clone https://github.com/icodlife/icodlife.git
cd icodlife

# 2. Instalar dependências
pnpm install

# 3. Subir infraestrutura local (DB, Redis, Keycloak)
docker compose up -d

# 4. Configurar variáveis de ambiente
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 5. Rodar migrações
pnpm --filter api db:migrate

# 6. Seed do banco
pnpm --filter api db:seed

# 7. Iniciar todos os apps em dev
pnpm dev
```

## Estrutura do Monorepo

```
icodlife/
├── apps/
│   ├── api/          # NestJS — backend principal
│   ├── web/          # Next.js — versão browser
│   └── mobile/       # React Native — iOS + Android
├── packages/
│   ├── ui/           # Design system compartilhado
│   ├── types/        # TypeScript types compartilhados
│   └── utils/        # Utilitários comuns
├── infra/
│   ├── docker/       # Dockerfiles de produção
│   ├── k8s/          # Manifestos Kubernetes
│   └── terraform/    # IaC AWS
├── docs/             # Documentação adicional
└── scripts/          # Scripts utilitários
```

## Módulos Principais

- **Auth**: Cadastro M/F, MFA, Termos de Aceite LGPD, gov.br
- **Family**: Árv. familiar, regra de usuário ativo para familiar
- **Records**: Upload de exames, OCR, biblioteca
- **Menstrual**: Controle de ciclo (usuárias femininas)
- **AI Chat**: Chatbot de saúde periódico (mobile-first)
- **Share**: Compartilhamento seguro com médico via QR Code

## Compliance

- LGPD — Privacy by Design
- CFM Res. 1.821/2007 (prontuário digital)
- NRs trabalhistas (NR-1, NR-7, NR-17)
- Dados criptografados AES-256 em repouso, TLS 1.3 em trânsito

## Licença

Proprietário — IcodLife © 2025. Todos os direitos reservados.
