-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Ligne" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "typesVehicules" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'Actif',
    "description" TEXT,
    "heureDebut" TEXT,
    "heureFin" TEXT,
    "calendrierJson" TEXT,
    "demandeChrono" BOOLEAN NOT NULL DEFAULT false,
    "contraintes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Ligne" ("calendrierJson", "contraintes", "createdAt", "description", "heureDebut", "heureFin", "id", "nom", "numero", "statut", "typesVehicules", "updatedAt") SELECT "calendrierJson", "contraintes", "createdAt", "description", "heureDebut", "heureFin", "id", "nom", "numero", "statut", "typesVehicules", "updatedAt" FROM "Ligne";
DROP TABLE "Ligne";
ALTER TABLE "new_Ligne" RENAME TO "Ligne";
CREATE UNIQUE INDEX "Ligne_numero_key" ON "Ligne"("numero");
CREATE INDEX "Ligne_numero_statut_idx" ON "Ligne"("numero", "statut");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
