#!/usr/bin/env node

/**
 * Test script pour vérifier les endpoints de gestion des lignes
 */

const API_URL = 'http://localhost:3001';

async function test() {
  console.log('\n=== TEST API LIGNES ===\n');

  try {
    // Test 1: Récupérer les lignes
    console.log('1️⃣  GET /api/lignes...');
    const linesRes = await fetch(`${API_URL}/api/lignes`);
    if (!linesRes.ok) throw new Error(`Status ${linesRes.status}`);
    const lines = await linesRes.json();
    console.log(`✅ ${lines.length} lignes récupérées`);
    
    if (lines.length === 0) {
      console.log('⚠️  Aucune ligne dans la DB');
      return;
    }

    const testLine = lines[0];
    console.log(`   Première ligne: ${testLine.numero} (ID: ${testLine.id})`);

    // Test 2: Récupérer les véhicules disponibles (si ligne affectée)
    if (testLine.etablissementId) {
      console.log(`\n2️⃣  GET /api/lignes/${testLine.id}/available-vehicles...`);
      const vehiclesRes = await fetch(`${API_URL}/api/lignes/${testLine.id}/available-vehicles`);
      if (vehiclesRes.ok) {
        const vehicles = await vehiclesRes.json();
        console.log(`✅ ${vehicles.length} véhicules disponibles`);
      } else {
        console.log(`⚠️  Erreur: ${vehiclesRes.status}`);
      }

      // Test 3: Récupérer les conducteurs disponibles
      console.log(`\n3️⃣  GET /api/lignes/${testLine.id}/available-conducteurs...`);
      const conductorsRes = await fetch(`${API_URL}/api/lignes/${testLine.id}/available-conducteurs`);
      if (conductorsRes.ok) {
        const conductors = await conductorsRes.json();
        console.log(`✅ ${conductors.length} conducteurs disponibles`);
      } else {
        console.log(`⚠️  Erreur: ${conductorsRes.status}`);
      }
    } else {
      console.log(`\n⚠️  Ligne ${testLine.numero} non affectée à un dépôt`);
    }

    console.log('\n✅ TESTS COMPLETS\n');

  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    process.exit(1);
  }
}

test();
