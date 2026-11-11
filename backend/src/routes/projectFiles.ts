import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import puppeteer from 'puppeteer';
import { PDFDocument } from 'pdf-lib';
import * as XLSX from 'xlsx';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware';

const router = Router({ mergeParams: true });
const prisma = new PrismaClient();

const uploadDir = path.join(__dirname, '../../uploads/projects');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // 處理由於中文字符導致的檔名亂碼問題，改用 Buffer 轉換
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

export const EXECUTION_BOOK_ITEMS = [
  { indexLabel: '一', category: '合約', departments: ['業務部', '法務部'], legacyAliases: ['合約', '一、合約'] },
  { indexLabel: '二', category: '預算書', departments: ['預算組'], legacyAliases: ['預算書', '二、預算書'] },
  { indexLabel: '三', category: '施工計畫', departments: ['工務部', '工務部'], legacyAliases: ['施工計畫', '三、施工計畫', '施工規範', '施工進度表', '施工品檢表'] },
  { indexLabel: '四', category: '採購計畫', departments: ['採購'], legacyAliases: ['採購計畫', '四、採購計畫', '追加項目'] },
  { indexLabel: '五', category: '結構計算書', departments: ['工務部'], legacyAliases: ['結構計算書', '五、結構計算書', '結構計算書及圖說'] },
  { indexLabel: '六', category: '加工圖面', departments: ['設計部'], legacyAliases: ['加工圖面', '六、加工圖面'] },
  { indexLabel: '七', category: 'Bom表', departments: ['設計部'], legacyAliases: ['Bom表', 'BOM表', '七、Bom表'] },
  { indexLabel: '八', category: '內部異常單', departments: [''], legacyAliases: ['內部異常單', '八、內部異常單'] },
];

// Get files for project
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const projectId = req.params.projectId as string;
    const files = await prisma.projectFile.findMany({
      where: { project_id: projectId },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            department: { select: { name: true } }
          }
        }
      },
      orderBy: { uploaded_at: 'desc' }
    });
    res.json(files);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '獲取檔案失敗' });
  }
});

// Upload one or multiple files (no file count limit)
router.post('/', authenticateToken, upload.any(), async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ error: '未授權' });
  const projectId = req.params.projectId as string;
  const { category } = req.body;
  const uploadedFiles = (req.files as Express.Multer.File[]) || (req.file ? [req.file] : []);

  if (!uploadedFiles || uploadedFiles.length === 0) {
    return res.status(400).json({ error: '無上傳檔案' });
  }
  if (!category) return res.status(400).json({ error: '未提供檔案類別' });

  try {
    const createdFiles = await Promise.all(
      uploadedFiles.map(file =>
        prisma.projectFile.create({
          data: {
            project_id: projectId,
            category,
            file_name: file.originalname,
            file_path: `/uploads/projects/${file.filename}`,
            uploaded_by: req.user!.id
          },
          include: {
            uploader: {
              select: {
                id: true,
                name: true,
                department: { select: { name: true } }
              }
            }
          }
        })
      )
    );
    res.json(createdFiles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '上傳檔案失敗' });
  }
});

const exportProgressMap = new Map<string, {
  percent: number;
  step: string;
  detail: string;
  currentIndex: number;
  updatedAt: number;
}>();

// Get real-time PDF export progress
router.get('/export-progress', authenticateToken, async (req: AuthRequest, res) => {
  const projectId = req.params.projectId as string;
  const progress = exportProgressMap.get(projectId) || {
    percent: 5,
    step: '正在初始化 PDF 整合引擎...',
    detail: '準備讀取專案與執行書資料',
    currentIndex: -1,
    updatedAt: Date.now()
  };
  res.json(progress);
});

