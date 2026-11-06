import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();

const safeParseJSON = (data: any, fallback: any = []) => {
  if (!data) return fallback;
  if (typeof data === 'string') {
    try { return JSON.parse(data); } catch (e) { return fallback; }
  }
  return data;
};

const WEEKDAY_NAMES = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

async function buildAttendanceData(monthStr?: string, projectId?: string, moduleType?: string) {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1; // 1..12

  if (monthStr && /^\d{4}-\d{2}$/.test(monthStr)) {
    const [y, m] = monthStr.split('-').map(Number);
    year = y;
    month = m;
  }

  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  const daysInMonth = new Date(year, month, 0).getDate();

  const whereClause: any = {
    report_date: {
      gte: startDate,
      lte: endDate
    }
  };
  if (projectId) whereClause.project_id = projectId;
  if (moduleType) whereClause.module_type = moduleType;

  const laborReports = await prisma.dailyLaborReport.findMany({
    where: whereClause,
    include: {
      project: { select: { id: true, project_code: true, name: true, owner: true } },
      recorder: { select: { id: true, name: true } },
      pm: { select: { id: true, name: true } }
    },
    orderBy: [
      { report_date: 'asc' },
      { created_at: 'asc' }
    ]
  });

  // First pass: collect raw entries grouped by date to properly compute daily normal vs overtime hours per worker
  type RawEntry = {
    report: any;
    worker: any;
    idx: number;
    dateStr: string;
    dayOfMonth: number;
    weekday: string;
    actualWorkersCount: number;
    matchedWorkItem: any;
    parsedEngineers: string[];
  };

  const rawEntries: RawEntry[] = [];

  for (const report of laborReports) {
    const d = new Date(report.report_date);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const dateStr = `${yyyy}/${mm}/${dd}`;
    const dayOfMonth = d.getUTCDate();
    const weekday = WEEKDAY_NAMES[d.getUTCDay()];

    const dispatchWorkers = safeParseJSON(report.dispatch_workers, []);
    const workItems = safeParseJSON(report.work_items, []);
    const parsedEngineers = safeParseJSON(report.engineers, []);

    if (!Array.isArray(dispatchWorkers)) continue;

    const validWorkers = dispatchWorkers.filter((w: any) => w && w.name && String(w.name).trim() !== '');

    // Count actual workers per work_item (or work_category) in this report
    const itemCounts: Record<string, number> = {};
    for (const w of validWorkers) {
      const key = `${w.work_category || report.work_category || ''}__${w.work_item || ''}`;
      itemCounts[key] = (itemCounts[key] || 0) + 1;
    }

    validWorkers.forEach((w: any, idx: number) => {
      const key = `${w.work_category || report.work_category || ''}__${w.work_item || ''}`;
      const matchedWorkItem = Array.isArray(workItems)
        ? workItems.find((wi: any) => wi && wi.name === w.work_item)
        : null;
      const actualWorkersCount = itemCounts[key] || validWorkers.length;

      rawEntries.push({
        report,
        worker: w,
        idx,
        dateStr,
        dayOfMonth,
        weekday,
        actualWorkersCount,
        matchedWorkItem,
        parsedEngineers: Array.isArray(parsedEngineers) ? parsedEngineers.filter(Boolean) : []
      });
    });
  }

  // Track normal hours used per (dateStr + worker_name) so daily regular hours cap at 8
  const usedNormalByDateWorker: Record<string, number> = {};

  const rows = rawEntries.map((entry) => {
    const { report, worker, idx, dateStr, dayOfMonth, weekday, actualWorkersCount, matchedWorkItem, parsedEngineers } = entry;
    const workerName = String(worker.name).trim();
    const rawHours = Math.max(0, Number(worker.work_hours) || 0);

    const quotaKey = `${dateStr}__${workerName}`;
    const usedNormal = usedNormalByDateWorker[quotaKey] || 0;
    const remainingNormal = Math.max(0, Number((8 - usedNormal).toFixed(1)));
    const normalHours = Math.min(remainingNormal, rawHours);
    const overtimeHours = Math.max(0, Number((rawHours - normalHours).toFixed(1)));
    usedNormalByDateWorker[quotaKey] = Number((usedNormal + normalHours).toFixed(1));

    let days: number | null = null;
    let partialHours: number | null = null;

    if (normalHours === 8) {
      days = 1;
    } else if (normalHours === 4) {
      days = 0.5;
    } else if (normalHours > 0) {
      partialHours = normalHours;
    }

    return {
      id: `${report.id}-${idx}`,
      report_id: report.id,
      date: dateStr,
      day: dayOfMonth,
      weekday,
      worker_name: workerName,
      project_id: report.project_id || '',
      project_code: report.project?.project_code || '',
      project_name: report.project?.name || '未指定案場',
      work_category: worker.work_category || report.work_category || '',
      work_item: worker.work_item || worker.work_category || report.work_category || '',
      start_time: worker.start_time || '',
      end_time: worker.end_time || '',
      raw_hours: rawHours,
      actual_workers: actualWorkersCount,
      expected_workers: null as number | null,
      days,
      partial_hours: partialHours,
      total_hours: normalHours,
      overtime_hours: overtimeHours > 0 ? overtimeHours : null,
      progress: matchedWorkItem?.progress || '',
      construction_location: report.construction_location || '',
      weather: report.weather || '',
      pm_name: report.pm?.name || '',
      recorder_name: report.recorder?.name || '',
      engineers: parsedEngineers.join('、'),
      module_type: report.module_type || 'ONSITE'
    };
  });

  // Group by day 1..31
  const dailyRecords: Record<number, typeof rows> = {};
  for (let d = 1; d <= 31; d++) {
    dailyRecords[d] = [];
  }
  for (const r of rows) {
    if (!dailyRecords[r.day]) dailyRecords[r.day] = [];
    dailyRecords[r.day].push(r);
  }

  // Monthly summary per worker
  const workerMap: Record<string, {
    worker_name: string;
    total_days: number;
    total_partial_hours: number;
    total_normal_hours: number;
    total_overtime_hours: number;
    total_all_hours: number;
    dates: Set<string>;
    projects: Set<string>;
    work_items: Set<string>;
  }> = {};

  for (const r of rows) {
    if (!workerMap[r.worker_name]) {
      workerMap[r.worker_name] = {
        worker_name: r.worker_name,
        total_days: 0,
        total_partial_hours: 0,
        total_normal_hours: 0,
        total_overtime_hours: 0,
        total_all_hours: 0,
        dates: new Set(),
        projects: new Set(),
        work_items: new Set()
      };
    }
    const w = workerMap[r.worker_name];
    w.total_days = Number((w.total_days + (r.days || 0)).toFixed(2));
    w.total_partial_hours = Number((w.total_partial_hours + (r.partial_hours || 0)).toFixed(1));
    w.total_normal_hours = Number((w.total_normal_hours + (r.total_hours || 0)).toFixed(1));
    w.total_overtime_hours = Number((w.total_overtime_hours + (r.overtime_hours || 0)).toFixed(1));
    w.total_all_hours = Number((w.total_normal_hours + w.total_overtime_hours).toFixed(1));
    w.dates.add(r.date);
    if (r.project_name) w.projects.add(r.project_name);
    if (r.work_item) w.work_items.add(r.work_item);
  }

  const workerSummary = Object.values(workerMap).map(w => ({
    worker_name: w.worker_name,
    attendance_days_count: w.dates.size,
    total_days: w.total_days,
    total_partial_hours: w.total_partial_hours,
    total_normal_hours: w.total_normal_hours,
    total_overtime_hours: w.total_overtime_hours,
    total_all_hours: w.total_all_hours,
    projects: Array.from(w.projects).join('、'),
    work_items: Array.from(w.work_items).join('、')
  }));

  return {
    year,
    month,
    daysInMonth,
    rows,
    dailyRecords,
    workerSummary
  };
}

