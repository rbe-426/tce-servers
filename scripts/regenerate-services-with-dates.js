#!/usr/bin/env node

/**
 * Régénère les services pour les 3 prochains mois
 * Crée des instances pour chaque jour correspondant au jourFonctionnement
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Génère les dates de services pour les 3 prochains mois
 * @param jourFonctionnement "SEMAINE" | "SAMEDI" | "DIMANCHE_FERIES"
 * @returns array de dates au format "YYYY-MM-DD"
 */
function generateServiceDates(jourFonctionnement) {
  const dates = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Générer pour 3 mois
  const endDate = new Date(today);
  endDate.setMonth(endDate.getMonth() + 3);

  const currentDate = new Date(today);
  
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay(); // 0=dim, 1=lun, ..., 6=sam
    
    let shouldInclude = false;
    
    if (jourFonctionnement === 'SEMAINE') {
      // Lundi à vendredi (1-5)
      shouldInclude = dayOfWeek >= 1 && dayOfWeek <= 5;
    } else if (jourFonctionnement === 'SAMEDI') {
      // Samedi (6)
      shouldInclude = dayOfWeek === 6;
    } else if (jourFonctionnement === 'DIMANCHE_FERIES') {
      // Dimanche (0)
      shouldInclude = dayOfWeek === 0;
    }
    
    if (shouldInclude) {
      const dateStr = currentDate.toISOString().split('T')[0];
      dates.push(dateStr);
    }
    
    // Jour suivant
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
}

async function regenerateServices() {
  console.log("🚀 Régénération des services avec dates futures...\n");

  try {
    // 1. Récupérer tous les sens
    const allSens = await prisma.sens.findMany({
      include: {
        ligne: true,
        services: true
      }
    });

    console.log(`📊 ${allSens.length} sens trouvés\n`);

    let totalDeleted = 0;
    let totalCreated = 0;

    for (const sens of allSens) {
      const jourFonctionnement = sens.jourFonctionnement || 'SEMAINE';
      const serviceDates = generateServiceDates(jourFonctionnement);

      console.log(`📍 ${sens.ligne.numero} - ${sens.nom} (${jourFonctionnement})`);
      console.log(`   Dates générées: ${serviceDates.length}`);

      // Récupérer les services de ce sens qui servent de template
      const templates = sens.services;
      
      if (templates.length === 0) {
        console.log(`   ⚠️  Aucun service template trouvé pour ce sens\n`);
        continue;
      }

      // Supprimer les anciens services
      const deleted = await prisma.service.deleteMany({
        where: {
          sensId: sens.id
        }
      });
      totalDeleted += deleted.count;
      console.log(`   ✓ ${deleted.count} anciens services supprimés`);

      // Créer les nouveaux services
      let countCreated = 0;
      for (const date of serviceDates) {
        for (const template of templates) {
          await prisma.service.create({
            data: {
              ligneId: sens.ligneId,
              sensId: sens.id,
              date: new Date(date),
              heureDebut: template.heureDebut,
              heureFin: template.heureFin,
              statut: "Planifiée"
            }
          });
          countCreated++;
        }
      }
      totalCreated += countCreated;
      console.log(`   ✓ ${countCreated} nouveaux services créés\n`);
    }

    // Résumé
    console.log("=".repeat(60));
    console.log("✨ RÉGÉNÉRATION TERMINÉE");
    console.log("=".repeat(60));
    console.log(`🗑️  Services supprimés: ${totalDeleted}`);
    console.log(`✅ Services créés: ${totalCreated}`);
    console.log("\n✨ Les services sont maintenant disponibles pour les 3 prochains mois!");

  } catch (error) {
    console.error("\n💥 Erreur:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

regenerateServices();
