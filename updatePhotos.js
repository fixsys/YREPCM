const fs = require('fs');
const path = require('path');

// --- 1. Update laborReports.ts ---
let code = fs.readFileSync('backend/src/routes/laborReports.ts', 'utf8');

// The replacement for the Excel route (from `// Merge into arrays for the template` to `res.setHeader('Content-Type'`)
// Wait, actually I will just inject the photo extraction logic and the Excel page 2 logic before wb.xlsx.write(res)
// For PDF, inject it before ejs.renderFile.

// Helper to inject code
function injectBefore(targetStr, newStr, originalCode) {
    if (!originalCode.includes(targetStr)) {
        console.error('Could not find:', targetStr);
        return originalCode;
    }
    return originalCode.replace(targetStr, newStr + '\n\n' + targetStr);
}

const photoExtractionStr = `
    // --- Extract Photos ---
    const allPhotos = [];
    let parsedPhotos = {};
    try { parsedPhotos = typeof report.photos === 'string' ? JSON.parse(report.photos) : (report.photos || {}); } catch(e){}

    if (parsedPhotos.close) parsedPhotos.close.forEach((url, i) => allPhotos.push({ url, title: \`施工近照 \${i+1}\` }));
    if (parsedPhotos.mid) parsedPhotos.mid.forEach((url, i) => allPhotos.push({ url, title: \`施工中距離照 \${i+1}\` }));
    if (parsedPhotos.far) parsedPhotos.far.forEach((url, i) => allPhotos.push({ url, title: \`施工遠距照 \${i+1}\` }));

    workItems.forEach((item, idx) => {
      if (item.inspection && item.inspection.photo) {
         allPhotos.push({ url: item.inspection.photo, title: \`\${item.name} 自主檢查照片\` });
      }
    });

    const getAbsPath = (url) => {
        if (!url) return null;
        return path.join(__dirname, '../../uploads', url.replace('/uploads/', ''));
    };

    const getBase64 = (url) => {
        const p = getAbsPath(url);
        if (p && fs.existsSync(p)) {
            const ext = path.extname(p).substring(1);
            const b64 = fs.readFileSync(p).toString('base64');
            return \`data:image/\${ext};base64,\${b64}\`;
        }
        return null;
    };

    allPhotos.forEach(p => p.base64 = getBase64(p.url));
`;

// Excel injection
let excelCode = code.substring(0, code.indexOf('// Helper to diff days'));
let pdfCode = code.substring(code.indexOf('// Helper to diff days'));

// In excelCode, inject photo extraction before `const wb = new ExcelJS.Workbook();`
excelCode = injectBefore('const wb = new ExcelJS.Workbook();', photoExtractionStr, excelCode);

