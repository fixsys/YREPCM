const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.dailyLaborReport.findFirst().then(r => console.log(r?.id)).finally(() => prisma.$disconnect());
