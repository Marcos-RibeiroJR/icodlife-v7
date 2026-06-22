Write-Host "`n=== RESET POSTGRES (porta 5434) ===" -ForegroundColor Cyan

# 1. Para o docker compose completamente (apaga volumes)
Write-Host "`n[1/6] Removendo containers e volumes..." -ForegroundColor Yellow
docker compose down -v
if ($LASTEXITCODE -ne 0) { Write-Host "ERRO no down. Abortando." -ForegroundColor Red; exit 1 }

# 2. Sobe apenas o postgres
Write-Host "`n[2/6] Subindo postgres com POSTGRES_HOST_AUTH_METHOD=trust..." -ForegroundColor Yellow
docker compose up -d postgres
if ($LASTEXITCODE -ne 0) { Write-Host "ERRO ao subir postgres. Abortando." -ForegroundColor Red; exit 1 }

# 3. Aguarda postgres ficar pronto
Write-Host "`n[3/6] Aguardando postgres inicializar (15s)..." -ForegroundColor Yellow
Start-Sleep 15
docker exec icodlife_postgres pg_isready -U icodlife
if ($LASTEXITCODE -ne 0) { Write-Host "Postgres ainda nao pronto. Tente aumentar o sleep." -ForegroundColor Red; exit 1 }

# 4. Confirma que trust está ativo
Write-Host "`n[4/6] Verificando pg_hba.conf..." -ForegroundColor Yellow
docker exec icodlife_postgres grep -E "trust|scram" /var/lib/postgresql/data/pg_hba.conf
Write-Host "(deve mostrar 'trust', nunca 'scram-sha-256')" -ForegroundColor DarkGray

# 5. Migrations
Write-Host "`n[5/6] Aplicando migrations..." -ForegroundColor Yellow
Set-Location C:\Users\marcos.junior.3\Downloads\icodlife-v7
pnpm --filter api exec prisma migrate deploy
if ($LASTEXITCODE -ne 0) { Write-Host "ERRO nas migrations. Abortando." -ForegroundColor Red; exit 1 }

# 6. Seed
Write-Host "`n[6/6] Populando banco com dados demo..." -ForegroundColor Yellow
pnpm --filter api exec ts-node prisma/seed.ts
if ($LASTEXITCODE -ne 0) { Write-Host "ERRO no seed. Abortando." -ForegroundColor Red; exit 1 }

Write-Host "`n=== PRONTO! Banco configurado com sucesso ===" -ForegroundColor Green
Write-Host "Agora rode: pnpm --filter api dev" -ForegroundColor Green
