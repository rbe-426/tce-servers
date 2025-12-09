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

-- CreateIndex
CREATE INDEX "VehicleStateHistory_vehicleParc_changedAt_idx" ON "VehicleStateHistory"("vehicleParc", "changedAt");

-- CreateIndex
CREATE INDEX "Intervention_vehicleParc_statut_idx" ON "Intervention"("vehicleParc", "statut");
