import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixCalendars() {
  console.log("🔧 Correction des calendriers des lignes\n");

  try {
    const lignes = await prisma.ligne.findMany({
      include: { sens: true }
    });

    for (const ligne of lignes) {
      // Déterminer quels jours cette ligne fonctionne
      const joursSet = new Set();
      
      for (const sens of ligne.sens) {
        if (sens.jourFonctionnement === 'SEMAINE') {
          joursSet.add('lundi');
          joursSet.add('mardi');
          joursSet.add('mercredi');
          joursSet.add('jeudi');
          joursSet.add('vendredi');
        } else if (sens.jourFonctionnement === 'SAMEDI') {
          joursSet.add('samedi');
        } else if (sens.jourFonctionnement === 'DIMANCHE_FERIES') {
          joursSet.add('dimanche');
        }
      }

      // Créer le calendrier
      const calendar = {
        lundi: joursSet.has('lundi'),
        mardi: joursSet.has('mardi'),
        mercredi: joursSet.has('mercredi'),
        jeudi: joursSet.has('jeudi'),
        vendredi: joursSet.has('vendredi'),
        samedi: joursSet.has('samedi'),
        dimanche: joursSet.has('dimanche')
      };

      await prisma.ligne.update({
        where: { id: ligne.id },
        data: { calendrierJson: JSON.stringify(calendar) }
      });

      console.log(`  ${ligne.numero}: ${Object.entries(calendar).filter(([_, v]) => v).map(([k]) => k).join(', ')}`);
    }

    console.log(`\n✅ ${lignes.length} calendriers mis à jour`);

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCalendars();
