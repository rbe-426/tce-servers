import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  try {
    const count = await prisma.service.count();
    
    // Aujourd'hui 19 déc
    const today = new Date('2025-12-19');
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayCount = await prisma.service.count({
      where: {
        date: { gte: today, lt: tomorrow }
      }
    });
    
    console.log('✅ Total:', count);
    console.log('✅ Today (19 déc):', todayCount);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
})();
