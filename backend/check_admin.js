const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  console.log(await prisma.user.findUnique({ where: { account: 'admin' }, include: { role: true } }));
}
main().finally(() => prisma.$disconnect());
