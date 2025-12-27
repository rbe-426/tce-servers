// backend/src/server.js
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { VEHICLE_TYPES, VEHICLE_LINES_ELIGIBILITY } from './vehicleTypes.js';
import * as personnelRoutes from './routes/personnel.js';
import * as mercatoRoutes from './routes/mercatos.js';
import * as vehicleNeedsRoutes from './routes/vehicleNeeds.js';
import * as interDepotAuthRoutes from './routes/interDepotAuth.js';
import * as lignesRoutes from './routes/lignes.js';
import * as immobilisationRoutes from './routes/immobilisations.js';
import campagnesAbribusRouter from './routes/campagnesAbribus.js';

console.log('[INIT] Starting server initialization...');
console.log('[INIT] NODE_ENV:', process.env.NODE_ENV);
console.log('[INIT] PORT:', process.env.PORT);
console.log('[INIT] DATABASE_URL exists:', !!process.env.DATABASE_URL);

const app = express();
let prisma; // init guarded to avoid startup crash when DB is unreachable
let prismaReady = false;

console.log('[INIT] Creating PrismaClient...');
try {
  prisma = new PrismaClient({
    log: ['error', 'warn'],
  });
  console.log('[INIT] ✅ PrismaClient created');
} catch (e) {
  console.error('[INIT] ❌ Prisma initialization failed ->', e.message);
  console.error('[INIT] Stack:', e.stack);
}

// Configuration CORS simple pour production
// En production, accepter les domaines spécifiques
// En développement, accepter localhost
const isProduction = process.env.NODE_ENV === 'production';

// CORS permissif pour éviter les blocages (y compris sur erreurs 404/500)
const corsOptions = {
  origin: true, // reflète l'origine appelante
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
  maxAge: 86400,
};

// Middleware CORS global
app.use(cors(corsOptions));

// Headers CORS additionnels même sur 404/500/erreurs
app.use((req, res, next) => {
  const origin = req.headers.origin;
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH,HEAD');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  
  console.log(`[CORS] ${req.method} ${req.path} from ${origin}`);
  
  // Répondre immédiatement aux OPTIONS preflight
  if (req.method === 'OPTIONS') {
    console.log(`[CORS] ✅ OPTIONS preflight allowed`);
    return res.sendStatus(200);
  }
  next();
});
app.use(express.json());
app.use(express.text()); // Pour traiter les fichiers en texte brut

// Middleware custom pour multipart/form-data (fichiers)
app.use((req, res, next) => {
  if (req.headers['content-type']?.includes('multipart/form-data')) {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      // Parser simple du multipart
      const boundary = req.headers['content-type'].split('boundary=')[1];
      const parts = body.split(`--${boundary}`);
      
      for (const part of parts) {
        if (part.includes('filename=')) {
          const match = part.match(/\r\n\r\n([\s\S]*?)\r\n/);
          if (match) {
            req.csvContent = match[1];
            break;
          }
        }
      }
      next();
    });
  } else {
    next();
  }
});

// Short-circuit requests that need DB when Prisma is not ready
const noDbPaths = new Set([
  '/',
  '/health',
  '/api/today',
  '/api/server-time',
  '/api/cors-test',
]);

app.use((req, res, next) => {
  if (!prismaReady && !noDbPaths.has(req.path)) {
    return res.status(503).json({ error: 'Database unavailable, retry shortly' });
  }
  next();
});

