import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const prisma = new PrismaClient();

async function initializeCampagnes() {
  try {
    console.log('Initialisation des campagnes ABRIBUS...');

    // Vérifier si les campagnes existent déjà
    const existingCount = await prisma.campagneAbribus.count();
    
    if (existingCount === 0) {
      // Créer les campagnes prédéfinies
      const campagnes = [
        {
          type: 'VERIFICATION_CARROSSERIE',
          nom: 'Relevé Carrosserie',
          description: 'Relevé complet de l\'état de la carrosserie pour tous les véhicules',
          dateDebut: new Date('2026-01-01'),
          dateFin: new Date('2026-02-01'),
          statut: 'EN_COURS'
        },
        {
          type: 'VERIFICATION_CHAUFFAGE',
          nom: 'Vérification Chauffages',
          description: 'Vérification des systèmes de chauffage conducteurs et voyageurs',
          dateDebut: new Date('2026-01-05'),
          dateFin: new Date('2026-02-15'),
          statut: 'EN_COURS'
        },
        {
          type: 'VERIFICATION_SAEIV',
          nom: 'Vérification SAEIV',
          description: 'Contrôle des systèmes de sécurité et d\'accessibilité des véhicules',
          dateDebut: new Date('2026-01-10'),
          dateFin: new Date('2026-02-20'),
          statut: 'EN_COURS'
        }
      ];

      for (const campagne of campagnes) {
        const created = await prisma.campagneAbribus.create({
          data: campagne
        });
        console.log(`✅ Campagne créée: ${created.nom} (${created.id})`);
      }

      console.log('✅ Toutes les campagnes ont été créées avec succès!');
    } else {
      console.log(`ℹ️  ${existingCount} campagne(s) trouvée(s). Pas de création.`);
    }

  } catch (error) {
    console.error('❌ Erreur initialisation campagnes:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

initializeCampagnes();
