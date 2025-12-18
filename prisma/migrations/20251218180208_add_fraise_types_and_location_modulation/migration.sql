-- CreateTable
CREATE TABLE "FraiseLocationModulation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dossierId" TEXT NOT NULL,
    "dureeMinJours" INTEGER NOT NULL DEFAULT 1,
    "dureeMaxJours" INTEGER,
    "typeVehicule" TEXT,
    "saisonalite" TEXT NOT NULL DEFAULT 'ANNEE',
    "prixJournalier" REAL NOT NULL,
    "prixHebdo" REAL,
    "prixMensuel" REAL,
    "caution" REAL NOT NULL DEFAULT 0,
    "assuranceIncluse" BOOLEAN NOT NULL DEFAULT true,
    "kmLimite" INTEGER,
    "kmSupplementaire" REAL,
    "fraisNettoyage" REAL NOT NULL DEFAULT 0,
    "fraisAssurance" REAL NOT NULL DEFAULT 0,
    "fraisConfirm" REAL NOT NULL DEFAULT 0,
    "remise" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "dateDebut" DATETIME,
    "dateFin" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FraiseLocationModulation_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "FraiseDossier" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "FraiseLocationModulation_dossierId_idx" ON "FraiseLocationModulation"("dossierId");

-- CreateIndex
CREATE INDEX "FraiseLocationModulation_saisonalite_idx" ON "FraiseLocationModulation"("saisonalite");

-- CreateIndex
CREATE UNIQUE INDEX "FraiseLocationModulation_dossierId_dureeMinJours_saisonalite_typeVehicule_key" ON "FraiseLocationModulation"("dossierId", "dureeMinJours", "saisonalite", "typeVehicule");
