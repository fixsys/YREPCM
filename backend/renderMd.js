const fs = require('fs');

const data = JSON.parse(fs.readFileSync('excel_dump.json', 'utf8'));

let md = '';

for (const [sheetName, rows] of Object.entries(data)) {
  md += `# ${sheetName}\n\n`;
  md += `| Row | Col 1 | Col 2 | Col 3 | Col 4 | Col 5 | Col 6 | Col 7 | Col 8 |\n`;
  md += `|---|---|---|---|---|---|---|---|---|\n`;
  
  for (const row of rows) {
    const cells = row.data.map(c => {
      if (!c) return '';
      if (c.f) return `**[F: ${c.f}]**<br/>${c.v}`;
      return String(c).replace(/\n/g, '<br/>');
    });
    // Pad to 8 columns
    while (cells.length < 8) cells.push('');
    md += `| ${row.row} | ${cells.slice(0, 8).join(' | ')} |\n`;
  }
  md += '\n\n';
}

fs.writeFileSync('excel_dump.md', md);
