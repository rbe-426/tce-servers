import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

(async () => {
  const updated = await p.vehicle.update({
    where: { parc: '232035' },
    data: { statut: 'Disponible' }
  });
  
  console.log('✅ Autocar 232035 updated:');
  console.log(`  Statut: ${updated.statut}`);
  console.log(`  Type: ${updated.type}`);
  
  await p.$disconnect();
})();
