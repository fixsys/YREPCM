const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const report = await prisma.dailyLaborReport.create({
    data: {
      project_id: 'ad441944-15f1-47a3-bd77-cc50a7ea972e',
      report_date: new Date(),
      weather: '晴',
      recorder_id: '5860f4a6-9880-4a5c-80e8-55e29c8ad3da',
      work_category: '土木',
      photos: { close: [], mid: [], far: [] }
    }
  });
  console.log('Created:', JSON.stringify(report.photos));
}
main().finally(() => prisma.$disconnect());
