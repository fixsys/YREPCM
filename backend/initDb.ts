import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  const adminRole = await prisma.role.upsert({
    where: { name: 'SystemAdmin' },
    update: {},
    create: { name: 'SystemAdmin', level: 100, description: '系統管理員' }
  });

  const managementDept = await prisma.department.upsert({
    where: { name: '管理部' },
    update: {},
    create: { name: '管理部', description: '管理部' }
  });

  const existingAdmin = await prisma.user.findUnique({
    where: { account: 'admin' },
  });

  if (!existingAdmin) {
    const password_hash = await bcrypt.hash('admin', 10);
    await prisma.user.create({
      data: {
        account: 'admin',
        password_hash,
        name: '系統管理員',
        department_id: managementDept.id,
        role_id: adminRole.id,
      },
    });
    console.log('Default admin user created.');
  } else {
    console.log('Admin user already exists.');
  }
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
