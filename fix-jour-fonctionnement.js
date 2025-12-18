import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixJourFonctionnement() {
  console.log("🔧 Correction des jourFonctionnement\n");

  try {
    const allSens = await prisma.sens.findMany();

    for (const sens of allSens) {
      let jour = 'SEMAINE'; // Défaut
      
      // Déterminer basé sur le NOM
      const nom = sens.nom.toLowerCase();
      
      if (nom.includes('samedi')) {
        jour = 'SAMEDI';
      } else if (nom.includes('dimanche') || nom.includes('ferié') || nom.includes('feries')) {
        jour = 'DIMANCHE_FERIES';
      } else {
        jour = 'SEMAINE';
      }
      
      // Mettre à jour
      const updated = await prisma.sens.update({
        where: { id: sens.id },
        data: { jourFonctionnement: jour }
      });
      
      console.log(`  ${sens.nom}: ${jour}`);
    }

    console.log(`\n✅ ${allSens.length} sens mis à jour`);

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixJourFonctionnement();
