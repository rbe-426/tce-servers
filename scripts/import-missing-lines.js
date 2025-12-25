#!/usr/bin/env node
/**
 * Import des 34 lignes restantes (celles sans données réelles détaillées)
 * Crée 2 sens par ligne (Aller + Retour) avec service par défaut 06h00-20h00
 */

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

// Les 7 lignes avec données réelles (déjà importées)
const REAL_DATA_LINES = ["4201", "4203", "4205", "4206", "4212", "4213", "N139"];

// Détecte les lignes existantes sans ses sens
async function importMissingLines() {
  console.log("🚀 Import des lignes restantes avec services par défaut...\n");

  try {
    // Récupère toutes les lignes
    const allLignes = await prisma.ligne.findMany({
      select: { id: true, numero: true },
      orderBy: { numero: "asc" }
    });

    let totalImported = 0;
    let totalSens = 0;
    let totalServices = 0;

    for (const ligne of allLignes) {
      // Saute les 7 lignes avec données réelles
      if (REAL_DATA_LINES.includes(ligne.numero)) {
        continue;
      }

      // Compte les sens existants
      const sensCount = await prisma.sens.count({
        where: { ligneId: ligne.id }
      });

      // Si la ligne a déjà des sens, la saute
      if (sensCount > 0) {
        continue;
      }

      console.log(`📍 Ligne ${ligne.numero}:`);

      // Créer 2 sens : Aller et Retour
      const sensList = [];

      // Sens Aller
      const allerSens = await prisma.sens.create({
        data: {
          ligneId: ligne.id,
          nom: "Aller",
          direction: "Départ → Arrivée",
          statut: "Actif"
        }
      });
      sensList.push(allerSens);
      console.log(`   ✓ Sens "Aller" créé`);

      // Sens Retour
      const retourSens = await prisma.sens.create({
        data: {
          ligneId: ligne.id,
          nom: "Retour",
          direction: "Arrivée → Départ",
          statut: "Actif"
        }
      });
      sensList.push(retourSens);
      console.log(`   ✓ Sens "Retour" créé`);

      // Créer services par défaut (60 jours, chaque jour)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let serviceCount = 0;

      for (let day = 0; day < 60; day++) {
        const serviceDate = new Date(today);
        serviceDate.setDate(today.getDate() + day);

        // Service Aller
        await prisma.service.create({
          data: {
            ligneId: ligne.id,
            sensId: allerSens.id,
            date: serviceDate,
            heureDebut: "06:00",
            heureFin: "20:00",
            statut: "Planifiée"
          }
        });

        // Service Retour
        await prisma.service.create({
          data: {
            ligneId: ligne.id,
            sensId: retourSens.id,
            date: serviceDate,
            heureDebut: "06:00",
            heureFin: "20:00",
            statut: "Planifiée"
          }
        });

        serviceCount += 2;
      }

      console.log(`   ✓ ${serviceCount} services créés (60 jours × 2 sens)`);
      console.log(`   ✅ Ligne ${ligne.numero} complète\n`);

      totalImported++;
      totalSens += 2;
      totalServices += serviceCount;
    }

    console.log("=".repeat(60));
    console.log("✨ IMPORT TERMINÉ");
    console.log("=".repeat(60));
    console.log(`📌 Lignes complétées: ${totalImported}`);
    console.log(`🧭 Sens créés: ${totalSens}`);
    console.log(`🚌 Services créés: ${totalServices}`);
    console.log();
  } catch (e) {
    console.error("💥 Erreur:", e);
  } finally {
    await prisma.$disconnect();
  }
}

importMissingLines();
