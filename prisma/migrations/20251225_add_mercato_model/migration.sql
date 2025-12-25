-- CreateTable Mercato (modèle générique pour tous les types de mercatos)
CREATE TABLE "Mercato" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL DEFAULT 'VEHICULE', -- VEHICULE, LIGNE, PERSONNEL
    
    -- Relations génériques
    "vehicleId" TEXT,
    "ligneId" TEXT,
    "agentId" TEXT,
    "depotSourceId" TEXT,
    "depotDestinationId" TEXT NOT NULL,
    
    -- Données communes
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE', -- EN_ATTENTE, APPROUVÉ, REJETÉ
    "description" TEXT,
    "dateProposee" DATETIME NOT NULL,
    "dateProposeeBy" TEXT,
    "rejectionReason" TEXT,
    
    -- Timestamps
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    
    CONSTRAINT "Mercato_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("parc") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Mercato_ligneId_fkey" FOREIGN KEY ("ligneId") REFERENCES "Ligne" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Mercato_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Employe" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Mercato_depotSourceId_fkey" FOREIGN KEY ("depotSourceId") REFERENCES "Etablissement" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Mercato_depotDestinationId_fkey" FOREIGN KEY ("depotDestinationId") REFERENCES "Etablissement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Mercato_type_statut_idx" ON "Mercato"("type", "statut");
CREATE INDEX "Mercato_depotSourceId_statut_idx" ON "Mercato"("depotSourceId", "statut");
CREATE INDEX "Mercato_depotDestinationId_statut_idx" ON "Mercato"("depotDestinationId", "statut");
CREATE INDEX "Mercato_statut_idx" ON "Mercato"("statut");
