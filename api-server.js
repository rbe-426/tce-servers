
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
app.get('/api/lignes', (req, res) => {
  res.json([]);
});

app.get('/api/conducteurs', (req, res) => {
  res.json([]);
});

app.get('/api/vehicles', (req, res) => {
  res.json([]);
});

app.listen(PORT, () => {
  console.log(`API Server running on http://localhost:${PORT}`);
});
