#!/usr/bin/env node
/**
 * Import direct des vraies données LIGNES + SENS + SERVICES
 * Utilise LIGNES_DATA_REAL.json avec les horaires réels extraits manuellement
 */

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

// ==================== DONNÉES À IMPORTER ====================
const dataPath = path.join(__dirname, "LIGNES_DATA_REAL.json");
const LIGNES_DATA = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

// ==================== HELPERS ====================

/** "06h30" -> "06:30" */
function parseHeure(heureStr) {
  if (!heureStr) return null;
  const m = String(heureStr).trim().match(/^(\d{1,2})h(\d{2})$/i);
  if (!m) return null;
  const hh = String(parseInt(m[1], 10)).padStart(2, "0");
  const mm = String(parseInt(m[2], 10)).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * Jours: "L; M; M; J; V" (2 M = mardi + mercredi)
 * "S" samedi, "D" dimanche
 */
function parseJours(joursStr) {
  const jours = {
    lundi: false,
    mardi: false,
    mercredi: false,
    jeudi: false,
    vendredi: false,
    samedi: false,
    dimanche: false
  };
  if (!joursStr) return jours;

  const arr = joursStr
    .split(";")
    .map((x) => x.trim().toUpperCase())
    .filter(Boolean);

  let mCount = 0;
  for (const j of arr) {
    if (j === "L") jours.lundi = true;
    else if (j === "M") {
      mCount++;
      if (mCount === 1) jours.mardi = true;
      else if (mCount === 2) jours.mercredi = true;
    } else if (j === "J") jours.jeudi = true;
    else if (j === "V") jours.vendredi = true;
    else if (j === "S") jours.samedi = true;
    else if (j === "D") jours.dimanche = true;
  }

  return jours;
}

/**
 * Génère les dates de service pour N jours à partir d'aujourd'hui
 */
function generateServiceDates(calendrier, daysAhead = 60) {
  const dates = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const order = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

  for (let day = 0; day < daysAhead; day++) {
    const d = new Date(today);
    d.setDate(today.getDate() + day);
    
    const dayOfWeek = d.getDay();
    const dayName = order[dayOfWeek === 0 ? 6 : dayOfWeek - 1]; // JavaScript: 0=Sunday, 6=Saturday
    
    if (calendrier[dayName]) {
      dates.push(new Date(d));
    }
  }
  return dates;
}

function assertMaxSens(ligneData) {
  if (ligneData?.sens?.length > 6) {
    throw new Error(`Ligne ${ligneData.numero} a ${ligneData.sens.length} sens (max = 6).`);
  }
}

function ensureRequiredStrings(ligneData) {
  if (!ligneData.numero) throw new Error("numero manquant");
  if (!ligneData.nom) throw new Error(`nom manquant pour la ligne ${ligneData.numero}`);
  if (!ligneData.type) throw new Error(`type manquant pour la ligne ${ligneData.numero}`);
}

// ==================== NETTOYAGE ====================

async function cleanupDuplicateSens() {
  console.log("🧹 Suppression de TOUS les sens existants avant réimport...\n");
  
  const ligneNumerosToClean = LIGNES_DATA.map(l => l.numero);
  
  for (const numero of ligneNumerosToClean) {
    try {
      // Récupère la ligne
      const ligne = await prisma.ligne.findUnique({
        where: { numero }
      });
      
      if (!ligne) {
        console.log(`  ⚠️  Ligne ${numero} n'existe pas encore`);
        continue;
      }
      
      // Récupère tous les sens de cette ligne
      const sensList = await prisma.sens.findMany({
        where: { ligneId: ligne.id }
      });
      
      if (sensList.length === 0) {
        console.log(`  ℹ️  Aucun sens pour ligne ${numero}`);
        continue;
      }
      
      console.log(`  🗑️  Ligne ${numero}: Suppression de ${sensList.length} sens...`);
      
      // Supprime tous les services pour ces sens
      const sensIds = sensList.map(s => s.id);
      const deletedServices = await prisma.service.deleteMany({
        where: {
          sensId: { in: sensIds }
        }
      });
      
      console.log(`      ✓ ${deletedServices.count} services supprimés`);
      
      // Supprime tous les sens
      const deletedSens = await prisma.sens.deleteMany({
        where: { ligneId: ligne.id }
      });
      
      console.log(`      ✓ ${deletedSens.count} sens supprimés`);
    } catch (e) {
      console.error(`  ❌ Erreur pour ligne ${numero}: ${e.message}`);
    }
  }
  
  console.log("\n✅ Nettoyage terminé\n");
}

// ==================== IMPORT ====================

async function importLignes() {
  console.log("🚀 Démarrage import lignes RÉELLES...\n");

  let totalLignes = 0;
  let totalSens = 0;
  let totalServices = 0;
  const errors = [];

  try {
    // D'abord nettoyer les doublons
    await cleanupDuplicateSens();
    
    for (const ligneData of LIGNES_DATA) {
      try {
        ensureRequiredStrings(ligneData);
        assertMaxSens(ligneData);

        console.log(`📍 Ligne ${ligneData.numero} — ${ligneData.nom}`);

        const hDeb = parseHeure(ligneData.heureDebut);
        const hFin = parseHeure(ligneData.heureFin);

        // 1) upsert ligne
        const ligne = await prisma.ligne.upsert({
          where: { numero: ligneData.numero },
          create: {
            numero: ligneData.numero,
            nom: ligneData.nom,
            typesVehicules: JSON.stringify([ligneData.type]),
            heureDebut: hDeb,
            heureFin: hFin,
            calendrierJson: JSON.stringify({
              lundi: true,
              mardi: true,
              mercredi: true,
              jeudi: true,
              vendredi: true,
              samedi: true,
              dimanche: true
            }),
            statut: "Actif"
          },
          update: {
            nom: ligneData.nom,
            typesVehicules: JSON.stringify([ligneData.type]),
            heureDebut: hDeb,
            heureFin: hFin,
            statut: "Actif"
          }
        });

        totalLignes++;

        // 2) upsert sens + création services
        for (const sensData of ligneData.sens || []) {
          if (!sensData.nom) throw new Error(`Sens sans nom sur ${ligneData.numero}`);
          if (!sensData.jours) throw new Error(`Sens ${sensData.nom} sans jours sur ${ligneData.numero}`);

          const sens = await prisma.sens.upsert({
            where: {
              ligneId_nom: { ligneId: ligne.id, nom: sensData.nom }
            },
            create: {
              ligneId: ligne.id,
              nom: sensData.nom,
              direction: sensData.direction || null,
              statut: "Actif"
            },
            update: {
              direction: sensData.direction || null,
              statut: "Actif"
            }
          });

          totalSens++;

          // Dates par calendrier du sens
          const calendrier = parseJours(sensData.jours);
          const serviceDates = generateServiceDates(calendrier, 60);

          // 3) services
          for (const s of sensData.services || []) {
            const heureDebut = parseHeure(s.heureDebut);
            const heureFin = parseHeure(s.heureFin);
            if (!heureDebut || !heureFin) {
              errors.push(`Service invalide ignoré: ${ligneData.numero} / ${sensData.nom}`);
              continue;
            }

            for (const serviceDate of serviceDates) {
              const dayStart = new Date(serviceDate.getFullYear(), serviceDate.getMonth(), serviceDate.getDate());
              const dayEnd = new Date(serviceDate.getFullYear(), serviceDate.getMonth(), serviceDate.getDate() + 1);

              const existing = await prisma.service.findFirst({
                where: {
                  ligneId: ligne.id,
                  sensId: sens.id,
                  date: { gte: dayStart, lt: dayEnd },
                  heureDebut,
                  heureFin
                }
              });

              if (!existing) {
                await prisma.service.create({
                  data: {
                    ligneId: ligne.id,
                    sensId: sens.id,
                    date: serviceDate,
                    heureDebut,
                    heureFin,
                    statut: "Planifiée"
                  }
                });
                totalServices++;
              }
            }
          }
        }

        console.log(`   ✅ OK (${ligneData.sens?.length || 0} sens)\n`);
      } catch (e) {
        const msg = `❌ ${ligneData?.numero || "?"}: ${e.message}`;
        console.error(msg);
        errors.push(msg);
      }
    }

    console.log("=".repeat(60));
    console.log("✨ IMPORT TERMINÉ");
    console.log("=".repeat(60));
    console.log(`📌 Lignes upsert: ${totalLignes}`);
    console.log(`🧭 Sens upsert: ${totalSens}`);
    console.log(`🚌 Services créés: ${totalServices}`);
    console.log(`⚠️  Erreurs: ${errors.length}`);
    if (errors.length) {
      console.log("\nDétails erreurs :");
      errors.forEach((x) => console.log(" - " + x));
    }
  } finally {
    await prisma.$disconnect();
  }
}

importLignes().catch((e) => {
  console.error("💥 Erreur fatale:", e);
  process.exit(1);
});
