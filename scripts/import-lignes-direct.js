#!/usr/bin/env node

/**
 * Script d'import direct des lignes dans la BD
 * Utilise Prisma pour injecter directement
 * Évite les doublons et les erreurs de parsing CSV
 *
 * LOGIQUE:
 * - 1 seule entrée par numéro de ligne
 * - Les variantes (SEMAINE / SAM / DIMFER) sont des SENS distincts
 * - Chaque SENS peut porter ses propres jours + services
 * - Un service = depart -> arrivée (heureDebut -> heureFin)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ==================== DONNÉES À IMPORTER ====================
// ⚠️ ÉCRASÉ pour mettre les données réelles de la ligne 4201.
// Les libellés "SEMAINE / SAM / DIMFER" sont portés par les SENS.
const LIGNES_DATA = [
  {
    numero: '4201',
    nom: 'LIGNE_4201',
    type: 'autobus',

    // Calendrier "global" de la ligne (optionnel, pour la fiche ligne)
    // Les services utilisent le calendrier du sens si renseigné.
    jours: 'L; M; M; J; V; S; D',

    // Bornes globales (optionnelles)
    heureDebut: '04h57',
    heureFin: '00h22',

    sens: [
      // ===================== SEMAINE =====================
      {
        nom: 'Aller (SEMAINE)',
        direction: 'Saint-Michel-sur-Orge (Rue Berlioz) → Corbeil-Essonnes (Gare E. Zola)',
        jours: 'L; M; M; J; V',
        services: [
          { heureDebut: '04h57', heureFin: '14h49' },
          { heureDebut: '13h57', heureFin: '23h19' }
        ]
      },
      {
        nom: 'Retour (SEMAINE)',
        direction: 'Corbeil-Essonnes (Gare E. Zola) → Saint-Michel-sur-Orge (Rue Berlioz)',
        jours: 'L; M; M; J; V',
        services: [
          { heureDebut: '05h01', heureFin: '14h59' },
          { heureDebut: '14h05', heureFin: '23h25' }
        ]
      },

      // ===================== SAMEDI =====================
      {
        nom: 'Aller (SAM)',
        direction: 'Saint-Michel-sur-Orge (Rue Berlioz) → Corbeil-Essonnes (Gare E. Zola)',
        jours: 'S',
        services: [
          { heureDebut: '05h03', heureFin: '14h38' },
          { heureDebut: '14h52', heureFin: '23h04' }
        ]
      },
      {
        nom: 'Retour (SAM)',
        direction: 'Corbeil-Essonnes (Gare E. Zola) → Saint-Michel-sur-Orge (Rue Berlioz)',
        jours: 'S',
        services: [
          { heureDebut: '05h49', heureFin: '15h16' },
          { heureDebut: '15h23', heureFin: '23h27' }
        ]
      },

      // ===================== DIMANCHE & FÉRIÉS =====================
      {
        nom: 'Aller (DIMFER)',
        direction: 'Saint-Michel-sur-Orge (Rue Berlioz) → Corbeil-Essonnes (Gare E. Zola)',
        jours: 'D',
        services: [
          { heureDebut: '08h00', heureFin: '16h30' },
          { heureDebut: '16h45', heureFin: '00h22' }
        ]
      },
      {
        nom: 'Retour (DIMFER)',
        direction: 'Corbeil-Essonnes (Gare E. Zola) → Saint-Michel-sur-Orge (Rue Berlioz)',
        jours: 'D',
        services: [
          { heureDebut: '08h15', heureFin: '17h00' },
          { heureDebut: '17h15', heureFin: '23h55' }
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
  const heures = String(parseInt(match[1], 10)).padStart(2, '0');
  const minutes = String(parseInt(match[2] || '0', 10)).padStart(2, '0');
  return `${heures}:${minutes}`;
}

/**
 * Parse les jours de fonctionnement (ex: "L; M; M; J; V") en objet booléen
 * ⚠️ Gestion spéciale des deux "M" pour Mardi + Mercredi.
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

  const joursArray = joursStr.split(';').map(j => j.trim().toUpperCase());

  let mCount = 0;
  for (const jour of joursArray) {
    if (jour === 'L') jours.lundi = true;
    else if (jour === 'M') {
      mCount++;
      if (mCount === 1) jours.mardi = true;
      else if (mCount === 2) jours.mercredi = true;
    } else if (jour === 'J') jours.jeudi = true;
    else if (jour === 'V') jours.vendredi = true;
    else if (jour === 'S') jours.samedi = true;
    else if (jour === 'D') jours.dimanche = true;
  }

  return jours;
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
  const dayOfWeek = today.getDay(); // 0 = dimanche
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysToMonday);
  monday.setHours(0, 0, 0, 0);

  const calendarOrder = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

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

  let totalUpserted = 0;
  let totalServices = 0;
  const errors = [];

  try {
    for (const ligneData of LIGNES_DATA) {
      console.log(`📍 Traitement de la ligne ${ligneData.numero} (${ligneData.nom})...`);

      try {
        // 1) Upsert ligne (on ÉCRASE bien les champs)
        const ligne = await prisma.ligne.upsert({
          where: { numero: ligneData.numero },
          create: {
            numero: ligneData.numero,
            nom: ligneData.nom,
            typesVehicules: JSON.stringify([ligneData.type]),
            heureDebut: parseHeure(ligneData.heureDebut),
            heureFin: parseHeure(ligneData.heureFin),
            calendrierJson: JSON.stringify(parseJours(ligneData.jours)),
            statut: 'Actif'
          },
          update: {
            nom: ligneData.nom,
            typesVehicules: JSON.stringify([ligneData.type]),
            heureDebut: parseHeure(ligneData.heureDebut),
            heureFin: parseHeure(ligneData.heureFin),
            calendrierJson: JSON.stringify(parseJours(ligneData.jours)),
            statut: 'Actif'
          }
        });

        console.log(`   ✓ Ligne upsert: ${ligne.id}`);
        totalUpserted++;

        // 2) Traiter les sens (SEMAINE/SAM/DIMFER)
        for (const sensData of ligneData.sens) {
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
              statut: 'Actif'
            },
            update: {
              direction: sensData.direction || null,
              statut: 'Actif'
            }
          });

          console.log(`   ✓ Sens upsert: ${sens.nom}`);

          // 3) Créer les services pour CE sens, selon son calendrier (sinon hérite de la ligne)
          const calendrier = parseJours(sensData.jours || ligneData.jours);
          const serviceDates = generateServiceDates(calendrier);

          for (const serviceData of sensData.services || []) {
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
                    statut: 'Planifiée'
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
    console.log('\n' + '='.repeat(60));
    console.log('✨ IMPORT TERMINÉ');
    console.log('='.repeat(60));
    console.log(`📊 Lignes upsert: ${totalUpserted}`);
    console.log(`🚌 Services créés: ${totalServices}`);
    console.log(`⚠️  Erreurs: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n❌ Erreurs rencontrées:');
      errors.forEach(err => console.log(`   - ${err}`));
    }

    console.log('\n✅ Les données sont maintenant disponibles sur le planning !');
  } catch (error) {
    console.error('\n💥 Erreur fatale:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// ==================== RUN ====================

importLignes();
