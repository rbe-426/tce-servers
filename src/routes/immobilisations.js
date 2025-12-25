const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * GET /api/immobilisations
 * Liste toutes les demandes d'immobilisation avec filtres optionnels
 */
const listImmobilisations = async (req, res) => {
  try {
    const { statut, vehicleParc, dateDebut, dateFin, poste } = req.query;
    
    const where = {};
    if (statut) where.statut = statut;
    if (vehicleParc) where.vehicleParc = vehicleParc;
    if (poste) where.demandeurPoste = poste;
    
    if (dateDebut || dateFin) {
      where.dateDebut = {};
      if (dateDebut) where.dateDebut.gte = new Date(dateDebut);
      if (dateFin) where.dateDebut.lte = new Date(dateFin);
    }

    const immobilisations = await prisma.immobilisationRequest.findMany({
      where,
      include: {
        vehicle: {
          select: {
            parc: true,
            type: true,
            modele: true,
            immat: true,
            statut: true
          }
        },
        createdBy: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            poste: true,
            email: true
          }
        },
        approvedBy: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            poste: true
          }
        }
      },
      orderBy: { dateDebut: 'desc' },
      take: 500
    });

    res.json({
      total: immobilisations.length,
      immobilisations
    });
  } catch (e) {
    console.error('GET /api/immobilisations ERROR ->', e.message);
    res.status(500).json({ error: String(e.message) });
  }
};

/**
 * GET /api/immobilisations/:id
 * Récupère une demande d'immobilisation spécifique
 */
const getImmobilisation = async (req, res) => {
  try {
    const { id } = req.params;
    
    const immobilisation = await prisma.immobilisationRequest.findUnique({
      where: { id },
      include: {
        vehicle: true,
        createdBy: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            poste: true,
            email: true,
            etablissementId: true
          }
        },
        approvedBy: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            poste: true
          }
        }
      }
    });

    if (!immobilisation) {
      return res.status(404).json({ error: 'Demande non trouvée' });
    }

    res.json(immobilisation);
  } catch (e) {
    console.error('GET /api/immobilisations/:id ERROR ->', e.message);
    res.status(500).json({ error: String(e.message) });
  }
};

/**
 * POST /api/immobilisations
 * Crée une nouvelle demande d'immobilisation
 * Body: {
 *   vehicleParc: string (requis),
 *   dateDebut: ISO datetime (requis),
 *   dateFin: ISO datetime (optionnel),
 *   motif: string (requis),
 *   description: string (requis),
 *   demandeurPoste: string (requis),
 *   createdById: string (requis)
 * }
 */
const createImmobilisation = async (req, res) => {
  try {
    const { vehicleParc, dateDebut, dateFin, motif, description, demandeurPoste, createdById } = req.body;

    // Validation
    if (!vehicleParc || !dateDebut || !motif || !description || !demandeurPoste || !createdById) {
      return res.status(400).json({ 
        error: 'Paramètres requis manquants',
        required: ['vehicleParc', 'dateDebut', 'motif', 'description', 'demandeurPoste', 'createdById']
      });
    }

    // Vérifier que le véhicule existe
    const vehicle = await prisma.vehicle.findUnique({
      where: { parc: vehicleParc }
    });

    if (!vehicle) {
      return res.status(404).json({ error: `Véhicule ${vehicleParc} non trouvé` });
    }

    // Vérifier que le demandeur existe
    const createdByUser = await prisma.employe.findUnique({
      where: { id: createdById }
    });

    if (!createdByUser) {
      return res.status(404).json({ error: 'Demandeur non trouvé' });
    }

    // Créer la demande
    const immobilisation = await prisma.immobilisationRequest.create({
      data: {
        vehicleParc,
        dateDebut: new Date(dateDebut),
        dateFin: dateFin ? new Date(dateFin) : null,
        motif,
        description,
        demandeurPoste,
        createdById,
        statut: demandeurPoste === 'SAEIV' ? 'APPROUVÉ' : 'EN_ATTENTE', // Les demandes SAEIV sont auto-approuvées
        dateApproved: demandeurPoste === 'SAEIV' ? new Date() : null,
        approvedById: demandeurPoste === 'SAEIV' ? createdById : null
      },
      include: {
        vehicle: {
          select: {
            parc: true,
            type: true,
            modele: true,
            immat: true
          }
        },
        createdBy: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            poste: true
          }
        }
      }
    });

    // Mettre à jour le statut du véhicule à IMMOBILISÉ
    if (demandeurPoste === 'SAEIV') {
      await prisma.vehicle.update({
        where: { parc: vehicleParc },
        data: { statut: 'IMMOBILISÉ' }
      });
    }

    res.status(201).json({
      message: 'Demande d\'immobilisation créée',
      immobilisation
    });
  } catch (e) {
    console.error('POST /api/immobilisations ERROR ->', e.message);
    res.status(500).json({ error: String(e.message) });
  }
};

/**
 * PUT /api/immobilisations/:id
 * Approuve ou rejette une demande d'immobilisation
 * Body: {
 *   statut: "APPROUVÉ" | "REJETÉ" (requis),
 *   approvedById: string (requis si approuvé),
 *   raison_rejet: string (optionnel, mais recommandé si rejeté)
 * }
 */
