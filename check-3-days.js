import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

for (const dateStr of ['2025-12-19', '2025-12-20', '2025-12-21']) {
  const date = new Date(dateStr);
  const dayName = date.toLocaleDateString('fr-FR', {weekday: 'long'});
  
  const count = await p.service.count({
    where: {
      date: {
        gte: new Date(dateStr + 'T00:00:00Z'),
        lt: new Date(dateStr + 'T23:59:59Z')
      }
    }
  });
  
  const services = await p.service.findMany({
    where: {
      date: {
        gte: new Date(dateStr + 'T00:00:00Z'),
        lt: new Date(dateStr + 'T23:59:59Z')
      }
    },
    include: {
      sens: true,
      ligne: { select: { numero: true } }
    },
    take: 3
  });
  
  console.log(`\n${dateStr} (${dayName}): ${count} services`);
  services.forEach(s => {
    console.log(`  - ${s.ligne.numero} ${s.sens.nom} (${s.sens.jourFonctionnement})`);
  });
}

await p.$disconnect();
