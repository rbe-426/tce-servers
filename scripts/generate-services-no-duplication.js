#!/usr/bin/env node

/**
 * Génère les services UNE SEULE FOIS par sens
 * Les services sont filtrés par jour de la semaine selon leur jourFonctionnement
 * Pas de duplication par date - léger sur le serveur
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function generateServicesNoDuplication() {
  console.log("🚀 Génération des services (sans duplication par type, projection 1 mois)...\n");

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

    // Générer les dates pour 1 mois
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + 1);

    for (const sens of allSens) {
      const jourFonctionnement = sens.jourFonctionnement || 'SEMAINE';
      
      console.log(`📍 ${sens.ligne.numero} - ${sens.nom} (${jourFonctionnement})`);

      // Récupérer les services de ce sens qui servent de template
      const templates = sens.services;
      
      if (templates.length === 0) {
        console.log(`   ⚠️  Aucun service template trouvé pour ce sens\n`);
        continue;
      }

      console.log(`   Templates: ${templates.length}`);

      // Supprimer les anciens services
      const deleted = await prisma.service.deleteMany({
        where: {
          sensId: sens.id
        }
      });
      totalDeleted += deleted.count;
      console.log(`   ✓ ${deleted.count} anciens services supprimés`);

      // Créer les nouveaux services pour chaque jour correspondant au jourFonctionnement
      const servicesToCreate = [];
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
          // Pour chaque jour correspondant, créer une instance de chaque template
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
      
      // Créer tous les services en une seule requête
      if (servicesToCreate.length > 0) {
        const created = await prisma.service.createMany({
          data: servicesToCreate,
          skipDuplicates: true
        });
        totalCreated += created.count;
        console.log(`   ✓ ${created.count} nouveaux services créés\n`);
      }
    }

    // Résumé
    console.log("=".repeat(60));
    console.log("✨ GÉNÉRATION TERMINÉE (projection hebdomadaire optimisée)");
    console.log("=".repeat(60));
    console.log(`🗑️  Services supprimés: ${totalDeleted}`);
    console.log(`✅ Services créés: ${totalCreated}`);
    console.log("\n💡 Les services sont générés pour 1 mois et filtrés par jourFonctionnement:");
    console.log("   • Lundi-Vendredi: SEMAINE");
    console.log("   • Samedi: SAMEDI");
    console.log("   • Dimanche/Fériés: DIMANCHE_FERIES");

  } catch (error) {
    console.error("\n💥 Erreur:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

generateServicesNoDuplication();
