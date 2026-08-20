import { Router } from 'express';
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
    const { project_id } = req.query;
    const whereClause = project_id ? { project_id: String(project_id) } : {};

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

  const { project_id, record_date, recorder_id, worker_count, work_category, work_content, safety_check_1, safety_check_2, safety_check_3, work_area, work_items, hazards, safety_measures, other_risks } = req.body;
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
        record_date: new Date(record_date),
        recorder_id: recorder_id || req.user.id,
        worker_count: parseInt(worker_count),
        work_category,
        work_content,
        safety_check_1: safety_check_1 === 'true',
        safety_check_2: safety_check_2 === 'true',
        safety_check_3: safety_check_3 === 'true',
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
  const { project_id, record_date, recorder_id, worker_count, work_category, work_content, safety_check_1, safety_check_2, safety_check_3 } = req.body;

  try {
    const dataToUpdate: any = {
      project_id,
      record_date: new Date(record_date),
      recorder_id: recorder_id || req.user.id,
      worker_count: parseInt(worker_count),
      work_category,
      work_content,
      safety_check_1: safety_check_1 === 'true' || safety_check_1 === true,
      safety_check_2: safety_check_2 === 'true' || safety_check_2 === true,
      safety_check_3: safety_check_3 === 'true' || safety_check_3 === true,
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

export default router;
