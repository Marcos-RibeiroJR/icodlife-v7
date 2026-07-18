# Como subir o projeto ICODLIFE / Sou Doutor (dev)

## Pré-requisitos (só na 1ª vez)
- Docker Desktop instalado e ABERTO
- Node v24 + pnpm
- Instalar dependências na raiz do monorepo:
  ```powershell
  pnpm install
  ```

## Portas
- Postgres: 5434  ·  Redis: 6379  ·  API: 3001 (/api/v1)  ·  Paciente: 3000  ·  Médico: 3002

---

## Ordem para subir (4 janelas PowerShell)

### 1) Banco (Docker)
Com o Docker Desktop aberto:
```powershell
docker start icodlife_postgres icodlife_redis
```
(1ª vez, se os containers não existirem: `docker compose up -d postgres redis`)

### 2) API — janela 2  (cd apps\api)
Opção A — simples (recomendada no dia a dia):
```powershell
cd apps\api
pnpm dev
```
Opção B — build manual (a que já usava; usar se a Opção A der erro do Prisma engine):
```powershell
cd apps\api
npx nest build
robocopy src\generated dist\src\generated /E /XF *.dll.node /NFL /NDL /NJH /NJS
node dist\src\main
```
Esperar: **"API IcodLife rodando na porta 3001"**.

> Só na 1ª vez, ou depois de mexer no schema.prisma:
> ```powershell
> npx prisma migrate deploy   # aplica migrations (inclui o motor de risco)
> npx prisma generate
> pnpm db:seed                # popula dados/usuarios demo
> ```

### 3) Paciente (web) — janela 3
```powershell
cd apps\web
pnpm dev        # http://localhost:3000
```

### 4) Médico (doutor) — janela 4
```powershell
cd apps\doutor
pnpm dev        # http://localhost:3002
```

---

## Credenciais demo (senha: Demo@12345)
- Paciente M: joao@demo.icodlife.com
- Paciente F: ana@demo.icodlife.com
- Médico:     dr.marcos@demo.icodlife.com  (portal 3002)

## Parar / problemas comuns
- Parar sempre com **Ctrl+C** na janela (nunca fechar no X).
- Porta 3001 presa (EADDRINUSE):
  ```powershell
  Get-NetTCPConnection -LocalPort 3001 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
  ```
- Git travado (index.lock):
  ```powershell
  Remove-Item .git\index.lock -ErrorAction SilentlyContinue
  ```

## Onde ver a Fase 3
Menu lateral do paciente → grupo **Módulo Vida** → **📊 Tendência de Saúde**
(faça alguns check-ins no HealthBot para popular os gráficos).

---

## OCR de imagem (exames fotografados)
O upload de **imagem** (JPG/PNG) agora passa por OCR real (tesseract.js).
- Instale a nova dependência antes de subir a API:
  ```powershell
  pnpm install            # na raiz do monorepo
  ```
- Na **1ª leitura de imagem**, o modelo de português (~15 MB) é baixado do CDN e fica em cache. Precisa de internet nessa primeira vez.
- **Uso offline (opcional)**: baixe `por.traineddata` e os arquivos core do tesseract e aponte via variáveis no `apps/api/.env`:
  ```
  TESSERACT_LANG_PATH=C:\caminho\para\lang     # pasta com por.traineddata(.gz)
  TESSERACT_CORE_PATH=C:\caminho\para\core      # tesseract-core.wasm.js
  ```
- Se o OCR falhar (sem internet), o exame ainda é salvo como **Imagem** e você pode lançar os valores manualmente.
- Observação: **PDF escaneado** (imagem dentro de PDF) ainda usa `pdf-parse` (texto). Ler valores de PDF escaneado exigiria rasterizar o PDF em imagem antes do OCR — próximo passo possível.