// In excelCode, inject page 2 logic before `res.setHeader('Content-Type'`
const excelPage2Str = `
    // --- Page 2: Photos ---
    if (allPhotos.length > 0) {
      r += 2;
      ws.mergeCells(\`A\${r}:H\${r}\`);
      ws.getCell(\`A\${r}\`).value = '施 工 照 片 及 說 明';
      ws.getCell(\`A\${r}\`).font = { name: '微軟正黑體', size: 16, bold: true };
      ws.getCell(\`A\${r}\`).alignment = { vertical: 'middle', horizontal: 'center' };
      ws.getRow(r).height = 30;
      r++;

      ws.mergeCells(\`B\${r}:D\${r}\`);
      ws.getCell(\`A\${r}\`).value = '業主'; applyStyle(ws.getCell(\`A\${r}\`), true);
      ws.getCell(\`B\${r}\`).value = report.project?.owner || ''; applyStyle(ws.getCell(\`B\${r}\`));
      ws.getCell(\`E\${r}\`).value = '填報日期'; applyStyle(ws.getCell(\`E\${r}\`), true);
      ws.getCell(\`F\${r}\`).value = dateStr; applyStyle(ws.getCell(\`F\${r}\`));
      ws.getCell(\`G\${r}\`).value = '星期'; applyStyle(ws.getCell(\`G\${r}\`), true);
      ws.getCell(\`H\${r}\`).value = dayOfWeek; applyStyle(ws.getCell(\`H\${r}\`));
      r++;

      ws.mergeCells(\`B\${r}:D\${r}\`);
      ws.getCell(\`A\${r}\`).value = '工程名稱'; applyStyle(ws.getCell(\`A\${r}\`), true);
      ws.getCell(\`B\${r}\`).value = report.project?.name || ''; applyStyle(ws.getCell(\`B\${r}\`));
      ws.getCell(\`E\${r}\`).value = '容量'; applyStyle(ws.getCell(\`E\${r}\`), true);
      ws.getCell(\`F\${r}\`).value = cap ? (cap.toLowerCase().includes('w') ? cap : cap + ' kW') : ''; applyStyle(ws.getCell(\`F\${r}\`));
      ws.getCell(\`G\${r}\`).value = '本日天氣'; applyStyle(ws.getCell(\`G\${r}\`), true);
      ws.getCell(\`H\${r}\`).value = report.weather || ''; applyStyle(ws.getCell(\`H\${r}\`));
      r++;

      // Photos in pairs
      for (let i = 0; i < allPhotos.length; i += 2) {
         const p1 = allPhotos[i];
         const p2 = allPhotos[i+1];
         
         const rowPhoto = r;
         ws.getRow(rowPhoto).height = 200; // Large height for images
         
         // Create borders for photo cells
         ws.mergeCells(\`A\${rowPhoto}:D\${rowPhoto}\`);
         ws.mergeCells(\`E\${rowPhoto}:H\${rowPhoto}\`);
         applyStyle(ws.getCell(\`A\${rowPhoto}\`));
         applyStyle(ws.getCell(\`E\${rowPhoto}\`));

         // Add images
         if (p1 && p1.base64) {
            const absPath1 = getAbsPath(p1.url);
            if (absPath1 && fs.existsSync(absPath1)) {
              const imageId1 = wb.addImage({ filename: absPath1, extension: path.extname(absPath1).substring(1) });
              ws.addImage(imageId1, {
                  tl: { col: 0.1, row: rowPhoto - 1 + 0.1 },
                  br: { col: 3.9, row: rowPhoto - 0.1 },
                  editAs: 'oneCell'
              });
            }
         }
         
         if (p2 && p2.base64) {
            const absPath2 = getAbsPath(p2.url);
            if (absPath2 && fs.existsSync(absPath2)) {
              const imageId2 = wb.addImage({ filename: absPath2, extension: path.extname(absPath2).substring(1) });
              ws.addImage(imageId2, {
                  tl: { col: 4.1, row: rowPhoto - 1 + 0.1 },
                  br: { col: 7.9, row: rowPhoto - 0.1 },
                  editAs: 'oneCell'
              });
            }
         }
         r++;

         const rowTitle = r;
         ws.getRow(rowTitle).height = 25;
         ws.mergeCells(\`A\${rowTitle}:D\${rowTitle}\`);
         ws.mergeCells(\`E\${rowTitle}:H\${rowTitle}\`);
         ws.getCell(\`A\${rowTitle}\`).value = p1 ? p1.title : ''; applyStyle(ws.getCell(\`A\${rowTitle}\`));
         ws.getCell(\`E\${rowTitle}\`).value = p2 ? p2.title : ''; applyStyle(ws.getCell(\`E\${rowTitle}\`));
         r++;
      }
      
      ws.mergeCells(\`A\${r}:H\${r}\`);
      ws.getCell(\`A\${r}\`).value = \`備註：\`;
      applyStyle(ws.getCell(\`A\${r}\`), false, true);
      ws.getRow(r).height = 40;
      r++;

      ws.mergeCells(\`A\${r}:D\${r}\`); ws.mergeCells(\`E\${r}:H\${r}\`);
      ws.getCell(\`A\${r}\`).value = \`專案經理(PM)：\n\${report.pm?.name || ''}\`;
      applyStyle(ws.getCell(\`A\${r}\`), false, true);
      ws.getCell(\`E\${r}\`).value = \`現場負責人：\n\${report.recorder?.name || ''}\`;
      applyStyle(ws.getCell(\`E\${r}\`), false, true);
      ws.getRow(r).height = 60;
      r++;
    }
`;

excelCode = injectBefore("res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');", excelPage2Str, excelCode);

// PDF injection
pdfCode = injectBefore('let templatePath = path.join(__dirname, \'../templates/labor-report-pdf.ejs\');', photoExtractionStr, pdfCode);

