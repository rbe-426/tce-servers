import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

(async () => {
  try {
    const deleted = await prisma.service.deleteMany({});
    console.log(`✅ ${deleted.count} services supprimés`);
    
    const remaining = await prisma.service.count();
    console.log(`📊 Services restants: ${remaining}`);
  } catch (e) {
    console.error('❌ Erreur:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
