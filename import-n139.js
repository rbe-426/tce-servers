#!/usr/bin/env node
/**
 * Import direct des lignes + sens + services dans la BD (Prisma)
 * - 1 ligne par numero (upsert)
 * - chaque sens a son propre calendrier (jours)
 * - création des services par date, par sens
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ==================== DONNÉES À IMPORTER ====================
const LIGNES_DATA = [
  {
    numero: "N139",
    nom: "NOCTILIEN_N139",
    type: "autobus",
    heureDebut: "00h10",
    heureFin: "07h16",
    sens: [
      {
        nom: "Semaine Aller",
        jours: "L; M; M; J; V",
        direction:
          "Paris (Gare de Lyon - Diderot) → Corbeil-Essonnes (Gare Henri Barbusse) | CARTE CHRONO EXIGÉE",
        services: [{ heureDebut: "01h35", heureFin: "07h16" }]
      },
      {
        nom: "Semaine Retour",
        jours: "L; M; M; J; V",
        direction:
          "Corbeil-Essonnes (Gare Henri Barbusse) → Paris (Gare de Lyon - Diderot) | CARTE CHRONO EXIGÉE",
        services: [{ heureDebut: "00h10", heureFin: "05h56" }]
      },
      {
        nom: "Samedi Aller",
        jours: "S",
        direction:
          "Paris (Gare de Lyon - Diderot) → Corbeil-Essonnes (Gare Henri Barbusse) | CARTE CHRONO EXIGÉE",
        services: [{ heureDebut: "01h35", heureFin: "07h16" }]
      },
      {
        nom: "Samedi Retour",
        jours: "S",
        direction:
          "Corbeil-Essonnes (Gare Henri Barbusse) → Paris (Gare de Lyon - Diderot) | CARTE CHRONO EXIGÉE",
        services: [{ heureDebut: "00h10", heureFin: "05h56" }]
      },
      {
        nom: "Dimanche & fériés Aller",
        jours: "D",
        direction:
          "Paris (Gare de Lyon - Diderot) → Corbeil-Essonnes (Gare Henri Barbusse) | CARTE CHRONO EXIGÉE",
        services: [{ heureDebut: "01h35", heureFin: "07h16" }]
      },
      {
        nom: "Dimanche & fériés Retour",
        jours: "D",
        direction:
          "Corbeil-Essonnes (Gare Henri Barbusse) → Paris (Gare de Lyon - Diderot) | CARTE CHRONO EXIGÉE",
        services: [{ heureDebut: "00h10", heureFin: "05h56" }]
      }
    ]
  }
];

// ==================== HELPERS ====================

function parseHeure(heureStr) {
  if (!heureStr) return null;
  const m = String(heureStr).trim().match(/^(\d{1,2})h(\d{2})$/i);
  if (!m) return null;
  const hh = String(parseInt(m[1], 10)).padStart(2, "0");
  const mm = String(parseInt(m[2], 10)).padStart(2, "0");
  return `${hh}:${mm}`;
}

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
      else {
        jours.mardi = true;
        jours.mercredi = true;
      }
    } else if (j === "J") jours.jeudi = true;
    else if (j === "V") jours.vendredi = true;
    else if (j === "S") jours.samedi = true;
    else if (j === "D") jours.dimanche = true;
  }

  return jours;
}

function generateServiceDates(calendrier) {
  const dates = [];
  
  // On génère pour toute la semaine courante (lundi-dimanche)
  const today = new Date();
  const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const todayDayOfWeek = todayUTC.getUTCDay(); // 0=dim, 1=lun, ..., 6=sam
  
  // Début de semaine = lundi de cette semaine
  const daysToMonday = todayDayOfWeek === 0 ? 6 : todayDayOfWeek - 1;
  const mondayUTC = new Date(Date.UTC(
    todayUTC.getUTCFullYear(),
    todayUTC.getUTCMonth(),
    todayUTC.getUTCDate() - daysToMonday
  ));

  // Jours dans l'ordre lundi-dimanche
  const order = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

  for (let i = 0; i < 7; i++) {
    const dayName = order[i];
    if (calendrier[dayName]) {
      const d = new Date(Date.UTC(
        mondayUTC.getUTCFullYear(),
        mondayUTC.getUTCMonth(),
        mondayUTC.getUTCDate() + i
      ));
      dates.push(d);
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

// ==================== IMPORT ====================

async function importLignes() {
  console.log("🚀 Démarrage import lignes...\n");

  let totalLignes = 0;
  let totalSens = 0;
  let totalServices = 0;
  const errors = [];

  try {
    for (const ligneData of LIGNES_DATA) {
      try {
        ensureRequiredStrings(ligneData);
        assertMaxSens(ligneData);

        console.log(`📍 Ligne ${ligneData.numero} — ${ligneData.nom}`);

        const hDeb = parseHeure(ligneData.heureDebut);
        const hFin = parseHeure(ligneData.heureFin);

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

          const calendrier = parseJours(sensData.jours);
          const serviceDates = generateServiceDates(calendrier);

          for (const s of sensData.services || []) {
            const heureDebut = parseHeure(s.heureDebut);
            const heureFin = parseHeure(s.heureFin);
            if (!heureDebut || !heureFin) {
              errors.push(`Service invalide ignoré: ${ligneData.numero} / ${sensData.nom}`);
              continue;
            }

            for (const serviceDate of serviceDates) {
              const dayStart = new Date(Date.UTC(serviceDate.getUTCFullYear(), serviceDate.getUTCMonth(), serviceDate.getUTCDate()));
              const dayEnd = new Date(Date.UTC(serviceDate.getUTCFullYear(), serviceDate.getUTCMonth(), serviceDate.getUTCDate() + 1));

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
