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

// Export labor report to Excel (Matching PDF layout)
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

    // --- Data Calculation (Same as PDF) ---
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
      try { wList = typeof r.dispatch_workers === 'string' ? JSON.parse(r.dispatch_workers) : (r.dispatch_workers || []); } catch(e){}
      try { eList = typeof r.equipments === 'string' ? JSON.parse(r.equipments) : (r.equipments || []); } catch(e){}
      
      for (const w of wList) {
        const cat = w.work_category || '一般工';
        accumulatedWorkers[cat] = (accumulatedWorkers[cat] || 0) + 1;
      }
      for (const eq of eList) {
        const name = eq.name || '機具';
        accumulatedEquip[name] = (accumulatedEquip[name] || 0) + (Number(eq.qty) || 1);
      }
    }

    const reportDate = new Date(report.report_date);
    const dateStr = `${reportDate.getFullYear()}/${(reportDate.getMonth()+1).toString().padStart(2,'0')}/${reportDate.getDate().toString().padStart(2,'0')}`;
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    const dayOfWeek = days[reportDate.getDay()];
    
    const pStart = report.project?.start_date ? new Date(report.project.start_date) : new Date();
    const pEnd = report.project?.target_date ? new Date(report.project.target_date) : new Date();
    
    const startDateStr = `${pStart.getFullYear()}/${pStart.getMonth()+1}/${pStart.getDate()}`;
    const endDateStr = `${pEnd.getFullYear()}/${pEnd.getMonth()+1}/${pEnd.getDate()}`;

    const totalDuration = getDiffDays(pStart, pEnd);
    const accumulatedDuration = getDiffDays(pStart, reportDate);
    const remainingDuration = getDiffDays(reportDate, pEnd);

    let workItems = [];
    try { workItems = typeof report.work_items === 'string' ? JSON.parse(report.work_items) : (report.work_items || []); } catch(e){}
    let workers = [];
    try { workers = typeof report.dispatch_workers === 'string' ? JSON.parse(report.dispatch_workers) : (report.dispatch_workers || []); } catch(e){}
    let equips = [];
    try { equips = typeof report.equipments === 'string' ? JSON.parse(report.equipments) : (report.equipments || []); } catch(e){}

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

    // --- ExcelJS Construction ---
    
    // --- Extract Photos ---
    const allPhotos: any[] = [];
    let parsedPhotos: any = {};
    try { parsedPhotos = typeof report.photos === 'string' ? JSON.parse(report.photos) : (report.photos || {}); } catch(e){}

    if (parsedPhotos.close) parsedPhotos.close.forEach((url: string, i: number) => allPhotos.push({ url, title: `施工近照 ${i+1}` }));
    if (parsedPhotos.mid) parsedPhotos.mid.forEach((url: string, i: number) => allPhotos.push({ url, title: `施工中距離照 ${i+1}` }));
    if (parsedPhotos.far) parsedPhotos.far.forEach((url: string, i: number) => allPhotos.push({ url, title: `施工遠距照 ${i+1}` }));

    workItems.forEach((item: any, idx: number) => {
      if (item.inspection && item.inspection.photo) {
         allPhotos.push({ url: item.inspection.photo, title: `${item.name} 自主檢查照片` });
      }
    });

    const getAbsPath = (url: string) => {
        if (!url) return null;
        return path.join(__dirname, '../../uploads', url.replace('/uploads/', ''));
    };

    const getBase64 = (url: string) => {
        const p = getAbsPath(url);
        if (p && fs.existsSync(p)) {
            const ext = path.extname(p).substring(1);
            const b64 = fs.readFileSync(p).toString('base64');
            return `data:image/${ext};base64,${b64}`;
        }
        return null;
    };

    allPhotos.forEach((p: any) => p.base64 = getBase64(p.url));


