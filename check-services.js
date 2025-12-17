import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  try {
    const services = await prisma.service.findMany({ 
      take: 5,
      include: { conducteur: true, ligne: true }
    });
    console.log('Services found:', services.length);
    services.forEach(s => {
      console.log(`- Service ID: ${s.id}, Ligne: ${s.ligne?.numero}, Conducteur: ${s.conducteur?.prenom || 'NULL'}`);
    });
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
