-- AlterTable
ALTER TABLE "Mercato" ALTER COLUMN "dateProposee" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ImmobilisationRequest" (
    "id" TEXT NOT NULL,
    "vehicleParc" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3),
    "dateCreated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateApproved" TIMESTAMP(3),
    "motif" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "raison_rejet" TEXT,
    "demandeurPoste" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImmobilisationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImmobilisationRequest_vehicleParc_idx" ON "ImmobilisationRequest"("vehicleParc");

-- CreateIndex
CREATE INDEX "ImmobilisationRequest_createdById_idx" ON "ImmobilisationRequest"("createdById");

-- CreateIndex
CREATE INDEX "ImmobilisationRequest_statut_dateDebut_idx" ON "ImmobilisationRequest"("statut", "dateDebut");

-- CreateIndex
CREATE INDEX "ImmobilisationRequest_dateDebut_dateFin_idx" ON "ImmobilisationRequest"("dateDebut", "dateFin");

-- AddForeignKey
ALTER TABLE "ImmobilisationRequest" ADD CONSTRAINT "ImmobilisationRequest_vehicleParc_fkey" FOREIGN KEY ("vehicleParc") REFERENCES "Vehicle"("parc") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImmobilisationRequest" ADD CONSTRAINT "ImmobilisationRequest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Employe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImmobilisationRequest" ADD CONSTRAINT "ImmobilisationRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "Employe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
