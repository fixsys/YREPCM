import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
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
    const reports = await prisma.dailyLaborReport.findMany({
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

  const { project_id, report_date, weather, recorder_id, pm_id, engineers, work_category, work_items, drawing_number, drawing_revision, construction_location, drawing_check_result, drawing_check_confirmed, safety_check_1, safety_check_2, safety_check_3, additional_notes } = req.body;
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
        additional_notes,
        photos: hasPhotos ? JSON.stringify(photosObj) : null
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
  const { project_id, report_date, weather, recorder_id, pm_id, engineers, work_category, work_items, drawing_number, drawing_revision, construction_location, drawing_check_result, drawing_check_confirmed, safety_check_1, safety_check_2, safety_check_3, additional_notes } = req.body;

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

export default router;
