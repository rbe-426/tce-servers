-- CreateTable
CREATE TABLE "FraiseInteraction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'Complétée',
    "resultat" TEXT,
    "dateInteraction" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateProchaineSuite" DATETIME,
    "responsable" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FraiseInteraction_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "FraiseClient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FraiseClientToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "motDePasse" TEXT,
    "typeAcces" TEXT NOT NULL DEFAULT 'LECTURE',
    "dateExpiration" DATETIME,
    "dateLastUsed" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FraiseClientToken_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "FraiseClient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FraiseBudget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dossierId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "montantHT" REAL NOT NULL DEFAULT 0,
    "montantTVA" REAL NOT NULL DEFAULT 0,
    "montantTTC" REAL NOT NULL DEFAULT 0,
    "statut" TEXT NOT NULL DEFAULT 'Brouillon',
    "dateCreation" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateValidite" DATETIME,
    "dateAcceptation" DATETIME,
    "lignesJson" TEXT,
    "conditions" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FraiseBudget_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "FraiseDossier" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FraiseDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dossierId" TEXT,
    "clientId" TEXT,
    "titre" TEXT NOT NULL,
    "typeDocument" TEXT NOT NULL,
    "urlDocument" TEXT,
    "nomFichier" TEXT,
    "mimeType" TEXT,
    "dateDocument" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FraiseDocument_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "FraiseDossier" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FraiseDocument_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "FraiseClient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FraiseAudit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dossierId" TEXT,
    "clientId" TEXT,
    "entite" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "ancienneValeur" TEXT,
    "nouvelleValeur" TEXT,
    "utilisateur" TEXT,
    "raison" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "FraiseInteraction_clientId_dateInteraction_idx" ON "FraiseInteraction"("clientId", "dateInteraction");

-- CreateIndex
CREATE INDEX "FraiseInteraction_type_statut_idx" ON "FraiseInteraction"("type", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "FraiseClientToken_token_key" ON "FraiseClientToken"("token");

-- CreateIndex
CREATE INDEX "FraiseClientToken_clientId_idx" ON "FraiseClientToken"("clientId");

-- CreateIndex
CREATE INDEX "FraiseClientToken_token_idx" ON "FraiseClientToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "FraiseBudget_reference_key" ON "FraiseBudget"("reference");

-- CreateIndex
CREATE INDEX "FraiseBudget_dossierId_statut_idx" ON "FraiseBudget"("dossierId", "statut");

-- CreateIndex
CREATE INDEX "FraiseBudget_reference_idx" ON "FraiseBudget"("reference");

-- CreateIndex
CREATE INDEX "FraiseDocument_dossierId_idx" ON "FraiseDocument"("dossierId");

-- CreateIndex
CREATE INDEX "FraiseDocument_clientId_idx" ON "FraiseDocument"("clientId");

-- CreateIndex
CREATE INDEX "FraiseDocument_typeDocument_idx" ON "FraiseDocument"("typeDocument");

-- CreateIndex
CREATE INDEX "FraiseAudit_dossierId_idx" ON "FraiseAudit"("dossierId");

-- CreateIndex
CREATE INDEX "FraiseAudit_clientId_idx" ON "FraiseAudit"("clientId");

-- CreateIndex
CREATE INDEX "FraiseAudit_entite_action_idx" ON "FraiseAudit"("entite", "action");
