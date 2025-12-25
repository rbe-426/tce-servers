#!/usr/bin/env node

/**
 * Diagnose 404 errors and missing endpoints
 */

const API_URL = process.env.API_URL || 'https://tce-serv-rbe-serveurs.up.railway.app';

const endpoints = [
  '/api/lignes',
  '/api/lignes/test/assign-depot',
  '/api/mercatos',
  '/api/depots/test-id/personnel/stats',
  '/api/depots/test-id/personnel',
  '/api/depots/test-id/vehicle-needs',
  '/api/vehicle-needs/mercato-suggestions?depotId=test',
];

console.log('\n🔍 Diagnostic des endpoints\n');
console.log(`API URL: ${API_URL}\n`);

async function test() {
  for (const endpoint of endpoints) {
    try {
      const url = `${API_URL}${endpoint}`;
      const res = await fetch(url, {
        method: endpoint.includes('assign-depot') ? 'PUT' : 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const status = `${res.status}`.startsWith('2') ? '✅' : '❌';
      console.log(`${status} ${res.status.toString().padEnd(3)} ${endpoint}`);
      
      if (!res.ok && res.status === 404) {
        console.log(`   → Endpoint NOT FOUND - ne peut pas être appelé`);
      }
    } catch (err) {
      console.log(`❌ ERR  ${endpoint}`);
      console.log(`   → ${err.message}`);
    }
  }
  console.log('');
}

test();
