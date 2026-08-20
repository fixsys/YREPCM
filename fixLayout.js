const fs = require('fs');
const path = require('path');

// --- 1. Update laborReports.ts (Excel logic) ---
let code = fs.readFileSync('backend/src/routes/laborReports.ts', 'utf8');

const newExcelStr = `
    // --- Page 2: Photos ---
    if (allPhotos.length > 0) {
      for (let pIndex = 0; pIndex < allPhotos.length; pIndex += 6) {
          r += 2; // Some margin
          
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
          const cap = report.project?.capacity || '';
          ws.getCell(\`F\${r}\`).value = cap ? (cap.toLowerCase().includes('w') ? cap : cap + ' kW') : ''; applyStyle(ws.getCell(\`F\${r}\`));
          ws.getCell(\`G\${r}\`).value = '本日天氣'; applyStyle(ws.getCell(\`G\${r}\`), true);
          ws.getCell(\`H\${r}\`).value = report.weather || ''; applyStyle(ws.getCell(\`H\${r}\`));
          r++;

          // Up to 3 rows of photos (6 photos max)
          const chunk = allPhotos.slice(pIndex, pIndex + 6);
          for (let i = 0; i < chunk.length; i += 2) {
             const p1 = chunk[i];
             const p2 = chunk[i+1];
             
             const rowPhoto = r;
             ws.getRow(rowPhoto).height = 200; // Adjusted for 3 rows
             
             ws.mergeCells(\`A\${rowPhoto}:D\${rowPhoto}\`);
             ws.mergeCells(\`E\${rowPhoto}:H\${rowPhoto}\`);
             applyStyle(ws.getCell(\`A\${rowPhoto}\`));
             applyStyle(ws.getCell(\`E\${rowPhoto}\`));

             if (p1 && p1.base64) {
                const absPath1 = getAbsPath(p1.url);
                if (absPath1 && fs.existsSync(absPath1)) {
                  const imageId1 = wb.addImage({ filename: absPath1, extension: path.extname(absPath1).substring(1) as any });
                  ws.addImage(imageId1, {
                      tl: { col: 0.1, row: rowPhoto - 1 + 0.1 } as any,
                      br: { col: 3.9, row: rowPhoto - 0.1 } as any,
                      editAs: 'oneCell'
                  });
                }
             }
             
             if (p2 && p2.base64) {
                const absPath2 = getAbsPath(p2.url);
                if (absPath2 && fs.existsSync(absPath2)) {
                  const imageId2 = wb.addImage({ filename: absPath2, extension: path.extname(absPath2).substring(1) as any });
                  ws.addImage(imageId2, {
                      tl: { col: 4.1, row: rowPhoto - 1 + 0.1 } as any,
                      br: { col: 7.9, row: rowPhoto - 0.1 } as any,
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
          ws.getCell(\`A\${r}\`).value = \`專案經理(PM)：\\n\${report.pm?.name || ''}\`;
          applyStyle(ws.getCell(\`A\${r}\`), false, true);
          ws.getCell(\`E\${r}\`).value = \`現場負責人：\\n\${report.recorder?.name || ''}\`;
          applyStyle(ws.getCell(\`E\${r}\`), false, true);
          ws.getRow(r).height = 60;
          r++;
          
          // Add page break if there are more chunks
          if (pIndex + 6 < allPhotos.length) {
              ws.getRow(r - 1).addPageBreak();
          }
      }
    }
`;

const startIndex = code.indexOf('// --- Page 2: Photos ---');
const endIndexStr = "res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');";
const endIndex = code.indexOf(endIndexStr);

code = code.substring(0, startIndex) + newExcelStr + '\n    ' + code.substring(endIndex);

fs.writeFileSync('backend/src/routes/laborReports.ts', code, 'utf8');

// --- 2. Update labor-report-pdf.ejs ---
let ejsCode = fs.readFileSync('backend/src/templates/labor-report-pdf.ejs', 'utf8');
const ejsStart = ejsCode.indexOf('<% if (typeof allPhotos !== \'undefined\' && allPhotos.length > 0) { %>');
const ejsEnd = ejsCode.indexOf('</body>');

const newEjsStr = `  <% if (typeof allPhotos !== 'undefined' && allPhotos.length > 0) { %>
    <% for(let pIndex=0; pIndex<allPhotos.length; pIndex+=6) { %>
    <div style="page-break-before: always;"></div>
    
    <div class="watermark">第 <%= 2 + Math.floor(pIndex/6) %> 頁</div>
    
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
      <% 
         const chunk = allPhotos.slice(pIndex, pIndex + 6);
         for(let i=0; i<chunk.length; i+=2) { 
      %>
        <tr>
          <td style="height: 220px; padding: 10px; text-align: center; vertical-align: middle; width: 50%; border: 1px solid #000;">
             <% if (chunk[i] && chunk[i].base64) { %>
               <img src="<%= chunk[i].base64 %>" style="max-width: 100%; max-height: 200px; object-fit: contain;">
             <% } %>
          </td>
          <td style="height: 220px; padding: 10px; text-align: center; vertical-align: middle; width: 50%; border: 1px solid #000;">
             <% if (chunk[i+1] && chunk[i+1].base64) { %>
               <img src="<%= chunk[i+1].base64 %>" style="max-width: 100%; max-height: 200px; object-fit: contain;">
             <% } %>
          </td>
        </tr>
        <tr>
          <td style="text-align: center; height: 30px; font-weight: bold; border: 1px solid #000;"><%= chunk[i].title %></td>
          <td style="text-align: center; height: 30px; font-weight: bold; border: 1px solid #000;"><%= chunk[i+1] ? chunk[i+1].title : '' %></td>
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
  <% } %>
`;

ejsCode = ejsCode.substring(0, ejsStart) + newEjsStr + '</body>\n</html>';
fs.writeFileSync('backend/src/templates/labor-report-pdf.ejs', ejsCode, 'utf8');