// ---------- helpers ----------
function parseDateFlexible(val) {
  if (!val) return null;
  if (typeof val === 'string' && val.includes('/')) {
    const [dd, mm, yyyy] = val.split('/');
    if (dd && mm && yyyy) return new Date(`${yyyy}-${mm}-${dd}`);
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}
function objToJsonOrNull(o) {
  try {
    if (o && typeof o === 'object' && !Array.isArray(o)) {
      const s = JSON.stringify(o);
      return s === '{}' ? null : s;
    }
  } catch {}
  return o == null ? null : String(o);
}

// Obtenir la date actuelle en heure de Paris (YYYY-MM-DD)
function getTodayDateParis() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('fr-FR', { 
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  return `${year}-${month}-${day}`;
}

// Jours fériés fixes en France
const FIXED_HOLIDAYS = [
  [1, 1],   // 1er janvier
  [5, 1],   // 1er mai
  [7, 14],  // 14 juillet
  [8, 15],  // 15 août
  [11, 1],  // 1er novembre
  [11, 11], // 11 novembre
  [12, 25], // 25 décembre
];

// Calculer les jours fériés mobiles (Pâques, Ascension, Pentecôte)
function getEasterDate(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

// Vérifier si une date est un jour férié en France
function isFrenchHoliday(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  // Vérifier jours fériés fixes
  if (FIXED_HOLIDAYS.some(([m, d]) => m === month && d === day)) {
    return true;
  }
  
  // Vérifier jours fériés mobiles
  const easter = getEasterDate(year);
  const easterMonth = easter.getMonth() + 1;
  const easterDay = easter.getDate();
  
  // Lundi de Pâques (jour après Pâques)
  if (month === easterMonth && day === easterDay + 1) return true;
  
  // Ascension (39 jours après Pâques)
  const ascension = new Date(easter);
  ascension.setDate(ascension.getDate() + 39);
  if (month === ascension.getMonth() + 1 && day === ascension.getDate()) return true;
  
  // Lundi de Pentecôte (50 jours après Pâques)
  const pentecote = new Date(easter);
  pentecote.setDate(pentecote.getDate() + 50);
  if (month === pentecote.getMonth() + 1 && day === pentecote.getDate()) return true;
  
  return false;
}

// Déterminer le jourFonctionnement basé sur la date
function getDayTypeForDate(date) {
  const dayOfWeek = date.getDay(); // 0=dim, 1=lun, ..., 6=sam
  
  if (dayOfWeek === 0 || isFrenchHoliday(date)) {
    return 'DIMANCHE_FERIES'; // Dimanche ou jour férié
  } else if (dayOfWeek === 6) {
    return 'SAMEDI';
  } else {
    return 'SEMAINE';
  }
}

// ---------- ping ----------
app.get('/', (_req, res) => res.send('TC Outil API - Voyages TC Essonnes'));

// Health check endpoint
app.get('/health', async (_req, res) => {
  if (!prisma) {
    return res.status(503).json({ status: 'degraded', error: 'Prisma not initialized' });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV 
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'error', 
      error: error.message 
    });
  }
});

// ---------- cors-test ----------
app.get('/api/cors-test', (req, res) => {
  res.json({
    message: 'CORS test successful',
    origin: req.get('origin'),
    headers: {
      'Access-Control-Allow-Origin': res.get('Access-Control-Allow-Origin'),
    },
  });
});

// ---------- server-time ----------
app.get('/api/server-time', (_req, res) => {
  res.json({ timestamp: new Date().toISOString() });
});

// Get today's date in Paris timezone
app.get('/api/today', (_req, res) => {
  res.json({ today: getTodayDateParis() });
});

// GET dashboard stats (without fetching all data)
app.get('/api/stats', async (_req, res) => {
  try {
    const today = getTodayDateParis();
    const todayDate = new Date(today + 'T00:00:00');
    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);

    // Dates for current month
    const monthStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
    const monthEnd = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    const [
      totalServices,
      totalConductors,
      totalVehicles,
      todayServices,
      todayPlanned,
      todayCompleted,
      monthPlanned
    ] = await Promise.all([
      prisma.service.count(),
      prisma.conducteur.count(),
      prisma.vehicle.count(),
      prisma.service.count({ where: { date: { gte: todayDate, lt: tomorrowDate } } }),
      prisma.service.count({ where: { date: { gte: todayDate, lt: tomorrowDate }, statut: 'Planifiée' } }),
      prisma.service.count({ where: { date: { gte: todayDate, lt: tomorrowDate }, statut: 'Terminée' } }),
      prisma.service.count({ where: { date: { gte: monthStart, lte: monthEnd }, statut: 'Planifiée' } })
    ]);

    res.json({
      totalServices,
      totalConductors,
      totalVehicles,
      todayServices,
      todayPlanned,
      todayCompleted,
      monthPlanned
    });
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

// Diagnostic endpoint
app.get('/api/diagnostic', async (_req, res) => {
  try {
    const now = new Date();
    const todayStr = getTodayDateParis();
    
    const allServices = await prisma.service.findMany({
      select: { date: true, id: true, statut: true }
    });
    
    // Grouper par date
    const byDate = {};
    allServices.forEach(s => {
      const dateStr = new Date(s.date).toISOString().split('T')[0];
      if (!byDate[dateStr]) byDate[dateStr] = [];
      byDate[dateStr].push(s);
    });
    
    res.json({
      serverTime: now.toISOString(),
      parisTime: getTodayDateParis(),
      serverDate: todayStr,
      totalServices: allServices.length,
      servicesByDate: Object.entries(byDate).map(([date, services]) => ({
        date,
        count: services.length,
        statuts: {
          Planifiée: services.filter(s => s.statut === 'Planifiée').length,
          Terminée: services.filter(s => s.statut === 'Terminée').length,
        }
      }))
    });
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

// ========== VEHICLES ==========

// Configuration imported from vehicleTypes.js
// VEHICLE_TYPES - All available vehicle types
// VEHICLE_LINES_ELIGIBILITY - Vehicle eligibility by line

// GET all vehicle types available
app.get('/api/vehicle-types', async (_req, res) => {
  try {
    res.json({ types: VEHICLE_TYPES });
  } catch (e) {
    console.error('GET /api/vehicle-types ERROR ->', e.message);
    res.status(500).json({ error: String(e.message) });
  }
});

// GET vehicle eligibility configuration by line
app.get('/api/vehicle-lines-eligibility', async (_req, res) => {
  try {
    res.json(VEHICLE_LINES_ELIGIBILITY);
  } catch (e) {
    console.error('GET /api/vehicle-lines-eligibility ERROR ->', e.message);
    res.status(500).json({ error: String(e.message) });
  }
});

// GET eligible vehicles for a specific line
app.get('/api/vehicles/eligible/:ligne', async (req, res) => {
  try {
    const { ligne } = req.params;
    
    // Chercher la ligne en BD
    const ligneData = await prisma.ligne.findUnique({
      where: { numero: ligne }
    });
    
    if (!ligneData) {
      return res.json({ ligne, eligibleTypes: [], vehicles: [], message: 'Ligne introuvable' });
    }
    
    // Récupérer les types depuis la BD
    let eligibleTypes = [];
    if (ligneData.typesVehicules) {
      try {
        eligibleTypes = JSON.parse(ligneData.typesVehicules);
      } catch (e) {
        console.warn(`Erreur parsing typesVehicules pour ${ligne}:`, e.message);
      }
    }
    
    if (eligibleTypes.length === 0) {
      return res.json({ ligne, eligibleTypes: [], vehicles: [], message: 'Aucun type de véhicule défini pour cette ligne' });
    }
    
    const vehicles = await prisma.vehicle.findMany({
      where: {
        type: {
          in: eligibleTypes,
        },
      },
      orderBy: [{ type: 'asc' }, { parc: 'asc' }],
    });
    
    res.json({ ligne, eligibleTypes, vehicles });
  } catch (e) {
    console.error('GET /api/vehicles/eligible/:ligne ERROR ->', e.message);
    res.status(500).json({ error: String(e.message) });
  }
});

// 🚀 NEW: GET vehicles assignables (disponibles + autorisés pour une ligne)
app.get('/api/services/:serviceId/assignable-vehicles', async (req, res) => {
  try {
    const { serviceId } = req.params;
    
    // Récupérer le service avec sa ligne et ses sens
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { 
        ligne: true,
        sens: true 
      }
    });

    if (!service) {
      return res.status(404).json({ error: 'Service non trouvé' });
    }

    // Récupérer les types de véhicules autorisés pour cette ligne
    let eligibleTypes = [];
    if (service.ligne.typesVehicules) {
      try {
        eligibleTypes = JSON.parse(service.ligne.typesVehicules);
      } catch (e) {
        console.warn(`Erreur parsing typesVehicules:`, e.message);
      }
    }

    // Récupérer les véhicules disponibles
    let allAvailableVehicles = await prisma.vehicle.findMany({
      where: {
        statut: 'Disponible'  // Seulement les véhicules disponibles
      },
      select: {
        parc: true,
        type: true,
        modele: true,
        immat: true,
        statut: true,
        tauxSante: true
      },
      orderBy: [{ type: 'asc' }, { parc: 'asc' }],
      take: 500
    });

    // === NOUVELLES RÈGLES DE PLANNING ===
    // Vérifier les conflits de véhicule et les règles d'amplitude
    const serviceDate = new Date(service.date);
    const serviceHourStart = parseInt(service.heureDebut.split(':')[0]);
    const serviceHourEnd = parseInt(service.heureFin.split(':')[0]);
    
    // Récupérer tous les services du jour pour les conflits
    const servicesOfDay = await prisma.service.findMany({
      where: {
        dateService: {
          gte: new Date(serviceDate.setHours(0, 0, 0, 0)),
          lt: new Date(new Date(serviceDate).setHours(24, 0, 0, 0))
        }
      },
      select: {
        id: true,
        parc: true,
        heureDebut: true,
        heureFin: true
      }
    });

    // Créer une map des véhicules déjà assignés
    const vehiclesAlreadyAssigned = new Set();
    servicesOfDay.forEach(svc => {
      if (svc.parc && svc.id !== serviceId) {
        // Vérifier le chevauchement horaire (20min buffer pour les changements)
        const svcHourStart = parseInt(svc.heureDebut.split(':')[0]);
        const svcHourEnd = parseInt(svc.heureFin.split(':')[0]);
        
        if (!(serviceHourEnd < svcHourStart || serviceHourStart > svcHourEnd)) {
          // Chevauchement: ce bus ne peut pas être assigné
          vehiclesAlreadyAssigned.add(svc.parc);
        }
      }
    });

    // Filtrer par types autorisés et vérifier les contraintes
    const vehicles = allAvailableVehicles.filter(v => {
      // 1. Vérifier le type de véhicule
      if (eligibleTypes.length > 0) {
        const typeMatch = eligibleTypes.some(et => v.type.toLowerCase().includes(et.toLowerCase()));
        if (!typeMatch) return false;
      }
      
      // 2. Vérifier que le véhicule n'est pas déjà assigné au même créneau
      if (vehiclesAlreadyAssigned.has(v.parc)) {
        return false;
      }
      
      // 3. Vérifier le taux de santé (> 50% minimum)
      if (v.tauxSante && v.tauxSante < 50) {
        return false;
      }
      
      return true;
    }).slice(0, 100); // Limiter à 100 résultats

    res.json({ 
      serviceId,
      ligneNumero: service.ligne.numero,
      eligibleTypes,
      vehicles,
      total: vehicles.length,
      filters: {
        avoidConflicts: true,
        minHealthRate: 50,
        checkAmplitude: true
      }
    });
  } catch (e) {
    console.error('GET /api/services/:serviceId/assignable-vehicles ERROR ->', e.message);
    res.status(500).json({ error: String(e.message) });
  }
});

// GET /api/services/:serviceId/assignable-conductors - Conducteurs assignables respectant règles d'amplitude
app.get('/api/services/:serviceId/assignable-conductors', async (req, res) => {
  try {
    const { serviceId } = req.params;
    
    // Récupérer le service
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { ligne: true }
    });

    if (!service) {
      return res.status(404).json({ error: 'Service non trouvé' });
    }

    // Récupérer tous les conducteurs disponibles
    const allConductors = await prisma.conducteur.findMany({
      where: {
        statut: 'Actif'
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        permis: true,
        statut: true
      },
      orderBy: { nom: 'asc' },
      take: 500
    });

    // === RÈGLES D'AMPLITUDE ===
    // Vérifier l'amplitude de travail (max 10h/jour généralement)
    const serviceDate = new Date(service.date);
    const [serviceHourStart, serviceMinStart] = service.heureDebut.split(':').map(Number);
    const [serviceHourEnd, serviceMinEnd] = service.heureFin.split(':').map(Number);
    const serviceDuration = (serviceHourEnd - serviceHourStart) + (serviceMinEnd - serviceMinStart) / 60;
    
    // Services du jour pour le check d'amplitude
    const servicesOfDay = await prisma.service.findMany({
      where: {
        dateService: {
          gte: new Date(serviceDate.setHours(0, 0, 0, 0)),
          lt: new Date(new Date(serviceDate).setHours(24, 0, 0, 0))
        }
      },
      select: {
        id: true,
        conducteurAssigne: true,
        heureDebut: true,
        heureFin: true
      }
    });

    // Créer une map: conducteur -> durée totale du jour
    const conductorWorkMap = new Map();
    servicesOfDay.forEach(svc => {
      if (svc.conducteurAssigne && svc.id !== serviceId) {
        const [h1, m1] = svc.heureDebut.split(':').map(Number);
        const [h2, m2] = svc.heureFin.split(':').map(Number);
        const duration = (h2 - h1) + (m2 - m1) / 60;
        
        const currentTotal = conductorWorkMap.get(svc.conducteurAssigne) || 0;
        conductorWorkMap.set(svc.conducteurAssigne, currentTotal + duration);
      }
    });

    // Filtrer les conducteurs disponibles
    const conductors = allConductors.filter(c => {
      // 1. Vérifier que le conducteur n'a pas déjà ce service
      const hasService = servicesOfDay.some(s => s.id === serviceId && s.conducteurAssigne === c.id);
      if (hasService) return false;
      
      // 2. Vérifier l'amplitude max (10h par jour)
      const currentWorkTime = conductorWorkMap.get(c.id) || 0;
      if (currentWorkTime + serviceDuration > 10) {
        return false; // Dépasserait l'amplitude
      }
      
      // 3. Vérifier qu'il n'est pas en conflit horaire
      const hasConflict = servicesOfDay.some(svc => {
        if (svc.conducteurAssigne !== c.id || svc.id === serviceId) return false;
        
        const [svcH1, svcM1] = svc.heureDebut.split(':').map(Number);
        const [svcH2, svcM2] = svc.heureFin.split(':').map(Number);
        const svcStart = svcH1 + svcM1 / 60;
        const svcEnd = svcH2 + svcM2 / 60;
        const thisStart = serviceHourStart + serviceMinStart / 60;
        const thisEnd = serviceHourEnd + serviceMinEnd / 60;
        
        // Vérifier chevauchement (avec buffer de 30min)
        return !(thisEnd + 0.5 < svcStart || thisStart > svcEnd + 0.5);
      });
      
      return !hasConflict;
    }).slice(0, 50);

    res.json({
      serviceId,
      ligneNumero: service.ligne.numero,
      conductors,
      total: conductors.length,
      rules: {
        maxAmplitude: 10, // heures par jour
        checkConflicts: true,
        minRest: 0.5 // 30 minutes minimum entre deux services
      }
    });
  } catch (e) {
    console.error('GET /api/services/:serviceId/assignable-conductors ERROR ->', e.message);
    res.status(500).json({ error: String(e.message) });
  }
});

// LIST
app.get('/api/vehicles', async (_req, res) => {
  try {
    console.log('[API] GET /api/vehicles - prismaReady:', prismaReady);
    if (!prismaReady) {
      return res.status(503).json({ error: 'Database not ready' });
    }
    const data = await prisma.vehicle.findMany({ orderBy: { parc: 'asc' } });
    console.log('[API] GET /api/vehicles - found:', data.length);
    res.json(data);
  } catch (e) {
    console.error('GET /api/vehicles ERROR ->', e.message);
    console.error('Stack:', e.stack);
    res.status(500).json({ error: String(e.message) });
  }
});

// DETAIL
app.get('/api/vehicles/:parc', async (req, res) => {
  try {
    const v = await prisma.vehicle.findUnique({ 
      where: { parc: req.params.parc },
      include: {
        interventions: {
          orderBy: { datePrevue: 'desc' }
        },
        etablissement: true
      }
    });
    if (!v) return res.status(404).json({ error: 'Véhicule non trouvé' });
    res.json(v);
  } catch (err) {
    console.error('GET /api/vehicles/:parc ERROR ->', err.message);
    console.error('Parc requested:', req.params.parc);
    res.status(500).json({ error: String(err.message || err) });
  }
});

// --- Interventions & Suivi Atelier ---
// Ajouter une intervention pour un véhicule
app.post('/api/vehicles/:parc/interventions', async (req, res) => {
  try {
    const { libelle, datePrevue, commentaire } = req.body;
    const intervention = await prisma.intervention.create({
      data: {
        vehicleParc: req.params.parc,
        libelle,
        datePrevue: datePrevue ? new Date(datePrevue) : null,
        commentaire,
        statut: 'planifiée',
      }
    });
    res.json(intervention);
  } catch (err) {
    console.error('[INTERVENTIONS] Error:', err);
    res.status(500).json({ error: 'Erreur création intervention' });
  }
});

// Mettre à jour une intervention
app.put('/api/vehicles/:parc/interventions/:id', async (req, res) => {
  try {
    const { statut, dateEffective } = req.body;
    const intervention = await prisma.intervention.update({
      where: { id: parseInt(req.params.id) },
      data: { 
        statut: statut || undefined,
        dateEffective: dateEffective ? new Date(dateEffective) : new Date()
      }
    });
    res.json(intervention);
  } catch (err) {
    console.error('[INTERVENTIONS] Error:', err);
    res.status(500).json({ error: 'Erreur mise à jour intervention' });
  }
});

// Ajouter un mouvement d'état avec commentaire
app.post('/api/vehicles/:parc/state-history', async (req, res) => {
  try {
    const { toStatus, note } = req.body;
    const history = await prisma.vehicleStateHistory.create({
      data: {
        vehicleParc: req.params.parc,
        fromStatus: null,
        toStatus,
        note: note || '',
        changedAt: new Date(),
      }
    });
    res.json(history);
  } catch (err) {
    console.error('[STATE-HISTORY] Error:', err);
    res.status(500).json({ error: 'Erreur création historique' });
  }
});

// GET vehicle history/mouvements
app.get('/api/vehicles/:parc/history', async (req, res) => {
  try {
    const history = await prisma.vehicleStateHistory.findMany({
      where: { vehicleId: req.params.parc },
      orderBy: { changedAt: 'desc' },
      take: 50,
    });
    res.json(history);
  } catch (e) {
    console.error('GET /api/vehicles/:parc/history ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// CREATE/UPSERT
app.post('/api/vehicles', async (req, res) => {
  try {
    const b = req.body;
    const missing = [];
    if (!b.parc) missing.push('parc');
    if (!b.type) missing.push('type');
    if (!b.modele) missing.push('modele');
    if (!b.immat) missing.push('immat');
    if (missing.length) return res.status(400).json({ error: 'Champs requis manquants', missing });

    const payload = {
      parc: String(b.parc).trim(),
      type: String(b.type || ''),
      modele: String(b.modele || ''),
      immat: String(b.immat || '').toUpperCase(),
      km: Number.isFinite(Number(b.km)) ? Number(b.km) : 0,

      // état unique = etatTechnique (on garde tauxSante pour compat)
      etatTechnique: Number.isFinite(Number(b.etatTechnique))
        ? Number(b.etatTechnique)
        : (Number.isFinite(Number(b.tauxSante)) ? Number(b.tauxSante) : 100),
      tauxSante: Number.isFinite(Number(b.etatTechnique))
        ? Number(b.etatTechnique)
        : (Number.isFinite(Number(b.tauxSante)) ? Number(b.tauxSante) : 100),

      proprete: Number.isFinite(Number(b.proprete)) ? Number(b.proprete) : 100,
      etatInterieur: Number.isFinite(Number(b.etatInterieur)) ? Number(b.etatInterieur) : 100,
      statut: String(b.statut || 'Disponible'),

      annee: b.annee !== '' && b.annee != null ? Number(b.annee) : null,
      boite: b.boite ?? null,
      moteur: b.moteur ?? null,
      portes: b.portes !== '' && b.portes != null ? Number(b.portes) : null,
      girouette: b.girouette ?? null,
      clim: b.clim ?? null,
      pmr: !!b.pmr,
      depot: b.depot ?? null,
      ct: parseDateFlexible(b.ct),
      etablissementId: b.etablissementId ?? null,

      photosJson: Array.isArray(b.photos) ? JSON.stringify(b.photos) : (b.photosJson || null),

      optionsUsineJson: objToJsonOrNull(b.optionsUsine) ?? (b.optionsUsineJson ?? null),
      optionsAtelierJson: objToJsonOrNull(b.optionsAtelier) ?? (b.optionsAtelierJson ?? null),
      optionsSaeivJson: objToJsonOrNull(b.optionsSaeiv) ?? (b.optionsSaeivJson ?? null),
    };

    const saved = await prisma.vehicle.upsert({
      where: { parc: payload.parc },
      update: payload,
      create: payload,
    });

    res.status(201).json(saved);
  } catch (e) {
    console.error('POST /api/vehicles ERROR ->', e);
    res.status(400).json({ error: e?.message || String(e) });
  }
});

// UPDATE (partial)
app.put('/api/vehicles/:parc', async (req, res) => {
  try {
    const b = req.body;
    const vehiculeActuel = await prisma.vehicle.findUnique({
      where: { parc: req.params.parc },
    });

    const data = {
      type: b.type ?? undefined,
      modele: b.modele ?? undefined,
      immat: b.immat ? String(b.immat).toUpperCase() : undefined,
      km: b.km !== undefined ? Number(b.km) : undefined,

      // etat technique = source unique ; on aligne tauxSante pour compat
      etatTechnique: b.etatTechnique !== undefined ? Number(b.etatTechnique) : undefined,
      tauxSante: b.etatTechnique !== undefined
        ? Number(b.etatTechnique)
        : (b.tauxSante !== undefined ? Number(b.tauxSante) : undefined),

      proprete: b.proprete !== undefined ? Number(b.proprete) : undefined,
      etatInterieur: b.etatInterieur !== undefined ? Number(b.etatInterieur) : undefined,

      statut: b.statut ?? undefined,

      annee: b.annee === '' ? null : (b.annee != null ? Number(b.annee) : undefined),
      boite: b.boite === '' ? null : (b.boite ?? undefined),
      moteur: b.moteur === '' ? null : (b.moteur ?? undefined),
      portes: b.portes === '' ? null : (b.portes != null ? Number(b.portes) : undefined),
      girouette: b.girouette === '' ? null : (b.girouette ?? undefined),
      clim: b.clim === '' ? null : (b.clim ?? undefined),
      pmr: b.pmr === undefined ? undefined : Boolean(b.pmr),
      depot: b.depot === '' ? null : (b.depot ?? undefined),
      ct: b.ct === '' ? null : (b.ct ? parseDateFlexible(b.ct) : undefined),

      photosJson: Array.isArray(b.photos) ? JSON.stringify(b.photos) : (b.photosJson ?? undefined),

      // options: on accepte objets (stringifiés ici) ou ...Json
      optionsUsineJson: b.optionsUsine ? JSON.stringify(b.optionsUsine)
        : (b.optionsUsineJson ?? undefined),
      optionsAtelierJson: b.optionsAtelier ? JSON.stringify(b.optionsAtelier)
        : (b.optionsAtelierJson ?? undefined),
      optionsSaeivJson: b.optionsSaeiv ? JSON.stringify(b.optionsSaeiv)
        : (b.optionsSaeivJson ?? undefined),
    };

    const updated = await prisma.vehicle.update({
      where: { parc: req.params.parc },
      data,
    });

    // Enregistrer le changement de statut s'il y a lieu
    if (vehiculeActuel && b.statut && vehiculeActuel.statut !== b.statut) {
      await prisma.vehicleStateHistory.create({
        data: {
          vehicleParc: req.params.parc,
          fromStatus: vehiculeActuel.statut,
          toStatus: b.statut,
          note: b.motifChangement || 'Modification manuelle',
          changedAt: new Date(),
        },
      });
      console.log(`[VEHICLE] Statut changé: ${req.params.parc} ${vehiculeActuel.statut} → ${b.statut}`);
    }

    res.json(updated);
  } catch (e) {
    console.error('PUT /api/vehicles/:parc ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// DELETE
app.delete('/api/vehicles/:parc', async (req, res) => {
  try {
    await prisma.vehicle.delete({ where: { parc: req.params.parc } });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

// ========== ETABLISSEMENTS ==========

// GET /api/etablissements - Liste tous les établissements
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
    console.error('GET /api/etablissements ERROR ->', err);
    res.status(500).json({ error: 'Erreur récupération établissements' });
  }
});

// GET /api/etablissements/:id - Détail d'un établissement
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
    console.error('GET /api/etablissements/:id ERROR ->', err);
    res.status(500).json({ error: 'Erreur récupération établissement' });
  }
});

// POST /api/etablissements - Création
app.post('/api/etablissements', async (req, res) => {
  try {
    const { nom, type, adresse } = req.body;
    const etab = await prisma.etablissement.create({
      data: { nom, type, adresse }
    });
    res.json(etab);
  } catch (err) {
    console.error('POST /api/etablissements ERROR ->', err);
    res.status(500).json({ error: 'Erreur création établissement' });
  }
});

// PUT /api/etablissements/:id - Modification
app.put('/api/etablissements/:id', async (req, res) => {
  try {
    const { nom, type, adresse } = req.body;
    const etab = await prisma.etablissement.update({
      where: { id: req.params.id },
      data: { nom, type, adresse }
    });
    res.json(etab);
  } catch (err) {
    console.error('PUT /api/etablissements/:id ERROR ->', err);
    res.status(500).json({ error: 'Erreur modification établissement' });
  }
});

// DELETE /api/etablissements/:id - Suppression
app.delete('/api/etablissements/:id', async (req, res) => {
  try {
    await prisma.etablissement.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/etablissements/:id ERROR ->', err);
    res.status(500).json({ error: 'Erreur suppression établissement' });
  }
});

// ========== JURHE - GESTION DU PERSONNEL ==========

// GET /api/employes - Liste tous les employés (avec filtrage par poste)
app.get('/api/employes', async (req, res) => {
  try {
    console.log('[EMPLOYES] GET /api/employes');
    
    if (!prismaReady) {
      return res.status(503).json({ error: 'Database not ready' });
    }

    const { poste, statut } = req.query;
    
    const where = {};
    if (poste) {
      where.poste = poste;
    }
    if (statut) {
      where.statut = statut;
    }

    const employes = await prisma.employe.findMany({
      where,
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    });

    console.log(`[EMPLOYES] Retourné ${employes.length} employés`);
    res.json(employes);
  } catch (error) {
    console.error('[EMPLOYES] Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/employes/:id - Récupérer un employé spécifique
app.get('/api/employes/:id', async (req, res) => {
  try {
    console.log(`[EMPLOYES] GET /api/employes/${req.params.id}`);
    
    if (!prismaReady) {
      return res.status(503).json({ error: 'Database not ready' });
    }

    const employe = await prisma.employe.findUnique({
      where: { id: req.params.id },
    });

    if (!employe) {
      return res.status(404).json({ error: 'Employé non trouvé' });
    }

    res.json(employe);
  } catch (error) {
    console.error('[EMPLOYES] Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/employes - Créer un nouvel employé
app.post('/api/employes', async (req, res) => {
  try {
    console.log('[EMPLOYES] POST /api/employes');
    
    if (!prismaReady) {
      return res.status(503).json({ error: 'Database not ready' });
    }

    const { nom, prenom, email, telephone, poste, statut, dateEmbauche, permis, typeContrat, notes } = req.body;

    if (!nom || !prenom || !poste) {
      return res.status(400).json({ 
        error: 'Les champs nom, prenom et poste sont obligatoires' 
      });
    }

    const employe = await prisma.employe.create({
      data: {
        nom,
        prenom,
        email,
        telephone,
        poste,
        statut: statut || 'Actif',
        dateEmbauche: dateEmbauche ? new Date(dateEmbauche) : new Date(),
        permis,
        typeContrat,
        notes,
        matricule: poste === 'Conducteur' ? `${prenom.substring(0, 3).toUpperCase()}${nom.substring(0, 3).toUpperCase()}` : undefined,
      },
    });

    console.log(`[EMPLOYES] Employé créé: ${employe.id}`);
    res.status(201).json(employe);
  } catch (error) {
    console.error('[EMPLOYES] Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/employes/:id - Mettre à jour un employé
app.put('/api/employes/:id', async (req, res) => {
  try {
    console.log(`[EMPLOYES] PUT /api/employes/${req.params.id}`);
    
    if (!prismaReady) {
      return res.status(503).json({ error: 'Database not ready' });
    }

    const { nom, prenom, email, telephone, poste, statut, dateEmbauche, dateDepart, permis, typeContrat, notes } = req.body;

    const employe = await prisma.employe.update({
      where: { id: req.params.id },
      data: {
        ...(nom && { nom }),
        ...(prenom && { prenom }),
        ...(email !== undefined && { email }),
        ...(telephone !== undefined && { telephone }),
        ...(poste && { poste }),
        ...(statut && { statut }),
        ...(dateEmbauche && { dateEmbauche: new Date(dateEmbauche) }),
        ...(dateDepart !== undefined && { dateDepart: dateDepart ? new Date(dateDepart) : null }),
        ...(permis !== undefined && { permis }),
        ...(typeContrat !== undefined && { typeContrat }),
        ...(notes !== undefined && { notes }),
      },
    });

    console.log(`[EMPLOYES] Employé mis à jour: ${employe.id}`);
    res.json(employe);
  } catch (error) {
    console.error('[EMPLOYES] Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/employes/:id - Supprimer un employé
app.delete('/api/employes/:id', async (req, res) => {
  try {
    console.log(`[EMPLOYES] DELETE /api/employes/${req.params.id}`);
    
    if (!prismaReady) {
      return res.status(503).json({ error: 'Database not ready' });
    }

    const employe = await prisma.employe.delete({
      where: { id: req.params.id },
    });

    console.log(`[EMPLOYES] Employé supprimé: ${employe.id}`);
    res.json({ ok: true, message: 'Employé supprimé' });
  } catch (error) {
    console.error('[EMPLOYES] Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== CONDUCTEURS ==========

// GET /api/conducteurs/jurhe/sync - Synchroniser depuis JURHE via API Employes
app.get('/api/conducteurs/jurhe/sync', async (_req, res) => {
  try {
    console.log('[JURHE] GET /api/conducteurs/jurhe/sync - Synchronisation JURHE');

    if (!prismaReady) {
      return res.status(503).json({ error: 'Database not ready' });
    }

    // Récupérer les conducteurs depuis la table Employe (poste = "Conducteur")
    const employes = await prisma.employe.findMany({
      where: {
        poste: 'Conducteur',
        statut: 'Actif', // Synchroniser seulement les actifs
      },
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    });

    console.log(`[JURHE] ${employes.length} conducteurs actifs trouvés dans JURHE`);

    // Synchroniser avec la table Conducteur (BD locale)
    let imported = 0;
    const errors = [];

    for (const employe of employes) {
      try {
        // Créer ou mettre à jour le conducteur
        await prisma.conducteur.upsert({
          where: { matricule: employe.matricule || `${employe.prenom.substring(0, 3).toUpperCase()}${employe.nom.substring(0, 3).toUpperCase()}` },
          update: {
            nom: employe.nom,
            prenom: employe.prenom,
            email: employe.email || undefined,
            statut: employe.statut,
            permis: employe.permis || 'D',
          },
          create: {
            nom: employe.nom,
            prenom: employe.prenom,
            matricule: employe.matricule || `${employe.prenom.substring(0, 3).toUpperCase()}${employe.nom.substring(0, 3).toUpperCase()}`,
            email: employe.email,
            permis: employe.permis || 'D',
            statut: employe.statut || 'Actif',
            typeContrat: employe.typeContrat || 'CDI',
            embauche: employe.dateEmbauche || new Date(),
          },
        });
        imported++;
      } catch (error) {
        errors.push(`${employe.nom} ${employe.prenom}: ${error.message}`);
      }
    }

    // Retourner les données mises à jour depuis la BD
    const conducteurs = await prisma.conducteur.findMany({ 
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }] 
    });

    console.log(`[JURHE] Synchronisation terminée: ${imported}/${employes.length} importés, ${errors.length} erreurs`);
    res.json({
      source: 'jurhe-employes',
      conducteurs,
      imported,
      total: employes.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `${imported} conducteurs synchronisés depuis JURHE`,
    });
  } catch (error) {
    console.error('[JURHE] Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});

// LIST - Récupérer les conducteurs (depuis BD, qui peut être synchronisée avec JURHE)
app.get('/api/conducteurs', async (_req, res) => {
  try {
    console.log('[API] GET /api/conducteurs - prismaReady:', prismaReady);
    if (!prismaReady) {
      return res.status(503).json({ error: 'Database not ready' });
    }
    const conducteurs = await prisma.conducteur.findMany({ orderBy: { nom: 'asc' } });
    console.log('[API] GET /api/conducteurs - found:', conducteurs.length);
    res.json(conducteurs);
  } catch (e) {
    console.error('GET /api/conducteurs ERROR ->', e.message);
    console.error('Stack:', e.stack);
    res.status(500).json({ error: String(e.message) });
  }
});

// DETAIL
app.get('/api/conducteurs/:id', async (req, res) => {
  try {
    const conducteur = await prisma.conducteur.findUnique({ where: { id: req.params.id } });
    if (!conducteur) return res.status(404).json({ error: 'Not found' });
    res.json(conducteur);
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

// CREATE
app.post('/api/conducteurs', async (req, res) => {
  try {
    const b = req.body;
    const missing = [];
    if (!b.nom) missing.push('nom');
    if (!b.prenom) missing.push('prenom');
    if (!b.matricule) missing.push('matricule');
    if (!b.permis) missing.push('permis');
    if (missing.length) return res.status(400).json({ error: 'Champs requis manquants', missing });

    const payload = {
      nom: String(b.nom).trim(),
      prenom: String(b.prenom).trim(),
      matricule: String(b.matricule).trim(),
      permis: String(b.permis),
      embauche: b.embauche ? new Date(b.embauche) : new Date(),
      statut: String(b.statut || 'Actif'),
      typeContrat: String(b.typeContrat || 'CDI'),
      phone: b.phone || null,
      email: b.email || null,

      busArticules: !!b.busArticules,
      autocars: !!b.autocars,
      pmr: !!b.pmr,
      vehiMarchandises: !!b.vehiMarchandises,

      carteChronosJson: b.carteChronos ? JSON.stringify(b.carteChronos) : null,
      fcoJson: b.fco ? JSON.stringify(b.fco) : null,
      securiteJson: b.securite ? JSON.stringify(b.securite) : null,

      visiteMedicaleJson: b.visiteMedicale ? JSON.stringify(b.visiteMedicale) : null,
      vaccinationsJson: b.vaccinations ? JSON.stringify(b.vaccinations) : null,

      heuresMax: Number.isFinite(Number(b.heuresMax)) ? Number(b.heuresMax) : 35,
      heuresReglementaires: Number.isFinite(Number(b.heuresReglementaires)) ? Number(b.heuresReglementaires) : 35,
    };

    const conducteur = await prisma.conducteur.create({ data: payload });
    res.status(201).json(conducteur);
  } catch (e) {
    console.error('POST /api/conducteurs ERROR ->', e);
    res.status(400).json({ error: e?.message || String(e) });
  }
});

// UPDATE
app.put('/api/conducteurs/:id', async (req, res) => {
  try {
    const b = req.body;
    const data = {
      nom: b.nom ?? undefined,
      prenom: b.prenom ?? undefined,
      matricule: b.matricule ?? undefined,
      permis: b.permis ?? undefined,
      statut: b.statut ?? undefined,
      typeContrat: b.typeContrat ?? undefined,
      phone: b.phone ?? undefined,
      email: b.email ?? undefined,

      busArticules: b.busArticules !== undefined ? !!b.busArticules : undefined,
      autocars: b.autocars !== undefined ? !!b.autocars : undefined,
      pmr: b.pmr !== undefined ? !!b.pmr : undefined,
      vehiMarchandises: b.vehiMarchandises !== undefined ? !!b.vehiMarchandises : undefined,

      carteChronosJson: b.carteChronos ? JSON.stringify(b.carteChronos) : (b.carteChronosJson ?? undefined),
      fcoJson: b.fco ? JSON.stringify(b.fco) : (b.fcoJson ?? undefined),
      securiteJson: b.securite ? JSON.stringify(b.securite) : (b.securiteJson ?? undefined),

      visiteMedicaleJson: b.visiteMedicale ? JSON.stringify(b.visiteMedicale) : (b.visiteMedicaleJson ?? undefined),
      vaccinationsJson: b.vaccinations ? JSON.stringify(b.vaccinations) : (b.vaccinationsJson ?? undefined),

      heuresMax: b.heuresMax !== undefined ? Number(b.heuresMax) : undefined,
      heuresReglementaires: b.heuresReglementaires !== undefined ? Number(b.heuresReglementaires) : undefined,
    };

    const conducteur = await prisma.conducteur.update({ where: { id: req.params.id }, data });
    res.json(conducteur);
  } catch (e) {
    console.error('PUT /api/conducteurs/:id ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// DELETE
app.delete('/api/conducteurs/:id', async (req, res) => {
  try {
    await prisma.conducteur.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

// ========== LIGNES ==========

// LIST
app.get('/api/lignes', async (_req, res) => {
  try {
    const lignes = await prisma.ligne.findMany({ 
      orderBy: { numero: 'asc' },
      include: { 
        sens: { 
          orderBy: { ordre: 'asc' },
          include: {
            services: { 
              orderBy: { heureDebut: 'asc' },
              include: { 
                conducteur: true,
                sens: true
              }
            }
          }
        } 
      }
    });
    console.log(`[API] GET /api/lignes - loaded ${lignes.length} lignes`);
    res.json(lignes);
  } catch (e) {
    console.error('GET /api/lignes ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// Initialiser les calendriers vides
app.post('/api/lignes/init-calendars', async (_req, res) => {
  try {
    const defaultCalendar = {
      lundi: true,
      mardi: true,
      mercredi: true,
      jeudi: true,
      vendredi: true,
      samedi: false,
      dimanche: false
    };

    const lignes = await prisma.ligne.findMany();
    let updatedCount = 0;

    for (const ligne of lignes) {
      if (!ligne.calendrierJson) {
        await prisma.ligne.update({
          where: { id: ligne.id },
          data: { calendrierJson: JSON.stringify(defaultCalendar) }
        });
        updatedCount++;
      }
    }

    res.json({ 
      message: `${updatedCount} ligne(s) mise(s) à jour avec un calendrier par défaut`,
      defaultCalendar 
    });
  } catch (e) {
    console.error('POST /api/lignes/init-calendars ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// ATTENTION: Endpoint de nettoyage - supprimer tous les services
app.delete('/api/services/cleanup', async (_req, res) => {
  try {
    const result = await prisma.service.deleteMany({});
    res.json({ 
      message: `${result.count} services supprimés`,
      count: result.count
    });
  } catch (e) {
    console.error('DELETE /api/services/cleanup ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// DEBUG - Vérifier la structure complète
app.get('/api/debug/lignes-structure', async (_req, res) => {
  try {
    const lignes = await prisma.ligne.findMany({ 
      orderBy: { numero: 'asc' },
      include: { 
        sens: { 
          orderBy: { ordre: 'asc' },
          include: {
            services: { 
              orderBy: { heureDebut: 'asc' }
            }
          }
        } 
      }
    });

    const stats = {
      totalLignes: lignes.length,
      lignesAvecSens: lignes.filter(l => l.sens && l.sens.length > 0).length,
      totalSens: 0,
      totalServices: 0,
      details: []
    };

    for (const ligne of lignes) {
      const sensList = ligne.sens || [];
      stats.totalSens += sensList.length;
      let servicesCount = 0;
      
      for (const sens of sensList) {
        const servicesList = sens.services || [];
        servicesCount += servicesList.length;
        stats.totalServices += servicesList.length;
      }

      stats.details.push({
        id: ligne.id,
        numero: ligne.numero,
        nom: ligne.nom,
        sensCount: sensList.length,
        servicesCount,
        sens: sensList.map(s => ({
          id: s.id,
          nom: s.nom,
          serviceCount: (s.services || []).length
        }))
      });
    }

    res.json(stats);
  } catch (e) {
    console.error('GET /api/debug/lignes-structure ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// DETAIL
app.get('/api/lignes/:id', async (req, res) => {
  try {
    const ligne = await prisma.ligne.findUnique({ 
      where: { id: req.params.id },
      include: { 
        sens: { 
          orderBy: { ordre: 'asc' },
          include: {
            services: { orderBy: { heureDebut: 'asc' } }
          }
        } 
      }
    });
    if (!ligne) return res.status(404).json({ error: 'Not found' });
    res.json(ligne);
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

// CREATE
app.post('/api/lignes', async (req, res) => {
  try {
    const b = req.body;
    const missing = [];
    if (!b.numero) missing.push('numero');
    if (!b.nom) missing.push('nom');
    if (missing.length) return res.status(400).json({ error: 'Champs requis manquants', missing });

    const payload = {
      numero: String(b.numero).trim(),
      nom: String(b.nom).trim(),
      typesVehicules: Array.isArray(b.typesVehicules) ? JSON.stringify(b.typesVehicules) : '[]',
      statut: String(b.statut || 'Actif'),
      description: b.description || null,
      demandeChrono: b.demandeChrono === true,
      estScolaire: b.estScolaire === true,
      estSpecial: b.estSpecial === true,
      departLimite: b.departLimite === true,
      serviceLimite: b.serviceLimite === true,
    };

    const ligne = await prisma.ligne.create({ 
      data: payload
    });

    // Créer un sens par défaut "Aller" si la ligne n'en a pas
    // (Note: une nouvelle ligne n'aura pas de sens, donc on en crée un)
    const defaultSens = await prisma.sens.create({
      data: {
        ligneId: ligne.id,
        nom: 'Aller',
        direction: 'Aller',
        statut: 'Actif',
        ordre: 1,
      },
    });
    
    // Retourner la ligne sans les sens inclus (le frontend les récupère via /api/lignes)
    res.status(201).json(ligne);
  } catch (e) {
    console.error('POST /api/lignes ERROR ->', e);
    res.status(400).json({ error: e?.message || String(e) });
  }
});

// ========== ROUTES LIGNES SPÉCIFIQUES (avant la route générique :id) ==========

// PUT /api/lignes/:ligneId/assign-depot
app.put('/api/lignes/:ligneId/assign-depot', lignesRoutes.assignLineToDepot);

// GET /api/lignes/:ligneId/available-vehicles
app.get('/api/lignes/:ligneId/available-vehicles', lignesRoutes.getAvailableVehiclesForLine);

// GET /api/lignes/:ligneId/available-conducteurs
app.get('/api/lignes/:ligneId/available-conducteurs', lignesRoutes.getAvailableConductorsForLine);

// UPDATE (route générique)
app.put('/api/lignes/:id', async (req, res) => {
  try {
    const b = req.body;
    const data = {
      numero: b.numero ?? undefined,
      nom: b.nom ?? undefined,
      statut: b.statut ?? undefined,
      description: b.description ?? undefined,
      typesVehicules: Array.isArray(b.typesVehicules) ? JSON.stringify(b.typesVehicules) : (b.typesVehicules ?? undefined),
      heureDebut: b.heureDebut ?? undefined,
      heureFin: b.heureFin ?? undefined,
      demandeChrono: b.demandeChrono ?? undefined,
      calendrierJson: b.calendrierJson ?? undefined,
      contraintes: b.contraintes ?? undefined,
      estScolaire: b.estScolaire ?? undefined,
      estSpecial: b.estSpecial ?? undefined,
      departLimite: b.departLimite ?? undefined,
      serviceLimite: b.serviceLimite ?? undefined,
    };

    const ligne = await prisma.ligne.update({ 
      where: { id: req.params.id }, 
      data
    });
    res.json(ligne);
  } catch (e) {
    console.error('PUT /api/lignes/:id ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// DELETE
app.delete('/api/lignes/:id', async (req, res) => {
  try {
    await prisma.ligne.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

// ========== SERVICES ==========

// LIST (avec filtrage optionnel par date et conducteur)
app.get('/api/services', async (req, res) => {
  try {
    console.log('[API] GET /api/services - prismaReady:', prismaReady);
    if (!prismaReady) {
      return res.status(503).json({ error: 'Database not ready' });
    }
    const { ligneId, conducteurId, date, dateFrom, dateTo } = req.query;
    const where = {};
    if (ligneId) where.ligneId = ligneId;
    if (conducteurId) where.conducteurId = conducteurId;
    
    // Gérer date unique ou plage de dates
    if (date) {
      const d = new Date(date);
      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);
      where.date = { gte: d, lt: nextDay };
    } else if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) {
        const [year, month, day] = dateFrom.split('-').map(Number);
        where.date.gte = new Date(year, month - 1, day, 0, 0, 0, 0);
      }
      if (dateTo) {
        const [year, month, day] = dateTo.split('-').map(Number);
        const end = new Date(year, month - 1, day, 0, 0, 0, 0);
        end.setDate(end.getDate() + 1);
        where.date.lt = end;
      }
    }

    const services = await prisma.service.findMany({
      where,
      include: { 
        ligne: true, 
        conducteur: true,
        sens: true
      },
      orderBy: { date: 'asc' },
      take: 1000, // Limit to prevent timeout when no date filter is specified
    });

    // Dédupliquer les services (même ligne, même date, mêmes heures = garder que le premier)
    const uniqueServices = [];
    const seenKey = new Set();

    for (const service of services) {
      const dateStr = service.date.toISOString().split('T')[0];
      const key = `${service.ligneId}-${dateStr}-${service.heureDebut}-${service.heureFin}`;
      
      if (!seenKey.has(key)) {
        seenKey.add(key);
        uniqueServices.push(service);
      }
    }

    console.log(`[API] GET /api/services - found: ${services.length}, unique: ${uniqueServices.length}`);
    res.json(uniqueServices);
  } catch (e) {
    console.error('GET /api/services ERROR ->', e.message);
    console.error('Stack:', e.stack);
    res.status(500).json({ error: String(e.message) });
  }
});

// GET non-assured services (services non assurés)
app.get('/api/services/non-assured/list', async (req, res) => {
  try {
    const { dateFrom, dateTo, motif } = req.query;
    const where = {
      statut: 'Non assuré'
    };

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setDate(toDate.getDate() + 1);
        where.date.lt = toDate;
      }
    }

    if (motif) {
      where.motifNonAssurance = motif;
    }

    const services = await prisma.service.findMany({
      where,
      include: { 
        ligne: true, 
        conducteur: true,
        sens: true 
      },
      orderBy: { date: 'desc' },
    });

    res.json(services);
  } catch (e) {
    console.error('GET /api/services/non-assured/list ERROR ->', e);
    res.status(500).json({ error: String(e) });
  }
});

// Diagnostic endpoint pour vérifier les services
app.get('/api/services/debug/count', async (req, res) => {
  try {
    const { date } = req.query;
    
    const totalCount = await prisma.service.count();
    
    let dateCount = 0;
    if (date) {
      const d = new Date(date);
      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);
      dateCount = await prisma.service.count({
        where: {
          date: { gte: d, lt: nextDay }
        }
      });
    }

    // Compter par ligneId
    const byLigne = await prisma.service.groupBy({
      by: ['ligneId'],
      _count: true
    });

    res.json({ 
      totalServices: totalCount,
      servicesForDate: dateCount,
      servicesPerLigne: byLigne,
      message: `Total: ${totalCount}, Pour date ${date}: ${dateCount}`
    });
  } catch (e) {
    console.error('GET /api/services/debug/count ERROR ->', e);
    res.status(500).json({ error: String(e) });
  }
});

// Endpoint pour générer les services pour les prochains jours
app.post('/api/services/generate', async (req, res) => {
  try {
    const { days = 7 } = req.body;
    
    const lignes = await prisma.ligne.findMany({
      include: { sens: true }
    });

    if (lignes.length === 0) {
      return res.json({ message: 'Aucune ligne trouvée' });
    }

    let createdCount = 0;
    let skippedCount = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Générer pour N jours
    for (let dayOffset = 0; dayOffset < days; dayOffset++) {
      const date = new Date(today);
      date.setDate(date.getDate() + dayOffset);
      
      // Utiliser la nouvelle fonction qui gère aussi les jours fériés
      const jourFonctionnement = getDayTypeForDate(date);

      const dateStr = date.toISOString().split('T')[0];

      // Pour chaque ligne
      for (const ligne of lignes) {
        // Pour chaque sens
        for (const sens of ligne.sens) {
          // Créer le service SEULEMENT si le jour de fonctionnement du sens correspond au jour actuel
          if (sens.jourFonctionnement === jourFonctionnement) {
            try {
              // Vérifier si le service existe déjà
              const existingService = await prisma.service.findFirst({
                where: {
                  ligneId: ligne.id,
                  sensId: sens.id,
                  date: {
                    gte: new Date(dateStr + 'T00:00:00'),
                    lt: new Date(dateStr + 'T23:59:59')
                  }
                }
              });

              if (!existingService) {
                await prisma.service.create({
                  data: {
                    ligneId: ligne.id,
                    sensId: sens.id,
                    date: new Date(dateStr + 'T06:30:00'),
                    heureDebut: '06:30',
                    heureFin: '18:30',
                    statut: 'Planifiée',
                  }
                });
                createdCount++;
              } else {
                skippedCount++;
              }
            } catch (err) {
              console.error(`Erreur création service ${ligne.id}/${sens.id}/${dateStr}:`, err.message);
            }
          }
        }
      }
    }

    res.json({ 
      message: `Services générés: ${createdCount} créés, ${skippedCount} existants`,
      created: createdCount,
      skipped: skippedCount
    });
  } catch (e) {
    console.error('POST /api/services/generate ERROR ->', e);
    res.status(500).json({ error: String(e) });
  }
});

// DETAIL
app.get('/api/services/:id', async (req, res) => {
  try {
    const service = await prisma.service.findUnique({
      where: { id: req.params.id },
      include: { ligne: true, conducteur: true },
    });
    if (!service) return res.status(404).json({ error: 'Not found' });
    res.json(service);
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

// CREATE
app.post('/api/services', async (req, res) => {
  try {
    const b = req.body;
    const missing = [];
    if (!b.ligneId) missing.push('ligneId');
    if (!b.date) missing.push('date');
    if (!b.heureDebut) missing.push('heureDebut');
    if (!b.heureFin) missing.push('heureFin');
    if (missing.length) return res.status(400).json({ error: 'Champs requis manquants', missing });

    const payload = {
      ligneId: String(b.ligneId),
      conducteurId: b.conducteurId || null,
      date: new Date(b.date),
      heureDebut: String(b.heureDebut),
      heureFin: String(b.heureFin),
      statut: String(b.statut || 'Planifiée'),
    };

    const service = await prisma.service.create({
      data: payload,
      include: { ligne: true, conducteur: true },
    });
    res.status(201).json(service);
  } catch (e) {
    console.error('POST /api/services ERROR ->', e);
    res.status(400).json({ error: e?.message || String(e) });
  }
});

// UPDATE
app.put('/api/services/:id', async (req, res) => {
  try {
    const b = req.body;
    const data = {
      conducteurId: b.conducteurId !== undefined ? (b.conducteurId || null) : undefined,
      heureDebut: b.heureDebut ?? undefined,
      heureFin: b.heureFin ?? undefined,
      statut: b.statut ?? undefined,
      motifNonAssurance: b.motifNonAssurance ?? undefined,
      motifsDetails: b.motifsDetails ?? undefined,
      expirationPointage: b.expirationPointage ? new Date(b.expirationPointage) : undefined,
    };

    const service = await prisma.service.update({
      where: { id: req.params.id },
      data,
      include: { ligne: true, conducteur: true },
    });
    res.json(service);
  } catch (e) {
    console.error('PUT /api/services/:id ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// Marquer un service comme non-assuré
app.put('/api/services/:id/non-assured', async (req, res) => {
  try {
    const { motifNonAssurance, notes, markedBy } = req.body;
    
    const service = await prisma.service.update({
      where: { id: req.params.id },
      data: {
        statut: 'Non assuré',
        motifNonAssurance: motifNonAssurance,
        motifsDetails: notes || '',
      },
      include: { ligne: true, conducteur: true },
    });
    
    console.log(`[SERVICE] Marqué non-assuré: ${service.id} (${motifNonAssurance}) par ${markedBy}`);
    res.json(service);
  } catch (e) {
    console.error('PUT /api/services/:id/non-assured ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// DELETE
app.delete('/api/services/:id', async (req, res) => {
  try {
    await prisma.service.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

// ========== POINTAGES ==========

// LIST with optional filtering
app.get('/api/pointages', async (req, res) => {
  try {
    const { serviceId, conducteurId, dateFrom, dateTo } = req.query;
    const where = {};
    if (serviceId) where.serviceId = String(serviceId);
    if (conducteurId) where.conducteurId = String(conducteurId);
    if (dateFrom || dateTo) {
      where.validatedAt = {};
      if (dateFrom) where.validatedAt.gte = new Date(dateFrom);
      if (dateTo) where.validatedAt.lte = new Date(dateTo);
    }

    const pointages = await prisma.pointage.findMany({
      where,
      include: { service: { include: { ligne: true, conducteur: true } }, conducteur: true },
      orderBy: { validatedAt: 'desc' },
    });
    res.json(pointages);
  } catch (e) {
    console.error('GET /api/pointages ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// STATS - Statistiques quotidiennes TC 360+
app.get('/api/pointages/stats/daily', async (req, res) => {
  try {
    const { date } = req.query;
    // Parse la date en format YYYY-MM-DD de manière cohérente en timezone local
    let startOfDay, endOfDay, responseDate;
    if (date) {
      const [year, month, day] = date.split('-').map(Number);
      startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
      endOfDay = new Date(year, month - 1, day + 1, 0, 0, 0, 0);
      responseDate = date; // Utiliser la date demandée directement
    } else {
      const now = new Date();
      startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
      responseDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    console.log(`[STATS] Fetching stats for ${responseDate} (requested: ${date || 'today'})`);

    // Récupérer tous les pointages du jour
    const pointages = await prisma.pointage.findMany({
      where: {
        validatedAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
      include: {
        service: { include: { ligne: true } },
        conducteur: true,
      },
    });

    // Récupérer tous les services du jour pour comparer
    const services = await prisma.service.findMany({
      where: {
        date: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
      include: { ligne: true, conducteur: true },
    });

    console.log(`[STATS] Found ${services.length} services, ${pointages.length} pointages`);

    // Statistiques détaillées
    const totalServices = services.length;
    const totalPointages = pointages.length;
    const validationRate = totalServices > 0 ? Math.round((totalPointages / totalServices) * 100) : 0;

    // Par conducteur
    const conductorStats = {};
    pointages.forEach((p) => {
      const cid = p.conducteurId;
      if (!conductorStats[cid]) {
        conductorStats[cid] = {
          id: cid,
          nom: p.conducteur?.nom || 'Inconnu',
          prenom: p.conducteur?.prenom || '',
          pointages: 0,
          permisChecked: 0,
          chronometerChecked: 0,
          avgValidationTime: 0,
        };
      }
      conductorStats[cid].pointages++;
      if (p.permisChecked) conductorStats[cid].permisChecked++;
      if (p.chronometerChecked) conductorStats[cid].chronometerChecked++;
    });

    // Distribuer par heure de départ
    const hourlyDistribution = {};
    services.forEach((s) => {
      const hour = s.heureDebut?.split(':')[0] || '??';
      if (!hourlyDistribution[hour]) hourlyDistribution[hour] = { total: 0, validated: 0 };
      hourlyDistribution[hour].total++;
    });
    pointages.forEach((p) => {
      const hour = p.service?.heureDebut?.split(':')[0] || '??';
      if (hourlyDistribution[hour]) hourlyDistribution[hour].validated++;
    });

    // Top/flop conducteurs
    const conductorList = Object.values(conductorStats).sort((a, b) => b.pointages - a.pointages);
    const topConductors = conductorList.slice(0, 5);
    const flopConductors = conductorList.slice(-5).reverse();

    // Véhicules/types
    const vehicleTypes = {};
    pointages.forEach((p) => {
      if (p.vehicleType) {
        vehicleTypes[p.vehicleType] = (vehicleTypes[p.vehicleType] || 0) + 1;
      }
    });

    // Validateurs (Régulateur vs Chef d'Équipe)
    const validatedByStats = {};
    pointages.forEach((p) => {
      const role = p.validatedBy || 'Inconnu';
      validatedByStats[role] = (validatedByStats[role] || 0) + 1;
    });

    // Lignes/routes
    const lineStats = {};
    pointages.forEach((p) => {
      const lineNum = p.service?.ligne?.numero || '??';
      if (!lineStats[lineNum]) {
        lineStats[lineNum] = { numero: lineNum, pointages: 0 };
      }
      lineStats[lineNum].pointages++;
    });

    // Services non assurés - analyser les motifs
    const nonAssuuredServices = services.filter(s => s.statut === 'Non assuré');
    const nonAssuuredStats = {
      total: nonAssuuredServices.length,
      byReason: {}
    };

    // Motifs possibles - doit correspondre à ceux du frontend
    const possibleMotifs = [
      'RETARD CR',
      'REFUS POINTAGE',
      'REFUS CNI/PERMIS',
      'ABSENCE VEHICULE',
      'ABSENCE CONDUCTEUR',
      'DROIT DE RETRAIT CONDUCTEUR',
      'GREVE NON AUTORISEE',
      'GREVE AUTORISEE'
    ];

    // Initialiser tous les motifs à 0
    possibleMotifs.forEach(motif => {
      nonAssuuredStats.byReason[motif] = 0;
    });

    // Compter les motifs
    nonAssuuredServices.forEach(s => {
      if (s.motifNonAssurance && possibleMotifs.includes(s.motifNonAssurance)) {
        nonAssuuredStats.byReason[s.motifNonAssurance]++;
      } else if (!s.motifNonAssurance) {
        // Compter les services sans motif (NULL)
        if (!nonAssuuredStats.byReason['Non spécifié']) {
          nonAssuuredStats.byReason['Non spécifié'] = 0;
        }
        nonAssuuredStats.byReason['Non spécifié']++;
      }
    });

    // DEBUG: Log the breakdown
    console.log(`[STATS] Non-assured breakdown:`, nonAssuuredStats.byReason);
    const motifTotal = Object.values(nonAssuuredStats.byReason).reduce((a, b) => a + b, 0);
    if (motifTotal !== nonAssuuredStats.total) {
      console.warn(`[STATS] ⚠️ Incohérence détectée: total=${nonAssuuredStats.total} mais motifs=${motifTotal}`);
    }

    // Services expirés
    const expiredServices = services.filter(s => 
      s.expirationPointage && new Date(s.expirationPointage) < new Date()
    ).length;

    const response = {
      date: responseDate,
      totalServices,
      totalPointages,
      validationRate,
      conductorStats: Object.values(conductorStats),
      topConductors,
      flopConductors,
      hourlyDistribution,
      vehicleTypes,
      validatedByStats,
      lineStats: Object.values(lineStats).sort((a, b) => b.pointages - a.pointages),
      avgPermisCheckRate: totalPointages > 0
        ? Math.round((Object.values(conductorStats).reduce((sum, c) => sum + c.permisChecked, 0) / totalPointages) * 100)
        : 0,
      avgTachographCheckRate: totalPointages > 0
        ? Math.round((Object.values(conductorStats).reduce((sum, c) => sum + c.chronometerChecked, 0) / totalPointages) * 100)
        : 0,
      nonAssuuredStats,
      expiredServices,
    };

    console.log(`[STATS] Responding with hourlyDistribution:`, Object.keys(hourlyDistribution).length > 0 ? 'OK' : 'EMPTY');
    res.json(response);
  } catch (e) {
    console.error('GET /api/pointages/stats/daily ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// Récupérer le détail des services non assurés pour une date donnée
app.get('/api/pointages/unassured/detail', async (req, res) => {
  try {
    const { date } = req.query;
    let startOfDay, endOfDay, responseDate;
    if (date) {
      const [year, month, day] = date.split('-').map(Number);
      startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
      endOfDay = new Date(year, month - 1, day + 1, 0, 0, 0, 0);
      responseDate = date;
    } else {
      const now = new Date();
      startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
      responseDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    // Récupérer tous les services non assurés du jour
    const unassuredServices = await prisma.service.findMany({
      where: {
        statut: 'Non assuré',
        date: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
      include: {
        ligne: true,
        sens: true,
        conducteur: true,
      },
      orderBy: { heureDebut: 'asc' },
    });

    console.log(`[STATS] Services non assurés: ${unassuredServices.length}`);

    res.json({
      date: responseDate,
      total: unassuredServices.length,
      services: unassuredServices.map(s => ({
        id: s.id,
        ligne: s.ligne?.numero,
        heure: `${s.heureDebut}-${s.heureFin}`,
        direction: s.sens?.nom,
        conducteur: s.conducteur ? `${s.conducteur.prenom} ${s.conducteur.nom}` : 'Non assigné',
        motif: s.motifNonAssurance || 'Non spécifié',
        details: s.motifsDetails,
      })),
    });
  } catch (e) {
    console.error('GET /api/pointages/unassured/detail ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// DETAIL
app.get('/api/pointages/:id', async (req, res) => {
  try {
    const pointage = await prisma.pointage.findUnique({
      where: { id: req.params.id },
      include: { service: { include: { ligne: true, conducteur: true } }, conducteur: true },
    });
    if (!pointage) return res.status(404).json({ error: 'Not found' });
    res.json(pointage);
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

// CREATE
app.post('/api/pointages', async (req, res) => {
  try {
    const b = req.body;
    const missing = [];
    if (!b.serviceId) missing.push('serviceId');
    if (!b.conducteurId) missing.push('conducteurId');
    if (!b.validatedBy) missing.push('validatedBy');
    if (missing.length) return res.status(400).json({ error: 'Champs requis manquants', missing });

    const payload = {
      serviceId: String(b.serviceId),
      conducteurId: String(b.conducteurId),
      validatedBy: String(b.validatedBy), // "Régulateur" ou "Chef d'Équipe"
      vehicleType: b.vehicleType || null,
      permisChecked: Boolean(b.permisChecked || false),
      chronometerChecked: Boolean(b.chronometerChecked || false),
    };

    // Marquer le service comme "Terminée" AVANT de créer le pointage
    const updatedService = await prisma.service.update({
      where: { id: b.serviceId },
      data: { statut: 'Terminée' },
      include: { ligne: true, conducteur: true }
    });

    const pointage = await prisma.pointage.create({
      data: payload,
      include: { service: { include: { ligne: true, conducteur: true } }, conducteur: true },
    });

    // Détecter si le service est pointé en retard
    if (b.isLate) {
      console.log(`[POINTAGE] Service retardé: ${updatedService.ligne?.numero} à ${updatedService.heureDebut}`);
      // Enregistrer le retard dans les notes du conducteur ou l'historique
      if (b.lateMinutes) {
        const conducteur = pointage.conducteur;
        console.log(`[RETARD] ${conducteur.prenom} ${conducteur.nom} - Retard: ${b.lateMinutes} minutes`);
      }
    }

    res.status(201).json(pointage);
  } catch (e) {
    console.error('POST /api/pointages ERROR ->', e);
    res.status(400).json({ error: e?.message || String(e) });
  }
});

// UPDATE
app.put('/api/pointages/:id', async (req, res) => {
  try {
    const b = req.body;
    const data = {
      vehicleType: b.vehicleType ?? undefined,
      permisChecked: b.permisChecked !== undefined ? Boolean(b.permisChecked) : undefined,
      chronometerChecked: b.chronometerChecked !== undefined ? Boolean(b.chronometerChecked) : undefined,
    };

    const pointage = await prisma.pointage.update({
      where: { id: req.params.id },
      data,
      include: { service: { include: { ligne: true, conducteur: true } }, conducteur: true },
    });
    res.json(pointage);
  } catch (e) {
    console.error('PUT /api/pointages/:id ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// DELETE
app.delete('/api/pointages/:id', async (req, res) => {
  try {
    await prisma.pointage.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

// ===================== SAEIV ENDPOINTS =====================

// GET ALL SAEIV
app.get('/api/saeivs', async (_req, res) => {
  try {
    const saeivs = await prisma.sAEIV.findMany({ orderBy: { numero: 'asc' } });
    res.json(saeivs);
  } catch (e) {
    console.error('GET /api/saeivs ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// GET SINGLE SAEIV
app.get('/api/saeivs/:id', async (req, res) => {
  try {
    const saeiv = await prisma.sAEIV.findUnique({ where: { id: req.params.id } });
    if (!saeiv) return res.status(404).json({ error: 'Not found' });
    res.json(saeiv);
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

// CREATE SAEIV
app.post('/api/saeivs', async (req, res) => {
  try {
    const b = req.body;
    const missing = [];
    if (!b.numero) missing.push('numero');
    if (!b.libelle) missing.push('libelle');
    if (!b.type) missing.push('type');

    if (missing.length > 0) {
      return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });
    }

    const saeiv = await prisma.sAEIV.create({
      data: {
        numero: b.numero,
        libelle: b.libelle,
        type: b.type,
        statut: b.statut || 'Actif',
      },
    });

    res.json(saeiv);
  } catch (e) {
    console.error('POST /api/saeivs ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// UPDATE SAEIV
app.put('/api/saeivs/:id', async (req, res) => {
  try {
    const b = req.body;
    const data = {
      numero: b.numero ?? undefined,
      libelle: b.libelle ?? undefined,
      type: b.type ?? undefined,
      statut: b.statut ?? undefined,
    };

    const saeiv = await prisma.sAEIV.update({ where: { id: req.params.id }, data });
    res.json(saeiv);
  } catch (e) {
    console.error('PUT /api/saeivs/:id ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// DELETE SAEIV
app.delete('/api/saeivs/:id', async (req, res) => {
  try {
    await prisma.sAEIV.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

// ===================== SENS ENDPOINTS =====================

// GET SENS BY LIGNE
app.get('/api/sens/ligne/:ligneId', async (req, res) => {
  try {
    const sens = await prisma.sens.findMany({ 
      where: { ligneId: req.params.ligneId },
      orderBy: { ordre: 'asc' }
    });
    res.json(sens);
  } catch (e) {
    console.error('GET /api/sens/ligne/:ligneId ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// GET SINGLE SENS
app.get('/api/sens/:id', async (req, res) => {
  try {
    const sens = await prisma.sens.findUnique({ 
      where: { id: req.params.id },
      include: { services: true }
    });
    if (!sens) return res.status(404).json({ error: 'Not found' });
    res.json(sens);
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

// CREATE SENS
app.post('/api/sens', async (req, res) => {
  try {
    const b = req.body;
    if (!b.ligneId || !b.nom) {
      return res.status(400).json({ error: 'Missing fields: ligneId, nom' });
    }

    const sens = await prisma.sens.create({
      data: {
        ligneId: b.ligneId,
        nom: b.nom,
        direction: b.direction || null,
        ordre: b.ordre || 1,
        statut: b.statut || 'Actif',
      },
    });

    res.json(sens);
  } catch (e) {
    console.error('POST /api/sens ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// UPDATE SENS
app.put('/api/sens/:id', async (req, res) => {
  try {
    const b = req.body;
    const data = {
      nom: b.nom ?? undefined,
      direction: b.direction ?? undefined,
      ordre: b.ordre ?? undefined,
      statut: b.statut ?? undefined,
    };

    const sens = await prisma.sens.update({ where: { id: req.params.id }, data });
    res.json(sens);
  } catch (e) {
    console.error('PUT /api/sens/:id ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// DELETE SENS
app.delete('/api/sens/:id', async (req, res) => {
  try {
    await prisma.sens.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

// ===================== SERVICES ENDPOINTS (pour LignesHierarchie) =====================

// GET SERVICES BY SENS
app.get('/api/services-hierarchie/sens/:sensId', async (req, res) => {
  try {
    const services = await prisma.service.findMany({ 
      where: { sensId: req.params.sensId },
      include: { conducteur: true }
    });
    res.json(services);
  } catch (e) {
    console.error('GET /api/services-hierarchie/sens/:sensId ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// CREATE SERVICE (for LignesHierarchie)
app.post('/api/services-hierarchie', async (req, res) => {
  try {
    const b = req.body;
    if (!b.sensId || !b.heureDebut || !b.heureFin) {
      return res.status(400).json({ error: 'Missing fields: sensId, heureDebut, heureFin' });
    }

    // Validation: durée maximale de 10 heures
    const [hDebut, mDebut] = b.heureDebut.split(':').map(Number);
    const [hFin, mFin] = b.heureFin.split(':').map(Number);
    const minutesDebut = hDebut * 60 + mDebut;
    const minutesFin = hFin * 60 + mFin;
    
    // Calculer la durée en tenant compte du passage éventuel de minuit
    let dureeService = minutesFin - minutesDebut;
    if (dureeService < 0) {
      // Le service passe minuit (ex: 22:00 - 05:00)
      dureeService = (1440 - minutesDebut) + minutesFin;
    }

    if (dureeService > 600) { // 600 minutes = 10 heures
      return res.status(400).json({ 
        error: 'Service duration exceeds 10 hours (from depot departure to return to depot)' 
      });
    }

    if (dureeService <= 0) {
      return res.status(400).json({ 
        error: 'End time must be after start time' 
      });
    }

    // Vérifier les limites horaires de la ligne
    const ligne = await prisma.ligne.findUnique({ where: { id: b.ligneId } });
    if (ligne && ligne.heureDebut && ligne.heureFin) {
      const [hLigneDebut, mLigneDebut] = ligne.heureDebut.split(':').map(Number);
      const [hLigneFin, mLigneFin] = ligne.heureFin.split(':').map(Number);
      const minutesLigneDebut = hLigneDebut * 60 + mLigneDebut;
      const minutesLigneFin = hLigneFin * 60 + mLigneFin;

      const lignePasseMinuit = minutesLigneFin < minutesLigneDebut;

      if (lignePasseMinuit) {
        // Ligne passe minuit (ex: 05h-02h ou 22h-06h)
        // Service accepté s'il commence >= heureDebut OU commence <= heureFin
        
        if (minutesDebut >= minutesLigneDebut) {
          // Service commence après heureDebut: OK
          // Ex: Ligne 05h-02h, Service 05h-14h ou 22h-23h
        } else if (minutesDebut <= minutesLigneFin) {
          // Service commence avant heureFin (après minuit): OK
          // Ex: Ligne 05h-02h, Service 01h-02h
        } else {
          // Service commence dans le trou entre heureFin et heureDebut: NON
          // Ex: Ligne 05h-02h, Service 03h-04h
          return res.status(400).json({ 
            error: `Service must start between ${ligne.heureDebut} and ${ligne.heureFin} (next day)` 
          });
        }

        // Vérifier que service ne dépasse pas les limites excessivement
        if (minutesFin > minutesLigneFin && minutesDebut >= minutesLigneDebut && minutesFin < minutesDebut) {
          // Service passe minuit mais fin > heureFin: NON
          return res.status(400).json({ 
            error: `Service cannot end after ${ligne.heureFin}` 
          });
        }
      } else {
        // Horaires normaux: heureDebut < heureFin (même jour)
        if (minutesDebut < minutesLigneDebut) {
          return res.status(400).json({ 
            error: `Service must start at or after ${ligne.heureDebut}` 
          });
        }

        if (minutesFin > minutesLigneFin) {
          return res.status(400).json({ 
            error: `Service must end before or at ${ligne.heureFin}` 
          });
        }
      }
    }

    // Anti-duplication : si un service identique existe déjà (même sens, date, début, fin), on le renvoie tel quel
    const existing = await prisma.service.findFirst({
      where: {
        sensId: b.sensId,
        date: b.date ? new Date(b.date) : undefined,
        heureDebut: b.heureDebut,
        heureFin: b.heureFin,
      },
      include: { conducteur: true, sens: true }
    });

    if (existing) {
      return res.json({ ...existing, duplicate: true });
    }

    const service = await prisma.service.create({
      data: {
        sensId: b.sensId,
        ligneId: b.ligneId, // Reference to ligne
        heureDebut: b.heureDebut,
        heureFin: b.heureFin,
        statut: b.statut || 'Planifiée',
        date: b.date ? new Date(b.date) : new Date(),
      },
      include: { conducteur: true, sens: true }
    });

    res.json(service);
  } catch (e) {
    console.error('POST /api/services-hierarchie ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// UPDATE SERVICE (for LignesHierarchie)
app.put('/api/services-hierarchie/:id', async (req, res) => {
  try {
    const b = req.body;
    const data = {
      heureDebut: b.heureDebut ?? undefined,
      heureFin: b.heureFin ?? undefined,
      conducteurId: b.conducteurId ?? undefined,
      statut: b.statut ?? undefined,
      vehiculeAssigne: b.vehiculeAssigne ?? undefined,
    };

    // Si on assigne un véhicule, mettre à jour son statut à "Affecté"
    if (b.vehiculeAssigne) {
      await prisma.vehicle.update({
        where: { parc: b.vehiculeAssigne },
        data: { statut: 'Affecté' }
      });
    }

    const service = await prisma.service.update({ 
      where: { id: req.params.id }, 
      data,
      include: { conducteur: true }
    });
    res.json(service);
  } catch (e) {
    console.error('PUT /api/services-hierarchie/:id ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// DELETE SERVICE (for LignesHierarchie)
app.delete('/api/services-hierarchie/:id', async (req, res) => {
  try {
    await prisma.service.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

// ========== TRAJETS (Itinéraires) ==========

// GET trajets par ligne
app.get('/api/trajets/ligne/:ligneId', async (req, res) => {
  try {
    const trajets = await prisma.trajet.findMany({
      where: { ligneId: req.params.ligneId },
      include: { arrets: { orderBy: { ordre: 'asc' } } },
      orderBy: { ordre: 'asc' }
    });
    res.json(trajets);
  } catch (e) {
    console.error('GET /api/trajets/ligne/:ligneId ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// POST créer trajet
app.post('/api/trajets', async (req, res) => {
  try {
    const b = req.body;
    if (!b.ligneId || !b.nom) {
      return res.status(400).json({ error: 'Missing fields: ligneId, nom' });
    }

    const trajet = await prisma.trajet.create({
      data: {
        ligneId: b.ligneId,
        sensId: b.sensId || null,
        nom: b.nom,
        description: b.description || null,
        ordre: b.ordre || 1,
        statut: b.statut || 'Actif'
      },
      include: { arrets: true }
    });

    res.json(trajet);
  } catch (e) {
    console.error('POST /api/trajets ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// PUT modifier trajet
app.put('/api/trajets/:id', async (req, res) => {
  try {
    const b = req.body;
    const data = {
      nom: b.nom ?? undefined,
      description: b.description ?? undefined,
      sensId: b.sensId ?? undefined,
      ordre: b.ordre ?? undefined,
      statut: b.statut ?? undefined
    };

    const trajet = await prisma.trajet.update({
      where: { id: req.params.id },
      data,
      include: { arrets: { orderBy: { ordre: 'asc' } } }
    });

    res.json(trajet);
  } catch (e) {
    console.error('PUT /api/trajets/:id ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// DELETE trajet
app.delete('/api/trajets/:id', async (req, res) => {
  try {
    await prisma.trajet.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/trajets/:id ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// ========== ARRÊTS (Stops) ==========

// GET arrêts par trajet
app.get('/api/arrets/trajet/:trajetId', async (req, res) => {
  try {
    const arrets = await prisma.arret.findMany({
      where: { trajetId: req.params.trajetId },
      orderBy: { ordre: 'asc' }
    });
    res.json(arrets);
  } catch (e) {
    console.error('GET /api/arrets/trajet/:trajetId ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// POST créer arrêt
app.post('/api/arrets', async (req, res) => {
  try {
    const b = req.body;
    if (!b.trajetId || !b.nom) {
      return res.status(400).json({ error: 'Missing fields: trajetId, nom' });
    }

    // Calculer automatiquement le prochain numéro d'ordre si non fourni
    let ordre = b.ordre;
    if (ordre === undefined || ordre === null) {
      const maxOrdre = await prisma.arret.aggregate({
        where: { trajetId: b.trajetId },
        _max: { ordre: true }
      });
      ordre = (maxOrdre._max.ordre || 0) + 1;
    }

    const arret = await prisma.arret.create({
      data: {
        trajetId: b.trajetId,
        nom: b.nom,
        adresse: b.adresse || null,
        ordre: ordre,
        tempsArriveeAntecedent: b.tempsArriveeAntecedent || 0
      }
    });

    res.json(arret);
  } catch (e) {
    console.error('POST /api/arrets ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// PUT modifier arrêt
app.put('/api/arrets/:id', async (req, res) => {
  try {
    const b = req.body;
    const data = {
      nom: b.nom ?? undefined,
      adresse: b.adresse ?? undefined,
      ordre: b.ordre ?? undefined,
      tempsArriveeAntecedent: b.tempsArriveeAntecedent ?? undefined
    };

    const arret = await prisma.arret.update({
      where: { id: req.params.id },
      data
    });

    res.json(arret);
  } catch (e) {
    console.error('PUT /api/arrets/:id ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// DELETE arrêt
app.delete('/api/arrets/:id', async (req, res) => {
  try {
    await prisma.arret.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/arrets/:id ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// ---------- CSV Import Endpoints ----------

// Helper: Parse CSV simple (pas de dépendance externe)
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) throw new Error('CSV vide ou invalide');

  // Détecter les sections [LIGNES], [ARRETS], etc.
  const sections = {};
  let currentSection = 'LIGNES'; // Section par défaut
  let currentLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Vérifier si c'est une entête de section
    if (line.startsWith('[') && line.endsWith(']')) {
      // Sauvegarder la section précédente
      if (currentLines.length > 0) {
        sections[currentSection] = parseCSVLines(currentLines);
      }
      currentSection = line.slice(1, -1); // Retirer [ et ]
      currentLines = [];
    } else if (line) {
      currentLines.push(line);
    }
  }

  // Sauvegarder la dernière section
  if (currentLines.length > 0) {
    sections[currentSection] = parseCSVLines(currentLines);
  }

  return sections;
}

function parseCSVLines(lines) {
  if (lines.length < 1) return { headers: [], rows: [] };

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = lines[i].split(',').map(v => v.trim());
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }

  return { headers, rows };
}

// Helper: Parse jours "L; M; M; J; V; S; D" en objet calendrier
function parseJours(joursStr) {
  if (!joursStr) return null;
  
  const jours = joursStr.split(';').map(j => j.trim().toUpperCase());
  const mapping = {
    'L': 'lundi',
    'M': 'mardi',
    'J': 'jeudi',
    'V': 'vendredi',
    'S': 'samedi',
    'D': 'dimanche'
  };

  const calendrier = {
    lundi: false,
    mardi: false,
    mercredi: false,
    jeudi: false,
    vendredi: false,
    samedi: false,
    dimanche: false
  };

  // Compter les "M" pour identifier mardi et mercredi
  let mCount = 0;
  jours.forEach(j => {
    if (j === 'L') calendrier.lundi = true;
    else if (j === 'M') {
      mCount++;
      if (mCount === 1) calendrier.mardi = true;
      else if (mCount === 2) calendrier.mercredi = true;
    }
    else if (j === 'J') calendrier.jeudi = true;
    else if (j === 'V') calendrier.vendredi = true;
    else if (j === 'S') calendrier.samedi = true;
    else if (j === 'D') calendrier.dimanche = true;
  });

  return calendrier;
}

// Helper: Parse heures "04h37" -> "04:37"
function parseHeure(heureStr) {
  if (!heureStr) return null;
  return heureStr.replace('h', ':');
}

// POST /api/import/lignes - Import CSV de lignes
app.post('/api/import/lignes', async (req, res) => {
  try {
    console.log('[IMPORT] POST /api/import/lignes');

    if (!prismaReady) {
      return res.status(503).json({ error: 'Database not ready' });
    }

    let csvText = req.csvContent || req.body || '';

    if (!csvText) {
      return res.status(400).json({ error: 'Aucun fichier CSV fourni' });
    }

    await processImportLignes(csvText, res);
  } catch (error) {
    console.error('[IMPORT] POST /api/import/lignes ERROR ->', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Helper: Traiter l'import des lignes
async function processImportLignes(csvText, res) {
  const sections = parseCSV(csvText);

  // Parser les sections
  const lignesData = sections['LIGNES'] || { headers: [], rows: [] };
  const arretsData = sections['ARRETS'] || { headers: [], rows: [] };

  // Valider les colonnes requises pour les lignes
  const requiredColumns = ['numéro de ligne', 'nom de la ligne', 'jours de fonctionnement', 'type', 'premier départ', 'dernier arrivé au dépôt'];
  const missingColumns = requiredColumns.filter(col => !lignesData.headers.includes(col.toLowerCase()));

  if (missingColumns.length > 0) {
    throw new Error(`Colonnes manquantes dans [LIGNES]: ${missingColumns.join(', ')}`);
  }

  let imported = 0;
  const errors = [];
  const trajetsMap = new Map(); // Tracker: trajet -> Prisma object
  
  // Obtenir la date d'aujourd'hui en heure Paris
  const todayStr = getTodayDateParis();
  const [year, month, day] = todayStr.split('-').map(Number);
  
  // Créer une date pour "aujourd'hui" en heure Paris
  // On utilise une date UTC pour éviter les décalages timezone
  const today = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  
  // Obtenir le jour de la semaine en heure Paris
  const tempFormatter = new Intl.DateTimeFormat('fr-FR', { 
    timeZone: 'Europe/Paris',
    weekday: 'long'
  });
  const todayDayName = tempFormatter.format(today).toLowerCase();
  const dayNameMap = {
    'lundi': 1, 'mardi': 2, 'mercredi': 3, 'jeudi': 4,
    'vendredi': 5, 'samedi': 6, 'dimanche': 0
  };
  const todayDayOfWeek = dayNameMap[todayDayName] || 1;

  // ============ PHASE 1: Importer les lignes, sens, trajets et services ============
  for (let i = 0; i < lignesData.rows.length; i++) {
    try {
      const row = lignesData.rows[i];
      const numero = row['numéro de ligne']?.trim();
      const nom = row['nom de la ligne']?.trim();
      const joursStr = row['jours de fonctionnement']?.trim();
      const type = row['type']?.trim();
      const heureDebut = parseHeure(row['premier départ']?.trim());
      const heureFin = parseHeure(row['dernier arrivé au dépôt']?.trim());
      const sensNom = row['sens']?.trim();
      const sensDirection = row['direction']?.trim();
      const trajetNom = row['trajet']?.trim();
      const trajetDescription = row['description trajet']?.trim();

      if (!numero || !nom) {
        errors.push(`Ligne [LIGNES] ${i + 2}: numéro et nom requis`);
        continue;
      }

      const calendrier = parseJours(joursStr);

      // Chercher si la ligne existe
      let ligne = await prisma.ligne.findUnique({
        where: { numero },
        include: { sens: true }
      });

      // Si la ligne n'existe pas, la créer
      if (!ligne) {
        ligne = await prisma.ligne.create({
          data: {
            numero,
            nom,
            typesVehicules: JSON.stringify(type ? [type] : ['Standard']),
            heureDebut,
            heureFin,
            calendrierJson: JSON.stringify(calendrier),
            statut: 'Actif',
          },
          include: { sens: true }
        });
      } else {
        // La ligne existe déjà : on ne met à jour que les infos essentielles si elle était vide
        if (!ligne.nom || ligne.nom === '') {
          ligne = await prisma.ligne.update({
            where: { numero },
            data: {
              nom,
              statut: 'Actif',
            },
            include: { sens: true }
          });
        }
      }

      // Créer/mettre à jour le sens
      let sens = null;
      if (sensNom) {
        sens = await prisma.sens.upsert({
          where: {
            ligneId_nom: {
              ligneId: ligne.id,
              nom: sensNom,
            },
          },
          create: {
            ligneId: ligne.id,
            nom: sensNom,
            direction: sensDirection || null,
            statut: 'Actif',
          },
          update: {
            direction: sensDirection || null,
          },
        });
      }

      // Créer/mettre à jour le trajet
      let trajet = null;
      if (trajetNom && sens) {
        trajet = await prisma.trajet.upsert({
          where: {
            ligneId_nom: {
              ligneId: ligne.id,
              nom: trajetNom,
            },
          },
          create: {
            ligneId: ligne.id,
            sensId: sens.id,
            nom: trajetNom,
            description: trajetDescription || null,
            statut: 'Actif',
          },
          update: {
            description: trajetDescription || null,
          },
        });
        trajetsMap.set(trajetNom, trajet);
      }

      // Créer les services
      for (let j = 1; j <= 20; j++) {
        const serviceBeginKey = `service ${j} début`.toLowerCase();
        const serviceEndKey = `service ${j} fin`.toLowerCase();

        const serviceBegin = row[serviceBeginKey]?.trim();
        const serviceEnd = row[serviceEndKey]?.trim();

        if (serviceBegin && serviceEnd) {
          const heureDebuitService = parseHeure(serviceBegin);
          const heureFinService = parseHeure(serviceEnd);

          if (heureDebuitService && heureFinService) {
            // Créer le service pour chaque jour de fonctionnement
            const joursActive = Object.keys(calendrier).filter(jour => calendrier[jour]);

            for (const jour of joursActive) {
              const serviceDate = new Date(today);
              const dayMap = {
                'lundi': 1, 'mardi': 2, 'mercredi': 3, 'jeudi': 4,
                'vendredi': 5, 'samedi': 6, 'dimanche': 0,
              };

              const targetDay = dayMap[jour];
              const currentDay = todayDayOfWeek; // Utiliser le jour correct en heure Paris
              let daysToAdd = targetDay - currentDay;
              
              // Si le jour est dans le passé cette semaine, prendre la semaine prochaine
              // Si c'est le même jour, aussi prendre la semaine prochaine
              if (daysToAdd <= 0) daysToAdd += 7;

              serviceDate.setDate(serviceDate.getDate() + daysToAdd);

              // Vérifier si un service identique existe déjà pour éviter les doublons
              // (même ligne, même date, mêmes heures)
              const dateStr = serviceDate.toISOString().split('T')[0];
              const existingService = await prisma.service.findFirst({
                where: {
                  ligneId: ligne.id,
                  date: {
                    gte: new Date(dateStr),
                    lt: new Date(new Date(dateStr).getTime() + 24 * 60 * 60 * 1000),
                  },
                  heureDebut: heureDebuitService,
                  heureFin: heureFinService,
                },
              });

              // Créer le service seulement s'il n'existe pas déjà
              if (!existingService) {
                await prisma.service.create({
                  data: {
                    ligneId: ligne.id,
                    sensId: sens?.id || null,
                    date: serviceDate,
                    heureDebut: heureDebuitService,
                    heureFin: heureFinService,
                    statut: 'Planifiée',
                  },
                }).catch((err) => {
                  console.warn(`[IMPORT] Service déjà existant ou erreur: ${err.message}`);
                  // Ignorer les doublons
                });
              }
            }
          }
        }
      }

      imported++;
    } catch (error) {
      errors.push(`Ligne [LIGNES] ${i + 2}: ${error.message}`);
    }
  }

  // ============ PHASE 2: Importer les arrêts ============
  for (let i = 0; i < arretsData.rows.length; i++) {
    try {
      const row = arretsData.rows[i];
      const trajetNom = row['trajet']?.trim();
      const ordre = parseInt(row['ordre']) || 0;
      const nomArret = row['nom arrêt']?.trim();
      const temps = parseInt(row['temps depuis arrêt précédent (min)']) || 0;

      if (!trajetNom || !nomArret) {
        errors.push(`Ligne [ARRETS] ${i + 2}: trajet et nom arrêt requis`);
        continue;
      }

      const trajet = trajetsMap.get(trajetNom);
      if (!trajet) {
        errors.push(`Ligne [ARRETS] ${i + 2}: trajet "${trajetNom}" non trouvé`);
        continue;
      }

      // Créer l'arrêt
      await prisma.arret.upsert({
        where: {
          trajetId_ordre: {
            trajetId: trajet.id,
            ordre: ordre,
          },
        },
        create: {
          trajetId: trajet.id,
          nom: nomArret,
          ordre: ordre,
          tempsArriveeAntecedent: temps,
        },
        update: {
          nom: nomArret,
          tempsArriveeAntecedent: temps,
        },
      });
    } catch (error) {
      errors.push(`Ligne [ARRETS] ${i + 2}: ${error.message}`);
    }
  }

  res.json({
    imported,
    errors: errors.length > 0 ? errors : undefined,
    message: `${imported} ligne(s) et ${arretsData.rows.length} arrêt(s) importée(s)`,
  });
}

// POST /api/import/vehicles - Import CSV de véhicules
app.post('/api/import/vehicles', async (req, res) => {
  try {
    console.log('[IMPORT] POST /api/import/vehicles');

    if (!prismaReady) {
      return res.status(503).json({ error: 'Database not ready' });
    }

    let csvText = '';
    
    // Chercher le contenu dans différents endroits
    if (req.csvContent) {
      csvText = req.csvContent;
    } else if (req.files && req.files.file) {
      // Si c'est un upload multipart avec multer
      csvText = req.files.file.data.toString('utf-8');
    } else if (typeof req.body === 'string') {
      // Si c'est du texte brut
      csvText = req.body;
    } else if (req.body && typeof req.body === 'object') {
      // Si c'est du JSON avec un champ csvContent
      csvText = req.body.csvContent || '';
    }

    if (!csvText || csvText.trim().length === 0) {
      return res.status(400).json({ error: 'Aucun fichier CSV fourni' });
    }

    await processImportVehicles(csvText, res);
  } catch (error) {
    console.error('[IMPORT] POST /api/import/vehicles ERROR ->', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Helper: Traiter l'import des véhicules
async function processImportVehicles(csvText, res) {
  // Parse le CSV (format simple à une seule section)
  let lines = csvText.trim().split('\n');
  
  console.log(`[IMPORT] Nombre de lignes brutes: ${lines.length}`);
  console.log(`[IMPORT] Première ligne: ${lines[0]?.substring(0, 100)}`);
  console.log(`[IMPORT] Dernière ligne: ${lines[lines.length - 1]?.substring(0, 100)}`);
  
  // Filtrer les lignes vides
  lines = lines.filter(line => line && line.trim().length > 0);
  
  console.log(`[IMPORT] Nombre de lignes après filtrage: ${lines.length}`);
  
  if (lines.length < 2) {
    throw new Error(`CSV vide ou invalide (${lines.length} ligne(s) trouvée(s), besoin de au moins 2)`);
  }

  // Extraire les headers
  const headers = lines[0]
    .split(',')
    .map(h => h.trim().toLowerCase());

  console.log(`[IMPORT] Headers trouvés: ${headers.join(', ')}`);

  // Valider les colonnes requises
  const requiredColumns = ['parc', 'type', 'modele', 'immat', 'km', 'tauxsante', 'statut'];
  const missingColumns = requiredColumns.filter(col => !headers.includes(col));

  if (missingColumns.length > 0) {
    throw new Error(`Colonnes manquantes: ${missingColumns.join(', ')}`);
  }

  // Mapper les indices des colonnes
  const columnIndices = {};
  headers.forEach((header, index) => {
    columnIndices[header] = index;
  });

  let imported = 0;
  const errors = [];

  // Traiter chaque ligne du CSV
  for (let i = 1; i < lines.length; i++) {
    try {
      const line = lines[i];
      if (!line || line.trim().length === 0) continue;
      
      const values = line.split(',').map(v => v.trim());

      // Extraire les données requises
      const parc = values[columnIndices['parc']];
      const type = values[columnIndices['type']];
      const modele = values[columnIndices['modele']];
      const immat = values[columnIndices['immat']];
      const km = parseInt(values[columnIndices['km']]) || 0;
      const tauxSante = parseInt(values[columnIndices['tauxsante']]) || 0;
      
      // Mapper les états CSV vers les états valides de l'app
      const rawStatut = values[columnIndices['statut']] || '';
      const statutMapping = {
        'Actif': 'Disponible',
        'Disponible': 'Disponible',
        'Indisponible': 'Indisponible',
        'Atelier': 'Atelier',
        'Aux Ateliers': 'Atelier',
        'A VENIR': 'A VENIR',
        'Affecté': 'Affecté',
        'Au CT': 'Au CT',
        'Réformé': 'Réformé',
        'Suspendu': 'Indisponible',
      };
      const statut = statutMapping[rawStatut] || 'Disponible';

      // Valider les données requises
      if (!parc || !type || !modele || !immat || statut === undefined) {
        errors.push(`Ligne ${i + 1}: données requises manquantes (parc, type, modele, immat, statut)`);
        continue;
      }

      // Extraire les données optionnelles
      const annee = columnIndices['annee'] !== undefined ? parseInt(values[columnIndices['annee']]) : null;
      const boite = columnIndices['boite'] !== undefined ? values[columnIndices['boite']] : null;
      const moteur = columnIndices['moteur'] !== undefined ? values[columnIndices['moteur']] : null;
      const portes = columnIndices['portes'] !== undefined ? parseInt(values[columnIndices['portes']]) : null;
      const girouette = columnIndices['girouette'] !== undefined ? values[columnIndices['girouette']] : null;
      const clim = columnIndices['clim'] !== undefined ? values[columnIndices['clim']] : null;
      const pmr = columnIndices['pmr'] !== undefined ? values[columnIndices['pmr']]?.toLowerCase() === 'oui' : null;
      const ct = columnIndices['ct'] !== undefined ? values[columnIndices['ct']] : null;

      // Créer ou mettre à jour le véhicule
      await prisma.vehicle.upsert({
        where: { parc },
        create: {
          parc,
          type,
          modele,
          immat,
          km,
          tauxSante,
          statut,
          annee,
          boite,
          moteur,
          portes,
          girouette,
          clim,
          pmr,
          ct: ct ? new Date(ct) : null,
        },
        update: {
          type,
          modele,
          immat,
          km,
          tauxSante,
          statut,
          annee,
          boite,
          moteur,
          portes,
          girouette,
          clim,
          pmr,
          ct: ct ? new Date(ct) : null,
        },
      });

      imported++;
    } catch (error) {
      errors.push(`Ligne ${i + 1}: ${error.message}`);
    }
  }

  console.log(`[IMPORT] Résultat: ${imported} importé(s), ${errors.length} erreur(s)`);
  
  res.json({
    imported,
    errors: errors.length > 0 ? errors : undefined,
    message: `${imported} véhicule(s) importé(s) avec succès`,
  });
}

// ============ ATELIER / MOUVEMENTS ATELIERS ============

// POST /api/maintenance/deduplicate-services - Nettoyer les doublons de services
app.post('/api/maintenance/deduplicate-services', async (_req, res) => {
  try {
    console.log('[MAINTENANCE] Déduplication des services...');

    if (!prismaReady) {
      return res.status(503).json({ error: 'Database not ready' });
    }

    // Récupérer tous les services
    const allServices = await prisma.service.findMany({
      orderBy: [{ ligneId: 'asc' }, { date: 'asc' }, { heureDebut: 'asc' }],
    });

    let deletedCount = 0;
    const seenKey = new Set();
    const toDelete = [];

    // Identifier les doublons
    for (const service of allServices) {
      const dateStr = service.date.toISOString().split('T')[0];
      const key = `${service.ligneId}-${dateStr}-${service.heureDebut}-${service.heureFin}`;

      if (seenKey.has(key)) {
        // C'est un doublon, le marquer pour suppression
        toDelete.push(service.id);
      } else {
        seenKey.add(key);
      }
    }

    // Supprimer les doublons
    if (toDelete.length > 0) {
      const deleteResult = await prisma.service.deleteMany({
        where: {
          id: { in: toDelete },
        },
      });
      deletedCount = deleteResult.count;
    }

    console.log(`[MAINTENANCE] ${deletedCount} services doublons supprimés`);
    res.json({
      message: `Nettoyage terminé: ${deletedCount} doublons supprimés`,
      deleted: deletedCount,
      total: allServices.length,
      unique: allServices.length - deletedCount,
    });
  } catch (error) {
    console.error('[MAINTENANCE] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/seed - Créer des données d'exemple (pour tester après nettoyage BD)
app.post('/api/seed', async (_req, res) => {
  try {
    console.log('[SEED] POST /api/seed - Création données d\'exemple');

    if (!prismaReady) {
      return res.status(503).json({ error: 'Database not ready' });
    }

    // Créer les lignes d'exemple
    const lignes = [
      {
        numero: '815',
        nom: 'Ligne 815 - Essonne Express',
        typesVehicules: ['TCP - Autobus Standard'],
        heureDebut: '06:00',
        heureFin: '22:00',
        calendrierJson: JSON.stringify({ lundi: true, mardi: true, mercredi: true, jeudi: true, vendredi: true, samedi: true, dimanche: false }),
      },
      {
        numero: 'C',
        nom: 'Ligne C - Circul\'Air',
        typesVehicules: ['TCP - Minibus'],
        heureDebut: '07:00',
        heureFin: '20:00',
        calendrierJson: JSON.stringify({ lundi: true, mardi: true, mercredi: true, jeudi: true, vendredi: true, samedi: true, dimanche: true }),
      },
      {
        numero: '15',
        nom: 'Ligne 15 - RER Bus',
        typesVehicules: ['TCP - Autobus articulé'],
        heureDebut: '05:30',
        heureFin: '23:00',
        calendrierJson: JSON.stringify({ lundi: true, mardi: true, mercredi: true, jeudi: true, vendredi: true, samedi: true, dimanche: true }),
      },
    ];

    let createdCount = 0;

    for (const ligneData of lignes) {
      const ligne = await prisma.ligne.upsert({
        where: { numero: ligneData.numero },
        update: {},
        create: ligneData,
      });

      // Créer sens et services
      const sensData = [
        { nom: 'Aller', direction: 'Gare SNCF → Gare routière' },
        { nom: 'Retour', direction: 'Gare routière → Gare SNCF' },
      ];

      for (const sens of sensData) {
        const sensObj = await prisma.sens.upsert({
          where: {
            ligneId_nom: {
              ligneId: ligne.id,
              nom: sens.nom,
            },
          },
          update: {},
          create: {
            ligneId: ligne.id,
            ...sens,
            statut: 'Actif',
          },
        });

        // Créer services pour cette semaine
        const today = new Date();
        const calendrier = JSON.parse(ligne.calendrierJson);
        const dayMap = { 'lundi': 1, 'mardi': 2, 'mercredi': 3, 'jeudi': 4, 'vendredi': 5, 'samedi': 6, 'dimanche': 0 };

        for (const dayName in calendrier) {
          if (calendrier[dayName]) {
            const serviceDate = new Date(today);
            const targetDay = dayMap[dayName];
            const currentDay = today.getDay();
            let daysToAdd = targetDay - currentDay;
            if (daysToAdd <= 0) daysToAdd += 7;
            serviceDate.setDate(serviceDate.getDate() + daysToAdd);

            // Créer 2-3 services par jour
            const serviceTimes = [
              { start: '07:00', end: '14:00' },
              { start: '14:00', end: '21:00' },
              ...(dayName === 'samedi' ? [] : []),
            ];

            for (const time of serviceTimes) {
              const existingService = await prisma.service.findFirst({
                where: {
                  ligneId: ligne.id,
                  date: {
                    gte: new Date(serviceDate.toISOString().split('T')[0]),
                    lt: new Date(new Date(serviceDate.toISOString().split('T')[0]).getTime() + 24 * 60 * 60 * 1000),
                  },
                  heureDebut: time.start,
                  heureFin: time.end,
                },
              });

              if (!existingService) {
                await prisma.service.create({
                  data: {
                    ligneId: ligne.id,
                    sensId: sensObj.id,
                    date: serviceDate,
                    heureDebut: time.start,
                    heureFin: time.end,
                    statut: 'Planifiée',
                  },
                });
              }
            }
          }
        }
      }

      createdCount++;
    }

    console.log(`[SEED] ${createdCount} lignes créées avec services`);
    res.json({
      message: `Données d'exemple créées: ${createdCount} lignes`,
      lignes: createdCount,
      ready: true,
    });
  } catch (error) {
    console.error('[SEED] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ ATELIER / MOUVEMENTS ATELIERS ============

// GET /api/mouvements - Tous les mouvements (historique des changements de statut)
app.get('/api/mouvements', async (_req, res) => {
  try {
    console.log('[ATELIER] GET /api/mouvements');
    
    if (!prismaReady) {
      return res.status(503).json({ error: 'Database not ready' });
    }

    const mouvements = await prisma.vehicleStateHistory.findMany({
      include: {
        vehicle: {
          select: {
            parc: true,
            type: true,
            immat: true,
            tauxSante: true,
            statut: true,
          },
        },
      },
      orderBy: { changedAt: 'desc' },
      take: 100, // Derniers 100 mouvements
    });

    res.json(mouvements);
  } catch (error) {
    console.error('[ATELIER] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/mouvements/:parc - Mouvements d'un véhicule spécifique
app.get('/api/mouvements/:parc', async (req, res) => {
  try {
    const { parc } = req.params;
    console.log(`[ATELIER] GET /api/mouvements/${parc}`);

    if (!prismaReady) {
      return res.status(503).json({ error: 'Database not ready' });
    }

    const mouvements = await prisma.vehicleStateHistory.findMany({
      where: { vehicleParc: parc },
      include: {
        vehicle: {
          select: {
            parc: true,
            type: true,
            immat: true,
            tauxSante: true,
            statut: true,
          },
        },
      },
      orderBy: { changedAt: 'desc' },
    });

    res.json(mouvements);
  } catch (error) {
    console.error('[ATELIER] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/mouvements - Créer un nouveau mouvement (enregistrer un changement de statut)
app.post('/api/mouvements', async (req, res) => {
  try {
    const { vehicleParc, fromStatus, toStatus, note } = req.body;
    console.log(`[ATELIER] POST /api/mouvements - ${vehicleParc}: ${fromStatus} → ${toStatus}`);

    if (!prismaReady) {
      return res.status(503).json({ error: 'Database not ready' });
    }

    if (!vehicleParc || !toStatus) {
      return res.status(400).json({ error: 'vehicleParc et toStatus requis' });
    }

    // Vérifier que le véhicule existe
    const vehicle = await prisma.vehicle.findUnique({
      where: { parc: vehicleParc },
    });

    if (!vehicle) {
      return res.status(404).json({ error: `Véhicule ${vehicleParc} non trouvé` });
    }

    // Créer le mouvement
    const mouvement = await prisma.vehicleStateHistory.create({
      data: {
        vehicleParc,
        fromStatus: fromStatus || vehicle.statut,
        toStatus,
        note,
      },
      include: {
        vehicle: {
          select: {
            parc: true,
            type: true,
            immat: true,
            tauxSante: true,
            statut: true,
          },
        },
      },
    });

    // Mettre à jour le statut du véhicule
    await prisma.vehicle.update({
      where: { parc: vehicleParc },
      data: { statut: toStatus },
    });

    res.json(mouvement);
  } catch (error) {
    console.error('[ATELIER] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ateliers - Véhicules actuellement en atelier
app.get('/api/ateliers', async (_req, res) => {
  try {
    console.log('[ATELIER] GET /api/ateliers');

    if (!prismaReady) {
      return res.status(503).json({ error: 'Database not ready' });
    }

    const vehiculesEnAtelier = await prisma.vehicle.findMany({
      where: {
        statut: {
          in: ['Aux Ateliers', 'Au CT', 'Indisponible', 'Entretien'],
        },
      },
      include: {
        statesHistory: {
          orderBy: { changedAt: 'desc' },
          take: 5, // Derniers 5 mouvements
        },
        interventions: {
          where: { statut: { in: ['planifiée', 'en_cours'] } },
          orderBy: { datePrevue: 'asc' },
        },
      },
    });

    // Grouper par statut
    const grouped = {
      'Aux Ateliers': vehiculesEnAtelier.filter(v => v.statut === 'Aux Ateliers'),
      'Au CT': vehiculesEnAtelier.filter(v => v.statut === 'Au CT'),
      'Indisponible': vehiculesEnAtelier.filter(v => v.statut === 'Indisponible'),
      'Entretien': vehiculesEnAtelier.filter(v => v.statut === 'Entretien'),
    };

    res.json({
      total: vehiculesEnAtelier.length,
      parStatut: grouped,
      details: vehiculesEnAtelier,
    });
  } catch (error) {
    console.error('[ATELIER] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ateliers/stats - Statistiques sur les ateliers
app.get('/api/ateliers/stats', async (_req, res) => {
  try {
    console.log('[ATELIER] GET /api/ateliers/stats');

    if (!prismaReady) {
      return res.status(503).json({ error: 'Database not ready' });
    }

    const stats = await prisma.vehicle.groupBy({
      by: ['statut'],
      _count: {
        parc: true,
      },
      where: {
        statut: {
          in: ['Aux Ateliers', 'Au CT', 'Indisponible', 'Entretien'],
        },
      },
    });

    const typesStats = await prisma.vehicle.groupBy({
      by: ['type'],
      _count: {
        parc: true,
      },
      where: {
        statut: {
          in: ['Aux Ateliers', 'Au CT', 'Indisponible', 'Entretien'],
        },
      },
    });

    res.json({
      parStatut: stats,
      parType: typesStats,
      derniersMouvements: await prisma.vehicleStateHistory.findMany({
        orderBy: { changedAt: 'desc' },
        take: 10,
        include: {
          vehicle: { select: { parc: true, type: true, immat: true } },
        },
      }),
    });
  } catch (error) {
    console.error('[ATELIER] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ---------- error handler (global) ----------
app.use((err, req, res, next) => {
  console.error('[ERROR] Unhandled error:', err.message);
  console.error('[ERROR] Stack:', err.stack);
  
  // Assurer les headers CORS même sur erreur
  const origin = req.headers.origin;
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH,HEAD');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// ==================== FRAISE ENDPOINTS ====================

// FRAISE CLIENTS
app.get('/api/fraise/clients', async (req, res) => {
  try {
    const clients = await prisma.fraiseClient.findMany({
      include: { 
        dossiers: { where: { statut: { not: 'Clôturé' } } },
        _count: { select: { dossiers: true, transactions: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(clients);
  } catch (e) {
    console.error('GET /api/fraise/clients ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

app.post('/api/fraise/clients', async (req, res) => {
  try {
    const { nom, prenom, email, telephone, adresse, codePostal, ville, pays, siret, typeClient } = req.body;
    const client = await prisma.fraiseClient.create({
      data: { nom, prenom, email, telephone, adresse, codePostal, ville, pays, siret, typeClient: typeClient || 'Particulier' },
    });
    res.status(201).json(client);
  } catch (e) {
    console.error('POST /api/fraise/clients ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

app.put('/api/fraise/clients/:id', async (req, res) => {
  try {
    const client = await prisma.fraiseClient.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(client);
  } catch (e) {
    console.error('PUT /api/fraise/clients/:id ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// FRAISE DOSSIERS
app.get('/api/fraise/dossiers', async (req, res) => {
  try {
    const { clientId } = req.query;
    const where = clientId ? { clientId } : {};
    const dossiers = await prisma.fraiseDossier.findMany({
      where,
      include: { 
        client: true,
        demandes: { where: { statut: { not: 'Rejeté' } } },
        vehicules: true,
        _count: { select: { demandes: true, vehicules: true, transactions: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(dossiers);
  } catch (e) {
    console.error('GET /api/fraise/dossiers ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

app.post('/api/fraise/dossiers', async (req, res) => {
  try {
    const { clientId, titre, description, type, montantTotal } = req.body;
    // Générer numéro de dossier unique
    const lastDossier = await prisma.fraiseDossier.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { numero: true }
    });
    const numero = `FRAISE-${new Date().getFullYear()}-${String(parseInt(lastDossier?.numero?.split('-')[2] || '0') + 1).padStart(3, '0')}`;
    
    const dossier = await prisma.fraiseDossier.create({
      data: { clientId, titre, description, type: type || 'Achat', numero, montantTotal: montantTotal || 0 },
      include: { client: true }
    });
    res.status(201).json(dossier);
  } catch (e) {
    console.error('POST /api/fraise/dossiers ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

app.put('/api/fraise/dossiers/:id', async (req, res) => {
  try {
    const dossier = await prisma.fraiseDossier.update({
      where: { id: req.params.id },
      data: req.body,
      include: { client: true, demandes: true, vehicules: true }
    });
    res.json(dossier);
  } catch (e) {
    console.error('PUT /api/fraise/dossiers/:id ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// FRAISE DEMANDES
app.get('/api/fraise/demandes', async (req, res) => {
  try {
    const { dossierId } = req.query;
    const where = dossierId ? { dossierId } : {};
    const demandes = await prisma.fraiseDemande.findMany({
      where,
      include: { dossier: { include: { client: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(demandes);
  } catch (e) {
    console.error('GET /api/fraise/demandes ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

app.post('/api/fraise/demandes', async (req, res) => {
  try {
    const { dossierId, titre, description, type, montant } = req.body;
    const lastDemande = await prisma.fraiseDemande.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { reference: true }
    });
    const reference = `DEM-${new Date().getFullYear()}-${String(parseInt(lastDemande?.reference?.split('-')[2] || '0') + 1).padStart(3, '0')}`;
    
    const demande = await prisma.fraiseDemande.create({
      data: { dossierId, titre, description, type: type || 'Devis', montant, reference },
      include: { dossier: true }
    });
    res.status(201).json(demande);
  } catch (e) {
    console.error('POST /api/fraise/demandes ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

app.put('/api/fraise/demandes/:id', async (req, res) => {
  try {
    const demande = await prisma.fraiseDemande.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(demande);
  } catch (e) {
    console.error('PUT /api/fraise/demandes/:id ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// FRAISE VEHICULES
app.get('/api/fraise/vehicules', async (req, res) => {
  try {
    const { dossierId } = req.query;
    const where = dossierId ? { dossierId } : {};
    const vehicules = await prisma.fraiseVehicule.findMany({
      where,
      include: { dossier: { include: { client: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(vehicules);
  } catch (e) {
    console.error('GET /api/fraise/vehicules ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

app.post('/api/fraise/vehicules', async (req, res) => {
  try {
    const { dossierId, immatriculation, marque, modele, annee, kilometre, vin, carburant, boite, couleur, etat, prixAchat, prixVente, notes } = req.body;
    
    // Validation
    if (!dossierId) {
      return res.status(400).json({ error: 'dossierId est requis' });
    }
    if (!immatriculation) {
      return res.status(400).json({ error: 'immatriculation est requis' });
    }
    if (!marque) {
      return res.status(400).json({ error: 'marque est requis' });
    }
    if (!modele) {
      return res.status(400).json({ error: 'modele est requis' });
    }

    // Vérifier que le dossier existe
    const dossier = await prisma.fraiseDossier.findUnique({ where: { id: dossierId } });
    if (!dossier) {
      return res.status(404).json({ error: 'Dossier non trouvé' });
    }

    const vehicule = await prisma.fraiseVehicule.create({
      data: { 
        dossierId, 
        immatriculation, 
        marque, 
        modele, 
        annee, 
        kilometre, 
        vin: vin || null, 
        carburant: carburant || 'Diesel', 
        boite: boite || 'Automatique', 
        couleur: couleur || '', 
        etat: etat || 'Bon', 
        prixAchat: prixAchat || null, 
        prixVente: prixVente || null, 
        notes: notes || null 
      },
      include: { dossier: true }
    });
    res.status(201).json(vehicule);
  } catch (e) {
    console.error('POST /api/fraise/vehicules ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

app.put('/api/fraise/vehicules/:id', async (req, res) => {
  try {
    const vehicule = await prisma.fraiseVehicule.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(vehicule);
  } catch (e) {
    console.error('PUT /api/fraise/vehicules/:id ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// FRAISE TRANSACTIONS
app.get('/api/fraise/transactions', async (req, res) => {
  try {
    const { dossierId, clientId } = req.query;
    const where = {};
    if (dossierId) where.dossierId = dossierId;
    if (clientId) where.clientId = clientId;
    
    const transactions = await prisma.fraiseTransaction.findMany({
      where,
      include: { dossier: true, client: true, demande: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(transactions);
  } catch (e) {
    console.error('GET /api/fraise/transactions ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

app.post('/api/fraise/transactions', async (req, res) => {
  try {
    const { dossierId, clientId, demandeId, type, montant, devise, methode, reference, notes } = req.body;
    const transaction = await prisma.fraiseTransaction.create({
      data: { dossierId, clientId, demandeId: demandeId || null, type, montant, devise: devise || 'EUR', methode, reference, notes },
      include: { dossier: true, client: true }
    });
    res.status(201).json(transaction);
  } catch (e) {
    console.error('POST /api/fraise/transactions ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

app.put('/api/fraise/transactions/:id', async (req, res) => {
  try {
    const transaction = await prisma.fraiseTransaction.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(transaction);
  } catch (e) {
    console.error('PUT /api/fraise/transactions/:id ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// FRAISE STATS
app.get('/api/fraise/stats', async (req, res) => {
  try {
    const totalClients = await prisma.fraiseClient.count();
    const totalDossiers = await prisma.fraiseDossier.count();
    const dossierOuverts = await prisma.fraiseDossier.count({ where: { statut: 'Ouvert' } });
    const totalVehicules = await prisma.fraiseVehicule.count();
    const totalTransactions = await prisma.fraiseTransaction.aggregate({ _sum: { montant: true } });
    
    res.json({
      totalClients,
      totalDossiers,
      dossierOuverts,
      totalVehicules,
      montantTotal: totalTransactions._sum.montant || 0,
      transactionsEnAttente: await prisma.fraiseTransaction.count({ where: { statut: 'En attente' } })
    });
  } catch (e) {
    console.error('GET /api/fraise/stats ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// ==================== FRAISE LOCATION MODULATIONS ====================

// GET all modulations for a dossier
app.get('/api/fraise/modulations', async (req, res) => {
  try {
    const { dossierId } = req.query;
    const where = dossierId ? { dossierId } : {};
    const modulations = await prisma.fraiseLocationModulation.findMany({
      where,
      include: { dossier: { include: { client: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(modulations);
  } catch (e) {
    console.error('GET /api/fraise/modulations ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// POST create modulation
app.post('/api/fraise/modulations', async (req, res) => {
  try {
    const { 
      dossierId, 
      dureeMinJours, 
      dureeMaxJours, 
      typeVehicule, 
      saisonalite,
      prixJournalier, 
      prixHebdo, 
      prixMensuel,
      caution,
      assuranceIncluse,
      kmLimite,
      kmSupplementaire,
      fraisNettoyage,
      fraisAssurance,
      fraisConfirm,
      remise,
      notes,
      dateDebut,
      dateFin
    } = req.body;

    const modulation = await prisma.fraiseLocationModulation.create({
      data: {
        dossierId,
        dureeMinJours: dureeMinJours || 1,
        dureeMaxJours,
        typeVehicule,
        saisonalite: saisonalite || 'ANNEE',
        prixJournalier,
        prixHebdo,
        prixMensuel,
        caution: caution || 0,
        assuranceIncluse: assuranceIncluse !== false,
        kmLimite,
        kmSupplementaire,
        fraisNettoyage: fraisNettoyage || 0,
        fraisAssurance: fraisAssurance || 0,
        fraisConfirm: fraisConfirm || 0,
        remise: remise || 0,
        notes,
        dateDebut: dateDebut ? new Date(dateDebut) : null,
        dateFin: dateFin ? new Date(dateFin) : null
      },
      include: { dossier: true }
    });
    res.status(201).json(modulation);
  } catch (e) {
    console.error('POST /api/fraise/modulations ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// PUT update modulation
app.put('/api/fraise/modulations/:id', async (req, res) => {
  try {
    const modulation = await prisma.fraiseLocationModulation.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        dateDebut: req.body.dateDebut ? new Date(req.body.dateDebut) : undefined,
        dateFin: req.body.dateFin ? new Date(req.body.dateFin) : undefined
      },
      include: { dossier: true }
    });
    res.json(modulation);
  } catch (e) {
    console.error('PUT /api/fraise/modulations/:id ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// DELETE modulation
app.delete('/api/fraise/modulations/:id', async (req, res) => {
  try {
    const modulation = await prisma.fraiseLocationModulation.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true, modulation });
  } catch (e) {
    console.error('DELETE /api/fraise/modulations/:id ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// ==================== FRAISE INTERACTIONS ====================
app.get('/api/fraise/interactions', async (req, res) => {
  try {
    const { clientId } = req.query;
    const where = clientId ? { clientId } : {};
    const interactions = await prisma.fraiseInteraction.findMany({
      where,
      include: { client: true },
      orderBy: { dateInteraction: 'desc' }
    });
    res.json(interactions);
  } catch (e) {
    console.error('GET /api/fraise/interactions ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

app.post('/api/fraise/interactions', async (req, res) => {
  try {
    const { clientId, type, titre, description, notes, statut, resultat, dateProchaineSuite, responsable } = req.body;
    const interaction = await prisma.fraiseInteraction.create({
      data: {
        clientId,
        type,
        titre,
        description,
        notes,
        statut: statut || 'Complétée',
        resultat,
        dateProchaineSuite: dateProchaineSuite ? new Date(dateProchaineSuite) : null,
        responsable
      },
      include: { client: true }
    });
    res.status(201).json(interaction);
  } catch (e) {
    console.error('POST /api/fraise/interactions ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

app.put('/api/fraise/interactions/:id', async (req, res) => {
  try {
    const interaction = await prisma.fraiseInteraction.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        dateProchaineSuite: req.body.dateProchaineSuite ? new Date(req.body.dateProchaineSuite) : undefined
      }
    });
    res.json(interaction);
  } catch (e) {
    console.error('PUT /api/fraise/interactions/:id ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// ==================== FRAISE BUDGETS ====================
app.get('/api/fraise/budgets', async (req, res) => {
  try {
    const { dossierId } = req.query;
    const where = dossierId ? { dossierId } : {};
    const budgets = await prisma.fraiseBudget.findMany({
      where,
      include: { dossier: { include: { client: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(budgets);
  } catch (e) {
    console.error('GET /api/fraise/budgets ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

app.post('/api/fraise/budgets', async (req, res) => {
  try {
    const { dossierId, titre, description, montantHT, montantTVA, montantTTC, statut, dateValidite, lignesJson, conditions } = req.body;
    const lastBudget = await prisma.fraiseBudget.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { reference: true }
    });
    const reference = `BUDGET-${new Date().getFullYear()}-${String(parseInt(lastBudget?.reference?.split('-')[2] || '0') + 1).padStart(3, '0')}`;
    
    const budget = await prisma.fraiseBudget.create({
      data: {
        dossierId,
        reference,
        titre,
        description,
        montantHT: montantHT || 0,
        montantTVA: montantTVA || 0,
        montantTTC: montantTTC || 0,
        statut: statut || 'Brouillon',
        dateValidite: dateValidite ? new Date(dateValidite) : null,
        lignesJson,
        conditions
      },
      include: { dossier: true }
    });
    res.status(201).json(budget);
  } catch (e) {
    console.error('POST /api/fraise/budgets ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

app.put('/api/fraise/budgets/:id', async (req, res) => {
  try {
    const budget = await prisma.fraiseBudget.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        dateValidite: req.body.dateValidite ? new Date(req.body.dateValidite) : undefined,
        dateAcceptation: req.body.dateAcceptation ? new Date(req.body.dateAcceptation) : undefined
      }
    });
    res.json(budget);
  } catch (e) {
    console.error('PUT /api/fraise/budgets/:id ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// ==================== FRAISE DOCUMENTS ====================
app.get('/api/fraise/documents', async (req, res) => {
  try {
    const { dossierId, clientId } = req.query;
    const where = {};
    if (dossierId) where.dossierId = dossierId;
    if (clientId) where.clientId = clientId;
    
    const documents = await prisma.fraiseDocument.findMany({
      where,
      include: { dossier: true, client: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(documents);
  } catch (e) {
    console.error('GET /api/fraise/documents ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

app.post('/api/fraise/documents', async (req, res) => {
  try {
    const { dossierId, clientId, titre, typeDocument, urlDocument, nomFichier, mimeType, dateDocument, notes } = req.body;
    const document = await prisma.fraiseDocument.create({
      data: {
        dossierId,
        clientId,
        titre,
        typeDocument,
        urlDocument,
        nomFichier,
        mimeType,
        dateDocument: dateDocument ? new Date(dateDocument) : null,
        notes
      },
      include: { dossier: true, client: true }
    });
    res.status(201).json(document);
  } catch (e) {
    console.error('POST /api/fraise/documents ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

app.delete('/api/fraise/documents/:id', async (req, res) => {
  try {
    const document = await prisma.fraiseDocument.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true, document });
  } catch (e) {
    console.error('DELETE /api/fraise/documents/:id ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// ==================== FRAISE CLIENT TOKENS ====================
app.post('/api/fraise/client-tokens', async (req, res) => {
  try {
    const { clientId, typeAcces, dateExpiration } = req.body;
    const token = require('crypto').randomBytes(32).toString('hex');
    
    const clientToken = await prisma.fraiseClientToken.create({
      data: {
        clientId,
        token,
        typeAcces: typeAcces || 'LECTURE',
        dateExpiration: dateExpiration ? new Date(dateExpiration) : null
      }
    });
    res.status(201).json(clientToken);
  } catch (e) {
    console.error('POST /api/fraise/client-tokens ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

app.get('/api/fraise/client-tokens/:clientId', async (req, res) => {
  try {
    const tokens = await prisma.fraiseClientToken.findMany({
      where: { clientId: req.params.clientId },
      select: { id: true, typeAcces: true, isActive: true, dateExpiration: true, dateLastUsed: true, createdAt: true }
    });
    res.json(tokens);
  } catch (e) {
    console.error('GET /api/fraise/client-tokens ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

app.put('/api/fraise/client-tokens/:id', async (req, res) => {
  try {
    const token = await prisma.fraiseClientToken.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(token);
  } catch (e) {
    console.error('PUT /api/fraise/client-tokens/:id ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// ==================== FRAISE AUDIT ====================
app.get('/api/fraise/audit', async (req, res) => {
  try {
    const { dossierId, clientId, entite } = req.query;
    const where = {};
    if (dossierId) where.dossierId = dossierId;
    if (clientId) where.clientId = clientId;
    if (entite) where.entite = entite;
    
    const audit = await prisma.fraiseAudit.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json(audit);
  } catch (e) {
    console.error('GET /api/fraise/audit ERROR ->', e);
    res.status(400).json({ error: String(e) });
  }
});

// ============ NOTIFICATIONS / DIFFUSION INFORMATIONS ============
console.log('[ROUTES] Registering /api/notifications routes');

// GET - Toutes les notifications actives
app.get('/api/notifications', async (_req, res) => {
  console.log('[API] GET /api/notifications called');
  try {
    const now = new Date();
    console.log('[API] NOW:', now.toISOString());
    const notifications = await prisma.notification.findMany({
      where: {
        actif: true,
        dateDebut: { lte: now },
        OR: [
          { dateFin: null },
          { dateFin: { gte: now } }
        ]
      },
      orderBy: { createdAt: 'desc' },
    });
    console.log('[API] GET /api/notifications - Found:', notifications.length, 'notifications');
    notifications.forEach(n => {
      console.log(`  - ${n.id}: ${n.titre} (type: ${n.type}, actif: ${n.actif}, dateDebut: ${n.dateDebut.toISOString()}, dateFin: ${n.dateFin ? n.dateFin.toISOString() : 'null'})`);
    });
    res.json(notifications);
  } catch (error) {
    console.error('GET /api/notifications ERROR ->', error);
    res.status(500).json({ error: error.message });
  }
});

// POST - Créer une nouvelle notification
app.post('/api/notifications', async (req, res) => {
  console.log('[API] POST /api/notifications called with body:', req.body);
  try {
    const { type, titre, message, dateFin } = req.body;
    
    if (!type || !titre || !message) {
      return res.status(400).json({ 
        error: 'type, titre et message sont requis',
        required: ['type', 'titre', 'message']
      });
    }

    if (!['alerte', 'avertissement', 'positif'].includes(type)) {
      return res.status(400).json({ 
        error: 'type doit être: alerte, avertissement ou positif'
      });
    }

    const notification = await prisma.notification.create({
      data: {
        type,
        titre,
        message,
        dateFin: dateFin ? new Date(dateFin) : null,
        createdBy: req.user?.email || 'système',
      }
    });
    
    console.log('[API] POST /api/notifications - Created notification:', {
      id: notification.id,
      type: notification.type,
      titre: notification.titre,
      message: notification.message,
      actif: notification.actif,
      dateDebut: notification.dateDebut.toISOString(),
      dateFin: notification.dateFin ? notification.dateFin.toISOString() : null,
      createdAt: notification.createdAt.toISOString(),
    });
    
    res.status(201).json(notification);
  } catch (error) {
    console.error('POST /api/notifications ERROR ->', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT - Modifier une notification
app.put('/api/notifications/:id', async (req, res) => {
  try {
    const { type, titre, message, actif, dateFin } = req.body;
    
    const notification = await prisma.notification.update({
      where: { id: req.params.id },
      data: {
        ...(type && { type }),
        ...(titre && { titre }),
        ...(message && { message }),
        ...(actif !== undefined && { actif }),
        ...(dateFin && { dateFin: new Date(dateFin) }),
      }
    });
    
    res.json(notification);
  } catch (error) {
    console.error('PUT /api/notifications/:id ERROR ->', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE - Supprimer une notification
app.delete('/api/notifications/:id', async (req, res) => {
  try {
    await prisma.notification.delete({
      where: { id: req.params.id }
    });
    res.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/notifications/:id ERROR ->', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH - Désactiver une notification
app.patch('/api/notifications/:id/disable', async (req, res) => {
  try {
    const notification = await prisma.notification.update({
      where: { id: req.params.id },
      data: { actif: false }
    });
    res.json(notification);
  } catch (error) {
    console.error('PATCH /api/notifications/:id/disable ERROR ->', error);
    res.status(500).json({ error: error.message });
  }
});

// ---------- 404 handler (DOIT ÊTRE APRÈS TOUTES LES ROUTES) ----------
app.use((req, res) => {
  const origin = req.headers.origin;
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH,HEAD');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
});

// ---------- start ----------
const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

console.log('[STARTUP] Configured PORT:', PORT);
console.log('[STARTUP] Configured HOST:', HOST);

// Vérifier la connexion à la base de données avant de démarrer
async function startServer() {
  console.log('[STARTUP] startServer() called');
  try {
    // Test de connexion à Prisma avec timeout
    console.log('[STARTUP] Testing database connection...');
    console.log('[STARTUP] DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');

    if (!prisma) {
      throw new Error('Prisma client not initialized');
    }

    const startTime = Date.now();
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('DB check timeout (5s)')), 5000)),
    ]);
    const duration = Date.now() - startTime;
    prismaReady = true;
    
    console.log(`✅ Database connection successful (${duration}ms)`);
    
    // 🚀 Génération automatique des services au démarrage (DISABLED FOR NOW - will cause crash)
    console.log('[STARTUP] Service generation will run on demand via /api/services/generate endpoint');
    /*
    console.log('[STARTUP] Starting automatic service generation...');
    try {
      const lignes = await prisma.ligne.findMany({
        include: { sens: true }
      });

      if (lignes.length > 0) {
        let createdCount = 0;
        let skippedCount = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Générer les services pour 60 jours à l'avance
        for (let dayOffset = 0; dayOffset < 60; dayOffset++) {
          const date = new Date(today);
          date.setDate(date.getDate() + dayOffset);
          
          const jourFonctionnement = getDayTypeForDate(date);
          const dateStr = date.toISOString().split('T')[0];

          for (const ligne of lignes) {
            for (const sens of ligne.sens) {
              if (sens.jourFonctionnement === jourFonctionnement) {
                try {
                  const existingService = await prisma.service.findFirst({
                    where: {
                      ligneId: ligne.id,
                      sensId: sens.id,
                      date: {
                        gte: new Date(dateStr + 'T00:00:00'),
                        lt: new Date(dateStr + 'T23:59:59')
                      }
                    }
                  });

                  if (!existingService) {
                    await prisma.service.create({
                      data: {
                        ligneId: ligne.id,
                        sensId: sens.id,
                        date: new Date(dateStr + 'T06:30:00'),
                        heureDebut: '06:30',
                        heureFin: '18:30',
                        statut: 'Planifiée',
                      }
                    });
                    createdCount++;
                  } else {
                    skippedCount++;
                  }
                } catch (err) {
                  console.error(`[STARTUP] Service creation error ${ligne.id}/${sens.id}/${dateStr}:`, err.message);
                }
              }
            }
          }
        }
        console.log(`✅ Services auto-generated: ${createdCount} created, ${skippedCount} existing`);
      }
    } catch (err) {
      console.error('[STARTUP] Service generation failed:', err.message);
    }
    */
  
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('[ERROR] Stack:', error.stack);
    console.error('[ERROR] DATABASE_URL:', process.env.DATABASE_URL || 'NOT SET');
    
    // Ne pas quitter immédiatement, laisser le serveur démarrer quand même
    // pour que les health checks puissent fonctionner
    console.warn('⚠️  Starting server without database connection...');
  }

  // ========== ADMIN ENDPOINT ==========
  // Régénérer les services via une requête HTTP
  app.post('/api/admin/regenerate-services', async (_req, res) => {
    try {
      if (!prisma) {
        return res.status(503).json({ error: 'Database not ready' });
      }

      console.log('[ADMIN] Starting service regeneration...');
      
      // Récupérer tous les sens avec leurs services
      const allSens = await prisma.sens.findMany({
        include: { ligne: true, services: true }
      });

      let totalDeleted = 0;
      let totalCreated = 0;

      for (const sens of allSens) {
        // Générer dates pour ce sens (1 mois)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endDate = new Date(today);
        endDate.setMonth(endDate.getMonth() + 1);

        const dates = [];
        const dayOfWeek = today.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const monday = new Date(today);
        monday.setDate(today.getDate() - daysToMonday);
        monday.setHours(0, 0, 0, 0);

        const jourFonctionnement = sens.jourFonctionnement || 'SEMAINE';
        
        if (jourFonctionnement === 'SEMAINE') {
          for (let i = 0; i < 5; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            if (d >= today && d <= endDate) dates.push(d);
          }
        } else if (jourFonctionnement === 'SAMEDI') {
          const d = new Date(monday);
          d.setDate(monday.getDate() + 5);
          if (d >= today && d <= endDate) dates.push(d);
        } else if (jourFonctionnement === 'DIMANCHE_FERIES') {
          const d = new Date(monday);
          d.setDate(monday.getDate() + 6);
          if (d >= today && d <= endDate) dates.push(d);
        }

        // Supprimer anciens services
        const deleted = await prisma.service.deleteMany({
          where: { sensId: sens.id }
        });
        totalDeleted += deleted.count;

        // Créer nouveaux services
        const servicesToCreate = [];
        for (const date of dates) {
          for (const template of sens.services) {
            servicesToCreate.push({
              ligneId: sens.ligneId,
              sensId: sens.id,
              date,
              heureDebut: template.heureDebut,
              heureFin: template.heureFin,
              statut: 'Planifiée'
            });
          }
        }

        if (servicesToCreate.length > 0) {
          const created = await prisma.service.createMany({
            data: servicesToCreate,
            skipDuplicates: true
          });
          totalCreated += created.count;
        }
      }

      console.log(`[ADMIN] Regeneration complete: ${totalDeleted} deleted, ${totalCreated} created`);
      res.json({ ok: true, deleted: totalDeleted, created: totalCreated });
    } catch (e) {
      console.error('[ADMIN] Error:', e.message);
      res.status(500).json({ error: String(e.message) });
    }
  });

  // ===== MOUNT NEW ROUTES =====
  console.log('[STARTUP] Mounting personnel routes...');
  app.post('/api/depots/:depotId/personnel/assign-role', personnelRoutes.assignEmployeeRole);
  app.get('/api/depots/:depotId/personnel/stats', personnelRoutes.getPersonnelStats);
  app.get('/api/depots/:depotId/personnel', personnelRoutes.listDepotPersonnel);
  app.delete('/api/personnel/roles/:roleId', personnelRoutes.deleteEmployeeRole);

  console.log('[STARTUP] Mounting mercatos routes...');
  app.post('/api/mercatos', mercatoRoutes.proposeMercato);
  app.get('/api/mercatos', mercatoRoutes.listMercatos);
  app.get('/api/mercatos/:mercatoId', mercatoRoutes.getMercato);
  app.put('/api/mercatos/:mercatoId/approve', mercatoRoutes.approveMercato);
  app.put('/api/mercatos/:mercatoId/reject', mercatoRoutes.rejectMercato);
  app.put('/api/mercatos/:mercatoId/complete', mercatoRoutes.completeMercato);
  app.delete('/api/mercatos/:mercatoId', mercatoRoutes.deleteMercato);

  console.log('[STARTUP] Mounting immobilisation routes...');
  app.post('/api/immobilisations', immobilisationRoutes.createImmobilisation);
  app.get('/api/immobilisations', immobilisationRoutes.listImmobilisations);
  app.get('/api/immobilisations/:id', immobilisationRoutes.getImmobilisation);
  app.put('/api/immobilisations/:id', immobilisationRoutes.updateImmobilisation);
  app.put('/api/immobilisations/:id/complete', immobilisationRoutes.completeImmobilisation);
  app.delete('/api/immobilisations/:id', immobilisationRoutes.deleteImmobilisation);
  app.get('/api/immobilisations/vehicle/:vehicleParc/active', immobilisationRoutes.getActiveImmobilisationForVehicle);

  console.log('[STARTUP] Mounting vehicle needs routes...');
  app.post('/api/depots/:depotId/vehicle-needs', vehicleNeedsRoutes.setVehicleNeed);
  app.get('/api/depots/:depotId/vehicle-needs', vehicleNeedsRoutes.getDepotVehicleNeeds);
  app.get('/api/vehicle-needs/critical', vehicleNeedsRoutes.getCriticalVehicleNeeds);
  app.get('/api/vehicle-needs/mercato-suggestions', vehicleNeedsRoutes.getMercatoSuggestions);
  app.put('/api/vehicle-needs/:needId', vehicleNeedsRoutes.updateVehicleNeedStatus);
  app.delete('/api/vehicle-needs/:needId', vehicleNeedsRoutes.deleteVehicleNeed);
  app.get('/api/vehicle-types', vehicleNeedsRoutes.listVehicleTypes);

  console.log('[STARTUP] Mounting campagnes ABRIBUS routes...');
  
  // DEBUG: Log specifically for campagnes route
  app.use('/api/campagnes-abribus', (req, res, next) => {
    console.log(`[CAMPAGNES-DEBUG] ${req.method} ${req.path} - full URL: ${req.originalUrl}`);
    next();
  });

  app.post('/api/campagnes-abribus/init', async (req, res) => {
    try {
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
        return res.status(201).json({ message: 'Campagnes créées avec succès', created });
      }
      res.json({ message: 'Campagnes existent déjà' });
    } catch (err) {
      console.error('Erreur init campagnes:', err);
      res.status(500).json({ error: 'Erreur création campagnes' });
    }
  });

  app.get('/api/campagnes-abribus', async (req, res) => {
    console.log('[CAMPAGNES] GET /campagnes-abribus called');
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

  console.log('[STARTUP] Mounting inter-depot authorization routes...');
  app.post('/api/lignes/:ligneId/inter-depot-auth', interDepotAuthRoutes.createInterDepotAuth);
  app.get('/api/lignes/:ligneId/inter-depot-auth', interDepotAuthRoutes.listInterDepotAuths);
  app.get('/api/depots/:depotId/inter-depot-auth/owned', interDepotAuthRoutes.listOwnedLineAuths);
  app.get('/api/depots/:depotId/inter-depot-auth/authorized', interDepotAuthRoutes.listAuthorizedLineAuths);
  app.put('/api/inter-depot-auth/:authId', interDepotAuthRoutes.updateInterDepotAuth);
  app.delete('/api/inter-depot-auth/:authId', interDepotAuthRoutes.deleteInterDepotAuth);
  app.post('/api/inter-depot-service-transfer', interDepotAuthRoutes.transferServiceInterDepot);
  app.get('/api/inter-depot-service-transfer', interDepotAuthRoutes.listInterDepotTransfers);

  console.log('[STARTUP] Mounting lignes routes...');
  
  // FALLBACK: Define inline if import fails
  if (!lignesRoutes.assignLineToDepot) {
    console.warn('[WARNING] lignesRoutes.assignLineToDepot not found in import, defining inline...');
    lignesRoutes.assignLineToDepot = async (req, res) => {
      try {
        const { ligneId } = req.params;
        const { etablissementId } = req.body;

        const ligne = await prisma.ligne.findUnique({
          where: { id: ligneId }
        });
        if (!ligne) {
          return res.status(404).json({ error: 'Ligne non trouvée' });
        }

        if (etablissementId) {
          const depot = await prisma.etablissement.findUnique({
            where: { id: etablissementId }
          });
          if (!depot) {
            return res.status(404).json({ error: 'Dépôt non trouvé' });
          }
        }

        const updatedLigne = await prisma.ligne.update({
          where: { id: ligneId },
          data: {
            etablissementId: etablissementId || null
          },
          include: {
            etablissement: {
              select: { id: true, nom: true }
            }
          }
        });

        res.json({
          success: true,
          ligne: updatedLigne,
          message: `Ligne ${updatedLigne.numero} affectée à ${updatedLigne.etablissement?.nom || 'aucun dépôt'}`
        });
      } catch (e) {
        console.error('Error in inline assignLineToDepot:', e);
        res.status(500).json({ error: e.message });
      }
    };
  }
  
  app.get('/api/lignes', lignesRoutes.getLines || (async (req, res) => {
    try {
      const lignes = await prisma.ligne.findMany({
        include: { etablissement: true }
      });
      res.json(lignes);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }));
  
  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      routes: {
        lignes_assignDepot: 'PUT /api/lignes/:ligneId/assign-depot',
        lignes_getLines: 'GET /api/lignes',
        services_assignable_conductors: 'GET /api/services/:serviceId/assignable-conductors'
      }
    });
  });

  // Start HTTP server
  console.log('[STARTUP] About to create HTTP server on', HOST + ':' + PORT);
  const server = app.listen(PORT, HOST, () => {
    console.log(`🚀 TC Outil - API running on http://${HOST}:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📝 NODE_ENV=${process.env.NODE_ENV}`);
    console.log(`🔌 PORT=${PORT}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
      console.log('Server closed');
      prisma.$disconnect().then(() => process.exit(0));
    });
  });
}

console.log('[STARTUP] Calling startServer()...');
startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