const updateImmobilisation = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut, approvedById, raison_rejet } = req.body;

    if (!statut || !['APPROUVÉ', 'REJETÉ'].includes(statut)) {
      return res.status(400).json({ 
        error: 'Statut invalide. Doit être APPROUVÉ ou REJETÉ' 
      });
    }

    // Récupérer la demande
    const immobilisation = await prisma.immobilisationRequest.findUnique({
      where: { id }
    });

    if (!immobilisation) {
      return res.status(404).json({ error: 'Demande non trouvée' });
    }

    if (statut === 'APPROUVÉ' && !approvedById) {
      return res.status(400).json({ error: 'approvedById requis pour approuver' });
    }

    // Vérifier que l'approbateur existe
    if (approvedById) {
      const approver = await prisma.employe.findUnique({
        where: { id: approvedById }
      });
      if (!approver) {
        return res.status(404).json({ error: 'Approbateur non trouvé' });
      }
    }

    // Mettre à jour la demande
    const updated = await prisma.immobilisationRequest.update({
      where: { id },
      data: {
        statut,
        approvedById: statut === 'APPROUVÉ' ? approvedById : null,
        dateApproved: statut === 'APPROUVÉ' ? new Date() : null,
        raison_rejet: statut === 'REJETÉ' ? raison_rejet : null
      },
      include: {
        vehicle: {
          select: {
            parc: true,
            type: true,
            modele: true
          }
        },
        createdBy: {
          select: {
            nom: true,
            prenom: true,
            poste: true
          }
        },
        approvedBy: {
          select: {
            nom: true,
            prenom: true
          }
        }
      }
    });

    // Si approuvé, mettre à jour le statut du véhicule
    if (statut === 'APPROUVÉ') {
      await prisma.vehicle.update({
        where: { parc: immobilisation.vehicleParc },
        data: { statut: 'IMMOBILISÉ' }
      });
    }

    res.json({
      message: `Demande ${statut.toLowerCase()}e`,
      immobilisation: updated
    });
  } catch (e) {
    console.error('PUT /api/immobilisations/:id ERROR ->', e.message);
    res.status(500).json({ error: String(e.message) });
  }
};

/**
 * PUT /api/immobilisations/:id/complete
 * Marque une immobilisation comme complétée
 */
const completeImmobilisation = async (req, res) => {
  try {
    const { id } = req.params;

    const immobilisation = await prisma.immobilisationRequest.findUnique({
      where: { id }
    });

    if (!immobilisation) {
      return res.status(404).json({ error: 'Demande non trouvée' });
    }

    // Mettre à jour le statut
    const updated = await prisma.immobilisationRequest.update({
      where: { id },
      data: { 
        statut: 'COMPLÉTÉ',
        dateFin: new Date() // Définir la date de fin à maintenant
      },
      include: {
        vehicle: {
          select: {
            parc: true,
            type: true,
            modele: true
          }
        }
      }
    });

    // Mettre à jour le statut du véhicule à Disponible
    await prisma.vehicle.update({
      where: { parc: immobilisation.vehicleParc },
      data: { statut: 'Disponible' }
    });

    res.json({
      message: 'Immobilisation complétée',
      immobilisation: updated
    });
  } catch (e) {
    console.error('PUT /api/immobilisations/:id/complete ERROR ->', e.message);
    res.status(500).json({ error: String(e.message) });
  }
};

/**
 * DELETE /api/immobilisations/:id
 * Supprime une demande d'immobilisation
 */
const deleteImmobilisation = async (req, res) => {
  try {
    const { id } = req.params;

    const immobilisation = await prisma.immobilisationRequest.findUnique({
      where: { id }
    });

    if (!immobilisation) {
      return res.status(404).json({ error: 'Demande non trouvée' });
    }

    // Supprimer la demande
    await prisma.immobilisationRequest.delete({
      where: { id }
    });

    res.json({ message: 'Demande supprimée' });
  } catch (e) {
    console.error('DELETE /api/immobilisations/:id ERROR ->', e.message);
    res.status(500).json({ error: String(e.message) });
  }
};

/**
 * GET /api/immobilisations/vehicle/:vehicleParc/active
 * Récupère l'immobilisation active pour un véhicule donné
 */
const getActiveImmobilisationForVehicle = async (req, res) => {
  try {
    const { vehicleParc } = req.params;

    const active = await prisma.immobilisationRequest.findFirst({
      where: {
        vehicleParc,
        statut: { in: ['EN_ATTENTE', 'APPROUVÉ'] },
        dateDebut: {
          lte: new Date() // La date de début est passée
        },
        OR: [
          { dateFin: null }, // Pas de date de fin
          { dateFin: { gte: new Date() } } // La date de fin est dans le futur
        ]
      },
      include: {
        createdBy: {
          select: {
            nom: true,
            prenom: true,
            poste: true
          }
        }
      },
      orderBy: { dateDebut: 'desc' }
    });

    res.json({ immobilisation: active || null });
  } catch (e) {
    console.error('GET /api/immobilisations/vehicle/:vehicleParc/active ERROR ->', e.message);
    res.status(500).json({ error: String(e.message) });
  }
};

module.exports = {
  listImmobilisations,
  getImmobilisation,
  createImmobilisation,
  updateImmobilisation,
  completeImmobilisation,
  deleteImmobilisation,
  getActiveImmobilisationForVehicle
};
