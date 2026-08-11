@echo off
setlocal enabledelayedexpansion

echo ============================================
echo  Ponto do Saber - Iniciando Servidor
echo ============================================
echo.

REM ============================================
REM 1. Configurar Node.js
REM ============================================
set "NODE_PATH=C:\Users\MAURICIO\AppData\Local\OpenAI\Codex\runtimes\cua_node\1b23c930bdf84ed6\bin"
set "PATH=%NODE_PATH%;%PATH%"

REM Navigate to project directory
cd /d "C:\Users\MAURICIO\Documents\FREEBUFF\.freebuff\worktrees\thmrmkr3hi6nhg"

where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm nao encontrado em: %NODE_PATH%
    echo.
    echo Instale o Node.js manualmente em: https://nodejs.org
    pause
    exit /b 1
)
echo [OK] Node.js encontrado!
echo.

REM ============================================
REM 2. Instalar dependencias (se necessario)
REM ============================================
echo [1/6] Verificando dependencias...
if not exist "node_modules" (
    echo       Instalando dependencias (primeira vez)...
    call npm install
    if !ERRORLEVEL! NEQ 0 (
        echo [ERROR] Falha ao instalar dependencias.
        pause
        exit /b 1
    )
) else (
    echo       OK - node_modules existe
)
echo.

REM ============================================
REM 3. Limpar arquivos temporarios do Prisma
REM ============================================
echo [2/6] Limpando arquivos temporarios...
if exist "src\generated\prisma\*.dll.node.tmp*" (
    echo       Removendo DLLs temporarias corrompidas...
    del /f /q "src\generated\prisma\*.dll.node.tmp*" 2>nul
)
if exist "src\generated\prisma\*.tmp*" (
    echo       Removendo arquivos .tmp restantes...
    del /f /q "src\generated\prisma\*.tmp*" 2>nul
)
echo       OK - limpeza concluida
echo.

REM ============================================
REM 4. Detectar e reparar Prisma Client corrompido
REM ============================================
echo [3/6] Verificando integridade do Prisma Client...

set "PRISMA_DLL=src\generated\prisma\query_engine-windows.dll.node"
set "PRISMA_CLIENT=src\generated\prisma\client.ts"
set "NEED_GENERATE=0"

if not exist "%PRISMA_DLL%" (
    echo       [REPARO] DLL do Prisma ausente
    set NEED_GENERATE=1
) else (
    for %%F in ("%PRISMA_DLL%") do (
        if %%~zF LSS 1000000 (
            echo       [REPARO] DLL do Prisma com tamanho suspeito (%%~zF bytes)
            set NEED_GENERATE=1
        )
    )
)

if not exist "%PRISMA_CLIENT%" (
    echo       [REPARO] Client TS do Prisma ausente
    set NEED_GENERATE=1
)

REM --- Regenerar Prisma (com retry) ---
if !NEED_GENERATE! EQU 1 goto DO_GENERATE
goto AFTER_GENERATE

:DO_GENERATE
echo.
set RETRY=0

:GENERATE_LOOP
set /a RETRY+=1

REM Tentar liberar o arquivo DLL antes de deletar
echo       Tentativa !RETRY! de 3...
del /f /q "src\generated\prisma\*.dll.node*" 2>nul
timeout /t 2 /nobreak >nul

REM Deletar diretorio corrompido se existir
if exist "src\generated\prisma" (
    rmdir /s /q "src\generated\prisma" 2>nul
    timeout /t 1 /nobreak >nul
)

call npx prisma generate 2>&1
if !ERRORLEVEL! NEQ 0 (
    if !RETRY! LSS 3 (
        echo       [AVISO] Falha na tentativa !RETRY! - tentando novamente...
        timeout /t 3 /nobreak >nul
        goto GENERATE_LOOP
    )
    echo [ERROR] Falha ao gerar Prisma Client apos 3 tentativas.
    echo         Execute manualmente: npx prisma generate
    pause
    exit /b 1
)
echo       OK - Prisma Client regenerado com sucesso!
goto AFTER_GENERATE_CHECK

