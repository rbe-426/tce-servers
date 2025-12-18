import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

const s = await p.service.deleteMany({});
console.log('Services supprimés:', s.count);
await p.$disconnect();
