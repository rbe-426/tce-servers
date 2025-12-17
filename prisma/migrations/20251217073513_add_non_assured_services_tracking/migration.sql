-- AlterTable
ALTER TABLE "Service" ADD COLUMN "expirationPointage" DATETIME;
ALTER TABLE "Service" ADD COLUMN "motifNonAssurance" TEXT;
ALTER TABLE "Service" ADD COLUMN "motifsDetails" TEXT;

-- CreateIndex
CREATE INDEX "Service_statut_date_idx" ON "Service"("statut", "date");
