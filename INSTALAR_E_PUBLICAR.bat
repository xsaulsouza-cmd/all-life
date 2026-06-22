@echo off
chcp 65001 > nul
title All Life - Setup Git e Deploy

echo.
echo ============================================
echo   ALL LIFE - Instalacao Git + Push GitHub
echo ============================================
echo.

REM Verifica se git ja esta instalado
git --version > nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Git ja esta instalado!
    git --version
    goto :SETUP_GIT
)

echo [INFO] Instalando Git via winget...
winget install --id Git.Git -e --source winget --accept-source-agreements --accept-package-agreements
if %errorlevel% neq 0 (
    echo.
    echo [ERRO] winget falhou. Opcao alternativa:
    echo   Baixe em: https://git-scm.com/download/win
    echo   Instale e execute este arquivo novamente.
    pause
    exit /b 1
)

REM Atualiza PATH para incluir git
set "PATH=%PATH%;C:\Program Files\Git\cmd;C:\Program Files\Git\bin"
echo [OK] Git instalado!

:SETUP_GIT
cd /d "C:\Users\saul\sistema-saul"

echo.
echo [INFO] Limpando cache .next...
if exist ".next" (
    rmdir /s /q ".next"
    echo [OK] Cache removido!
)

echo.
echo [INFO] Inicializando repositorio Git...
git init
git branch -M main

echo.
echo [INFO] Configurando remote origin...
git remote remove origin 2>nul
git remote add origin https://github.com/xsaulsouza-cmd/all-life.git

echo.
echo [INFO] Staging de todos os arquivos...
git add .
echo [OK] Arquivos adicionados. Status:
git status --short

echo.
echo [INFO] Criando commit inicial...
git commit -m "feat: All Life - sistema inicial completo"

echo.
echo ============================================
echo  FAZENDO PUSH - autenticacao vai abrir
echo ============================================
echo  Uma janela do navegador vai aparecer.
echo  Clique em "Authorize" para continuar.
echo ============================================
echo.
git push -u origin main

echo.
if %errorlevel% equ 0 (
    echo.
    echo ============================================
    echo  SUCESSO! Repositorio publicado!
    echo  https://github.com/xsaulsouza-cmd/all-life
    echo ============================================
) else (
    echo.
    echo [ERRO] Push falhou. Tente de novo depois.
)
echo.
pause
