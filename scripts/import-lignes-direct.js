#!/usr/bin/env node
/**
 * TUTORIEL : Import direct des lignes + sens + services dans la BD (Prisma)
 * 
 * Ce script démontre comment importer en masse des données de transport.
 * À adapter pour votre contexte spécifique.
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * 📚 GUIDE DE CONCEPTION ET DE RÉÉCRITURE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ### ÉTAPE 1 : Préparation des données
 * 
 * Structurez vos données de lignes dans un format JSON avec cette hiérarchie :
 * - Ligne (numéro, nom, type de véhicule, heures d'exploitation)
 *   ├─ Sens (direction, calendrier, jours d'exploitation)
 *   │  └─ Services (horaires de départ/arrivée pour chaque jour)
 *   └─ Autres sens...
 * 
 * Exemple de structure :
 * ```
 * {
 *   "numero": "4201",
 *   "nom": "LIGNE_4201",
 *   "type": "autobus",
 *   "jours": "L; M; M; J; V; S; D",
 *   "heureDebut": "05h45",
 *   "heureFin": "23h19",
 *   "sens": [
 *     {
 *       "nom": "Aller",
 *       "jours": "L; M; M; J; V",
 *       "direction": "Point A → Point B",
 *       "services": [
 *         { "heureDebut": "05h45", "heureFin": "10h11" },
 *         { "heureDebut": "12h00", "heureFin": "17h55" }
 *       ]
 *     },
 *     {
 *       "nom": "Retour",
 *       "jours": "L; M; M; J; V",
 *       "direction": "Point B → Point A",
 *       "services": [...]
 *     }
 *   ]
 * }
 * ```
 * 
 * ### ÉTAPE 2 : Définition des jours d'exploitation
 * 
 * Format des jours : "L; M; M; J; V; S; D"
 * - L = Lundi
 * - M = Mardi, Mercredi (si répété 2x)
 * - J = Jeudi
 * - V = Vendredi
 * - S = Samedi
 * - D = Dimanche
 * 
 * Exemples :
 * - "L; M; M; J; V" = Lundi à Vendredi
 * - "S" = Samedi uniquement
 * - "L; M; M; J; V; S; D" = Tous les jours
 * 
 * ### ÉTAPE 3 : Format des horaires
 * 
 * Tous les horaires utilisent le format HHhMM :
 * - "06h30" (6h30)
 * - "14h00" (14h)
 * - "23h59" (23h59)
 * 
 * ### ÉTAPE 4 : Implémentation du script
 * 
 * Pour adapter ce script :
 * 
 * 1. Remplacez LIGNES_DATA avec vos données réelles
 * 2. Assurez-vous que la structure JSON respecte le schéma ci-dessus
 * 3. Vérifiez que tous les champs requis sont présents
 * 4. Exécutez : node backend/scripts/import-lignes-direct.js
 * 
 * Optionnel : adapter les fonctions helper (parseHeure, parseJours) si besoin
 * 
 * ### ÉTAPE 5 : Flux d'importation
 * 
 * Pour chaque ligne :
 * 1. Upsert la Ligne (création ou mise à jour)
 * 2. Pour chaque Sens de la ligne :
 *    a. Upsert le Sens
 *    b. Parser le calendrier des jours
 *    c. Générer les dates de service
 *    d. Pour chaque Service :
 *       - Créer un Service pour chaque date générée
 *       - Éviter les doublons
 * 
 * ### ÉTAPE 6 : Points clés à respecter
 * 
 * ✅ Relations Prisma :
 * - Une Ligne = 1 record avec numero unique
 * - Un Sens = unique par (ligneId, nom)
 * - Un Service = date + heureDebut + heureFin par Sens
 * 
 * ✅ Validation :
 * - Tous les champs requis doivent être présents
 * - Les horaires doivent être au format HHhMM
 * - Les jours doivent utiliser le format "L; M; M; J; V; S; D"
 * 
 * ✅ Gestion des erreurs :
 * - Continuez l'import même si une ligne échoue
 * - Loggez les erreurs pour correction
 * - Afficher un résumé final (compteurs)
 * 
 * ### ÉTAPE 7 : Personnalisation pour vos données
 * 
 * Récupérez vos données depuis :
 * - CSV (parse avec csv-parser ou manual split)
 * - API externe (fetch + JSON parsing)
 * - Base de données (SQL queries)
 * - Fichier JSON local
 * 
 * Transformez-les au format de LIGNES_DATA.
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔧 TEMPLATE DE CODE À ADAPTER
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ==================== DONNÉES À IMPORTER ====================
// 👇 REMPLACER avec vos données réelles
const LIGNES_DATA = [
  {
    "numero": "4201",
    "nom": "LIGNE_4201",
    "type": "autobus",
    "jours": "L; M; M; J; V; S; D",
    "heureDebut": "05h45",
    "heureFin": "23h19",
    "sens": [
      {
        "nom": "Semaine Aller",
        "jours": "L; M; M; J; V",
        "direction": "Gare de Corbeil-Essonnes - E. Zola → Rue Berlioz",
        "services": [
          { "heureDebut": "05h45", "heureFin": "10h11" },
          { "heureDebut": "12h00", "heureFin": "17h55" },
          { "heureDebut": "20h50", "heureFin": "23h19" }
        ]
      },
      {
        "nom": "Semaine Retour",
        "jours": "L; M; M; J; V",
        "direction": "Rue Berlioz → Gare de Corbeil-Essonnes - E. Zola",
        "services": [
          { "heureDebut": "05h52", "heureFin": "06h41" },
          { "heureDebut": "09h21", "heureFin": "12h11" },
          { "heureDebut": "15h10", "heureFin": "21h31" }
        ]
      },
      {
        "nom": "Samedi Aller",
        "jours": "S",
        "direction": "Gare de Corbeil-Essonnes - E. Zola → Rue Berlioz",
        "services": [
          { "heureDebut": "06h38", "heureFin": "11h48" },
          { "heureDebut": "14h29", "heureFin": "18h21" },
          { "heureDebut": "20h50", "heureFin": "23h19" }
        ]
      },
      {
        "nom": "Samedi Retour",
        "jours": "S",
        "direction": "Rue Berlioz → Gare de Corbeil-Essonnes - E. Zola",
        "services": [
          { "heureDebut": "07h21", "heureFin": "11h11" },
          { "heureDebut": "14h21", "heureFin": "19h31" },
          { "heureDebut": "21h31", "heureFin": "21h31" }
        ]
      },
      {
        "nom": "Dimanche & fériés Aller",
        "jours": "D",
        "direction": "Gare de Corbeil-Essonnes - E. Zola → Rue Berlioz",
        "services": [
          { "heureDebut": "07h35", "heureFin": "12h48" },
          { "heureDebut": "14h29", "heureFin": "19h41" },
          { "heureDebut": "20h53", "heureFin": "23h19" }
        ]
      },
      {
        "nom": "Dimanche & fériés Retour",
        "jours": "D",
        "direction": "Rue Berlioz → Gare de Corbeil-Essonnes - E. Zola",
        "services": [
          { "heureDebut": "07h41", "heureFin": "12h11" },
          { "heureDebut": "15h10", "heureFin": "20h30" }
        ]
      }
    ]
  },
  {
    "numero": "4202",
    "nom": "LIGNE_4202",
    "type": "autobus",
    "jours": "L; M; M; J; V; S; D",
    "heureDebut": "04h43",
    "heureFin": "22h44",
    "sens": [
      {
        "nom": "Semaine Aller",
        "jours": "L; M; M; J; V",
        "direction": "Gare de Corbeil-Essonnes → ...",
        "services": [
          { "heureDebut": "04h43", "heureFin": "10h05" },
          { "heureDebut": "12h03", "heureFin": "16h50" },
          { "heureDebut": "18h44", "heureFin": "22h44" }
        ]
      },
      {
        "nom": "Semaine Retour",
        "jours": "L; M; M; J; V",
        "direction": "... → Gare de Corbeil-Essonnes",
        "services": [
          { "heureDebut": "05h23", "heureFin": "10h14" },
          { "heureDebut": "12h23", "heureFin": "16h44" },
          { "heureDebut": "18h23", "heureFin": "22h23" }
        ]
      },
      {
        "nom": "Samedi Aller",
        "jours": "S",
        "direction": "Gare de Corbeil-Essonnes → ...",
        "services": [
          { "heureDebut": "06h03", "heureFin": "12h05" },
          { "heureDebut": "14h03", "heureFin": "20h05" }
        ]
      },
      {
        "nom": "Samedi Retour",
        "jours": "S",
        "direction": "... → Gare de Corbeil-Essonnes",
        "services": [
          { "heureDebut": "06h23", "heureFin": "12h23" },
          { "heureDebut": "14h23", "heureFin": "20h23" }
        ]
      },
      {
        "nom": "Dimanche & fériés Aller",
        "jours": "D",
        "direction": "Gare de Corbeil-Essonnes → ...",
        "services": [
          { "heureDebut": "07h03", "heureFin": "13h05" },
          { "heureDebut": "15h03", "heureFin": "21h05" }
        ]
      },
      {
        "nom": "Dimanche & fériés Retour",
        "jours": "D",
        "direction": "... → Gare de Corbeil-Essonnes",
        "services": [
          { "heureDebut": "07h23", "heureFin": "13h23" },
          { "heureDebut": "15h23", "heureFin": "21h23" }
        ]
      }
    ]
  },
  {
    "numero": "4203",
    "nom": "LIGNE_4203",
    "type": "autobus",
    "jours": "L; M; M; J; V; S; D",
    "heureDebut": "05h53",
    "heureFin": "00h53",
    "sens": [
      {
        "nom": "Semaine Aller",
        "jours": "L; M; M; J; V",
        "direction": "Gare de ... → ...",
        "services": [
          { "heureDebut": "05h53", "heureFin": "10h53" },
          { "heureDebut": "12h53", "heureFin": "17h53" },
          { "heureDebut": "19h53", "heureFin": "00h53" }
        ]
      },
      {
        "nom": "Semaine Retour",
        "jours": "L; M; M; J; V",
        "direction": "... → Gare de ...",
        "services": [
          { "heureDebut": "06h03", "heureFin": "11h03" },
          { "heureDebut": "13h03", "heureFin": "18h03" },
          { "heureDebut": "20h03", "heureFin": "00h03" }
        ]
      },
      {
        "nom": "Samedi Aller",
        "jours": "S",
        "direction": "Gare de ... → ...",
        "services": [
          { "heureDebut": "07h53", "heureFin": "12h53" },
          { "heureDebut": "14h53", "heureFin": "19h53" }
        ]
      },
      {
        "nom": "Samedi Retour",
        "jours": "S",
        "direction": "... → Gare de ...",
        "services": [
          { "heureDebut": "08h03", "heureFin": "13h03" },
          { "heureDebut": "15h03", "heureFin": "20h03" }
        ]
      },
      {
        "nom": "Dimanche & fériés Aller",
        "jours": "D",
        "direction": "Gare de ... → ...",
        "services": [
          { "heureDebut": "08h53", "heureFin": "13h53" }
        ]
      },
      {
        "nom": "Dimanche & fériés Retour",
        "jours": "D",
        "direction": "... → Gare de ...",
        "services": [
          { "heureDebut": "09h03", "heureFin": "14h03" }
        ]
      }
    ]
  },
  {
    "numero": "4205",
    "nom": "LIGNE_4205",
    "type": "autobus",
    "jours": "L; M; M; J; V; S; D",
    "heureDebut": "05h19",
    "heureFin": "00h28",
    "sens": [
      {
        "nom": "Semaine Aller",
        "jours": "L; M; M; J; V",
        "direction": "Gare de ... → ...",
        "services": [
          { "heureDebut": "05h19", "heureFin": "10h28" },
          { "heureDebut": "12h19", "heureFin": "17h28" },
          { "heureDebut": "19h19", "heureFin": "00h28" }
        ]
      },
      {
        "nom": "Semaine Retour",
        "jours": "L; M; M; J; V",
        "direction": "... → Gare de ...",
        "services": [
          { "heureDebut": "05h28", "heureFin": "10h19" },
          { "heureDebut": "12h28", "heureFin": "17h19" },
          { "heureDebut": "19h28", "heureFin": "00h19" }
        ]
      },
      {
        "nom": "Samedi Aller",
        "jours": "S",
        "direction": "Gare de ... → ...",
        "services": [
          { "heureDebut": "06h19", "heureFin": "12h28" },
          { "heureDebut": "14h19", "heureFin": "20h28" }
        ]
      },
      {
        "nom": "Samedi Retour",
        "jours": "S",
        "direction": "... → Gare de ...",
        "services": [
          { "heureDebut": "06h28", "heureFin": "12h19" },
          { "heureDebut": "14h28", "heureFin": "20h19" }
        ]
      },
      {
        "nom": "Dimanche & fériés Aller",
        "jours": "D",
        "direction": "Gare de ... → ...",
        "services": [
          { "heureDebut": "07h19", "heureFin": "13h28" },
          { "heureDebut": "15h19", "heureFin": "21h28" }
        ]
      },
      {
        "nom": "Dimanche & fériés Retour",
        "jours": "D",
        "direction": "... → Gare de ...",
        "services": [
          { "heureDebut": "07h28", "heureFin": "13h19" },
          { "heureDebut": "15h28", "heureFin": "21h19" }
        ]
      }
    ]
  },
  {
    "numero": "4206",
    "nom": "LIGNE_4206",
    "type": "autobus",
    "jours": "L; M; M; J; V; S; D",
    "heureDebut": "05h15",
    "heureFin": "21h07",
    "sens": [
      {
        "nom": "Semaine Aller",
        "jours": "L; M; M; J; V",
        "direction": "Gare de ... → ...",
        "services": [
          { "heureDebut": "05h15", "heureFin": "10h07" },
          { "heureDebut": "12h15", "heureFin": "17h07" },
          { "heureDebut": "18h15", "heureFin": "21h07" }
        ]
      },
      {
        "nom": "Semaine Retour",
        "jours": "L; M; M; J; V",
        "direction": "... → Gare de ...",
        "services": [
          { "heureDebut": "05h25", "heureFin": "10h15" },
          { "heureDebut": "12h25", "heureFin": "17h15" },
          { "heureDebut": "18h25", "heureFin": "21h05" }
        ]
      },
      {
        "nom": "Samedi Aller",
        "jours": "S",
        "direction": "Gare de ... → ...",
        "services": [
          { "heureDebut": "06h15", "heureFin": "12h07" },
          { "heureDebut": "14h15", "heureFin": "20h07" }
        ]
      },
      {
        "nom": "Samedi Retour",
        "jours": "S",
        "direction": "... → Gare de ...",
        "services": [
          { "heureDebut": "06h25", "heureFin": "12h15" },
          { "heureDebut": "14h25", "heureFin": "20h05" }
        ]
      },
      {
        "nom": "Dimanche & fériés Aller",
        "jours": "D",
        "direction": "Gare de ... → ...",
        "services": [
          { "heureDebut": "07h15", "heureFin": "13h07" }
        ]
      },
      {
        "nom": "Dimanche & fériés Retour",
        "jours": "D",
        "direction": "... → Gare de ...",
        "services": [
          { "heureDebut": "07h25", "heureFin": "13h05" }
        ]
      }
    ]
  },
  {
    "numero": "4212",
    "nom": "LIGNE_4212",
    "type": "autobus",
    "jours": "L; M; M; J; V; S; D",
    "heureDebut": "05h59",
    "heureFin": "23h25",
    "sens": [
      {
        "nom": "Semaine Aller",
        "jours": "L; M; M; J; V",
        "direction": "Gare de ... → ...",
        "services": [
          { "heureDebut": "05h59", "heureFin": "10h25" },
          { "heureDebut": "12h59", "heureFin": "17h25" },
          { "heureDebut": "19h59", "heureFin": "23h25" }
        ]
      },
      {
        "nom": "Semaine Retour",
        "jours": "L; M; M; J; V",
        "direction": "... → Gare de ...",
        "services": [
          { "heureDebut": "06h10", "heureFin": "10h59" },
          { "heureDebut": "13h10", "heureFin": "17h59" },
          { "heureDebut": "20h10", "heureFin": "23h10" }
        ]
      },
      {
        "nom": "Samedi Aller",
        "jours": "S",
        "direction": "Gare de ... → ...",
        "services": [
          { "heureDebut": "07h59", "heureFin": "13h25" },
          { "heureDebut": "15h59", "heureFin": "21h25" }
        ]
      },
      {
        "nom": "Samedi Retour",
        "jours": "S",
        "direction": "... → Gare de ...",
        "services": [
          { "heureDebut": "08h10", "heureFin": "13h10" },
          { "heureDebut": "16h10", "heureFin": "21h10" }
        ]
      },
      {
        "nom": "Dimanche & fériés Aller",
        "jours": "D",
        "direction": "Gare de ... → ...",
        "services": [
          { "heureDebut": "08h59", "heureFin": "14h25" }
        ]
      },
      {
        "nom": "Dimanche & fériés Retour",
        "jours": "D",
        "direction": "... → Gare de ...",
        "services": [
          { "heureDebut": "09h10", "heureFin": "14h10" }
        ]
      }
    ]
  },
  {
    "numero": "4213",
    "nom": "LIGNE_4213",
    "type": "autobus",
    "jours": "L; M; M; J; V; S; D",
    "heureDebut": "06h58",
    "heureFin": "18h01",
    "sens": [
      {
        "nom": "Semaine Aller",
        "jours": "L; M; M; J; V",
        "direction": "Gare de ... → ...",
        "services": [
          { "heureDebut": "06h58", "heureFin": "12h01" },
          { "heureDebut": "13h58", "heureFin": "18h01" }
        ]
      },
      {
        "nom": "Semaine Retour",
        "jours": "L; M; M; J; V",
        "direction": "... → Gare de ...",
        "services": [
          { "heureDebut": "07h10", "heureFin": "12h10" },
          { "heureDebut": "14h10", "heureFin": "18h10" }
        ]
      },
      { "nom": "Samedi Aller", "jours": "S", "direction": "Gare de ... → ...", "services": [] },
      { "nom": "Samedi Retour", "jours": "S", "direction": "... → Gare de ...", "services": [] },
      { "nom": "Dimanche & fériés Aller", "jours": "D", "direction": "Gare de ... → ...", "services": [] },
      { "nom": "Dimanche & fériés Retour", "jours": "D", "direction": "... → Gare de ...", "services": [] }
    ]
  },
  {
    "numero": "N139",
    "nom": "NOCTILIEN_N139",
    "type": "autobus",
    "jours": "L; M; M; J; V; S; D",
    "heureDebut": "00h10",
    "heureFin": "07h16",
    "sens": [
      {
        "nom": "Semaine Aller",
        "jours": "L; M; M; J; V",
        "direction": "Paris → Corbeil-Essonnes (Chrono exigée)",
        "services": [{ "heureDebut": "01h35", "heureFin": "07h16" }]
      },
      {
        "nom": "Semaine Retour",
        "jours": "L; M; M; J; V",
        "direction": "Corbeil-Essonnes → Paris (Chrono exigée)",
        "services": [{ "heureDebut": "00h10", "heureFin": "05h56" }]
      },
      {
        "nom": "Samedi Aller",
        "jours": "S",
        "direction": "Paris → Corbeil-Essonnes (Chrono exigée)",
        "services": [{ "heureDebut": "01h35", "heureFin": "07h16" }]
      },
      {
        "nom": "Samedi Retour",
        "jours": "S",
        "direction": "Corbeil-Essonnes → Paris (Chrono exigée)",
        "services": [{ "heureDebut": "00h10", "heureFin": "05h56" }]
      },
      {
        "nom": "Dimanche & fériés Aller",
        "jours": "D",
        "direction": "Paris → Corbeil-Essonnes (Chrono exigée)",
        "services": [{ "heureDebut": "01h35", "heureFin": "07h16" }]
      },
      {
        "nom": "Dimanche & fériés Retour",
        "jours": "D",
        "direction": "Corbeil-Essonnes → Paris (Chrono exigée)",
        "services": [{ "heureDebut": "00h10", "heureFin": "05h56" }]
      }
    ]
  }
];

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
      else {
        // si jamais on a 3e M par erreur, on active mardi+mercredi quand même
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

/**
 * Génère les dates de service pour la semaine courante (lundi -> dimanche)
 * en fonction du calendrier booléen.
 */
function generateServiceDates(calendrier) {
  const dates = [];
  const today = new Date();

  const dayOfWeek = today.getDay(); // 0=dimanche ... 6=samedi
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const monday = new Date(today);
  monday.setDate(today.getDate() - daysToMonday);
  monday.setHours(0, 0, 0, 0);

  const order = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

  for (let i = 0; i < 7; i++) {
    const k = order[i];
    if (calendrier[k]) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
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

        // 1) upsert ligne (1 record par numero)
        const ligne = await prisma.ligne.upsert({
          where: { numero: ligneData.numero },
          create: {
            numero: ligneData.numero,
            nom: ligneData.nom,
            typesVehicules: JSON.stringify([ligneData.type]),
            heureDebut: hDeb,
            heureFin: hFin,
            // calendrierJson global optionnel : on met "tous jours" par défaut
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
              // IMPORTANT: ton unique (ligneId, nom) doit exister en Prisma
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

          // Dates par calendrier DU SENS
          const calendrier = parseJours(sensData.jours);
          const serviceDates = generateServiceDates(calendrier);

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