// Export entire 開案執行書 as a single merged PDF
router.get('/export-pdf', authenticateToken, async (req: AuthRequest, res) => {
  const projectId = req.params.projectId as string;
  let browser: any = null;

  const updateProgress = (percent: number, step: string, detail: string, currentIndex: number) => {
    exportProgressMap.set(projectId, {
      percent: Math.min(100, Math.max(0, Math.round(percent))),
      step,
      detail,
      currentIndex,
      updatedAt: Date.now()
    });
  };

  try {
    updateProgress(8, '正在讀取專案與開案執行書資料...', '載入部門負責人與各章節附件清單', -1);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        salesRep: { select: { id: true, name: true } },
        engRep: { select: { id: true, name: true } },
        designRep: { select: { id: true, name: true } },
        procurementRep: { select: { id: true, name: true } },
        steelRep: { select: { id: true, name: true } },
      }
    });

    if (!project) {
      return res.status(404).json({ error: '找不到該專案' });
    }

    const files = await prisma.projectFile.findMany({
      where: { project_id: projectId },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            department: { select: { name: true } }
          }
        }
      },
      orderBy: { uploaded_at: 'asc' }
    });

    const escapeHtml = (str: string) =>
      String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const now = new Date();
    const versionDateStr = `版次：${now.getFullYear()}年 ${String(now.getMonth() + 1).padStart(2, '0')} 月 ${String(now.getDate()).padStart(2, '0')} 日`;
    const coverSubtitle = [project.project_code, project.owner, project.name].filter(Boolean).join('-');
    const tocHeaderTitle = [project.owner, project.name].filter(Boolean).join(' ');

    const getItemFiles = (item: typeof EXECUTION_BOOK_ITEMS[number]) => {
      return files.filter(f => item.legacyAliases.includes(f.category));
    };

    const getResponsibleNames = (item: typeof EXECUTION_BOOK_ITEMS[number], subIndex: number): string => {
      const itemFiles = getItemFiles(item);
      const uniqueUploaders = Array.from(new Set(itemFiles.map(f => f.uploader?.name).filter(Boolean))) as string[];

      if (item.category === '合約') {
        if (subIndex === 0) {
          const salesUploaders = itemFiles
            .filter(f => f.uploader?.department?.name?.includes('業務'))
            .map(f => f.uploader?.name)
            .filter(Boolean);
          if (salesUploaders.length > 0) return Array.from(new Set(salesUploaders)).join('、');
          return project.salesRep?.name || uniqueUploaders[0] || '';
        } else {
          const legalUploaders = itemFiles
            .filter(f => f.uploader?.department?.name?.includes('法務'))
            .map(f => f.uploader?.name)
            .filter(Boolean);
          if (legalUploaders.length > 0) return Array.from(new Set(legalUploaders)).join('、');
          return uniqueUploaders.length > 1 ? uniqueUploaders.slice(1).join('、') : '';
        }
      }

      if (item.category === '施工計畫') {
        if (subIndex === 0) {
          return uniqueUploaders[0] || project.engRep?.name || '';
        } else {
          return uniqueUploaders.slice(1).join('、') || '';
        }
      }

      if (uniqueUploaders.length > 0) {
        return uniqueUploaders.join('、');
      }

      if (item.category === '採購計畫') return project.procurementRep?.name || '';
      if (item.category === '結構計算書') return project.engRep?.name || '';
      if (item.category === '加工圖面' || item.category === 'Bom表') return project.designRep?.name || '';
      return '';
    };

    const tocRowsHtml = EXECUTION_BOOK_ITEMS.map(item => {
      if (item.departments.length === 2) {
        const rep0 = escapeHtml(getResponsibleNames(item, 0));
        const rep1 = escapeHtml(getResponsibleNames(item, 1));
        return `
          <tr>
            <td rowspan="2" class="cell-index">${escapeHtml(item.indexLabel)}</td>
            <td rowspan="2" class="cell-cat">${escapeHtml(item.category)}</td>
            <td class="cell-dept">${escapeHtml(item.departments[0])}</td>
            <td class="cell-person">${rep0}</td>
          </tr>
          <tr>
            <td class="cell-dept">${escapeHtml(item.departments[1])}</td>
            <td class="cell-person">${rep1}</td>
          </tr>
        `;
      }
      const rep = escapeHtml(getResponsibleNames(item, 0));
      return `
        <tr>
          <td class="cell-index">${escapeHtml(item.indexLabel)}</td>
          <td class="cell-cat">${escapeHtml(item.category)}</td>
          <td class="cell-dept">${escapeHtml(item.departments[0])}</td>
          <td class="cell-person">${rep}</td>
        </tr>
      `;
    }).join('');

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const mergedPdf = await PDFDocument.create();

    const appendHtmlPagesToPdf = async (htmlContent: string, isLandscape: boolean = false) => {
      const page = await browser.newPage();
      try {
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        const pdfBytes = await page.pdf({
          format: 'A4',
          landscape: isLandscape,
          printBackground: true,
          margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }
        });
        const tempDoc = await PDFDocument.load(pdfBytes);
        const copiedPages = await mergedPdf.copyPages(tempDoc, tempDoc.getPageIndices());
        copiedPages.forEach(p => mergedPdf.addPage(p));
      } finally {
        await page.close();
      }
    };

    // 1. Render Cover Page (執行書封面v3.docx) + TOC Page (新目錄v7.docx)
    const coverAndTocHtml = `
      <!DOCTYPE html>
      <html lang="zh-TW">
      <head>
        <meta charset="UTF-8" />
        <style>
          @page { size: A4 portrait; margin: 0; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { margin: 0; padding: 0; background: #fff; color: #000; }
          .page {
            width: 210mm;
            height: 297mm;
            position: relative;
            page-break-after: always;
            overflow: hidden;
          }
          /* Cover Page matching 執行書封面v3.docx */
          .cover-container {
            width: 100%;
            height: 100%;
            padding: 18mm 19mm 15mm 19mm;
            display: flex;
            flex-direction: column;
          }
          .cover-top-box {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 0 12mm;
          }
          .cover-main-title {
            font-family: "Microsoft JhengHei", "微軟正黑體", sans-serif;
            font-size: 48pt;
            font-weight: 700;
            color: #525252;
            border-bottom: 1.5pt solid #7F7F7F;
            padding-bottom: 10pt;
            margin-bottom: 18pt;
            letter-spacing: 1px;
          }
          .cover-subtitle {
            font-family: "Microsoft JhengHei", "微軟正黑體", sans-serif;
            font-size: 18pt;
            font-weight: 700;
            color: #44546A;
            line-height: 1.5;
            word-break: break-all;
          }
          .cover-blue-bar {
            height: 4.2mm;
            background-color: #4472c4;
            width: 100%;
          }
          .cover-orange-box {
            height: 52mm;
            background-color: #ed7d31;
            width: 100%;
            padding: 5mm 12.7mm 12.7mm 12.7mm;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            color: #FFFFFF;
            font-family: "Microsoft JhengHei", "微軟正黑體", sans-serif;
            font-size: 12pt;
            font-weight: 700;
            line-height: 1.6;
          }
          .cover-version {
            margin-top: 6mm;
            text-align: right;
            padding-right: 4mm;
            font-family: "PMingLiU", "新細明體", "DFKai-SB", serif;
            font-size: 12pt;
            color: #000000;
          }

          /* TOC Page matching 新目錄v7.docx */
          .toc-container {
            width: 100%;
            height: 100%;
            padding: 25mm 25mm 20mm 25mm;
            font-family: "DFKai-SB", "BiauKai", "標楷體", "Kaiti TC", serif;
          }
          .toc-title {
            font-size: 26pt;
            text-align: center;
            margin-bottom: 12mm;
            line-height: 1.35;
            color: #000;
          }
          .toc-table {
            width: 160mm;
            margin: 0 auto;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 14pt;
          }
          .toc-table th, .toc-table td {
            border: 1px solid #000;
            height: 14mm;
            text-align: center;
            vertical-align: middle;
            padding: 2mm 3mm;
            font-weight: normal;
          }
          .toc-table th {
            background-color: #E7E6E6;
          }
          .col-index { width: 25mm; }
          .col-cat { width: 45mm; }
          .col-dept { width: 45mm; }
          .col-person { width: 45mm; }
        </style>
      </head>
      <body>
        <!-- Page 1: Cover Page -->
        <div class="page">
          <div class="cover-container">
            <div class="cover-top-box">
              <div class="cover-main-title">元融集團開案執行書</div>
              <div class="cover-subtitle">${escapeHtml(coverSubtitle)}</div>
            </div>
            <div class="cover-blue-bar"></div>
            <div class="cover-orange-box">
              <div>元融科技有限公司</div>
              <div>總經理室</div>
            </div>
            <div class="cover-version">${escapeHtml(versionDateStr)}</div>
          </div>
        </div>

        <!-- Page 2: Table of Contents -->
        <div class="page" style="page-break-after: avoid;">
          <div class="toc-container">
            <div class="toc-title">${escapeHtml(tocHeaderTitle)}</div>
            <table class="toc-table">
              <colgroup>
                <col class="col-index" />
                <col class="col-cat" />
                <col class="col-dept" />
                <col class="col-person" />
              </colgroup>
              <thead>
                <tr>
                  <th>項次</th>
                  <th>項目</th>
                  <th>負責部門</th>
                  <th>負責人員</th>
                </tr>
              </thead>
              <tbody>
                ${tocRowsHtml}
              </tbody>
            </table>
          </div>
        </div>
      </body>
      </html>
    `;

    updateProgress(14, '正在產生「開案執行書封面」與「目錄頁」...', `${project.project_code} - ${project.name}`, -1);
    await appendHtmlPagesToPdf(coverAndTocHtml);

    // 2. For each item in EXECUTION_BOOK_ITEMS order:
    //    Insert Section Divider Page (matching 新目錄v7.docx 標楷體 100pt centered) + Uploaded Files
    for (let idx = 0; idx < EXECUTION_BOOK_ITEMS.length; idx++) {
      const item = EXECUTION_BOOK_ITEMS[idx];
      const itemFiles = getItemFiles(item);
      const basePercent = 18 + (idx / EXECUTION_BOOK_ITEMS.length) * 72;

      updateProgress(
        basePercent,
        `正在處理 項次${item.indexLabel}：${item.category}`,
        itemFiles.length > 0 ? `正在產生章節分隔頁 (共 ${itemFiles.length} 個附件待整合)` : '正在產生章節分隔頁',
        idx
      );

      const dividerHtml = `
        <!DOCTYPE html>
        <html lang="zh-TW">
        <head>
          <meta charset="UTF-8" />
          <style>
            @page { size: A4 portrait; margin: 0; }
            body { margin: 0; padding: 0; background: #fff; }
            .divider-page {
              width: 210mm;
              height: 297mm;
              display: flex;
              align-items: center;
              justify-content: center;
              text-align: center;
              font-family: "DFKai-SB", "BiauKai", "標楷體", "Kaiti TC", serif;
              font-size: 100pt;
              color: #000;
              padding: 0 15mm;
              box-sizing: border-box;
              line-height: 1.25;
            }
          </style>
        </head>
        <body>
          <div class="divider-page">${escapeHtml(item.category)}</div>
        </body>
        </html>
      `;
      await appendHtmlPagesToPdf(dividerHtml);

      for (let fIdx = 0; fIdx < itemFiles.length; fIdx++) {
        const fileRecord = itemFiles[fIdx];
        const filePercent = basePercent + ((fIdx + 1) / (itemFiles.length + 1)) * (72 / EXECUTION_BOOK_ITEMS.length);
        updateProgress(
          filePercent,
          `正在整合 項次${item.indexLabel}：${item.category}`,
          `合併附件 (${fIdx + 1}/${itemFiles.length})：${fileRecord.file_name}`,
          idx
        );

        const diskPath = path.join(__dirname, '../../', fileRecord.file_path);
        const ext = path.extname(fileRecord.file_name || fileRecord.file_path).toLowerCase();
        const uploadTimeStr = new Date(fileRecord.uploaded_at).toLocaleString('zh-TW', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });

        if (fs.existsSync(diskPath)) {
          if (ext === '.pdf') {
            try {
              const fileBytes = fs.readFileSync(diskPath);
              const uploadedPdf = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
              const pageIndices = uploadedPdf.getPageIndices();
              const copied = await mergedPdf.copyPages(uploadedPdf, pageIndices);
              copied.forEach(p => mergedPdf.addPage(p));
              continue;
            } catch (pdfErr) {
              console.error(`Failed to merge PDF ${fileRecord.file_name}, falling back to summary page:`, pdfErr);
            }
          } else if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'].includes(ext)) {
            try {
              const imgBytes = fs.readFileSync(diskPath);
              const mimeMap: Record<string, string> = {
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.webp': 'image/webp',
                '.gif': 'image/gif',
                '.bmp': 'image/bmp'
              };
              const dataUri = `data:${mimeMap[ext] || 'image/jpeg'};base64,${imgBytes.toString('base64')}`;
              const imgPageHtml = `
                <!DOCTYPE html>
                <html lang="zh-TW">
                <head>
                  <meta charset="UTF-8" />
                  <style>
                    @page { size: A4 portrait; margin: 0; }
                    body { margin: 0; padding: 15mm; width: 210mm; height: 297mm; box-sizing: border-box; font-family: "Microsoft JhengHei", sans-serif; display: flex; flex-direction: column; }
                    .meta-bar { font-size: 10pt; color: #475569; border-bottom: 1px solid #cbd5e1; padding-bottom: 3mm; margin-bottom: 5mm; display: flex; justify-content: space-between; }
                    .img-wrap { flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; }
                    .img-wrap img { max-width: 100%; max-height: 250mm; object-fit: contain; }
                  </style>
                </head>
                <body>
                  <div class="meta-bar">
                    <span><strong>${escapeHtml(item.indexLabel)}、${escapeHtml(item.category)}</strong> — ${escapeHtml(fileRecord.file_name)}</span>
                    <span>上傳人：${escapeHtml(fileRecord.uploader?.name || '未知')} (${escapeHtml(uploadTimeStr)})</span>
                  </div>
                  <div class="img-wrap">
                    <img src="${dataUri}" alt="${escapeHtml(fileRecord.file_name)}" />
                  </div>
                </body>
                </html>
              `;
              await appendHtmlPagesToPdf(imgPageHtml);
              continue;
            } catch (imgErr) {
              console.error(`Failed to render image ${fileRecord.file_name}:`, imgErr);
            }
          } else if (['.xlsx', '.xls', '.csv'].includes(ext)) {
            try {
              const workbook = XLSX.readFile(diskPath, { cellNF: true, cellDates: true });
              let renderedAnySheet = false;

              for (let sIdx = 0; sIdx < workbook.SheetNames.length; sIdx++) {
                const sheetName = workbook.SheetNames[sIdx];
                const ws = workbook.Sheets[sheetName];
                if (!ws) continue;

                // Determine actual non-empty cell bounds (avoids 16,384-column ghost formatting ranges)
                let maxR = -1;
                let maxC = -1;
                for (const key of Object.keys(ws)) {
                  if (key[0] === '!') continue;
                  const cell = ws[key];
                  if (cell && cell.v !== undefined && String(cell.v).trim() !== '') {
                    const decoded = XLSX.utils.decode_cell(key);
                    if (decoded.r > maxR) maxR = decoded.r;
                    if (decoded.c > maxC) maxC = decoded.c;
                  }
                }

                if (maxR < 0 || maxC < 0) continue;
                maxC = Math.min(maxC, 50);

                // Split tall sheets into ~38-row chunks so each captured image matches A4 Landscape aspect ratio
                const ROWS_PER_CHUNK = maxR + 1 <= 45 ? maxR + 1 : 38;
                const totalChunks = Math.ceil((maxR + 1) / ROWS_PER_CHUNK);
                const merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> = ws['!merges'] || [];

                for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
                  const startR = chunkIdx * ROWS_PER_CHUNK;
                  const endR = Math.min(maxR, startR + ROWS_PER_CHUNK - 1);

                  updateProgress(
                    filePercent,
                    `正在轉換 Excel 為橫式圖片 — 項次${item.indexLabel}：${item.category}`,
                    `${fileRecord.file_name} [分頁：${sheetName}${totalChunks > 1 ? ` (${chunkIdx + 1}/${totalChunks})` : ''}]`,
                    idx
                  );

                  const skipMap = new Set<string>();
                  const spanMap = new Map<string, { rowspan: number; colspan: number }>();

                  for (const m of merges) {
                    const sr = Math.max(m.s.r, startR);
                    const er = Math.min(m.e.r, endR);
                    const sc = Math.max(m.s.c, 0);
                    const ec = Math.min(m.e.c, maxC);
                    if (sr <= er && sc <= ec && (er > sr || ec > sc)) {
                      spanMap.set(`${sr},${sc}`, { rowspan: er - sr + 1, colspan: ec - sc + 1 });
                      for (let rr = sr; rr <= er; rr++) {
                        for (let cc = sc; cc <= ec; cc++) {
                          if (rr !== sr || cc !== sc) {
                            skipMap.add(`${rr},${cc}`);
                          }
                        }
                      }
                    }
                  }

                  let rowsHtml = '';
                  for (let r = startR; r <= endR; r++) {
                    let cellsHtml = '';
                    for (let c = 0; c <= maxC; c++) {
                      const coordKey = `${r},${c}`;
                      if (skipMap.has(coordKey)) continue;

                      const span = spanMap.get(coordKey);
                      const spanAttrs =
                        (span && span.rowspan > 1 ? ` rowspan="${span.rowspan}"` : '') +
                        (span && span.colspan > 1 ? ` colspan="${span.colspan}"` : '');

                      const addr = XLSX.utils.encode_cell({ r, c });
                      const cell = ws[addr];
                      let text = '';
                      if (cell && cell.v !== undefined) {
                        try {
                          text = XLSX.utils.format_cell(cell);
                        } catch {
                          text = String(cell.v);
                        }
                      }
                      const isNumeric = cell && cell.t === 'n';
                      const isHeaderRow = r === startR && chunkIdx === 0 && r === 0;
                      cellsHtml += `<td${spanAttrs} class="${isNumeric ? 'num' : ''}${isHeaderRow ? ' hdr' : ''}">${escapeHtml(text)}</td>`;
                    }
                    rowsHtml += `<tr>${cellsHtml}</tr>`;
                  }

                  // Step A: Render the Excel table in Puppeteer and screenshot it as a high-res PNG image
                  const capturePage = await browser.newPage();
                  let excelImgDataUri = '';
                  try {
                    await capturePage.setViewport({ width: 1920, height: 1200, deviceScaleFactor: 2 });
                    const sheetHtml = `
                      <!DOCTYPE html>
                      <html lang="zh-TW">
                      <head>
                        <meta charset="UTF-8" />
                        <style>
                          body { margin: 0; padding: 0; background: #ffffff; }
                          #excel-capture {
                            display: inline-block;
                            background: #ffffff;
                            padding: 10px;
                            font-family: "Microsoft JhengHei", "微軟正黑體", sans-serif;
                          }
                          table {
                            border-collapse: collapse;
                            border: 1.5px solid #1e293b;
                            font-size: 11pt;
                            color: #0f172a;
                          }
                          td {
                            border: 1px solid #64748b;
                            padding: 5px 8px;
                            vertical-align: middle;
                            white-space: pre-wrap;
                            max-width: 360px;
                            word-break: break-word;
                            line-height: 1.35;
                          }
                          td.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
                          td.hdr { background-color: #e2e8f0; font-weight: 700; text-align: center; }
                        </style>
                      </head>
                      <body>
                        <div id="excel-capture">
                          <table>${rowsHtml}</table>
                        </div>
                      </body>
                      </html>
                    `;
                    await capturePage.setContent(sheetHtml, { waitUntil: 'networkidle0' });
                    const captureEl = await capturePage.$('#excel-capture');
                    if (captureEl) {
                      const pngBuffer = await captureEl.screenshot({ type: 'png' });
                      excelImgDataUri = `data:image/png;base64,${Buffer.from(pngBuffer).toString('base64')}`;
                    }
                  } finally {
                    await capturePage.close();
                  }

                  // Step B: Place the captured Excel PNG image scaled to fit A4 Landscape into the execution book PDF
                  if (excelImgDataUri) {
                    const sheetLabel = `${sheetName}${totalChunks > 1 ? ` (${chunkIdx + 1}/${totalChunks})` : ''}`;
                    const excelA4LandscapeHtml = `
                      <!DOCTYPE html>
                      <html lang="zh-TW">
                      <head>
                        <meta charset="UTF-8" />
                        <style>
                          @page { size: A4 landscape; margin: 0; }
                          body {
                            margin: 0;
                            padding: 10mm 12mm;
                            width: 297mm;
                            height: 210mm;
                            box-sizing: border-box;
                            font-family: "Microsoft JhengHei", "微軟正黑體", sans-serif;
                            display: flex;
                            flex-direction: column;
                            background: #ffffff;
                          }
                          .meta-bar {
                            font-size: 9.5pt;
                            color: #475569;
                            border-bottom: 1px solid #cbd5e1;
                            padding-bottom: 2mm;
                            margin-bottom: 3mm;
                            display: flex;
                            justify-content: space-between;
                            gap: 8px;
                          }
                          .img-wrap {
                            flex: 1;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            overflow: hidden;
                            width: 100%;
                            height: 180mm;
                          }
                          .img-wrap img {
                            width: 100%;
                            height: 100%;
                            max-width: 273mm;
                            max-height: 180mm;
                            object-fit: contain;
                          }
                        </style>
                      </head>
                      <body>
                        <div class="meta-bar">
                          <span><strong>${escapeHtml(item.indexLabel)}、${escapeHtml(item.category)}</strong> — ${escapeHtml(fileRecord.file_name)} [分頁：${escapeHtml(sheetLabel)}]</span>
                          <span>上傳人：${escapeHtml(fileRecord.uploader?.name || '未知')} (${escapeHtml(uploadTimeStr)})</span>
                        </div>
                        <div class="img-wrap">
                          <img src="${excelImgDataUri}" alt="${escapeHtml(sheetLabel)}" />
                        </div>
                      </body>
                      </html>
                    `;
                    await appendHtmlPagesToPdf(excelA4LandscapeHtml, true);
                    renderedAnySheet = true;
                  }
                }
              }

              if (renderedAnySheet) {
                continue;
              }
            } catch (excelErr) {
              console.error(`Failed to render Excel ${fileRecord.file_name} as image:`, excelErr);
            }
          }
        }

        // For non-PDF / non-image files (e.g. .docx, .xlsx, .dwg, .zip), render an attachment record page
        const attachmentInfoHtml = `
          <!DOCTYPE html>
          <html lang="zh-TW">
          <head>
            <meta charset="UTF-8" />
            <style>
              @page { size: A4 portrait; margin: 0; }
              body { margin: 0; padding: 25mm; width: 210mm; height: 297mm; box-sizing: border-box; font-family: "Microsoft JhengHei", "微軟正黑體", sans-serif; display: flex; align-items: center; justify-content: center; }
              .card { width: 100%; border: 2px solid #cbd5e1; border-radius: 12px; padding: 15mm; background: #f8fafc; }
              .badge { display: inline-block; background: #2563eb; color: #fff; padding: 4px 12px; border-radius: 6px; font-size: 12pt; font-weight: bold; margin-bottom: 6mm; }
              .title { font-size: 20pt; font-weight: bold; color: #1e293b; margin-bottom: 8mm; word-break: break-all; }
              .info-row { font-size: 13pt; color: #334155; margin-bottom: 4mm; }
              .note { margin-top: 8mm; font-size: 11pt; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 4mm; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="badge">項次${escapeHtml(item.indexLabel)}：${escapeHtml(item.category)}</div>
              <div class="title">${escapeHtml(fileRecord.file_name)}</div>
              <div class="info-row"><strong>負責/上傳人員：</strong>${escapeHtml(fileRecord.uploader?.name || '未知')}</div>
              <div class="info-row"><strong>上傳時間紀錄：</strong>${escapeHtml(uploadTimeStr)}</div>
              <div class="note">※ 此檔案為非 PDF / 圖檔格式 (${escapeHtml(ext || '附件')})，請至系統「開案執行書」頁面直接點擊下載原始檔檢視。</div>
            </div>
          </body>
          </html>
        `;
        await appendHtmlPagesToPdf(attachmentInfoHtml);
      }
    }

    updateProgress(95, '正在封裝並壓縮最終 PDF 執行書...', '寫入完整頁面索引與輸出串流', 8);
    const finalPdfBytes = await mergedPdf.save();
    updateProgress(100, '匯出完成！正在啟動瀏覽器下載...', `${project.project_code}_開案執行書.pdf`, 8);

    const safeFilename = encodeURIComponent(`${project.project_code}_開案執行書.pdf`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${safeFilename}`);
    res.send(Buffer.from(finalPdfBytes));
  } catch (error) {
    console.error('Error exporting execution book PDF:', error);
    res.status(500).json({ error: '匯出開案執行書 PDF 失敗' });
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
});

// Delete file
router.delete('/:fileId', authenticateToken, async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ error: '未授權' });
  try {
    const fileId = req.params.fileId as string;
    const projectFile = await prisma.projectFile.findUnique({ where: { id: fileId } });
    if (!projectFile) return res.status(404).json({ error: '找不到檔案' });
    
    if (projectFile.uploaded_by !== req.user.id && req.user.role !== 'SystemAdmin') {
       return res.status(403).json({ error: '權限不足' });
    }

    const filePath = path.join(__dirname, '../../', projectFile.file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.projectFile.delete({ where: { id: fileId } });
    res.json({ message: '檔案已刪除' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '刪除檔案失敗' });
  }
});

export default router;
