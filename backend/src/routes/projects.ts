import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();
const memoryUpload = multer({ storage: multer.memoryStorage() });

// Download Excel template for work items import
router.get('/work-items-template', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const wb = XLSX.utils.book_new();
    const sampleRows = [
      ['類別', '工項名稱', '契約數量', '單位', '開始日期', '結束日期'],
      ['土木', '基樁鑽掘與澆置', 120, '支', '2026-11-15', '2026-11-30'],
      ['土木', '基礎模板組拆', 80, 'm2', '2026-12-01', '2026-12-10'],
      ['鋼構', 'H型鋼立柱吊裝', 45, '噸', '2026-12-11', '2026-12-25'],
      ['機電', '太陽能模組鋪設', 600, '片', '2027-01-05', '2027-01-20'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(sampleRows);
    ws['!cols'] = [{ wch: 14 }, { wch: 24 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, '工作細項匯入範本');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent('施工細項匯入範本.xlsx')}`
    );
    res.send(buf);
  } catch (error) {
    console.error('Template download error:', error);
    res.status(500).json({ error: '下載範本失敗' });
  }
});

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


// Update project work items config
router.put('/:id/work-items', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const projectId = req.params.id as string;
    const { work_items_config } = req.body;
    const project = await prisma.project.update({
      where: { id: projectId },
      data: { work_items_config }
    });
    res.json(project);
  } catch (error) {
    console.error('Update work items error:', error);
    res.status(500).json({ error: 'Failed to update work items' });
  }
});

// Import project work items from Excel
router.post('/:id/work-items/import', authenticateToken, memoryUpload.single('file'), async (req: AuthRequest, res) => {
  try {
    const projectId = req.params.id as string;
    if (!req.file) {
      return res.status(400).json({ error: '請選擇要匯入的 Excel 檔案' });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return res.status(404).json({ error: '找不到專案' });
    }

    // Merge with current config passed from frontend or DB
    let currentConfig: Record<string, any[]> = {};
    if (req.body.current_config) {
      try {
        currentConfig = JSON.parse(req.body.current_config);
      } catch {}
    } else if (project.work_items_config && typeof project.work_items_config === 'object' && !Array.isArray(project.work_items_config)) {
      currentConfig = { ...(project.work_items_config as Record<string, any[]>) };
    }

    const defaultCategoryFromBody = (req.body.default_category || '').trim();
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return res.status(400).json({ error: '拒絕匯入：Excel 檔案內沒有任何工作表' });
    }

    const REQUIRED_HEADERS = ['工項名稱', '契約數量', '單位', '開始日期', '結束日期'];
    const OPTIONAL_CATEGORY_HEADERS = ['類別', '工程類別'];
    const ALLOWED_HEADERS = new Set([...REQUIRED_HEADERS, ...OPTIONAL_CATEGORY_HEADERS]);

    const normalizeExcelDate = (val: any): string => {
      if (val === undefined || val === null || val === '') return '';
      if (val instanceof Date && !isNaN(val.getTime())) {
        const y = val.getFullYear();
        const m = String(val.getMonth() + 1).padStart(2, '0');
        const d = String(val.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      if (typeof val === 'number') {
        const parsed = XLSX.SSF.parse_date_code(val);
        if (parsed && parsed.y && parsed.m && parsed.d) {
          const y = parsed.y < 1911 ? parsed.y + 1911 : parsed.y;
          return `${y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
        }
      }
      const str = String(val).trim();
      if (!str) return '';
      // Match YYYY-MM-DD or YYYY/MM/DD or ROC YYY/MM/DD
      const m = str.match(/^(\d{2,4})[\/\-.\年](\d{1,2})[\/\-.\月](\d{1,2})/);
      if (m) {
        let year = parseInt(m[1], 10);
        if (year < 1911) year += 1911;
        const month = String(parseInt(m[2], 10)).padStart(2, '0');
        const day = String(parseInt(m[3], 10)).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      const dObj = new Date(str);
      if (!isNaN(dObj.getTime())) {
        return dObj.toISOString().slice(0, 10);
      }
      return '';
    };

    let totalImportedItems = 0;
    const addedCategories = new Set<string>();
    let hasValidSheet = false;

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      // Filter out completely empty trailing rows
      const nonEmptyRows = rows.filter(r => Array.isArray(r) && r.some(cell => String(cell ?? '').trim() !== ''));
      if (nonEmptyRows.length === 0) continue;

      hasValidSheet = true;
      const headerRow = nonEmptyRows[0].map(c => String(c ?? '').trim()).filter(Boolean);

      // Verify all 5 required headers exist
      const missingHeaders = REQUIRED_HEADERS.filter(reqH => !headerRow.includes(reqH));
      const invalidHeaders = headerRow.filter(h => !ALLOWED_HEADERS.has(h));

      if (missingHeaders.length > 0 || invalidHeaders.length > 0) {
        return res.status(400).json({
          error: `拒絕匯入：工作表「${sheetName}」格式不符合！必須包含欄位：工項名稱、契約數量、單位、開始日期、結束日期（可選填「類別」欄）${
            missingHeaders.length > 0 ? `；缺少欄位：${missingHeaders.join('、')}` : ''
          }${invalidHeaders.length > 0 ? `；包含不符規定之欄位：${invalidHeaders.join('、')}` : ''}`
        });
      }

      const rawHeaderCells = nonEmptyRows[0].map(c => String(c ?? '').trim());
      const colIdx = {
        category: rawHeaderCells.findIndex(h => OPTIONAL_CATEGORY_HEADERS.includes(h)),
        name: rawHeaderCells.indexOf('工項名稱'),
        qty: rawHeaderCells.indexOf('契約數量'),
        unit: rawHeaderCells.indexOf('單位'),
        startDate: rawHeaderCells.indexOf('開始日期'),
        endDate: rawHeaderCells.indexOf('結束日期'),
      };

      const isGenericSheetName = /^(Sheet\d*|工作表\s*\d*|工作細項匯入範本)$/i.test(sheetName.trim());
      const fileBaseName = Buffer.from(req.file.originalname, 'latin1')
        .toString('utf8')
        .replace(/\.[^/.]+$/, '')
        .trim();

      for (let rIdx = 1; rIdx < nonEmptyRows.length; rIdx++) {
        const row = nonEmptyRows[rIdx];
        const itemName = String(row[colIdx.name] ?? '').trim();
        const rawQty = row[colIdx.qty];
        const unit = String(row[colIdx.unit] ?? '').trim() || '式';
        const startDateRaw = row[colIdx.startDate];
        const endDateRaw = row[colIdx.endDate];
        const rowCat = colIdx.category >= 0 ? String(row[colIdx.category] ?? '').trim() : '';

        if (!itemName) {
          return res.status(400).json({
            error: `拒絕匯入：工作表「${sheetName}」第 ${rIdx + 1} 列缺少「工項名稱」`
          });
        }

        const parsedQty = rawQty === '' || rawQty === null || rawQty === undefined ? 0 : Number(String(rawQty).replace(/,/g, ''));
        if (isNaN(parsedQty)) {
          return res.status(400).json({
            error: `拒絕匯入：工作表「${sheetName}」第 ${rIdx + 1} 列（「${itemName}」）的「契約數量」必須為數字`
          });
        }

        const startDate = normalizeExcelDate(startDateRaw);
        const endDate = normalizeExcelDate(endDateRaw);
        if ((String(startDateRaw ?? '').trim() !== '' && !startDate) || (String(endDateRaw ?? '').trim() !== '' && !endDate)) {
          return res.status(400).json({
            error: `拒絕匯入：工作表「${sheetName}」第 ${rIdx + 1} 列（「${itemName}」）的開始或結束日期格式無效`
          });
        }

        const categoryName =
          rowCat ||
          defaultCategoryFromBody ||
          (!isGenericSheetName ? sheetName.trim() : '') ||
          fileBaseName ||
          '一般工程';

        if (!currentConfig[categoryName]) {
          currentConfig[categoryName] = [];
          addedCategories.add(categoryName);
        }

        currentConfig[categoryName].push({
          name: itemName,
          contractQuantity: parsedQty,
          unit,
          startDate,
          endDate,
        });
        totalImportedItems++;
      }
    }

    if (!hasValidSheet || totalImportedItems === 0) {
      return res.status(400).json({
        error: '拒絕匯入：Excel 檔案內無任何有效的工作細項資料列'
      });
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: { work_items_config: currentConfig }
    });

    res.json({
      project: updatedProject,
      work_items_config: currentConfig,
      importedCount: totalImportedItems,
      newCategories: Array.from(addedCategories),
    });
  } catch (error) {
    console.error('Import work items error:', error);
    res.status(500).json({ error: '匯入 Excel 失敗，請確認檔案是否為有效的 Excel (.xlsx / .xls) 格式' });
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
  if ((!req.user?.level || req.user.level < 100)) return res.status(403).json({ error: '權限不足' });
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
