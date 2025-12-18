import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:tGRELPCEaRlfotvCVETysTCzRPVihCHT@turntable.proxy.rlwy.net:24702/railway',
    },
  },
});

async function fixServices() {
  try {
    console.log('🔧 Reconstruction des liens services ↔ sens en prod...');

    // Récupérer les lignes avec sens et services
    const lignes = await prisma.ligne.findMany({
      include: {
        sens: {
          include: {
            services: true
          }
        }
      }
    });

    let fixedCount = 0;
    for (const ligne of lignes) {
      for (const sens of ligne.sens) {
        const serviceCount = sens.services.length;
        
        if (serviceCount === 0) {
          console.log(`⚠️  ${ligne.numero} - ${sens.nom}: 0 services`);
        } else {
          console.log(`✅ ${ligne.numero} - ${sens.nom}: ${serviceCount} services`);
          fixedCount += serviceCount;
        }
      }
    }

    console.log(`\n📊 Total: ${fixedCount} services correctement liés`);

    if (fixedCount === 0) {
      console.log('\n⚠️  AUCUN SERVICE LIÉ! Les services existent mais ne sont pas rattachés aux sens.');
      console.log('Vérifier si les sensId des services existent vraiment...');
      
      const orphanServices = await prisma.service.findMany({
        where: {
          sensId: null
        }
      });
      
      if (orphanServices.length > 0) {
        console.log(`\n❌ ${orphanServices.length} services sans sensId!`);
      }
    }

  } catch (err) {
    console.error('❌ Erreur:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixServices();
