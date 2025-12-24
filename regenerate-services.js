import axios from 'axios';

const API_URL = 'http://localhost:8080';

(async () => {
  try {
    console.log('🚀 Génération des services pour 14 jours...');
    const response = await axios.post(`${API_URL}/api/services/generate`, {
      days: 14
    });
    
    console.log('\n✅ ' + response.data.message);
    console.log(`   Créés: ${response.data.created}`);
    console.log(`   Existants: ${response.data.skipped}`);
  } catch (e) {
    console.error('❌ Erreur:', e.response?.data || e.message);
  }
})();
