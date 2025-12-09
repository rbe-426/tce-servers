-- CreateTable
CREATE TABLE "Sens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ligneId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "direction" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 1,
    "statut" TEXT NOT NULL DEFAULT 'Actif',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Sens_ligneId_fkey" FOREIGN KEY ("ligneId") REFERENCES "Ligne" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Service" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ligneId" TEXT NOT NULL,
    "sensId" TEXT,
    "conducteurId" TEXT,
    "date" DATETIME NOT NULL,
    "heureDebut" TEXT NOT NULL,
    "heureFin" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'Planifiée',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Service_ligneId_fkey" FOREIGN KEY ("ligneId") REFERENCES "Ligne" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Service_sensId_fkey" FOREIGN KEY ("sensId") REFERENCES "Sens" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Service_conducteurId_fkey" FOREIGN KEY ("conducteurId") REFERENCES "Conducteur" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Service" ("conducteurId", "createdAt", "date", "heureDebut", "heureFin", "id", "ligneId", "statut", "updatedAt") SELECT "conducteurId", "createdAt", "date", "heureDebut", "heureFin", "id", "ligneId", "statut", "updatedAt" FROM "Service";
DROP TABLE "Service";
ALTER TABLE "new_Service" RENAME TO "Service";
CREATE INDEX "Service_ligneId_date_statut_idx" ON "Service"("ligneId", "date", "statut");
CREATE INDEX "Service_conducteurId_idx" ON "Service"("conducteurId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Sens_ligneId_statut_idx" ON "Sens"("ligneId", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "Sens_ligneId_nom_key" ON "Sens"("ligneId", "nom");
