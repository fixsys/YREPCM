const fs = require('fs');
const path = require('path');

let code = fs.readFileSync('backend/src/routes/laborReports.ts', 'utf8');

// --- 1. Pass logoBase64 to EJS ---
const extractCodeStr = `
    const logoPath = path.join(process.cwd(), '../frontend/public/logo.png');
    let logoBase64 = '';
    if (fs.existsSync(logoPath)) {
        logoBase64 = \`data:image/png;base64,\${fs.readFileSync(logoPath).toString('base64')}\`;
    }
`;

code = code.replace('// --- Extract Photos ---', extractCodeStr + '\n    // --- Extract Photos ---');
code = code.replace('capacity: report.project?.capacity || \'\'\n    });', 'capacity: report.project?.capacity || \'\',\n      logoBase64\n    });');

// --- 2. Add Excel Company Header and Logo (Page 1) ---
const excelHeaderStr = `
    let r = 1;

    let logoImageId;
    if (fs.existsSync(logoPath)) {
       logoImageId = wb.addImage({
         filename: logoPath,
         extension: 'png'
       });
    }

    // Company Header
    ws.mergeCells(\`B\${r}:H\${r}\`);
    ws.getCell(\`B\${r}\`).value = '元融科技有限公司 YUANRONG TECHNOLOGY\\n744 台南市新市區港墘里自由街9號 | 06-5897049 | 統編 24903014';
    ws.getCell(\`B\${r}\`).font = { name: '微軟正黑體', size: 12, bold: true };
    ws.getCell(\`B\${r}\`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    ws.getRow(r).height = 40;
    
    if (logoImageId !== undefined) {
      ws.addImage(logoImageId, {
        tl: { col: 0.1, row: r - 1 + 0.1 } as any,
        br: { col: 0.9, row: r - 0.1 } as any,
        editAs: 'oneCell'
      });
    }
    r++;
`;
code = code.replace('let r = 1;', excelHeaderStr);

// --- 3. Add Excel Company Header and Logo (Page 2 Photos) ---
// Find where Page 2 chunk loops and add it if we are on a new page chunk
const excelPage2HeaderStr = `
          // Add Company Header for Photo Pages
          ws.mergeCells(\`B\${r}:H\${r}\`);
          ws.getCell(\`B\${r}\`).value = '元融科技有限公司 YUANRONG TECHNOLOGY\\n744 台南市新市區港墘里自由街9號 | 06-5897049 | 統編 24903014';
          ws.getCell(\`B\${r}\`).font = { name: '微軟正黑體', size: 12, bold: true };
          ws.getCell(\`B\${r}\`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
          ws.getRow(r).height = 40;
          if (logoImageId !== undefined) {
            ws.addImage(logoImageId, {
              tl: { col: 0.1, row: r - 1 + 0.1 } as any,
              br: { col: 0.9, row: r - 0.1 } as any,
              editAs: 'oneCell'
            });
          }
          r++;

          ws.mergeCells(\`A\${r}:H\${r}\`);
          ws.getCell(\`A\${r}\`).value = '施 工 照 片 及 說 明';
`;
code = code.replace(/ws\.mergeCells\(\`A\$\\{r\\}:H\$\\{r\\}\`\);\s+ws\.getCell\(\`A\$\\{r\\}\`\)\.value = '施 工 照 片 及 說 明';/, excelPage2HeaderStr);

fs.writeFileSync('backend/src/routes/laborReports.ts', code, 'utf8');

// --- 4. Update PDF Template ---
let ejsCode = fs.readFileSync('backend/src/templates/labor-report-pdf.ejs', 'utf8');
const logoReplacement = `
    <% if (typeof logoBase64 !== 'undefined' && logoBase64) { %>
      <img src="<%= logoBase64 %>" style="height: 60px; width: auto; max-width: 100px; margin-right: 15px; object-fit: contain;">
    <% } else { %>
      <div class="logo-placeholder">LOGO</div>
    <% } %>
`;
ejsCode = ejsCode.replace(/<div class="logo-placeholder">LOGO<\/div>/g, logoReplacement);
fs.writeFileSync('backend/src/templates/labor-report-pdf.ejs', ejsCode, 'utf8');
