import * as xlsx from 'xlsx';
import * as fs from 'fs';

const filePath = 'c:\\Users\\user\\Desktop\\YRPM\\SHEET001.xlsx';
const workbook = xlsx.readFile(filePath, { cellFormula: true, cellDates: true, cellNF: true });

console.log("Sheets:", workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
  console.log(`\n=== Sheet: ${sheetName} ===\n`);
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON with raw values, formulas
  const range = xlsx.utils.decode_range(worksheet['!ref'] || 'A1:A1');
  
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
          rowData.push(`[Formula: ${cell.f}] (${cell.v})`);
        } else {
          rowData.push(cell.w || cell.v);
        }
      }
    }
    // Only print rows that aren't completely empty
    if (rowData.some(val => val !== '')) {
      console.log(`Row ${R + 1}: `, rowData.join(' | '));
    }
  }
});
