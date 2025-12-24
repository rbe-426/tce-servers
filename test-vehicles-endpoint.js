#!/usr/bin/env node

/**
 * Test simple pour vérifier que l'endpoint /api/vehicles/:parc fonctionne
 * Utilisation: node test-vehicles-endpoint.js [API_URL]
 * Ex: node test-vehicles-endpoint.js http://localhost:5000
 */

const API_URL = process.argv[2] || 'http://localhost:5000';

async function testVehicleEndpoint(parc) {
  try {
    console.log(`\n🚌 Test GET /api/vehicles/${parc}`);
    const response = await fetch(`${API_URL}/api/vehicles/${parc}`);
    
    if (response.ok) {
      const vehicle = await response.json();
      console.log('✅ Succès!');
      console.log(`  Parc: ${vehicle.parc}`);
      console.log(`  Type: ${vehicle.type}`);
      console.log(`  Modèle: ${vehicle.modele}`);
      console.log(`  Statut: ${vehicle.statut}`);
      console.log(`  Interventions: ${vehicle.interventions?.length || 0}`);
      return true;
    } else {
      console.log(`❌ Erreur ${response.status}: ${response.statusText}`);
      const error = await response.json();
      console.log(`  ${error.error}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Erreur de connexion: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log(`🔧 Test des endpoints /api/vehicles`);
  console.log(`📍 API URL: ${API_URL}`);
  
  // Test plusieurs parcs
  const testParcs = ['255', '1000', '1', '2'];
  
  const results = [];
  for (const parc of testParcs) {
    const success = await testVehicleEndpoint(parc);
    results.push({ parc, success });
    await new Promise(resolve => setTimeout(resolve, 100)); // Petit délai entre les requêtes
  }
  
  console.log('\n📊 Résumé:');
  const successful = results.filter(r => r.success).length;
  console.log(`  ${successful}/${results.length} parcs testés avec succès`);
  
  if (successful === 0) {
    console.log('\n⚠️ ATTENTION: Aucun véhicule n\'a été trouvé!');
    console.log('   Vérifiez que:');
    console.log('   1. L\'API est disponible sur ' + API_URL);
    console.log('   2. Des véhicules existent en base de données');
    console.log('   3. Les parcs testés existent');
  }
}

runTests().then(() => {
  console.log('\n✅ Tests terminés\n');
  process.exit(0);
}).catch(err => {
  console.error('❌ Erreur fatale:', err);
  process.exit(1);
});
