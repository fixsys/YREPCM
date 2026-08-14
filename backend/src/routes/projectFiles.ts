import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
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

// Get files for project
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const projectId = req.params.projectId as string;
    const files = await prisma.projectFile.findMany({
      where: { project_id: projectId },
      include: { uploader: { select: { name: true } } },
      orderBy: { uploaded_at: 'desc' }
    });
    res.json(files);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '獲取檔案失敗' });
  }
});

// Upload file
router.post('/', authenticateToken, upload.single('file'), async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ error: '未授權' });
  const projectId = req.params.projectId as string;
  const { category } = req.body;
  const file = req.file;

  if (!file) return res.status(400).json({ error: '無上傳檔案' });
  if (!category) return res.status(400).json({ error: '未提供檔案類別' });

  try {
    const projectFile = await prisma.projectFile.create({
      data: {
        project_id: projectId,
        category,
        file_name: file.originalname,
        file_path: `/uploads/projects/${file.filename}`,
        uploaded_by: req.user.id
      },
      include: { uploader: { select: { name: true } } }
    });
    res.json(projectFile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '上傳檔案失敗' });
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
