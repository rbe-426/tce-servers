#!/usr/bin/env node

/**
 * Script d'import direct des lignes dans la BD
 * Utilise Prisma pour injecter directement
 * Évite les doublons et les erreurs de parsing CSV
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ==================== DONNÉES À IMPORTER ====================
// Copiées directement du CSV, formatées pour l'import
const LIGNES_DATA = [
  {
    numero: '4201',
    nom: 'SEMAINE_4201',
    type: 'autobus',
    jours: 'L; M; M; J; V',
    heureDebut: '04h37',
    heureFin: '00h10',
    contraintes: ['Jours ouvrables'],  // Contraintes d'exploitation
    sens: [
      {
        nom: 'Aller',
        direction: 'Gare SNCF → Centre Ville',
        services: [
          { heureDebut: '06h30', heureFin: '14h00' },
          { heureDebut: '14h30', heureFin: '22h45' }
        ]
      },
      {
        nom: 'Retour',
        direction: 'Centre Ville → Gare SNCF',
        services: [
          { heureDebut: '07h00', heureFin: '15h00' },
          { heureDebut: '15h30', heureFin: '23h00' }
        ]
      }
    ]
  },
  {
    numero: '4202',
    nom: 'SEMAINE_4202',
    type: 'autobus',
    jours: 'L; M; M; J; V',
    heureDebut: '05h15',
    heureFin: '01h30',
    contraintes: ['Jours ouvrables'],
    sens: [
      {
        nom: 'Aller',
        direction: 'Gare SNCF → Mairie',
        services: [
          { heureDebut: '06h00', heureFin: '14h15' },
          { heureDebut: '14h45', heureFin: '23h00' }
        ]
      },
      {
        nom: 'Retour',
        direction: 'Mairie → Gare SNCF',
        services: [
          { heureDebut: '07h30', heureFin: '15h30' },
          { heureDebut: '16h00', heureFin: '23h30' }
        ]
      }
    ]
  },
  {
    numero: '4203',
    nom: 'WEEKEND_4203',
    type: 'minibus',
    jours: 'S; D',
    heureDebut: '08h00',
    heureFin: '22h00',
    contraintes: ['Week-end et jours fériés'],
    sens: [
      {
        nom: 'Aller',
        direction: 'Parc → Plage',
        services: [
          { heureDebut: '09h00', heureFin: '17h00' }
        ]
      }
    ]
  },
  {
    numero: 'C',
    nom: 'LIGNE_C',
    type: 'autocar',
    jours: 'L; M; M; J; V',
    heureDebut: '06h00',
    heureFin: '23h00',
    contraintes: ['Aéroport', 'Priorité conducteurs'],
    sens: [
      {
        nom: 'Aller',
        direction: 'Centre → Aéroport',
        services: [
          { heureDebut: '06h30', heureFin: '14h00' },
          { heureDebut: '14h30', heureFin: '22h00' }
        ]
      },
      {
        nom: 'Retour',
        direction: 'Aéroport → Centre',
        services: [
          { heureDebut: '07h00', heureFin: '15h00' },
          { heureDebut: '15h30', heureFin: '23h00' }
        ]
      }
    ]
  },
  {
    numero: '15',
    nom: 'LIGNE_15',
    type: 'autobus',
    jours: 'L; M; M; J; V; S',
    heureDebut: '04h30',
    heureFin: '00h45',
    contraintes: ['Samedi compris'],
    sens: [
      {
        nom: 'Aller',
        direction: 'Gare → Marché',
        services: [
          { heureDebut: '05h00', heureFin: '13h00' },
          { heureDebut: '13h30', heureFin: '21h00' }
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

  const joursArray = joursStr.split(';').map(j => j.trim().toUpperCase());
  const mapping = {
    'L': 'lundi',
    'M': 'mardi',
    'M': 'mercredi',
    'J': 'jeudi',
    'V': 'vendredi',
    'S': 'samedi',
    'D': 'dimanche'
  };

  // Gestion spéciale pour les trois M (lundi, mardi, mercredi)
  let mCount = 0;
  for (const jour of joursArray) {
    if (jour === 'L') jours.lundi = true;
    else if (jour === 'M') {
      mCount++;
      if (mCount === 1) jours.mardi = true;
      else if (mCount === 2) jours.mercredi = true;
    }
    else if (jour === 'J') jours.jeudi = true;
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
  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysToMonday);
  monday.setHours(0, 0, 0, 0);

  // Mapper les jours du calendrier aux índices (0 = lundi, 6 = dimanche)
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
  console.log('🚀 Démarrage de l\'import des lignes...\n');

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
            contraintes: JSON.stringify(ligneData.contraintes || []),  // Ajouter les contraintes
            statut: 'Actif'
          },
          update: {
            contraintes: JSON.stringify(ligneData.contraintes || []),  // Mettre à jour les contraintes
            statut: 'Actif'
          }
        });

        console.log(`   ✓ Ligne trouvée/créée: ${ligne.id}`);
        totalCreated++;

        // 2. Traiter les sens
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

          console.log(`   ✓ Sens créé: ${sens.nom}`);

          // 3. Créer les services pour ce sens
          const calendrier = parseJours(ligneData.jours);
          const serviceDates = generateServiceDates(calendrier);

          for (const serviceData of sensData.services) {
            const heureDebut = parseHeure(serviceData.heureDebut);
            const heureFin = parseHeure(serviceData.heureFin);

            if (!heureDebut || !heureFin) {
              errors.push(`Service ignoré pour ${ligneData.numero} ${sensData.nom}: heures invalides`);
              continue;
            }

            // Créer un service par date
            for (const serviceDate of serviceDates) {
              // Vérifier si ce service exacte existe déjà
              // (même ligne, même sens, même date, mêmes heures)
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
    console.log(`📊 Lignes créées: ${totalCreated}`);
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
