import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();

// Get tasks (by project or general)
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { project_id, task_type } = req.query;
    const where: any = {};
    if (project_id) where.project_id = project_id as string;
    if (task_type) where.task_type = task_type as string;

    const tasks = await prisma.task.findMany({
      where,
      include: { 
        assignees: { select: { id: true, name: true, department: true } }, 
        project: { select: { name: true } },
        workLogs: { select: { logged_hours: true } },
        accepted_by: { select: { id: true, name: true } }
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '獲取任務失敗' });
  }
});

// Create task
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { project_id, name, description, estimated_hours, weight, status, task_type, priority, due_date, assignee_ids, workflow_node_id } = req.body;
    const user_id = req.user!.id;
    
    const task = await prisma.task.create({
      data: {
        project_id: project_id || null,
        name,
        description,
        estimated_hours: estimated_hours ? parseFloat(estimated_hours) : null,
        weight: weight ? parseInt(weight) : 1,
        status: status || '未開始',
        task_type: task_type || 'PROJECT',
        priority: priority || 'MEDIUM',
        due_date: due_date ? new Date(due_date) : null,
        workflow_node_id: workflow_node_id || null,
        creator_id: user_id,
        assignees: {
          connect: Array.isArray(assignee_ids) ? assignee_ids.map((id: string) => ({ id })) : []
        }
      }
    });
    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '建立任務失敗' });
  }
});

// Update task
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const taskId = req.params.id as string;
    const { name, description, estimated_hours, weight, status, workflow_node_id, assignee_ids } = req.body;
    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        name,
        description,
        estimated_hours: estimated_hours ? parseFloat(estimated_hours) : null,
        weight: weight ? parseInt(weight) : undefined,
        workflow_node_id: workflow_node_id || null,
        status,
        assignees: {
          set: Array.isArray(assignee_ids) ? assignee_ids.map((id: string) => ({ id })) : undefined
        }
      }
    });
    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '更新任務失敗' });
  }
});

// Delete task
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  if (req.user?.role !== 'SystemAdmin') {
    return res.status(403).json({ error: '權限不足，僅系統管理員可刪除' });
  }
  try {
    const taskId = req.params.id as string;
    await prisma.workLog.deleteMany({ where: { task_id: taskId } });
    await prisma.task.delete({ where: { id: taskId } });
    res.json({ message: '任務已刪除' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '刪除任務失敗' });
  }
});

// Get work logs for a task
router.get('/:id/worklogs', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const taskId = req.params.id as string;
    const workLogs = await prisma.workLog.findMany({
      where: { task_id: taskId },
      include: { user: { select: { name: true } } },
      orderBy: { created_at: 'desc' }
    });
    res.json(workLogs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '獲取任務處理紀錄失敗' });
  }
});

// Add work log for a task
router.post('/:id/worklogs', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const taskId = req.params.id as string;
    const { description, logged_hours, is_completed } = req.body;
    const user_id = req.user!.id;
    
    // Create work log
    const workLog = await prisma.workLog.create({
      data: {
        task_id: taskId,
        user_id,
        work_date: new Date(),
        logged_hours: logged_hours ? parseFloat(logged_hours) : 0,
        description
      },
      include: { user: { select: { name: true } } }
    });

    // Update task status to completed if specified
    if (is_completed) {
      await prisma.task.update({
        where: { id: taskId },
        data: { status: '已完成' }
      });
    } else {
      // If adding a work log and not completed, ensure it's marked as In Progress if currently "未開始"
      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (task && task.status === '未開始') {
        await prisma.task.update({
          where: { id: taskId },
          data: { status: '進行中' }
        });
      }
    }

    res.json(workLog);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '新增任務處理紀錄失敗' });
  }
});

// Accept a task
router.post('/:id/accept', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const taskId = req.params.id as string;
    const user_id = req.user!.id;

    // Check if already accepted
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { accepted_by: true, assignees: true }
    });

    if (!task) return res.status(404).json({ error: '找不到任務' });

    // Update to add user to accepted_by
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        accepted_by: {
          connect: { id: user_id }
        },
        // If task is 未開始, update it to 進行中
        status: task.status === '未開始' ? '進行中' : undefined
      }
    });

    res.json(updatedTask);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '接取任務失敗' });
  }
});

export default router;
