#!/usr/bin/env node
/**
 * Test script pour vérifier que les routes /api/lignes/* sont bien actives
 */

const API_BASE = process.env.API_URL || 'http://localhost:3000';

async function testEndpoints() {
  console.log(`\n🧪 Testing routes on: ${API_BASE}\n`);
  
  const endpoints = [
    {
      method: 'GET',
      path: '/api/health',
      description: 'Health check'
    },
    {
      method: 'GET',
      path: '/api/lignes',
      description: 'Get all lignes'
    },
    {
      method: 'PUT',
      path: '/api/lignes/test-id/assign-depot',
      description: 'Assign ligne to depot (will fail with test-id but endpoint should exist)',
      body: { etablissementId: 'test-depot' }
    },
    {
      method: 'GET',
      path: '/api/services/test-id/assignable-conductors',
      description: 'Get assignable conductors (will fail with test-id but endpoint should exist)'
    }
  ];

  for (const endpoint of endpoints) {
    try {
      const url = `${API_BASE}${endpoint.path}`;
      const options = {
        method: endpoint.method,
        headers: { 'Content-Type': 'application/json' }
      };

      if (endpoint.body) {
        options.body = JSON.stringify(endpoint.body);
      }

      console.log(`📍 ${endpoint.method} ${endpoint.path}`);
      console.log(`   Description: ${endpoint.description}`);
      
      const response = await fetch(url, options);
      const status = response.status;
      const statusOk = status < 500;
      
      console.log(`   Status: ${status} ${statusOk ? '✅' : '❌'}`);
      
      if (!statusOk) {
        const text = await response.text();
        console.log(`   Error: ${text.substring(0, 100)}`);
      } else {
        try {
          const data = await response.json();
          if (data.routes) {
            console.log(`   Routes available:`, Object.keys(data.routes));
          }
        } catch (e) {
          // OK, just status matters
        }
      }
      console.log('');
    } catch (error) {
      console.error(`   ❌ Connection error: ${error.message}\n`);
    }
  }
}

testEndpoints();
