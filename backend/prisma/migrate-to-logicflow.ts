import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting migration to LogicFlow coordinate system...');

  const nodes = await prisma.workflowNode.findMany();

  for (const node of nodes) {
    let offsetX = 50;
    let offsetY = 30; // default for tasks

    if (node.type === 'CONDITION') {
      offsetX = 50;
      offsetY = 50; // diamond was 100x100 in our previous CustomNodes
    }

    const newX = (node.position_x || 0) + offsetX;
    const newY = (node.position_y || 0) + offsetY;

    await prisma.workflowNode.update({
      where: { id: node.id },
      data: {
        position_x: newX,
        position_y: newY,
      }
    });

    console.log(`Updated node ${node.id} (${node.name}): from (${node.position_x}, ${node.position_y}) to (${newX}, ${newY})`);
  }

  console.log('Migration completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
