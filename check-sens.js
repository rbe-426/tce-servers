import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  try {
    const sens = await prisma.sens.findMany({ 
      take: 15,
      select: {
        id: true,
        nom: true,
        ligne: { select: { numero: true } },
        heureDebut: true,
        heureFin: true,
        jourFonctionnement: true
      }
    });
    console.log(`📍 Sens trouvés: ${sens.length}`);
    sens.forEach(s => {
      console.log(`- ${s.ligne.numero} ${s.nom}: ${s.heureDebut}-${s.heureFin} (${s.jourFonctionnement})`);
    });
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
