-- CreateTable
CREATE TABLE "FraiseClient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "adresse" TEXT,
    "codePostal" TEXT,
    "ville" TEXT,
    "pays" TEXT NOT NULL DEFAULT 'France',
    "siret" TEXT,
    "typeClient" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'Actif',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FraiseDossier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'Ouvert',
    "dateCreation" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateEcheance" DATETIME,
    "dateClosing" DATETIME,
    "montantTotal" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FraiseDossier_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "FraiseClient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FraiseDemande" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dossierId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'Brouillon',
    "montant" REAL NOT NULL,
    "dateCreation" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateEnvoi" DATETIME,
    "dateExpiration" DATETIME,
    "contenuJson" TEXT,
    "pieceJointeUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FraiseDemande_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "FraiseDossier" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FraiseVehicule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dossierId" TEXT NOT NULL,
    "immatriculation" TEXT NOT NULL,
    "marque" TEXT NOT NULL,
    "modele" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "kilometre" INTEGER NOT NULL,
    "vin" TEXT,
    "carburant" TEXT NOT NULL,
    "boite" TEXT NOT NULL,
    "couleur" TEXT,
    "etat" TEXT NOT NULL DEFAULT 'Bon',
    "prixAchat" REAL,
    "prixVente" REAL,
    "statut" TEXT NOT NULL DEFAULT 'En attente',
    "photosJson" TEXT,
    "documentsJson" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FraiseVehicule_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "FraiseDossier" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FraiseTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dossierId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "demandeId" TEXT,
    "type" TEXT NOT NULL,
    "montant" REAL NOT NULL,
    "devise" TEXT NOT NULL DEFAULT 'EUR',
    "statut" TEXT NOT NULL DEFAULT 'En attente',
    "methode" TEXT,
    "reference" TEXT,
    "dateTransaction" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FraiseTransaction_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "FraiseDossier" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FraiseTransaction_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "FraiseClient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FraiseTransaction_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "FraiseDemande" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "FraiseClient_email_key" ON "FraiseClient"("email");

-- CreateIndex
CREATE INDEX "FraiseClient_email_statut_idx" ON "FraiseClient"("email", "statut");

-- CreateIndex
CREATE INDEX "FraiseClient_typeClient_idx" ON "FraiseClient"("typeClient");

-- CreateIndex
CREATE UNIQUE INDEX "FraiseDossier_numero_key" ON "FraiseDossier"("numero");

-- CreateIndex
CREATE INDEX "FraiseDossier_clientId_statut_idx" ON "FraiseDossier"("clientId", "statut");

-- CreateIndex
CREATE INDEX "FraiseDossier_numero_idx" ON "FraiseDossier"("numero");

-- CreateIndex
CREATE INDEX "FraiseDossier_type_statut_idx" ON "FraiseDossier"("type", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "FraiseDemande_reference_key" ON "FraiseDemande"("reference");

-- CreateIndex
CREATE INDEX "FraiseDemande_dossierId_statut_idx" ON "FraiseDemande"("dossierId", "statut");

-- CreateIndex
CREATE INDEX "FraiseDemande_reference_idx" ON "FraiseDemande"("reference");

-- CreateIndex
CREATE INDEX "FraiseDemande_type_idx" ON "FraiseDemande"("type");

-- CreateIndex
CREATE INDEX "FraiseVehicule_dossierId_statut_idx" ON "FraiseVehicule"("dossierId", "statut");

-- CreateIndex
CREATE INDEX "FraiseVehicule_immatriculation_idx" ON "FraiseVehicule"("immatriculation");

-- CreateIndex
CREATE INDEX "FraiseVehicule_marque_modele_idx" ON "FraiseVehicule"("marque", "modele");

-- CreateIndex
CREATE INDEX "FraiseTransaction_dossierId_statut_idx" ON "FraiseTransaction"("dossierId", "statut");

-- CreateIndex
CREATE INDEX "FraiseTransaction_clientId_idx" ON "FraiseTransaction"("clientId");

-- CreateIndex
CREATE INDEX "FraiseTransaction_type_idx" ON "FraiseTransaction"("type");
