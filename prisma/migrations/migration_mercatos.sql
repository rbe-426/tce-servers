-- AddEmployeRoles
ALTER TABLE "Employe" ADD COLUMN "establishmentId" TEXT;
ALTER TABLE "Employe" ADD CONSTRAINT "Employe_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE SET NULL;

-- CreateEmployeRole
CREATE TABLE "EmployeRole" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "employeId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "dateDebut" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dateFin" DATETIME,
  "depotId" TEXT,
  "isActif" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "EmployeRole_employeId_fkey" FOREIGN KEY ("employeId") REFERENCES "Employe" ("id") ON DELETE CASCADE,
  CONSTRAINT "EmployeRole_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "Etablissement" ("id") ON DELETE SET NULL
);

-- CreatePersonnelStats
CREATE TABLE "PersonnelStats" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "depotId" TEXT NOT NULL UNIQUE,
  "directorCount" INTEGER NOT NULL DEFAULT 0,
  "responsableCount" INTEGER NOT NULL DEFAULT 0,
  "regulatorCount" INTEGER NOT NULL DEFAULT 0,
  "insurerCount" INTEGER NOT NULL DEFAULT 0,
  "driverCount" INTEGER NOT NULL DEFAULT 0,
  "totalPersonnel" INTEGER NOT NULL DEFAULT 0,
  "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PersonnelStats_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "Etablissement" ("id") ON DELETE CASCADE
);

-- CreateVehicleMercato
CREATE TABLE "VehicleMercato" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "vehicleParc" TEXT NOT NULL,
  "depotSourceId" TEXT NOT NULL,
  "depotDestinationId" TEXT NOT NULL,
  "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
  "dateProposee" DATETIME NOT NULL,
  "dateTransport" DATETIME,
  "motif" TEXT,
  "notes" TEXT,
  "approveParId" TEXT,
  "rejectionReason" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "VehicleMercato_vehicleParc_fkey" FOREIGN KEY ("vehicleParc") REFERENCES "Vehicle" ("parc") ON DELETE CASCADE,
  CONSTRAINT "VehicleMercato_depotSourceId_fkey" FOREIGN KEY ("depotSourceId") REFERENCES "Etablissement" ("id") ON DELETE RESTRICT,
  CONSTRAINT "VehicleMercato_depotDestinationId_fkey" FOREIGN KEY ("depotDestinationId") REFERENCES "Etablissement" ("id") ON DELETE RESTRICT
);

-- CreateVehicleNeed
CREATE TABLE "VehicleNeed" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "depotId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "dateDebut" DATETIME NOT NULL,
  "dateFin" DATETIME,
  "nombreNeeded" INTEGER NOT NULL,
  "nombreActuel" INTEGER NOT NULL DEFAULT 0,
  "raison" TEXT,
  "isCritical" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "VehicleNeed_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "Etablissement" ("id") ON DELETE CASCADE
);

-- CreateInterDepotAuthorization
CREATE TABLE "InterDepotAuthorization" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ligneId" TEXT NOT NULL,
  "depotSourceId" TEXT NOT NULL,
  "depotExploitantId" TEXT NOT NULL,
  "statut" TEXT NOT NULL DEFAULT 'ACTIVE',
  "canTakeOver" BOOLEAN NOT NULL DEFAULT true,
  "maxCourses" INTEGER,
  "periodicite" TEXT NOT NULL DEFAULT 'PERMANENT',
  "dateDebut" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dateFin" DATETIME,
  "conditions" TEXT,
  "notes" TEXT,
  "approuvePar" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "InterDepotAuthorization_ligneId_fkey" FOREIGN KEY ("ligneId") REFERENCES "Ligne" ("id") ON DELETE CASCADE,
  CONSTRAINT "InterDepotAuthorization_depotSourceId_fkey" FOREIGN KEY ("depotSourceId") REFERENCES "Etablissement" ("id") ON DELETE CASCADE,
  CONSTRAINT "InterDepotAuthorization_depotExploitantId_fkey" FOREIGN KEY ("depotExploitantId") REFERENCES "Etablissement" ("id") ON DELETE CASCADE
);

