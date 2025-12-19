import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

(async () => {
  const v = await p.vehicle.count();
  const all = await p.vehicle.findMany({ take: 5 });
  console.log('Total véhicules:', v);
  if (all.length > 0) {
    console.log('Premiers:');
    all.forEach(vv => console.log(`  - ${vv.immat || vv.parc} (${vv.type})`));
  } else {
    console.log('❌ Aucun véhicule!');
  }
  await p.$disconnect();
})();
