-- CreateTable
CREATE TABLE "Trajet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ligneId" TEXT NOT NULL,
    "sensId" TEXT,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 1,
    "statut" TEXT NOT NULL DEFAULT 'Actif',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Trajet_ligneId_fkey" FOREIGN KEY ("ligneId") REFERENCES "Ligne" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Arret" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trajetId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "adresse" TEXT,
    "ordre" INTEGER NOT NULL,
    "tempsArriveeAntecedent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Arret_trajetId_fkey" FOREIGN KEY ("trajetId") REFERENCES "Trajet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Trajet_ligneId_statut_idx" ON "Trajet"("ligneId", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "Trajet_ligneId_nom_key" ON "Trajet"("ligneId", "nom");

-- CreateIndex
CREATE INDEX "Arret_trajetId_ordre_idx" ON "Arret"("trajetId", "ordre");

-- CreateIndex
CREATE UNIQUE INDEX "Arret_trajetId_ordre_key" ON "Arret"("trajetId", "ordre");
