# Setup Git + Push para GitHub
# Execute este script no PowerShell dentro da pasta sistema-saul

Set-Location "C:\Users\saul\sistema-saul"

Write-Host "=== Limpando cache do Next.js ===" -ForegroundColor Cyan
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host "Cache .next removido!" -ForegroundColor Green
} else {
    Write-Host "Cache ja estava limpo." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Verificando Git ===" -ForegroundColor Cyan
$gitVersion = git --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Git nao encontrado!" -ForegroundColor Red
    Write-Host "Instale em: https://git-scm.com/download/win" -ForegroundColor Yellow
    Read-Host "Pressione Enter para sair"
    exit 1
}
Write-Host $gitVersion -ForegroundColor Green

Write-Host ""
Write-Host "=== Inicializando repositorio ===" -ForegroundColor Cyan
git init
git branch -M main

Write-Host ""
Write-Host "=== Configurando remote ===" -ForegroundColor Cyan
git remote remove origin 2>$null
git remote add origin https://github.com/xsaulsouza-cmd/all-life.git
Write-Host "Remote configurado: https://github.com/xsaulsouza-cmd/all-life.git" -ForegroundColor Green

Write-Host ""
Write-Host "=== Adicionando arquivos ===" -ForegroundColor Cyan
git add .
Write-Host ""
Write-Host "--- Status ---" -ForegroundColor Yellow
git status --short

Write-Host ""
Write-Host "=== Fazendo commit inicial ===" -ForegroundColor Cyan
git commit -m "feat: All Life - sistema inicial completo"

Write-Host ""
Write-Host "=== Push para GitHub ===" -ForegroundColor Cyan
Write-Host "ATENCAO: GitHub exige Personal Access Token como senha!" -ForegroundColor Yellow
Write-Host "Crie em: github.com/settings/tokens -> Generate new token (classic)" -ForegroundColor Yellow
Write-Host "Permissoes necessarias: repo (full control)" -ForegroundColor Yellow
Write-Host ""
git push -u origin main

Write-Host ""
Write-Host "=== PRONTO! ===" -ForegroundColor Green
Write-Host "Repositorio: https://github.com/xsaulsouza-cmd/all-life" -ForegroundColor Cyan
Read-Host "Pressione Enter para fechar"
