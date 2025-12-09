-- CreateTable
CREATE TABLE "Conducteur" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "matricule" TEXT NOT NULL,
    "permis" TEXT NOT NULL,
    "embauche" DATETIME NOT NULL,
    "statut" TEXT NOT NULL,
    "typeContrat" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "busArticules" BOOLEAN NOT NULL DEFAULT false,
    "autocars" BOOLEAN NOT NULL DEFAULT false,
    "pmr" BOOLEAN NOT NULL DEFAULT false,
    "vehiMarchandises" BOOLEAN NOT NULL DEFAULT false,
    "carteChronosJson" TEXT,
    "fcoJson" TEXT,
    "securiteJson" TEXT,
    "visiteMedicaleJson" TEXT,
    "vaccinationsJson" TEXT,
    "heuresMax" INTEGER NOT NULL DEFAULT 35,
    "heuresReglementaires" INTEGER NOT NULL DEFAULT 35,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Ligne" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "typesVehicules" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'Actif',
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ligneId" TEXT NOT NULL,
    "conducteurId" TEXT,
    "date" DATETIME NOT NULL,
    "heureDebut" TEXT NOT NULL,
    "heureFin" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'Planifiée',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Service_ligneId_fkey" FOREIGN KEY ("ligneId") REFERENCES "Ligne" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Service_conducteurId_fkey" FOREIGN KEY ("conducteurId") REFERENCES "Conducteur" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Pointage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceId" TEXT NOT NULL,
    "conducteurId" TEXT NOT NULL,
    "validatedBy" TEXT NOT NULL,
    "validatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vehicleType" TEXT,
    "permisChecked" BOOLEAN NOT NULL DEFAULT false,
    "chronometerChecked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pointage_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Pointage_conducteurId_fkey" FOREIGN KEY ("conducteurId") REFERENCES "Conducteur" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Conducteur_matricule_key" ON "Conducteur"("matricule");

-- CreateIndex
CREATE INDEX "Conducteur_matricule_statut_idx" ON "Conducteur"("matricule", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "Ligne_numero_key" ON "Ligne"("numero");

-- CreateIndex
CREATE INDEX "Ligne_numero_statut_idx" ON "Ligne"("numero", "statut");

-- CreateIndex
CREATE INDEX "Service_ligneId_date_statut_idx" ON "Service"("ligneId", "date", "statut");

-- CreateIndex
CREATE INDEX "Service_conducteurId_idx" ON "Service"("conducteurId");

-- CreateIndex
CREATE INDEX "Pointage_serviceId_validatedAt_idx" ON "Pointage"("serviceId", "validatedAt");

-- CreateIndex
CREATE INDEX "Pointage_conducteurId_idx" ON "Pointage"("conducteurId");
