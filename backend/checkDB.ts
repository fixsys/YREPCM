import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const tpls = await prisma.workflowTemplate.findMany({ include: { nodes: true, edges: true }, orderBy: { created_at: 'desc' } });
  console.log(JSON.stringify(tpls[0].nodes[0], null, 2));
}
check().finally(() => prisma.$disconnect());
