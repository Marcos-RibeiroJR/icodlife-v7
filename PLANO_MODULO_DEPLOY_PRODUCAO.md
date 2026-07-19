# Plano — Sprint 23: Deploy em Produção (domínio, servidor, banco)

> ICODLIFE / Sou Doutor · Documento de planejamento técnico + passo a passo executável
> Fecha o item de backlog **"Sprint 23 — Hardening + Deploy VPS"**, o único dos 4 itens grandes do backlog histórico que nunca tinha ganho nem plano nem código até esta sessão.
> Domínio: a registrar (usuário ainda não possui). Infraestrutura: recomendação abaixo. Orçamento-alvo: até R$150/mês.

---

## 1. O que já existia no repositório (achado nesta sessão) — e o que estava quebrado

Antes de escrever este plano do zero, foi encontrado scaffolding de deploy já presente no código (não documentado em nenhum prompt de continuidade anterior): `docker-compose.prod.yml`, `.github/workflows/ci.yml`, `infra/nginx/nginx.conf`, `.env.production`, e `Dockerfile` para `apps/api` e `apps/web`.

Esse scaffolding **nunca tinha sido testado** e continha bugs que impediriam qualquer deploy real de funcionar:

| Bug encontrado | Por quê quebrava | Corrigido nesta sessão |
|---|---|---|
| `Dockerfile` de `api`/`web` usava `context: ./apps/api` (ou `./apps/web`) no build, tentando copiar `pnpm-lock.yaml` de dentro daquela pasta | O projeto é um workspace pnpm com **um único** `pnpm-lock.yaml` na raiz — não existe dentro de `apps/api/` nem `apps/web/`. O build falharia na primeira linha (`COPY package.json pnpm-lock.yaml ./`) | ✅ Todos os 4 Dockerfiles (`api`, `web`, `doutor`, `clinica`) reescritos para builds com contexto na raiz do monorepo |
| `apps/doutor` e `apps/clinica` **não tinham `Dockerfile`** e não apareciam em nenhum lugar do `docker-compose.prod.yml` nem do CI | Painel do médico e painel da clínica — o core do produto hoje — simplesmente não seriam deployados | ✅ Dockerfiles criados; serviços adicionados ao compose, ao nginx e ao pipeline de CI |
| `.github/workflows/ci.yml` usava `pnpm --filter api`, `pnpm --filter web` | pnpm filtra pelo campo `name` do `package.json` (`@icodlife/api`, não `api`) — o filtro não bateria com nenhum pacote e o job falharia | ✅ Trocado para `pnpm --filter ./apps/api` etc. (filtro por caminho, sempre funciona) |
| `NEXT_PUBLIC_API_URL` inconsistente entre arquivos (`.env.production` não incluía `/api/v1`, que é o prefixo global da API) | Os 3 apps front esperam a env var já com `/api/v1` no final (é como `apps/doutor/src/lib/api.ts` e `apps/clinica/src/lib/api.ts` já usam) | ✅ Padronizado em `.env.production`, `docker-compose.prod.yml` e `ci.yml` |

**Importante**: essas correções foram feitas só com leitura/edição de arquivo (sandbox Linux indisponível durante a sessão) — **ainda não foram testadas com um build Docker real**. O Passo 4 abaixo inclui testar isso antes de prosseguir.

---

## 2. Recomendação de infraestrutura

Dado o orçamento (~R$150/mês) e que a API + 3 apps Next.js + Postgres + Redis já rodam via Docker Compose:

| Item | Escolha recomendada | Custo estimado |
|---|---|---|
| Domínio | `icodlife.com.br` via **Registro.br** (o código já assume esse domínio em `apps/api/src/main.ts`, CORS) | R$40/ano ≈ R$3,33/mês |
| Servidor | **DigitalOcean Droplet, região São Paulo (SP1)**, 4GB RAM / 2vCPU | US$24/mês ≈ R$130-145/mês (câmbio) |
| Backup do banco | Snapshot semanal do Droplet (DigitalOcean cobra ~20% do valor do droplet) OU `pg_dump` diário para um bucket S3/Spaces barato | +R$15-25/mês (opcional, recomendado) |
| **Total sem backup** | | **~R$135-150/mês** |
| **Total com backup** | | **~R$150-175/mês** (passa um pouco do teto — ver alternativa abaixo) |

