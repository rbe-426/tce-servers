-- CreateTable
CREATE TABLE "Employe" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT,
    "telephone" TEXT,
    "poste" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'Actif',
    "dateEmbauche" TIMESTAMP(3) NOT NULL,
    "dateDepart" TIMESTAMP(3),
    "salaire" DOUBLE PRECISION,
    "matricule" TEXT,
    "permis" TEXT,
    "typeContrat" TEXT,
    "certificationsJson" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "parc" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "modele" TEXT NOT NULL,
    "immat" TEXT NOT NULL,
    "km" INTEGER NOT NULL,
    "tauxSante" INTEGER NOT NULL,
    "statut" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "annee" INTEGER,
    "boite" TEXT,
    "moteur" TEXT,
    "portes" INTEGER,
    "girouette" TEXT,
    "clim" TEXT,
    "pmr" BOOLEAN NOT NULL DEFAULT false,
    "ct" TIMESTAMP(3),
    "photosJson" TEXT,
    "marque" TEXT,
    "motorisationInfo" TEXT,
    "places" INTEGER,
    "miseEnService" TIMESTAMP(3),
    "derniereRevision" TIMESTAMP(3),
    "depot" TEXT,
    "photoUrl" TEXT,
    "proprete" INTEGER NOT NULL DEFAULT 100,
    "etatTechnique" INTEGER NOT NULL DEFAULT 100,
    "etatInterieur" INTEGER NOT NULL DEFAULT 100,
    "lignesJson" TEXT,
    "optionsUsineJson" TEXT,
    "optionsAtelierJson" TEXT,
    "optionsSaeivJson" TEXT,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("parc")
);

