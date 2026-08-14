import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('admin', 10);
  await prisma.user.upsert({
    where: { account: 'admin' },
    update: { password_hash: hash },
    create: {
      account: 'admin',
      password_hash: hash,
      name: '系統管理員',
      department: { connect: { name: '管理部' } },
      role: { connect: { name: 'SystemAdmin' } }
    }
  });
  console.log('Password for admin has been reset to "admin"');
  const users = await prisma.user.findMany({ select: { account: true, name: true } });
  console.log('Current users:', users);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
