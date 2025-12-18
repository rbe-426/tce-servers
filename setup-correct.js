#!/usr/bin/env node

/**
 * SIMPLE ET CLAIR: 
 * Pour chaque jour du mois, créer UNE instance par sens correspondant
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function simpleSetup() {
  console.log("🚀 SETUP SIMPLE - Services Corrects\n");

  try {
    // 1. Supprimer TOUS les services
    const dels = await prisma.service.deleteMany({});
    console.log(`1️⃣  ${dels.count} services supprimés\n`);

    // 2. Pour CHAQUE jour du mois
    // ⚠️ IMPORTANT: Utiliser la date locale, pas UTC!
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + 1);

    console.log(`Génération du ${today.toLocaleDateString('fr-FR')} au ${endDate.toLocaleDateString('fr-FR')}\n`);

    let createdCount = 0;
    const currentDate = new Date(today);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay(); // 0=dim, 1=lun, ..., 6=sam
      const dateStr = currentDate.toLocaleDateString('fr-FR');
      
      // Déterminer le jourFonctionnement réel pour ce jour
      let jourReel = 'SEMAINE';
      if (dayOfWeek === 6) jourReel = 'SAMEDI';
      if (dayOfWeek === 0) jourReel = 'DIMANCHE_FERIES';
      
      // Récupérer SEULEMENT les sens avec ce jourFonctionnement
      const sensPourCeJour = await prisma.sens.findMany({
        where: { jourFonctionnement: jourReel }
      });
      
      if (sensPourCeJour.length > 0) {
        console.log(`${dateStr} (${jourReel}): ${sensPourCeJour.length} services`);
      }
      
      // Créer une instance pour chaque sens
      for (const sens of sensPourCeJour) {
        // ⚠️ Créer la date EN UTC pour éviter les décalages timezone
        const serviceDate = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()));
        
        await prisma.service.create({
          data: {
            ligneId: sens.ligneId,
            sensId: sens.id,
            date: serviceDate,
            heureDebut: '09:00',
            heureFin: '17:00',
            statut: 'Planifiée'
          }
        });
        createdCount++;
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`2️⃣  ${createdCount} services créés pour 1 mois\n`);
    console.log("=".repeat(60));
    console.log("✅ SETUP RÉUSSI");
    console.log("=".repeat(60));

  } catch (error) {
    console.error("\n💥 Erreur:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

simpleSetup();
