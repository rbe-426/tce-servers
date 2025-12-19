import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

(async () => {
  const updated = await p.ligne.update({
    where: { numero: 'N139' },
    data: {
      typesVehicules: JSON.stringify(['TCP - Autocars BC/NOC/EXPRESS', 'TCP - Autobus Standard'])
    }
  });
  
  console.log('✅ N139 updated:');
  console.log(`  Types: ${JSON.parse(updated.typesVehicules).join(', ')}`);
  
  await p.$disconnect();
})();
