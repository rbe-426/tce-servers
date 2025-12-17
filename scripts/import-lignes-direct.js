#!/usr/bin/env node

/**
 * Script d'import direct des lignes dans la BD
 * Utilise Prisma pour injecter directement
 * Évite les doublons et les erreurs de parsing CSV
 *
 * LOGIQUE (comme ton CSV mais dans le script) :
 * - 1 seule entrée par numéro de ligne
 * - Les variantes SEMAINE / SAMEDI / DIMFER sont dans les SENS (nom)
 * - Chaque sens a ses propres services (plages conducteur)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ==================== DONNÉES À IMPORTER ====================
// ⚠️ Remplace/ajuste si tu veux des découpes de services différentes (max 10h).
const LIGNES_DATA = [
  // ===================== 4201 =====================
  {
    numero: "4201",
    nom: "LIGNE_4201",
    type: "autobus",
    // amplitude globale (large) pour la ligne
    jours: "L; M; M; J; V; S; D",
    heureDebut: "04h30",
    heureFin: "00h30",
    sens: [
      // SEMAINE
      {
        nom: "SEMAINE - Aller",
        direction: "Gare SNCF → Centre Ville",
        services: [
          { heureDebut: "04h37", heureFin: "12h30" },
          { heureDebut: "12h30", heureFin: "20h30" },
          { heureDebut: "20h30", heureFin: "00h10" }
        ]
      },
      {
        nom: "SEMAINE - Retour",
        direction: "Centre Ville → Gare SNCF",
        services: [
          { heureDebut: "04h50", heureFin: "12h45" },
          { heureDebut: "12h45", heureFin: "20h45" },
          { heureDebut: "20h45", heureFin: "00h10" }
        ]
      },

      // SAMEDI
      {
        nom: "SAMEDI - Aller",
        direction: "Gare SNCF → Centre Ville",
        services: [
          { heureDebut: "06h00", heureFin: "14h00" },
          { heureDebut: "14h00", heureFin: "22h00" },
          { heureDebut: "22h00", heureFin: "00h10" }
        ]
      },
      {
        nom: "SAMEDI - Retour",
        direction: "Centre Ville → Gare SNCF",
        services: [
          { heureDebut: "06h10", heureFin: "14h10" },
          { heureDebut: "14h10", heureFin: "22h10" },
          { heureDebut: "22h10", heureFin: "00h10" }
        ]
      },

      // DIMFER
      {
        nom: "DIMFER - Aller",
        direction: "Gare SNCF → Centre Ville",
        services: [
          { heureDebut: "07h30", heureFin: "15h30" },
          { heureDebut: "15h30", heureFin: "23h30" }
        ]
      },
      {
        nom: "DIMFER - Retour",
        direction: "Centre Ville → Gare SNCF",
        services: [
          { heureDebut: "07h45", heureFin: "15h45" },
          { heureDebut: "15h45", heureFin: "23h45" }
        ]
      }
    ]
  },

  // ===================== 4202 =====================
  {
    numero: "4202",
    nom: "LIGNE_4202",
    type: "autobus",
    jours: "L; M; M; J; V; S; D",
    heureDebut: "04h45",
    heureFin: "00h10",
    sens: [
      // SEMAINE
      {
        nom: "SEMAINE - Aller",
        direction: "Évry-Courcouronnes → Ris-Orangis (Aunettes / Val de Ris)",
        services: [
          { heureDebut: "04h48", heureFin: "12h40" },
          { heureDebut: "12h40", heureFin: "20h40" },
          { heureDebut: "20h40", heureFin: "00h10" }
        ]
      },
      {
        nom: "SEMAINE - Retour",
        direction: "Ris-Orangis (Val de Ris) → Évry-Courcouronnes",
        services: [
          { heureDebut: "05h10", heureFin: "13h00" },
          { heureDebut: "13h00", heureFin: "21h00" },
          { heureDebut: "21h00", heureFin: "00h10" }
        ]
      },

      // SAMEDI
      {
        nom: "SAMEDI - Aller",
        direction: "Évry-Courcouronnes → Ris-Orangis (Aunettes / Val de Ris)",
        services: [
          { heureDebut: "06h00", heureFin: "14h00" },
          { heureDebut: "14h00", heureFin: "22h00" },
          { heureDebut: "22h00", heureFin: "00h19" }
        ]
      },
      {
        nom: "SAMEDI - Retour",
        direction: "Ris-Orangis (Val de Ris) → Évry-Courcouronnes",
        services: [
          { heureDebut: "05h17", heureFin: "13h17" },
          { heureDebut: "13h17", heureFin: "21h17" },
          { heureDebut: "21h17", heureFin: "00h19" }
        ]
      },

      // DIMFER
      {
        nom: "DIMFER - Aller",
        direction: "Évry-Courcouronnes → Ris-Orangis (Aunettes / Val de Ris)",
        services: [
          { heureDebut: "06h30", heureFin: "14h30" },
          { heureDebut: "14h30", heureFin: "00h08" }
        ]
      },
      {
        nom: "DIMFER - Retour",
        direction: "Ris-Orangis (Val de Ris) → Évry-Courcouronnes",
        services: [
          { heureDebut: "06h45", heureFin: "14h45" },
          { heureDebut: "14h45", heureFin: "23h55" }
        ]
      }
    ]
  },

  // ===================== 4203 =====================
  {
    numero: "4203",
    nom: "LIGNE_4203",
    type: "autobus",
    jours: "L; M; M; J; V; S; D",
    heureDebut: "05h30",
    heureFin: "23h30",
    sens: [
      {
        nom: "SEMAINE - Aller",
        direction: "Corbeil-Essonnes → (terminus selon fiche)",
        services: [
          { heureDebut: "05h30", heureFin: "13h30" },
          { heureDebut: "13h30", heureFin: "21h30" }
        ]
      },
      {
        nom: "SEMAINE - Retour",
        direction: "(terminus) → Corbeil-Essonnes",
        services: [
          { heureDebut: "06h00", heureFin: "14h00" },
          { heureDebut: "14h00", heureFin: "22h00" }
        ]
      },

      {
        nom: "SAMEDI - Aller",
        direction: "Corbeil-Essonnes → (terminus selon fiche)",
        services: [
          { heureDebut: "07h00", heureFin: "15h00" },
          { heureDebut: "15h00", heureFin: "23h00" }
        ]
      },
      {
        nom: "SAMEDI - Retour",
        direction: "(terminus) → Corbeil-Essonnes",
        services: [
          { heureDebut: "07h15", heureFin: "15h15" },
          { heureDebut: "15h15", heureFin: "23h15" }
        ]
      },

      {
        nom: "DIMFER - Aller",
        direction: "Corbeil-Essonnes → (terminus selon fiche)",
        services: [
          { heureDebut: "08h00", heureFin: "16h00" },
          { heureDebut: "16h00", heureFin: "22h30" }
        ]
      },
      {
        nom: "DIMFER - Retour",
        direction: "(terminus) → Corbeil-Essonnes",
        services: [
          { heureDebut: "08h15", heureFin: "16h15" },
          { heureDebut: "16h15", heureFin: "22h45" }
        ]
      }
    ]
  },

  // ===================== 4204 (PDF 13 pages : Soisy-sur-Seine <-> Gare d'Orangis Bois de l'Épine) =====================
  {
    numero: "4204",
    nom: "LIGNE_4204",
    type: "autobus",
    jours: "L; M; M; J; V; S; D",
    heureDebut: "05h20",
    heureFin: "23h00",
    sens: [
      // SEMAINE
      {
        nom: "SEMAINE - Aller",
        direction: "Gare d'Orangis Bois de l'Épine → Les Meillottes (Soisy-sur-Seine)",
        services: [
          { heureDebut: "05h22", heureFin: "13h22" },
          { heureDebut: "13h22", heureFin: "21h22" },
          { heureDebut: "21h22", heureFin: "22h16" }
        ]
      },
      {
        nom: "SEMAINE - Retour",
        direction: "Les Meillottes (Soisy-sur-Seine) → Gare d'Orangis Bois de l'Épine",
        services: [
          { heureDebut: "05h33", heureFin: "13h33" },
          { heureDebut: "13h33", heureFin: "21h33" },
          { heureDebut: "21h33", heureFin: "22h45" }
        ]
      },

      // SAMEDI
      {
        nom: "SAMEDI - Aller",
        direction: "Gare d'Orangis Bois de l'Épine → Les Meillottes (Soisy-sur-Seine)",
        services: [
          { heureDebut: "06h38", heureFin: "14h38" },
          { heureDebut: "14h38", heureFin: "22h53" }
        ]
      },
      {
        nom: "SAMEDI - Retour",
        direction: "Les Meillottes (Soisy-sur-Seine) → Gare d'Orangis Bois de l'Épine",
        services: [
          { heureDebut: "07h23", heureFin: "15h23" },
          { heureDebut: "15h23", heureFin: "22h32" }
        ]
      },

      // DIMFER
      {
        nom: "DIMFER - Aller",
        direction: "Gare d'Orangis Bois de l'Épine → Les Meillottes (Soisy-sur-Seine)",
        services: [
          { heureDebut: "06h55", heureFin: "14h55" },
          { heureDebut: "14h55", heureFin: "21h14" }
        ]
      },
      {
        nom: "DIMFER - Retour",
        direction: "Les Meillottes (Soisy-sur-Seine) → Gare d'Orangis Bois de l'Épine",
        services: [
          { heureDebut: "07h09", heureFin: "15h09" },
          { heureDebut: "15h09", heureFin: "20h27" }
        ]
      }
    ]
  },

  // ===================== 4205 =====================
  {
    numero: "4205",
    nom: "LIGNE_4205",
    type: "autobus",
    jours: "L; M; M; J; V; S; D",
    heureDebut: "05h30",
    heureFin: "21h30",
    sens: [
      {
        nom: "SEMAINE - Aller",
        direction: "Gare de Juvisy - Condorcet → Viry/Grigny",
        services: [
          { heureDebut: "05h30", heureFin: "13h30" },
          { heureDebut: "13h30", heureFin: "21h15" }
        ]
      },
      {
        nom: "SEMAINE - Retour",
        direction: "Viry/Grigny → Gare de Juvisy - Condorcet",
        services: [
          { heureDebut: "05h45", heureFin: "13h45" },
          { heureDebut: "13h45", heureFin: "21h30" }
        ]
      },

      {
        nom: "SAMEDI - Aller",
        direction: "Gare de Juvisy - Condorcet → Viry/Grigny",
        services: [
          { heureDebut: "06h30", heureFin: "14h30" },
          { heureDebut: "14h30", heureFin: "19h05" }
        ]
      },
      {
        nom: "SAMEDI - Retour",
        direction: "Viry/Grigny → Gare de Juvisy - Condorcet",
        services: [
          { heureDebut: "06h45", heureFin: "14h45" },
          { heureDebut: "14h45", heureFin: "19h10" }
        ]
      },

      {
        nom: "DIMFER - Aller",
        direction: "Gare de Juvisy - Condorcet → Viry/Grigny",
        services: [
          { heureDebut: "08h58", heureFin: "16h58" },
          { heureDebut: "16h58", heureFin: "19h30" }
        ]
      },
      {
        nom: "DIMFER - Retour",
        direction: "Viry/Grigny → Gare de Juvisy - Condorcet",
        services: [
          { heureDebut: "08h39", heureFin: "16h39" },
          { heureDebut: "16h39", heureFin: "19h00" }
        ]
      }
    ]
  }
];

// ==================== HELPER FUNCTIONS ====================

/**
 * Extrait le jour de fonctionnement du nom du sens
 */
