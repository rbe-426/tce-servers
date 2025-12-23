/*
  Warnings:

  - You are about to drop the column `depot` on the `Vehicle` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Employe" ADD COLUMN     "etablissementId" TEXT;

-- AlterTable
ALTER TABLE "Ligne" ADD COLUMN     "etablissementId" TEXT;

-- AlterTable
ALTER TABLE "Vehicle" DROP COLUMN "depot",
ADD COLUMN     "etablissementId" TEXT;

-- CreateTable
CREATE TABLE "Etablissement" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "adresse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Etablissement_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Employe" ADD CONSTRAINT "Employe_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ligne" ADD CONSTRAINT "Ligne_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
