#!/usr/bin/env node

/**
 * Script d'import direct des lignes dans la BD
 * Utilise Prisma pour injecter directement
 * Évite les doublons et les erreurs de parsing CSV
 *
 * ✅ Version avec jourFonctionnement cohérent :
 * - 1 numéro = 1 ligne
 * - 6 sens max : SEMAINE A/R, SAMEDI A/R, DIMANCHE_FERIES A/R
 * - chaque sens a son propre jourFonctionnement
 * - services découpés en blocs <= 10h (départ -> arrivée)
 * - Filtrage par jourFonctionnement au moment de l'affichage (Plannings.jsx)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ==================== DONNÉES À IMPORTER ====================
// ⚠️ Données réelles calculées depuis les PDF fournis
const LIGNES_DATA = [
  {
    "numero": "4202",
    "nom": "LIGNE_4202",
    "type": "autobus",
    "jours": "L; M; M; J; V; S; D",
    "heureDebut": "04h21",
    "heureFin": "00h19",
    "sens": [
      {
        "nom": "Semaine Aller",
        "direction": "RIS-ORANGISGare de Ris-Orangis Val de Ris → EVRY-COURCOURONNESAunettes",
        "services": [
          { "heureDebut": "04h48", "heureFin": "14h48" },
          { "heureDebut": "14h48", "heureFin": "00h19" }
        ]
      },
      {
        "nom": "Semaine Retour",
        "direction": "EVRY-COURCOURONNESAunettes → RIS-ORANGISGare de Ris-Orangis Val de Ris",
        "services": [
          { "heureDebut": "04h21", "heureFin": "14h21" },
          { "heureDebut": "14h21", "heureFin": "00h18" }
        ]
      },
      {
        "nom": "Samedi Aller",
        "direction": "RIS-ORANGISGare de Ris-Orangis Val de Ris → EVRY-COURCOURONNESAunettes",
        "services": [
          { "heureDebut": "05h09", "heureFin": "15h09" },
          { "heureDebut": "15h09", "heureFin": "23h54" }
        ]
      },
      {
        "nom": "Samedi Retour",
        "direction": "EVRY-COURCOURONNESAunettes → RIS-ORANGISGare de Ris-Orangis Val de Ris",
        "services": [
          { "heureDebut": "05h17", "heureFin": "15h17" },
          { "heureDebut": "15h17", "heureFin": "00h03" }
        ]
      },
      {
        "nom": "Dimanche & fériés Aller",
        "direction": "RIS-ORANGISGare de Ris-Orangis Val de Ris → EVRY-COURCOURONNESAunettes",
        "services": [
          { "heureDebut": "05h32", "heureFin": "15h32" },
          { "heureDebut": "15h32", "heureFin": "00h11" }
        ]
      },
      {
        "nom": "Dimanche & fériés Retour",
        "direction": "EVRY-COURCOURONNESAunettes → RIS-ORANGISGare de Ris-Orangis Val de Ris",
        "services": [
          { "heureDebut": "05h21", "heureFin": "15h21" },
          { "heureDebut": "15h21", "heureFin": "23h43" }
        ]
      }
    ]
  },

  {
    "numero": "4203",
    "nom": "LIGNE_4203",
    "type": "autobus",
    "jours": "L; M; M; J; V; S; D",
    "heureDebut": "04h57",
    "heureFin": "00h53",
    "sens": [
      {
        "nom": "Semaine Aller",
        "direction": "LE-COUDRAY-MONTCEAUXTerminal David Douillet → CORBEIL-ESSONNESSnecma / Safran",
        "services": [
          { "heureDebut": "04h57", "heureFin": "14h57" },
          { "heureDebut": "14h57", "heureFin": "00h42" }
        ]
      },
      {
        "nom": "Semaine Retour",
        "direction": "CORBEIL-ESSONNESSnecma / Safran → LE-COUDRAY-MONTCEAUXTerminal David Douillet",
        "services": [
          { "heureDebut": "05h19", "heureFin": "15h19" },
          { "heureDebut": "15h19", "heureFin": "00h53" }
        ]
      },
      {
        "nom": "Samedi Aller",
        "direction": "LE-COUDRAY-MONTCEAUXTerminal David Douillet → CORBEIL-ESSONNESSnecma / Safran",
        "services": [
          { "heureDebut": "05h00", "heureFin": "15h00" },
          { "heureDebut": "15h00", "heureFin": "00h09" }
        ]
      },
      {
        "nom": "Samedi Retour",
        "direction": "CORBEIL-ESSONNESSnecma / Safran → LE-COUDRAY-MONTCEAUXTerminal David Douillet",
        "services": [
          { "heureDebut": "05h17", "heureFin": "15h17" },
          { "heureDebut": "15h17", "heureFin": "00h24" }
        ]
      },
      {
        "nom": "Dimanche & fériés Aller",
        "direction": "LE-COUDRAY-MONTCEAUXTerminal David Douillet → CORBEIL-ESSONNESSnecma / Safran",
        "services": [
          { "heureDebut": "05h00", "heureFin": "15h00" },
          { "heureDebut": "15h00", "heureFin": "00h41" }
        ]
      },
      {
        "nom": "Dimanche & fériés Retour",
        "direction": "CORBEIL-ESSONNESSnecma / Safran → LE-COUDRAY-MONTCEAUXTerminal David Douillet",
        "services": [
          { "heureDebut": "05h20", "heureFin": "15h20" },
          { "heureDebut": "15h20", "heureFin": "00h31" }
        ]
      }
    ]
  },

  {
    "numero": "4205",
    "nom": "LIGNE_4205",
    "type": "autobus",
    "jours": "L; M; M; J; V; S; D",
    "heureDebut": "05h00",
    "heureFin": "00h48",
    "sens": [
      {
        "nom": "Semaine Aller",
        "direction": "VIRY-CHÂTILLONLa Treille → JUVISY-SUR-ORGEGare de Juvisy - Condorcet",
        "services": [
          { "heureDebut": "05h00", "heureFin": "15h00" },
          { "heureDebut": "15h00", "heureFin": "00h23" }
        ]
      },
      {
        "nom": "Semaine Retour",
        "direction": "JUVISY-SUR-ORGEGare de Juvisy - Condorcet → VIRY-CHÂTILLONLa Treille",
        "services": [
          { "heureDebut": "05h00", "heureFin": "15h00" },
          { "heureDebut": "15h00", "heureFin": "00h28" }
        ]
      },
      {
        "nom": "Samedi Aller",
        "direction": "VIRY-CHÂTILLONLa Treille → JUVISY-SUR-ORGEGare de Juvisy - Condorcet",
        "services": [
          { "heureDebut": "05h02", "heureFin": "15h02" },
          { "heureDebut": "15h02", "heureFin": "23h50" }
        ]
      },
      {
        "nom": "Samedi Retour",
        "direction": "JUVISY-SUR-ORGEGare de Juvisy - Condorcet → VIRY-CHÂTILLONLa Treille",
        "services": [
          { "heureDebut": "05h54", "heureFin": "15h54" },
          { "heureDebut": "15h54", "heureFin": "00h48" }
        ]
      },
      {
        "nom": "Dimanche & fériés Aller",
        "direction": "VIRY-CHÂTILLONLa Treille → JUVISY-SUR-ORGEGare de Juvisy - Condorcet",
        "services": [
          { "heureDebut": "05h30", "heureFin": "15h30" },
          { "heureDebut": "15h30", "heureFin": "22h50" }
        ]
      },
      {
        "nom": "Dimanche & fériés Retour",
        "direction": "JUVISY-SUR-ORGEGare de Juvisy - Condorcet → VIRY-CHÂTILLONLa Treille",
        "services": [
          { "heureDebut": "05h39", "heureFin": "15h39" },
          { "heureDebut": "15h39", "heureFin": "23h01" }
        ]
      }
    ]
  },

  {
    "numero": "4206",
    "nom": "LIGNE_4206",
    "type": "autobus",
    "jours": "L; M; M; J; V; S; D",
    "heureDebut": "04h33",
    "heureFin": "00h36",
    "sens": [
      {
        "nom": "Semaine Aller",
        "direction": "VIRY-CHÂTILLONLa Treille → CORBEIL-ESSONNESGare de Corbeil-Essonnes - E. Zola",
        "services": [
          { "heureDebut": "04h38", "heureFin": "14h38" },
          { "heureDebut": "14h38", "heureFin": "00h32" }
        ]
      },
      {
        "nom": "Semaine Retour",
        "direction": "CORBEIL-ESSONNESGare de Corbeil-Essonnes - E. Zola → VIRY-CHÂTILLONLa Treille",
        "services": [
          { "heureDebut": "04h33", "heureFin": "14h33" },
          { "heureDebut": "14h33", "heureFin": "00h36" }
        ]
      },
      {
        "nom": "Samedi Aller",
        "direction": "VIRY-CHÂTILLONLa Treille → CORBEIL-ESSONNESGare de Corbeil-Essonnes - E. Zola",
        "services": [
          { "heureDebut": "04h38", "heureFin": "14h38" },
          { "heureDebut": "14h38", "heureFin": "00h34" }
        ]
      },
      {
        "nom": "Samedi Retour",
        "direction": "CORBEIL-ESSONNESGare de Corbeil-Essonnes - E. Zola → VIRY-CHÂTILLONLa Treille",
        "services": [
          { "heureDebut": "04h33", "heureFin": "14h33" },
          { "heureDebut": "14h33", "heureFin": "00h30" }
        ]
      },
      {
        "nom": "Dimanche & fériés Aller",
        "direction": "VIRY-CHÂTILLONLa Treille → CORBEIL-ESSONNESGare de Corbeil-Essonnes - E. Zola",
        "services": [
          { "heureDebut": "04h33", "heureFin": "14h33" },
          { "heureDebut": "14h33", "heureFin": "00h25" }
        ]
      },
      {
        "nom": "Dimanche & fériés Retour",
        "direction": "CORBEIL-ESSONNESGare de Corbeil-Essonnes - E. Zola → VIRY-CHÂTILLONLa Treille",
        "services": [
          { "heureDebut": "04h33", "heureFin": "14h33" },
          { "heureDebut": "14h33", "heureFin": "00h25" }
        ]
      }
    ]
  },

  {
    "numero": "4212",
    "nom": "LIGNE_4212",
    "type": "autobus",
    "jours": "L; M; M; J; V; S; D",
    "heureDebut": "05h00",
    "heureFin": "23h41",
    "sens": [
      {
        "nom": "Semaine Aller",
        "direction": "EVRY-COURCOURONNESGare du Bras de Fer-Évry Génopôle → BRETIGNY-SUR-ORGEGare de Brétigny",
        "services": [
          { "heureDebut": "05h00", "heureFin": "15h00" },
          { "heureDebut": "15h00", "heureFin": "23h25" }
        ]
      },
      {
        "nom": "Semaine Retour",
        "direction": "BRETIGNY-SUR-ORGEGare de Brétigny → EVRY-COURCOURONNESGare du Bras de Fer-Évry Génopôle",
        "services": [
          { "heureDebut": "05h00", "heureFin": "15h00" },
          { "heureDebut": "15h00", "heureFin": "23h27" }
        ]
      },
      {
        "nom": "Samedi Aller",
        "direction": "EVRY-COURCOURONNESGare du Bras de Fer-Évry Génopôle → BRETIGNY-SUR-ORGEGare de Brétigny",
        "services": [
          { "heureDebut": "06h00", "heureFin": "16h00" },
          { "heureDebut": "16h00", "heureFin": "23h27" }
        ]
      },
      {
        "nom": "Samedi Retour",
        "direction": "BRETIGNY-SUR-ORGEGare de Brétigny → EVRY-COURCOURONNESGare du Bras de Fer-Évry Génopôle",
        "services": [
          { "heureDebut": "06h15", "heureFin": "16h15" },
          { "heureDebut": "16h15", "heureFin": "23h41" }
        ]
      },
      {
        "nom": "Dimanche & fériés Aller",
        "direction": "EVRY-COURCOURONNESGare du Bras de Fer-Évry Génopôle → BRETIGNY-SUR-ORGEGare de Brétigny",
        "services": [
          { "heureDebut": "05h45", "heureFin": "15h45" },
          { "heureDebut": "15h45", "heureFin": "22h52" }
        ]
      },
      {
        "nom": "Dimanche & fériés Retour",
        "direction": "BRETIGNY-SUR-ORGEGare de Brétigny → EVRY-COURCOURONNESGare du Bras de Fer-Évry Génopôle",
        "services": [
          { "heureDebut": "06h15", "heureFin": "16h15" },
          { "heureDebut": "16h15", "heureFin": "23h20" }
        ]
      }
    ]
  },

  {
    "numero": "4213",
    "nom": "LIGNE_4213",
    "type": "autobus",
    "jours": "L; M; M; J; V",
    "heureDebut": "06h27",
    "heureFin": "20h03",
    "sens": [
      {
        "nom": "Semaine Aller",
        "direction": "RIS-ORANGISCentre Commercial Aunettes → BONDOUFLEImprimerie Nationale",
        "services": [
          { "heureDebut": "06h39", "heureFin": "16h39" },
          { "heureDebut": "16h39", "heureFin": "20h03" }
        ]
      },
      {
        "nom": "Semaine Retour",
        "direction": "BONDOUFLEImprimerie Nationale → RIS-ORANGISCentre Commercial Aunettes",
        "services": [
          { "heureDebut": "06h27", "heureFin": "16h27" },
          { "heureDebut": "16h27", "heureFin": "19h34" }
        ]
      }
    ]
  }
];

// ==================== HELPER FUNCTIONS ====================

/**
 * Parse une chaîne d'heure (ex: "06h30") en string au format "HH:mm"
 */
