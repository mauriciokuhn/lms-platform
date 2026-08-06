@echo off
setlocal enabledelayedexpansion

echo ============================================
echo  Restaurar Backup do Banco de Dados
echo ============================================
echo.
echo  Este script restaura um backup anterior do
echo  banco SQLite (prisma/dev.db).
echo.
echo  ATENCAO: O banco atual sera SUBSTITUIDO!
echo ============================================
echo.

cd /d "C:\Users\MAURICIO\Documents\FREEBUFF\.freebuff\worktrees\thmrmkr3hi6nhg"

if not exist "prisma\backups" (
    echo [INFO] Nenhum backup encontrado em prisma\backups\
    echo.
    pause
    exit /b 1
)

REM Listar backups disponiveis
echo  Backups disponiveis:
echo.

set INDEX=0
for /f "tokens=*" %%F in ('dir /b /o-d "prisma\backups\dev-*.db" 2^>nul') do (
    set /a INDEX+=1
    for %%S in ("prisma\backups\%%F") do (
        set "FILE[!INDEX!]=%%F"
        echo  [!INDEX!] %%~nxS  (%%~zS bytes)
    )
)

if !INDEX! EQU 0 (
    echo  Nenhum backup encontrado.
    echo.
    pause
    exit /b 1
)

echo.
echo  0 - Cancelar
echo.

REM Perguntar qual backup restaurar
set /p CHOICE="Digite o numero do backup para restaurar: "

if not defined CHOICE set CHOICE=0

if "!CHOICE!"=="0" (
    echo Cancelado.
    pause
    exit /b 0
)

REM Validar se a entrada contem apenas numeros
set "INVALID="
for /f "delims=0123456789" %%C in ("!CHOICE!") do set "INVALID=1"

if defined INVALID (
    echo [ERROR] Opcao invalida. Digite apenas numeros.
    pause
    exit /b 1
)

REM Verificar se o numero esta dentro do intervalo valido
if !CHOICE! GTR 0 if !CHOICE! LEQ !INDEX! (
    for %%N in (!CHOICE!) do set "SELECTED=!FILE[%%N]!"
    
    echo.
    echo ============================================
    echo  ATENCAO: Isso vai SUBSTITUIR o banco atual!
    echo ============================================
    echo.
    echo  Backup selecionado: !SELECTED!
    echo.
    set /p CONFIRM="Tem certeza? (S/N): "
    
    if /i "!CONFIRM!"=="S" (
        echo.
        echo  Restaurando backup...
        
        REM Parar servidor se estiver rodando
        taskkill /f /im node.exe 2>nul
        timeout /t 2 /nobreak >nul
        
        copy /y "prisma\backups\!SELECTED!" "prisma\dev.db" >nul
        if !ERRORLEVEL! EQU 0 (
            echo.
            echo  ✅ Backup restaurado com sucesso!
            echo.
            echo  Arquivo: !SELECTED!
            echo.
            echo  Execute start-lms.bat para iniciar o servidor
            echo  com o banco restaurado.
        ) else (
            echo  [ERROR] Falha ao restaurar backup.
        )
    ) else (
        echo Cancelado.
    )
) else (
    echo [ERROR] Opcao invalida. Escolha um numero entre 1 e !INDEX!.
)

echo.
pause