**Por que DigitalOcean e não Hetzner/Contabo (mais baratos)**: Hetzner e Contabo não têm datacenter no Brasil — a latência para usuários brasileiros seria maior (100-200ms extras). Como o produto é uma plataforma de saúde usada por médicos/clínicas/pacientes no Brasil, a região São Paulo da DigitalOcean compensa o custo um pouco maior.

**Alternativa se o orçamento apertar**: Droplet de 2GB/2vCPU (US$18/mês ≈ R$100/mês) é suficiente para começar (poucos usuários simultâneos), deixando espaço para o backup dentro do teto de R$150. Pode fazer upgrade de tamanho depois sem downtime.

Fontes consultadas: [DigitalOcean Droplet Pricing](https://www.digitalocean.com/pricing/droplets), [Registro.br — Pagamento de Domínio](https://registro.br/ajuda/pagamento-de-dominio/).

---

## 3. Passo a passo de execução

### Passo 1 — Registrar o domínio

1. Acesse [registro.br](https://registro.br) e verifique se `icodlife.com.br` está disponível.
2. Se disponível: registre por 1 a 3 anos (desconto progressivo). Custo: R$40/ano.
3. Se **não** estiver disponível, escolha um nome alternativo (ex: `icodlifesaude.com.br`, `souicodlife.com.br`) — e ajuste 3 arquivos depois (ver Passo 3.4).

### Passo 2 — Provisionar o servidor

1. Crie conta na [DigitalOcean](https://www.digitalocean.com).
2. Crie um Droplet:
   - Imagem: **Ubuntu 22.04 LTS**
   - Região: **São Paulo (SP1)**
   - Tamanho: 4GB RAM / 2vCPU (ou 2GB/2vCPU se for economizar)
   - Autenticação: **SSH key** (não senha) — gere um par de chaves na sua máquina se ainda não tiver:
     ```powershell
     ssh-keygen -t ed25519 -C "icodlife-deploy"
     ```
3. Anote o IP público do Droplet.

### Passo 3 — Configurar DNS

No painel do Registro.br (ou onde o domínio foi registrado), aponte os seguintes registros para o IP do Droplet:

```
Tipo   Nome       Valor (IP do Droplet)
A      @          <IP_DO_DROPLET>
A      www        <IP_DO_DROPLET>
A      api        <IP_DO_DROPLET>
A      doutor     <IP_DO_DROPLET>
A      clinica    <IP_DO_DROPLET>
```

Propagação de DNS pode levar de alguns minutos a 24h. Verifique com `nslookup icodlife.com.br` quando quiser confirmar.

**3.4 — Se o domínio final for diferente de `icodlife.com.br`**, atualize (find & replace) nestes 3 arquivos antes de seguir:
- `apps/api/src/main.ts` (lista de CORS)
- `infra/nginx/nginx.conf` (troque `seudominio.com.br` pelo domínio real)
- `.env.production` (`NEXT_PUBLIC_API_URL`)

### Passo 4 — Testar o build Docker localmente (antes de ir para o servidor)

Isso valida as correções feitas nesta sessão nos 4 Dockerfiles. Rodar **da raiz do repositório**, com Docker Desktop aberto:

```powershell
cd C:\Users\marcos.junior.3\Downloads\icodlife-v7
docker build -f apps/api/Dockerfile -t icodlife-api-test .
docker build -f apps/web/Dockerfile -t icodlife-web-test .
docker build -f apps/doutor/Dockerfile -t icodlife-doutor-test .
docker build -f apps/clinica/Dockerfile -t icodlife-clinica-test .
```

Se algum falhar, me manda o erro completo — ainda não tive como testar isso (sandbox indisponível), então pode haver ajuste fino necessário.

### Passo 5 — Preparar o servidor

Conectar via SSH e instalar Docker:

```bash
ssh root@<IP_DO_DROPLET>

# Instalar Docker + Compose plugin
curl -fsSL https://get.docker.com | sh
apt-get install -y docker-compose-plugin

# Criar diretório de deploy
mkdir -p /opt/icodlife
cd /opt/icodlife
```

Copiar os arquivos necessários da sua máquina para o servidor (rodar no PowerShell, na raiz do repo):

```powershell
scp docker-compose.prod.yml root@<IP_DO_DROPLET>:/opt/icodlife/
scp -r infra root@<IP_DO_DROPLET>:/opt/icodlife/
```

No servidor, criar o `.env.production` real (copiar o template e preencher com valores reais — nunca commitar este arquivo preenchido):

```bash
cd /opt/icodlife
nano .env.production
```

Gerar os secrets:
```bash
openssl rand -hex 32   # → JWT_SECRET
openssl rand -hex 16   # → ENCRYPTION_KEY
openssl rand -hex 16   # → POSTGRES_PASSWORD e REDIS_PASSWORD (gere um valor diferente para cada)
```

### Passo 6 — Certificado SSL (Let's Encrypt, grátis)

```bash
apt-get install -y certbot
certbot certonly --standalone -d icodlife.com.br -d www.icodlife.com.br -d api.icodlife.com.br -d doutor.icodlife.com.br -d clinica.icodlife.com.br

mkdir -p /opt/icodlife/infra/nginx/certs
cp /etc/letsencrypt/live/icodlife.com.br/fullchain.pem /opt/icodlife/infra/nginx/certs/cert.pem
cp /etc/letsencrypt/live/icodlife.com.br/privkey.pem /opt/icodlife/infra/nginx/certs/key.pem
```

Renovação automática (certificados Let's Encrypt expiram a cada 90 dias):
```bash
echo "0 3 * * * certbot renew --quiet --pre-hook 'docker stop icodlife_nginx' --post-hook 'cp /etc/letsencrypt/live/icodlife.com.br/fullchain.pem /opt/icodlife/infra/nginx/certs/cert.pem && cp /etc/letsencrypt/live/icodlife.com.br/privkey.pem /opt/icodlife/infra/nginx/certs/key.pem && docker start icodlife_nginx'" | crontab -
```

### Passo 7 — Configurar os secrets do GitHub Actions

No GitHub, em `Settings → Secrets and variables → Actions`, criar:

| Secret | Valor |
|---|---|
| `VPS_HOST` | IP do Droplet |
| `VPS_USER` | `root` (ou usuário criado) |
| `VPS_SSH_KEY` | conteúdo da chave privada SSH (`cat ~/.ssh/id_ed25519`) |
| `VPS_DEPLOY_DIR` | `/opt/icodlife` |
| `ENV_PRODUCTION` | conteúdo completo do `.env.production` preenchido |

### Passo 8 — Primeiro deploy (manual, para validar antes de automatizar)

No servidor:
```bash
cd /opt/icodlife
docker login ghcr.io -u <seu_usuario_github>   # cole um Personal Access Token com escopo read:packages
docker compose -f docker-compose.prod.yml --env-file .env.production pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
docker compose -f docker-compose.prod.yml logs -f
```

Rodar a migration inicial (o `entrypoint.sh` da API já faz isso automaticamente ao subir, mas confirme nos logs):
```bash
docker exec icodlife_api npx prisma migrate status
```

### Passo 9 — Validação final

- [ ] `https://icodlife.com.br` abre o app do paciente
- [ ] `https://doutor.icodlife.com.br` abre o painel do médico
- [ ] `https://clinica.icodlife.com.br` abre o painel da clínica
- [ ] `https://api.icodlife.com.br/health` retorna OK
- [ ] Login funciona nos 3 apps
- [ ] Certificado SSL válido (cadeado verde no navegador)
- [ ] `docker compose ps` mostra todos os containers `healthy`

### Passo 10 — Deploy automático

A partir daqui, todo `git push` na branch `main` do GitHub dispara o pipeline (`.github/workflows/ci.yml`): quality → test → build das 4 imagens → deploy via SSH. Recomenda-se manter `develop` como branch de trabalho do dia a dia e só dar merge em `main` quando quiser publicar uma nova versão em produção.

---

## 4. Checklist de hardening (segurança básica, recomendado antes de divulgar a URL)

- [ ] Firewall do Droplet (`ufw`): liberar só 22 (SSH), 80, 443
- [ ] Desabilitar login SSH por senha (só chave)
- [ ] `fail2ban` para tentativas de força bruta em SSH
- [ ] Trocar todas as senhas padrão do `.env.production` (nunca usar os valores de exemplo)
- [ ] Backup automatizado do Postgres (`pg_dump` diário + rotação, ou snapshot do Droplet)
- [ ] Rate limiting na API (verificar se já existe — `apps/api` tem Redis, checar se há `@nestjs/throttler` configurado)

---

## 5. O que fica de fora deste plano (decisões suas, quando quiser avançar)

- Monitoramento/alertas (ex: UptimeRobot gratuito, ou Grafana+Prometheus se quiser algo mais robusto) — não incluído no orçamento base.
- CDN para assets estáticos (Cloudflare grátis na frente do domínio é uma opção barata de adicionar depois).
- Ambiente de staging separado (hoje só produção está planejada).
