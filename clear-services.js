import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function clearServices() {
  try {
    console.log('🗑️  Suppression de tous les services...');
    
    const deleted = await prisma.service.deleteMany();
    
    console.log(`✅ ${deleted.count} services supprimés`);
    console.log('✅ Base de données nettoyée!');
    
  } catch (e) {
    console.error('❌ Erreur:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearServices();
