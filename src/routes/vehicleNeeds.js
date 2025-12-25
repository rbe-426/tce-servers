/**
 * Endpoints pour besoins en véhicules par type
 * POST/GET/PUT/DELETE /api/depots/:depotId/vehicle-needs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * POST /api/depots/:depotId/vehicle-needs
 * Créer ou mettre à jour un besoin en véhicules
 */
export async function setVehicleNeed(req, res) {
  try {
    const { depotId } = req.params;
    const { vehicleTypeId, quantityNeeded, isUrgent = false, reason = null } = req.body;

    // Vérifier le dépôt
    const depot = await prisma.etablissement.findUnique({
      where: { id: depotId }
    });
    if (!depot) {
      return res.status(404).json({ error: 'Dépôt non trouvé' });
    }

    // Vérifier le type de véhicule
    const vehicleType = await prisma.vehicleType.findUnique({
      where: { id: vehicleTypeId }
    });
    if (!vehicleType) {
      return res.status(404).json({ error: 'Type de véhicule non trouvé' });
    }

    // Chercher un besoin existant
    const existing = await prisma.vehicleNeed.findUnique({
      where: {
        depotId_vehicleTypeId: {
          depotId,
          vehicleTypeId
        }
      }
    });

    let need;
    if (existing) {
      // Mettre à jour
      need = await prisma.vehicleNeed.update({
        where: {
          depotId_vehicleTypeId: {
            depotId,
            vehicleTypeId
          }
        },
        data: {
          quantityNeeded: parseInt(quantityNeeded),
          isUrgent,
          reason,
          updatedAt: new Date()
        },
        include: { depot: true, vehicleType: true }
      });
    } else {
      // Créer
      need = await prisma.vehicleNeed.create({
        data: {
          depotId,
          vehicleTypeId,
          quantityNeeded: parseInt(quantityNeeded),
          isUrgent,
          reason,
          statut: 'OUVERT'
        },
        include: { depot: true, vehicleType: true }
      });
    }

    res.status(existing ? 200 : 201).json({
      success: true,
      data: {
        id: need.id,
        depot: need.depot.nom,
        vehicleType: need.vehicleType.nom,
        quantityNeeded: need.quantityNeeded,
        isUrgent: need.isUrgent,
        statut: need.statut,
        reason: need.reason,
        createdAt: need.createdAt,
        updatedAt: need.updatedAt
      },
      message: `Besoin ${existing ? 'mis à jour' : 'créé'} pour ${need.depot.nom}`
    });
  } catch (error) {
    console.error('[VEHICLE_NEEDS] Error setting need:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/depots/:depotId/vehicle-needs
 * Lister les besoins en véhicules d'un dépôt
 */
export async function getDepotVehicleNeeds(req, res) {
  try {
    const { depotId } = req.params;
    const { statut } = req.query;

    const depot = await prisma.etablissement.findUnique({
      where: { id: depotId }
    });
    if (!depot) {
      return res.status(404).json({ error: 'Dépôt non trouvé' });
    }

    const needs = await prisma.vehicleNeed.findMany({
      where: {
        depotId,
        ...(statut && { statut })
      },
      include: { vehicleType: true },
      orderBy: [{ isUrgent: 'desc' }, { createdAt: 'desc' }]
    });

    // Calculer la disponibilité pour chaque type
    const needsWithAvailability = await Promise.all(
      needs.map(async (need) => {
        const available = await prisma.vehicle.count({
          where: {
            vehicleTypeId: need.vehicleTypeId,
            etablissementId: depotId,
            vehicleState: { NOT: 'INDISPONIBLE' }
          }
        });

        const totalInDepot = await prisma.vehicle.count({
          where: {
            vehicleTypeId: need.vehicleTypeId,
            etablissementId: depotId
          }
        });

        return {
          id: need.id,
          vehicleType: need.vehicleType.nom,
          quantityNeeded: need.quantityNeeded,
          quantityAvailable: available,
          quantityTotal: totalInDepot,
          shortfall: Math.max(0, need.quantityNeeded - available),
          isUrgent: need.isUrgent,
          statut: need.statut,
          reason: need.reason,
          createdAt: need.createdAt
        };
      })
    );

    res.json({
      depotId,
      depotName: depot.nom,
      total: needsWithAvailability.length,
      urgent: needsWithAvailability.filter((n) => n.isUrgent).length,
      needs: needsWithAvailability
    });
  } catch (error) {
    console.error('[VEHICLE_NEEDS] Error getting depot needs:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/vehicle-needs/critical
 * Lister tous les besoins critiques (urgent ou avec manque)
 */
export async function getCriticalVehicleNeeds(req, res) {
  try {
    const needs = await prisma.vehicleNeed.findMany({
      where: {
        statut: 'OUVERT'
      },
      include: { depot: true, vehicleType: true },
      orderBy: [{ isUrgent: 'desc' }, { createdAt: 'desc' }]
    });

    // Filtrer et calculer les manques
    const criticalNeeds = await Promise.all(
      needs.map(async (need) => {
        const available = await prisma.vehicle.count({
          where: {
            vehicleTypeId: need.vehicleTypeId,
            etablissementId: need.depotId,
            vehicleState: { NOT: 'INDISPONIBLE' }
          }
        });

        const shortfall = Math.max(0, need.quantityNeeded - available);

        if (need.isUrgent || shortfall > 0) {
          return {
            id: need.id,
            depot: need.depot.nom,
            vehicleType: need.vehicleType.nom,
            quantityNeeded: need.quantityNeeded,
            quantityAvailable: available,
            shortfall,
            isUrgent: need.isUrgent,
            reason: need.reason
          };
        }
        return null;
      })
    );

    const filtered = criticalNeeds.filter((n) => n !== null);

    res.json({
      total: filtered.length,
      criticalNeeds: filtered,
      summary: {
        urgentNeeds: filtered.filter((n) => n.isUrgent).length,
        needsWithShortfall: filtered.filter((n) => n.shortfall > 0).length,
        totalVehiclesNeeded: filtered.reduce((sum, n) => sum + n.shortfall, 0)
      }
    });
  } catch (error) {
    console.error('[VEHICLE_NEEDS] Error getting critical needs:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/vehicle-needs/mercato-suggestions
 * Suggérer des mercatos pour combler les besoins
 */
export async function getMercatoSuggestions(req, res) {
  try {
    const { depotId } = req.query;

    // Récupérer les besoins critiques du dépôt
    const needs = await prisma.vehicleNeed.findMany({
      where: {
        depotId,
        statut: 'OUVERT'
      },
      include: { vehicleType: true }
    });

    const suggestions = [];

    for (const need of needs) {
      const available = await prisma.vehicle.count({
        where: {
          vehicleTypeId: need.vehicleTypeId,
          etablissementId: depotId,
          vehicleState: { NOT: 'INDISPONIBLE' }
        }
      });

      const shortfall = Math.max(0, need.quantityNeeded - available);

      if (shortfall > 0) {
        // Chercher des dépôts avec des véhicules disponibles
        const availableInOtherDepots = await prisma.vehicle.findMany({
          where: {
            vehicleTypeId: need.vehicleTypeId,
            etablissementId: { not: depotId },
            vehicleState: { NOT: 'INDISPONIBLE' }
          },
          include: { etablissement: true },
          take: shortfall
        });

        if (availableInOtherDepots.length > 0) {
          suggestions.push({
            need: {
              vehicleType: need.vehicleType.nom,
              quantityNeeded: need.quantityNeeded,
              quantityAvailable: available,
              shortfall
            },
            potentialMercatos: availableInOtherDepots.map((vehicle) => ({
              vehicleId: vehicle.id,
              vehicleNumber: vehicle.numero,
              sourceDepot: vehicle.etablissement.nom,
              sourceDepotId: vehicle.etablissementId,
              targetDepot: depotId
            }))
          });
        }
      }
    }

    res.json({
      depotId,
      totalSuggestions: suggestions.length,
      suggestions,
      message:
        suggestions.length > 0
          ? `${suggestions.length} besoin(s) peut(vent) être comblé(s) par mercatos`
          : 'Aucun besoin critique non comblable'
    });
  } catch (error) {
    console.error('[VEHICLE_NEEDS] Error getting mercato suggestions:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * PUT /api/vehicle-needs/:needId
 * Mettre à jour le statut d'un besoin
 */
export async function updateVehicleNeedStatus(req, res) {
  try {
    const { needId } = req.params;
    const { statut, isUrgent, reason } = req.body;

    const need = await prisma.vehicleNeed.findUnique({
      where: { id: needId }
    });
    if (!need) {
      return res.status(404).json({ error: 'Besoin non trouvé' });
    }

    const updated = await prisma.vehicleNeed.update({
      where: { id: needId },
      data: {
        ...(statut && { statut }),
        ...(isUrgent !== undefined && { isUrgent }),
        ...(reason && { reason })
      },
      include: { depot: true, vehicleType: true }
    });

    res.json({
      success: true,
      data: updated,
      message: 'Besoin mis à jour'
    });
  } catch (error) {
    console.error('[VEHICLE_NEEDS] Error updating need status:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * DELETE /api/vehicle-needs/:needId
 * Supprimer un besoin
 */
export async function deleteVehicleNeed(req, res) {
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

    res.json({
      success: true,
      message: 'Besoin supprimé'
    });
  } catch (error) {
    console.error('[VEHICLE_NEEDS] Error deleting need:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/vehicle-types
 * Lister les types de véhicules disponibles
 */
export async function listVehicleTypes(req, res) {
  try {
    const types = await prisma.vehicleType.findMany({
      orderBy: { nom: 'asc' }
    });

    res.json({
      total: types.length,
      vehicleTypes: types
    });
  } catch (error) {
    console.error('[VEHICLE_NEEDS] Error listing vehicle types:', error);
    res.status(500).json({ error: error.message });
  }
}
