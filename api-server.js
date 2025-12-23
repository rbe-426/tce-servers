
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const PORT = process.env.PORT || 8081;
const prisma = new PrismaClient();

// CORS pour toutes les origines
app.use(cors());
app.use(express.json());

// Routes de diagnostic
app.get('/', (req, res) => {
  res.json({ message: 'TCE API', version: '1.0' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/today', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  res.json({ today });
});

// Endpoint réel pour les services
app.get('/api/services', async (req, res) => {
  try {
    // Optionnel : filtrer par date (ex: ?date=2025-12-23)
    const { date } = req.query;
    let where = {};
    if (date) {
      where = {
        date: {
          gte: new Date(date + 'T00:00:00Z'),
          lt: new Date(date + 'T23:59:59Z')
        }
      };
    }
    const services = await prisma.service.findMany({
      where,
      orderBy: { heureDebut: 'asc' },
      include: {
        ligne: true,
        sens: true,
        conducteur: true,
        // Ajoute d'autres relations si besoin
      }
    });
    res.json(services);
  } catch (err) {
    console.error('Erreur récupération services:', err);
    res.status(500).json({ error: 'Erreur récupération services' });
  }
});

// (Optionnel) : tu peux réactiver les autres endpoints si besoin

// Endpoint réel pour les lignes, sens et services
app.get('/api/lignes', async (req, res) => {
  try {
    // Optionnel : filtrer par date (ex: ?date=2025-12-23)
    const { date } = req.query;
    let serviceWhere = {};
    if (date) {
      serviceWhere = {
        date: {
          gte: new Date(date + 'T00:00:00Z'),
          lt: new Date(date + 'T23:59:59Z')
        }
      };
    }
    const lignes = await prisma.ligne.findMany({
      orderBy: { numero: 'asc' },
      include: {
        sens: {
          orderBy: { ordre: 'asc' },
          include: {
            services: {
              where: serviceWhere,
              orderBy: { heureDebut: 'asc' },
              include: {
                conducteur: true,
                vehicule: true,
              }
            }
          }
        }
      }
    });
    res.json(lignes);
  } catch (err) {
    console.error('Erreur récupération lignes:', err);
    res.status(500).json({ error: 'Erreur récupération lignes' });
  }
});


// --- Endpoints Etablissements/Dépôts ---
// Liste tous les établissements
app.get('/api/etablissements', async (req, res) => {
  try {
    const etablissements = await prisma.etablissement.findMany({
      include: {
        vehicles: true,
        employes: true,
        lignes: true,
      }
    });
    res.json(etablissements);
  } catch (err) {
    res.status(500).json({ error: 'Erreur récupération établissements' });
  }
});

// Détail d'un établissement
app.get('/api/etablissements/:id', async (req, res) => {
  try {
    const etab = await prisma.etablissement.findUnique({
      where: { id: req.params.id },
      include: {
        vehicles: true,
        employes: true,
        lignes: true,
      }
    });
    if (!etab) return res.status(404).json({ error: 'Etablissement non trouvé' });
    res.json(etab);
  } catch (err) {
    res.status(500).json({ error: 'Erreur récupération établissement' });
  }
});

// Création
app.post('/api/etablissements', async (req, res) => {
  try {
    const { nom, type, adresse } = req.body;
    const etab = await prisma.etablissement.create({
      data: { nom, type, adresse }
    });
    res.json(etab);
  } catch (err) {
    res.status(500).json({ error: 'Erreur création établissement' });
  }
});

// Modification
app.put('/api/etablissements/:id', async (req, res) => {
  try {
    const { nom, type, adresse } = req.body;
    const etab = await prisma.etablissement.update({
      where: { id: req.params.id },
      data: { nom, type, adresse }
    });
    res.json(etab);
  } catch (err) {
    res.status(500).json({ error: 'Erreur modification établissement' });
  }
});

// Suppression
app.delete('/api/etablissements/:id', async (req, res) => {
  try {
    await prisma.etablissement.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur suppression établissement' });
  }
});

app.listen(PORT, () => {
  console.log(`API Server running on http://localhost:${PORT}`);
});
