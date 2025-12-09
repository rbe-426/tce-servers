-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Vehicle" (
    "parc" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "modele" TEXT NOT NULL,
    "immat" TEXT NOT NULL,
    "km" INTEGER NOT NULL,
    "tauxSante" INTEGER NOT NULL,
    "statut" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "annee" INTEGER,
    "boite" TEXT,
    "moteur" TEXT,
    "portes" INTEGER,
    "girouette" TEXT,
    "clim" TEXT,
    "pmr" BOOLEAN NOT NULL DEFAULT false,
    "ct" DATETIME,
    "photosJson" TEXT
);
INSERT INTO "new_Vehicle" ("createdAt", "immat", "km", "modele", "parc", "statut", "tauxSante", "type") SELECT "createdAt", "immat", "km", "modele", "parc", "statut", "tauxSante", "type" FROM "Vehicle";
DROP TABLE "Vehicle";
ALTER TABLE "new_Vehicle" RENAME TO "Vehicle";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