-- CreateTable
CREATE TABLE "VehicleStateHistory" (
    "id" SERIAL NOT NULL,
    "vehicleParc" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "note" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleStateHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Intervention" (
    "id" SERIAL NOT NULL,
    "vehicleParc" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "datePrevue" TIMESTAMP(3),
    "dateEffective" TIMESTAMP(3),
    "commentaire" TEXT,
    "statut" TEXT NOT NULL,

    CONSTRAINT "Intervention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conducteur" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "matricule" TEXT NOT NULL,
    "permis" TEXT NOT NULL,
    "embauche" TIMESTAMP(3) NOT NULL,
    "statut" TEXT NOT NULL,
    "typeContrat" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "telephone" TEXT,
    "busArticules" BOOLEAN NOT NULL DEFAULT false,
    "autocars" BOOLEAN NOT NULL DEFAULT false,
    "pmr" BOOLEAN NOT NULL DEFAULT false,
    "vehiMarchandises" BOOLEAN NOT NULL DEFAULT false,
    "carteChronosJson" TEXT,
    "fcoJson" TEXT,
    "securiteJson" TEXT,
    "visiteMedicaleJson" TEXT,
    "vaccinationsJson" TEXT,
    "contratJson" TEXT,
    "absencesJson" TEXT,
    "heuresMax" INTEGER NOT NULL DEFAULT 35,
    "heuresReglementaires" INTEGER NOT NULL DEFAULT 35,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conducteur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ligne" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "typesVehicules" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'Actif',
    "description" TEXT,
    "heureDebut" TEXT,
    "heureFin" TEXT,
    "calendrierJson" TEXT,
    "demandeChrono" BOOLEAN NOT NULL DEFAULT false,
    "contraintes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ligne_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sens" (
    "id" TEXT NOT NULL,
    "ligneId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "direction" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 1,
    "statut" TEXT NOT NULL DEFAULT 'Actif',
    "jourFonctionnement" TEXT NOT NULL DEFAULT 'SEMAINE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "ligneId" TEXT NOT NULL,
    "sensId" TEXT,
    "conducteurId" TEXT,
    "vehiculeAssigne" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "heureDebut" TEXT NOT NULL,
    "heureFin" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'Planifiée',
    "motifNonAssurance" TEXT,
    "motifsDetails" TEXT,
    "expirationPointage" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pointage" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "conducteurId" TEXT NOT NULL,
    "validatedBy" TEXT NOT NULL,
    "validatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vehicleType" TEXT,
    "permisChecked" BOOLEAN NOT NULL DEFAULT false,
    "chronometerChecked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pointage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SAEIV" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'Actif',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SAEIV_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trajet" (
    "id" TEXT NOT NULL,
    "ligneId" TEXT NOT NULL,
    "sensId" TEXT,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 1,
    "statut" TEXT NOT NULL DEFAULT 'Actif',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trajet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Arret" (
    "id" TEXT NOT NULL,
    "trajetId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "adresse" TEXT,
    "ordre" INTEGER NOT NULL,
    "tempsArriveeAntecedent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Arret_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FraiseClient" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "adresse" TEXT,
    "codePostal" TEXT,
    "ville" TEXT,
    "pays" TEXT NOT NULL DEFAULT 'France',
    "siret" TEXT,
    "typeClient" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'Actif',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FraiseClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FraiseDossier" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'Ouvert',
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateEcheance" TIMESTAMP(3),
    "dateClosing" TIMESTAMP(3),
    "montantTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FraiseDossier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FraiseLocationModulation" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "dureeMinJours" INTEGER NOT NULL DEFAULT 1,
    "dureeMaxJours" INTEGER,
    "typeVehicule" TEXT,
    "saisonalite" TEXT NOT NULL DEFAULT 'ANNEE',
    "prixJournalier" DOUBLE PRECISION NOT NULL,
    "prixHebdo" DOUBLE PRECISION,
    "prixMensuel" DOUBLE PRECISION,
    "caution" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "assuranceIncluse" BOOLEAN NOT NULL DEFAULT true,
    "kmLimite" INTEGER,
    "kmSupplementaire" DOUBLE PRECISION,
    "fraisNettoyage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fraisAssurance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fraisConfirm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remise" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "dateDebut" TIMESTAMP(3),
    "dateFin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FraiseLocationModulation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FraiseDemande" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'Brouillon',
    "montant" DOUBLE PRECISION NOT NULL,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateEnvoi" TIMESTAMP(3),
    "dateExpiration" TIMESTAMP(3),
    "contenuJson" TEXT,
    "pieceJointeUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FraiseDemande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FraiseVehicule" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "immatriculation" TEXT NOT NULL,
    "marque" TEXT NOT NULL,
    "modele" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "kilometre" INTEGER NOT NULL,
    "vin" TEXT,
    "carburant" TEXT NOT NULL,
    "boite" TEXT NOT NULL,
    "couleur" TEXT,
    "etat" TEXT NOT NULL DEFAULT 'Bon',
    "prixAchat" DOUBLE PRECISION,
    "prixVente" DOUBLE PRECISION,
    "statut" TEXT NOT NULL DEFAULT 'En attente',
    "photosJson" TEXT,
    "documentsJson" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FraiseVehicule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FraiseTransaction" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "demandeId" TEXT,
    "type" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "devise" TEXT NOT NULL DEFAULT 'EUR',
    "statut" TEXT NOT NULL DEFAULT 'En attente',
    "methode" TEXT,
    "reference" TEXT,
    "dateTransaction" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FraiseTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FraiseInteraction" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'Complétée',
    "resultat" TEXT,
    "dateInteraction" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateProchaineSuite" TIMESTAMP(3),
    "responsable" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FraiseInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FraiseClientToken" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "motDePasse" TEXT,
    "typeAcces" TEXT NOT NULL DEFAULT 'LECTURE',
    "dateExpiration" TIMESTAMP(3),
    "dateLastUsed" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FraiseClientToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FraiseBudget" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "montantHT" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "montantTVA" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "montantTTC" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "statut" TEXT NOT NULL DEFAULT 'Brouillon',
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateValidite" TIMESTAMP(3),
    "dateAcceptation" TIMESTAMP(3),
    "lignesJson" TEXT,
    "conditions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FraiseBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FraiseDocument" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT,
    "clientId" TEXT,
    "titre" TEXT NOT NULL,
    "typeDocument" TEXT NOT NULL,
    "urlDocument" TEXT,
    "nomFichier" TEXT,
    "mimeType" TEXT,
    "dateDocument" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FraiseDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FraiseAudit" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT,
    "clientId" TEXT,
    "entite" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "ancienneValeur" TEXT,
    "nouvelleValeur" TEXT,
    "utilisateur" TEXT,
    "raison" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FraiseAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employe_email_key" ON "Employe"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Employe_matricule_key" ON "Employe"("matricule");

-- CreateIndex
CREATE INDEX "Employe_poste_statut_idx" ON "Employe"("poste", "statut");

-- CreateIndex
CREATE INDEX "Employe_email_idx" ON "Employe"("email");

-- CreateIndex
CREATE INDEX "VehicleStateHistory_vehicleParc_changedAt_idx" ON "VehicleStateHistory"("vehicleParc", "changedAt");

-- CreateIndex
CREATE INDEX "Intervention_vehicleParc_statut_idx" ON "Intervention"("vehicleParc", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "Conducteur_matricule_key" ON "Conducteur"("matricule");

-- CreateIndex
CREATE INDEX "Conducteur_matricule_statut_idx" ON "Conducteur"("matricule", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "Ligne_numero_key" ON "Ligne"("numero");

-- CreateIndex
CREATE INDEX "Ligne_numero_statut_idx" ON "Ligne"("numero", "statut");

-- CreateIndex
CREATE INDEX "Sens_ligneId_statut_jourFonctionnement_idx" ON "Sens"("ligneId", "statut", "jourFonctionnement");

-- CreateIndex
CREATE UNIQUE INDEX "Sens_ligneId_nom_key" ON "Sens"("ligneId", "nom");

-- CreateIndex
CREATE INDEX "Service_ligneId_date_statut_idx" ON "Service"("ligneId", "date", "statut");

-- CreateIndex
CREATE INDEX "Service_conducteurId_idx" ON "Service"("conducteurId");

-- CreateIndex
CREATE INDEX "Service_statut_date_idx" ON "Service"("statut", "date");

-- CreateIndex
CREATE INDEX "Pointage_serviceId_validatedAt_idx" ON "Pointage"("serviceId", "validatedAt");

-- CreateIndex
CREATE INDEX "Pointage_conducteurId_idx" ON "Pointage"("conducteurId");

-- CreateIndex
CREATE UNIQUE INDEX "SAEIV_numero_key" ON "SAEIV"("numero");

-- CreateIndex
CREATE INDEX "SAEIV_numero_statut_idx" ON "SAEIV"("numero", "statut");

-- CreateIndex
CREATE INDEX "Trajet_ligneId_statut_idx" ON "Trajet"("ligneId", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "Trajet_ligneId_nom_key" ON "Trajet"("ligneId", "nom");

-- CreateIndex
CREATE INDEX "Arret_trajetId_ordre_idx" ON "Arret"("trajetId", "ordre");

-- CreateIndex
CREATE UNIQUE INDEX "Arret_trajetId_ordre_key" ON "Arret"("trajetId", "ordre");

-- CreateIndex
CREATE UNIQUE INDEX "FraiseClient_email_key" ON "FraiseClient"("email");

-- CreateIndex
CREATE INDEX "FraiseClient_email_statut_idx" ON "FraiseClient"("email", "statut");

-- CreateIndex
CREATE INDEX "FraiseClient_typeClient_idx" ON "FraiseClient"("typeClient");

-- CreateIndex
CREATE UNIQUE INDEX "FraiseDossier_numero_key" ON "FraiseDossier"("numero");

-- CreateIndex
CREATE INDEX "FraiseDossier_clientId_statut_idx" ON "FraiseDossier"("clientId", "statut");

-- CreateIndex
CREATE INDEX "FraiseDossier_numero_idx" ON "FraiseDossier"("numero");

-- CreateIndex
CREATE INDEX "FraiseDossier_type_statut_idx" ON "FraiseDossier"("type", "statut");

-- CreateIndex
CREATE INDEX "FraiseLocationModulation_dossierId_idx" ON "FraiseLocationModulation"("dossierId");

-- CreateIndex
CREATE INDEX "FraiseLocationModulation_saisonalite_idx" ON "FraiseLocationModulation"("saisonalite");

-- CreateIndex
CREATE UNIQUE INDEX "FraiseLocationModulation_dossierId_dureeMinJours_saisonalit_key" ON "FraiseLocationModulation"("dossierId", "dureeMinJours", "saisonalite", "typeVehicule");

-- CreateIndex
CREATE UNIQUE INDEX "FraiseDemande_reference_key" ON "FraiseDemande"("reference");

-- CreateIndex
CREATE INDEX "FraiseDemande_dossierId_statut_idx" ON "FraiseDemande"("dossierId", "statut");

-- CreateIndex
CREATE INDEX "FraiseDemande_reference_idx" ON "FraiseDemande"("reference");

-- CreateIndex
CREATE INDEX "FraiseDemande_type_idx" ON "FraiseDemande"("type");

-- CreateIndex
CREATE INDEX "FraiseVehicule_dossierId_statut_idx" ON "FraiseVehicule"("dossierId", "statut");

-- CreateIndex
CREATE INDEX "FraiseVehicule_immatriculation_idx" ON "FraiseVehicule"("immatriculation");

-- CreateIndex
CREATE INDEX "FraiseVehicule_marque_modele_idx" ON "FraiseVehicule"("marque", "modele");

-- CreateIndex
CREATE INDEX "FraiseTransaction_dossierId_statut_idx" ON "FraiseTransaction"("dossierId", "statut");

-- CreateIndex
CREATE INDEX "FraiseTransaction_clientId_idx" ON "FraiseTransaction"("clientId");

-- CreateIndex
CREATE INDEX "FraiseTransaction_type_idx" ON "FraiseTransaction"("type");

-- CreateIndex
CREATE INDEX "FraiseInteraction_clientId_dateInteraction_idx" ON "FraiseInteraction"("clientId", "dateInteraction");

-- CreateIndex
CREATE INDEX "FraiseInteraction_type_statut_idx" ON "FraiseInteraction"("type", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "FraiseClientToken_token_key" ON "FraiseClientToken"("token");

-- CreateIndex
CREATE INDEX "FraiseClientToken_clientId_idx" ON "FraiseClientToken"("clientId");

-- CreateIndex
CREATE INDEX "FraiseClientToken_token_idx" ON "FraiseClientToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "FraiseBudget_reference_key" ON "FraiseBudget"("reference");

-- CreateIndex
CREATE INDEX "FraiseBudget_dossierId_statut_idx" ON "FraiseBudget"("dossierId", "statut");

-- CreateIndex
CREATE INDEX "FraiseBudget_reference_idx" ON "FraiseBudget"("reference");

-- CreateIndex
CREATE INDEX "FraiseDocument_dossierId_idx" ON "FraiseDocument"("dossierId");

-- CreateIndex
CREATE INDEX "FraiseDocument_clientId_idx" ON "FraiseDocument"("clientId");

-- CreateIndex
CREATE INDEX "FraiseDocument_typeDocument_idx" ON "FraiseDocument"("typeDocument");

-- CreateIndex
CREATE INDEX "FraiseAudit_dossierId_idx" ON "FraiseAudit"("dossierId");

-- CreateIndex
CREATE INDEX "FraiseAudit_clientId_idx" ON "FraiseAudit"("clientId");

-- CreateIndex
CREATE INDEX "FraiseAudit_entite_action_idx" ON "FraiseAudit"("entite", "action");

-- AddForeignKey
ALTER TABLE "VehicleStateHistory" ADD CONSTRAINT "VehicleStateHistory_vehicleParc_fkey" FOREIGN KEY ("vehicleParc") REFERENCES "Vehicle"("parc") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_vehicleParc_fkey" FOREIGN KEY ("vehicleParc") REFERENCES "Vehicle"("parc") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sens" ADD CONSTRAINT "Sens_ligneId_fkey" FOREIGN KEY ("ligneId") REFERENCES "Ligne"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_ligneId_fkey" FOREIGN KEY ("ligneId") REFERENCES "Ligne"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_sensId_fkey" FOREIGN KEY ("sensId") REFERENCES "Sens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_conducteurId_fkey" FOREIGN KEY ("conducteurId") REFERENCES "Conducteur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pointage" ADD CONSTRAINT "Pointage_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pointage" ADD CONSTRAINT "Pointage_conducteurId_fkey" FOREIGN KEY ("conducteurId") REFERENCES "Conducteur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trajet" ADD CONSTRAINT "Trajet_ligneId_fkey" FOREIGN KEY ("ligneId") REFERENCES "Ligne"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Arret" ADD CONSTRAINT "Arret_trajetId_fkey" FOREIGN KEY ("trajetId") REFERENCES "Trajet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraiseDossier" ADD CONSTRAINT "FraiseDossier_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "FraiseClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraiseLocationModulation" ADD CONSTRAINT "FraiseLocationModulation_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "FraiseDossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraiseDemande" ADD CONSTRAINT "FraiseDemande_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "FraiseDossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraiseVehicule" ADD CONSTRAINT "FraiseVehicule_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "FraiseDossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraiseTransaction" ADD CONSTRAINT "FraiseTransaction_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "FraiseDossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraiseTransaction" ADD CONSTRAINT "FraiseTransaction_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "FraiseClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraiseTransaction" ADD CONSTRAINT "FraiseTransaction_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "FraiseDemande"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraiseInteraction" ADD CONSTRAINT "FraiseInteraction_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "FraiseClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraiseClientToken" ADD CONSTRAINT "FraiseClientToken_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "FraiseClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraiseBudget" ADD CONSTRAINT "FraiseBudget_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "FraiseDossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraiseDocument" ADD CONSTRAINT "FraiseDocument_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "FraiseDossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraiseDocument" ADD CONSTRAINT "FraiseDocument_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "FraiseClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
