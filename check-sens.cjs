import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

const allSens = await p.sens.findMany({select: {nom: true, jourFonctionnement: true}});

console.log("\n🔍 TOUS LES SENS:");
for (const s of allSens) {
  console.log(`  ${s.nom} → ${s.jourFonctionnement}`);
}

await p.$disconnect();

