/**
 * Endpoints pour autorisations inter-dépôts
 * POST/GET/PUT/DELETE /api/lignes/:ligneId/inter-depot-auth
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * POST /api/lignes/:ligneId/inter-depot-auth
 * Créer une autorisation inter-dépôts
 */
export async function createInterDepotAuth(req, res) {
  try {
    const { ligneId } = req.params;
    const {
      depotSourceId,
      depotExploitantId,
      canTakeOver = true,
      maxCourses = null,
      periodicite = 'PERMANENT',
      dateFin = null,
      conditions = null,
      notes = null,
      approvedBy = null
    } = req.body;

    // Vérifier que la ligne existe
    const ligne = await prisma.ligne.findUnique({
      where: { id: ligneId }
    });
    if (!ligne) {
      return res.status(404).json({ error: 'Ligne non trouvée' });
    }

    // Vérifier que les dépôts existent
    const sourceDepot = await prisma.etablissement.findUnique({
      where: { id: depotSourceId }
    });
    const exploitantDepot = await prisma.etablissement.findUnique({
      where: { id: depotExploitantId }
    });

    if (!sourceDepot || !exploitantDepot) {
      return res.status(404).json({ error: 'Dépôt non trouvé' });
    }

    // Vérifier qu'il n'existe pas déjà une autorisation
    const existing = await prisma.interDepotAuthorization.findUnique({
      where: {
        ligneId_depotSourceId_depotExploitantId: {
          ligneId,
          depotSourceId,
          depotExploitantId
        }
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Une autorisation existe déjà pour cette combinaison' });
    }

    // Créer l'autorisation
    const auth = await prisma.interDepotAuthorization.create({
      data: {
        ligneId,
        depotSourceId,
        depotExploitantId,
        canTakeOver,
        maxCourses: maxCourses ? parseInt(maxCourses) : null,
        periodicite,
        dateDebut: new Date(),
        dateFin: dateFin ? new Date(dateFin) : null,
        conditions: conditions ? JSON.stringify(conditions) : null,
        notes,
        approuvePar: approvedBy,
        statut: 'ACTIVE'
      },
      include: {
        ligne: true,
        depotSource: true,
        depotExploitant: true
      }
    });

    res.status(201).json({
      success: true,
      data: {
        ...auth,
        conditions: auth.conditions ? JSON.parse(auth.conditions) : null
      },
      message: `Autorisation créée: Dépôt ${auth.depotExploitant.nom} peut exploiter ligne ${auth.ligne.numero}`
    });
  } catch (error) {
    console.error('[INTER_DEPOT_AUTH] Error creating auth:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/lignes/:ligneId/inter-depot-auth
 * Lister les autorisations pour une ligne
 */
export async function listInterDepotAuths(req, res) {
  try {
    const { ligneId } = req.params;

    const ligne = await prisma.ligne.findUnique({
      where: { id: ligneId },
      include: {
        interDepotAuths: {
          include: {
            depotSource: true,
            depotExploitant: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!ligne) {
      return res.status(404).json({ error: 'Ligne non trouvée' });
    }

    const auths = ligne.interDepotAuths.map(auth => ({
      id: auth.id,
      ligneNumber: ligne.numero,
      ligneName: ligne.nom,
      depotSource: auth.depotSource.nom,
      depotExploitant: auth.depotExploitant.nom,
      statut: auth.statut,
      canTakeOver: auth.canTakeOver,
      maxCourses: auth.maxCourses,
      periodicite: auth.periodicite,
      dateDebut: auth.dateDebut,
      dateFin: auth.dateFin,
      conditions: auth.conditions ? JSON.parse(auth.conditions) : null,
      notes: auth.notes,
      createdAt: auth.createdAt
    }));

    res.json({
      ligneId,
      ligneNumber: ligne.numero,
      total: auths.length,
      authorizations: auths
    });
  } catch (error) {
    console.error('[INTER_DEPOT_AUTH] Error listing auths:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/depots/:depotId/inter-depot-auth/owned
 * Lister les lignes que ce dépôt exploite (propriétaire)
 */
export async function listOwnedLineAuths(req, res) {
  try {
    const { depotId } = req.params;

    const auths = await prisma.interDepotAuthorization.findMany({
      where: { depotSourceId: depotId },
      include: {
        ligne: true,
        depotSource: true,
        depotExploitant: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = auths.map(auth => ({
      id: auth.id,
      ligneNumber: auth.ligne.numero,
      ligneName: auth.ligne.nom,
      depotAuthorized: auth.depotExploitant.nom,
      statut: auth.statut,
      maxCourses: auth.maxCourses,
      periodicite: auth.periodicite,
      dateFin: auth.dateFin,
      canTakeOver: auth.canTakeOver
    }));

    res.json({
      depotId,
      type: 'PROPRIÉTAIRE',
      total: formatted.length,
      authorizations: formatted
    });
  } catch (error) {
    console.error('[INTER_DEPOT_AUTH] Error listing owned auths:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/depots/:depotId/inter-depot-auth/authorized
 * Lister les lignes que ce dépôt peut exploiter (autorisé)
 */
export async function listAuthorizedLineAuths(req, res) {
  try {
    const { depotId } = req.params;

    const auths = await prisma.interDepotAuthorization.findMany({
      where: { depotExploitantId: depotId },
      include: {
        ligne: true,
        depotSource: true,
        depotExploitant: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = auths.map(auth => ({
      id: auth.id,
      ligneNumber: auth.ligne.numero,
      ligneName: auth.ligne.nom,
      depotOwner: auth.depotSource.nom,
      statut: auth.statut,
      maxCourses: auth.maxCourses,
      periodicite: auth.periodicite,
      dateFin: auth.dateFin,
      canTakeOver: auth.canTakeOver
    }));

    res.json({
      depotId,
      type: 'AUTORISÉ',
      total: formatted.length,
      authorizations: formatted
    });
  } catch (error) {
    console.error('[INTER_DEPOT_AUTH] Error listing authorized auths:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * PUT /api/inter-depot-auth/:authId
 * Modifier une autorisation
 */
export async function updateInterDepotAuth(req, res) {
  try {
    const { authId } = req.params;
    const {
      statut,
      canTakeOver,
      maxCourses,
      periodicite,
      dateFin,
      conditions,
      notes
    } = req.body;

    const auth = await prisma.interDepotAuthorization.findUnique({
      where: { id: authId }
    });

    if (!auth) {
      return res.status(404).json({ error: 'Autorisation non trouvée' });
    }

    const updated = await prisma.interDepotAuthorization.update({
      where: { id: authId },
      data: {
        ...(statut && { statut }),
        ...(canTakeOver !== undefined && { canTakeOver }),
        ...(maxCourses !== undefined && { maxCourses: maxCourses ? parseInt(maxCourses) : null }),
        ...(periodicite && { periodicite }),
        ...(dateFin && { dateFin: new Date(dateFin) }),
        ...(conditions && { conditions: JSON.stringify(conditions) }),
        ...(notes && { notes })
      },
      include: {
        ligne: true,
        depotSource: true,
        depotExploitant: true
      }
    });

    res.json({
      success: true,
      data: {
        ...updated,
        conditions: updated.conditions ? JSON.parse(updated.conditions) : null
      },
      message: 'Autorisation mise à jour'
    });
  } catch (error) {
    console.error('[INTER_DEPOT_AUTH] Error updating auth:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * DELETE /api/inter-depot-auth/:authId
 * Révoquer une autorisation
 */
export async function deleteInterDepotAuth(req, res) {
  try {
    const { authId } = req.params;

    const auth = await prisma.interDepotAuthorization.findUnique({
      where: { id: authId }
    });

    if (!auth) {
      return res.status(404).json({ error: 'Autorisation non trouvée' });
    }

    // Soft delete: marquer comme REFUSÉE
    const deleted = await prisma.interDepotAuthorization.update({
      where: { id: authId },
      data: { statut: 'REFUSÉE' }
    });

    res.json({
      success: true,
      message: 'Autorisation révoquée'
    });
  } catch (error) {
    console.error('[INTER_DEPOT_AUTH] Error deleting auth:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/inter-depot-service-transfer
 * Transférer un service inter-dépôt
 */
export async function transferServiceInterDepot(req, res) {
  try {
    const { serviceId, authorizationId, depotExecutionId, raison } = req.body;

    // Vérifier que le service existe
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

    if (auth.dateFin && new Date() > new Date(auth.dateFin)) {
      return res.status(400).json({ error: 'Autorisation expirée' });
    }

    if (!auth.canTakeOver) {
      return res.status(400).json({ error: 'Ce dépôt n\'est pas autorisé à reprendre des courses' });
    }

    if (auth.depotExploitantId !== depotExecutionId) {
      return res.status(400).json({ error: 'Dépôt non autorisé' });
    }

    // Vérifier les limites quotidiennes
    if (auth.maxCourses) {
      const today = new Date();
      const transfersToday = await prisma.interDepotServiceTransfer.count({
        where: {
          authorizationId,
          createdAt: {
            gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
            lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
          }
        }
      });

      if (transfersToday >= auth.maxCourses) {
        return res.status(400).json({
          error: `Limite quotidienne atteinte (${auth.maxCourses} courses/jour)`
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
        raison: raison || null,
        statut: 'TRANSFERÉ'
      },
      include: {
        service: { include: { ligne: true } },
        authorization: true,
        depotOrigine: true,
        depotExecution: true
      }
    });

    res.status(201).json({
      success: true,
      data: transfer,
      message: `Service transféré de ${transfer.depotOrigine.nom} vers ${transfer.depotExecution.nom}`
    });
  } catch (error) {
    console.error('[INTER_DEPOT_TRANSFER] Error transferring service:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/inter-depot-service-transfer
 * Lister les transferts inter-dépôts
 */
export async function listInterDepotTransfers(req, res) {
  try {
    const { authorizationId, depotId, page = 1, limit = 20 } = req.query;

    const where = {};
    if (authorizationId) where.authorizationId = authorizationId;
    if (depotId) {
      where.OR = [
        { depotOrigineId: depotId },
        { depotExecutionId: depotId }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [transfers, total] = await Promise.all([
      prisma.interDepotServiceTransfer.findMany({
        where,
        include: {
          service: { include: { ligne: true, conducteur: true } },
          authorization: true,
          depotOrigine: true,
          depotExecution: true
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.interDepotServiceTransfer.count({ where })
    ]);

    res.json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit)),
      transfers: transfers.map(t => ({
        id: t.id,
        ligneNumber: t.service.ligne.numero,
        date: t.service.date,
        heureDebut: t.service.heureDebut,
        heureFin: t.service.heureFin,
        depotOrigine: t.depotOrigine.nom,
        depotExecution: t.depotExecution.nom,
        conducteur: t.service.conducteur ? `${t.service.conducteur.prenom} ${t.service.conducteur.nom}` : 'N/A',
        raison: t.raison,
        statut: t.statut,
        createdAt: t.createdAt
      }))
    });
  } catch (error) {
    console.error('[INTER_DEPOT_TRANSFER] Error listing transfers:', error);
    res.status(500).json({ error: error.message });
  }
}
