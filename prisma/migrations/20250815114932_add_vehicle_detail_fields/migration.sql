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
    "photosJson" TEXT,
    "marque" TEXT,
    "motorisationInfo" TEXT,
    "places" INTEGER,
    "miseEnService" DATETIME,
    "derniereRevision" DATETIME,
    "depot" TEXT,
    "photoUrl" TEXT,
    "proprete" INTEGER NOT NULL DEFAULT 100,
    "etatTechnique" INTEGER NOT NULL DEFAULT 100,
    "etatInterieur" INTEGER NOT NULL DEFAULT 100,
    "lignesJson" TEXT,
    "optionsUsineJson" TEXT,
    "optionsAtelierJson" TEXT,
    "optionsSaeivJson" TEXT
);
INSERT INTO "new_Vehicle" ("annee", "boite", "clim", "createdAt", "ct", "girouette", "immat", "km", "modele", "moteur", "parc", "photosJson", "pmr", "portes", "statut", "tauxSante", "type") SELECT "annee", "boite", "clim", "createdAt", "ct", "girouette", "immat", "km", "modele", "moteur", "parc", "photosJson", "pmr", "portes", "statut", "tauxSante", "type" FROM "Vehicle";
DROP TABLE "Vehicle";
ALTER TABLE "new_Vehicle" RENAME TO "Vehicle";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