function parseHeure(heureStr) {
  if (!heureStr) return null;
  const match = heureStr.match(/(\d{1,2})h(\d{2})?/);
  if (!match) return null;
  const heures = String(parseInt(match[1])).padStart(2, '0');
  const minutes = String(parseInt(match[2]) || 0).padStart(2, '0');
  return `${heures}:${minutes}`;
}

/**
 * Détermine le jourFonctionnement basé sur le nom du sens
 * @param nomSens ex: "Semaine Aller", "Samedi Retour", "Dimanche & fériés Aller"
 * @returns "SEMAINE" | "SAMEDI" | "DIMANCHE_FERIES"
 */
function determineJourFonctionnement(nomSens) {
  const nom = nomSens.toLowerCase();
  
  if (nom.includes('dimanche') || nom.includes('fériés') || nom.includes('feries')) {
    return 'DIMANCHE_FERIES';
  } else if (nom.includes('samedi')) {
    return 'SAMEDI';
  } else if (nom.includes('semaine')) {
    return 'SEMAINE';
  }
  
  // Par défaut SEMAINE si pas de correspondance claire
  return 'SEMAINE';
}

/**
 * Génère les dates de services en fonction du jourFonctionnement
 * @param jourFonctionnement "SEMAINE" | "SAMEDI" | "DIMANCHE_FERIES"
 * @returns array de dates (Date objects)
 */
