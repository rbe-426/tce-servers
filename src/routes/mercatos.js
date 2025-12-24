import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// ==================== MERCATOS ====================

/**
 * POST /api/mercatos
 * Proposer un mouvement de véhicule
 * Body: { vehicleParc, depotSourceId, depotDestinationId, dateProposee, motif? }
 */
router.post('/mercatos', async (req, res) => {
  try {
    const { vehicleParc, depotSourceId, depotDestinationId, dateProposee, motif, notes } = req.body;

    if (!vehicleParc || !depotSourceId || !depotDestinationId || !dateProposee) {
      return res.status(400).json({
        error: 'vehicleParc, depotSourceId, depotDestinationId et dateProposee sont requis'
      });
    }

    if (depotSourceId === depotDestinationId) {
      return res.status(400).json({ error: 'Source et destination doivent être différents' });
    }

    // Vérifier que le véhicule existe
    const vehicle = await prisma.vehicle.findUnique({
      where: { parc: vehicleParc }
    });

    if (!vehicle) {
      return res.status(404).json({ error: 'Véhicule non trouvé' });
    }

    // Vérifier que les dépôts existent
    const depots = await prisma.etablissement.findMany({
      where: { id: { in: [depotSourceId, depotDestinationId] } }
    });

    if (depots.length !== 2) {
      return res.status(404).json({ error: 'Un ou plusieurs dépôts non trouvés' });
    }

    // Créer le mercato
    const mercato = await prisma.vehicleMercato.create({
      data: {
        vehicleParc,
        depotSourceId,
        depotDestinationId,
        dateProposee: new Date(dateProposee),
        motif: motif || 'Réorganisation',
        notes,
        statut: 'EN_ATTENTE'
      },
      include: {
        vehicle: true,
        depotSource: { select: { id: true, nom: true } },
        depotDestination: { select: { id: true, nom: true } }
      }
    });

    res.json({
      success: true,
      message: 'Mercato proposé avec succès',
      data: mercato
    });
  } catch (error) {
    console.error('[MERCATOS] POST create ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/mercatos
 * Lister les mercatos avec filtres
 * Query: ?status=EN_ATTENTE&depotId=...&limit=20&offset=0
 */
router.get('/mercatos', async (req, res) => {
  try {
    const { status, depotId, limit = 20, offset = 0 } = req.query;

    const where = {};

    if (status) {
      where.statut = status;
    }

    if (depotId) {
      where.OR = [
        { depotSourceId: depotId },
        { depotDestinationId: depotId }
      ];
    }

    const mercatos = await prisma.vehicleMercato.findMany({
      where,
      include: {
        vehicle: { select: { parc: true, type: true, modele: true } },
        depotSource: { select: { id: true, nom: true } },
        depotDestination: { select: { id: true, nom: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    const total = await prisma.vehicleMercato.count({ where });

    res.json({
      data: mercatos,
      pagination: { total, limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (error) {
    console.error('[MERCATOS] GET list ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/mercatos/:mercatoId
 * Récupérer un mercato spécifique
 */
router.get('/mercatos/:mercatoId', async (req, res) => {
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

    res.json(mercato);
  } catch (error) {
    console.error('[MERCATOS] GET detail ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/mercatos/:mercatoId/approve
 * Approuver un mercato
 * Body: { approvedBy? }
 */
router.put('/mercatos/:mercatoId/approve', async (req, res) => {
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
      return res.status(400).json({
        error: `Impossible d'approuver un mercato au statut ${mercato.statut}`
      });
    }

    const updated = await prisma.vehicleMercato.update({
      where: { id: mercatoId },
      data: {
        statut: 'APPROUVÉ',
        approveParId: approvedBy || null
      },
      include: {
        vehicle: true,
        depotSource: { select: { id: true, nom: true } },
        depotDestination: { select: { id: true, nom: true } }
      }
    });

    res.json({
      success: true,
      message: 'Mercato approuvé avec succès',
      data: updated
    });
  } catch (error) {
    console.error('[MERCATOS] PUT approve ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/mercatos/:mercatoId/reject
 * Rejeter un mercato
 * Body: { reason }
 */
router.put('/mercatos/:mercatoId/reject', async (req, res) => {
  try {
    const { mercatoId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Raison du rejet requise' });
    }

    const mercato = await prisma.vehicleMercato.findUnique({
      where: { id: mercatoId }
    });

    if (!mercato) {
      return res.status(404).json({ error: 'Mercato non trouvé' });
    }

    if (mercato.statut !== 'EN_ATTENTE') {
      return res.status(400).json({
        error: `Impossible de rejeter un mercato au statut ${mercato.statut}`
      });
    }

    const updated = await prisma.vehicleMercato.update({
      where: { id: mercatoId },
      data: {
        statut: 'REJETÉ',
        rejectionReason: reason
      },
      include: {
        vehicle: true,
        depotSource: { select: { id: true, nom: true } },
        depotDestination: { select: { id: true, nom: true } }
      }
    });

    res.json({
      success: true,
      message: 'Mercato rejeté avec succès',
      data: updated
    });
  } catch (error) {
    console.error('[MERCATOS] PUT reject ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/mercatos/:mercatoId/complete
 * Marquer un mercato comme transporté
 * Body: { dateTransport? }
 */
router.put('/mercatos/:mercatoId/complete', async (req, res) => {
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
      return res.status(400).json({
        error: `Impossible de marquer comme transporté un mercato au statut ${mercato.statut}`
      });
    }

    const updated = await prisma.vehicleMercato.update({
      where: { id: mercatoId },
      data: {
        statut: 'TRANSPORTÉ',
        dateTransport: dateTransport ? new Date(dateTransport) : new Date()
      },
      include: {
        vehicle: true,
        depotSource: { select: { id: true, nom: true } },
        depotDestination: { select: { id: true, nom: true } }
      }
    });

    res.json({
      success: true,
      message: 'Mercato marqué comme transporté',
      data: updated
    });
  } catch (error) {
    console.error('[MERCATOS] PUT complete ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
