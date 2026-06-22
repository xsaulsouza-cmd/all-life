@echo off
chcp 65001 > nul
title All Life - Git Push

cd /d "C:\Users\saul\sistema-saul"

echo.
echo [1/5] Removendo .git corrompido...
rd /s /q ".git" 2>nul
echo [OK] .git removido!

echo.
echo [2/5] Inicializando git limpo...
git init -b main
git config user.email "xsaulsouza@gmail.com"
git config user.name "Saul Franco"

echo.
echo [3/5] Adicionando arquivos...
git add .
git status --short

echo.
echo [4/5] Commit inicial...
git commit -m "feat: All Life - sistema inicial completo"

echo.
echo [5/5] Push para GitHub...
git remote add origin https://github.com/xsaulsouza-cmd/all-life.git
git push -u origin main

echo.
if %errorlevel% equ 0 (
    echo ====================================
    echo  SUCESSO! Publicado no GitHub!
    echo  github.com/xsaulsouza-cmd/all-life
    echo ====================================
) else (
    echo [ERRO] Push falhou.
)
pause