function generateServiceDates(jourFonctionnement) {
  const dates = [];
  const today = new Date();

  // Trouver le lundi de cette semaine
  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysToMonday);
  monday.setHours(0, 0, 0, 0);

  if (jourFonctionnement === 'SEMAINE') {
    // Lundi à vendredi (indices 0-4)
    for (let i = 0; i < 5; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      dates.push(date);
    }
  } else if (jourFonctionnement === 'SAMEDI') {
    // Samedi uniquement (indice 5)
    const date = new Date(monday);
    date.setDate(monday.getDate() + 5);
    dates.push(date);
  } else if (jourFonctionnement === 'DIMANCHE_FERIES') {
    // Dimanche uniquement (indice 6)
    const date = new Date(monday);
    date.setDate(monday.getDate() + 6);
    dates.push(date);
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
            calendrierJson: JSON.stringify(ligneData.jours),
            statut: "Actif"
          },
          update: {
            nom: ligneData.nom,
            typesVehicules: JSON.stringify([ligneData.type]),
            heureDebut: parseHeure(ligneData.heureDebut),
            heureFin: parseHeure(ligneData.heureFin),
            calendrierJson: JSON.stringify(ligneData.jours),
            statut: "Actif"
          }
        });

        console.log(`   ✓ Ligne trouvée/créée: ${ligne.id}`);
        totalCreated++;

        // 2. Traiter les sens
        for (const sensData of ligneData.sens) {
          const jourFonctionnement = determineJourFonctionnement(sensData.nom);
          
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

          console.log(`   ✓ Sens OK: ${sens.nom} (${jourFonctionnement})`);

          // ✅ IMPORTANT : Générer les dates en fonction du jourFonctionnement du sens
          const serviceDates = generateServiceDates(jourFonctionnement);

          // 3. Créer les services pour ce sens
          for (const serviceData of sensData.services) {
            const heureDebut = parseHeure(serviceData.heureDebut);
            const heureFin = parseHeure(serviceData.heureFin);

            if (!heureDebut || !heureFin) {
              errors.push(`Service ignoré pour ${ligneData.numero} ${sensData.nom}: heures invalides`);
              continue;
            }

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
