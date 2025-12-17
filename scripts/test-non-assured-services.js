#!/usr/bin/env node

/**
 * Script de test: Marquer certains services comme "Non assuré" avec des motifs
 * Permet de tester les statistiques TC360+
 * 
 * Usage:
 *   node scripts/test-non-assured-services.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testNonAssueredServices() {
  console.log('\n🧪 Test des Services Non Assurés\n');

  try {
    // Récupérer des services d'aujourd'hui
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const services = await prisma.service.findMany({
      where: {
        date: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
      take: 10,
    });

    if (services.length === 0) {
      console.log('❌ Aucun service trouvé pour aujourd\'hui');
      console.log('💡 Astuce: Importez d\'abord les lignes avec: npm run import-lignes\n');
      process.exit(0);
    }

    console.log(`✓ ${services.length} service(s) trouvé(s)`);
    console.log('📝 Marquage de services comme "Non assuré"...\n');

    const motifs = [
      'Absence',
      'Refus pointage',
      'Refus permis/CNI',
      'Absence véhicule',
      'Absence conducteur'
    ];

    // Marquer les services avec différents motifs
    for (let i = 0; i < Math.min(services.length, 5); i++) {
      const service = services[i];
      const motif = motifs[i % motifs.length];
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() - 2); // Expiré il y a 2h

      await prisma.service.update({
        where: { id: service.id },
        data: {
          statut: 'Non assuré',
          motifNonAssurance: motif,
          expirationPointage: expirationDate,
          motifsDetails: `Test - Service marqué non assuré pour test TC360+`
        }
      });

      console.log(`  ✓ Service ${i + 1}: ${motif}`);
    }

    console.log('\n✅ Services marqués comme non assurés!');
    console.log('\n📊 Consultez les statistiques TC360+:');
    console.log('   http://localhost:3001/abribus/tc360-stats\n');

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testNonAssueredServices();
