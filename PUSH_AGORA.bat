@echo off
chcp 65001 > nul
title All Life - Push GitHub
cd /d "C:\Users\saul\sistema-saul"

echo.
echo ============================================
echo  PUSH PARA GITHUB
echo  Repo: github.com/xsaulsouza-cmd/all-life
echo ============================================
echo.
echo [1/2] Verificando status...
git status --short
git log --oneline -1

echo.
echo [2/2] Enviando para GitHub...
echo  (Uma janela de autenticacao pode aparecer)
echo  (Clique em "Sign in with browser" e autorize)
echo.
git push -u origin main

echo.
if %errorlevel% equ 0 (
    echo ============================================
    echo  SUCESSO! Codigo no GitHub!
    echo  Acesse: github.com/xsaulsouza-cmd/all-life
    echo  Proximo passo: configurar Vercel
    echo ============================================
) else (
    echo [ERRO] Push falhou - tente novamente
)
echo.
pause
