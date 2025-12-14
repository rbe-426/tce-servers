-- CreateTable
CREATE TABLE "Vehicle" (
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

-- CreateTable
CREATE TABLE "VehicleStateHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vehicleParc" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "note" TEXT,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VehicleStateHistory_vehicleParc_fkey" FOREIGN KEY ("vehicleParc") REFERENCES "Vehicle" ("parc") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Intervention" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vehicleParc" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "datePrevue" DATETIME,
    "dateEffective" DATETIME,
    "commentaire" TEXT,
    "statut" TEXT NOT NULL,
    CONSTRAINT "Intervention_vehicleParc_fkey" FOREIGN KEY ("vehicleParc") REFERENCES "Vehicle" ("parc") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    "telephone" TEXT,
    "busArticules" BOOLEAN NOT NULL DEFAULT false,
    "autocars" BOOLEAN NOT NULL DEFAULT false,
    "pmr" BOOLEAN NOT NULL DEFAULT false,
    "vehiMarchandises" BOOLEAN NOT NULL DEFAULT false,
    "carteChronosJson" TEXT,
    "fcoJson" TEXT,
    "securiteJson" TEXT,
    "visiteMedicaleJson" TEXT,
    "vaccinationsJson" TEXT,
    "contratJson" TEXT,
    "absencesJson" TEXT,
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
    "heureDebut" TEXT,
    "heureFin" TEXT,
    "calendrierJson" TEXT,
    "contraintes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

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

-- CreateTable
CREATE TABLE "Service" (
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
CREATE INDEX "VehicleStateHistory_vehicleParc_changedAt_idx" ON "VehicleStateHistory"("vehicleParc", "changedAt");

-- CreateIndex
CREATE INDEX "Intervention_vehicleParc_statut_idx" ON "Intervention"("vehicleParc", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "Conducteur_matricule_key" ON "Conducteur"("matricule");

-- CreateIndex
CREATE INDEX "Conducteur_matricule_statut_idx" ON "Conducteur"("matricule", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "Ligne_numero_key" ON "Ligne"("numero");

-- CreateIndex
CREATE INDEX "Ligne_numero_statut_idx" ON "Ligne"("numero", "statut");

-- CreateIndex
CREATE INDEX "Sens_ligneId_statut_idx" ON "Sens"("ligneId", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "Sens_ligneId_nom_key" ON "Sens"("ligneId", "nom");

-- CreateIndex
CREATE INDEX "Service_ligneId_date_statut_idx" ON "Service"("ligneId", "date", "statut");

-- CreateIndex
CREATE INDEX "Service_conducteurId_idx" ON "Service"("conducteurId");

-- CreateIndex
CREATE INDEX "Pointage_serviceId_validatedAt_idx" ON "Pointage"("serviceId", "validatedAt");

-- CreateIndex
CREATE INDEX "Pointage_conducteurId_idx" ON "Pointage"("conducteurId");

-- CreateIndex
CREATE UNIQUE INDEX "SAEIV_numero_key" ON "SAEIV"("numero");

-- CreateIndex
CREATE INDEX "SAEIV_numero_statut_idx" ON "SAEIV"("numero", "statut");

-- CreateIndex
CREATE INDEX "Trajet_ligneId_statut_idx" ON "Trajet"("ligneId", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "Trajet_ligneId_nom_key" ON "Trajet"("ligneId", "nom");

-- CreateIndex
CREATE INDEX "Arret_trajetId_ordre_idx" ON "Arret"("trajetId", "ordre");

-- CreateIndex
CREATE UNIQUE INDEX "Arret_trajetId_ordre_key" ON "Arret"("trajetId", "ordre");