:AFTER_GENERATE
echo       OK - Prisma Client integro
for %%F in ("%PRISMA_DLL%") do echo       Tamanho: %%~zF bytes

:AFTER_GENERATE_CHECK
echo.

REM ============================================
REM 5. Sincronizar banco de dados e semear
REM ============================================
echo [4/6] Sincronizando banco de dados...
call npx prisma db push --skip-generate 2>&1
if !ERRORLEVEL! NEQ 0 (
    echo [ERROR] Falha ao sincronizar banco de dados.
    pause
    exit /b 1
)
echo       OK - Banco sincronizado
echo.

echo [5/6] Fazendo backup do banco de dados...

REM Criar diretorio de backups se nao existir
if not exist "prisma\backups" (
    mkdir "prisma\backups"
)

REM Gerar nome do arquivo de backup com data/hora
for /f "tokens=2 delims==." %%I in ('wmic os get localdatetime /value 2^>nul') do set "DT=%%I"
if defined DT (
    set "BACKUP_DATE=!DT:~0,4!-!DT:~4,2!-!DT:~6,2!_!DT:~8,2!!DT:~10,2!!DT:~12,2!"
) else (
    REM Fallback: usar data do sistema no formato ISO
    set "BACKUP_DATE=%DATE:/=-%_%TIME::=%"
    set "BACKUP_DATE=!BACKUP_DATE: =0!"
)

set "BACKUP_FILE=prisma\backups\dev-!BACKUP_DATE!.db"

if exist "prisma\dev.db" (
    copy /y "prisma\dev.db" "!BACKUP_FILE!" >nul
    if !ERRORLEVEL! EQU 0 (
        for %%F in ("!BACKUP_FILE!") do echo       Backup criado: %%~nxF (%%~zF bytes)
    ) else (
        echo       [AVISO] Falha ao criar backup
    )
) else (
    echo       Banco ainda nao existe - pulando backup
)

REM Manter apenas os 7 backups mais recentes
set "BACKUP_COUNT=0"
for /f "tokens=*" %%F in ('dir /b /o-d "prisma\backups\dev-*.db" 2^>nul') do (
    set /a BACKUP_COUNT+=1
    if !BACKUP_COUNT! GTR 7 (
        del /f /q "prisma\backups\%%F" 2>nul
        echo       Removendo backup antigo: %%F
    )
)
echo       Backup concluido - mantendo ate 7 backups
echo       Backups salvos em: prisma\backups\
echo       Para restaurar um backup anterior, execute: restore-backup.bat
echo.

REM ============================================
REM 6. Semear dados iniciais
REM ============================================
echo [6/6] Executando seed de dados...
call npx prisma db seed 2>&1
if !ERRORLEVEL! NEQ 0 (
    echo       [AVISO] Seed via Prisma falhou - tentando diretamente...
    call npx tsx prisma/seed.ts 2>&1
    if !ERRORLEVEL! NEQ 0 (
        echo [AVISO] Seed falhou. Execute manualmente: npx prisma db seed
    ) else (
        echo       OK - Seed executado com tsx
    )
) else (
    echo       OK - Seed executado com sucesso
)
echo.

REM ============================================
REM 6. Iniciar servidor
REM ============================================
echo ============================================
echo  Iniciando servidor em http://localhost:3000
echo ============================================
echo.
echo  Credenciais de teste:
echo    Admin: admin@lms.com / admin123
echo    Aluno: maria@email.com / 123456
echo    Aluno: joao@email.com / 123456
echo    Aluno: ana@email.com / 123456
echo.
echo  Pressione CTRL+C para parar o servidor
echo ============================================
echo.

call npm run dev

echo.
echo Servidor encerrado.
pause
