import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// ===== CAMPAGNES =====

// Initialiser les campagnes (admin)
router.post('/campagnes-abribus/init', async (req, res) => {
  try {
    // Vérifier si les campagnes existent déjà
    const existingCount = await prisma.campagneAbribus.count();
    
    if (existingCount === 0) {
      const campagnes = [
        {
          type: 'VERIFICATION_CARROSSERIE',
          nom: 'Relevé Carrosserie',
          description: 'Relevé complet de l\'état de la carrosserie pour tous les véhicules',
          dateDebut: new Date('2026-01-01'),
          dateFin: new Date('2026-02-01'),
          statut: 'EN_COURS'
        },
        {
          type: 'VERIFICATION_CHAUFFAGE',
          nom: 'Vérification Chauffages',
          description: 'Vérification des systèmes de chauffage conducteurs et voyageurs',
          dateDebut: new Date('2026-01-05'),
          dateFin: new Date('2026-02-15'),
          statut: 'EN_COURS'
        },
        {
          type: 'VERIFICATION_SAEIV',
          nom: 'Vérification SAEIV',
          description: 'Contrôle des systèmes de sécurité et d\'accessibilité des véhicules',
          dateDebut: new Date('2026-01-10'),
          dateFin: new Date('2026-02-20'),
          statut: 'EN_COURS'
        }
      ];

      const created = [];
      for (const campagne of campagnes) {
        const result = await prisma.campagneAbribus.create({ data: campagne });
        created.push(result);
      }

      return res.status(201).json({
        message: 'Campagnes créées avec succès',
        campagnes: created
      });
    }

    const all = await prisma.campagneAbribus.findMany();
    res.json({ message: 'Campagnes déjà existantes', campagnes: all });
  } catch (err) {
    console.error('Erreur init campagnes:', err);
    res.status(500).json({ error: 'Erreur initialisation campagnes' });
  }
});

// Récupérer toutes les campagnes
router.get('/campagnes-abribus', async (req, res) => {
  try {
    const campagnes = await prisma.campagneAbribus.findMany({
      orderBy: { dateDebut: 'desc' },
      include: {
        _count: {
          select: {
            verifications: true,
            indisponibilites: true
          }
        }
      }
    });
    res.json(campagnes);
  } catch (err) {
    console.error('Erreur récupération campagnes:', err);
    res.status(500).json({ error: 'Erreur récupération campagnes' });
  }
});

// Récupérer une campagne avec détails
router.get('/campagnes-abribus/:id', async (req, res) => {
  try {
    const campagne = await prisma.campagneAbribus.findUnique({
      where: { id: req.params.id },
      include: {
        verifications: {
          include: {
            vehicle: true
          }
        },
        indisponibilites: {
          include: {
            vehicle: true
          }
        }
      }
    });
    if (!campagne) return res.status(404).json({ error: 'Campagne non trouvée' });
    res.json(campagne);
  } catch (err) {
    console.error('Erreur récupération campagne:', err);
    res.status(500).json({ error: 'Erreur récupération campagne' });
  }
});

// Créer une campagne (admin)
router.post('/campagnes-abribus', async (req, res) => {
  try {
    const { type, nom, description, dateDebut, dateFin } = req.body;
    
    if (!type || !nom || !dateDebut || !dateFin) {
      return res.status(400).json({ error: 'Données incomplètes' });
    }

    const campagne = await prisma.campagneAbribus.create({
      data: {
        type,
        nom,
        description,
        dateDebut: new Date(dateDebut),
        dateFin: new Date(dateFin),
        statut: 'EN_COURS'
      }
    });
    res.status(201).json(campagne);
  } catch (err) {
    console.error('Erreur création campagne:', err);
    res.status(500).json({ error: 'Erreur création campagne' });
  }
});

// ===== VÉRIFICATIONS =====

// Soumettre une vérification
router.post('/campagnes-abribus/:campagneId/verifications', async (req, res) => {
  try {
    const { vehicleParc, agentNom, agentPrenom, dateVerification, heureVerification, anomalies, notes, photos } = req.body;
    const { campagneId } = req.params;

    if (!vehicleParc || !agentNom || !agentPrenom || !dateVerification) {
      return res.status(400).json({ error: 'Données incomplètes' });
    }

    // Vérifier que la campagne existe
    const campagne = await prisma.campagneAbribus.findUnique({
      where: { id: campagneId }
    });
    if (!campagne) return res.status(404).json({ error: 'Campagne non trouvée' });

    // Vérifier que le véhicule existe
    const vehicle = await prisma.vehicle.findUnique({
      where: { parc: vehicleParc }
    });
    if (!vehicle) return res.status(404).json({ error: 'Véhicule non trouvé' });

    // Vérifier qu'une vérification n'existe pas déjà pour ce couple
    const existante = await prisma.verificationCampagne.findUnique({
      where: {
        campagneId_vehicleParc: {
          campagneId,
          vehicleParc
        }
      }
    });

    let verification;
    if (existante) {
      // Mettre à jour la vérification existante
      verification = await prisma.verificationCampagne.update({
        where: { id: existante.id },
        data: {
          anomaliesJson: JSON.stringify(anomalies || []),
          notes,
          photosJson: JSON.stringify(photos || []),
          dateVerification: new Date(dateVerification),
          heureVerification,
          statut: 'VÉRIFIÉE'
        }
      });
    } else {
      // Créer une nouvelle vérification
      verification = await prisma.verificationCampagne.create({
        data: {
          campagneId,
          vehicleParc,
          agentNom,
          agentPrenom,
          dateVerification: new Date(dateVerification),
          heureVerification,
          anomaliesJson: JSON.stringify(anomalies || []),
          notes,
          photosJson: JSON.stringify(photos || []),
          statut: 'VÉRIFIÉE'
        }
      });
    }

    res.status(201).json(verification);
  } catch (err) {
    console.error('Erreur création vérification:', err);
    res.status(500).json({ error: 'Erreur création vérification' });
  }
});

