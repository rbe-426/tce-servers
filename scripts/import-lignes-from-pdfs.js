#!/usr/bin/env node
/**
 * Import lignes/sens/services depuis les PDF (IDFM/Tisse) vers Prisma.
 * - 1 Ligne par "numero" (upsert)
 * - 1 Sens par (ligneId, nom) (upsert)
 * - 1 Service par course (départ = 1ère heure colonne, arrivée = dernière heure colonne)
 *
 * Usage:
 *   node scripts/import-lignes-from-pdfs.js --dir ./scripts/pdfs --days 60 --dry-run
 *   node scripts/import-lignes-from-pdfs.js --dir ./scripts/pdfs --days 60
 *
 * Notes importantes:
 * - Ce script importe des "courses" (pas des plages).
 * - Les PDF scolaires complexes (ex: 4280 multi-circuits) sont importés "au mieux" :
 *   on crée des courses par colonnes, avec jours = LMJV par défaut si non détectable.
 *   Tu peux surcharger via overrides.json (voir plus bas).
 */

import fs from "fs";
import path from "path";
import pdf from "pdf-parse";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ---------------- CLI ----------------
function getArg(name, def = null) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return def;
  return process.argv[idx + 1] ?? true;
}

const DIR = getArg("--dir", path.join(process.cwd(), "scripts", "pdfs"));
const DAYS_AHEAD = parseInt(getArg("--days", "60"), 10); // génère N jours à venir
const DRY_RUN = process.argv.includes("--dry-run");
const EXPORT_JSON = process.argv.includes("--export-json");

const OVERRIDES_PATH = path.join(DIR, "overrides.json");

// ---------------- Helpers temps/jours ----------------
function hhmmToHHhMM(hhmm) {
  // "7:05" -> "07h05"
  const m = String(hhmm).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return `${String(parseInt(m[1], 10)).padStart(2, "0")}h${m[2]}`;
}

function parseHeure(heureStr) {
  if (!heureStr) return null;
  const m = String(heureStr).trim().match(/^(\d{1,2})h(\d{2})$/i);
  if (!m) return null;
  const hh = String(parseInt(m[1], 10)).padStart(2, "0");
  const mm = String(parseInt(m[2], 10)).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * Convertit un "joursStr" en calendrier bool.
 * Accepte:
 * - "L; M; M; J; V" (2x M = mardi+mercredi)
 * - "L; M; J; V" (si tu veux juste "L M J V" sans mercredi)
 * - "LMJV" / "LMJVS" / "LMJVD" etc.
 */
function parseJours(joursStr) {
  const cal = {
    lundi: false, mardi: false, mercredi: false,
    jeudi: false, vendredi: false, samedi: false, dimanche: false
  };
  if (!joursStr) return cal;

  const s = String(joursStr).trim().toUpperCase();

  // Format compact LMJV
  if (/^[LMJVS D]+$/.test(s.replace(/\s+/g, "")) && s.includes("L")) {
    const compact = s.replace(/\s+/g, "");
    if (compact.includes("L")) cal.lundi = true;
    // si "M" seul: on active mardi+mercredi (scolaire souvent non distingué)
    if (compact.includes("M")) { cal.mardi = true; cal.mercredi = true; }
    if (compact.includes("J")) cal.jeudi = true;
    if (compact.includes("V")) cal.vendredi = true;
    if (compact.includes("S")) cal.samedi = true;
    if (compact.includes("D")) cal.dimanche = true;
    return cal;
  }

  // Format "L; M; M; J; V"
  const arr = s.split(";").map(x => x.trim()).filter(Boolean);

  let mCount = 0;
  for (const j of arr) {
    if (j === "L") cal.lundi = true;
    else if (j === "M") {
      mCount++;
      if (mCount === 1) cal.mardi = true;
      else cal.mercredi = true;
    } else if (j === "J") cal.jeudi = true;
    else if (j === "V") cal.vendredi = true;
    else if (j === "S") cal.samedi = true;
    else if (j === "D") cal.dimanche = true;
  }
  return cal;
}

/**
 * Génère les dates à partir d'aujourd'hui sur N jours,
 * en respectant calendrier bool.
 */
function generateServiceDatesForward(calendrier, daysAhead = 60) {
  const dates = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const dayKey = (d) => {
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
    if (calendrier[dayKey(d)]) dates.push(d);
  }
  return dates;
}

// ---------------- Parsing PDF ----------------
function detectLineNumber(filename, text) {
  // priorité: nom du fichier (ex: 4275.pdf, N139.pdf)
  const base = path.basename(filename).toUpperCase();
  let m = base.match(/(N\d+|\d{4})/);
  if (m) return m[1];

  // sinon: dans le texte
  m = text.toUpperCase().match(/\b(N\d+|\d{4})\b/);
  return m ? m[1] : null;
}

function normalizeSpaces(s) {
  return String(s).replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
}

function splitPages(rawText) {
  // pdf-parse sépare souvent les pages par \f
  const pages = rawText.split("\f").map(p => p.trim()).filter(Boolean);
  return pages.length ? pages : [rawText];
}

function extractDirectionHeaders(pageText) {
  // On vise les lignes:
  // "Direction :" puis la ligne suivante contient souvent le terminus (ex: "SAINTRY-SUR-SEINE Rue des Chèvres")
  const lines = pageText.split("\n").map(normalizeSpaces).filter(Boolean);

  const dirs = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toUpperCase().startsWith("DIRECTION")) {
      const next1 = lines[i + 1] ?? "";
      const next2 = lines[i + 2] ?? "";
      // souvent 1 ou 2 lignes
      const label = [next1, next2].filter(Boolean).join(" ").trim();
      if (label) dirs.push(label);
    }
  }
  return dirs;
}

