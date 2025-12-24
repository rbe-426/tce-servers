import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// ==================== PERSONNEL STATS ====================

/**
 * GET /api/depots/:depotId/personnel/stats
 * Récupère les statistiques du personnel (directeur, responsables, régulateurs, assureurs, conducteurs)
 */
router.get('/depots/:depotId/personnel/stats', async (req, res) => {
  try {
    const { depotId } = req.params;

    let stats = await prisma.personnelStats.findUnique({
      where: { depotId }
    });

    if (!stats) {
      // Créer les stats si elles n'existent pas
      stats = await prisma.personnelStats.create({
        data: { depotId, directorCount: 0, responsableCount: 0, regulatorCount: 0, insurerCount: 0, driverCount: 0 }
      });
    }

    // Calculer les stats actuelles
    const roles = await prisma.employeRole.groupBy({
      by: ['role'],
      where: { depotId, isActif: true },
      _count: { id: true }
    });

    const counts = {
      DIRECTEUR_SITE: roles.find(r => r.role === 'DIRECTEUR_SITE')?._count.id || 0,
      RESPONSABLE_EXPLOITATION: roles.find(r => r.role === 'RESPONSABLE_EXPLOITATION')?._count.id || 0,
      REGULATEUR: roles.find(r => r.role === 'REGULATEUR')?._count.id || 0,
      ASSUREUR: roles.find(r => r.role === 'ASSUREUR')?._count.id || 0,
      CONDUCTEUR: roles.find(r => r.role === 'CONDUCTEUR')?._count.id || 0
    };

    // Mettre à jour les stats
    stats = await prisma.personnelStats.update({
      where: { depotId },
      data: {
        directorCount: counts.DIRECTEUR_SITE,
        responsableCount: counts.RESPONSABLE_EXPLOITATION,
        regulatorCount: counts.REGULATEUR,
        insurerCount: counts.ASSUREUR,
        driverCount: counts.CONDUCTEUR,
        totalPersonnel: Object.values(counts).reduce((a, b) => a + b, 0)
      }
    });

    res.json(stats);
  } catch (error) {
    console.error('[PERSONNEL] GET stats ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/depots/:depotId/personnel
 * Lister tout le personnel avec leurs rôles actuels
 */
router.get('/depots/:depotId/personnel', async (req, res) => {
  try {
    const { depotId } = req.params;

    const personnel = await prisma.employe.findMany({
      where: { etablissementId: depotId },
      include: {
        roles: {
          where: { isActif: true },
          select: {
            id: true,
            role: true,
            dateDebut: true,
            dateFin: true
          }
        }
      },
      orderBy: { nom: 'asc' }
    });

    res.json(personnel);
  } catch (error) {
    console.error('[PERSONNEL] GET list ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/depots/:depotId/personnel/assign-role
 * Affecter un rôle à un employé
 * Body: { employeId, role, dateDebut, dateFin? }
 */
router.post('/depots/:depotId/personnel/assign-role', async (req, res) => {
  try {
    const { depotId } = req.params;
    const { employeId, role, dateDebut, dateFin } = req.body;

    if (!employeId || !role) {
      return res.status(400).json({ error: 'employeId et role sont requis' });
    }

    const validRoles = ['DIRECTEUR_SITE', 'RESPONSABLE_EXPLOITATION', 'REGULATEUR', 'ASSUREUR', 'CONDUCTEUR'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Rôle invalide. Rôles valides: ${validRoles.join(', ')}` });
    }

    // Désactiver les anciens rôles du même type si nécessaire
    if (['DIRECTEUR_SITE', 'RESPONSABLE_EXPLOITATION'].includes(role)) {
      await prisma.employeRole.updateMany({
        where: { depotId, role, isActif: true },
        data: { isActif: false, dateFin: new Date() }
      });
    }

    // Créer le nouveau rôle
    const employeRole = await prisma.employeRole.create({
      data: {
        employeId,
        role,
        depotId,
        dateDebut: new Date(dateDebut || new Date()),
        dateFin: dateFin ? new Date(dateFin) : null,
        isActif: true
      }
    });

    // Mettre à jour les stats
    await updatePersonnelStats(depotId);

    res.json({
      success: true,
      message: `Rôle ${role} assigné avec succès`,
      data: employeRole
    });
  } catch (error) {
    console.error('[PERSONNEL] POST assign-role ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/personnel/roles/:roleId
 * Supprimer une affectation de rôle
 */
router.delete('/personnel/roles/:roleId', async (req, res) => {
  try {
    const { roleId } = req.params;

    const role = await prisma.employeRole.findUnique({
      where: { id: roleId }
    });

    if (!role) {
      return res.status(404).json({ error: 'Rôle non trouvé' });
    }

    await prisma.employeRole.delete({
      where: { id: roleId }
    });

    // Mettre à jour les stats du dépôt
    if (role.depotId) {
      await updatePersonnelStats(role.depotId);
    }

    res.json({ success: true, message: 'Rôle supprimé avec succès' });
  } catch (error) {
    console.error('[PERSONNEL] DELETE role ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== HELPER FUNCTIONS ====================

/**
 * Mettre à jour les stats du personnel d'un dépôt
 */
async function updatePersonnelStats(depotId) {
  const roles = await prisma.employeRole.groupBy({
    by: ['role'],
    where: { depotId, isActif: true },
    _count: { id: true }
  });

  const counts = {
    DIRECTEUR_SITE: roles.find(r => r.role === 'DIRECTEUR_SITE')?._count.id || 0,
    RESPONSABLE_EXPLOITATION: roles.find(r => r.role === 'RESPONSABLE_EXPLOITATION')?._count.id || 0,
    REGULATEUR: roles.find(r => r.role === 'REGULATEUR')?._count.id || 0,
    ASSUREUR: roles.find(r => r.role === 'ASSUREUR')?._count.id || 0,
    CONDUCTEUR: roles.find(r => r.role === 'CONDUCTEUR')?._count.id || 0
  };

  let stats = await prisma.personnelStats.findUnique({
    where: { depotId }
  });

  if (!stats) {
    stats = await prisma.personnelStats.create({
      data: { depotId }
    });
  }

  return await prisma.personnelStats.update({
    where: { depotId },
    data: {
      directorCount: counts.DIRECTEUR_SITE,
      responsableCount: counts.RESPONSABLE_EXPLOITATION,
      regulatorCount: counts.REGULATEUR,
      insurerCount: counts.ASSUREUR,
      driverCount: counts.CONDUCTEUR,
      totalPersonnel: Object.values(counts).reduce((a, b) => a + b, 0),
      lastUpdated: new Date()
    }
  });
}

export default router;
