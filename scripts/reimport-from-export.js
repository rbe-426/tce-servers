import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDataPath = path.join(__dirname, '../../frontend/src/data');

const prisma = new PrismaClient();

async function reimportData() {
  try {
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

    // Nettoyer les données existantes
    console.log('🗑️  Nettoyage de la base...');
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
    console.log(`✅ ${vehicleCount} véhicules injectés`);

    // Réinjecter les lignes et sens
    console.log('🚌 Injection des lignes...');
    let ligneCount = 0;
    for (const ligne of lignes) {
      try {
        const { sens, ...ligneData } = ligne;
        const createdLigne = await prisma.ligne.create({ data: ligneData });
        
        if (sens && Array.isArray(sens)) {
          for (const s of sens) {
            await prisma.sens.create({
              data: {
                ...s,
                ligneId: createdLigne.id
              }
            });
          }
        }
        ligneCount++;
      } catch (err) {
        console.error('Erreur ligne:', err.message);
      }
    }
    console.log(`✅ ${ligneCount} lignes injectées`);

  } catch (err) {
    console.error('❌ Erreur:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

reimportData();
