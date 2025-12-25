/**
 * Endpoints pour gestion du personnel & rôles
 * GET/POST /api/depots/:depotId/personnel/...
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ==================== Affectation de rôles ====================

/**
 * POST /api/depots/:depotId/personnel/assign-role
 * Affecter un rôle à un employé
 */
export async function assignEmployeeRole(req, res) {
  try {
    const { depotId } = req.params;
    const { employeId, role, dateDebut, dateFin } = req.body;

    // Valider le rôle
    const validRoles = ['DIRECTEUR_SITE', 'RESPONSABLE_EXPLOITATION', 'REGULATEUR', 'ASSUREUR', 'CONDUCTEUR'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Rôle invalide' });
    }

    // Vérifier que l'employé existe
    const employe = await prisma.employe.findUnique({
      where: { id: employeId }
    });
    if (!employe) {
      return res.status(404).json({ error: 'Employé non trouvé' });
    }

    // Vérifier que le dépôt existe
    const depot = await prisma.etablissement.findUnique({
      where: { id: depotId }
    });
    if (!depot) {
      return res.status(404).json({ error: 'Dépôt non trouvé' });
    }

    // Créer l'affectation
    const roleAssignment = await prisma.employeRole.create({
      data: {
        employeId,
        role,
        dateDebut: new Date(dateDebut),
        dateFin: dateFin ? new Date(dateFin) : null,
        depotId,
        isActif: true
      },
      include: {
        employe: true,
        depot: true
      }
    });

    // Mettre à jour les stats du personnel
    await updatePersonnelStats(depotId);

    res.status(201).json({
      success: true,
      data: roleAssignment,
      message: `Rôle ${role} assigné à ${employe.prenom} ${employe.nom}`
    });
  } catch (error) {
    console.error('[PERSONNEL] Error assigning role:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/depots/:depotId/personnel/stats
 * Obtenir les statistiques du personnel
 */
export async function getPersonnelStats(req, res) {
  try {
    const { depotId } = req.params;

    // Obtenir ou créer les stats
    let stats = await prisma.personnelStats.findUnique({
      where: { depotId }
    });

    if (!stats) {
      // Créer les stats si n'existent pas
      stats = await prisma.personnelStats.create({
        data: {
          depotId,
          directorCount: 0,
          responsableCount: 0,
          regulatorCount: 0,
          insurerCount: 0,
          driverCount: 0,
          totalPersonnel: 0
        }
      });
    }

    // Compter les rôles actuels
    const counts = await prisma.employeRole.groupBy({
      by: ['role'],
      where: {
        depotId,
        isActif: true,
        dateFin: { gte: new Date() }
      },
      _count: { id: true }
    });

    // Calculer les dénombrements
    const roleMap = {};
    counts.forEach(c => {
      roleMap[c.role] = c._count.id;
    });

    const directorCount = roleMap['DIRECTEUR_SITE'] || 0;
    const responsableCount = roleMap['RESPONSABLE_EXPLOITATION'] || 0;
    const regulatorCount = roleMap['REGULATEUR'] || 0;
    const insurerCount = roleMap['ASSUREUR'] || 0;
    const driverCount = roleMap['CONDUCTEUR'] || 0;

    // Calculer les statuts
    const statusChecks = {
      directeur: directorCount >= 1 ? 'OK' : 'MANQUANT',
      responsable: responsableCount >= 1 ? 'OK' : 'MANQUANT',
      regulateurs: regulatorCount >= 2 ? 'OK' : regulatorCount === 1 ? 'INCOMPLET' : 'MANQUANT',
      assureurs: insurerCount >= 3 ? 'OK' : insurerCount > 0 ? 'INCOMPLET' : 'MANQUANT',
      conducteurs: driverCount
    };

    res.json({
      depotId,
      personnel: {
        directeur: { nombre: directorCount, requis: 1, statut: statusChecks.directeur },
        responsable: { nombre: responsableCount, requis: 1, statut: statusChecks.responsable },
        regulateurs: { nombre: regulatorCount, requis: 2, statut: statusChecks.regulateurs },
        assureurs: { nombre: insurerCount, requis: 3, statut: statusChecks.assureurs },
        conducteurs: driverCount
      },
      total: directorCount + responsableCount + regulatorCount + insurerCount + driverCount,
      statusGlobal: statusChecks.directeur === 'OK' && statusChecks.responsable === 'OK' ? 'COMPLET' : 'INCOMPLET'
    });
  } catch (error) {
    console.error('[PERSONNEL] Error getting stats:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/depots/:depotId/personnel
 * Lister tout le personnel avec leurs rôles
 */
export async function listDepotPersonnel(req, res) {
  try {
    const { depotId } = req.params;

    const employes = await prisma.employe.findMany({
      where: { etablissementId: depotId },
      include: {
        roles: {
          where: { isActif: true },
          include: { depot: true }
        }
      },
      orderBy: { nom: 'asc' }
    });

    const personnelList = employes.map(e => ({
      id: e.id,
      nom: e.nom,
      prenom: e.prenom,
      email: e.email,
      poste: e.poste,
      statut: e.statut,
      roles: e.roles.map(r => ({
        id: r.id,
        role: r.role,
        dateDebut: r.dateDebut,
        dateFin: r.dateFin
      }))
    }));

    res.json({
      depotId,
      total: personnelList.length,
      personnel: personnelList
    });
  } catch (error) {
    console.error('[PERSONNEL] Error listing personnel:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * DELETE /api/personnel/roles/:roleId
 * Supprimer une affectation de rôle
 */
export async function deleteEmployeeRole(req, res) {
  try {
    const { roleId } = req.params;

    const role = await prisma.employeRole.findUnique({
      where: { id: roleId },
      include: { depot: true, employe: true }
    });

    if (!role) {
      return res.status(404).json({ error: 'Affectation non trouvée' });
    }

    // Soft delete: marquer comme inactif
    const deleted = await prisma.employeRole.update({
      where: { id: roleId },
      data: {
        isActif: false,
        dateFin: new Date()
      }
    });

    // Mettre à jour les stats
    if (role.depotId) {
      await updatePersonnelStats(role.depotId);
    }

    res.json({
      success: true,
      message: `Rôle ${role.role} supprimé pour ${role.employe.prenom} ${role.employe.nom}`
    });
  } catch (error) {
    console.error('[PERSONNEL] Error deleting role:', error);
    res.status(500).json({ error: error.message });
  }
}

// ==================== Fonction utilitaire ====================

/**
 * Mise à jour des statistiques du personnel
 */
async function updatePersonnelStats(depotId) {
  try {
    const counts = await prisma.employeRole.groupBy({
      by: ['role'],
      where: {
        depotId,
        isActif: true,
        dateFin: { gte: new Date() }
      },
      _count: { id: true }
    });

    const roleMap = {};
    counts.forEach(c => {
      roleMap[c.role] = c._count.id;
    });

    const total = counts.reduce((sum, c) => sum + c._count.id, 0);

    await prisma.personnelStats.upsert({
      where: { depotId },
      create: {
        depotId,
        directorCount: roleMap['DIRECTEUR_SITE'] || 0,
        responsableCount: roleMap['RESPONSABLE_EXPLOITATION'] || 0,
        regulatorCount: roleMap['REGULATEUR'] || 0,
        insurerCount: roleMap['ASSUREUR'] || 0,
        driverCount: roleMap['CONDUCTEUR'] || 0,
        totalPersonnel: total
      },
      update: {
        directorCount: roleMap['DIRECTEUR_SITE'] || 0,
        responsableCount: roleMap['RESPONSABLE_EXPLOITATION'] || 0,
        regulatorCount: roleMap['REGULATEUR'] || 0,
        insurerCount: roleMap['ASSUREUR'] || 0,
        driverCount: roleMap['CONDUCTEUR'] || 0,
        totalPersonnel: total,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error('[PERSONNEL] Error updating stats:', error);
  }
}

export { updatePersonnelStats };
