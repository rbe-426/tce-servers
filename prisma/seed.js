import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Vehicle types: TCP - Autocars BC/NOC/EXPRESS, TCP - Autobus Standard, TCP - Autobus articulé, 
//               TCP - Autobus Standard BHNS, TCP - Autobus articulé BHNS, TCP - Midibus, 
//               TCP - Midibus L (Heuliez), TCP - Minibus

async function main() {
  await prisma.vehicle.upsert({
    where: { parc: '426' },
    update: {},
    create: {
      parc: '426',
      type: 'TCP - Autobus Standard',
      modele: 'MAN A23',
      immat: 'AG-280-XY',
      km: 750000,
      tauxSante: 50,
      statut: 'A VENIR'
    }
  });
}

main()
  .then(() => console.log('Seed OK'))
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
