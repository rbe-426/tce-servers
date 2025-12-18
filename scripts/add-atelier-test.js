import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:tGRELPCEaRlfotvCVETysTCzRPVihCHT@turntable.proxy.rlwy.net:24702/railway',
    },
  },
});

async function addTestAtelierVehicles() {
  try {
    console.log('📝 Ajout de véhicules en atelier pour test...');

    // Créer quelques véhicules avec différents statuts
    const testVehicles = [
      { parc: '999', immat: 'TEST-999', type: 'TCP - Autobus Standard', modele: 'Test', statut: 'Aux Ateliers', km: 100000, tauxSante: 50 },
      { parc: '998', immat: 'TEST-998', type: 'TCP - Autobus articulé', modele: 'Test', statut: 'Au CT', km: 150000, tauxSante: 30 },
      { parc: '997', immat: 'TEST-997', type: 'TCP - Midibus', modele: 'Test', statut: 'Indisponible', km: 200000, tauxSante: 20 },
      { parc: '996', immat: 'TEST-996', type: 'TCP - Autobus Standard', modele: 'Test', statut: 'Entretien', km: 80000, tauxSante: 70 },
    ];

    for (const v of testVehicles) {
      try {
        await prisma.vehicle.create({ data: v });
        console.log(`✅ ${v.parc} (${v.statut}) créé`);
      } catch (err) {
        console.log(`⚠️  ${v.parc} existe déjà`);
      }
    }

    console.log('\n✅ Véhicules d\'atelier ajoutés');
    
  } catch (err) {
    console.error('❌ Erreur:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

addTestAtelierVehicles();
