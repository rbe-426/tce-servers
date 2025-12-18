import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('Testing with include relations...');
    const services = await prisma.service.findMany({
      where: { ligneId: { not: null } },
      include: { ligne: true, conducteur: true },
      take: 3
    });
    console.log('✅ Services with relations:', JSON.stringify(services, null, 2));
    
  } catch (e) {
    console.error('❌ Error with include:', e.message);
    
    // Try without conducteur
    try {
      console.log('\nTrying without conducteur...');
      const services2 = await prisma.service.findMany({
        include: { ligne: true },
        take: 3
      });
      console.log('✅ Services with ligne only:', services2.length);
    } catch (e2) {
      console.error('❌ Error with ligne:', e2.message);
    }
  } finally {
    await prisma.$disconnect();
  }
})();
