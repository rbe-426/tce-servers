import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  try {
    const count = await prisma.service.count();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayCount = await prisma.service.count({
      where: {
        date: { gte: today, lt: tomorrow }
      }
    });
    
    console.log('Total services:', count);
    console.log('Services today:', todayCount);
    
    if (todayCount > 0) {
      const sample = await prisma.service.findFirst({
        include: { ligne: true }
      });
      console.log('Sample service:', JSON.stringify(sample, null, 2));
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