// Also pass `allPhotos` to EJS template
pdfCode = pdfCode.replace('totalEquipAccumulated', 'totalEquipAccumulated,\n      allPhotos, capacity: report.project?.capacity || \'\'');

// Save back
fs.writeFileSync('backend/src/routes/laborReports.ts', excelCode + pdfCode, 'utf8');
console.log('Updated laborReports.ts');

// --- 2. Update EJS Template ---
let ejsCode = fs.readFileSync('backend/src/templates/labor-report-pdf.ejs', 'utf8');

// Insert page break and photos loop right before </body>
const ejsPhotosStr = `
  <% if (typeof allPhotos !== 'undefined' && allPhotos.length > 0) { %>
    <div style="page-break-before: always;"></div>
    
    <div class="watermark">第 2 頁</div>
    
    <div class="header">
      <div class="logo-placeholder">LOGO</div>
      <div class="company-info">
        <div class="company-name">元融科技有限公司 <span class="en">YUANRONG TECHNOLOGY</span></div>
        <div class="company-details">744 台南市新市區港墘里自由街9號 | 06-5897049 | 統編 24903014</div>
      </div>
    </div>

    <div class="title" style="margin-top: 20px;">施工照片及說明</div>

    <table>
      <colgroup>
        <col style="width: 12.5%">
        <col style="width: 12.5%">
        <col style="width: 12.5%">
        <col style="width: 12.5%">
        <col style="width: 12.5%">
        <col style="width: 12.5%">
        <col style="width: 12.5%">
        <col style="width: 12.5%">
      </colgroup>
      
      <tr>
        <td class="bg-gray">業主</td>
        <td colspan="3"><%= report.project?.owner || '' %></td>
        <td class="bg-gray">填報日期</td>
        <td><%= reportDate %></td>
        <td class="bg-gray">星期</td>
        <td><%= dayOfWeek %></td>
      </tr>
      <tr>
        <td class="bg-gray">工程名稱</td>
        <td colspan="3"><%= report.project?.name || '' %></td>
        <td class="bg-gray">容量</td>
        <td><%= capacity ? (capacity.toLowerCase().includes('w') ? capacity : capacity + ' kW') : '' %></td>
        <td class="bg-gray">本日天氣</td>
        <td><%= report.weather || '' %></td>
      </tr>
    </table>

    <table style="margin-top: 10px; table-layout: fixed; width: 100%;">
      <% for(let i=0; i<allPhotos.length; i+=2) { %>
        <tr>
          <td style="height: 320px; padding: 10px; text-align: center; vertical-align: middle; width: 50%; border: 1px solid #000;">
             <% if (allPhotos[i] && allPhotos[i].base64) { %>
               <img src="<%= allPhotos[i].base64 %>" style="max-width: 100%; max-height: 300px; object-fit: contain;">
             <% } %>
          </td>
          <td style="height: 320px; padding: 10px; text-align: center; vertical-align: middle; width: 50%; border: 1px solid #000;">
             <% if (allPhotos[i+1] && allPhotos[i+1].base64) { %>
               <img src="<%= allPhotos[i+1].base64 %>" style="max-width: 100%; max-height: 300px; object-fit: contain;">
             <% } %>
          </td>
        </tr>
        <tr>
          <td style="text-align: center; height: 30px; font-weight: bold; border: 1px solid #000;"><%= allPhotos[i].title %></td>
          <td style="text-align: center; height: 30px; font-weight: bold; border: 1px solid #000;"><%= allPhotos[i+1] ? allPhotos[i+1].title : '' %></td>
        </tr>
      <% } %>
      <tr>
        <td colspan="2" class="left-align" style="height: 40px; vertical-align: top; border: 1px solid #000;">備註：<br></td>
      </tr>
    </table>

    <table style="border: none; margin-top: 10px;">
      <tr class="footer-row">
        <td style="width: 33%">專管：</td>
        <td style="width: 33%">經辦：</td>
        <td style="width: 34%">現場負責人：<br><%= report.recorder?.name || '' %></td>
      </tr>
    </table>
  <% } %>
</body>
`;

ejsCode = ejsCode.replace('</body>', ejsPhotosStr);
fs.writeFileSync('backend/src/templates/labor-report-pdf.ejs', ejsCode, 'utf8');
console.log('Updated labor-report-pdf.ejs');
