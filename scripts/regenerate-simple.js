#!/usr/bin/env node

/**
 * Script SIMPLE de régénération des services
 * 1. Charge les 230 templates (import-lignes-direct.js)
 * 2. Génère les instances pour 1 mois avec les bonnes dates
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function regenerateSimple() {
  console.log("🚀 RÉGÉNÉRATION SIMPLE DES SERVICES\n");

  try {
    // 1. Récupérer tous les sens avec leurs templates
    const allSens = await prisma.sens.findMany({
      include: {
        ligne: true,
        services: true
      }
    });

    console.log(`📊 ${allSens.length} sens trouvés\n`);

    // 2. Supprimer TOUS les services en masse
    const deleted = await prisma.service.deleteMany({});
    console.log(`🗑️  ${deleted.count} anciens services supprimés\n`);

    // 3. Générer les dates pour 1 mois
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + 1);

    // 4. Créer les nouveaux services
    let totalCreated = 0;
    const servicesToCreate = [];

    for (const sens of allSens) {
      const jourFonctionnement = sens.jourFonctionnement || 'SEMAINE';
      const templates = sens.services;
      
      if (templates.length === 0) continue;

      console.log(`📍 ${sens.ligne.numero} - ${sens.nom} (${jourFonctionnement}) | ${templates.length} templates`);

      // Pour chaque jour du mois
      const currentDate = new Date(today);
      let dayCount = 0;
      
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
          dayCount++;
          // Ajouter une instance de chaque template pour ce jour
          for (const template of templates) {
            servicesToCreate.push({
              ligneId: sens.ligneId,
              sensId: sens.id,
              date: new Date(currentDate),
              heureDebut: template.heureDebut,
              heureFin: template.heureFin,
              statut: "Planifiée"
            });
          }
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      console.log(`   ✓ ${dayCount} jours × ${templates.length} templates = ${dayCount * templates.length} services`);
    }

    // Créer tous les services en une seule requête
    console.log(`\n✨ Création en masse de ${servicesToCreate.length} services...`);
    const created = await prisma.service.createMany({
      data: servicesToCreate,
      skipDuplicates: true
    });
    totalCreated = created.count;

    // Résumé
    console.log("\n" + "=".repeat(60));
    console.log("✅ RÉGÉNÉRATION RÉUSSIE");
    console.log("=".repeat(60));
    console.log(`📊 Services créés: ${totalCreated}`);
    console.log("\n💡 Filtrage par jour:");
    console.log("   • Lundi-Vendredi: Services SEMAINE");
    console.log("   • Samedi: Services SAMEDI");
    console.log("   • Dimanche: Services DIMANCHE_FERIES");

  } catch (error) {
    console.error("\n💥 Erreur:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

regenerateSimple();
