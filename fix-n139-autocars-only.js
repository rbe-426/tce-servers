import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

(async () => {
  const updated = await p.ligne.update({
    where: { numero: 'N139' },
    data: {
      typesVehicules: JSON.stringify(['TCP - Autocars BC/NOC/EXPRESS'])
    }
  });
  
  console.log('✅ N139 updated - Autocars only:');
  console.log(`  Types: ${JSON.parse(updated.typesVehicules).join(', ')}`);
  
  await p.$disconnect();
})();
