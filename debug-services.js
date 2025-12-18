import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('Testing database connection...');
    const count = await prisma.service.count();
    console.log('✅ Total services:', count);
    
    console.log('\nTrying to fetch minimal fields...');
    const services = await prisma.service.findMany({
      select: { id: true, ligneId: true, date: true },
      take: 5
    });
    console.log('✅ Sample services:', services);
    
    console.log('\nTrying with heureDebut field...');
    const servicesWithTime = await prisma.service.findMany({
      select: { id: true, heureDebut: true },
      take: 3
    });
    console.log('✅ Sample services with heureDebut:', servicesWithTime);
    
  } catch (e) {
    console.error('❌ Error:', e.message);
    console.error('Stack:', e.stack);
  } finally {
    await prisma.$disconnect();
  }
})();