function detectDayLabel(pageText) {
  const t = pageText.toLowerCase();
  // On map vers ton format jours
  if (t.includes("samedi")) return { label: "Samedi", jours: "S" };
  if (t.includes("dimanche")) return { label: "Dimanche", jours: "D" };
  // “Du lundi au vendredi …”
  if (t.includes("du lundi au vendredi")) return { label: "Semaine", jours: "L; M; M; J; V" };

  // cas: “aucun service les samedis, dimanches…” => scolaire LMJV
  if (t.includes("aucun service") && t.includes("samedis") && t.includes("dimanches")) {
    return { label: "Scolaire", jours: "L; M; M; J; V" };
  }

  // fallback
  return { label: "Semaine", jours: "L; M; M; J; V" };
}

/**
 * Parse une table d'horaires (texte) en colonnes de courses.
 * Stratégie:
 * - on prend toutes les lignes qui contiennent au moins 1 horaire hh:mm
 * - pour chaque ligne, on extrait la liste des hh:mm dans l'ordre
 * - on considère que chaque position (index) = une colonne/courses
 * - pour chaque colonne: départ = 1ère heure vue ; arrivée = dernière heure vue
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

  // nombre max de colonnes vu
  const maxCols = Math.max(...rows.map(r => r.length));

  const cols = Array.from({ length: maxCols }, () => []);

  for (const r of rows) {
    for (let i = 0; i < maxCols; i++) {
      cols[i].push(r[i] ?? null);
    }
  }

  const trips = [];
  for (const col of cols) {
    const first = col.find(x => x);
    const last = [...col].reverse().find(x => x);
    if (!first || !last) continue;

    trips.push({
      depart: hhmmToHHhMM(first),
      arrivee: hhmmToHHhMM(last),
    });
  }

  // dédoublonnage simple
  const uniq = [];
  const seen = new Set();
  for (const tr of trips) {
    const key = `${tr.depart}-${tr.arrivee}`;
    if (!seen.has(key)) { seen.add(key); uniq.push(tr); }
  }
  return uniq;
}

// ---------------- Overrides (optionnel) ----------------
function loadOverrides() {
  if (!fs.existsSync(OVERRIDES_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(OVERRIDES_PATH, "utf-8"));
  } catch {
    return {};
  }
}

/**
 * overrides.json (optionnel) exemple:
 * {
 *   "4280": {
 *     "nom": "LIGNE_4280",
 *     "type": "autobus",
 *     "forceJours": "L; M; M; J; V",
 *     "sensRename": {
 *       "Semaine Aller": "Scolaire Aller",
 *       "Semaine Retour": "Scolaire Retour"
 *     }
 *   }
 * }
 */

