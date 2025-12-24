-- CreateTable
CREATE TABLE "EmployeRole" (
    "id" TEXT NOT NULL,
    "employeId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateFin" TIMESTAMP(3),
    "depotId" TEXT,
    "isActif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonnelStats" (
    "id" TEXT NOT NULL,
    "depotId" TEXT NOT NULL,
    "directorCount" INTEGER NOT NULL DEFAULT 0,
    "responsableCount" INTEGER NOT NULL DEFAULT 0,
    "regulatorCount" INTEGER NOT NULL DEFAULT 0,
    "insurerCount" INTEGER NOT NULL DEFAULT 0,
    "driverCount" INTEGER NOT NULL DEFAULT 0,
    "totalPersonnel" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonnelStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleMercato" (
    "id" TEXT NOT NULL,
    "vehicleParc" TEXT NOT NULL,
    "depotSourceId" TEXT NOT NULL,
    "depotDestinationId" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "dateProposee" TIMESTAMP(3) NOT NULL,
    "dateTransport" TIMESTAMP(3),
    "motif" TEXT,
    "notes" TEXT,
    "approveParId" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleMercato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleNeed" (
    "id" TEXT NOT NULL,
    "depotId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3),
    "nombreNeeded" INTEGER NOT NULL,
    "nombreActuel" INTEGER NOT NULL DEFAULT 0,
    "raison" TEXT,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleNeed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterDepotAuthorization" (
    "id" TEXT NOT NULL,
    "ligneId" TEXT NOT NULL,
    "depotSourceId" TEXT NOT NULL,
    "depotExploitantId" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'ACTIVE',
    "canTakeOver" BOOLEAN NOT NULL DEFAULT true,
    "maxCourses" INTEGER,
    "periodicite" TEXT NOT NULL DEFAULT 'PERMANENT',
    "dateDebut" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateFin" TIMESTAMP(3),
    "conditions" TEXT,
    "notes" TEXT,
    "approuvePar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterDepotAuthorization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterDepotServiceTransfer" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "authorizationId" TEXT NOT NULL,
    "depotOrigineId" TEXT NOT NULL,
    "depotExecutionId" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'TRANSFERÉ',
    "raison" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterDepotServiceTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmployeRole_employeId_role_isActif_idx" ON "EmployeRole"("employeId", "role", "isActif");

-- CreateIndex
CREATE INDEX "EmployeRole_depotId_idx" ON "EmployeRole"("depotId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonnelStats_depotId_key" ON "PersonnelStats"("depotId");

-- CreateIndex
CREATE INDEX "PersonnelStats_depotId_idx" ON "PersonnelStats"("depotId");

-- CreateIndex
CREATE INDEX "VehicleMercato_vehicleParc_idx" ON "VehicleMercato"("vehicleParc");

-- CreateIndex
CREATE INDEX "VehicleMercato_depotSourceId_statut_idx" ON "VehicleMercato"("depotSourceId", "statut");

-- CreateIndex
CREATE INDEX "VehicleMercato_depotDestinationId_statut_idx" ON "VehicleMercato"("depotDestinationId", "statut");

-- CreateIndex
CREATE INDEX "VehicleMercato_statut_idx" ON "VehicleMercato"("statut");

-- CreateIndex
CREATE INDEX "VehicleNeed_depotId_type_dateDebut_idx" ON "VehicleNeed"("depotId", "type", "dateDebut");

-- CreateIndex
CREATE INDEX "VehicleNeed_isCritical_idx" ON "VehicleNeed"("isCritical");

-- CreateIndex
CREATE INDEX "InterDepotAuthorization_ligneId_idx" ON "InterDepotAuthorization"("ligneId");

-- CreateIndex
CREATE INDEX "InterDepotAuthorization_depotSourceId_idx" ON "InterDepotAuthorization"("depotSourceId");

-- CreateIndex
CREATE INDEX "InterDepotAuthorization_depotExploitantId_idx" ON "InterDepotAuthorization"("depotExploitantId");

-- CreateIndex
CREATE INDEX "InterDepotAuthorization_statut_idx" ON "InterDepotAuthorization"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "InterDepotAuthorization_ligneId_depotSourceId_depotExploita_key" ON "InterDepotAuthorization"("ligneId", "depotSourceId", "depotExploitantId");

-- CreateIndex
CREATE INDEX "InterDepotServiceTransfer_serviceId_idx" ON "InterDepotServiceTransfer"("serviceId");

-- CreateIndex
CREATE INDEX "InterDepotServiceTransfer_authorizationId_idx" ON "InterDepotServiceTransfer"("authorizationId");

-- CreateIndex
CREATE INDEX "InterDepotServiceTransfer_depotOrigineId_idx" ON "InterDepotServiceTransfer"("depotOrigineId");

-- CreateIndex
CREATE INDEX "InterDepotServiceTransfer_depotExecutionId_idx" ON "InterDepotServiceTransfer"("depotExecutionId");

-- CreateIndex
CREATE INDEX "InterDepotServiceTransfer_statut_idx" ON "InterDepotServiceTransfer"("statut");

-- AddForeignKey
ALTER TABLE "EmployeRole" ADD CONSTRAINT "EmployeRole_employeId_fkey" FOREIGN KEY ("employeId") REFERENCES "Employe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeRole" ADD CONSTRAINT "EmployeRole_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "Etablissement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonnelStats" ADD CONSTRAINT "PersonnelStats_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "Etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleMercato" ADD CONSTRAINT "VehicleMercato_vehicleParc_fkey" FOREIGN KEY ("vehicleParc") REFERENCES "Vehicle"("parc") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleMercato" ADD CONSTRAINT "VehicleMercato_depotSourceId_fkey" FOREIGN KEY ("depotSourceId") REFERENCES "Etablissement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleMercato" ADD CONSTRAINT "VehicleMercato_depotDestinationId_fkey" FOREIGN KEY ("depotDestinationId") REFERENCES "Etablissement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleNeed" ADD CONSTRAINT "VehicleNeed_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "Etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterDepotAuthorization" ADD CONSTRAINT "InterDepotAuthorization_ligneId_fkey" FOREIGN KEY ("ligneId") REFERENCES "Ligne"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterDepotAuthorization" ADD CONSTRAINT "InterDepotAuthorization_depotSourceId_fkey" FOREIGN KEY ("depotSourceId") REFERENCES "Etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterDepotAuthorization" ADD CONSTRAINT "InterDepotAuthorization_depotExploitantId_fkey" FOREIGN KEY ("depotExploitantId") REFERENCES "Etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterDepotServiceTransfer" ADD CONSTRAINT "InterDepotServiceTransfer_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterDepotServiceTransfer" ADD CONSTRAINT "InterDepotServiceTransfer_authorizationId_fkey" FOREIGN KEY ("authorizationId") REFERENCES "InterDepotAuthorization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterDepotServiceTransfer" ADD CONSTRAINT "InterDepotServiceTransfer_depotOrigineId_fkey" FOREIGN KEY ("depotOrigineId") REFERENCES "Etablissement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterDepotServiceTransfer" ADD CONSTRAINT "InterDepotServiceTransfer_depotExecutionId_fkey" FOREIGN KEY ("depotExecutionId") REFERENCES "Etablissement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
