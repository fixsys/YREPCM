import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.workflowEdge.findMany().then(e => console.log(JSON.stringify(e.slice(-5), null, 2))).finally(() => prisma.$disconnect());
