#!/usr/bin/env node
/**
 * Supprime COMPLÈTEMENT tous les services et sens de TOUTES les lignes
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanAll() {
  console.log("🧹 NETTOYAGE COMPLET DE TOUTES LES LIGNES\n");

  try {
    // Récupère TOUTES les lignes existantes
    const allLignes = await prisma.ligne.findMany({
      select: { id: true, numero: true }
    });

    console.log(`📊 Nombre total de lignes: ${allLignes.length}\n`);

    let totalServicesDeleted = 0;
    let totalSensDeleted = 0;

    for (const ligne of allLignes) {
      console.log(`📍 Ligne ${ligne.numero}:`);

      // 1) Compte les services
      const serviceCount = await prisma.service.count({
        where: { ligneId: ligne.id }
      });
      console.log(`   📊 Services actuels: ${serviceCount}`);

      // 2) Supprime les services
      if (serviceCount > 0) {
        const deletedServices = await prisma.service.deleteMany({
          where: { ligneId: ligne.id }
        });
        console.log(`   🗑️  Services supprimés: ${deletedServices.count}`);
        totalServicesDeleted += deletedServices.count;
      }

      // 3) Compte les sens
      const sensList = await prisma.sens.findMany({
        where: { ligneId: ligne.id }
      });
      console.log(`   📊 Sens actuels: ${sensList.length}`);

      // 4) Supprime les sens
      if (sensList.length > 0) {
        const deletedSens = await prisma.sens.deleteMany({
          where: { ligneId: ligne.id }
        });
        console.log(`   🗑️  Sens supprimés: ${deletedSens.count}`);
        totalSensDeleted += deletedSens.count;
      }

      // 5) Vérification finale
      const finalServiceCount = await prisma.service.count({
        where: { ligneId: ligne.id }
      });
      const finalSensCount = await prisma.sens.count({
        where: { ligneId: ligne.id }
      });

      console.log(`   ✅ État final: ${finalSensCount} sens, ${finalServiceCount} services\n`);
    }

    console.log("=".repeat(60));
    console.log("✨ NETTOYAGE TERMINÉ");
    console.log("=".repeat(60));
    console.log(`📊 Total services supprimés: ${totalServicesDeleted}`);
    console.log(`📊 Total sens supprimés: ${totalSensDeleted}`);
    console.log("🚀 PRÊT POUR NOUVEL IMPORT\n");
  } catch (e) {
    console.error("💥 Erreur:", e);
  } finally {
    await prisma.$disconnect();
  }
}

cleanAll();
