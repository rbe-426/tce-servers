#!/usr/bin/env node

/**
 * Script alternatif: Importer depuis un fichier CSV
 * 
 * Usage:
 *   node scripts/import-from-csv.js path/to/file.csv
 * 
 * Format CSV attendu (identique au CSV existant):
 * numéro de ligne,Nom de la ligne,Jours de fonctionnement,type,premier départ,dernier arrivé au dépôt,Sens,Direction,Service 1 Début,Service 1 Fin,Service 2 Début,Service 2 Fin
 * 4201,SEMAINE_4201,L; M; M; J; V,autobus,04h37,00h10,Aller,Gare → Centre,06h30,14h00,14h30,22h45
 * 4201,SEMAINE_4201,L; M; M; J; V,autobus,04h37,00h10,Retour,Centre → Gare,07h00,15h00,15h30,23h00
 */

import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ==================== HELPERS ====================

function parseHeure(heureStr) {
  if (!heureStr) return null;
  const match = heureStr.match(/(\d{1,2})h(\d{2})?/);
  if (!match) return null;
  const heures = String(parseInt(match[1])).padStart(2, '0');
  const minutes = String(parseInt(match[2]) || 0).padStart(2, '0');
  return `${heures}:${minutes}`;
}

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
    }
    else if (jour === 'J') jours.jeudi = true;
    else if (jour === 'V') jours.vendredi = true;
    else if (jour === 'S') jours.samedi = true;
    else if (jour === 'D') jours.dimanche = true;
  }

  return jours;
}

function generateServiceDates(calendrier) {
  const dates = [];
  const today = new Date();
  
  const dayOfWeek = today.getDay();
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

// ==================== CSV PARSING ====================

function parseCSVFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  
  if (lines.length < 2) {
    throw new Error('CSV vide ou invalide');
  }

  // Parser les headers
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  // Parser les données
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row = {};
    
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    
    rows.push(row);
  }

  return rows;
}

function groupLignesByNumero(rows) {
  const grouped = {};
  
  for (const row of rows) {
    const numero = row['numéro de ligne'];
    if (!numero) continue;
    
    if (!grouped[numero]) {
      grouped[numero] = {
        numero,
        nom: row['nom de la ligne'],
        type: row['type'],
        jours: row['jours de fonctionnement'],
        heureDebut: row['premier départ'],
        heureFin: row['dernier arrivé au dépôt'],
        sens: {}
      };
    }
    
    const sensNom = row['sens'] || 'Principal';
    if (!grouped[numero].sens[sensNom]) {
      grouped[numero].sens[sensNom] = {
        nom: sensNom,
        direction: row['direction'] || '',
        services: []
      };
    }
    
    // Extraire les services
    for (let j = 1; j <= 20; j++) {
      const startKey = `service ${j} début`;
      const endKey = `service ${j} fin`;
      const start = row[startKey];
      const end = row[endKey];
      
      if (start && end) {
        grouped[numero].sens[sensNom].services.push({
          heureDebut: start,
          heureFin: end
        });
      }
    }
  }
  
  // Convertir en array
  return Object.values(grouped).map(ligne => ({
    ...ligne,
    sens: Object.values(ligne.sens)
  }));
}

// ==================== IMPORT LOGIC ====================

async function importFromCSV(filePath) {
  console.log(`\n🚀 Importation depuis: ${filePath}\n`);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fichier non trouvé: ${filePath}`);
  }

  try {
    // Parser le CSV
    console.log('📖 Lecture du fichier CSV...');
    const rows = parseCSVFile(filePath);
    console.log(`   ✓ ${rows.length} lignes lues\n`);

    // Grouper par numéro de ligne
    console.log('🔧 Structuration des données...');
    const lignes = groupLignesByNumero(rows);
    console.log(`   ✓ ${lignes.length} ligne(s) identifiée(s)\n`);

    // Importer dans la BD
    console.log('💾 Import en base de données...\n');
    
    let totalCreated = 0;
    let totalServices = 0;
    const errors = [];

    for (const ligneData of lignes) {
      try {
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
          update: { statut: 'Actif' }
        });

        console.log(`📍 Ligne ${ligne.numero} (${ligne.nom})`);
        totalCreated++;

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

          console.log(`   ✓ Sens: ${sens.nom}`);

          const calendrier = parseJours(ligneData.jours);
          const serviceDates = generateServiceDates(calendrier);

          for (const serviceData of sensData.services) {
            const heureDebut = parseHeure(serviceData.heureDebut);
            const heureFin = parseHeure(serviceData.heureFin);

            if (!heureDebut || !heureFin) continue;

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

        console.log(`   ✅ Importée\n`);

      } catch (error) {
        const msg = `Erreur ligne ${ligneData.numero}: ${error.message}`;
        console.error(`   ❌ ${msg}`);
        errors.push(msg);
      }
    }

    // Résumé
    console.log('='.repeat(60));
    console.log('✨ IMPORT TERMINÉ');
    console.log('='.repeat(60));
    console.log(`📊 Lignes créées: ${totalCreated}`);
    console.log(`🚌 Services créés: ${totalServices}`);
    console.log(`⚠️  Erreurs: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Erreurs:');
      errors.forEach(err => console.log(`   - ${err}`));
    }

    console.log('\n✅ Les données sont maintenant disponibles sur le planning !\n');

  } catch (error) {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// ==================== RUN ====================

const filePath = process.argv[2];

if (!filePath) {
  console.error(`\nUsage: node scripts/import-from-csv.js <chemin_vers_fichier.csv>\n`);
  console.error('Exemple:');
  console.error('  node scripts/import-from-csv.js EXEMPLE_IMPORT_LIGNES.csv\n');
  process.exit(1);
}

importFromCSV(filePath);
