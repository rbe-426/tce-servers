import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('Testing actual endpoint query...');
    const services = await prisma.service.findMany({
      include: { ligne: true, conducteur: true },
      orderBy: { date: 'asc' },
      take: 5
    });
    console.log('✅ Query succeeded, count:', services.length);
    console.log('First service:', JSON.stringify(services[0], null, 2));
    
  } catch (e) {
    console.error('❌ Error:', e.message);
    console.error('Full error:', e);
  } finally {
    await prisma.$disconnect();
  }
})();
