import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import ExcelJS from 'exceljs';
import * as puppeteer from 'puppeteer';
import * as ejs from 'ejs';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();

const uploadDir = path.join(__dirname, '../../uploads/labor');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Get daily labor reports
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { project_id } = req.query;
    const whereClause = project_id ? { project_id: String(project_id) } : {};
    
    const reports = await prisma.dailyLaborReport.findMany({
      where: whereClause,
      include: { 
        project: { select: { project_code: true, name: true } },
        recorder: { select: { name: true } },
        pm: { select: { name: true } }
      },
      orderBy: { report_date: 'desc' }
    });
    res.json(reports);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '獲取報工紀錄失敗' });
  }
});

// Create daily labor report
router.post('/', authenticateToken, upload.any(), async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ error: '未授權' });

  const { project_id, report_date, weather, recorder_id, pm_id, engineers, dispatch_workers, equipments, work_category, work_items, drawing_number, drawing_revision, construction_location, drawing_check_result, drawing_check_confirmed, safety_check_1, safety_check_2, safety_check_3, tomorrow_plan, additional_notes } = req.body;
  if (!project_id) return res.status(400).json({ error: '必須選擇專案' });

  let parsedWorkItems = work_items ? JSON.parse(work_items) : null;
  
  let photosObj: any = { close: [], mid: [], far: [] };
  let hasPhotos = false;
  if (req.files) {
    const files = req.files as Express.Multer.File[];
    files.forEach(file => {
      const match = file.fieldname.match(/^inspection_photo_(\d+)$/);
      if (match && parsedWorkItems) {
        const idx = parseInt(match[1]);
        if (parsedWorkItems[idx] && parsedWorkItems[idx].inspection) {
          parsedWorkItems[idx].inspection.photo = `/uploads/labor/${file.filename}`;
        }
      } else if (file.fieldname === 'photos_close') {
        photosObj.close.push(`/uploads/labor/${file.filename}`);
        hasPhotos = true;
      } else if (file.fieldname === 'photos_mid') {
        photosObj.mid.push(`/uploads/labor/${file.filename}`);
        hasPhotos = true;
      } else if (file.fieldname === 'photos_far') {
        photosObj.far.push(`/uploads/labor/${file.filename}`);
        hasPhotos = true;
      }
    });
  }

  try {
    const report = await prisma.dailyLaborReport.create({
      data: {
        project_id,
        report_date: new Date(report_date),
        weather,
        recorder_id: recorder_id || req.user.id,
        pm_id,
        engineers: engineers ? JSON.parse(engineers) : null,
        dispatch_workers: dispatch_workers ? JSON.parse(dispatch_workers) : null,
        equipments: equipments ? JSON.parse(equipments) : null,
        work_category,
        work_items: parsedWorkItems,
        drawing_number,
        drawing_revision,
        construction_location,
        drawing_check_result,
        drawing_check_confirmed: drawing_check_confirmed === true || drawing_check_confirmed === 'true',
        safety_check_1: safety_check_1 === true || safety_check_1 === 'true',
        safety_check_2: safety_check_2 === true || safety_check_2 === 'true',
        safety_check_3: safety_check_3 === true || safety_check_3 === 'true',
        tomorrow_plan,
        additional_notes,
        photos: hasPhotos ? JSON.stringify(photosObj) : undefined
      }
    });
    res.json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '建立報工紀錄失敗' });
  }
});


