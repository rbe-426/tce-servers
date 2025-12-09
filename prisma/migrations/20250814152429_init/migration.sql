-- CreateTable
CREATE TABLE "Vehicle" (
    "parc" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "modele" TEXT NOT NULL,
    "immat" TEXT NOT NULL,
    "km" INTEGER NOT NULL,
    "tauxSante" INTEGER NOT NULL,
    "statut" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
