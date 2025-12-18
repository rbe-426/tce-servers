#!/usr/bin/env node

/**
 * Script ULTRA SIMPLE: générer JUSTE les services templates
 * UNE SEULE FOIS, pour les 8 lignes
 * Puis on génère les dates réellement correctes après
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Simplement les 230 templates, UNE seule fois
async function createTemplates() {
  console.log("🚀 Création des 230 templates\n");

  try {
    const dels = await prisma.service.deleteMany({});
    console.log(`🗑️  ${dels.count} services supprimés`);

    const lignes = await prisma.ligne.findMany({
      include: { sens: true }
    });

    let created = 0;

    for (const ligne of lignes) {
      for (const sens of ligne.sens) {
        // Créer UNE SEULE instance par sens pour représenter le template
        const toCreate = [];
        
        // Pour chaque type de jour (SEMAINE, SAMEDI, DIMANCHE_FERIES), créer UNE instance unique
        if (sens.nom.toLowerCase().includes('semaine')) {
          toCreate.push({
            date: new Date('2025-12-15'), // Lundi (SEMAINE)
            heureDebut: '08:00',
            heureFin: '16:00'
          });
        } else if (sens.nom.toLowerCase().includes('samedi')) {
          toCreate.push({
            date: new Date('2025-12-20'), // Samedi
            heureDebut: '09:00',
            heureFin: '17:00'
          });
        } else if (sens.nom.toLowerCase().includes('dimanche') || sens.nom.toLowerCase().includes('ferié')) {
          toCreate.push({
            date: new Date('2025-12-21'), // Dimanche
            heureDebut: '10:00',
            heureFin: '18:00'
          });
        }

        for (const service of toCreate) {
          await prisma.service.create({
            data: {
              ligneId: sens.ligneId,
              sensId: sens.id,
              date: service.date,
              heureDebut: service.heureDebut,
              heureFin: service.heureFin,
              statut: 'Planifiée'
            }
          });
          created++;
        }
      }
    }

    console.log(`✅ ${created} templates créés (1 par sens)\n`);
    console.log("Maintenant il faut générer les instances pour les bonnes dates!");

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTemplates();
