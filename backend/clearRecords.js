const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const laborDelete = await prisma.dailyLaborReport.deleteMany({});
  const toolboxDelete = await prisma.toolboxMeeting.deleteMany({});
  console.log(`Deleted ${laborDelete.count} DailyLaborReports and ${toolboxDelete.count} ToolboxMeetings.`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
