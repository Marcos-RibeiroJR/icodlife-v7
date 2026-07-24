# Checklist de deploy em produção — iCODLIFE

Baseado no que já existe no repositório (`docker-compose.prod.yml`, `infra/nginx/nginx.conf`,
`.github/workflows/ci.yml`, `.env.production`). Siga na ordem — cada bloco depende do anterior.

---

## 1. Pré-requisitos

- [ ] VPS/servidor com Docker + Docker Compose instalados (Ubuntu 22/24 recomendado).
- [ ] Domínio `icodlife.com.br` registrado e com acesso ao painel de DNS.
- [ ] Acesso SSH ao servidor (chave própria, não senha).
- [ ] Repositório no GitHub com branch `main` protegida (o CI/CD só builda/deploya push em `main`).

---

## 2. DNS — registros a criar

Todos apontando para o IP público do servidor (registro tipo **A**):

| Subdomínio | Aponta para | Serve |
|---|---|---|
| `icodlife.com.br` | IP do servidor | Landing page (apps/landing) |
| `www.icodlife.com.br` | IP do servidor | Landing page |
| `app.icodlife.com.br` | IP do servidor | Portal do paciente (apps/web) |
| `doutor.icodlife.com.br` | IP do servidor | Portal do médico (apps/doutor) |
| `clinica.icodlife.com.br` | IP do servidor | Portal da clínica (apps/clinica) |
| `api.icodlife.com.br` | IP do servidor | API (apps/api) |

Propagação de DNS pode levar de minutos a algumas horas — confirme com `dig icodlife.com.br` antes de seguir.

---

## 3. Segredos e variáveis de ambiente

Preencher **de verdade** o `.env.production` na raiz do servidor (nunca commitar esse arquivo com valores reais):

- [ ] `POSTGRES_PASSWORD` — senha forte, só para o Postgres interno.
- [ ] `REDIS_PASSWORD` — senha forte, só para o Redis interno.
- [ ] `JWT_SECRET` — string aleatória longa (≥ 32 caracteres). Gerar com `openssl rand -base64 48`.
- [ ] `JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` — manter os padrões (15m / 30d) ou ajustar.
- [ ] `ENCRYPTION_KEY` — usada para criptografar dados sensíveis (LGPD). Gerar com `openssl rand -hex 16` (32 caracteres).
- [ ] `OPENAI_API_KEY` — se o HealthBot/IA estiver em uso.
- [ ] `NEXT_PUBLIC_API_URL` — `https://api.icodlife.com.br/api/v1` (embutida no build do Next.js — se mudar depois, precisa rebuildar as imagens).
- [ ] `GITHUB_REPOSITORY` / `IMAGE_TAG` — normalmente preenchidos automaticamente pelo CI.

No **GitHub** (Settings → Secrets and variables → Actions), cadastrar:

- [ ] `VPS_HOST` — IP ou hostname do servidor.
- [ ] `VPS_USER` — usuário SSH (ex: `ubuntu`).
- [ ] `VPS_SSH_KEY` — chave privada SSH completa.
- [ ] `VPS_DEPLOY_DIR` — caminho no servidor onde o repositório fica clonado (ex: `/opt/icodlife`).
- [ ] `ENV_PRODUCTION` — conteúdo completo do `.env.production` (o pipeline recria o arquivo no servidor a cada deploy).

---

## 4. Certificado SSL

- [ ] Instalar certbot no servidor: `sudo apt install certbot`.
- [ ] Gerar certificado (modo standalone, com nginx parado ou porta 80 livre):
  ```
  certbot certonly --standalone -d icodlife.com.br -d www.icodlife.com.br \
    -d app.icodlife.com.br -d doutor.icodlife.com.br -d clinica.icodlife.com.br -d api.icodlife.com.br
  ```
- [ ] Copiar/linkar os arquivos gerados para `infra/nginx/certs/cert.pem` e `infra/nginx/certs/key.pem`.
- [ ] Configurar renovação automática (`certbot renew`) via cron, com reload do nginx depois:
  ```
  0 3 * * * certbot renew --quiet && docker exec icodlife_nginx nginx -s reload
  ```

---

## 5. Ajustar `infra/nginx/nginx.conf`

O arquivo já tem os 5 blocos de servidor prontos (landing/raiz, app, doutor, clinica, api), mas ainda usa o
placeholder `seudominio.com.br`. Antes de subir:

- [ ] Trocar **todas** as ocorrências de `seudominio.com.br` por `icodlife.com.br` (5 blocos `server_name`).
- [ ] Conferir que os `proxy_pass` apontam para os nomes de serviço certos do `docker-compose.prod.yml`:
  `landing:3004`, `web:3000`, `doutor:3002`, `clinica:3003`, `api:3001`.
- [ ] Também trocar `seudominio.com.br` no `.github/workflows/ci.yml` (aparece em `NEXT_PUBLIC_API_URL` dos
  builds de Web/Doutor/Clínica e na verificação de saúde pós-deploy) e no `environment.url` do job de deploy.

