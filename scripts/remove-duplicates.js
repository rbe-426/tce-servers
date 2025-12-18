import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:tGRELPCEaRlfotvCVETysTCzRPVihCHT@turntable.proxy.rlwy.net:24702/railway',
    },
  },
});

async function removeDuplicates() {
  try {
    console.log('🗑️  Suppression des doublons...');

    // Grouper les lignes par numero
    const lignes = await prisma.ligne.findMany();
    const grouped = {};

    for (const l of lignes) {
      if (!grouped[l.numero]) {
        grouped[l.numero] = [];
      }
      grouped[l.numero].push(l);
    }

    let deletedCount = 0;

    // Pour chaque numéro de ligne, garder la plus récente et supprimer les autres
    for (const [numero, versions] of Object.entries(grouped)) {
      if (versions.length > 1) {
        console.log(`${numero}: ${versions.length} versions trouvées`);
        
        // Garder la plus récente (par updatedAt)
        const sorted = versions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        const toKeep = sorted[0];
        const toDelete = sorted.slice(1);

        for (const dup of toDelete) {
          console.log(`  Suppression ID: ${dup.id}`);
          
          // Supprimer les services/sens associés
          await prisma.service.deleteMany({ where: { ligneId: dup.id } });
          await prisma.sens.deleteMany({ where: { ligneId: dup.id } });
          await prisma.ligne.delete({ where: { id: dup.id } });
          
          deletedCount++;
        }
      }
    }

    console.log(`\n✅ ${deletedCount} doublons supprimés`);

    // Vérifier le résultat
    const finalCount = await prisma.ligne.count();
    console.log(`Total lignes: ${finalCount}`);

  } catch (err) {
    console.error('❌ Erreur:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

removeDuplicates();
