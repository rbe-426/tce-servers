import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  try {
    const sensCount = await prisma.sens.count();
    const lignesCount = await prisma.ligne.count();
    const servicesCount = await prisma.service.count();
    
    console.log('📊 Database stats:');
    console.log('  Lignes:', lignesCount);
    console.log('  Sens (directions):', sensCount);
    console.log('  Services:', servicesCount);
    
    // Check average services per sense
    if (sensCount > 0) {
      console.log('  Average services per sense:', (servicesCount / sensCount).toFixed(2));
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
