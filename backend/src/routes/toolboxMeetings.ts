import { Router } from 'express';
import puppeteer from 'puppeteer';
import ejs from 'ejs';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();

const uploadDir = path.join(__dirname, '../../uploads/toolbox');
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

// Get toolbox meetings
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { project_id, module_type } = req.query;
    const whereClause: any = {};
    if (project_id) whereClause.project_id = String(project_id);
    if (module_type) whereClause.module_type = String(module_type);

    // 記錄人權限控管：非最高管理員 (level < 100) 於現場報工 / 製造報工列表 (!project_id) 僅能看到自己建立的紀錄
    const isAdmin = Boolean(req.user?.level && req.user.level >= 100);
    if (!isAdmin && !project_id && req.user?.id) {
      whereClause.recorder_id = req.user.id;
    }

    const meetings = await prisma.toolboxMeeting.findMany({
      where: whereClause,
      include: {
        recorder: { select: { name: true } },
        project: { select: { project_code: true, name: true } },
        dispatchOrder: { select: { id: true, dispatch_no: true, items: true } }
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(meetings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '獲取會議紀錄失敗' });
  }
});

const cleanOptionalId = (val: any): string | null => {
  if (!val || val === 'undefined' || val === 'null' || String(val).trim() === '') return null;
  return String(val).trim();
};

const safeJsonParse = (val: any, fallback: any = []) => {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(String(val));
  } catch {
    return fallback;
  }
};

// Create toolbox meeting
router.post('/', authenticateToken, upload.array('photos', 20), async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ error: '登入已過期或未授權，請重新登入後再試' });

  const {
    project_id,
    dispatch_order_id,
    module_type,
    record_date,
    recorder_id,
    worker_count,
    work_category,
    work_content,
    safety_check_1,
    safety_check_2,
    safety_check_3,
    work_area,
    work_items,
    hazards,
    safety_measures,
    other_risks,
    signatures,
    equipments
  } = req.body;

  const isMfg = module_type === 'MANUFACTURING';
  const parsedWorkItems = safeJsonParse(work_items, []);
  const files = (req.files as Express.Multer.File[]) || [];
  const missing: string[] = [];

  const cleanedProjectId = cleanOptionalId(project_id);
  const cleanedDispatchId = cleanOptionalId(dispatch_order_id);

  if (isMfg) {
    if (!Array.isArray(parsedWorkItems) || parsedWorkItems.filter((w: any) => w?.name).length === 0) {
      missing.push('「工作內容」：請至少選擇一筆今日生產之「專案與派工單號」');
    }
  } else if (!cleanedProjectId) {
    missing.push('「專案代碼」：請選擇所屬專案');
  }

  if (!record_date || Number.isNaN(new Date(record_date).getTime())) {
    missing.push('「會議日期」：請選擇有效的會議日期');
  }
  if (!worker_count || parseInt(worker_count) <= 0) {
    missing.push('「上工人數」：請填寫大於 0 的上工人數');
  }
  if (!work_category || String(work_category).trim() === '') {
    missing.push('「工程類別」：請至少勾選一項工程類別');
  }
  if (!work_content || String(work_content).trim() === '') {
    missing.push('「今日工作內容」：請填寫今日工作內容簡述');
  }
  if (files.length < 2) {
    missing.push(`「會議照片」：必須上傳至少 2 張照片（目前已選 ${files.length} 張，還差 ${2 - files.length} 張）`);
  }
  const uncheckedSafety: string[] = [];
  if (safety_check_1 !== 'true' && safety_check_1 !== true) uncheckedSafety.push('第 1 項 (危害告知與安全說明)');
  if (safety_check_2 !== 'true' && safety_check_2 !== true) uncheckedSafety.push('第 2 項 (禁酒與安全帽/安全鞋確認)');
  if (safety_check_3 !== 'true' && safety_check_3 !== true) uncheckedSafety.push('第 3 項 (工作內容與緊急應變確認)');
  if (uncheckedSafety.length > 0) {
    missing.push(`「工安提醒與確認」：尚未勾選 ${uncheckedSafety.join('、')}`);
  }

  if (missing.length > 0) {
    return res.status(400).json({
      error: `工具箱會議資料尚未完整，請補齊以下項目後再送出：\n• ${missing.join('\n• ')}`,
      missingFields: missing,
    });
  }

  const photoPaths = files.map(file => `/uploads/toolbox/${file.filename}`);
  const isAdmin = Boolean(req.user.level && req.user.level >= 100);
  const cleanedRecorderId = cleanOptionalId(recorder_id);

  try {
    const meeting = await prisma.toolboxMeeting.create({
      data: {
        project_id: cleanedProjectId,
        dispatch_order_id: cleanedDispatchId,
        module_type: module_type || 'ONSITE',
        record_date: new Date(record_date),
        recorder_id: isAdmin && cleanedRecorderId ? cleanedRecorderId : req.user.id,
        worker_count: parseInt(worker_count) || 0,
        work_category: String(work_category).trim(),
        work_content: String(work_content).trim(),
        safety_check_1: safety_check_1 === 'true' || safety_check_1 === true,
        safety_check_2: safety_check_2 === 'true' || safety_check_2 === true,
        safety_check_3: safety_check_3 === 'true' || safety_check_3 === true,
        work_area: work_area || '',
        other_risks: other_risks || '',
        work_items: parsedWorkItems,
        hazards: safeJsonParse(hazards, []),
        safety_measures: safeJsonParse(safety_measures, []),
        equipments: safeJsonParse(equipments, []),
        signatures: safeJsonParse(signatures, []),
        photos: JSON.stringify(photoPaths)
      }
    });
    res.json(meeting);
  } catch (error: any) {
    console.error(error);
    const detail =
      error?.code === 'P2003'
        ? '關聯資料（專案、派工單或記錄人員）不存在或已被刪除，請重新選擇後再試'
        : error?.message || '資料庫寫入異常';
    res.status(500).json({ error: `建立工具箱會議紀錄失敗：${detail}`, details: error?.message });
  }
});


