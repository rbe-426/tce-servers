import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

const allSens = await p.sens.findMany({select: {nom: true, jourFonctionnement: true}, orderBy: {nom: 'asc'}});

console.log("\n🔍 TOUS LES SENS:");
allSens.forEach(s => {
  console.log(`  ${s.nom} → ${s.jourFonctionnement}`);
});

console.log("\n📊 Décompte par jour:");
const byJour = {};
allSens.forEach(s => {
  byJour[s.jourFonctionnement] = (byJour[s.jourFonctionnement] || 0) + 1;
});
Object.entries(byJour).forEach(([jour, count]) => {
  console.log(`  ${jour}: ${count}`);
});

await p.$disconnect();