// Récupérer les vérifications d'une campagne
router.get('/campagnes-abribus/:campagneId/verifications', async (req, res) => {
  try {
    const { campagneId } = req.params;
    const { statut } = req.query;

    let where = { campagneId };
    if (statut) where.statut = statut;

    const verifications = await prisma.verificationCampagne.findMany({
      where,
      include: {
        vehicle: true,
        campagne: true
      },
      orderBy: { dateVerification: 'desc' }
    });

    res.json(verifications);
  } catch (err) {
    console.error('Erreur récupération vérifications:', err);
    res.status(500).json({ error: 'Erreur récupération vérifications' });
  }
});

// Récupérer une vérification spécifique
router.get('/verifications/:id', async (req, res) => {
  try {
    const verification = await prisma.verificationCampagne.findUnique({
      where: { id: req.params.id },
      include: {
        vehicle: true,
        campagne: true
      }
    });
    if (!verification) return res.status(404).json({ error: 'Vérification non trouvée' });
    
    // Parser les JSON
    const result = {
      ...verification,
      anomalies: JSON.parse(verification.anomaliesJson || '[]'),
      photos: JSON.parse(verification.photosJson || '[]')
    };
    
    res.json(result);
  } catch (err) {
    console.error('Erreur récupération vérification:', err);
    res.status(500).json({ error: 'Erreur récupération vérification' });
  }
});

// ===== INDISPONIBILITÉS =====

// Programmer une indisponibilité (pour Chauffage/SAEIV)
router.post('/campagnes-abribus/:campagneId/indisponibilites', async (req, res) => {
  try {
    const { vehicleParc, dateDebut, dateFin, motif } = req.body;
    const { campagneId } = req.params;

    if (!vehicleParc || !dateDebut || !dateFin || !motif) {
      return res.status(400).json({ error: 'Données incomplètes' });
    }

    // Vérifier que la campagne existe
    const campagne = await prisma.campagneAbribus.findUnique({
      where: { id: campagneId }
    });
    if (!campagne) return res.status(404).json({ error: 'Campagne non trouvée' });

    // Vérifier que le véhicule existe
    const vehicle = await prisma.vehicle.findUnique({
      where: { parc: vehicleParc }
    });
    if (!vehicle) return res.status(404).json({ error: 'Véhicule non trouvé' });

    // Vérifier qu'une indisponibilité n'existe pas déjà
    const existante = await prisma.indisponibiliteProgrammee.findFirst({
      where: {
        campagneId,
        vehicleParc,
        statut: 'PROGRAMMÉE'
      }
    });

    let indisponibilite;
    if (existante) {
      // Mettre à jour
      indisponibilite = await prisma.indisponibiliteProgrammee.update({
        where: { id: existante.id },
        data: {
          dateDebut: new Date(dateDebut),
          dateFin: new Date(dateFin),
          motif
        }
      });
    } else {
      // Créer
      indisponibilite = await prisma.indisponibiliteProgrammee.create({
        data: {
          campagneId,
          vehicleParc,
          dateDebut: new Date(dateDebut),
          dateFin: new Date(dateFin),
          motif,
          statut: 'PROGRAMMÉE',
          notificationDG: false
        }
      });
    }

    res.status(201).json(indisponibilite);
  } catch (err) {
    console.error('Erreur création indisponibilité:', err);
    res.status(500).json({ error: 'Erreur création indisponibilité' });
  }
});

// Récupérer les indisponibilités d'une campagne
router.get('/campagnes-abribus/:campagneId/indisponibilites', async (req, res) => {
  try {
    const { campagneId } = req.params;
    const { statut } = req.query;

    let where = { campagneId };
    if (statut) where.statut = statut;

    const indisponibilites = await prisma.indisponibiliteProgrammee.findMany({
      where,
      include: {
        vehicle: true,
        campagne: true
      },
      orderBy: { dateDebut: 'desc' }
    });

    res.json(indisponibilites);
  } catch (err) {
    console.error('Erreur récupération indisponibilités:', err);
    res.status(500).json({ error: 'Erreur récupération indisponibilités' });
  }
});