function extractJourFonctionnement(nomSens) {
  const nom = nomSens.toUpperCase();
  if (nom.includes("SEMAINE")) return "SEMAINE";
  if (nom.includes("SAMEDI")) return "SAMEDI";
  if (nom.includes("DIMFER") || nom.includes("DIMANCHE") || nom.includes("FÉRIÉS")) return "DIMANCHE_FERIES";
  return "SEMAINE"; // Défaut
}

/**
 * Parse une chaîne d'heure (ex: "06h30") en string au format "HH:mm"
 */
function parseHeure(heureStr) {
  if (!heureStr) return null;
  const match = heureStr.match(/(\d{1,2})h(\d{2})?/);
  if (!match) return null;
  const heures = String(parseInt(match[1], 10)).padStart(2, "0");
  const minutes = String(parseInt(match[2], 10) || 0).padStart(2, "0");
  return `${heures}:${minutes}`;
}

/**
 * Parse les jours de fonctionnement (ex: "L; M; M; J; V") en objet booléen
 */
function parseJours(joursStr) {
  const jours = {
    lundi: false,
    mardi: false,
    mercredi: false,
    jeudi: false,
    vendredi: false,
    samedi: false,
    dimanche: false
  };

  if (!joursStr) return jours;

  const joursArray = joursStr.split(";").map((j) => j.trim().toUpperCase());

  // Gestion spéciale pour les deux/trois M (mardi/mercredi)
  let mCount = 0;
  for (const jour of joursArray) {
    if (jour === "L") jours.lundi = true;
    else if (jour === "M") {
      mCount++;
      if (mCount === 1) jours.mardi = true;
      else if (mCount === 2) jours.mercredi = true;
    } else if (jour === "J") jours.jeudi = true;
    else if (jour === "V") jours.vendredi = true;
    else if (jour === "S") jours.samedi = true;
    else if (jour === "D") jours.dimanche = true;
  }

  return jours;
}

