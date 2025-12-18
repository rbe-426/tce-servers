import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testEndpoint() {
  try {
    console.log('[TEST] Starting server endpoint test...');
    
    // Simulate the exact query from the endpoint without parameters
    console.log('[TEST] Query 1: No parameters (with limit to prevent hang)');
    let services = await prisma.service.findMany({
      include: { ligne: true, conducteur: true },
      orderBy: { date: 'asc' },
      take: 100  // Added limit to prevent memory issues
    });
    console.log('✅ Success, found:', services.length);
    
    // Try with date parameter
    console.log('[TEST] Query 2: With date filter');
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const d = new Date(today);
    const nextDay = new Date(d);
    nextDay.setDate(nextDay.getDate() + 1);
    
    services = await prisma.service.findMany({
      where: {
        date: { gte: d, lt: nextDay }
      },
      include: { ligne: true, conducteur: true },
      orderBy: { date: 'asc' },
      take: 10
    });
    console.log('✅ Success, found:', services.length);
    
    // Try with dateFrom/dateTo
    console.log('[TEST] Query 3: With dateFrom/dateTo');
    const dateFrom = '2025-12-19';
    const dateTo = '2025-12-20';
    const [yearF, monthF, dayF] = dateFrom.split('-').map(Number);
    const [yearT, monthT, dayT] = dateTo.split('-').map(Number);
    const startDate = new Date(yearF, monthF - 1, dayF, 0, 0, 0, 0);
    const endDate = new Date(yearT, monthT - 1, dayT, 0, 0, 0, 0);
    endDate.setDate(endDate.getDate() + 1);
    
    services = await prisma.service.findMany({
      where: {
        date: { gte: startDate, lt: endDate }
      },
      include: { ligne: true, conducteur: true },
      orderBy: { date: 'asc' },
      take: 10
    });
    console.log('✅ Success, found:', services.length);
    
    console.log('\n✅ All endpoint queries work correctly!');
    
  } catch (e) {
    console.error('❌ Error:', e.message);
    console.error('Code:', e.code);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

testEndpoint();
