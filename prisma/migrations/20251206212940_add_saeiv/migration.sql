-- CreateTable
CREATE TABLE "SAEIV" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'Actif',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "SAEIV_numero_key" ON "SAEIV"("numero");

-- CreateIndex
CREATE INDEX "SAEIV_numero_statut_idx" ON "SAEIV"("numero", "statut");
