import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Fonction pour enregistrer un changement de statut
export async function recordVehicleStateChange(vehicleId, ancienStatut, nouveauStatut, motif = '') {
  try {
    const record = await prisma.vehicleStateHistory.create({
      data: {
        vehicleId,
        ancienStatut: ancienStatut || 'Disponible',
        nouveauStatut,
        motif,
        changedAt: new Date(),
        changedBy: 'système', // À améliorer avec l'utilisateur authentifié
      },
    });
    
    // Mettre à jour le statut du véhicule
    await prisma.vehicle.update({
      where: { parc: vehicleId },
      data: { statut: nouveauStatut },
    });
    
    console.log(`✅ Mouvement: ${vehicleId} ${ancienStatut} → ${nouveauStatut}`);
    return record;
  } catch (err) {
    console.error('Erreur enregistrement mouvement:', err);
    throw err;
  }
}

// Fonction pour obtenir l'historique d'un véhicule
export async function getVehicleHistory(vehicleId) {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { parc: vehicleId },
      include: {
        statesHistory: {
          orderBy: { changedAt: 'desc' },
          take: 20,
        },
      },
    });
    return vehicle;
  } catch (err) {
    console.error('Erreur récupération historique:', err);
    throw err;
  }
}
