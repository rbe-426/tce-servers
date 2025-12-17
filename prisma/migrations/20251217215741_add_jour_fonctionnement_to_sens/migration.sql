-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Sens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ligneId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "direction" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 1,
    "statut" TEXT NOT NULL DEFAULT 'Actif',
    "jourFonctionnement" TEXT NOT NULL DEFAULT 'SEMAINE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Sens_ligneId_fkey" FOREIGN KEY ("ligneId") REFERENCES "Ligne" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Sens" ("createdAt", "direction", "id", "ligneId", "nom", "ordre", "statut", "updatedAt") SELECT "createdAt", "direction", "id", "ligneId", "nom", "ordre", "statut", "updatedAt" FROM "Sens";
DROP TABLE "Sens";
ALTER TABLE "new_Sens" RENAME TO "Sens";
CREATE INDEX "Sens_ligneId_statut_jourFonctionnement_idx" ON "Sens"("ligneId", "statut", "jourFonctionnement");
CREATE UNIQUE INDEX "Sens_ligneId_nom_key" ON "Sens"("ligneId", "nom");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
