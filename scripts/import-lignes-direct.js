#!/usr/bin/env node
/**
 * Import LIGNES + SENS + SERVICES depuis les PDF (IDFM/TISSE etc.)
 * Compatible Node 18-22 en ESM (type:module) via createRequire.
 *
 * - Construit LIGNES_DATA automatiquement à partir des PDF
 * - Puis exécute l'import Prisma (upsert ligne, upsert sens, create services)
 *
 * Usage:
 *   node scripts/import-lignes-from-pdfs.js --dir ./scripts/pdfs --days 60 --dry-run --export-json
 *   node scripts/import-lignes-from-pdfs.js --dir ./scripts/pdfs --days 60
 */

import { createRequire } from "node:module";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const require = createRequire(import.meta.url);
// pdf-parse v2.4.5 exporte PDFParse (class), pas pdfParse (function)
const { PDFParse } = require("pdf-parse");

const prisma = new PrismaClient();

// ---------------- CLI ----------------
function getArg(name, def = null) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return def;
  const v = process.argv[idx + 1];
  return v === undefined ? true : v;
}

const DIR = getArg("--dir", path.join(process.cwd(), "scripts", "pdfs"));
const DAYS_AHEAD = parseInt(getArg("--days", "60"), 10);
const DRY_RUN = process.argv.includes("--dry-run");
const EXPORT_JSON = process.argv.includes("--export-json");

// ---------------- Helpers temps/jours ----------------

