import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();

// Get work logs (with optional filters)
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { project_id, task_id, user_id } = req.query;
    const where: any = {};
    if (project_id) where.project_id = project_id;
    if (task_id) where.task_id = task_id;
    if (user_id) where.user_id = user_id;

    const logs = await prisma.workLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, department: true } },
        task: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } }
      },
      orderBy: { work_date: 'desc' }
    });
    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '獲取工時紀錄失敗' });
  }
});

// Create work log
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { task_id, project_id, work_date, logged_hours, description } = req.body;
    const user_id = req.user?.id;
    if (!user_id) return res.status(401).json({ error: '未授權' });

    const log = await prisma.workLog.create({
      data: {
        task_id,
        project_id,
        user_id,
        work_date: new Date(work_date),
        logged_hours: parseFloat(logged_hours),
        description
      }
    });
    res.json(log);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '建立工時紀錄失敗' });
  }
});

// Delete work log
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const logId = req.params.id as string;
    await prisma.workLog.delete({ where: { id: logId } });
    res.json({ message: '工時紀錄已刪除' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '刪除工時紀錄失敗' });
  }
});

export default router;
