-- CreateTable
CREATE TABLE "Employe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT,
    "telephone" TEXT,
    "poste" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'Actif',
    "dateEmbauche" DATETIME NOT NULL,
    "dateDepart" DATETIME,
    "salaire" REAL,
    "matricule" TEXT,
    "permis" TEXT,
    "typeContrat" TEXT,
    "certificationsJson" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Employe_email_key" ON "Employe"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Employe_matricule_key" ON "Employe"("matricule");

-- CreateIndex
CREATE INDEX "Employe_poste_statut_idx" ON "Employe"("poste", "statut");

-- CreateIndex
CREATE INDEX "Employe_email_idx" ON "Employe"("email");