// Notifier DG d'une indisponibilité
router.put('/indisponibilites/:id/notify-dg', async (req, res) => {
  try {
    const indisponibilite = await prisma.indisponibiliteProgrammee.update({
      where: { id: req.params.id },
      data: { notificationDG: true }
    });
    // TODO: Implémenter notification email au DG
    res.json(indisponibilite);
  } catch (err) {
    console.error('Erreur notification DG:', err);
    res.status(500).json({ error: 'Erreur notification DG' });
  }
});

// ===== RÉSOLUTION CARROSSERIE =====

// Créer une résolution carrosserie à partir d'une vérification
router.post('/resolutions-carrosserie', async (req, res) => {
  try {
    const { verificationId } = req.body;

    if (!verificationId) {
      return res.status(400).json({ error: 'verificationId requis' });
    }

    // Récupérer la vérification
    const verification = await prisma.verificationCampagne.findUnique({
      where: { id: verificationId }
    });
    if (!verification) return res.status(404).json({ error: 'Vérification non trouvée' });

    // Créer la résolution
    const resolution = await prisma.resolutionCarrosserie.create({
      data: {
        verificationId,
        vehicleParc: verification.vehicleParc,
        anomaliesOriginales: verification.anomaliesJson,
        statut: 'EN_ATTENTE'
      }
    });

    res.status(201).json(resolution);
  } catch (err) {
    console.error('Erreur création résolution:', err);
    res.status(500).json({ error: 'Erreur création résolution' });
  }
});

// Récupérer les résolutions carrosserie
router.get('/resolutions-carrosserie', async (req, res) => {
  try {
    const { statut, vehicleParc } = req.query;

    let where = {};
    if (statut) where.statut = statut;
    if (vehicleParc) where.vehicleParc = vehicleParc;

    const resolutions = await prisma.resolutionCarrosserie.findMany({
      where,
      include: {
        vehicle: true,
        verification: {
          include: {
            campagne: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Parser les anomalies
    const result = resolutions.map(r => ({
      ...r,
      anomaliesOriginales: JSON.parse(r.anomaliesOriginales || '[]')
    }));

    res.json(result);
  } catch (err) {
    console.error('Erreur récupération résolutions:', err);
    res.status(500).json({ error: 'Erreur récupération résolutions' });
  }
});

// Mettre à jour une résolution carrosserie
router.put('/resolutions-carrosserie/:id', async (req, res) => {
  try {
    const { statut, motifsIntervention, resultat, notes, dateDebut, dateCompletion } = req.body;

    const resolution = await prisma.resolutionCarrosserie.update({
      where: { id: req.params.id },
      data: {
        statut: statut || undefined,
        motifsIntervention: motifsIntervention || undefined,
        resultat: resultat || undefined,
        notes: notes || undefined,
        dateDebut: dateDebut ? new Date(dateDebut) : undefined,
        dateCompletion: dateCompletion ? new Date(dateCompletion) : undefined
      },
      include: {
        vehicle: true,
        verification: {
          include: {
            campagne: true
          }
        }
      }
    });

    res.json(resolution);
  } catch (err) {
    console.error('Erreur mise à jour résolution:', err);
    res.status(500).json({ error: 'Erreur mise à jour résolution' });
  }
});

// Statistiques d'une campagne
router.get('/campagnes-abribus/:campagneId/stats', async (req, res) => {
  try {
    const { campagneId } = req.params;

    const campagne = await prisma.campagneAbribus.findUnique({
      where: { id: campagneId }
    });
    if (!campagne) return res.status(404).json({ error: 'Campagne non trouvée' });

    const verifications = await prisma.verificationCampagne.findMany({
      where: { campagneId }
    });

    // Compter les anomalies
    const anomaliesCounts = {};
    verifications.forEach(v => {
      const anomalies = JSON.parse(v.anomaliesJson || '[]');
      anomalies.forEach(anom => {
        anomaliesCounts[anom.id] = (anomaliesCounts[anom.id] || 0) + 1;
      });
    });

    // Compter les agents
    const agentsCounts = {};
    verifications.forEach(v => {
      const agent = `${v.agentPrenom} ${v.agentNom}`;
      agentsCounts[agent] = (agentsCounts[agent] || 0) + 1;
    });

    // Indisponibilités
    const indisponibilites = await prisma.indisponibiliteProgrammee.findMany({
      where: { campagneId },
      select: { statut: true }
    });

    const stats = {
      totalVerifications: verifications.length,
      totalIndisponibilites: indisponibilites.length,
      indisponibilitesParStatut: {
        programmees: indisponibilites.filter(i => i.statut === 'PROGRAMMÉE').length,
        effectuees: indisponibilites.filter(i => i.statut === 'EFFECTUÉE').length,
        annulees: indisponibilites.filter(i => i.statut === 'ANNULÉE').length
      },
      anomaliesMostFrequent: Object.entries(anomaliesCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
      agentsMostActive: Object.entries(agentsCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
    };

    res.json(stats);
  } catch (err) {
    console.error('Erreur statistiques campagne:', err);
    res.status(500).json({ error: 'Erreur statistiques campagne' });
  }
});

export default router;
