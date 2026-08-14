const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const res = await prisma.dailyLaborReport.findMany({ orderBy: { created_at: 'desc' }, take: 5 });
  res.forEach(r => console.log(r.id, r.photos));
}
main().finally(() => prisma.$disconnect());
