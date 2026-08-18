const ExcelJS = require('exceljs');
async function run() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('C:/Users/user/Desktop/YRPM/施工日誌.xlsx');
  const ws = wb.worksheets[0];
  ws.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      if (cell.value) {
        console.log(`Cell ${cell.address}: ${JSON.stringify(cell.value)}`);
      }
    });
  });
}
run().catch(console.error);