// ---------------- Import Prisma ----------------
async function upsertLigne({ numero, nom, type, heureDebut, heureFin }) {
  const hDeb = parseHeure(heureDebut);
  const hFin = parseHeure(heureFin);

  return prisma.ligne.upsert({
    where: { numero },
    create: {
      numero,
      nom,
      typesVehicules: JSON.stringify([type]),
      heureDebut: hDeb,
      heureFin: hFin,
      calendrierJson: JSON.stringify({
        lundi: true, mardi: true, mercredi: true, jeudi: true, vendredi: true, samedi: true, dimanche: true
      }),
      statut: "Actif"
    },
    update: {
      nom,
      typesVehicules: JSON.stringify([type]),
      heureDebut: hDeb,
      heureFin: hFin,
      statut: "Actif"
    }
  });
}

async function upsertSens({ ligneId, nom, direction }) {
  return prisma.sens.upsert({
    where: { ligneId_nom: { ligneId, nom } },
    create: { ligneId, nom, direction: direction || null, statut: "Actif" },
    update: { direction: direction || null, statut: "Actif" }
  });
}

function minTimeHHhMM(trips) {
  // "07h15"
  const toMin = (s) => {
    const m = s.match(/^(\d{2})h(\d{2})$/);
    if (!m) return Infinity;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  };
  let best = null;
  let bestv = Infinity;
  for (const t of trips) {
    const v = toMin(t.depart);
    if (v < bestv) { bestv = v; best = t.depart; }
  }
  return best;
}

function maxTimeHHhMM(trips) {
  const toMin = (s) => {
    const m = s.match(/^(\d{2})h(\d{2})$/);
    if (!m) return -Infinity;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  };
  let best = null;
  let bestv = -Infinity;
  for (const t of trips) {
    const v = toMin(t.arrivee);
    if (v > bestv) { bestv = v; best = t.arrivee; }
  }
  return best;
}

async function createServicesIfMissing({ ligneId, sensId, joursStr, trips }) {
  const calendrier = parseJours(joursStr);
  const dates = generateServiceDatesForward(calendrier, DAYS_AHEAD);

  // performance: on prépare createMany + unique côté BD recommandé
  // Ici on fait simple, mais tu peux passer en createMany(skipDuplicates) si tu as un unique.
  let created = 0;

  for (const d of dates) {
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

    for (const tr of trips) {
      const heureDebut = parseHeure(tr.depart);
      const heureFin = parseHeure(tr.arrivee);
      if (!heureDebut || !heureFin) continue;

      const existing = await prisma.service.findFirst({
        where: {
          ligneId,
          sensId,
          date: { gte: dayStart, lt: dayEnd },
          heureDebut,
          heureFin
        }
      });

      if (!existing) {
        if (!DRY_RUN) {
          await prisma.service.create({
            data: {
              ligneId,
              sensId,
              date: d,
              heureDebut,
              heureFin,
              statut: "Planifiée"
            }
          });
        }
        created++;
      }
    }
  }
  return created;
}

