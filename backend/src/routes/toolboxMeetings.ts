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

    const meetings = await prisma.toolboxMeeting.findMany({
      where: whereClause,
      include: { recorder: { select: { name: true } }, project: { select: { project_code: true, name: true } } },
      orderBy: { created_at: 'desc' }
    });
    res.json(meetings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '獲取會議紀錄失敗' });
  }
});

// Create toolbox meeting
router.post('/', authenticateToken, upload.array('photos', 5), async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ error: '未授權' });

  const { project_id, module_type, record_date, recorder_id, worker_count, work_category, work_content, safety_check_1, safety_check_2, safety_check_3, work_area, work_items, hazards, safety_measures, other_risks, signatures, equipments } = req.body;
  if (!project_id) return res.status(400).json({ error: '必須選擇專案' });
  
  const files = req.files as Express.Multer.File[];
  if (!files || files.length < 2) {
    return res.status(400).json({ error: '必須上傳至少2張會議照片' });
  }

  const photoPaths = files.map(file => `/uploads/toolbox/${file.filename}`);

  try {
    const meeting = await prisma.toolboxMeeting.create({
      data: {
          project_id,
          module_type: module_type || 'ONSITE',
          record_date: new Date(record_date),
          recorder_id: recorder_id || req.user.id,
          worker_count: parseInt(worker_count) || 0,
          work_category,
          work_content,
          safety_check_1: safety_check_1 === 'true',
          safety_check_2: safety_check_2 === 'true',
          safety_check_3: safety_check_3 === 'true',
          work_area: work_area || '',
          other_risks: other_risks || '',
          work_items: work_items ? JSON.parse(work_items) : [],
          hazards: hazards ? JSON.parse(hazards) : [],
          safety_measures: safety_measures ? JSON.parse(safety_measures) : [],
          equipments: equipments ? JSON.parse(equipments) : [],
          signatures: signatures ? JSON.parse(signatures) : [],
          photos: JSON.stringify(photoPaths)
        }
    });
    res.json(meeting);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '建立會議紀錄失敗' });
  }
});


// Update toolbox meeting
router.put('/:id', authenticateToken, upload.array('photos', 5), async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ error: '未授權' });

  const { id } = req.params;
  const { project_id, record_date, recorder_id, worker_count, work_category, work_content, safety_check_1, safety_check_2, safety_check_3, work_area, work_items, hazards, safety_measures, other_risks, signatures, equipments } = req.body;

  try {
    const dataToUpdate: any = {
        project_id,
        record_date: new Date(record_date),
        recorder_id: recorder_id || req.user.id,
        worker_count: parseInt(worker_count) || 0,
        work_category,
        work_content,
        safety_check_1: safety_check_1 === 'true' || safety_check_1 === true,
        safety_check_2: safety_check_2 === 'true' || safety_check_2 === true,
        safety_check_3: safety_check_3 === 'true' || safety_check_3 === true,
        work_area: work_area || '',
        other_risks: other_risks || '',
        work_items: work_items ? JSON.parse(work_items) : [],
        hazards: hazards ? JSON.parse(hazards) : [],
        safety_measures: safety_measures ? JSON.parse(safety_measures) : [],
        equipments: equipments ? JSON.parse(equipments) : [],
        signatures: signatures ? JSON.parse(signatures) : []
      };

    const files = req.files as Express.Multer.File[];
    if (files && files.length >= 2) {
      dataToUpdate.photos = JSON.stringify(files.map(file => `/uploads/toolbox/${file.filename}`));
    }

    const meeting = await prisma.toolboxMeeting.update({
      where: { id: id as string },
      data: dataToUpdate
    });
    res.json(meeting);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '更新會議紀錄失敗' });
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
