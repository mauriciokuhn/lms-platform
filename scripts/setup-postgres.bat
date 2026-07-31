@echo off
echo ============================================
echo  Migrando LMS de SQLite para PostgreSQL
echo ============================================
echo.

REM Verificar Docker
docker ps >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Docker nao esta rodando.
    echo        Inicie o Docker Desktop primeiro.
    pause
    exit /b 1
)
echo [OK] Docker encontrado.

REM Copiar .env de producao
copy /Y .env.production .env
echo [OK] Usando .env.production como .env

REM Instalar adapter PostgreSQL
call npm install @prisma/adapter-pg pg
echo [OK] Adapter PostgreSQL instalado

REM Aguardar PostgreSQL ficar pronto
echo [AGUARDANDO] PostgreSQL ficar pronto...
:waitloop
docker exec lms-postgres pg_isready -U postgres >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    timeout /t 2 /nobreak >nul
    goto waitloop
)
echo [OK] PostgreSQL pronto!

REM Gerar Prisma Client
call npx prisma generate
echo [OK] Prisma Client gerado

REM Aplicar schema
call npx prisma db push
echo [OK] Schema aplicado no banco

REM Popular banco
call npm run db:seed
echo [OK] Banco populado com dados de teste

echo.
echo ============================================
echo  Migracao concluida com sucesso!
echo ============================================
echo.
echo  Para rodar o app: npm run dev
echo.
pause