// Update labor report
router.put('/:id', authenticateToken, upload.any(), async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ error: '未授權' });

  const { id } = req.params;
  const { project_id, report_date, weather, recorder_id, pm_id, engineers, dispatch_workers, equipments, work_category, work_items, drawing_number, drawing_revision, construction_location, drawing_check_result, drawing_check_confirmed, safety_check_1, safety_check_2, safety_check_3, tomorrow_plan, additional_notes } = req.body;

  let parsedWorkItems = work_items ? JSON.parse(work_items) : null;
  
  let photosObj: any = { close: [], mid: [], far: [] };
  let hasPhotos = false;
  if (req.files) {
    const files = req.files as Express.Multer.File[];
    files.forEach(file => {
      const match = file.fieldname.match(/^inspection_photo_(\d+)$/);
      if (match && parsedWorkItems) {
        const idx = parseInt(match[1]);
        if (parsedWorkItems[idx] && parsedWorkItems[idx].inspection) {
          parsedWorkItems[idx].inspection.photo = `/uploads/labor/${file.filename}`;
        }
      } else if (file.fieldname === 'photos_close') {
        photosObj.close.push(`/uploads/labor/${file.filename}`);
        hasPhotos = true;
      } else if (file.fieldname === 'photos_mid') {
        photosObj.mid.push(`/uploads/labor/${file.filename}`);
        hasPhotos = true;
      } else if (file.fieldname === 'photos_far') {
        photosObj.far.push(`/uploads/labor/${file.filename}`);
        hasPhotos = true;
      }
    });
  }

  try {
    const report = await prisma.dailyLaborReport.update({
      where: { id: id as string },
      data: {
        project_id,
        report_date: new Date(report_date),
        weather,
        recorder_id: recorder_id || req.user.id,
        pm_id,
        engineers: engineers ? JSON.parse(engineers) : null,
        dispatch_workers: dispatch_workers ? JSON.parse(dispatch_workers) : null,
        equipments: equipments ? JSON.parse(equipments) : null,
        work_category,
        work_items: parsedWorkItems,
        drawing_number,
        drawing_revision,
        construction_location,
        drawing_check_result,
        drawing_check_confirmed: drawing_check_confirmed === true || drawing_check_confirmed === 'true',
        safety_check_1: safety_check_1 === true || safety_check_1 === 'true',
        safety_check_2: safety_check_2 === true || safety_check_2 === 'true',
        safety_check_3: safety_check_3 === true || safety_check_3 === 'true',
        tomorrow_plan,
        additional_notes
      } as any
    });
    
    if (hasPhotos) {
      await prisma.dailyLaborReport.update({
        where: { id: id as string },
        data: { photos: JSON.stringify(photosObj) }
      });
    }
    
    res.json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '更新報工紀錄失敗' });
  }
});

