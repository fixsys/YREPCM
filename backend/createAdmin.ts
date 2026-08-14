import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);
  
  // Create or get SystemAdmin role
  const adminRole = await prisma.role.upsert({
    where: { name: 'SystemAdmin' },
    update: { level: 100, description: '系統管理員' },
    create: { name: 'SystemAdmin', level: 100, description: '系統管理員' }
  });

  // Create or get Management department
  const managementDept = await prisma.department.upsert({
    where: { name: '管理部' },
    update: { description: '系統與行政管理' },
    create: { name: '管理部', description: '系統與行政管理' }
  });

  const admin = await prisma.user.upsert({
    where: { account: 'admin' },
    update: {
      password_hash: passwordHash,
      name: '系統管理員',
      department_id: managementDept.id,
      role_id: adminRole.id
    },
    create: {
      account: 'admin',
      password_hash: passwordHash,
      name: '系統管理員',
      department_id: managementDept.id,
      role_id: adminRole.id
    }
  });

  console.log('Admin account created/updated successfully');
  console.log('Account: admin');
  console.log('Password: admin123');
}

main()
  .catch(e => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