// ---------------- Main ----------------
async function main() {
  console.log(`📁 Dossier PDF: ${DIR}`);
  console.log(`📆 Génération services: ${DAYS_AHEAD} jours`);
  console.log(DRY_RUN ? "🧪 DRY-RUN (aucune écriture BD)" : "🧩 Import BD activé");
  console.log("");

  if (!fs.existsSync(DIR)) {
    throw new Error(`Dossier introuvable: ${DIR}`);
  }

  const overrides = loadOverrides();

  const files = fs.readdirSync(DIR).filter(f => f.toLowerCase().endsWith(".pdf"));
  if (!files.length) {
    throw new Error(`Aucun PDF trouvé dans ${DIR}`);
  }

  let totalLignes = 0;
  let totalSens = 0;
  let totalServices = 0;

  const exportData = [];

  for (const f of files) {
    const full = path.join(DIR, f);
    const buf = fs.readFileSync(full);
    const parsed = await pdf(buf);
    const rawText = parsed.text || "";

    const numero = detectLineNumber(f, rawText);
    if (!numero) {
      console.warn(`⚠️  Impossible de détecter le numéro de ligne dans ${f} (skip)`);
      continue;
    }

    const ov = overrides[numero] || {};
    const type = ov.type || "autobus";
    const nom = ov.nom || `LIGNE_${numero}`;

    const pages = splitPages(rawText);

    // On reconstruit des "blocs" par page = (direction + jours + trips)
    const blocks = [];
    for (const p of pages) {
      const dirs = extractDirectionHeaders(p);
      const day = detectDayLabel(p);
      const trips = extractTripsFromPage(p);

      // Si page sans horaires: skip
      if (!trips.length) continue;

      blocks.push({
        dirs,
        dayLabel: day.label,
        jours: ov.forceJours || day.jours,
        trips
      });
    }

    if (!blocks.length) {
      console.warn(`⚠️  Aucun bloc d'horaires détecté pour ${numero} (${f})`);
      continue;
    }

    // Heuristique sens:
    // - si on trouve 2 directions sur le PDF, on crée 2 sens (Aller/Retour)
    // - sinon on crée 1 sens générique
    // On fait par "type de jour" (Semaine/Samedi/Dimanche/Scolaire) => sens nommés différemment
    // (ça reste dans ta limite 6 sens la plupart du temps)
    const sensMap = [];

    // On calcule heureDebut/heureFin global ligne (min/max sur tous trips)
    const allTrips = blocks.flatMap(b => b.trips);
    const heureDebut = minTimeHHhMM(allTrips) || "06h00";
    const heureFin = maxTimeHHhMM(allTrips) || "20h00";

    const generatedLine = {
      numero,
      nom,
      type,
      jours: "L; M; M; J; V; S; D",
      heureDebut,
      heureFin,
      sens: []
    };

    // regroupe par (directionLabel, dayLabel)
    for (const b of blocks) {
      const dayLabel = b.dayLabel; // Semaine / Samedi / Dimanche / Scolaire
      const jours = b.jours;

      // direction label: si une direction est trouvée, on l'utilise
      // sinon placeholder
      const directionLabel = (b.dirs && b.dirs.length) ? b.dirs[0] : `Direction ${numero}`;

      // Nom sens: "Semaine - <direction>"
      const sensName = `${dayLabel} - ${directionLabel}`;

      generatedLine.sens.push({
        nom: sensName,
        jours,
        direction: directionLabel,
        services: b.trips.map(t => ({ heureDebut: t.depart, heureFin: t.arrivee }))
      });
    }

    // Dédup sens (même nom)
    const uniqSens = [];
    const seenSens = new Set();
    for (const s of generatedLine.sens) {
      if (!seenSens.has(s.nom)) {
        seenSens.add(s.nom);
        uniqSens.push(s);
      }
    }
    generatedLine.sens = uniqSens;

    exportData.push(generatedLine);

    // ---- Prisma import ----
    console.log(`📍 ${numero} (${f}) -> blocs: ${blocks.length}, sens: ${generatedLine.sens.length}`);

    const ligne = DRY_RUN ? { id: "DRY", numero } : await upsertLigne({
      numero,
      nom,
      type,
      heureDebut,
      heureFin
    });

    totalLignes++;

    for (const s of generatedLine.sens) {
      const sens = DRY_RUN ? { id: "DRY_SENS" } : await upsertSens({
        ligneId: ligne.id,
        nom: (ov.sensRename && ov.sensRename[s.nom]) ? ov.sensRename[s.nom] : s.nom,
        direction: s.direction
      });

      totalSens++;

      const trips = s.services.map(x => ({ depart: x.heureDebut, arrivee: x.heureFin }));
      const created = DRY_RUN ? 0 : await createServicesIfMissing({
        ligneId: ligne.id,
        sensId: sens.id,
        joursStr: s.jours,
        trips
      });
      totalServices += created;
    }
  }

  if (EXPORT_JSON) {
    const outPath = path.join(DIR, "_generated_LIGNES_DATA.json");
    fs.writeFileSync(outPath, JSON.stringify(exportData, null, 2), "utf-8");
    console.log(`\n🧾 JSON généré: ${outPath}`);
  }

  console.log("\n==============================");
  console.log("✅ IMPORT TERMINÉ");
  console.log("==============================");
  console.log(`📌 Lignes traitées: ${totalLignes}`);
  console.log(`🧭 Sens upsert: ${totalSens}`);
  console.log(`🚌 Services créés: ${totalServices}`);
}

main()
  .catch((e) => {
    console.error("💥 Erreur:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
