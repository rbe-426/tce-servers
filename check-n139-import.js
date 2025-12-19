import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  const ligne = await prisma.ligne.findUnique({
    where: { numero: 'N139' },
    include: { 
      sens: {
        include: { services: true }
      }
    }
  });
  
  console.log('=== Ligne N139 ===');
  console.log('ID:', ligne.id);
  console.log('Num:', ligne.numero);
  console.log('Calendrier:', JSON.parse(ligne.calendrierJson));
  console.log('');
  
  for (const s of ligne.sens) {
    console.log(`\n📍 Sens: ${s.nom}`);
    console.log(`   Services count: ${s.services.length}`);
    if (s.services.length > 0) {
      s.services.slice(0, 3).forEach(srv => {
        console.log(`   - ${new Date(srv.date).toISOString().split('T')[0]} ${srv.heureDebut}-${srv.heureFin}`);
      });
    }
  }
  
  await prisma.$disconnect();
})().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
