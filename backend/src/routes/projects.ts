import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();

// Get all projects
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        salesRep: { select: { id: true, name: true, department: true } },
        engRep: { select: { id: true, name: true, department: true } },
        designRep: { select: { id: true, name: true, department: true } },
        procurementRep: { select: { id: true, name: true, department: true } },
        steelRep: { select: { id: true, name: true, department: true } },
        dailyLogs: { orderBy: { created_at: 'desc' }, take: 1 },
        tasks: { orderBy: { created_at: 'desc' }, take: 1 }
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(projects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '獲取專案失敗' });
  }
});

// Get single project details
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const projectId = req.params.id as string;
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        salesRep: { select: { id: true, name: true, department: true } },
        engRep: { select: { id: true, name: true, department: true } },
        designRep: { select: { id: true, name: true, department: true } },
        procurementRep: { select: { id: true, name: true, department: true } },
        steelRep: { select: { id: true, name: true, department: true } },
        dailyLogs: { orderBy: { created_at: 'desc' }, take: 1 },
        tasks: { orderBy: { created_at: 'desc' }, take: 1 },
        requirementTicket: true
      }
    });
    if (!project) return res.status(404).json({ error: '找不到專案' });
    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '獲取專案失敗' });
  }
});

// POST project takeover (assign code)
router.post('/:id/takeover', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { project_code } = req.body;
    
    if (!project_code) return res.status(400).json({ error: '請輸入專案代碼' });

    const existingCode = await prisma.project.findUnique({ where: { project_code } });
    if (existingCode && existingCode.id !== id) {
      return res.status(400).json({ error: '該專案代碼已被使用，請更換一個代碼' });
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        project_code,
        status: '評估中'
      }
    });

    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '接取專案失敗' });
  }
});

// Get project contribution
router.get('/:id/contribution', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const projectId = req.params.id as string;
    
    // Fetch all tasks and work logs for the project
    const tasks = await prisma.task.findMany({ where: { project_id: projectId } });
    const workLogs = await prisma.workLog.findMany({ 
      where: { project_id: projectId },
      include: { user: { select: { id: true, name: true, account: true } } }
    });

    // 1. Calculate Total Task Weights (for completed tasks, we can assume a task is completed if status === '已完成'. The prompt said: "該員工在該專案已完成任務的總權重分數". But let's clarify, maybe just assign weight based on work logs on the task? If a user worked on a task, they get a share of its weight.
    // For simplicity and following prompt: "員工完成了多少困難或重要的任務... (該員工在該專案已完成任務的總權重分數 / 該專案所有任務的總權重分數)"
    // Let's assume weight is granted to the user who logged the most hours on it, or proportionally. The prompt doesn't specify how to attribute a completed task to a specific user if multiple worked on it. Let's just attribute the task weight proportionally to the hours logged on that task by each user.
    // Actually, the prompt says "已完成任務的總權重". So we only consider tasks with status === '已完成'.
    const totalProjectWeight = tasks.reduce((sum, t) => sum + t.weight, 0);
    const completedTasks = tasks.filter(t => t.status === '已完成');

    // 2. Calculate Total Logged Hours
    const totalProjectHours = workLogs.reduce((sum, l) => sum + Number(l.logged_hours), 0);

    // Group by user
    const userStats: Record<string, { userId: string, name: string, hours: number, weightShare: number }> = {};
    
    workLogs.forEach(log => {
      if (!userStats[log.user_id]) {
        userStats[log.user_id] = { userId: log.user_id, name: log.user.name, hours: 0, weightShare: 0 };
      }
      userStats[log.user_id].hours += Number(log.logged_hours);
    });

    // Distribute completed task weights to users based on their share of hours on that task
    completedTasks.forEach(task => {
      const taskLogs = workLogs.filter(l => l.task_id === task.id);
      const taskTotalHours = taskLogs.reduce((sum, l) => sum + Number(l.logged_hours), 0);
      if (taskTotalHours > 0) {
        taskLogs.forEach(log => {
          const userShare = Number(log.logged_hours) / taskTotalHours;
          userStats[log.user_id].weightShare += task.weight * userShare;
        });
      }
    });

    // Calculate Final Contribution
    const contributionData = Object.values(userStats).map(stat => {
      const weightContribution = totalProjectWeight > 0 ? (stat.weightShare / totalProjectWeight) * 100 : 0;
      const effortContribution = totalProjectHours > 0 ? (stat.hours / totalProjectHours) * 100 : 0;
      
      const totalContribution = (weightContribution * 0.7) + (effortContribution * 0.3);
      
      return {
        ...stat,
        weightContribution,
        effortContribution,
        totalContribution
      };
    });

    // Sort by total contribution descending
    contributionData.sort((a, b) => b.totalContribution - a.totalContribution);

    res.json({
      totalProjectWeight,
      totalProjectHours,
      contributions: contributionData
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '計算貢獻度失敗' });
  }
});

// Get project workflow
router.get('/:id/workflow', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const projectId = req.params.id as string;
    const projectWorkflow = await prisma.projectWorkflow.findUnique({
      where: { project_id: projectId },
      include: {
        template: {
          include: {
            nodes: true,
            edges: true
          }
        }
      }
    });

    if (!projectWorkflow) {
      return res.status(404).json({ error: '找不到專案流程' });
    }

    res.json(projectWorkflow);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '獲取專案流程失敗' });
  }
});

// Create project
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { template_id, ...projectData } = req.body;
    
    // Create Project
    const project = await prisma.project.create({
      data: projectData
    });

    // If template_id provided, map it
    if (template_id) {
      await prisma.projectWorkflow.create({
        data: {
          project_id: project.id,
          template_id: template_id
        }
      });
    }

    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '建立專案失敗，代碼可能已存在' });
  }
});

// Update project
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const projectId = req.params.id as string;
    const { template_id, ...projectData } = req.body;
    
    const project = await prisma.project.update({
      where: { id: projectId },
      data: projectData
    });

    if (template_id) {
      await prisma.projectWorkflow.upsert({
        where: { project_id: projectId },
        update: { template_id },
        create: { project_id: projectId, template_id }
      });
    }

    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '更新專案失敗' });
  }
});

// Delete project
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  if (req.user?.role !== 'SystemAdmin') return res.status(403).json({ error: '權限不足' });
  try {
    const projectId = req.params.id as string;
    await prisma.dailyLog.deleteMany({ where: { project_id: projectId } });
    await prisma.project.delete({
      where: { id: projectId }
    });
    res.json({ message: '專案已刪除' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '刪除專案失敗' });
  }
});

// Reject project (Return to sales)
router.post('/:id/reject', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const projectId = req.params.id as string;
    const { reason } = req.body;
    
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ error: '找不到專案' });
    if (project.status !== '待接取') return res.status(400).json({ error: '該專案目前無法退回' });

    let newNotes = project.notes || '';
    if (reason) {
      const timestamp = new Date().toLocaleString('zh-TW');
      const rejectNote = `[${timestamp} 退回原因]: ${reason}`;
      newNotes = newNotes ? `${newNotes}\n\n${rejectNote}` : rejectNote;
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        status: '退回修正',
        notes: newNotes
      }
    });

    // Find associated RequirementTicket to update Lead status
    const requirement = await prisma.requirementTicket.findUnique({
      where: { project_id: projectId }
    });

    if (requirement) {
      await prisma.lead.update({
        where: { id: requirement.lead_id },
        data: { status: 'RETURNED' }
      });
    }

    res.json(updatedProject);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '退回專案失敗' });
  }
});

export default router;
