@echo off
chcp 65001 >nul
echo.
echo  ██╗ ██████╗ ██████╗ ██████╗ ██╗     ██╗███████╗███████╗
echo  ██║██╔════╝██╔═══██╗██╔══██╗██║     ██║██╔════╝██╔════╝
echo  ██║██║     ██║   ██║██║  ██║██║     ██║█████╗  █████╗
echo  ██║╚██████╗╚██████╔╝██████╔╝███████╗██║██║     ███████╗
echo  ╚═╝ ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝╚═╝╚═╝     ╚══════╝
echo.
echo  Setup para Windows - IcodLife MVP
echo  =====================================
echo.

REM ── VERIFICAR PRE-REQUISITOS ──────────────────────────────────────────────

echo [1/8] Verificando pre-requisitos...
echo.

node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado!
    echo.
    echo  Instale em: https://nodejs.org
    echo  Escolha a versao LTS ^(20.x^)
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do echo  OK Node.js %%i

pnpm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  Instalando pnpm...
    npm install -g pnpm
    if %errorlevel% neq 0 (
        echo [ERRO] Falha ao instalar pnpm
        pause
        exit /b 1
    )
)
for /f "tokens=*" %%i in ('pnpm --version') do echo  OK pnpm %%i

docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Docker nao encontrado!
    echo.
    echo  Instale em: https://www.docker.com/products/docker-desktop/
    echo  Apos instalar, reinicie o computador e execute este script novamente.
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('docker --version') do echo  OK %%i

docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Docker nao esta rodando!
    echo.
    echo  Abra o Docker Desktop e aguarde inicializar ^(icone na barra de tarefas^)
    echo  Depois execute este script novamente.
    echo.
    pause
    exit /b 1
)
echo  OK Docker rodando

echo.
echo  Todos os pre-requisitos OK!
echo.

REM ── CRIAR .ENV ────────────────────────────────────────────────────────────

echo [2/8] Criando arquivos .env...

if not exist "apps\api\.env" (
    copy "apps\api\.env.example" "apps\api\.env" >nul
    echo  OK apps\api\.env criado
) else (
    echo  OK apps\api\.env ja existe
)

if not exist "apps\web\.env.local" (
    copy "apps\web\.env.example" "apps\web\.env.local" >nul
    echo  OK apps\web\.env.local criado
) else (
    echo  OK apps\web\.env.local ja existe
)
echo.

REM ── INSTALAR DEPENDENCIAS ─────────────────────────────────────────────────

echo [3/8] Instalando dependencias ^(pnpm install^)...
echo  Isso pode levar alguns minutos na primeira vez...
echo.
pnpm install
if %errorlevel% neq 0 (
    echo [ERRO] Falha no pnpm install
    echo  Tente: pnpm store prune e depois pnpm install novamente
    pause
    exit /b 1
)
echo  OK Dependencias instaladas
echo.

REM ── DOCKER COMPOSE ────────────────────────────────────────────────────────

echo [4/8] Subindo banco de dados e servicos...
docker compose up -d
if %errorlevel% neq 0 (
    echo [ERRO] Falha no docker compose up
    echo  Verifique: docker compose logs
    pause
    exit /b 1
)
echo  OK Containers iniciando...
echo.

REM ── AGUARDAR POSTGRESQL ───────────────────────────────────────────────────

echo [5/8] Aguardando PostgreSQL ficar pronto...
echo  Isso pode levar 20-40 segundos...
echo.

set RETRIES=20
:WAIT_LOOP
docker compose exec -T postgres pg_isready -U icodlife >nul 2>&1
if %errorlevel% equ 0 goto PG_READY
set /a RETRIES=%RETRIES%-1
if %RETRIES% leq 0 (
    echo [ERRO] PostgreSQL nao ficou pronto a tempo
    echo  Verifique: docker compose logs postgres
    pause
    exit /b 1
)
echo  Aguardando... ^(%RETRIES% tentativas restantes^)
timeout /t 3 /nobreak >nul
goto WAIT_LOOP

:PG_READY
echo  OK PostgreSQL pronto!
echo.

REM ── PRISMA MIGRATE ────────────────────────────────────────────────────────

echo [6/8] Criando tabelas do banco...
cd apps\api
call npx prisma generate
call npx prisma db push --skip-generate
if %errorlevel% neq 0 (
    echo [AVISO] db push com erro - verifique a conexao com o banco
)
cd ..\..
echo  OK Tabelas criadas
echo.

REM ── SEED ──────────────────────────────────────────────────────────────────

echo [7/8] Populando banco com dados de demonstracao...
cd apps\api
call npx ts-node prisma/seed.ts
cd ..\..
echo  OK Dados inseridos
echo.

REM ── GIT ───────────────────────────────────────────────────────────────────

echo [8/8] Inicializando repositorio Git...
git init >nul 2>&1
git branch -M main >nul 2>&1
git add . >nul 2>&1
git commit -m "feat: IcodLife MVP inicial" >nul 2>&1
echo  OK Git inicializado
echo.

REM ── RESUMO ────────────────────────────────────────────────────────────────

echo.
echo  ============================================================
echo   SETUP CONCLUIDO COM SUCESSO!
echo  ============================================================
echo.
echo   Servicos rodando:
echo    PostgreSQL  -^> localhost:5432
echo    MongoDB     -^> localhost:27017
echo    Redis       -^> localhost:6379
echo    MinIO       -^> http://localhost:9001
echo    Keycloak    -^> http://localhost:8080
echo.
echo   Proximo passo - iniciar os apps:
echo.
echo     pnpm dev
echo.
echo   Depois acesse:
echo     Web: http://localhost:3000
echo     API: http://localhost:3001
echo.
echo   Login de demonstracao:
echo     Email: joao@demo.icodlife.com
echo     Senha: Demo@12345
echo.
echo  ============================================================
echo.
pause
