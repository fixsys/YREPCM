const xlsx = require('xlsx');
const fs = require('fs');

const filePath = 'c:\\Users\\user\\Desktop\\YRPM\\SHEET001.xlsx';
const workbook = xlsx.readFile(filePath, { cellFormula: true, cellDates: true, cellNF: true });

const output = {};

workbook.SheetNames.forEach(sheetName => {
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet['!ref']) return;

  const range = xlsx.utils.decode_range(worksheet['!ref']);
  const sheetData = [];
  
  for (let R = range.s.r; R <= range.e.r; ++R) {
    let rowData = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = {c:C, r:R};
      const cellRef = xlsx.utils.encode_cell(cellAddress);
      const cell = worksheet[cellRef];
      if (!cell) {
        rowData.push('');
      } else {
        if (cell.f) {
          rowData.push({ v: cell.v, f: cell.f });
        } else {
          rowData.push(cell.w || cell.v);
        }
      }
    }
    if (rowData.some(val => val !== '')) {
      sheetData.push({ row: R + 1, data: rowData });
    }
  }
  output[sheetName] = sheetData;
});

fs.writeFileSync('excel_dump.json', JSON.stringify(output, null, 2));
