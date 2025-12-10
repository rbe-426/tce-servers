import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.vehicle.upsert({
    where: { parc: '426' },
    update: {},
    create: {
      parc: '426',
      type: 'Bus',
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
