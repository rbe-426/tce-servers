import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

(async () => {
  // Chercher les autocars
  const autocars = await p.vehicle.findMany({
    where: { type: { contains: 'Autocar' } },
    select: { parc: true, type: true, statut: true },
    take: 5
  });
  
  console.log('Autocars en BD:');
  autocars.forEach(a => console.log(`  ${a.parc} - ${a.type} (${a.statut})`));
  
  // Vérifier N139
  const n139 = await p.ligne.findUnique({
    where: { numero: 'N139' },
    select: { numero: true, nom: true, typesVehicules: true }
  });
  
  console.log('\nN139 configuration:');
  if (n139) {
    console.log(`  Ligne: ${n139.numero} - ${n139.nom}`);
    console.log(`  Types autorisés:`, JSON.parse(n139.typesVehicules || '[]'));
  } else {
    console.log('  N139 NOT FOUND');
  }
  
  await p.$disconnect();
})();
