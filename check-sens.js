import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  try {
    const sens = await prisma.sens.findMany({ 
      take: 15,
      include: { ligne: true }
    });
    console.log(`Sens trouvés: ${sens.length}`);
    sens.forEach(s => {
      console.log(`- ${s.ligne.numero}: ${s.nom} → ${s.jourFonctionnement}`);
    });
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
