import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function importVehicles() {
  try {
    const csvPath = 'C:\\Users\\belai\\Downloads\\etat_de_parc_tcessonnes.csv';
    let content = fs.readFileSync(csvPath, 'utf-8');
    
    // Réparer les sauts de ligne cassés
    content = content.replace(/(\r?\n)(?![\d])/g, ' ');
    
    const lines = content.trim().split('\n');
    
    // Supprimer tous les véhicules existants
    console.log('Suppression des véhicules existants...');
    await prisma.vehicle.deleteMany({});
    
    console.log(`Fichier: ${lines.length} lignes`);
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    console.log('En-têtes:', headers);
    
    let imported = 0;
    let errors = 0;

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length < 2 || !values[0]) continue;

        const vehicle = {
          parc: values[headers.indexOf('parc')] || '',
          immat: values[headers.indexOf('immat')] || '',
          marque: values[headers.indexOf('parc')] || '',
          modele: values[headers.indexOf('modele')] || '',
          type: values[headers.indexOf('type')] || 'Autobus',
          statut: 'Disponible',
          pmr: values[headers.indexOf('pmr')]?.toLowerCase() === 'oui',
          girouette: values[headers.indexOf('girouette')] || 'NON',
          clim: values[headers.indexOf('clim')] || 'NON',
          km: parseInt(values[headers.indexOf('km')]) || 0,
          tauxSante: parseInt(values[headers.indexOf('tauxsante')]) || 100,
          annee: parseInt(values[headers.indexOf('annee')]) || null,
          boite: values[headers.indexOf('boite')] || null,
          moteur: values[headers.indexOf('moteur')] || null,
          portes: parseInt(values[headers.indexOf('portes')]) || null
        };

        await prisma.vehicle.create({ data: vehicle });
        imported++;
      } catch (err) {
        errors++;
      }
    }

    console.log(`✅ ${imported} véhicules importés avec statut: DISPONIBLE`);
    if (errors > 0) console.log(`⚠️ ${errors} erreurs`);
  } catch (err) {
    console.error('Erreur:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

importVehicles();
