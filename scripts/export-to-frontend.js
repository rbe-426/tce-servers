import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDataPath = path.join(__dirname, '../../frontend/src/data');

const prisma = new PrismaClient();

async function exportData() {
  try {
    const vehicles = await prisma.vehicle.findMany();
    const lignes = await prisma.ligne.findMany({ 
      include: { 
        sens: {
          include: {
            services: true
          }
        }
      }
    });

    // Créer le fichier vehiculesBase.js
    const vehiclesCode = `// Auto-généré - Données depuis la base de données
export const vehiculesBase = ${JSON.stringify(vehicles, null, 2)};
`;

    fs.writeFileSync(path.join(frontendDataPath, 'vehiculesBase.js'), vehiclesCode);
    console.log(`✅ ${vehicles.length} véhicules exportés`);

    // Créer le fichier lignesBase.js
    const lignesCode = `// Auto-généré - Données depuis la base de données
export const lignesBase = ${JSON.stringify(lignes, null, 2)};
`;

    fs.writeFileSync(path.join(frontendDataPath, 'lignesBase.js'), lignesCode);
    console.log(`✅ ${lignes.length} lignes exportées avec services`);

  } catch (err) {
    console.error('Erreur:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

exportData();