// Export labor report to Excel
router.get('/:id/export', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const report: any = await prisma.dailyLaborReport.findUnique({
      where: { id: String(req.params.id) },
      include: {
        project: true,
        recorder: true,
        pm: true
      }
    });

    if (!report) {
      return res.status(404).json({ error: '找不到報工紀錄' });
    }

    const templatePath = path.join(__dirname, '../../../施工日誌.xlsx');
    if (!fs.existsSync(templatePath)) {
      return res.status(500).json({ error: '找不到 Excel 範本檔案' });
    }

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(templatePath);
    const ws = wb.worksheets[0];

    // Project Info
    ws.getCell('C3').value = `依照合約工程名稱:${report.project?.name || ''}`;
    
    // Date & Weather
    const reportDate = new Date(report.report_date);
    const dateStr = `${reportDate.getMonth() + 1}/${reportDate.getDate()}`;
    ws.getCell('N2').value = `今日施工${dateStr}`;
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    ws.getCell('R2').value = days[reportDate.getDay()];
    ws.getCell('R3').value = report.weather || '';

    // Work Items (Rows 9-21)
    let workItems = [];
    try { workItems = JSON.parse(report.work_items as string || '[]'); } catch (e) {}
    let rowIndex = 9;
    for (const item of workItems) {
      if (rowIndex <= 21) {
        ws.getCell(`B${rowIndex}`).value = item.name || '';
        ws.getCell(`H${rowIndex}`).value = item.unit || '式';
        ws.getCell(`K${rowIndex}`).value = item.progress || '';
        rowIndex++;
      }
    }

    // Workers (Rows 24-28)
    let workers = [];
    try { workers = JSON.parse(report.dispatch_workers as string || '[]'); } catch (e) {}
    
    const workerStats: Record<string, number> = {};
    for (const w of workers) {
      const category = w.work_category || '一般工';
      if (!workerStats[category]) workerStats[category] = 0;
      workerStats[category] += 1;
    }
    
    let wRow = 24;
    let totalWorkers = 0;
    for (const [category, count] of Object.entries(workerStats)) {
      if (wRow <= 28) {
        ws.getCell(`B${wRow}`).value = category;
        ws.getCell(`D${wRow}`).value = count;
        totalWorkers += count;
        wRow++;
      }
    }
    ws.getCell('D29').value = totalWorkers;

    // Equipments (Rows 24-28)
    let equipments = [];
    try { equipments = JSON.parse(report.equipments as string || '[]'); } catch (e) {}
    let eRow = 24;
    let totalEquipHours = 0;
    for (const eq of equipments) {
      if (eRow <= 28) {
        ws.getCell(`K${eRow}`).value = eq.name;
        ws.getCell(`N${eRow}`).value = eq.hours ? parseFloat(eq.hours) : 0;
        totalEquipHours += eq.hours ? parseFloat(eq.hours) : 0;
        eRow++;
      }
    }
    ws.getCell('N29').value = totalEquipHours;

    // Safety checks
    if (report.safety_check_1) {
      ws.getCell('A32').value = '1.工具箱會議(含工地預防災變及危害告知)：■有 □無';
    } else {
      ws.getCell('A32').value = '1.工具箱會議(含工地預防災變及危害告知)：□有 ■無';
    }

    if (report.safety_check_2) {
      ws.getCell('A35').value = '3.檢查勞工個人防護具：■有 □無';
    } else {
      ws.getCell('A35').value = '3.檢查勞工個人防護具：□有 ■無';
    }

    // Tomorrow plan
    const tPlanCell = ws.getCell('A46');
    if (tPlanCell.value && (tPlanCell.value as ExcelJS.CellRichTextValue).richText) {
      const rt = tPlanCell.value as ExcelJS.CellRichTextValue;
      rt.richText[1].text = (report.tomorrow_plan || '無') + '\n';
      ws.getCell('A46').value = rt;
    } else {
      ws.getCell('A46').value = `明日工作規劃：${report.tomorrow_plan || '無'}`;
    }

    // Recorder
    const rName = report.recorder?.name || '';
    const rCell48 = ws.getCell('N48');
    if (rCell48.value && (rCell48.value as ExcelJS.CellRichTextValue).richText) {
       const rt = rCell48.value as ExcelJS.CellRichTextValue;
       rt.richText[1].text = rName;
       ws.getCell('N48').value = rt;
    } else {
       ws.getCell('N48').value = `現場負責人:${rName}`;
    }

    // Photos
    let photos: any = {};
    try { photos = JSON.parse(report.photos as string || '{}'); } catch (e) {}
    
    // Collect all photo paths
    const allPhotoPaths: string[] = [];
    Object.values(photos).forEach((paths: any) => {
      if (Array.isArray(paths)) {
        paths.forEach(p => {
          // p is like /uploads/labor/xxx.jpg
          const localPath = path.join(__dirname, '../../', p);
          if (fs.existsSync(localPath)) {
            allPhotoPaths.push(localPath);
          }
        });
      }
    });

    const mainSheetCells = ['U5', 'AA5', 'U10', 'AA10', 'U22', 'AA22'];
    
    for (let i = 0; i < allPhotoPaths.length; i++) {
      const p = allPhotoPaths[i];
      const imageId = wb.addImage({
        filename: p,
        extension: p.toLowerCase().endsWith('.png') ? 'png' : 'jpeg',
      });

      if (i < 6) {
        const cell = mainSheetCells[i];
        ws.addImage(imageId, {
          tl: { col: Number(ws.getCell(cell).col) - 1, row: Number(ws.getCell(cell).row) - 1 },
          ext: { width: 180, height: 120 },
          editAs: 'oneCell'
        });
      } else {
        // Create new sheet for extra photos if it doesn't exist
        let extraWs = wb.getWorksheet('附件照片');
        if (!extraWs) {
          extraWs = wb.addWorksheet('附件照片');
        }
        
        const extraIdx = i - 6;
        const row = Math.floor(extraIdx / 2) * 10;
        const col = (extraIdx % 2) * 5;
        
        extraWs.addImage(imageId, {
          tl: { col: col, row: row },
          ext: { width: 320, height: 240 },
          editAs: 'oneCell'
        });
      }
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="labor-report-${report.id}.xlsx"`);
    
    await wb.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '匯出報工紀錄失敗' });
  }
});

// Helper to diff days
function getDiffDays(d1: Date, d2: Date) {
  if (!d1 || !d2) return 0;
  const t1 = d1.getTime();
  const t2 = d2.getTime();
  return Math.max(0, Math.ceil((t2 - t1) / (1000 * 3600 * 24)));
}

// Export labor report to PDF
router.get('/:id/export-pdf', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const report: any = await prisma.dailyLaborReport.findUnique({
      where: { id: String(req.params.id) },
      include: {
        project: true,
        recorder: true,
        pm: true
      }
    });

    if (!report) return res.status(404).json({ error: '找不到報工紀錄' });

    // Accumulated queries
    const pastReports = await prisma.dailyLaborReport.findMany({
      where: {
        project_id: report.project_id,
        report_date: { lte: report.report_date }
      }
    });

    const accumulatedWorkers: Record<string, number> = {};
    const accumulatedEquip: Record<string, number> = {};

    for (const r of pastReports) {
      let wList = [];
      let eList = [];
      try { wList = JSON.parse((r.dispatch_workers as string) || '[]'); } catch(e){}
      try { eList = JSON.parse((r.equipments as string) || '[]'); } catch(e){}
      
      for (const w of wList) {
        const cat = w.work_category || '一般工';
        accumulatedWorkers[cat] = (accumulatedWorkers[cat] || 0) + 1;
      }
      for (const eq of eList) {
        const name = eq.name || '機具';
        accumulatedEquip[name] = (accumulatedEquip[name] || 0) + (Number(eq.qty) || 1); // using qty instead of hours
      }
    }

    const reportDate = new Date(report.report_date);
    const dateStr = `${reportDate.getFullYear()}/${(reportDate.getMonth()+1).toString().padStart(2,'0')}/${reportDate.getDate().toString().padStart(2,'0')}`;
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    
    const pStart = report.project?.start_date ? new Date(report.project.start_date) : new Date();
    const pEnd = report.project?.target_date ? new Date(report.project.target_date) : new Date();
    
    const totalDuration = getDiffDays(pStart, pEnd);
    const accumulatedDuration = getDiffDays(pStart, reportDate);
    const remainingDuration = getDiffDays(reportDate, pEnd);

    let workItems = [];
    try { workItems = JSON.parse(report.work_items as string || '[]'); } catch(e){}
    let workers = [];
    try { workers = JSON.parse(report.dispatch_workers as string || '[]'); } catch(e){}
    let equips = [];
    try { equips = JSON.parse(report.equipments as string || '[]'); } catch(e){}

    const todayWorkers: Record<string, number> = {};
    for (const w of workers) {
      const cat = w.work_category || '一般工';
      todayWorkers[cat] = (todayWorkers[cat] || 0) + 1;
    }
    const todayEquips: Record<string, number> = {};
    for (const eq of equips) {
      const name = eq.name || '機具';
      todayEquips[name] = (todayEquips[name] || 0) + (Number(eq.qty) || 1);
    }

    // Merge into arrays for the template (5 rows max)
    const workerStats: { category: string, today: number, accumulated: number }[] = [];
    const equipStats: { name: string, today: number, accumulated: number }[] = [];
    let totalWorkerToday = 0;
    let totalWorkerAccumulated = 0;
    let totalEquipToday = 0;
    let totalEquipAccumulated = 0;

    Object.keys(accumulatedWorkers).forEach(cat => {
      const t = todayWorkers[cat] || 0;
      const a = accumulatedWorkers[cat] || 0;
      workerStats.push({ category: cat, today: t, accumulated: a });
      totalWorkerToday += t;
      totalWorkerAccumulated += a;
    });

    Object.keys(accumulatedEquip).forEach(name => {
      const t = todayEquips[name] || 0;
      const a = accumulatedEquip[name] || 0;
      equipStats.push({ name: name, today: t, accumulated: a });
      totalEquipToday += t;
      totalEquipAccumulated += a;
    });

    const templatePath = path.join(__dirname, '../templates/labor-report-pdf.ejs');
    const html = await ejs.renderFile(templatePath, {
      page: 1,
      report,
      reportDate: dateStr,
      dayOfWeek: days[reportDate.getDay()],
      startDate: pStart.toLocaleDateString(),
      endDate: pEnd.toLocaleDateString(),
      totalDuration,
      accumulatedDuration,
      remainingDuration,
      workItems,
      workerStats,
      equipStats,
      totalWorkerToday,
      totalWorkerAccumulated,
      totalEquipToday,
      totalEquipAccumulated
    });

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
    });
    await browser.close();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="labor-report-${report.id}.pdf"`,
      'Content-Length': String(pdfBuffer.length)
    });
    res.end(pdfBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '匯出 PDF 失敗' });
  }
});

export default router;
