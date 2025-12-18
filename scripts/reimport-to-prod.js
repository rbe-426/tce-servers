import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDataPath = path.join(__dirname, '../../frontend/src/data');

// Forcer l'URL de production
const DATABASE_URL = 'postgresql://postgres:tGRELPCEaRlfotvCVETysTCzRPVihCHT@turntable.proxy.rlwy.net:24702/railway';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
});

async function reimportToProduction() {
  try {
    console.log('[PROD] Connexion à la base de production...');
    
    // Lire les fichiers exportés
    const vehiclesCode = fs.readFileSync(path.join(frontendDataPath, 'vehiculesBase.js'), 'utf-8');
    const lignesCode = fs.readFileSync(path.join(frontendDataPath, 'lignesBase.js'), 'utf-8');

    // Extraire les arrays avec regex
    const vehiclesMatch = vehiclesCode.match(/export const vehiculesBase = (\[[\s\S]*\]);/);
    const lignesMatch = lignesCode.match(/export const lignesBase = (\[[\s\S]*\]);/);

    if (!vehiclesMatch || !lignesMatch) {
      throw new Error('Impossible de parser les fichiers');
    }

    const vehicles = JSON.parse(vehiclesMatch[1]);
    const lignes = JSON.parse(lignesMatch[1]);

    console.log(`📦 Données chargées: ${vehicles.length} véhicules, ${lignes.length} lignes`);

    // Test de connexion
    const test = await prisma.vehicle.count();
    console.log(`✅ Connexion OK - Véhicules actuels: ${test}`);

    // Nettoyer les données existantes
    console.log('🗑️  Nettoyage de la base de production...');
    await prisma.service.deleteMany({});
    await prisma.sens.deleteMany({});
    await prisma.ligne.deleteMany({});
    await prisma.vehicle.deleteMany({});

    // Réinjecter les véhicules
    console.log('🚗 Injection des véhicules...');
    let vehicleCount = 0;
    for (const v of vehicles) {
      try {
        await prisma.vehicle.create({ data: v });
        vehicleCount++;
      } catch (err) {
        // Ignorer les doublons
      }
    }
    console.log(`✅ ${vehicleCount} véhicules injectés en production`);

    // Réinjecter les lignes, sens et services
    console.log('🚌 Injection des lignes, sens et services...');
    let ligneCount = 0;
    let sensCount = 0;
    let serviceCount = 0;
    
    for (const ligne of lignes) {
      try {
        const { sens, ...ligneData } = ligne;
        const createdLigne = await prisma.ligne.create({ data: ligneData });
        
        if (sens && Array.isArray(sens)) {
          for (const s of sens) {
            const { services, ...sensData } = s;
            const createdSens = await prisma.sens.create({
              data: {
                ...sensData,
                ligneId: createdLigne.id
              }
            });
            sensCount++;
            
            // Réinjecter les services liés à ce sens
            if (services && Array.isArray(services)) {
              for (const service of services) {
                try {
                  await prisma.service.create({
                    data: {
                      ...service,
                      sensId: createdSens.id,
                      ligneId: createdLigne.id
                    }
                  });
                  serviceCount++;
                } catch (err) {
                  // Ignorer les services qui échouent
                }
              }
            }
          }
        }
        ligneCount++;
      } catch (err) {
        console.error('Erreur ligne:', err.message);
      }
    }
    console.log(`✅ ${ligneCount} lignes, ${sensCount} sens, ${serviceCount} services injectés en production`);

    // Vérification finale
    const finalVehicles = await prisma.vehicle.count();
    const finalLignes = await prisma.ligne.count();
    const finalServices = await prisma.service.count();
    console.log(`\n🎉 PRODUCTION MISE À JOUR: ${finalVehicles} véhicules, ${finalLignes} lignes, ${finalServices} services`);

  } catch (err) {
    console.error('❌ Erreur:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

reimportToProduction();
