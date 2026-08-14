import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();

// 確保上傳資料夾存在
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 設定 Multer 儲存
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Get all logs (for dashboard)
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const logs = await prisma.dailyLog.findMany({
      include: { project: { select: { project_code: true } } },
      orderBy: { start_time: 'desc' }
    });
    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '獲取日誌失敗' });
  }
});

// Get logs for a project
router.get('/project/:projectId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const projectId = req.params.projectId as string;
    const logs = await prisma.dailyLog.findMany({
      where: { project_id: projectId },
      include: {
        executor: { select: { name: true } }
      },
      orderBy: { start_time: 'desc' }
    });
    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '獲取日誌失敗' });
  }
});

// Create log (with optional attachments)
router.post('/', authenticateToken, upload.array('attachments', 6), async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ error: '未授權' });

  const { project_id, task_item, sub_task, start_time, est_end_time, act_end_time, est_days } = req.body;
  const department = req.user.department; // 日誌部門依據登入者部門
  const executor_id = req.user.id;
  const files = req.files as Express.Multer.File[];
  const attachmentPath = files && files.length > 0 ? JSON.stringify(files.map(f => `/uploads/${f.filename}`)) : null;

  try {
    const log = await prisma.dailyLog.create({
      data: {
        project_id,
        executor_id,
        department,
        task_item,
        sub_task,
        start_time: new Date(start_time),
        est_end_time: est_end_time ? new Date(est_end_time) : null,
        act_end_time: act_end_time ? new Date(act_end_time) : null,
        est_days: est_days ? parseFloat(est_days) : null,
        attachment: attachmentPath
      }
    });
    res.json(log);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '新增日誌失敗' });
  }
});

// Update log (Only same department or SystemAdmin can update)
router.put('/:id', authenticateToken, upload.array('attachments', 6), async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ error: '未授權' });

  try {
    const logId = req.params.id as string;
    const existingLog = await prisma.dailyLog.findUnique({ where: { id: logId } });
    if (!existingLog) return res.status(404).json({ error: '找不到日誌' });

    if (existingLog.department !== req.user.department && req.user.role !== 'SystemAdmin') {
      return res.status(403).json({ error: '只能編輯自己部門的日誌' });
    }

    const { task_item, sub_task, start_time, est_end_time, act_end_time, est_days } = req.body;
    
    let attachmentPath = existingLog.attachment;
    const files = req.files as Express.Multer.File[];
    if (files && files.length > 0) {
      attachmentPath = JSON.stringify(files.map(f => `/uploads/${f.filename}`));
    }

    const log = await prisma.dailyLog.update({
      where: { id: logId },
      data: {
        task_item,
        sub_task,
        start_time: start_time ? new Date(start_time) : undefined,
        est_end_time: est_end_time ? new Date(est_end_time) : null,
        act_end_time: act_end_time ? new Date(act_end_time) : null,
        est_days: est_days ? parseFloat(est_days) : null,
        attachment: attachmentPath
      }
    });
    res.json(log);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '更新日誌失敗' });
  }
});

// Delete log (Only same department or SystemAdmin)
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ error: '未授權' });

  try {
    const logId = req.params.id as string;
    const existingLog = await prisma.dailyLog.findUnique({ where: { id: logId } });
    if (!existingLog) return res.status(404).json({ error: '找不到日誌' });

    if (existingLog.department !== req.user.department && req.user.role !== 'SystemAdmin') {
      return res.status(403).json({ error: '只能刪除自己部門的日誌' });
    }

    await prisma.dailyLog.delete({ where: { id: logId } });
    res.json({ message: '日誌已刪除' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '刪除日誌失敗' });
  }
});

export default router;