/**
 * Génère les dates de services pour une semaine selon le jour de fonctionnement
 * @param jourFonctionnement "SEMAINE", "SAMEDI", "DIMANCHE_FERIES"
 * @returns array de dates (Date objects)
 */
function generateServiceDatesByJour(jourFonctionnement) {
  const dates = [];
  const today = new Date();

  // Trouver le lundi de cette semaine
  const dayOfWeek = today.getDay(); // 0=dimanche
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysToMonday);
  monday.setHours(0, 0, 0, 0);

  if (jourFonctionnement === "SEMAINE") {
    // Lundi à vendredi
    for (let i = 0; i < 5; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      dates.push(date);
    }
  } else if (jourFonctionnement === "SAMEDI") {
    // Samedi
    const date = new Date(monday);
    date.setDate(monday.getDate() + 5); // Samedi
    dates.push(date);
  } else if (jourFonctionnement === "DIMANCHE_FERIES") {
    // Dimanche
    const date = new Date(monday);
    date.setDate(monday.getDate() + 6); // Dimanche
    dates.push(date);
  }

  return dates;
}

/**
 * Génère les dates de services pour une semaine
 * @param calendrier objet {lundi, mardi, ...}
 * @returns array de dates (Date objects)
 */
function generateServiceDates(calendrier) {
  const dates = [];
  const today = new Date();

  // Trouver le lundi de cette semaine
  const dayOfWeek = today.getDay(); // 0=dimanche
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysToMonday);
  monday.setHours(0, 0, 0, 0);

  const calendarOrder = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

  for (let i = 0; i < 7; i++) {
    const dayName = calendarOrder[i];
    if (calendrier[dayName]) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      dates.push(date);
    }
  }

  return dates;
}