// Update toolbox meeting
router.put('/:id', authenticateToken, upload.array('photos', 20), async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ error: '登入已過期或未授權，請重新登入後再試' });

  const { id } = req.params;
  const {
    project_id,
    dispatch_order_id,
    module_type,
    record_date,
    recorder_id,
    worker_count,
    work_category,
    work_content,
    safety_check_1,
    safety_check_2,
    safety_check_3,
    work_area,
    work_items,
    hazards,
    safety_measures,
    other_risks,
    signatures,
    equipments
  } = req.body;
  const isAdmin = Boolean(req.user.level && req.user.level >= 100);

  try {
    const existing = await prisma.toolboxMeeting.findUnique({ where: { id: id as string } });
    if (!existing) return res.status(404).json({ error: '找不到該筆工具箱會議紀錄，可能已被刪除' });
    if (!isAdmin && existing.recorder_id !== req.user.id) {
      return res.status(403).json({ error: '權限不足，僅能編輯本人建立之紀錄' });
    }

    const isMfg = (module_type || existing.module_type) === 'MANUFACTURING';
    const parsedWorkItems = safeJsonParse(work_items, []);
    const cleanedProjectId = cleanOptionalId(project_id);
    const cleanedDispatchId = cleanOptionalId(dispatch_order_id);
    const cleanedRecorderId = cleanOptionalId(recorder_id);
    const missing: string[] = [];

    if (isMfg) {
      if (!Array.isArray(parsedWorkItems) || parsedWorkItems.filter((w: any) => w?.name).length === 0) {
        missing.push('「工作內容」：請至少選擇一筆今日生產之「專案與派工單號」');
      }
    } else if (!cleanedProjectId) {
      missing.push('「專案代碼」：請選擇所屬專案');
    }
    if (!record_date || Number.isNaN(new Date(record_date).getTime())) {
      missing.push('「會議日期」：請選擇有效的會議日期');
    }
    if (!worker_count || parseInt(worker_count) <= 0) {
      missing.push('「上工人數」：請填寫大於 0 的上工人數');
    }
    if (!work_category || String(work_category).trim() === '') {
      missing.push('「工程類別」：請至少勾選一項工程類別');
    }
    if (!work_content || String(work_content).trim() === '') {
      missing.push('「今日工作內容」：請填寫今日工作內容簡述');
    }
    const files = (req.files as Express.Multer.File[]) || [];
    if (files.length === 1) {
      missing.push('「會議照片」：若要重新上傳更新照片，必須上傳至少 2 張（目前已選 1 張）');
    }

    if (missing.length > 0) {
      return res.status(400).json({
        error: `更新工具箱會議資料尚未完整，請修正以下項目：\n• ${missing.join('\n• ')}`,
        missingFields: missing,
      });
    }

    const dataToUpdate: any = {
      project_id: cleanedProjectId,
      dispatch_order_id: cleanedDispatchId,
      record_date: new Date(record_date),
      recorder_id: isAdmin && cleanedRecorderId ? cleanedRecorderId : existing.recorder_id,
      worker_count: parseInt(worker_count) || 0,
      work_category: String(work_category).trim(),
      work_content: String(work_content).trim(),
      safety_check_1: safety_check_1 === 'true' || safety_check_1 === true,
      safety_check_2: safety_check_2 === 'true' || safety_check_2 === true,
      safety_check_3: safety_check_3 === 'true' || safety_check_3 === true,
      work_area: work_area || '',
      other_risks: other_risks || '',
      work_items: parsedWorkItems,
      hazards: safeJsonParse(hazards, []),
      safety_measures: safeJsonParse(safety_measures, []),
      equipments: safeJsonParse(equipments, []),
      signatures: safeJsonParse(signatures, [])
    };

    if (files && files.length >= 2) {
      dataToUpdate.photos = JSON.stringify(files.map(file => `/uploads/toolbox/${file.filename}`));
    }

    const meeting = await prisma.toolboxMeeting.update({
      where: { id: id as string },
      data: dataToUpdate
    });
    res.json(meeting);
  } catch (error: any) {
    console.error(error);
    const detail =
      error?.code === 'P2003'
        ? '關聯資料（專案、派工單或記錄人員）不存在或已被刪除，請重新選擇後再試'
        : error?.message || '資料庫更新異常';
    res.status(500).json({ error: `更新工具箱會議紀錄失敗：${detail}`, details: error?.message });
  }
});


