import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.workflowNode.findMany({ where: { template_id: "aedafea1-9b56-4869-bc57-a5844373e09e"} }).then(nodes => console.log(JSON.stringify(nodes, null, 2))).finally(() => prisma.$disconnect());
