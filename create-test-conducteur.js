import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  try {
    // Créer un conducteur de test
    const conducteur = await prisma.conducteur.create({
      data: {
        nom: 'Dupont',
        prenom: 'Jean',
        matricule: 'JD001',
        permis: 'D',
        embauche: new Date('2020-01-15'),
        statut: 'Actif',
        typeContrat: 'CDI',
        email: 'jean.dupont@transports.fr',
        phone: '06 12 34 56 78',
        busArticules: true,
        autocars: false,
        pmr: true,
        vehiMarchandises: false,
        heuresMax: 35,
        heuresReglementaires: 35,
      }
    });
    
    console.log('✅ Conducteur créé avec succès:');
    console.log(`- ID: ${conducteur.id}`);
    console.log(`- Nom: ${conducteur.prenom} ${conducteur.nom}`);
    console.log(`- Matricule: ${conducteur.matricule}`);
    
    // Vérifier qu'il est bien là
    const total = await prisma.conducteur.count();
    console.log(`\nTotal conducteurs: ${total}`);
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
