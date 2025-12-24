import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// ==================== INTER-DEPOT AUTHORIZATION ====================

/**
 * POST /api/lignes/:ligneId/inter-depot-auth
 * Créer une autorisation inter-dépôt
 * Body: {
 *   depotSourceId, depotExploitantId, canTakeOver?, maxCourses?,
 *   periodicite?, dateFin?, conditions?, notes?
 * }
 */
router.post('/lignes/:ligneId/inter-depot-auth', async (req, res) => {
  try {
    const { ligneId } = req.params;
    const { depotSourceId, depotExploitantId, canTakeOver, maxCourses, periodicite, dateFin, conditions, notes, approuvePar } = req.body;

    if (!depotSourceId || !depotExploitantId) {
      return res.status(400).json({ error: 'depotSourceId et depotExploitantId sont requis' });
    }

    if (depotSourceId === depotExploitantId) {
      return res.status(400).json({ error: 'Source et exploitant doivent être différents' });
    }

    // Vérifier que la ligne existe
    const ligne = await prisma.ligne.findUnique({
      where: { id: ligneId }
    });

    if (!ligne) {
      return res.status(404).json({ error: 'Ligne non trouvée' });
    }

    // Vérifier que les dépôts existent
    const depots = await prisma.etablissement.findMany({
      where: { id: { in: [depotSourceId, depotExploitantId] } }
    });

    if (depots.length !== 2) {
      return res.status(404).json({ error: 'Un ou plusieurs dépôts non trouvés' });
    }

    // Vérifier s'il n'existe pas déjà une autorisation
    const existingAuth = await prisma.interDepotAuthorization.findUnique({
      where: {
        ligneId_depotSourceId_depotExploitantId: {
          ligneId,
          depotSourceId,
          depotExploitantId
        }
      }
    });

    if (existingAuth) {
      return res.status(400).json({ error: 'Une autorisation existe déjà pour cette combinaison' });
    }

    // Créer l'autorisation
    const auth = await prisma.interDepotAuthorization.create({
      data: {
        ligneId,
        depotSourceId,
        depotExploitantId,
        canTakeOver: canTakeOver !== false,
        maxCourses: maxCourses || null,
        periodicite: periodicite || 'PERMANENT',
        dateDebut: new Date(),
        dateFin: dateFin ? new Date(dateFin) : null,
        conditions: conditions ? JSON.stringify(conditions) : null,
        notes,
        approuvePar,
        statut: 'ACTIVE'
      },
      include: {
        ligne: { select: { id: true, numero: true, nom: true } },
        depotSource: { select: { id: true, nom: true } },
        depotExploitant: { select: { id: true, nom: true } }
      }
    });

    res.json({
      success: true,
      message: 'Autorisation créée avec succès',
      data: auth
    });
  } catch (error) {
    console.error('[INTER-DEPOT-AUTH] POST create ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/lignes/:ligneId/inter-depot-auth
 * Lister les autorisations pour une ligne
 */
router.get('/lignes/:ligneId/inter-depot-auth', async (req, res) => {
  try {
    const { ligneId } = req.params;
    const { status = 'ACTIVE' } = req.query;

    const where = { ligneId };

    if (status) {
      where.statut = status;
    }

    const auths = await prisma.interDepotAuthorization.findMany({
      where,
      include: {
        ligne: { select: { id: true, numero: true, nom: true } },
        depotSource: { select: { id: true, nom: true } },
        depotExploitant: { select: { id: true, nom: true } },
        interDepotTransfers: {
          select: { id: true, createdAt: true, statut: true },
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      },
      orderBy: { dateDebut: 'desc' }
    });

    res.json(auths);
  } catch (error) {
    console.error('[INTER-DEPOT-AUTH] GET list ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/depots/:depotId/inter-depot-auth/can-exploit
 * Lister les lignes que ce dépôt peut exploiter (autorisé)
 */
router.get('/depots/:depotId/inter-depot-auth/can-exploit', async (req, res) => {
  try {
    const { depotId } = req.params;

    const auths = await prisma.interDepotAuthorization.findMany({
      where: {
        depotExploitantId: depotId,
        statut: 'ACTIVE',
        canTakeOver: true,
        OR: [{ dateFin: null }, { dateFin: { gte: new Date() } }]
      },
      include: {
        ligne: { select: { id: true, numero: true, nom: true } },
        depotSource: { select: { id: true, nom: true } }
      },
      orderBy: { dateDebut: 'desc' }
    });

    res.json(auths);
  } catch (error) {
    console.error('[INTER-DEPOT-AUTH] GET can-exploit ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/depots/:depotId/inter-depot-auth/authorized-exploitants
 * Lister les dépôts autorisés à exploiter les lignes de ce dépôt
 */
router.get('/depots/:depotId/inter-depot-auth/authorized-exploitants', async (req, res) => {
  try {
    const { depotId } = req.params;

    const auths = await prisma.interDepotAuthorization.findMany({
      where: {
        depotSourceId: depotId,
        statut: 'ACTIVE',
        canTakeOver: true,
        OR: [{ dateFin: null }, { dateFin: { gte: new Date() } }]
      },
      include: {
        ligne: { select: { id: true, numero: true, nom: true } },
        depotExploitant: { select: { id: true, nom: true } }
      },
      orderBy: { dateDebut: 'desc' }
    });

    res.json(auths);
  } catch (error) {
    console.error('[INTER-DEPOT-AUTH] GET authorized ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/lignes/:ligneId/inter-depot-auth/:authId
 * Modifier une autorisation
 */
router.put('/lignes/:ligneId/inter-depot-auth/:authId', async (req, res) => {
  try {
    const { authId } = req.params;
    const { canTakeOver, maxCourses, statut, dateFin, notes } = req.body;

    const auth = await prisma.interDepotAuthorization.findUnique({
      where: { id: authId }
    });

    if (!auth) {
      return res.status(404).json({ error: 'Autorisation non trouvée' });
    }

    const updateData = {};

    if (canTakeOver !== undefined) {
      updateData.canTakeOver = canTakeOver;
    }

    if (maxCourses !== undefined) {
      updateData.maxCourses = maxCourses;
    }

    if (statut) {
      const validStatuts = ['ACTIVE', 'SUSPENDUE', 'REFUSÉE', 'EN_ATTENTE'];
      if (!validStatuts.includes(statut)) {
        return res.status(400).json({
          error: `Statut invalide. Statuts valides: ${validStatuts.join(', ')}`
        });
      }
      updateData.statut = statut;
    }

    if (dateFin !== undefined) {
      updateData.dateFin = dateFin ? new Date(dateFin) : null;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const updated = await prisma.interDepotAuthorization.update({
      where: { id: authId },
      data: updateData,
      include: {
        ligne: { select: { id: true, numero: true, nom: true } },
        depotSource: { select: { id: true, nom: true } },
        depotExploitant: { select: { id: true, nom: true } }
      }
    });

    res.json({
      success: true,
      message: 'Autorisation mise à jour avec succès',
      data: updated
    });
  } catch (error) {
    console.error('[INTER-DEPOT-AUTH] PUT update ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/lignes/:ligneId/inter-depot-auth/:authId
 * Révoquer une autorisation
 */
router.delete('/lignes/:ligneId/inter-depot-auth/:authId', async (req, res) => {
  try {
    const { authId } = req.params;

    const auth = await prisma.interDepotAuthorization.findUnique({
      where: { id: authId }
    });

    if (!auth) {
      return res.status(404).json({ error: 'Autorisation non trouvée' });
    }

    await prisma.interDepotAuthorization.delete({
      where: { id: authId }
    });

    res.json({ success: true, message: 'Autorisation révoquée avec succès' });
  } catch (error) {
    console.error('[INTER-DEPOT-AUTH] DELETE error ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== INTER-DEPOT SERVICE TRANSFER ====================

/**
 * POST /api/inter-depot-service-transfer
 * Transférer un service inter-dépôt
 * Body: { serviceId, authorizationId, depotExecutionId, raison? }
 */
router.post('/inter-depot-service-transfer', async (req, res) => {
  try {
    const { serviceId, authorizationId, depotExecutionId, raison } = req.body;

    if (!serviceId || !authorizationId || !depotExecutionId) {
      return res.status(400).json({
        error: 'serviceId, authorizationId et depotExecutionId sont requis'
      });
    }

    // Vérifier le service
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { ligne: true }
    });

    if (!service) {
      return res.status(404).json({ error: 'Service non trouvé' });
    }

    // Vérifier l'autorisation
    const auth = await prisma.interDepotAuthorization.findUnique({
      where: { id: authorizationId }
    });

    if (!auth) {
      return res.status(404).json({ error: 'Autorisation non trouvée' });
    }

    // Valider l'autorisation
    if (auth.statut !== 'ACTIVE') {
      return res.status(400).json({ error: 'Autorisation inactive' });
    }

    if (auth.ligneId !== service.ligneId) {
      return res.status(400).json({ error: 'Autorisation ne correspond pas à cette ligne' });
    }

    if (!auth.canTakeOver) {
      return res.status(400).json({ error: 'Dépôt non autorisé à reprendre des courses' });
    }

    if (auth.dateFin && new Date() > new Date(auth.dateFin)) {
      return res.status(400).json({ error: 'Autorisation expirée' });
    }

    if (auth.depotExploitantId !== depotExecutionId) {
      return res.status(400).json({ error: 'Dépôt exécutant ne correspond pas' });
    }

    // Vérifier le nombre de transferts du jour
    if (auth.maxCourses) {
      const today = new Date();
      const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const dayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const transfersToday = await prisma.interDepotServiceTransfer.count({
        where: {
          authorizationId,
          createdAt: { gte: dayStart, lt: dayEnd }
        }
      });

      if (transfersToday >= auth.maxCourses) {
        return res.status(400).json({
          error: `Limite quotidienne atteinte (${auth.maxCourses})`
        });
      }
    }

    // Créer le transfert
    const transfer = await prisma.interDepotServiceTransfer.create({
      data: {
        serviceId,
        authorizationId,
        depotOrigineId: auth.depotSourceId,
        depotExecutionId,
        raison: raison || 'Transfert inter-dépôt',
        statut: 'TRANSFERÉ'
      },
      include: {
        service: {
          include: { ligne: { select: { numero: true, nom: true } } }
        },
        depotOrigine: { select: { id: true, nom: true } },
        depotExecution: { select: { id: true, nom: true } }
      }
    });

    res.json({
      success: true,
      message: 'Service transféré avec succès',
      data: transfer
    });
  } catch (error) {
    console.error('[INTER-DEPOT-TRANSFER] POST error ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/inter-depot-service-transfer
 * Lister les transferts de services
 */
router.get('/inter-depot-service-transfer', async (req, res) => {
  try {
    const { depotId, status, limit = 50, offset = 0 } = req.query;

    const where = {};

    if (depotId) {
      where.OR = [
        { depotOrigineId: depotId },
        { depotExecutionId: depotId }
      ];
    }

    if (status) {
      where.statut = status;
    }

    const transfers = await prisma.interDepotServiceTransfer.findMany({
      where,
      include: {
        service: {
          include: { ligne: { select: { numero: true, nom: true } } }
        },
        depotOrigine: { select: { id: true, nom: true } },
        depotExecution: { select: { id: true, nom: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    const total = await prisma.interDepotServiceTransfer.count({ where });

    res.json({
      data: transfers,
      pagination: { total, limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (error) {
    console.error('[INTER-DEPOT-TRANSFER] GET list ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
