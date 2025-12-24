-- AlterTable
ALTER TABLE "Ligne" ADD COLUMN     "departLimite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "estScolaire" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "estSpecial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "serviceLimite" BOOLEAN NOT NULL DEFAULT false;
