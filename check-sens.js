import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  try {
    const sens = await prisma.sens.findMany({
      include: { ligne: { select: { numero: true } } },
      orderBy: [{ ligne: { numero: 'asc' } }, { ordre: 'asc' }]
    });

    console.log('📋 SENS ACTUELS:');
    console.log('='.repeat(80));
    
    sens.forEach(s => {
      console.log(`Ligne ${s.ligne.numero.padEnd(5)} | Nom: "${s.nom}" | jourFonctionnement: "${s.jourFonctionnement}"`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log(`Total: ${sens.length} sens`);
  } catch (e) {
    console.error('❌ Erreur:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
