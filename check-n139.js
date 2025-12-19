import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  const services = await prisma.service.findMany({
    where: { ligne: { numero: 'N139' } },
    include: { ligne: true, sens: true },
    take: 5
  });
  console.log(JSON.stringify(services, null, 2));
  await prisma.$disconnect();
})();
