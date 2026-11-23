import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();
const memoryUpload = multer({ storage: multer.memoryStorage() });

// Download Excel template for projects batch import
router.get('/import-template', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const wb = XLSX.utils.book_new();
    const sampleRows = [
      ['專案代碼', '專案名稱', '狀態', '業主名稱', '設置容量', '工程地點', '發起日期', '預計結束日期', '專案內容', '備註'],
      ['Y2600001888', '台南新市廠屋頂型太陽能工程', '施工中', '元融科技股份有限公司', '499 kW', '台南市新市區自由街9號', '2026-11-01', '2027-03-31', '屋頂型鋼構及模組鋪設工程', '範例資料'],
      ['Y2600001889', '高雄路竹地面型光電案場', '評估中', '大成光電有限公司', '1200 kW', '高雄市路竹區中山路100號', '2026-12-01', '2027-06-30', '地面型光電工程', ''],
    ];
    const ws = XLSX.utils.aoa_to_sheet(sampleRows);
    ws['!cols'] = [
      { wch: 16 },
      { wch: 28 },
      { wch: 10 },
      { wch: 22 },
      { wch: 14 },
      { wch: 28 },
      { wch: 14 },
      { wch: 14 },
      { wch: 28 },
      { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, '專案匯入範本');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent('專案批次匯入範本.xlsx')}`
    );
    res.send(buf);
  } catch (error) {
    console.error('Project template download error:', error);
    res.status(500).json({ error: '下載專案匯入範本失敗' });
  }
});

// Batch import projects from Excel (keep existing system project if already exists)
router.post('/import', authenticateToken, memoryUpload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '請選擇要匯入的 Excel 檔案' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return res.status(400).json({ error: 'Excel 檔案內沒有任何工作表' });
    }

    const parseExcelDateToDate = (val: any): Date | undefined => {
      if (val === undefined || val === null || val === '') return undefined;
      if (val instanceof Date && !isNaN(val.getTime())) return val;
      if (typeof val === 'number') {
        const parsed = XLSX.SSF.parse_date_code(val);
        if (parsed && parsed.y && parsed.m && parsed.d) {
          return new Date(parsed.y, parsed.m - 1, parsed.d);
        }
      }
      const str = String(val).trim().replace(/\./g, '-').replace(/\//g, '-');
      // 支援民國年格式如 115-11-20
      const rocMatch = str.match(/^(\d{2,3})-(\d{1,2})-(\d{1,2})$/);
      if (rocMatch) {
        const y = parseInt(rocMatch[1], 10) + 1911;
        const m = parseInt(rocMatch[2], 10) - 1;
        const d = parseInt(rocMatch[3], 10);
        return new Date(y, m, d);
      }
      const d = new Date(str);
      if (!isNaN(d.getTime())) return d;
      return undefined;
    };

    const CODE_ALIASES = ['專案代碼', '專案代號', '案場代碼', '案場代號', '工程代碼', '工程編號', '專案編號', '代碼', 'project_code', 'code'];
    const NAME_ALIASES = ['專案名稱', '案場名稱', '工程名稱', '案名', '名稱', 'project_name', 'name'];
    const STATUS_ALIASES = ['狀態', '專案狀態', '工程狀態', 'status'];
    const OWNER_ALIASES = ['業主名稱', '業主', '客戶名稱', '客戶', 'owner'];
    const CAPACITY_ALIASES = ['設置容量', '容量', '裝置容量', '設置容量(kw)', '容量(kw)', 'capacity'];
    const ADDRESS_ALIASES = ['工程地點', '案場地址', '案場地點', '地址', '地點', '位置', 'address'];
    const START_ALIASES = ['發起日期', '開始日期', '開工日期', '起始日期', 'start_date'];
    const TARGET_ALIASES = ['預計結束日期', '結束日期', '預計完工日期', '預計完工日', '完工日期', 'target_date'];
    const CONTENT_ALIASES = ['專案內容', '工程內容', '工作內容', '內容', '說明', 'content'];
    const NOTES_ALIASES = ['備註', '備註說明', 'notes', 'remark'];

    const existingProjects = await prisma.project.findMany({
      select: { id: true, project_code: true, name: true },
    });

    const existingCodeSet = new Set(
      existingProjects.map(p => (p.project_code || '').trim().toLowerCase()).filter(Boolean)
    );
    const existingNameSet = new Set(
      existingProjects.map(p => (p.name || '').trim().toLowerCase()).filter(Boolean)
    );

    const activeTemplate = await prisma.workflowTemplate.findFirst({
      where: { is_active: true },
      orderBy: { created_at: 'asc' },
    });

    const importedProjects: { project_code: string; name: string }[] = [];
    const skippedExisting: { project_code: string; name: string; reason: string }[] = [];
    let totalRowsRead = 0;

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      if (rows.length < 2) continue;

      // 自動尋找標題列 (前 10 列內含有專案代碼或專案名稱的列)
      let headerRowIdx = 0;
      for (let r = 0; r < Math.min(rows.length, 10); r++) {
        const rowCells = (rows[r] || []).map(c => String(c || '').trim().toLowerCase());
        const hasCode = rowCells.some(c => CODE_ALIASES.some(a => c === a.toLowerCase() || c.includes(a.toLowerCase())));
        const hasName = rowCells.some(c => NAME_ALIASES.some(a => c === a.toLowerCase() || c.includes(a.toLowerCase())));
        if (hasCode || hasName) {
          headerRowIdx = r;
          break;
        }
      }

      const headerCells = (rows[headerRowIdx] || []).map(c => String(c || '').trim());
      const findColIdx = (aliases: string[]) => {
        // 先精準比對，再包含比對
        const exact = headerCells.findIndex(h => aliases.some(a => h.toLowerCase() === a.toLowerCase()));
        if (exact !== -1) return exact;
        return headerCells.findIndex(h => aliases.some(a => h && h.toLowerCase().includes(a.toLowerCase())));
      };

      const codeIdx = findColIdx(CODE_ALIASES);
      const nameIdx = findColIdx(NAME_ALIASES);
      if (codeIdx === -1 && nameIdx === -1) continue;

      const statusIdx = findColIdx(STATUS_ALIASES);
      const ownerIdx = findColIdx(OWNER_ALIASES);
      const capacityIdx = findColIdx(CAPACITY_ALIASES);
      const addressIdx = findColIdx(ADDRESS_ALIASES);
      const startIdx = findColIdx(START_ALIASES);
      const targetIdx = findColIdx(TARGET_ALIASES);
      const contentIdx = findColIdx(CONTENT_ALIASES);
      const notesIdx = findColIdx(NOTES_ALIASES);

      for (let r = headerRowIdx + 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.every(cell => String(cell ?? '').trim() === '')) continue;

        const rawCode = codeIdx !== -1 ? String(row[codeIdx] ?? '').trim() : '';
        const rawName = nameIdx !== -1 ? String(row[nameIdx] ?? '').trim() : '';

        if (!rawCode && !rawName) continue;
        // 排除範例說明或合計列
        if (rawCode.includes('合計') || rawCode.includes('總計') || rawName.includes('合計')) continue;

        totalRowsRead++;
        const finalCode = rawCode || `PRJ-${Date.now()}-${r}`;
        const finalName = rawName || finalCode;

        const codeKey = finalCode.toLowerCase();
        const nameKey = finalName.toLowerCase();

        // 規則 2：若從 Excel 匯入的專案系統上已有（代碼已存在或同名專案已存在），則保留系統原有專案，不覆蓋
        if (existingCodeSet.has(codeKey) || (rawName && existingNameSet.has(nameKey))) {
          skippedExisting.push({
            project_code: finalCode,
            name: finalName,
            reason: existingCodeSet.has(codeKey) ? '專案代碼已存在於系統（保留系統資料）' : '專案名稱已存在於系統（保留系統資料）',
          });
          continue;
        }

        const rawStatus = statusIdx !== -1 ? String(row[statusIdx] ?? '').trim() : '';
        const validStatuses = ['待接洽', '評估中', '施工中', '已完工', '停工', '退回修正'];
        const finalStatus = validStatuses.includes(rawStatus) ? rawStatus : '施工中';

        const owner = ownerIdx !== -1 ? String(row[ownerIdx] ?? '').trim() || undefined : undefined;
        const capacity = capacityIdx !== -1 ? String(row[capacityIdx] ?? '').trim() || undefined : undefined;
        const address = addressIdx !== -1 ? String(row[addressIdx] ?? '').trim() || undefined : undefined;
        const startDate = startIdx !== -1 ? parseExcelDateToDate(row[startIdx]) : undefined;
        const targetDate = targetIdx !== -1 ? parseExcelDateToDate(row[targetIdx]) : undefined;
        const content = contentIdx !== -1 ? String(row[contentIdx] ?? '').trim() || undefined : undefined;
        const notes = notesIdx !== -1 ? String(row[notesIdx] ?? '').trim() || undefined : undefined;

        const created = await prisma.project.create({
          data: {
            project_code: finalCode,
            name: finalName,
            status: finalStatus,
            owner,
            capacity,
            address,
            start_date: startDate,
            target_date: targetDate,
            content,
            notes,
          },
        });

        if (activeTemplate) {
          await prisma.projectWorkflow
            .create({
              data: {
                project_id: created.id,
                template_id: activeTemplate.id,
              },
            })
            .catch(() => {});
        }

        existingCodeSet.add(codeKey);
        existingNameSet.add(nameKey);
        importedProjects.push({ project_code: finalCode, name: finalName });
      }
    }

    if (totalRowsRead === 0) {
      return res.status(400).json({
        error: '未在 Excel 中找到有效的專案資料列，請確認標題列包含「專案代碼」與「專案名稱」（可先下載匯入範本參考）',
      });
    }

    res.json({
      message: `匯入完成：成功新增 ${importedProjects.length} 筆專案，保留系統既有專案（略過） ${skippedExisting.length} 筆`,
      importedCount: importedProjects.length,
      skippedCount: skippedExisting.length,
      importedProjects,
      skippedExisting,
    });
  } catch (error: any) {
    console.error('Import projects error:', error);
    res.status(500).json({ error: `匯入專案失敗：${error?.message || '請確認 Excel 檔案格式是否正確'}` });
  }
});

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

// Export Project Timeline Gantt Chart as styled Excel (.xlsx)
router.post('/:id/timeline-excel', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const projectId = String(req.params.id);
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return res.status(404).json({ error: '找不到專案' });
    }

    const { title, legendText, buckets = [], rows = [] } = req.body;

    const wb = new ExcelJS.Workbook();
    wb.creator = '元融集團專案管理系統';
    wb.created = new Date();

    const ws = wb.addWorksheet('專案工程甘特圖', {
      views: [{ state: 'frozen', xSplit: 4, ySplit: 3 }],
    });

    const totalCols = 4 + buckets.length + 2; // 項次, 工程階段, 工作模組/施工工項, 預計起訖/目標, ...buckets, 進度%, 備註

    // Row 1: Title Banner
    const bannerTitle =
      title ||
      `${project.project_code || ''} ${project.name || ''} — 專案工程甘特圖與進度檢核表`.trim();
    const row1 = ws.addRow([bannerTitle]);
    row1.height = 34;
    ws.mergeCells(1, 1, 1, totalCols);
    const titleCell = row1.getCell(1);
    titleCell.font = { name: 'Microsoft JhengHei', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Row 2: Legend Row
    const legend =
      legendText ||
      '圖例說明：【綠底 ■ 已完工 (100%)】 ｜ 【深藍底 ● 正式執行 / 施工中】 ｜ 【橘底 ▲ 排程預定 / 待開工】 ｜ 【紅底 ★ 延遲警示 (逾期未完成)】';
    const row2 = ws.addRow([legend]);
    row2.height = 24;
    ws.mergeCells(2, 1, 2, totalCols);
    const legendCell = row2.getCell(1);
    legendCell.font = { name: 'Microsoft JhengHei', size: 10, bold: true, color: { argb: 'FF1F4E78' } };
    legendCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
    legendCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    // Row 3: Table Headers
    const headerValues = [
      '項次',
      '工程階段',
      '工作模組 / 施工工項',
      '預計起訖與檢核目標',
      ...buckets.map((b: any) => `${b.topLabel}\n${b.subLabel}`),
      '進度%',
      '備註 / 狀態',
    ];
    const row3 = ws.addRow(headerValues);
    row3.height = 34;
    row3.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (colNumber <= totalCols) {
        cell.font = { name: 'Microsoft JhengHei', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5597' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFB4C6E7' } },
          left: { style: 'thin', color: { argb: 'FFB4C6E7' } },
          bottom: { style: 'medium', color: { argb: 'FF1F4E78' } },
          right: { style: 'thin', color: { argb: 'FFB4C6E7' } },
        };
      }
    });

    const COLOR_MAP: Record<string, { bg: string; fg: string }> = {
      COMPLETED: { bg: 'FF70AD47', fg: 'FFFFFFFF' }, // 綠底
      ACTIVE: { bg: 'FF2F5597', fg: 'FFFFFFFF' },    // 深藍底
      PLANNED: { bg: 'FFED7D31', fg: 'FFFFFFFF' },   // 橘底
      DELAYED: { bg: 'FFC00000', fg: 'FFFFFFFF' },   // 紅底
    };

    // Data Rows
    rows.forEach((r: any, idx: number) => {
      const seqStr = String(idx + 1).padStart(2, '0');
      const cellValues = [
        seqStr,
        r.category || '',
        r.name || '',
        r.gateText || '',
        ...buckets.map((b: any) => {
          const hit = Array.isArray(r.activeBucketIds) && r.activeBucketIds.includes(b.id);
          return hit ? r.blockLabel || '● 正式執行' : '';
        }),
        `${r.actualProgress ?? 0}%`,
        r.remark || '',
      ];

      const excelRow = ws.addRow(cellValues);
      excelRow.height = 28;

      const isDelayed = r.statusKey === 'DELAYED';
      const colorStyle = COLOR_MAP[r.statusKey] || COLOR_MAP.ACTIVE;

      excelRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (colNumber > totalCols) return;

        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        };

        if (colNumber === 1 || colNumber === 2) {
          cell.font = {
            name: 'Microsoft JhengHei',
            size: 10,
            bold: true,
            color: { argb: isDelayed && colNumber === 1 ? 'FFC00000' : 'FF1E293B' },
          };
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        } else if (colNumber === 3) {
          cell.font = {
            name: 'Microsoft JhengHei',
            size: 10,
            bold: true,
            color: { argb: isDelayed ? 'FFC00000' : 'FF0F172A' },
          };
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        } else if (colNumber === 4) {
          cell.font = {
            name: 'Microsoft JhengHei',
            size: 9.5,
            bold: isDelayed,
            color: { argb: isDelayed ? 'FFC00000' : 'FF334155' },
          };
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        } else if (colNumber >= 5 && colNumber < 5 + buckets.length) {
          const bIdx = colNumber - 5;
          const b = buckets[bIdx];
          const hit = b && Array.isArray(r.activeBucketIds) && r.activeBucketIds.includes(b.id);
          if (hit) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: colorStyle.bg },
            };
            cell.font = {
              name: 'Microsoft JhengHei',
              size: 9.5,
              bold: true,
              color: { argb: colorStyle.fg },
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          }
        } else if (colNumber === 5 + buckets.length) {
          // 進度%
          cell.font = {
            name: 'Microsoft JhengHei',
            size: 10,
            bold: true,
            color: {
              argb:
                r.actualProgress >= 100
                  ? 'FF38761D'
                  : isDelayed
                  ? 'FFC00000'
                  : 'FF1E293B',
            },
          };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else if (colNumber === 6 + buckets.length) {
          // 備註
          cell.font = {
            name: 'Microsoft JhengHei',
            size: 9.5,
            bold: isDelayed,
            color: { argb: isDelayed ? 'FFC00000' : 'FF334155' },
          };
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        }
      });
    });

    // Column Widths
    ws.getColumn(1).width = 7;   // 項次
    ws.getColumn(2).width = 13;  // 工程階段
    ws.getColumn(3).width = 30;  // 工作模組/施工工項
    ws.getColumn(4).width = 28;  // 預計起訖與檢核目標
    for (let i = 0; i < buckets.length; i++) {
      ws.getColumn(5 + i).width = 13;
    }
    ws.getColumn(5 + buckets.length).width = 10; // 進度%
    ws.getColumn(6 + buckets.length).width = 24; // 備註

    const buf = await wb.xlsx.writeBuffer();
    const safeFileName = `${project.project_code || ''}_${project.name || '專案'}_甘特圖與進度檢核表.xlsx`.replace(
      /[\\/:*?"<>|]/g,
      '_'
    );

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(safeFileName)}`);
    res.send(Buffer.from(buf));
  } catch (error) {
    console.error('Export timeline excel error:', error);
    res.status(500).json({ error: '匯出甘特圖 Excel 失敗' });
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
