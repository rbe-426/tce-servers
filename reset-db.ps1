# Script de nettoyage de la base de donnees SQLite
# Usage: powershell -ExecutionPolicy Bypass -File reset-db.ps1

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  Reinitialisation de la base de donnees SQLite" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

$backendDir = Join-Path $PSScriptRoot "backend"
$prismaDir = Join-Path $backendDir "prisma"
$dbFile = Join-Path $prismaDir "dev.db"
$dbJournal = Join-Path $prismaDir "dev.db-journal"

# Etape 1: Supprimer les fichiers
Write-Host "[1/3] Suppression de dev.db..." -ForegroundColor Yellow

if (Test-Path $dbFile) {
    Remove-Item -Path $dbFile -Force
    Write-Host "     ✓ dev.db supprimé" -ForegroundColor Green
} else {
    Write-Host "     - dev.db n'existait pas" -ForegroundColor Gray
}

if (Test-Path $dbJournal) {
    Remove-Item -Path $dbJournal -Force
    Write-Host "     ✓ dev.db-journal supprimé" -ForegroundColor Green
}

# Etape 2: Recréer le schéma
Write-Host ""
Write-Host "[2/3] Recreation du schema Prisma..." -ForegroundColor Yellow

Push-Location $backendDir
try {
    # Récupérer la version de prisma
    $prismaVersion = & npm list prisma 2>$null | Select-String "prisma@" | Select-Object -First 1
    Write-Host "     Prisma version trouvée" -ForegroundColor Gray
    
    # Lancer la migration
    & npx prisma migrate dev --name init 2>&1 | Write-Host
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "     ✗ Erreur lors de la migration" -ForegroundColor Red
        exit 1
    }
} finally {
    Pop-Location
}

# Etape 3: Vérifier
Write-Host ""
Write-Host "[3/3] Verification..." -ForegroundColor Yellow

if (Test-Path $dbFile) {
    $size = (Get-Item $dbFile).Length
    Write-Host "     ✓ dev.db créée ($size bytes)" -ForegroundColor Green
} else {
    Write-Host "     ✗ Erreur: dev.db non créée" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  ✅ Base de donnees reinitalisee avec succes !" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Prochaines etapes:" -ForegroundColor Green
Write-Host "  1. npm start  (lancer le serveur backend)" -ForegroundColor Green
Write-Host "  2. Importer vos donnees via l'interface CSV" -ForegroundColor Green
Write-Host ""
Write-Host "Appuyez sur une touche pour fermer..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
