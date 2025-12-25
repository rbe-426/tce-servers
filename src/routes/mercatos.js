/**
 * Endpoints pour gestion des mercatos (mouvements de véhicules)
 * POST/GET/PUT /api/mercatos/...
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * POST /api/mercatos
 * Proposer un mouvement de véhicule
 */
export async function proposeMercato(req, res) {
  try {
    const { vehicleParc, depotSourceId, depotDestinationId, dateProposee, motif, notes } = req.body;

    // Valider les données
    if (!vehicleParc || !depotSourceId || !depotDestinationId || !dateProposee) {
      return res.status(400).json({ error: 'Données manquantes' });
    }

    // Vérifier que le véhicule existe et appartient au dépôt source
    const vehicle = await prisma.vehicle.findUnique({
      where: { parc: vehicleParc }
    });

    if (!vehicle) {
      return res.status(404).json({ error: 'Véhicule non trouvé' });
    }

    if (vehicle.etablissementId !== depotSourceId) {
      return res.status(400).json({ error: 'Véhicule n\'appartient pas au dépôt source' });
    }

    // Vérifier que les dépôts existent
    const sourceDepot = await prisma.etablissement.findUnique({
      where: { id: depotSourceId }
    });
    const destDepot = await prisma.etablissement.findUnique({
      where: { id: depotDestinationId }
    });

    if (!sourceDepot || !destDepot) {
      return res.status(404).json({ error: 'Dépôt non trouvé' });
    }

    // Créer le mercato
    const mercato = await prisma.vehicleMercato.create({
      data: {
        vehicleParc,
        depotSourceId,
        depotDestinationId,
        dateProposee: new Date(dateProposee),
        motif: motif || null,
        notes: notes || null,
        statut: 'EN_ATTENTE'
      },
      include: {
        vehicle: true,
        depotSource: true,
        depotDestination: true
      }
    });

    res.status(201).json({
      success: true,
      data: mercato,
      message: `Mercato proposé: ${vehicle.parc} de ${sourceDepot.nom} vers ${destDepot.nom}`
    });
  } catch (error) {
    console.error('[MERCATO] Error proposing mercato:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/mercatos
 * Lister les mercatos avec filtres optionnels
 */
export async function listMercatos(req, res) {
  try {
    const { statut, depotSourceId, depotDestinationId, page = 1, limit = 20 } = req.query;

    const where = {};
    if (statut) where.statut = statut;
    if (depotSourceId) where.depotSourceId = depotSourceId;
    if (depotDestinationId) where.depotDestinationId = depotDestinationId;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [mercatos, total] = await Promise.all([
      prisma.vehicleMercato.findMany({
        where,
        include: {
          vehicle: true,
          depotSource: true,
          depotDestination: true
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.vehicleMercato.count({ where })
    ]);

    res.json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit)),
      mercatos: mercatos.map(m => ({
        id: m.id,
        vehicule: { parc: m.vehicle.parc, type: m.vehicle.type, modele: m.vehicle.modele },
        source: m.depotSource.nom,
        destination: m.depotDestination.nom,
        statut: m.statut,
        dateProposee: m.dateProposee,
        dateTransport: m.dateTransport,
        motif: m.motif,
        notes: m.notes,
        createdAt: m.createdAt
      }))
    });
  } catch (error) {
    console.error('[MERCATO] Error listing mercatos:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/mercatos/:mercatoId
 * Obtenir les détails d'un mercato
 */
export async function getMercato(req, res) {
  try {
    const { mercatoId } = req.params;

    const mercato = await prisma.vehicleMercato.findUnique({
      where: { id: mercatoId },
      include: {
        vehicle: true,
        depotSource: true,
        depotDestination: true
      }
    });

    if (!mercato) {
      return res.status(404).json({ error: 'Mercato non trouvé' });
    }

    res.json({
      success: true,
      data: mercato
    });
  } catch (error) {
    console.error('[MERCATO] Error getting mercato:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * PUT /api/mercatos/:mercatoId/approve
 * Approuver un mercato (directeur dépôt destination)
 */
export async function approveMercato(req, res) {
  try {
    const { mercatoId } = req.params;
    const { approvedBy } = req.body;

    const mercato = await prisma.vehicleMercato.findUnique({
      where: { id: mercatoId }
    });

    if (!mercato) {
      return res.status(404).json({ error: 'Mercato non trouvé' });
    }

    if (mercato.statut !== 'EN_ATTENTE') {
      return res.status(400).json({ error: 'Ce mercato ne peut pas être approuvé' });
    }

    const approved = await prisma.vehicleMercato.update({
      where: { id: mercatoId },
      data: {
        statut: 'APPROUVÉ',
        approveParId: approvedBy
      },
      include: {
        vehicle: true,
        depotSource: true,
        depotDestination: true
      }
    });

    res.json({
      success: true,
      data: approved,
      message: 'Mercato approuvé'
    });
  } catch (error) {
    console.error('[MERCATO] Error approving mercato:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * PUT /api/mercatos/:mercatoId/reject
 * Rejeter un mercato
 */
export async function rejectMercato(req, res) {
  try {
    const { mercatoId } = req.params;
    const { reason } = req.body;

    const mercato = await prisma.vehicleMercato.findUnique({
      where: { id: mercatoId }
    });

    if (!mercato) {
      return res.status(404).json({ error: 'Mercato non trouvé' });
    }

    if (mercato.statut !== 'EN_ATTENTE') {
      return res.status(400).json({ error: 'Ce mercato ne peut pas être rejeté' });
    }

    const rejected = await prisma.vehicleMercato.update({
      where: { id: mercatoId },
      data: {
        statut: 'REJETÉ',
        rejectionReason: reason || null
      },
      include: {
        vehicle: true,
        depotSource: true,
        depotDestination: true
      }
    });

    res.json({
      success: true,
      data: rejected,
      message: 'Mercato rejeté'
    });
  } catch (error) {
    console.error('[MERCATO] Error rejecting mercato:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * PUT /api/mercatos/:mercatoId/complete
 * Marquer un mercato comme transporté
 */
export async function completeMercato(req, res) {
  try {
    const { mercatoId } = req.params;
    const { dateTransport } = req.body;

    const mercato = await prisma.vehicleMercato.findUnique({
      where: { id: mercatoId }
    });

    if (!mercato) {
      return res.status(404).json({ error: 'Mercato non trouvé' });
    }

    if (mercato.statut !== 'APPROUVÉ') {
      return res.status(400).json({ error: 'Seul un mercato approuvé peut être complété' });
    }

    // Mettre à jour le dépôt du véhicule
    const completed = await prisma.vehicleMercato.update({
      where: { id: mercatoId },
      data: {
        statut: 'TRANSPORTÉ',
        dateTransport: dateTransport ? new Date(dateTransport) : new Date()
      },
      include: {
        vehicle: true,
        depotSource: true,
        depotDestination: true
      }
    });

    // Mettre à jour l'établissement du véhicule
    await prisma.vehicle.update({
      where: { parc: completed.vehicleParc },
      data: { etablissementId: completed.depotDestinationId }
    });

    res.json({
      success: true,
      data: completed,
      message: `Véhicule transféré de ${completed.depotSource.nom} à ${completed.depotDestination.nom}`
    });
  } catch (error) {
    console.error('[MERCATO] Error completing mercato:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * DELETE /api/mercatos/:mercatoId
 * Supprimer un mercato (seulement EN_ATTENTE)
 */
export async function deleteMercato(req, res) {
  try {
    const { mercatoId } = req.params;

    const mercato = await prisma.vehicleMercato.findUnique({
      where: { id: mercatoId }
    });

    if (!mercato) {
      return res.status(404).json({ error: 'Mercato non trouvé' });
    }

    if (mercato.statut !== 'EN_ATTENTE') {
      return res.status(400).json({ error: 'Seul un mercato en attente peut être supprimé' });
    }

    await prisma.vehicleMercato.delete({
      where: { id: mercatoId }
    });

    res.json({
      success: true,
      message: 'Mercato supprimé'
    });
  } catch (error) {
    console.error('[MERCATO] Error deleting mercato:', error);
    res.status(500).json({ error: error.message });
  }
}
