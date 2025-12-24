import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// ==================== VEHICLE NEEDS ====================

/**
 * POST /api/depots/:depotId/vehicle-needs
 * Créer un besoin en véhicule
 * Body: { type, dateDebut, dateFin?, nombreNeeded, raison?, isCritical? }
 */
router.post('/depots/:depotId/vehicle-needs', async (req, res) => {
  try {
    const { depotId } = req.params;
    const { type, dateDebut, dateFin, nombreNeeded, raison, isCritical } = req.body;

    if (!type || !dateDebut || !nombreNeeded) {
      return res.status(400).json({ error: 'type, dateDebut et nombreNeeded sont requis' });
    }

    if (nombreNeeded <= 0) {
      return res.status(400).json({ error: 'nombreNeeded doit être supérieur à 0' });
    }

    // Vérifier que le dépôt existe
    const depot = await prisma.etablissement.findUnique({
      where: { id: depotId }
    });

    if (!depot) {
      return res.status(404).json({ error: 'Dépôt non trouvé' });
    }

    // Créer le besoin
    const need = await prisma.vehicleNeed.create({
      data: {
        depotId,
        type,
        dateDebut: new Date(dateDebut),
        dateFin: dateFin ? new Date(dateFin) : null,
        nombreNeeded,
        raison: raison || 'Besoin général',
        isCritical: isCritical || false,
        nombreActuel: 0
      }
    });

    res.json({
      success: true,
      message: 'Besoin créé avec succès',
      data: need
    });
  } catch (error) {
    console.error('[VEHICLE-NEEDS] POST create ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/depots/:depotId/vehicle-needs
 * Lister les besoins en véhicules d'un dépôt
 * Query: ?active=true&type=Autobus&limit=50
 */
router.get('/depots/:depotId/vehicle-needs', async (req, res) => {
  try {
    const { depotId } = req.params;
    const { active, type, limit = 50, offset = 0 } = req.query;

    const where = { depotId };

    if (active === 'true') {
      const today = new Date();
      where.AND = [
        { dateDebut: { lte: today } },
        { OR: [{ dateFin: null }, { dateFin: { gte: today } }] }
      ];
    }

    if (type) {
      where.type = type;
    }

    const needs = await prisma.vehicleNeed.findMany({
      where,
      orderBy: { dateDebut: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    const total = await prisma.vehicleNeed.count({ where });

    res.json({
      data: needs,
      pagination: { total, limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (error) {
    console.error('[VEHICLE-NEEDS] GET list ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/depots/:depotId/vehicle-availability
 * Voir la disponibilité en véhicules par type (besoin vs stock)
 */
router.get('/depots/:depotId/vehicle-availability', async (req, res) => {
  try {
    const { depotId } = req.params;

    // Récupérer les besoins actuels (actifs)
    const today = new Date();
    const needs = await prisma.vehicleNeed.findMany({
      where: {
        depotId,
        dateDebut: { lte: today },
        OR: [{ dateFin: null }, { dateFin: { gte: today } }]
      },
      distinct: ['type']
    });

    // Récupérer les véhicules disponibles par type
    const vehicles = await prisma.vehicle.groupBy({
      by: ['type'],
      where: { etablissementId: depotId },
      _count: { parc: true }
    });

    // Combiner les infos
    const availability = [];

    // Pour chaque type avec besoin
    for (const need of needs) {
      const vehicleCount = vehicles.find(v => v.type === need.type)?._count.parc || 0;
      const totalNeeded = need.nombreNeeded;
      const deficit = totalNeeded - vehicleCount;

      availability.push({
        type: need.type,
        needed: totalNeeded,
        available: vehicleCount,
        deficit: deficit > 0 ? deficit : 0,
        surplus: deficit < 0 ? Math.abs(deficit) : 0,
        isCritical: need.isCritical,
        raison: need.raison
      });
    }

    // Ajouter les types avec surplus (pas de besoin déclaré)
    for (const vehicle of vehicles) {
      const hasNeed = needs.some(n => n.type === vehicle.type);
      if (!hasNeed) {
        availability.push({
          type: vehicle.type,
          needed: 0,
          available: vehicle._count.parc,
          deficit: 0,
          surplus: vehicle._count.parc,
          isCritical: false,
          raison: null
        });
      }
    }

    res.json(availability);
  } catch (error) {
    console.error('[VEHICLE-NEEDS] GET availability ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/depots/:depotId/vehicle-needs/:needId
 * Mettre à jour un besoin
 * Body: { nombreNeeded?, dateFin?, raison?, isCritical? }
 */
router.put('/depots/:depotId/vehicle-needs/:needId', async (req, res) => {
  try {
    const { needId } = req.params;
    const { nombreNeeded, dateFin, raison, isCritical } = req.body;

    const need = await prisma.vehicleNeed.findUnique({
      where: { id: needId }
    });

    if (!need) {
      return res.status(404).json({ error: 'Besoin non trouvé' });
    }

    const updateData = {};

    if (nombreNeeded !== undefined) {
      if (nombreNeeded <= 0) {
        return res.status(400).json({ error: 'nombreNeeded doit être supérieur à 0' });
      }
      updateData.nombreNeeded = nombreNeeded;
    }

    if (dateFin !== undefined) {
      updateData.dateFin = dateFin ? new Date(dateFin) : null;
    }

    if (raison !== undefined) {
      updateData.raison = raison;
    }

    if (isCritical !== undefined) {
      updateData.isCritical = isCritical;
    }

    const updated = await prisma.vehicleNeed.update({
      where: { id: needId },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Besoin mis à jour avec succès',
      data: updated
    });
  } catch (error) {
    console.error('[VEHICLE-NEEDS] PUT update ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/depots/:depotId/vehicle-needs/:needId
 * Supprimer un besoin
 */
router.delete('/depots/:depotId/vehicle-needs/:needId', async (req, res) => {
  try {
    const { needId } = req.params;

    const need = await prisma.vehicleNeed.findUnique({
      where: { id: needId }
    });

    if (!need) {
      return res.status(404).json({ error: 'Besoin non trouvé' });
    }

    await prisma.vehicleNeed.delete({
      where: { id: needId }
    });

    res.json({ success: true, message: 'Besoin supprimé avec succès' });
  } catch (error) {
    console.error('[VEHICLE-NEEDS] DELETE error ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
