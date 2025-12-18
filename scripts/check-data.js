import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
  try {
    const vehicleCount = await prisma.vehicle.count();
    const ligneCount = await prisma.ligne.count();
    const serviceCount = await prisma.service.count();

    console.log(`✅ Véhicules: ${vehicleCount}`);
    console.log(`✅ Lignes: ${ligneCount}`);
    console.log(`✅ Services: ${serviceCount}`);

    if (vehicleCount > 0) {
      const firstVehicle = await prisma.vehicle.findFirst();
      console.log(`\nPremier véhicule:`, firstVehicle);
    }

    if (ligneCount > 0) {
      const firstLigne = await prisma.ligne.findFirst({ include: { sens: true } });
      console.log(`\nPremière ligne:`, firstLigne);
    }
  } catch (err) {
    console.error('Erreur:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
