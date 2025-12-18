import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:tGRELPCEaRlfotvCVETysTCzRPVihCHT@turntable.proxy.rlwy.net:24702/railway',
    },
  },
});

async function test() {
  try {
    const services = await prisma.service.findMany({ take: 5 });

    console.log(`Total services: ${await prisma.service.count()}`);
    console.log('\nPremiers services:');
    
    for (const s of services) {
      console.log(`  ID: ${s.id}`);
      console.log(`  sensId: ${s.sensId}`);
      console.log(`  ligneId: ${s.ligneId}`);
      console.log(`  date: ${s.date}`);
      console.log('');
    }
  } catch (err) {
    console.error('Erreur:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
