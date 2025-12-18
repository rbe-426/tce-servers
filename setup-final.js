#!/usr/bin/env node

/**
 * SCRIPT FINAL - Service generation correcte
 * 1. Import les lignes (sans créer les services)
 * 2. Puis génère les services templates UNE FOIS
 * 3. Puis génère les instances pour 1 mois avec les bonnes dates
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function setup() {
  console.log("🚀 SETUP FINAL - Services Corrects\n");

  try {
    // 1. Supprimer TOUS les services
    const dels = await prisma.service.deleteMany({});
    console.log(`1️⃣  ${dels.count} services supprimés\n`);

    // 2. Récupérer les lignes et sens
    const lignes = await prisma.ligne.findMany({
      include: { sens: true }
    });

    console.log(`2️⃣  ${lignes.length} lignes trouvées\n`);

    // 3. Pour CHAQUE sens, créer une instance template UNE FOIS
    let templateCount = 0;

    for (const ligne of lignes) {
      for (const sens of ligne.sens) {
        // Créer UNE seule instance qui servira de template
        // Elle sera associée à une date de référence
        const referenceDate = new Date('2025-12-15'); // Lundi 15 déc

        // Créer un service "template" avec les heures du template
        // Les données des heures sont déjà dans les premiers services du sens
        // Si aucun service, créer un par défaut
        
        try {
          await prisma.service.create({
            data: {
              ligneId: sens.ligneId,
              sensId: sens.id,
              date: referenceDate,
              heureDebut: '09:00',
              heureFin: '17:00',
              statut: 'Planifiée'
            }
          });
          templateCount++;
        } catch (e) {
          // Ignorer les doublons
        }
      }
    }

    console.log(`3️⃣  ${templateCount} templates créés\n`);

    // 4. Générer les instances pour 1 mois selon le jourFonctionnement
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + 1);

    let instanceCount = 0;

    for (const ligne of lignes) {
      for (const sens of ligne.sens) {
        const jourFonctionnement = sens.jourFonctionnement || 'SEMAINE';
        
        const currentDate = new Date(today);
        
        while (currentDate <= endDate) {
          const dayOfWeek = currentDate.getDay(); // 0=dim, 1=lun, ..., 6=sam
          
          let shouldInclude = false;
          
          if (jourFonctionnement === 'SEMAINE' && dayOfWeek >= 1 && dayOfWeek <= 5) {
            shouldInclude = true;
          } else if (jourFonctionnement === 'SAMEDI' && dayOfWeek === 6) {
            shouldInclude = true;
          } else if (jourFonctionnement === 'DIMANCHE_FERIES' && dayOfWeek === 0) {
            shouldInclude = true;
          }
          
          if (shouldInclude) {
            try {
              await prisma.service.create({
                data: {
                  ligneId: sens.ligneId,
                  sensId: sens.id,
                  date: new Date(currentDate),
                  heureDebut: '09:00',
                  heureFin: '17:00',
                  statut: 'Planifiée'
                }
              });
              instanceCount++;
            } catch (e) {
              // Ignorer les doublons
            }
          }
          
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
    }

    console.log(`4️⃣  ${instanceCount} instances créées pour 1 mois\n`);
    console.log("=".repeat(60));
    console.log(`✅ SETUP RÉUSSI`);
    console.log("=".repeat(60));
    console.log(`📊 Total services: ${templateCount + instanceCount}`);

  } catch (error) {
    console.error("\n💥 Erreur:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setup();
