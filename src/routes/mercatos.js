/**
 * Endpoints pour gestion des mercatos (mouvements de véhicules, lignes, personnel)
 * POST/GET/PUT /api/mercatos/...
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * POST /api/mercatos
 * Proposer un mercato (véhicule, ligne, ou personnel)
 */
export async function proposeMercato(req, res) {
  try {
    const {
      type = 'VEHICULE',
      vehicleId,
      ligneId,
      agentId,
      depotSourceId,
      depotDestinationId,
      dateProposee,
      description
    } = req.body;

    // Validation des données requises
    if (!depotDestinationId) {
      return res.status(400).json({ error: 'Dépôt destination requis' });
    }

    // Validation spécifique par type
    if (type === 'VEHICULE' && !vehicleId) {
      return res.status(400).json({ error: 'Véhicule requis pour un mercato véhicule' });
    }
    if (type === 'LIGNE' && !ligneId) {
      return res.status(400).json({ error: 'Ligne requise pour un mercato ligne' });
    }
    if (type === 'PERSONNEL' && !agentId) {
      return res.status(400).json({ error: 'Agent requis pour un mercato personnel' });
    }

    // Vérifier que les dépôts existent
    const destDepot = await prisma.etablissement.findUnique({
      where: { id: depotDestinationId }
    });

    if (!destDepot) {
      return res.status(404).json({ error: 'Dépôt destination non trouvé' });
    }

    // Vérifications supplémentaires selon le type
    let sourceDepotId = depotSourceId;

    if (type === 'VEHICULE') {
      const vehicle = await prisma.vehicle.findUnique({
        where: { parc: vehicleId }
      });

      if (!vehicle) {
        return res.status(404).json({ error: 'Véhicule non trouvé' });
      }

      sourceDepotId = vehicle.etablissementId;
    } else if (type === 'LIGNE') {
      const ligne = await prisma.ligne.findUnique({
        where: { id: ligneId }
      });

      if (!ligne) {
        return res.status(404).json({ error: 'Ligne non trouvée' });
      }
    } else if (type === 'PERSONNEL') {
      const agent = await prisma.employe.findUnique({
        where: { id: agentId }
      });

      if (!agent) {
        return res.status(404).json({ error: 'Agent non trouvé' });
      }

      sourceDepotId = agent.etablissementId;
    }

    // Créer le mercato
    const mercato = await prisma.mercato.create({
      data: {
        type,
        vehicleId: type === 'VEHICULE' ? vehicleId : null,
        ligneId: type === 'LIGNE' ? ligneId : null,
        agentId: type === 'PERSONNEL' ? agentId : null,
        depotSourceId: sourceDepotId,
        depotDestinationId,
        dateProposee: dateProposee ? new Date(dateProposee) : new Date(),
        description: description || null,
        statut: 'EN_ATTENTE'
      },
      include: {
        vehicle: true,
        ligne: true,
        agent: true,
        depotSource: true,
        depotDestination: true
      }
    });

    res.status(201).json({
      success: true,
      data: mercato,
      message: `Mercato ${type.toLowerCase()} proposé avec succès`
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
    const { type, statut, depotSourceId, depotDestinationId, page = 1, limit = 50 } = req.query;

    const where = {};
    if (type) where.type = type;
    if (statut) where.statut = statut;
    if (depotSourceId) where.depotSourceId = depotSourceId;
    if (depotDestinationId) where.depotDestinationId = depotDestinationId;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [mercatos, total] = await Promise.all([
      prisma.mercato.findMany({
        where,
        include: {
          vehicle: true,
          ligne: true,
          agent: true,
          depotSource: true,
          depotDestination: true
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: offset
      }),
      prisma.mercato.count({ where })
    ]);

    res.json({
      success: true,
      data: mercatos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
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

    const mercato = await prisma.mercato.findUnique({
      where: { id: mercatoId },
      include: {
        vehicle: true,
        ligne: true,
        agent: true,
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
 * Approuver un mercato
 */
export async function approveMercato(req, res) {
  try {
    const { mercatoId } = req.params;
    const { approvedBy } = req.body;

    const mercato = await prisma.mercato.findUnique({
      where: { id: mercatoId }
    });

    if (!mercato) {
      return res.status(404).json({ error: 'Mercato non trouvé' });
    }

    if (mercato.statut !== 'EN_ATTENTE') {
      return res.status(400).json({ error: 'Ce mercato ne peut pas être approuvé' });
    }

    const approved = await prisma.mercato.update({
      where: { id: mercatoId },
      data: {
        statut: 'APPROUVÉ',
        dateProposeeBy: approvedBy || null
      },
      include: {
        vehicle: true,
        ligne: true,
        agent: true,
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
    const { raison } = req.body;

    const mercato = await prisma.mercato.findUnique({
      where: { id: mercatoId }
    });

    if (!mercato) {
      return res.status(404).json({ error: 'Mercato non trouvé' });
    }

    if (mercato.statut !== 'EN_ATTENTE') {
      return res.status(400).json({ error: 'Ce mercato ne peut pas être rejeté' });
    }

    const rejected = await prisma.mercato.update({
      where: { id: mercatoId },
      data: {
        statut: 'REJETÉ',
        rejectionReason: raison || null
      },
      include: {
        vehicle: true,
        ligne: true,
        agent: true,
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
 * Marquer un mercato comme complété
 */
export async function completeMercato(req, res) {
  try {
    const { mercatoId } = req.params;

    const mercato = await prisma.mercato.findUnique({
      where: { id: mercatoId }
    });

    if (!mercato) {
      return res.status(404).json({ error: 'Mercato non trouvé' });
    }

    if (mercato.statut !== 'APPROUVÉ') {
      return res.status(400).json({ error: 'Seul un mercato approuvé peut être complété' });
    }

    // Mettre à jour le mercato
    const completed = await prisma.mercato.update({
      where: { id: mercatoId },
      data: {
        statut: 'COMPLÉTÉ'
      },
      include: {
        vehicle: true,
        ligne: true,
        agent: true,
        depotSource: true,
        depotDestination: true
      }
    });

    // Mettre à jour l'établissement selon le type
    if (mercato.type === 'VEHICULE' && mercato.vehicleId) {
      await prisma.vehicle.update({
        where: { parc: mercato.vehicleId },
        data: { etablissementId: mercato.depotDestinationId }
      });
    } else if (mercato.type === 'PERSONNEL' && mercato.agentId) {
      await prisma.employe.update({
        where: { id: mercato.agentId },
        data: { etablissementId: mercato.depotDestinationId }
      });
    }

    res.json({
      success: true,
      data: completed,
      message: 'Mercato complété avec succès'
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

    const mercato = await prisma.mercato.findUnique({
      where: { id: mercatoId }
    });

    if (!mercato) {
      return res.status(404).json({ error: 'Mercato non trouvé' });
    }

    if (mercato.statut !== 'EN_ATTENTE') {
      return res.status(400).json({ error: 'Seul un mercato en attente peut être supprimé' });
    }

    await prisma.mercato.delete({
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
