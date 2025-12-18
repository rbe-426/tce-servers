const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkServices() {
  try {
    // Vérifier pour le 19 décembre 2025
    const date = new Date('2025-12-19T00:00:00Z');
    console.log('Vérification pour la date:', date.toISOString());
    
    const count = await prisma.service.count({
      where: {
        date: {
          gte: new Date('2025-12-19T00:00:00Z'),
          lt: new Date('2025-12-20T00:00:00Z')
        }
      }
    });
    
    console.log('Services pour 19 déc:', count);
    
    if (count > 0) {
      const services = await prisma.service.findMany({
        where: {
          date: {
            gte: new Date('2025-12-19T00:00:00Z'),
            lt: new Date('2025-12-20T00:00:00Z')
          }
        },
        include: { ligne: true, sens: true },
        take: 5
      });
      
      console.log('\n5 premiers services:');
      services.forEach(s => {
        console.log(`  - ${s.ligne.numero} ${s.sens.nom} ${s.heureDebut}-${s.heureFin}`);
      });
    }
    
    // Vérifier le total de services en base
    const total = await prisma.service.count();
    console.log('\nTotal services en base:', total);
    
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkServices();
