import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAdmin() {
  const adminUser = await prisma.user.findUnique({
    where: { account: 'admin' },
    include: { role: true, department: true }
  });
  console.log('Admin user details:');
  console.log(JSON.stringify(adminUser, null, 2));

  // If role_id or department_id is null, we should fix it here
  if (!adminUser?.role_id || !adminUser?.department_id) {
    const adminRole = await prisma.role.findUnique({ where: { name: 'SystemAdmin' } });
    const adminDept = await prisma.department.findUnique({ where: { name: '管理部' } });
    
    if (adminRole && adminDept) {
      await prisma.user.update({
        where: { account: 'admin' },
        data: { role_id: adminRole.id, department_id: adminDept.id }
      });
      console.log('Fixed admin role_id and department_id!');
    }
  }
}

checkAdmin().catch(console.error).finally(() => prisma.$disconnect());