// Get attendance report (出工表)
router.get('/attendance', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { month, project_id, module_type } = req.query;
    const data = await buildAttendanceData(
      month ? String(month) : undefined,
      project_id ? String(project_id) : undefined,
      module_type ? String(module_type) : undefined
    );
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '獲取出工表失敗' });
  }
});

// Export attendance report as multi-sheet Excel (分頁1: 總表 + 分頁 1~31)
router.get('/attendance/export-excel', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { month, project_id, module_type } = req.query;
    const data = await buildAttendanceData(
      month ? String(month) : undefined,
      project_id ? String(project_id) : undefined,
      module_type ? String(module_type) : undefined
    );

    const wb = new ExcelJS.Workbook();
    wb.creator = '元融集團專案管理系統';
    wb.created = new Date();

    const borderThin: Partial<ExcelJS.Borders> = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    // ==========================================
    // 分頁 1: 總表
    // ==========================================
    const summaryWs = wb.addWorksheet('總表', {
      views: [{ state: 'frozen', ySplit: 2 }]
    });

    const summaryCols = [
      { key: 'date', width: 14 },
      { key: 'weekday', width: 10 },
      { key: 'worker_name', width: 14 },
      { key: 'project_name', width: 28 },
      { key: 'work_item', width: 24 },
      { key: 'actual_workers', width: 12 },
      { key: 'expected_workers', width: 12 },
      { key: 'days', width: 10 },
      { key: 'partial_hours', width: 10 },
      { key: 'total_hours', width: 12 },
      { key: 'overtime_hours', width: 12 }
    ];
    summaryWs.columns = summaryCols;

    // Title Row
    summaryWs.mergeCells('A1:K1');
    const titleCell = summaryWs.getCell('A1');
    titleCell.value = `元融${data.month}月份出工表`;
    titleCell.font = { name: '微軟正黑體', size: 18, bold: true };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    summaryWs.getRow(1).height = 32;

    // Header Row
    const headers = ['日期', '星期', '姓名', '案場', '施工工種', '實際人數', '預計人數', '天數', 'H', '總計H', '加班(H)'];
    const headerRow = summaryWs.getRow(2);
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { name: '微軟正黑體', size: 12, bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF1DE' } };
      cell.border = {
        top: { style: 'medium' },
        bottom: { style: 'medium' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    headerRow.height = 24;
    summaryWs.autoFilter = 'A2:K2';

    // Data Rows
    let currentRowIdx = 3;
    for (const r of data.rows) {
      const row = summaryWs.getRow(currentRowIdx);
      const values = [
        r.date,
        r.weekday,
        r.worker_name,
        r.project_name,
        r.work_item,
        r.actual_workers ?? '',
        r.expected_workers ?? '',
        r.days ?? '',
        r.partial_hours ?? '',
        r.total_hours ?? 0,
        r.overtime_hours ?? ''
      ];
      values.forEach((val, i) => {
        const c = row.getCell(i + 1);
        c.value = val as any;
        c.font = { name: '微軟正黑體', size: 11 };
        c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        c.border = borderThin;
      });
      row.height = 20;
      currentRowIdx++;
    }

    // Monthly Per-Worker Totals Section on 總表
    if (data.workerSummary.length > 0) {
      currentRowIdx += 2;
      summaryWs.mergeCells(`A${currentRowIdx}:H${currentRowIdx}`);
      const subTitle = summaryWs.getCell(`A${currentRowIdx}`);
      subTitle.value = `${data.month}月份 人員出工時數統計彙總`;
      subTitle.font = { name: '微軟正黑體', size: 14, bold: true };
      subTitle.alignment = { vertical: 'middle', horizontal: 'left' };
      summaryWs.getRow(currentRowIdx).height = 26;
      currentRowIdx++;

      const sumHeaders = ['姓名', '出工日數', '折算天數(天)', '散鐘頭(H)', '正常總工時(總計H)', '加班總時數(H)', '參與案場', '施工工種'];
      const sumHeaderRow = summaryWs.getRow(currentRowIdx);
      sumHeaders.forEach((sh, i) => {
        const c = sumHeaderRow.getCell(i + 1);
        c.value = sh;
        c.font = { name: '微軟正黑體', size: 11, bold: true };
        c.alignment = { vertical: 'middle', horizontal: 'center' };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
        c.border = borderThin;
      });
      sumHeaderRow.height = 22;
      currentRowIdx++;

      for (const wsItem of data.workerSummary) {
        const row = summaryWs.getRow(currentRowIdx);
        const vals = [
          wsItem.worker_name,
          wsItem.attendance_days_count,
          wsItem.total_days,
          wsItem.total_partial_hours || '',
          wsItem.total_normal_hours,
          wsItem.total_overtime_hours || '',
          wsItem.projects,
          wsItem.work_items
        ];
        vals.forEach((v, i) => {
          const c = row.getCell(i + 1);
          c.value = v as any;
          c.font = { name: '微軟正黑體', size: 11 };
          c.alignment = { vertical: 'middle', horizontal: i >= 6 ? 'left' : 'center', wrapText: true };
          c.border = borderThin;
        });
        row.height = 20;
        currentRowIdx++;
      }
    }

    // ==========================================
    // 分頁 2~32: 1 ~ 31 日每日報工詳細情況
    // ==========================================
    for (let day = 1; day <= 31; day++) {
      const dayRows = data.dailyRecords[day] || [];
      const dateObj = new Date(Date.UTC(data.year, data.month - 1, day));
      const isValidDayInMonth = day <= data.daysInMonth;
      const weekdayStr = isValidDayInMonth ? WEEKDAY_NAMES[dateObj.getUTCDay()] : '';
      const fullDateStr = `${data.year}/${String(data.month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;

      const dayWs = wb.addWorksheet(`${day}`, {
        views: [{ state: 'frozen', ySplit: 2 }]
      });

      dayWs.columns = [
        { key: 'date', width: 13 },
        { key: 'weekday', width: 9 },
        { key: 'worker_name', width: 13 },
        { key: 'project_name', width: 24 },
        { key: 'work_category', width: 12 },
        { key: 'work_item', width: 22 },
        { key: 'start_time', width: 11 },
        { key: 'end_time', width: 11 },
        { key: 'actual_workers', width: 11 },
        { key: 'expected_workers', width: 11 },
        { key: 'days', width: 9 },
        { key: 'partial_hours', width: 9 },
        { key: 'total_hours', width: 11 },
        { key: 'overtime_hours', width: 11 },
        { key: 'progress', width: 24 },
        { key: 'construction_location', width: 16 },
        { key: 'engineers', width: 16 },
        { key: 'pm_name', width: 12 },
        { key: 'weather', width: 9 },
        { key: 'recorder_name', width: 12 }
      ];

      dayWs.mergeCells('A1:T1');
      const dTitle = dayWs.getCell('A1');
      dTitle.value = isValidDayInMonth
        ? `元融 ${fullDateStr} (${weekdayStr}) 每日報工現場派工明細表`
        : `元融 ${data.year}年${data.month}月 第 ${day} 日 (本月無此日期)`;
      dTitle.font = { name: '微軟正黑體', size: 16, bold: true };
      dTitle.alignment = { vertical: 'middle', horizontal: 'center' };
      dayWs.getRow(1).height = 30;

      const dayHeaders = [
        '日期', '星期', '姓名', '案場', '工作類別', '施工工種(工項)',
        '上班時間', '下班時間', '實際人數', '預計人數', '天數', 'H', '總計H', '加班(H)',
        '施工進度說明', '施工位置', '現場工程師', '工務經理', '天氣', '紀錄者'
      ];
      const dHeaderRow = dayWs.getRow(2);
      dayHeaders.forEach((dh, i) => {
        const c = dHeaderRow.getCell(i + 1);
        c.value = dh;
        c.font = { name: '微軟正黑體', size: 11, bold: true };
        c.alignment = { vertical: 'middle', horizontal: 'center' };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF1DE' } };
        c.border = {
          top: { style: 'medium' },
          bottom: { style: 'medium' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
      dHeaderRow.height = 24;

      let dRowIdx = 3;
      for (const r of dayRows) {
        const row = dayWs.getRow(dRowIdx);
        const vals = [
          r.date,
          r.weekday,
          r.worker_name,
          r.project_name,
          r.work_category,
          r.work_item,
          r.start_time,
          r.end_time,
          r.actual_workers ?? '',
          r.expected_workers ?? '',
          r.days ?? '',
          r.partial_hours ?? '',
          r.total_hours ?? 0,
          r.overtime_hours ?? '',
          r.progress || '',
          r.construction_location || '',
          r.engineers || '',
          r.pm_name || '',
          r.weather || '',
          r.recorder_name || ''
        ];
        vals.forEach((v, i) => {
          const c = row.getCell(i + 1);
          c.value = v as any;
          c.font = { name: '微軟正黑體', size: 11 };
          c.alignment = { vertical: 'middle', horizontal: i === 14 ? 'left' : 'center', wrapText: true };
          c.border = borderThin;
        });
        row.height = 20;
        dRowIdx++;
      }

      if (dayRows.length > 0) {
        const totalRow = dayWs.getRow(dRowIdx);
        dayWs.mergeCells(`A${dRowIdx}:J${dRowIdx}`);
        totalRow.getCell(1).value = `當日派工合計（共 ${dayRows.length} 人次）`;
        totalRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'right' };
        totalRow.getCell(11).value = Number(dayRows.reduce((acc, r) => acc + (r.days || 0), 0).toFixed(2));
        totalRow.getCell(12).value = Number(dayRows.reduce((acc, r) => acc + (r.partial_hours || 0), 0).toFixed(1)) || '';
        totalRow.getCell(13).value = Number(dayRows.reduce((acc, r) => acc + (r.total_hours || 0), 0).toFixed(1));
        totalRow.getCell(14).value = Number(dayRows.reduce((acc, r) => acc + (r.overtime_hours || 0), 0).toFixed(1)) || '';
        for (let i = 1; i <= 20; i++) {
          const c = totalRow.getCell(i);
          c.font = { name: '微軟正黑體', size: 11, bold: true };
          if (i > 10) c.alignment = { vertical: 'middle', horizontal: 'center' };
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F4F8' } };
          c.border = borderThin;
        }
        totalRow.height = 22;
      }
    }

    const filename = encodeURIComponent(`元融_${data.year}年${data.month}月份出工表.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);

    await wb.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '匯出出工表 Excel 失敗' });
  }
});

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

    if (department) {
      where.user = { department: { name: department as string } };
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
