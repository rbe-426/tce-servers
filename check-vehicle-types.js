import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

(async () => {
  const types = await p.vehicle.groupBy({
    by: ['type'],
    _count: true
  });
  console.log('Vehicle types in DB:');
  types.forEach(t => console.log(`  ${t.type}: ${t._count} vehicles`));
  await p.$disconnect();
})();