// ==================== IMPORT LOGIC ====================

async function importLignes() {
  console.log("🚀 Démarrage de l'import des lignes...\n");

  let totalCreated = 0;
  let totalServices = 0;
  const errors = [];

  try {
    for (const ligneData of LIGNES_DATA) {
      console.log(`📍 Traitement de la ligne ${ligneData.numero} (${ligneData.nom})...`);

      try {
        // 1. Créer ou récupérer la ligne
        const ligne = await prisma.ligne.upsert({
          where: { numero: ligneData.numero },
          create: {
            numero: ligneData.numero,
            nom: ligneData.nom,
            typesVehicules: JSON.stringify([ligneData.type]),
            heureDebut: parseHeure(ligneData.heureDebut),
            heureFin: parseHeure(ligneData.heureFin),
            calendrierJson: JSON.stringify(parseJours(ligneData.jours)),
            statut: "Actif"
          },
          update: {
            nom: ligneData.nom,
            typesVehicules: JSON.stringify([ligneData.type]),
            heureDebut: parseHeure(ligneData.heureDebut),
            heureFin: parseHeure(ligneData.heureFin),
            calendrierJson: JSON.stringify(parseJours(ligneData.jours)),
            statut: "Actif"
          }
        });

        console.log(`   ✓ Ligne trouvée/créée: ${ligne.id}`);
        totalCreated++;

        // 2. Traiter les sens
        for (const sensData of ligneData.sens) {
          const jourFonctionnement = extractJourFonctionnement(sensData.nom);
          const sens = await prisma.sens.upsert({
            where: {
              ligneId_nom: {
                ligneId: ligne.id,
                nom: sensData.nom
              }
            },
            create: {
              ligneId: ligne.id,
              nom: sensData.nom,
              direction: sensData.direction || null,
              jourFonctionnement: jourFonctionnement,
              statut: "Actif"
            },
            update: {
              direction: sensData.direction || null,
              jourFonctionnement: jourFonctionnement,
              statut: "Actif"
            }
          });

          console.log(`   ✓ Sens créé/mis à jour: ${sens.nom} (${jourFonctionnement})`);

          // 3. Créer les services pour ce sens
          // Générer les dates selon le jour de fonctionnement du sens
          const serviceDates = generateServiceDatesByJour(jourFonctionnement);

          for (const serviceData of sensData.services) {
            const heureDebut = parseHeure(serviceData.heureDebut);
            const heureFin = parseHeure(serviceData.heureFin);

            if (!heureDebut || !heureFin) {
              errors.push(`Service ignoré pour ${ligneData.numero} ${sensData.nom}: heures invalides`);
              continue;
            }

            // Créer un service par date
            for (const serviceDate of serviceDates) {
              const existingService = await prisma.service.findFirst({
                where: {
                  ligneId: ligne.id,
                  sensId: sens.id,
                  date: {
                    gte: new Date(serviceDate.getFullYear(), serviceDate.getMonth(), serviceDate.getDate()),
                    lt: new Date(serviceDate.getFullYear(), serviceDate.getMonth(), serviceDate.getDate() + 1)
                  },
                  heureDebut,
                  heureFin
                }
              });

              if (!existingService) {
                await prisma.service.create({
                  data: {
                    ligneId: ligne.id,
                    sensId: sens.id,
                    date: serviceDate,
                    heureDebut,
                    heureFin,
                    statut: "Planifiée"
                  }
                });
                totalServices++;
              }
            }
          }
        }

        console.log(`   ✅ Ligne ${ligneData.numero} importée avec succès\n`);
      } catch (error) {
        const msg = `Erreur ligne ${ligneData.numero}: ${error.message}`;
        console.error(`   ❌ ${msg}`);
        errors.push(msg);
      }
    }

    // Résumé
    console.log("\n" + "=".repeat(60));
    console.log("✨ IMPORT TERMINÉ");
    console.log("=".repeat(60));
    console.log(`📊 Lignes traitées: ${totalCreated}`);
    console.log(`🚌 Services créés: ${totalServices}`);
    console.log(`⚠️  Erreurs: ${errors.length}`);

    if (errors.length > 0) {
      console.log("\n❌ Erreurs rencontrées:");
      errors.forEach((err) => console.log(`   - ${err}`));
    }

    console.log("\n✅ Les données sont maintenant disponibles sur le planning !");
  } catch (error) {
    console.error("\n💥 Erreur fatale:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// ==================== RUN ====================

importLignes();