// Export PDF
router.get('/:id/export-pdf', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const meeting = await prisma.toolboxMeeting.findUnique({
      where: { id: id as string },
      include: {
        project: true,
        recorder: true
      }
    });

    if (!meeting) {
      return res.status(404).json({ error: 'Toolbox meeting not found' });
    }

    const logoPath = path.join(process.cwd(), '../frontend/public/logo.png');
    let logoBase64 = '';
    if (fs.existsSync(logoPath)) {
        logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
    }

    let photoUrls: string[] = [];
    try {
      photoUrls = typeof meeting.photos === 'string'
        ? JSON.parse(meeting.photos)
        : (Array.isArray(meeting.photos) ? (meeting.photos as string[]) : []);
    } catch (e) {}

    const getAbsPath = (url: string) => {
      if (!url) return null;
      return path.join(__dirname, '../../uploads', url.replace('/uploads/', ''));
    };

    const getBase64 = (url: string) => {
      const p = getAbsPath(url);
      if (p && fs.existsSync(p)) {
        const ext = path.extname(p).substring(1) || 'jpeg';
        const b64 = fs.readFileSync(p).toString('base64');
        return `data:image/${ext};base64,${b64}`;
      }
      return null;
    };

    const allPhotos = photoUrls
      .map((url: string, i: number) => ({
        url,
        title: `會議照片 ${i + 1}`,
        base64: getBase64(url)
      }))
      .filter(p => p.base64);

    const recDate = new Date(meeting.record_date);
    const recordDate = `${recDate.getFullYear()}/${(recDate.getMonth() + 1).toString().padStart(2, '0')}/${recDate.getDate().toString().padStart(2, '0')}`;
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    const dayOfWeek = days[recDate.getDay()];
    const capacity = meeting.project?.capacity || '';

    let templatePath = path.join(__dirname, '../templates/toolbox-meeting-pdf.ejs');
    if (!fs.existsSync(templatePath)) {
      templatePath = path.join(__dirname, '../../src/templates/toolbox-meeting-pdf.ejs');
    }
    if (!fs.existsSync(templatePath)) {
      return res.status(500).json({ error: 'Template not found' });
    }

    const html = await ejs.renderFile(templatePath, {
      meeting,
      recordDate,
      dayOfWeek,
      capacity,
      allPhotos,
      logoBase64
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

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=toolbox-meeting-${id}.pdf`);
    res.send(Buffer.from(pdfBuffer));

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});


// Delete toolbox meeting
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  if ((!req.user?.level || req.user.level < 100)) return res.status(403).json({ error: '權限不足，僅系統管理員可刪除' });
  try {
    await prisma.toolboxMeeting.delete({ where: { id: req.params.id as string } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '刪除失敗' });
  }
});

export default router;