const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('每日施工日誌', {
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 1, margins: { left: 0.2, right: 0.2, top: 0.2, bottom: 0.2, header: 0, footer: 0 } }
    });

    for(let i=1; i<=8; i++) {
      ws.getColumn(i).width = 12;
    }

    const applyStyle = (cell: ExcelJS.Cell, bg: boolean = false, alignLeft: boolean = false) => {
      cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
      cell.alignment = { vertical: 'middle', horizontal: alignLeft ? 'left' : 'center', wrapText: true };
      if (bg) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
      }
      cell.font = { name: '微軟正黑體', size: 10 };
    };

    let r = 1;

    ws.mergeCells(`A${r}:H${r}`);
    ws.getCell(`A${r}`).value = '每 日 施 工 日 誌';
    ws.getCell(`A${r}`).font = { name: '微軟正黑體', size: 16, bold: true };
    ws.getCell(`A${r}`).alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(r).height = 30;
    r++;

    ws.mergeCells(`B${r}:D${r}`);
    ws.getCell(`A${r}`).value = '業主'; applyStyle(ws.getCell(`A${r}`), true);
    ws.getCell(`B${r}`).value = report.project?.owner || ''; applyStyle(ws.getCell(`B${r}`));
    ws.getCell(`E${r}`).value = '填報日期'; applyStyle(ws.getCell(`E${r}`), true);
    ws.getCell(`F${r}`).value = dateStr; applyStyle(ws.getCell(`F${r}`));
    ws.getCell(`G${r}`).value = '星期'; applyStyle(ws.getCell(`G${r}`), true);
    ws.getCell(`H${r}`).value = dayOfWeek; applyStyle(ws.getCell(`H${r}`));
    r++;

    ws.mergeCells(`B${r}:D${r}`);
    ws.getCell(`A${r}`).value = '工程名稱'; applyStyle(ws.getCell(`A${r}`), true);
    ws.getCell(`B${r}`).value = report.project?.name || ''; applyStyle(ws.getCell(`B${r}`));
    ws.getCell(`E${r}`).value = '容量'; applyStyle(ws.getCell(`E${r}`), true);
    const cap = report.project?.capacity || '';
    ws.getCell(`F${r}`).value = cap ? (cap.toLowerCase().includes('w') ? cap : cap + ' kW') : ''; applyStyle(ws.getCell(`F${r}`));
    ws.getCell(`G${r}`).value = '天氣'; applyStyle(ws.getCell(`G${r}`), true);
    ws.getCell(`H${r}`).value = report.weather || ''; applyStyle(ws.getCell(`H${r}`));
    r++;

    ws.mergeCells(`A${r}:B${r}`); ws.mergeCells(`C${r}:D${r}`); ws.mergeCells(`E${r}:F${r}`);
    ws.getCell(`A${r}`).value = '開工日期'; applyStyle(ws.getCell(`A${r}`), true);
    ws.getCell(`C${r}`).value = startDateStr; applyStyle(ws.getCell(`C${r}`));
    ws.getCell(`E${r}`).value = '總工期'; applyStyle(ws.getCell(`E${r}`), true);
    ws.getCell(`G${r}`).value = totalDuration; applyStyle(ws.getCell(`G${r}`));
    ws.getCell(`H${r}`).value = '天'; applyStyle(ws.getCell(`H${r}`));
    r++;

    ws.mergeCells(`A${r}:B${r}`); ws.mergeCells(`C${r}:D${r}`); ws.mergeCells(`E${r}:F${r}`);
    ws.getCell(`A${r}`).value = '預計完工日期'; applyStyle(ws.getCell(`A${r}`), true);
    ws.getCell(`C${r}`).value = endDateStr; applyStyle(ws.getCell(`C${r}`));
    ws.getCell(`E${r}`).value = '累計工期'; applyStyle(ws.getCell(`E${r}`), true);
    ws.getCell(`G${r}`).value = accumulatedDuration; applyStyle(ws.getCell(`G${r}`));
    ws.getCell(`H${r}`).value = '天'; applyStyle(ws.getCell(`H${r}`));
    r++;

    ws.mergeCells(`A${r}:B${r}`); ws.mergeCells(`C${r}:D${r}`); ws.mergeCells(`E${r}:F${r}`);
    ws.getCell(`A${r}`).value = '延展工期'; applyStyle(ws.getCell(`A${r}`), true);
    ws.getCell(`C${r}`).value = 0; applyStyle(ws.getCell(`C${r}`));
    ws.getCell(`E${r}`).value = '剩餘工期'; applyStyle(ws.getCell(`E${r}`), true);
    ws.getCell(`G${r}`).value = remainingDuration; applyStyle(ws.getCell(`G${r}`));
    ws.getCell(`H${r}`).value = '天'; applyStyle(ws.getCell(`H${r}`));
    r++;

    ws.mergeCells(`A${r}:C${r}`);
    ws.getCell(`A${r}`).value = '施工項目'; applyStyle(ws.getCell(`A${r}`), true);
    ws.getCell(`D${r}`).value = '單位'; applyStyle(ws.getCell(`D${r}`), true);
    ws.getCell(`E${r}`).value = '契約數量'; applyStyle(ws.getCell(`E${r}`), true);
    ws.getCell(`F${r}`).value = '本日完成數量'; applyStyle(ws.getCell(`F${r}`), true);
    ws.getCell(`G${r}`).value = '累計完成數量'; applyStyle(ws.getCell(`G${r}`), true);
    ws.getCell(`H${r}`).value = '備註'; applyStyle(ws.getCell(`H${r}`), true);
    r++;

    for(let i=0; i<11; i++) {
      const item = workItems[i] || {};
      ws.mergeCells(`A${r}:C${r}`);
      ws.getCell(`A${r}`).value = item.name || ''; applyStyle(ws.getCell(`A${r}`), false, true);
      ws.getCell(`D${r}`).value = item.name ? '式' : ''; applyStyle(ws.getCell(`D${r}`));
      ws.getCell(`E${r}`).value = item.name ? '100%' : ''; applyStyle(ws.getCell(`E${r}`));
      ws.getCell(`F${r}`).value = item.progress || ''; applyStyle(ws.getCell(`F${r}`));
      ws.getCell(`G${r}`).value = item.accumulatedQty || ''; applyStyle(ws.getCell(`G${r}`));
      ws.getCell(`H${r}`).value = item.notes || ''; applyStyle(ws.getCell(`H${r}`));
      ws.getRow(r).height = 20;
      r++;
    }

    ws.mergeCells(`A${r}:H${r}`);
    ws.getCell(`A${r}`).value = '工地人員及機具管理(含約定之出工人數及機具使用情形及數量)'; 
    applyStyle(ws.getCell(`A${r}`), true, true);
    ws.getCell(`A${r}`).font = { name: '微軟正黑體', size: 10, bold: true };
    r++;

    ws.mergeCells(`A${r}:B${r}`); ws.mergeCells(`E${r}:F${r}`);
    ws.getCell(`A${r}`).value = '出工工別'; applyStyle(ws.getCell(`A${r}`), true);
    ws.getCell(`C${r}`).value = '本日人數'; applyStyle(ws.getCell(`C${r}`), true);
    ws.getCell(`D${r}`).value = '累計人數'; applyStyle(ws.getCell(`D${r}`), true);
    ws.getCell(`E${r}`).value = '機具'; applyStyle(ws.getCell(`E${r}`), true);
    ws.getCell(`G${r}`).value = '數量'; applyStyle(ws.getCell(`G${r}`), true);
    ws.getCell(`H${r}`).value = '累計時數'; applyStyle(ws.getCell(`H${r}`), true);
    r++;

    for(let i=0; i<4; i++) {
      const w = workerStats[i] || {};
      const eq = equipStats[i] || {};
      ws.mergeCells(`A${r}:B${r}`); ws.mergeCells(`E${r}:F${r}`);
      ws.getCell(`A${r}`).value = w.category || ''; applyStyle(ws.getCell(`A${r}`));
      ws.getCell(`C${r}`).value = w.today || ''; applyStyle(ws.getCell(`C${r}`));
      ws.getCell(`D${r}`).value = w.accumulated || ''; applyStyle(ws.getCell(`D${r}`));
      ws.getCell(`E${r}`).value = eq.name || ''; applyStyle(ws.getCell(`E${r}`));
      ws.getCell(`G${r}`).value = eq.today || ''; applyStyle(ws.getCell(`G${r}`));
      ws.getCell(`H${r}`).value = eq.accumulated || ''; applyStyle(ws.getCell(`H${r}`));
      r++;
    }

    ws.mergeCells(`A${r}:B${r}`); ws.mergeCells(`E${r}:F${r}`);
    ws.getCell(`A${r}`).value = '總累計人數'; applyStyle(ws.getCell(`A${r}`), true);
    ws.getCell(`C${r}`).value = totalWorkerToday; applyStyle(ws.getCell(`C${r}`));
    ws.getCell(`D${r}`).value = totalWorkerAccumulated; applyStyle(ws.getCell(`D${r}`));
    ws.getCell(`E${r}`).value = '總計數量'; applyStyle(ws.getCell(`E${r}`), true);
    ws.getCell(`G${r}`).value = totalEquipToday; applyStyle(ws.getCell(`G${r}`));
    ws.getCell(`H${r}`).value = totalEquipAccumulated; applyStyle(ws.getCell(`H${r}`));
    r++;

    ws.mergeCells(`A${r}:H${r}`);
    const check1 = report.toolbox_meeting ? '■' : '□';
    const check1N = report.toolbox_meeting ? '□' : '■';
    let check2 = '□有 □無 □無新進勞工';
    if(report.safety_check_2 === '有') check2 = '■有 □無 □無新進勞工';
    if(report.safety_check_2 === '無') check2 = '□有 ■無 □無新進勞工';
    if(report.safety_check_2 === '無新進勞工' || !report.safety_check_2) check2 = '□有 □無 ■無新進勞工';

    ws.getCell(`A${r}`).value = `工地職業安全衛生事項之督導、公共環境與安全之維護及其他工地行政事務：
(一)施工前檢查事項：
  1. 工具箱會議(含工地預防災變及危害告知)： ${check1}有 ${check1N}無
  2. 確認新進勞工是否提報勞工保險(或其他商業保險)資料及安全衛生教育訓練紀錄：
     ${check2}`;
    applyStyle(ws.getCell(`A${r}`), false, true);
    ws.getRow(r).height = 100;
    r++;

    ws.mergeCells(`A${r}:H${r}`);
    ws.getCell(`A${r}`).value = `明日工作規劃：
${report.tomorrow_plan || '無'}`;
    applyStyle(ws.getCell(`A${r}`), false, true);
    ws.getRow(r).height = 50;
    r++;

    ws.mergeCells(`A${r}:H${r}`);
    ws.getCell(`A${r}`).value = `重要事項紀錄：
${report.important_notes || '無'}`;
    applyStyle(ws.getCell(`A${r}`), false, true);
    ws.getRow(r).height = 50;
    r++;

    ws.mergeCells(`A${r}:D${r}`); ws.mergeCells(`E${r}:H${r}`);
    ws.getCell(`A${r}`).value = `專案經理(PM)：
${report.pm?.name || ''}`;
    applyStyle(ws.getCell(`A${r}`), false, true);
    ws.getCell(`E${r}`).value = `現場負責人：
${report.recorder?.name || ''}`;
    applyStyle(ws.getCell(`E${r}`), false, true);
    ws.getRow(r).height = 60;
    r++;

    for(let row=2; row<r; row++) {
      for(let col=1; col<=8; col++) {
         const cell = ws.getCell(row, col);
         if (!cell.border) {
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
         }
      }
    }

    
    
    // --- Page 2: Photos ---
    if (allPhotos.length > 0) {
      for (let pIndex = 0; pIndex < allPhotos.length; pIndex += 6) {
          r += 2; // Some margin
          
          ws.mergeCells(`A${r}:H${r}`);
          ws.getCell(`A${r}`).value = '施 工 照 片 及 說 明';
          ws.getCell(`A${r}`).font = { name: '微軟正黑體', size: 16, bold: true };
          ws.getCell(`A${r}`).alignment = { vertical: 'middle', horizontal: 'center' };
          ws.getRow(r).height = 30;
          r++;

          ws.mergeCells(`B${r}:D${r}`);
          ws.getCell(`A${r}`).value = '業主'; applyStyle(ws.getCell(`A${r}`), true);
          ws.getCell(`B${r}`).value = report.project?.owner || ''; applyStyle(ws.getCell(`B${r}`));
          ws.getCell(`E${r}`).value = '填報日期'; applyStyle(ws.getCell(`E${r}`), true);
          ws.getCell(`F${r}`).value = dateStr; applyStyle(ws.getCell(`F${r}`));
          ws.getCell(`G${r}`).value = '星期'; applyStyle(ws.getCell(`G${r}`), true);
          ws.getCell(`H${r}`).value = dayOfWeek; applyStyle(ws.getCell(`H${r}`));
          r++;

          ws.mergeCells(`B${r}:D${r}`);
          ws.getCell(`A${r}`).value = '工程名稱'; applyStyle(ws.getCell(`A${r}`), true);
          ws.getCell(`B${r}`).value = report.project?.name || ''; applyStyle(ws.getCell(`B${r}`));
          ws.getCell(`E${r}`).value = '容量'; applyStyle(ws.getCell(`E${r}`), true);
          const cap = report.project?.capacity || '';
          ws.getCell(`F${r}`).value = cap ? (cap.toLowerCase().includes('w') ? cap : cap + ' kW') : ''; applyStyle(ws.getCell(`F${r}`));
          ws.getCell(`G${r}`).value = '本日天氣'; applyStyle(ws.getCell(`G${r}`), true);
          ws.getCell(`H${r}`).value = report.weather || ''; applyStyle(ws.getCell(`H${r}`));
          r++;

          // Up to 3 rows of photos (6 photos max)
          const chunk = allPhotos.slice(pIndex, pIndex + 6);
          for (let i = 0; i < chunk.length; i += 2) {
             const p1 = chunk[i];
             const p2 = chunk[i+1];
             
             const rowPhoto = r;
             ws.getRow(rowPhoto).height = 160; // Adjusted for 3 rows
             
             ws.mergeCells(`A${rowPhoto}:D${rowPhoto}`);
             ws.mergeCells(`E${rowPhoto}:H${rowPhoto}`);
             applyStyle(ws.getCell(`A${rowPhoto}`));
             applyStyle(ws.getCell(`E${rowPhoto}`));

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
             ws.mergeCells(`A${rowTitle}:D${rowTitle}`);
             ws.mergeCells(`E${rowTitle}:H${rowTitle}`);
             ws.getCell(`A${rowTitle}`).value = p1 ? p1.title : ''; applyStyle(ws.getCell(`A${rowTitle}`));
             ws.getCell(`E${rowTitle}`).value = p2 ? p2.title : ''; applyStyle(ws.getCell(`E${rowTitle}`));
             r++;
          }
          
          ws.mergeCells(`A${r}:H${r}`);
          ws.getCell(`A${r}`).value = `備註：`;
          applyStyle(ws.getCell(`A${r}`), false, true);
          ws.getRow(r).height = 40;
          r++;

          ws.mergeCells(`A${r}:D${r}`); ws.mergeCells(`E${r}:H${r}`);
          ws.getCell(`A${r}`).value = `專案經理(PM)：\n${report.pm?.name || ''}`;
          applyStyle(ws.getCell(`A${r}`), false, true);
          ws.getCell(`E${r}`).value = `現場負責人：\n${report.recorder?.name || ''}`;
          applyStyle(ws.getCell(`E${r}`), false, true);
          ws.getRow(r).height = 60;
          r++;
          
          // Add page break if there are more chunks
          if (pIndex + 6 < allPhotos.length) {
              ws.getRow(r - 1).addPageBreak();
          }
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
      try { wList = typeof r.dispatch_workers === 'string' ? JSON.parse(r.dispatch_workers) : (r.dispatch_workers || []); } catch(e){}
      try { eList = typeof r.equipments === 'string' ? JSON.parse(r.equipments) : (r.equipments || []); } catch(e){}
      
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
    try { workItems = typeof report.work_items === 'string' ? JSON.parse(report.work_items) : (report.work_items || []); } catch(e){}
    let workers = [];
    try { workers = typeof report.dispatch_workers === 'string' ? JSON.parse(report.dispatch_workers) : (report.dispatch_workers || []); } catch(e){}
    let equips = [];
    try { equips = typeof report.equipments === 'string' ? JSON.parse(report.equipments) : (report.equipments || []); } catch(e){}

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

    
    // --- Extract Photos ---
    const allPhotos: any[] = [];
    let parsedPhotos: any = {};
    try { parsedPhotos = typeof report.photos === 'string' ? JSON.parse(report.photos) : (report.photos || {}); } catch(e){}

    if (parsedPhotos.close) parsedPhotos.close.forEach((url: string, i: number) => allPhotos.push({ url, title: `施工近照 ${i+1}` }));
    if (parsedPhotos.mid) parsedPhotos.mid.forEach((url: string, i: number) => allPhotos.push({ url, title: `施工中距離照 ${i+1}` }));
    if (parsedPhotos.far) parsedPhotos.far.forEach((url: string, i: number) => allPhotos.push({ url, title: `施工遠距照 ${i+1}` }));

    workItems.forEach((item: any, idx: number) => {
      if (item.inspection && item.inspection.photo) {
         allPhotos.push({ url: item.inspection.photo, title: `${item.name} 自主檢查照片` });
      }
    });

    const getAbsPath = (url: string) => {
        if (!url) return null;
        return path.join(__dirname, '../../uploads', url.replace('/uploads/', ''));
    };

    const getBase64 = (url: string) => {
        const p = getAbsPath(url);
        if (p && fs.existsSync(p)) {
            const ext = path.extname(p).substring(1);
            const b64 = fs.readFileSync(p).toString('base64');
            return `data:image/${ext};base64,${b64}`;
        }
        return null;
    };

    allPhotos.forEach((p: any) => p.base64 = getBase64(p.url));


let templatePath = path.join(__dirname, '../templates/labor-report-pdf.ejs');
    if (!fs.existsSync(templatePath)) {
      templatePath = path.join(__dirname, '../../src/templates/labor-report-pdf.ejs');
    }
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
      totalEquipAccumulated,
      allPhotos,
      capacity: report.project?.capacity || ''
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
