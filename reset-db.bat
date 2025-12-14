@echo off
REM Script de nettoyage de la base de donnees SQLite
REM Usage: .\reset-db.bat

echo.
echo =================================================
echo  Reinitialisation de la base de donnees SQLite
echo =================================================
echo.

cd /d "%~dp0\backend\prisma" || exit /b 1

REM Supprimer les fichiers SQLite
echo [1/3] Suppression de dev.db...
if exist dev.db (
  del dev.db
  echo     ✓ dev.db supprime
) else (
  echo     - dev.db n'existait pas
)

if exist dev.db-journal (
  del dev.db-journal
  echo     ✓ dev.db-journal supprime
)

REM Retourner au dossier backend
cd ..

REM Recréer le schéma
echo.
echo [2/3] Recreation du schema Prisma...
call npx prisma migrate dev --name init

REM Vérifier
echo.
echo [3/3] Verification...
if exist dev.db (
  for /f %%A in ('powershell -command "Get-Item prisma/dev.db | Select-Object -ExpandProperty Length"') do (
    echo     ✓ dev.db créée (%%A bytes)
  )
) else (
  echo     ✗ Erreur: dev.db non créée
  exit /b 1
)

echo.
echo =================================================
echo  ✅ Base de donnees reinitalisee avec succes !
echo =================================================
echo.
echo Prochaines etapes:
echo  1. npm start  (lancer le serveur backend)
echo  2. Importer vos donnees via l'interface CSV
echo.
pause
