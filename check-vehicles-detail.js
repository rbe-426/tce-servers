import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

(async () => {
  try {
    // Vérifier les véhicules
    const vehicleCount = await prisma.vehicle.count();
    console.log(`📊 Total véhicules: ${vehicleCount}`);
    
    // Vérifier le parc 1004
    const v1004 = await prisma.vehicle.findUnique({
      where: { parc: '1004' },
      include: { etablissement: true }
    });
    
    if (v1004) {
      console.log(`✅ Parc 1004 trouvé:`);
      console.log(`   Type: ${v1004.type}`);
      console.log(`   Modèle: ${v1004.modele}`);
      console.log(`   Statut: ${v1004.statut}`);
      console.log(`   Établissement: ${v1004.etablissement?.nom || 'Aucun'}`);
    } else {
      console.log(`❌ Parc 1004 NON TROUVÉ`);
    }
    
    // Vérifier quelques autres
    const some = await prisma.vehicle.findMany({ take: 5, select: { parc: true, type: true, statut: true } });
    console.log(`\n📋 Premiers véhicules:`);
    some.forEach(v => console.log(`   - ${v.parc}: ${v.type} (${v.statut})`));
    
  } catch (e) {
    console.error('❌ Erreur:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
