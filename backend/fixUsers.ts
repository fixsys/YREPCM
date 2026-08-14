import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixUsers() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { department_id: null },
        { role_id: null }
      ]
    }
  });

  const defaultRole = await prisma.role.findFirst({ where: { name: 'Staff' } });
  const managerRole = await prisma.role.findFirst({ where: { name: 'DepartmentManager' } });
  
  const deptGongWu = await prisma.department.findFirst({ where: { name: '工務部' } });
  const deptYeWu = await prisma.department.findFirst({ where: { name: '業務部' } });

  for (const user of users) {
    let roleId = user.role_id;
    let deptId = user.department_id;

    if (!roleId) {
      if (user.account === 'Y0093') roleId = managerRole?.id || null;
      else roleId = defaultRole?.id || null;
    }

    if (!deptId) {
      if (user.account === 'Y0093') deptId = deptYeWu?.id || null;
      else deptId = deptGongWu?.id || null;
    }

    if (roleId || deptId) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          role_id: roleId,
          department_id: deptId
        }
      });
      console.log(`Fixed user: ${user.account}`);
    }
  }
}

fixUsers().catch(console.error).finally(() => prisma.$disconnect());
