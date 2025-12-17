import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  try {
    const count = await prisma.conducteur.count();
    console.log('Total conducteurs:', count);
    
    if (count > 0) {
      const conducteurs = await prisma.conducteur.findMany({ take: 3 });
      console.log('Premiers conducteurs:');
      conducteurs.forEach(c => {
        console.log(`- ${c.prenom} ${c.nom} (${c.matricule}) - ID: ${c.id}`);
      });
    } else {
      console.log('Aucun conducteur trouvé. Vous devez en importer.');
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
