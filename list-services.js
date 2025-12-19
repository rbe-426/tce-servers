import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  const services = await prisma.service.findMany({
    where: { ligne: { numero: 'N139' } },
    select: { date: true, heureDebut: true, sens: { select: { nom: true, jourFonctionnement: true } } },
    orderBy: { date: 'asc' }
  });
  services.forEach(s => {
    const d = new Date(s.date).toISOString().split('T')[0];
    console.log(`${d} ${s.heureDebut} - ${s.sens.nom} (${s.sens.jourFonctionnement})`);
  });
  await prisma.$disconnect();
})();