/** "06h30" -> "06:30" */
function parseHeure(heureStr) {
  if (!heureStr) return null;
  const m = String(heureStr).trim().match(/^(\d{1,2})h(\d{2})$/i);
  if (!m) return null;
  const hh = String(parseInt(m[1], 10)).padStart(2, "0");
  const mm = String(parseInt(m[2], 10)).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** "7:05" -> "07h05" */
function hhmmToHHhMM(hhmm) {
  const m = String(hhmm).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return `${String(parseInt(m[1], 10)).padStart(2, "0")}h${m[2]}`;
}

/**
 * Jours: "L; M; M; J; V" (2 M = mardi + mercredi)
 * "S" samedi, "D" dimanche
 * Supporte aussi : "LMJV", "LMJVS", "LMJVD" etc.
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

  const s = String(joursStr).trim().toUpperCase();

  // format compact : LMJV...
  if (/^[LMJVS D]+$/.test(s.replace(/\s+/g, "")) && s.includes("L")) {
    const c = s.replace(/\s+/g, "");
    if (c.includes("L")) jours.lundi = true;
    if (c.includes("M")) {
      // sur compact "M" on active mardi+mercredi (faute d’info)
      jours.mardi = true;
      jours.mercredi = true;
    }
    if (c.includes("J")) jours.jeudi = true;
    if (c.includes("V")) jours.vendredi = true;
    if (c.includes("S")) jours.samedi = true;
    if (c.includes("D")) jours.dimanche = true;
    return jours;
  }

  const arr = s
    .split(";")
    .map((x) => x.trim().toUpperCase())
    .filter(Boolean);

  let mCount = 0;
  for (const j of arr) {
    if (j === "L") jours.lundi = true;
    else if (j === "M") {
      mCount++;
      if (mCount === 1) jours.mardi = true;
      else jours.mercredi = true;
    } else if (j === "J") jours.jeudi = true;
    else if (j === "V") jours.vendredi = true;
    else if (j === "S") jours.samedi = true;
    else if (j === "D") jours.dimanche = true;
  }

  return jours;
}

/**
 * Génère les dates de service sur les N prochains jours
 * en fonction du calendrier booléen.
 */
function generateServiceDatesForward(calendrier, daysAhead = 60) {
  const dates = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const keyOf = (d) => {
    // JS: 0=dimanche ... 6=samedi
    const k = d.getDay();
    if (k === 0) return "dimanche";
    if (k === 1) return "lundi";
    if (k === 2) return "mardi";
    if (k === 3) return "mercredi";
    if (k === 4) return "jeudi";
    if (k === 5) return "vendredi";
    return "samedi";
  };

  for (let i = 0; i < daysAhead; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (calendrier[keyOf(d)]) dates.push(d);
  }
  return dates;
}

// ---------------- Helpers PDF parsing ----------------

function normalizeSpaces(s) {
  return String(s).replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
}

function splitPages(rawText) {
  const pages = rawText.split("\f").map((p) => p.trim()).filter(Boolean);
  return pages.length ? pages : [rawText];
}

function detectLineNumber(fileName, rawText) {
  // priorité: nom fichier (ex: 4201.pdf, 4270_scolaire.pdf, N139.pdf)
  const base = path.basename(fileName).toUpperCase();
  // Cherche au début du nom (avant underscore ou point)
  let m = base.match(/^([N\d]+?)(?:_|\.)/);
  if (m && (m[1].match(/^N\d+$/) || m[1].match(/^\d{4}$/))) {
    return m[1];
  }
  
  // Fallback: cherche n'importe où dans le nom
  m = base.match(/\b(N\d+|\d{4})\b/);
  if (m) return m[1];

  // Fallback: texte (pour PDFs avec texte extractible)
  m = String(rawText).toUpperCase().match(/\b(N\d+|\d{4})\b/);
  return m ? m[1] : null;
}

/**
 * Détecte le type de jour d'après la page.
 * Renvoie { key, label, joursStr }
 * key utilisé pour classer dans les 6 sens max (semaine/samedi/dimanche)
 */
function detectDayType(pageText) {
  const t = pageText.toLowerCase();

  // dimanches / fêtes
  if (t.includes("dimanche") || t.includes("féri") || t.includes("fete") || t.includes("fêtes")) {
    return { key: "DIM", label: "Dimanche & fériés", joursStr: "D" };
  }
  // samedi
  if (t.includes("samedi")) {
    return { key: "SAM", label: "Samedi", joursStr: "S" };
  }
  // semaine (souvent "Du lundi au vendredi")
  if (t.includes("du lundi au vendredi")) {
    return { key: "SEM", label: "Semaine", joursStr: "L; M; M; J; V" };
  }

  // fallback : on traite comme semaine
  return { key: "SEM", label: "Semaine", joursStr: "L; M; M; J; V" };
}

/**
 * Extrait une "direction" (terminus A -> terminus B) à partir de la table :
 * - on récupère la première ligne avec des heures => arrêt A
 * - et la dernière ligne avec des heures => arrêt B
 */
function extractTerminusFromPage(pageText) {
  const lines = pageText.split("\n").map(normalizeSpaces).filter(Boolean);

  const timeRe = /\b\d{1,2}:\d{2}\b/;
  const rows = lines.filter((l) => timeRe.test(l));

  if (rows.length < 2) return null;

  const firstRow = rows[0];
  const lastRow = rows[rows.length - 1];

  // arrêt = texte avant la première heure
  const firstStop = normalizeSpaces(firstRow.split(timeRe)[0] || "");
  const lastStop = normalizeSpaces(lastRow.split(timeRe)[0] || "");

  if (!firstStop || !lastStop) return null;

  return { a: firstStop, b: lastStop, direction: `${firstStop} → ${lastStop}` };
}

/**
 * Extrait les courses (colonnes) :
 * - pour chaque ligne: on prend la liste des hh:mm
 * - on transpose en colonnes
 * - une colonne = une course => depart = 1ère heure, arrivee = dernière heure
 */
function extractTripsFromPage(pageText) {
  const lines = pageText.split("\n").map(normalizeSpaces).filter(Boolean);
  const timeRe = /\b(\d{1,2}:\d{2})\b/g;

  const rows = [];
  for (const line of lines) {
    const times = [];
    let m;
    while ((m = timeRe.exec(line)) !== null) times.push(m[1]);
    if (times.length) rows.push(times);
  }
  if (!rows.length) return [];

  const maxCols = Math.max(...rows.map((r) => r.length));
  const cols = Array.from({ length: maxCols }, () => []);

  for (const r of rows) {
    for (let i = 0; i < maxCols; i++) cols[i].push(r[i] ?? null);
  }

  const trips = [];
  const seen = new Set();

  for (const col of cols) {
    const first = col.find((x) => x);
    const last = [...col].reverse().find((x) => x);
    if (!first || !last) continue;

    const depart = hhmmToHHhMM(first);
    const arrivee = hhmmToHHhMM(last);
    if (!depart || !arrivee) continue;

    const key = `${depart}-${arrivee}`;
    if (seen.has(key)) continue;
    seen.add(key);

    trips.push({ heureDebut: depart, heureFin: arrivee });
  }

  return trips;
}

// ---------------- Validation / contraintes ----------------

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

// ---------------- Construction LIGNES_DATA depuis PDF ----------------

/**
 * Important: on limite volontairement à 6 sens max:
 * - Semaine Aller
 * - Semaine Retour
 * - Samedi Aller
 * - Samedi Retour
 * - Dimanche & fériés Aller
 * - Dimanche & fériés Retour
 *
 * Les PDF "scolaires" (LMJV) restent dans "Semaine".
 * Les circuits multiples (ex: 4280) sont fusionnés dans les services du même sens/jour.
 */
function buildLignesDataFromPdfs(pdfDir) {
  if (!fs.existsSync(pdfDir)) throw new Error(`Dossier introuvable: ${pdfDir}`);

  const files = fs.readdirSync(pdfDir).filter((f) => f.toLowerCase().endsWith(".pdf"));
  if (!files.length) throw new Error(`Aucun PDF dans ${pdfDir}`);

  const linesMap = new Map(); // numero -> { ...ligne, sensMap }

  return { files, linesMap };
}

async function parseAllPdfsIntoLignesData(pdfDir) {
  const { files, linesMap } = buildLignesDataFromPdfs(pdfDir);

  for (const f of files) {
    const full = path.join(pdfDir, f);
    const buf = fs.readFileSync(full);
    const pdfParser = new PDFParse(buf);
    const rawText = pdfParser.text || "";

    const numero = detectLineNumber(f, rawText);
    if (!numero) {
      console.warn(`⚠️  Numéro introuvable dans ${f} -> ignoré`);
      continue;
    }

    if (!linesMap.has(numero)) {
      linesMap.set(numero, {
        numero,
        nom: numero.startsWith("N") ? `NOCTILIEN_${numero}` : `LIGNE_${numero}`,
        type: "autobus",
        jours: "L; M; M; J; V; S; D",
        heureDebut: null,
        heureFin: null,
        // sensMap: key = `${dayKey}_${ALLER|RETOUR}`
        sensMap: new Map()
      });
    }

    const ligne = linesMap.get(numero);

    const pages = splitPages(rawText);
    for (const p of pages) {
      const day = detectDayType(p);
      const term = extractTerminusFromPage(p);
      const trips = extractTripsFromPage(p);

      if (!trips.length || !term) continue;

      // Heuristique Aller/Retour :
      // Si on a déjà un "ALLER" existant pour ce dayKey, et que la direction est inverse => RETOUR.
      // Sinon on classe le premier sens rencontré comme ALLER.
      const dayKey = day.key;

      const allerKey = `${dayKey}_ALLER`;
      const retourKey = `${dayKey}_RETOUR`;

      const existingAller = ligne.sensMap.get(allerKey);
      const existingRetour = ligne.sensMap.get(retourKey);

      const isReverseOf = (dir1, dir2) => {
        if (!dir1 || !dir2) return false;
        const [a1, b1] = dir1.split("→").map((x) => normalizeSpaces(x));
        const [a2, b2] = dir2.split("→").map((x) => normalizeSpaces(x));
        return a1 && b1 && a2 && b2 && a1 === b2 && b1 === a2;
      };

      let bucketKey = allerKey;
      if (existingAller && isReverseOf(existingAller.direction, term.direction)) bucketKey = retourKey;
      else if (existingRetour && isReverseOf(existingRetour.direction, term.direction)) bucketKey = allerKey;
      else if (existingAller && existingAller.direction === term.direction) bucketKey = allerKey;
      else if (existingRetour && existingRetour.direction === term.direction) bucketKey = retourKey;
      else {
        // si aller existe déjà mais pas retour, on place sur retour si direction différente
        if (existingAller && !existingRetour && existingAller.direction !== term.direction) bucketKey = retourKey;
      }

      if (!ligne.sensMap.has(bucketKey)) {
        const isAller = bucketKey.endsWith("_ALLER");
        const sensNom = `${day.label} ${isAller ? "Aller" : "Retour"}`;
        ligne.sensMap.set(bucketKey, {
          nom: sensNom,
          jours: day.joursStr,
          direction: term.direction,
          services: []
        });
      }

      const sens = ligne.sensMap.get(bucketKey);

      // merge services (dédoublonne)
      const seen = new Set(sens.services.map((s) => `${s.heureDebut}-${s.heureFin}`));
      for (const t of trips) {
        const key = `${t.heureDebut}-${t.heureFin}`;
        if (seen.has(key)) continue;
        seen.add(key);
        sens.services.push(t);
      }

      // calc heureDebut/heureFin global ligne (min/max)
      for (const t of trips) {
        if (!ligne.heureDebut) ligne.heureDebut = t.heureDebut;
        if (!ligne.heureFin) ligne.heureFin = t.heureFin;

        // min heureDebut
        if (ligne.heureDebut && t.heureDebut) {
          if (parseHeure(t.heureDebut) < parseHeure(ligne.heureDebut)) ligne.heureDebut = t.heureDebut;
        }
        // max heureFin (attention minuit: on ne gère pas ici, on conserve max lexical simple)
        if (ligne.heureFin && t.heureFin) {
          if (parseHeure(t.heureFin) > parseHeure(ligne.heureFin)) ligne.heureFin = t.heureFin;
        }
      }
    }
  }

  // transforme map -> array LIGNES_DATA
  const LIGNES_DATA = [];
  for (const ligne of linesMap.values()) {
    const sens = Array.from(ligne.sensMap.values());

    // on respecte max 6 sens (normalement assuré par notre bucket SEM/SAM/DIM x aller/retour)
    const final = {
      numero: ligne.numero,
      nom: ligne.nom,
      type: ligne.type,
      jours: ligne.jours,
      heureDebut: ligne.heureDebut || "06h00",
      heureFin: ligne.heureFin || "20h00",
      sens: sens
        .map((s) => ({
          nom: s.nom,
          jours: s.jours,
          direction: s.direction,
          services: s.services.sort((a, b) => (a.heureDebut > b.heureDebut ? 1 : -1))
        }))
        .slice(0, 6)
    };

    LIGNES_DATA.push(final);
  }

  // tri numérique (N139 à la fin)
  LIGNES_DATA.sort((a, b) => {
    const an = a.numero.startsWith("N") ? 999999 : parseInt(a.numero, 10);
    const bn = b.numero.startsWith("N") ? 999999 : parseInt(b.numero, 10);
    return an - bn;
  });

  return LIGNES_DATA;
}

// ---------------- Import Prisma (ta logique, améliorée en jours à venir) ----------------

async function importLignes(LIGNES_DATA) {
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

        // 1) upsert ligne
        const ligne = DRY_RUN
          ? { id: "DRY", numero: ligneData.numero }
          : await prisma.ligne.upsert({
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

          const sens = DRY_RUN
            ? { id: "DRY_SENS" }
            : await prisma.sens.upsert({
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

          // Dates par calendrier DU SENS -> N jours à venir
          const calendrier = parseJours(sensData.jours);
          const serviceDates = generateServiceDatesForward(calendrier, DAYS_AHEAD);

          // 3) services (une course = un service)
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

              const existing = DRY_RUN
                ? null
                : await prisma.service.findFirst({
                    where: {
                      ligneId: ligne.id,
                      sensId: sens.id,
                      date: { gte: dayStart, lt: dayEnd },
                      heureDebut,
                      heureFin
                    }
                  });

              if (!existing) {
                if (!DRY_RUN) {
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
                }
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
    console.log(`🚌 Services créés: ${totalServices}${DRY_RUN ? " (dry-run)" : ""}`);
    console.log(`⚠️  Erreurs: ${errors.length}`);
    if (errors.length) {
      console.log("\nDétails erreurs :");
      errors.forEach((x) => console.log(" - " + x));
    }
  } finally {
    await prisma.$disconnect();
  }
}

// ---------------- Main ----------------

async function main() {
  console.log(`📁 Dossier PDF: ${DIR}`);
  console.log(`📆 Génération services: ${DAYS_AHEAD} jours`);
  console.log(DRY_RUN ? "🧪 DRY-RUN (aucune écriture BD)\n" : "🧩 Import BD activé\n");

  const LIGNES_DATA = await parseAllPdfsIntoLignesData(DIR);

  if (EXPORT_JSON) {
    const outPath = path.join(DIR, "_generated_LIGNES_DATA.json");
    fs.writeFileSync(outPath, JSON.stringify(LIGNES_DATA, null, 2), "utf-8");
    console.log(`🧾 JSON généré: ${outPath}\n`);
  }

  await importLignes(LIGNES_DATA);
}

main().catch((e) => {
  console.error("💥 Erreur fatale:", e);
  process.exit(1);
});
