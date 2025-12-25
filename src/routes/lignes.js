/**
 * Endpoints pour gestion des lignes
 * GET/PUT /api/lignes/...
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ==================== Affecter une ligne à un dépôt ====================

/**
 * PUT /api/lignes/:ligneId/assign-depot
 * Affecter une ligne à un dépôt
 */
export async function assignLineToDepot(req, res) {
  try {
    const { ligneId } = req.params;
    const { etablissementId } = req.body;

    // Vérifier que la ligne existe
    const ligne = await prisma.ligne.findUnique({
      where: { id: ligneId }
    });
    if (!ligne) {
      return res.status(404).json({ error: 'Ligne non trouvée' });
    }

    // Vérifier que l'établissement existe
    if (etablissementId) {
      const depot = await prisma.etablissement.findUnique({
        where: { id: etablissementId }
      });
      if (!depot) {
        return res.status(404).json({ error: 'Dépôt non trouvé' });
      }
    }

    // Mettre à jour la ligne
    const updatedLigne = await prisma.ligne.update({
      where: { id: ligneId },
      data: {
        etablissementId: etablissementId || null
      },
      include: {
        etablissement: {
          select: { id: true, nom: true }
        }
      }
    });

    res.json(updatedLigne);
  } catch (error) {
    console.error('[LIGNES] PUT /lignes/:ligneId/assign-depot ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
}

// ==================== Lister les lignes avec leur dépôt ====================

/**
 * GET /api/lignes?depotId=:depotId
 * Lister les lignes, optionnellement filtrées par dépôt
 */
export async function getLines(req, res) {
  try {
    const { depotId, statut } = req.query;

    const where = {};
    if (depotId) where.etablissementId = depotId;
    if (statut) where.statut = statut;

    const lignes = await prisma.ligne.findMany({
      where,
      include: {
        etablissement: {
          select: { id: true, nom: true }
        },
        sens: {
          select: { id: true, nom: true, direction: true }
        },
        services: {
          select: {
            id: true,
            date: true,
            statut: true
          },
          take: 5
        }
      },
      orderBy: { numero: 'asc' }
    });

    res.json(lignes);
  } catch (error) {
    console.error('[LIGNES] GET /lignes ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
}

// ==================== Obtenir les véhicules disponibles pour une ligne ====================

/**
 * GET /api/lignes/:ligneId/available-vehicles
 * Obtenir les véhicules du dépôt assigné à la ligne
 */
export async function getAvailableVehiclesForLine(req, res) {
  try {
    const { ligneId } = req.params;

    const ligne = await prisma.ligne.findUnique({
      where: { id: ligneId },
      select: { etablissementId: true, typesVehicules: true }
    });

    if (!ligne) {
      return res.status(404).json({ error: 'Ligne non trouvée' });
    }

    if (!ligne.etablissementId) {
      return res.status(400).json({ error: 'Ligne non affectée à un dépôt' });
    }

    // Récupérer les véhicules du dépôt
    const vehicles = await prisma.vehicle.findMany({
      where: {
        etablissementId: ligne.etablissementId,
        statut: 'Actif'
      },
      orderBy: { parc: 'asc' }
    });

    res.json(vehicles);
  } catch (error) {
    console.error('[LIGNES] GET /lignes/:ligneId/available-vehicles ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
}

// ==================== Obtenir les conducteurs disponibles pour une ligne ====================

/**
 * GET /api/lignes/:ligneId/available-conducteurs
 * Obtenir les conducteurs du dépôt assigné à la ligne
 */
export async function getAvailableConductorsForLine(req, res) {
  try {
    const { ligneId } = req.params;

    const ligne = await prisma.ligne.findUnique({
      where: { id: ligneId },
      select: { etablissementId: true }
    });

    if (!ligne) {
      return res.status(404).json({ error: 'Ligne non trouvée' });
    }

    if (!ligne.etablissementId) {
      return res.status(400).json({ error: 'Ligne non affectée à un dépôt' });
    }

    // Récupérer les conducteurs du dépôt (via Employe)
    const conducteurs = await prisma.employe.findMany({
      where: {
        etablissementId: ligne.etablissementId,
        statut: 'Actif',
        poste: 'Conducteur'
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        matricule: true,
        permis: true,
        statut: true
      },
      orderBy: { nom: 'asc' }
    });

    res.json(conducteurs);
  } catch (error) {
    console.error('[LIGNES] GET /lignes/:ligneId/available-conducteurs ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
}

export default {
  assignLineToDepot,
  getLines,
  getAvailableVehiclesForLine,
  getAvailableConductorsForLine
};