-- CreateInterDepotServiceTransfer
CREATE TABLE "InterDepotServiceTransfer" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "serviceId" TEXT NOT NULL,
  "authorizationId" TEXT NOT NULL,
  "depotOrigineId" TEXT NOT NULL,
  "depotExecutionId" TEXT NOT NULL,
  "statut" TEXT NOT NULL DEFAULT 'TRANSFERÉ',
  "raison" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "InterDepotServiceTransfer_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE CASCADE,
  CONSTRAINT "InterDepotServiceTransfer_authorizationId_fkey" FOREIGN KEY ("authorizationId") REFERENCES "InterDepotAuthorization" ("id") ON DELETE RESTRICT,
  CONSTRAINT "InterDepotServiceTransfer_depotOrigineId_fkey" FOREIGN KEY ("depotOrigineId") REFERENCES "Etablissement" ("id") ON DELETE RESTRICT,
  CONSTRAINT "InterDepotServiceTransfer_depotExecutionId_fkey" FOREIGN KEY ("depotExecutionId") REFERENCES "Etablissement" ("id") ON DELETE RESTRICT
);

-- CreateIndex EmployeRole
CREATE INDEX "EmployeRole_employeId_role_isActif_idx" ON "EmployeRole"("employeId", "role", "isActif");
CREATE INDEX "EmployeRole_depotId_idx" ON "EmployeRole"("depotId");

-- CreateIndex PersonnelStats
CREATE INDEX "PersonnelStats_depotId_idx" ON "PersonnelStats"("depotId");

-- CreateIndex VehicleMercato
CREATE INDEX "VehicleMercato_vehicleParc_idx" ON "VehicleMercato"("vehicleParc");
CREATE INDEX "VehicleMercato_depotSourceId_statut_idx" ON "VehicleMercato"("depotSourceId", "statut");
CREATE INDEX "VehicleMercato_depotDestinationId_statut_idx" ON "VehicleMercato"("depotDestinationId", "statut");
CREATE INDEX "VehicleMercato_statut_idx" ON "VehicleMercato"("statut");

-- CreateIndex VehicleNeed
CREATE INDEX "VehicleNeed_depotId_type_dateDebut_idx" ON "VehicleNeed"("depotId", "type", "dateDebut");
CREATE INDEX "VehicleNeed_isCritical_idx" ON "VehicleNeed"("isCritical");

-- CreateIndex InterDepotAuthorization
CREATE UNIQUE INDEX "InterDepotAuthorization_ligneId_depotSourceId_depotExploitantId_key" ON "InterDepotAuthorization"("ligneId", "depotSourceId", "depotExploitantId");
CREATE INDEX "InterDepotAuthorization_ligneId_idx" ON "InterDepotAuthorization"("ligneId");
CREATE INDEX "InterDepotAuthorization_depotSourceId_idx" ON "InterDepotAuthorization"("depotSourceId");
CREATE INDEX "InterDepotAuthorization_depotExploitantId_idx" ON "InterDepotAuthorization"("depotExploitantId");
CREATE INDEX "InterDepotAuthorization_statut_idx" ON "InterDepotAuthorization"("statut");

-- CreateIndex InterDepotServiceTransfer
CREATE INDEX "InterDepotServiceTransfer_serviceId_idx" ON "InterDepotServiceTransfer"("serviceId");
CREATE INDEX "InterDepotServiceTransfer_authorizationId_idx" ON "InterDepotServiceTransfer"("authorizationId");
CREATE INDEX "InterDepotServiceTransfer_depotOrigineId_idx" ON "InterDepotServiceTransfer"("depotOrigineId");
CREATE INDEX "InterDepotServiceTransfer_depotExecutionId_idx" ON "InterDepotServiceTransfer"("depotExecutionId");
CREATE INDEX "InterDepotServiceTransfer_statut_idx" ON "InterDepotServiceTransfer"("statut");

-- Add columns to existing tables
ALTER TABLE "Etablissement" ADD COLUMN "mercatoSourceId" TEXT;
ALTER TABLE "Etablissement" ADD COLUMN "mercatoDestinationId" TEXT;

-- Add unique constraint for InterDepotAuthorization
CREATE UNIQUE INDEX "InterDepotAuthorization_ligneId_depotSourceId_depotExploitantId_unique" ON "InterDepotAuthorization"("ligneId", "depotSourceId", "depotExploitantId");

