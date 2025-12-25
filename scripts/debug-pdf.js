#!/usr/bin/env node
import { createRequire } from "node:module";
import fs from "fs";
import path from "path";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

async function debugPDF(pdfPath) {
  const buf = fs.readFileSync(pdfPath);
  const pdfParser = new PDFParse(buf);
  const rawText = pdfParser.text || "";
  
  console.log("========== PDF CONTENU ==========");
  console.log(`Fichier: ${path.basename(pdfPath)}`);
  console.log(`Taille texte: ${rawText.length} chars`);
  console.log(`Nombre de pages: ${pdfParser.numpages || '?'}`);
  console.log("\n========== PREMIERS 2000 CHARS ==========");
  console.log(rawText.substring(0, 2000));
  console.log("\n========== CONTIENT DES HEURES (HH:MM) ? ==========");
  const timeMatches = rawText.match(/\d{1,2}:\d{2}/g) || [];
  console.log(`Heures trouvées: ${timeMatches.slice(0, 20).join(", ")}`);
  console.log(`Total heures: ${timeMatches.length}`);
}

const pdfFile = process.argv[2] || "./scripts/pdfs/4201.pdf";
debugPDF(pdfFile).catch(e => console.error("Erreur:", e.message));
