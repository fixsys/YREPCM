import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 開始建立初始資料 (Seeding database)...');

  // 1. 確保有最高權限的 Role
  let adminRole = await prisma.role.findFirst({
    where: { level: 100 }
  });

  if (!adminRole) {
    adminRole = await prisma.role.create({
      data: {
        name: '系統管理員',
        level: 100,
        description: '擁有系統最高權限'
      }
    });
    console.log('✅ 已建立預設角色：系統管理員');
  }

  // 2. 確保有 admin 帳號
  const existingAdmin = await prisma.user.findUnique({
    where: { account: 'admin' }
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        account: 'admin',
        password_hash: passwordHash,
        name: '管理員',
        role_id: adminRole.id,
        is_active: true
      }
    });
    console.log('✅ 已建立預設帳號：admin / admin123');
  } else {
    console.log('⚠️ 預設帳號 admin 已存在，跳過建立。');
  }

  console.log('🎉 初始資料建立完成！');
}

main()
  .catch((e) => {
    console.error('❌ 建立資料失敗:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
