const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetAdmin() {
  const hash = await bcrypt.hash('admin123', 10);
  await prisma.user.updateMany({
    where: { account: 'admin' },
    data: { password_hash: hash }
  });
  console.log('Admin password reset to admin123');
}

resetAdmin()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