---

## 6. Banco de dados

- [ ] Rodar as migrations pendentes contra o banco de produção:
  `docker compose -f docker-compose.prod.yml --env-file .env.production run --rm api npx prisma migrate deploy`
- [ ] Conferir se algum seed é necessário (`pnpm db:seed`) — ex.: planos da plataforma (`platform_plans`), se
  ainda não existirem no banco de produção.
- [ ] Configurar backup automático do Postgres (cron com `pg_dump` para fora do container, ou snapshot do
  volume `postgres_data`). Não existe backup configurado hoje — item crítico antes de abrir para usuários reais.

---

## 7. Build e deploy

**Via CI/CD (recomendado)** — só dar push/merge em `main` depois dos itens 1–6 prontos; o pipeline builda,
publica no GHCR e faz o deploy via SSH automaticamente.

**Manual (primeira subida ou emergência)**:
```
cd /opt/icodlife
docker compose -f docker-compose.prod.yml --env-file .env.production pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

- [ ] Confirmar que os 7 serviços sobem: `postgres`, `redis`, `api`, `web`, `doutor`, `clinica`, `landing`, `nginx`.
- [ ] `docker compose ps` — todos `healthy`/`running`, sem restart loop.

---

## 8. Firewall / portas

- [ ] Abrir só **80** e **443** externamente.
- [ ] Confirmar que `5432` (Postgres) e `6379` (Redis) **não** estão expostos publicamente (no
  `docker-compose.prod.yml` atual eles não têm `ports:` mapeadas para fora — correto, mas vale confirmar
  com `docker compose ps` que não aparecem bindados no host).
- [ ] As portas `3000–3004` (Next.js) também não deveriam ser acessadas diretamente de fora — só o nginx
  deveria falar com elas na rede interna do Docker.

---

## 9. Verificação pós-deploy (smoke test manual)

- [ ] `https://icodlife.com.br` → landing carrega, links pros 3 portais funcionam.
- [ ] `https://app.icodlife.com.br` → cadastro + login de paciente funcionam.
- [ ] `https://doutor.icodlife.com.br/register` → cadastro completo (3 passos) cria o usuário **e** ativa o
  perfil de doutor (bug corrigido nesta sessão — validar de ponta a ponta em produção também).
- [ ] `https://clinica.icodlife.com.br` → login, "Meus Funcionários" e busca iCODLIFE (bug ainda em aberto —
  ver seção de pendências).
- [ ] `curl -f https://api.icodlife.com.br/health` → responde OK.
- [ ] Testar emissão de ASO, guichê de atendimento e o extrato financeiro (cobrança automática por exame).
- [ ] Baixar a carteirinha digital (PNG) pelo portal do paciente.

---

## 10. Monitoramento e observabilidade

- [ ] Hoje não há ferramenta de monitoramento/alerta configurada — considerar algo simples como
  UptimeRobot/BetterStack (grátis) apontando para `/health` da API e para a landing.
- [ ] `docker compose logs -f api` e configurar rotação de log do Docker (`max-size`/`max-file` no
  `docker-compose.prod.yml`) para não estourar disco com o tempo.

---

## 11. Rollback

- [ ] Antes de cada deploy, anotar a tag da imagem atual em produção (`docker inspect` ou o `IMAGE_TAG` usado).
- [ ] Para reverter: `IMAGE_TAG=<tag_anterior> docker compose -f docker-compose.prod.yml --env-file .env.production up -d`.
- [ ] Sempre fazer backup do banco (item 6) antes de aplicar uma migration nova em produção — migration não
  tem rollback automático neste projeto (migrations são escritas manualmente).

---

## 12. Pendências conhecidas antes de abrir para usuários reais

Estas não bloqueiam o deploy técnico, mas valem a pena resolver (ou pelo menos decidir conscientemente
adiar) antes de divulgar o link para usuários de verdade:

- 🔴 Busca iCODLIFE travando em "Buscando..." em Meus Funcionários (apps/clinica) — ainda sem diagnóstico
  fechado, precisa do Network/Console do navegador.
- 🔴 Bug histórico "Erro ao carregar médicos" no painel da Clínica (mapeado desde a V17) — mesma família de
  sintoma do item acima (falha silenciosa ao buscar dado no painel da clínica); pode ser a mesma causa raiz.
- 🟡 Validação de CRM do médico é só manual/textual hoje ("validado em até 24h") — não encontrei um painel
  administrativo para aprovar/reprovar CRM durante esta sessão; se não existir, `crmStatus` fica `pending`
  para sempre sem alguém mexer direto no banco.
- 🟡 Cobrança real do plano "Profissional" do médico (Pagar.me ou similar) — 0% implementado, é só
  cadastro da intenção do plano hoje.
- 🟡 Sem backup automático do Postgres configurado (item 6 acima).
