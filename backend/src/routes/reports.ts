import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();

// Get work logs report
router.get('/work-logs', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { start_date, end_date, department, user_id } = req.query;

    const where: any = {};
    if (start_date && end_date) {
      where.work_date = {
        gte: new Date(start_date as string),
        lte: new Date(end_date as string)
      };
    }
    if (user_id) where.user_id = user_id;

    // We need to filter by department, but department is in the User table.
    // Prisma allows filtering by relation fields in findMany
    if (department) {
      where.user = { department: department as string };
    }

    const logs = await prisma.workLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, department: true } },
        task: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } }
      },
      orderBy: { work_date: 'desc' }
    });

    // Group logs by user for the workload analysis
    const userStats: Record<string, { userId: string, name: string, department: string, totalHours: number }> = {};

    logs.forEach(log => {
      if (!userStats[log.user_id]) {
        userStats[log.user_id] = {
          userId: log.user_id,
          name: log.user.name,
          department: log.user.department?.name || '',
          totalHours: 0
        };
      }
      userStats[log.user_id].totalHours += Number(log.logged_hours);
    });

    const reportData = Object.values(userStats).map(stat => {
      let status = '正常';
      // In a real application, you'd calculate weeks between start_date and end_date and multiply by 40.
      // For this example, let's assume the user queries a single week, so standard is 40.
      // If we don't have start/end, we just provide the total.
      let expectedHours = 40; 
      if (start_date && end_date) {
        const start = new Date(start_date as string).getTime();
        const end = new Date(end_date as string).getTime();
        const weeks = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24 * 7)));
        expectedHours = weeks * 40;
      }
      
      if (stat.totalHours > expectedHours + 10) status = '過載';
      else if (stat.totalHours < expectedHours - 10) status = '閒置';

      return {
        ...stat,
        expectedHours,
        status
      };
    });

    res.json({
      logs, // detailed logs for CSV export
      summary: reportData // summary for UI
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '獲取報表失敗' });
  }
});

router.get('/dashboard', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const projects = await prisma.project.findMany({
      include: {
        dailyLogs: {
          orderBy: { created_at: 'desc' },
          take: 1
        }
      }
    });

    const activeProjects = projects.filter(p => ['施工中', '評估中'].includes(p.status)).length;
    const completedProjects = projects.filter(p => p.status === '已完工').length;

    // Overdue tasks
    const now = new Date();
    const tasks = await prisma.task.findMany({
      include: {
        assignees: true,
        project: true
      }
    });
    const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== '已完成');

    // My tasks
    const myTasks = tasks.filter(t => t.assignees.some(a => a.id === user.id));
    const myOverdueTasks = overdueTasks.filter(t => t.assignees.some(a => a.id === user.id));

    // Team tasks (if manager)
    let teamTasks: any[] = [];
    if (user.level >= 50) {
      if (user.level >= 100) {
        teamTasks = tasks; // All tasks for top management
      } else {
        const teamMembers = await prisma.user.findMany({ where: { department_id: user.department } }); // Wait user.department is now department_name string or id? The JWT payload in auth.ts says `department: user.department?.name`. 
        // We'd better use the db query to get department members.
        const dept = await prisma.department.findUnique({ where: { name: user.department } });
        if (dept) {
          teamTasks = tasks.filter(t => t.assignees.some(a => a.department_id === dept.id));
        }
      }
    }

    res.json({
      global: {
        activeProjects,
        completedProjects,
        totalProjects: projects.length,
        projects
      },
      employee: {
        myTasks,
        myOverdueTasks,
        myActiveTasks: myTasks.filter(t => t.status !== '已完成')
      },
      manager: {
        teamTasks,
        teamOverdueTasks: overdueTasks.filter(t => teamTasks.find(tt => tt.id === t.id))
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '獲取儀表板資料失敗' });
  }
});

export default router;
