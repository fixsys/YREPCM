import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware';
import { canUserApproveStep } from './approvals';

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

    // Fetch all daily labor reports to build live Onsite & Manufacturing progress + latest photos
    const allLaborReports = await prisma.dailyLaborReport.findMany({
      include: {
        project: { select: { id: true, project_code: true, name: true, status: true, progress_pct: true, work_items_config: true } },
        dispatchOrder: { select: { id: true, dispatch_no: true, target_dept: true, request_dept: true, urgency: true, required_date: true, items: true } },
        recorder: { select: { id: true, name: true } },
        pm: { select: { id: true, name: true } }
      },
      orderBy: [
        { report_date: 'desc' },
        { created_at: 'desc' }
      ]
    });

    const extractReportPhotos = (report: any): { url: string; label: string; category?: string }[] => {
      const result: { url: string; label: string; category?: string }[] = [];
      const seen = new Set<string>();
      const pushPhoto = (url: any, label: string, category?: string) => {
        if (typeof url === 'string' && url.trim() !== '' && !seen.has(url)) {
          seen.add(url);
          result.push({ url, label, category });
        }
      };

      const parsedPhotos = safeParseJSON(report.photos, {});
      if (Array.isArray(parsedPhotos)) {
        parsedPhotos.forEach((p: any) => pushPhoto(p, '現場照片'));
      } else if (parsedPhotos && typeof parsedPhotos === 'object') {
        if (Array.isArray(parsedPhotos.byCategory)) {
          parsedPhotos.byCategory.forEach((cb: any) => {
            const cat = cb?.category || '';
            (cb?.close || []).forEach((p: any) => pushPhoto(p, `${cat}近照`, cat));
            (cb?.mid || []).forEach((p: any) => pushPhoto(p, `${cat}中距照`, cat));
            (cb?.far || []).forEach((p: any) => pushPhoto(p, `${cat}遠距照`, cat));
          });
        }
        (parsedPhotos.close || []).forEach((p: any) => pushPhoto(p, '近照'));
        (parsedPhotos.mid || []).forEach((p: any) => pushPhoto(p, '中距照'));
        (parsedPhotos.far || []).forEach((p: any) => pushPhoto(p, '遠距照'));
        (parsedPhotos.other || []).forEach((p: any) => pushPhoto(p, '補充照片'));
      }

      const workItems = safeParseJSON(report.work_items, []);
      if (Array.isArray(workItems)) {
        workItems.forEach((w: any) => {
          if (w?.inspection?.photo && typeof w.inspection.photo === 'string') {
            pushPhoto(w.inspection.photo, `${w.name || '自主檢查'}照片`, w.category);
          }
        });
      }
      return result;
    };

    const normalizeKey = (s: string) =>
      String(s || '')
        .replace(/\s*\(數量:\s*[^)]*\)/g, '')
        .trim();

    // 1. Build Ongoing Onsite Engineering Progress & Latest Photos (現場工程進度與最新照片)
    const onsiteReports = allLaborReports.filter(r => (r.module_type || 'ONSITE') === 'ONSITE');
    // Accumulate progress per project + work_item
    const onsiteAccMap: Record<string, Record<string, { category: string; name: string; accumulated: number; targetNum: number; isPct: boolean; latestToday: number; latestDate: string }>> = {};

    // Process from oldest to newest so latest values win
    [...onsiteReports].reverse().forEach(r => {
      const pid = r.project_id || 'UNASSIGNED';
      if (!onsiteAccMap[pid]) onsiteAccMap[pid] = {};
      const rItems = safeParseJSON(r.work_items, []);
      const cfg = r.project?.work_items_config && typeof r.project.work_items_config === 'object' && !Array.isArray(r.project.work_items_config)
        ? (r.project.work_items_config as Record<string, any[]>)
        : {};

      if (Array.isArray(rItems)) {
        rItems.forEach((wi: any) => {
          if (!wi || !wi.name) return;
          const normName = normalizeKey(wi.name);
          const cat = wi.category || (r.work_category || '').split('、')[0] || '工程';
          const val = parseFloat(String(wi.progress || '').replace(/[,%]/g, ''));
          const addVal = Number.isNaN(val) ? 0 : val;

          let targetStr = wi.target_quantity || '';
          if (!targetStr && cfg) {
            for (const arr of Object.values(cfg)) {
              if (Array.isArray(arr)) {
                const found = arr.find((c: any) => c && (c.name === wi.name || normalizeKey(c.name) === normName));
                if (found && found.contractQuantity) {
                  targetStr = String(found.contractQuantity);
                  break;
                }
              }
            }
          }
          const rawTarget = parseFloat(String(targetStr).replace(/[,%]/g, ''));
          const isPct = String(targetStr).includes('%') || Number.isNaN(rawTarget) || rawTarget <= 0;
          const targetNum = isPct ? 100 : rawTarget;

          if (!onsiteAccMap[pid][normName]) {
            onsiteAccMap[pid][normName] = {
              category: cat,
              name: normName,
              accumulated: 0,
              targetNum,
              isPct,
              latestToday: 0,
              latestDate: r.report_date ? new Date(r.report_date).toISOString().slice(0, 10) : ''
            };
          }
          const entry = onsiteAccMap[pid][normName];
          entry.accumulated = Math.round((entry.accumulated + addVal) * 100) / 100;
          entry.targetNum = targetNum;
          entry.isPct = isPct;
          if (addVal > 0) {
            entry.latestToday = addVal;
            entry.latestDate = r.report_date ? new Date(r.report_date).toISOString().slice(0, 10) : entry.latestDate;
          }
        });
      }
    });

    // Group onsite progress by active projects (or recent onsite reports)
    const onsiteProjectGroupsMap: Record<string, any> = {};
    onsiteReports.forEach(r => {
      const pid = r.project_id || 'UNASSIGNED';
      const photos = extractReportPhotos(r);
      const reportDateStr = r.report_date ? new Date(r.report_date).toISOString().slice(0, 10) : '';
      if (!onsiteProjectGroupsMap[pid]) {
        const itemsList = Object.values(onsiteAccMap[pid] || {}).map(it => ({
          ...it,
          pct: it.targetNum > 0 ? Math.min(100, Math.round((it.accumulated / it.targetNum) * 1000) / 10) : 0,
          unitSuffix: it.isPct ? '%' : ''
        }));
        const avgPct = itemsList.length > 0
          ? Math.round(itemsList.reduce((s, i) => s + i.pct, 0) / itemsList.length)
          : (r.project?.progress_pct || 0);

        onsiteProjectGroupsMap[pid] = {
          project_id: r.project?.id || pid,
          project_code: r.project?.project_code || '',
          project_name: r.project?.name || '未指定專案',
          project_status: r.project?.status || '施工中',
          overall_pct: r.project?.progress_pct || avgPct,
          latest_report_id: r.id,
          latest_report_date: reportDateStr,
          weather: r.weather || '',
          recorder_name: r.recorder?.name || '',
          pm_name: r.pm?.name || '',
          work_category: r.work_category || '',
          construction_location: r.construction_location || '',
          tomorrow_plan: r.tomorrow_plan || '',
          items: itemsList,
          latest_photos: [] as { url: string; label: string; category?: string; date: string }[]
        };
      }
      const grp = onsiteProjectGroupsMap[pid];
      photos.forEach(ph => {
        if (grp.latest_photos.length < 8 && !grp.latest_photos.some((x: any) => x.url === ph.url)) {
          grp.latest_photos.push({ ...ph, date: reportDateStr });
        }
      });
    });

    // Also include active projects without onsite reports yet so the user sees all active engineering projects
    projects
      .filter(p => p.status !== '已完工' && p.status !== '停工')
      .forEach(p => {
        if (!onsiteProjectGroupsMap[p.id]) {
          onsiteProjectGroupsMap[p.id] = {
            project_id: p.id,
            project_code: p.project_code,
            project_name: p.name,
            project_status: p.status,
            overall_pct: p.progress_pct || 0,
            latest_report_id: null,
            latest_report_date: p.dailyLogs?.[0]?.start_time ? new Date(p.dailyLogs[0].start_time).toISOString().slice(0, 10) : '',
            weather: '',
            recorder_name: '',
            pm_name: '',
            work_category: p.dailyLogs?.[0]?.department || '',
            construction_location: p.address || '',
            tomorrow_plan: '',
            items: p.dailyLogs?.[0]?.task_item
              ? [{ category: p.dailyLogs[0].department || '工項', name: p.dailyLogs[0].task_item, accumulated: p.progress_pct || 0, targetNum: 100, isPct: true, latestToday: 0, latestDate: '', pct: p.progress_pct || 0, unitSuffix: '%' }]
              : [],
            latest_photos: []
          };
        }
      });

    const ongoingOnsiteProgress = Object.values(onsiteProjectGroupsMap);

    // 2. Build Ongoing Manufacturing Progress & Latest Photos (生產製造進度與最新照片)
    const STAGES = ['一次加工', '二次加工', '送至鍍鋅廠', '鍍鋅完成出貨至案場'] as const;
    const mfgReports = allLaborReports.filter(r => r.module_type === 'MANUFACTURING');

    // Fetch all dispatch orders for manufacturing overview
    const allDispatchOrders = await prisma.dispatchOrder.findMany({
      include: {
        project: { select: { id: true, project_code: true, name: true } }
      },
      orderBy: { created_at: 'desc' }
    });

    // Accumulate 4-stage progress per (dispatch_order_id or project_id) + item
    const mfgAccMap: Record<string, Record<string, {
      category: string;
      name: string;
      targetNum: number;
      isPct: boolean;
      stages: Record<string, number>;
      latestStage: string;
      latestToday: number;
      latestDate: string;
    }>> = {};

    const formatDispatchLabel = (it: any) => {
      const mNo = (it?.member_no || it?.description || '').trim();
      const spec = (it?.spec || '').trim();
      return spec ? `${mNo} (規格:${spec})` : mNo;
    };

    // Seed from dispatch orders items first
    allDispatchOrders.forEach(ord => {
      const key = `DO_${ord.id}`;
      if (!mfgAccMap[key]) mfgAccMap[key] = {};
      const ordItems = safeParseJSON(ord.items, []);
      if (Array.isArray(ordItems)) {
        ordItems.forEach((it: any) => {
          const label = normalizeKey(formatDispatchLabel(it));
          if (!label) return;
          const q = parseFloat(String(it?.quantity || '').replace(/[,%]/g, ''));
          const isPct = Number.isNaN(q) || q <= 0;
          const targetNum = isPct ? 100 : q;
          mfgAccMap[key][label] = {
            category: it?.category || '鋼構',
            name: label,
            targetNum,
            isPct,
            stages: { '一次加工': 0, '二次加工': 0, '送至鍍鋅廠': 0, '鍍鋅完成出貨至案場': 0 },
            latestStage: '一次加工',
            latestToday: 0,
            latestDate: ''
          };
        });
      }
    });

    // Accumulate from mfgReports (oldest to newest)
    [...mfgReports].reverse().forEach(r => {
      const key = r.dispatch_order_id ? `DO_${r.dispatch_order_id}` : `PRJ_${r.project_id || 'UNASSIGNED'}`;
      if (!mfgAccMap[key]) mfgAccMap[key] = {};
      const rItems = safeParseJSON(r.work_items, []);
      const reportDateStr = r.report_date ? new Date(r.report_date).toISOString().slice(0, 10) : '';

      if (Array.isArray(rItems)) {
        rItems.forEach((wi: any) => {
          if (!wi || !wi.name) return;
          const normName = normalizeKey(wi.name);
          const stage = (wi.stage || '一次加工').trim();
          const val = parseFloat(String(wi.progress || '').replace(/[,%]/g, ''));
          const addVal = Number.isNaN(val) ? 0 : val;

          // Match existing item in dispatch order (either exact normalized name or prefix member_no)
          let entryKey = normName;
          if (!mfgAccMap[key][entryKey]) {
            const matchedKey = Object.keys(mfgAccMap[key]).find(
              k => k === normName || normName.startsWith(k.split(' (')[0]) || k.startsWith(normName.split(' (')[0])
            );
            if (matchedKey) entryKey = matchedKey;
          }

          if (!mfgAccMap[key][entryKey]) {
            const rawT = parseFloat(String(wi.target_quantity || '').replace(/[,%]/g, ''));
            const isPct = String(wi.target_quantity || '').includes('%') || Number.isNaN(rawT) || rawT <= 0;
            mfgAccMap[key][entryKey] = {
              category: wi.category || (r.work_category || '').split('、')[0] || '鋼構',
              name: normName,
              targetNum: isPct ? 100 : rawT,
              isPct,
              stages: { '一次加工': 0, '二次加工': 0, '送至鍍鋅廠': 0, '鍍鋅完成出貨至案場': 0 },
              latestStage: stage,
              latestToday: 0,
              latestDate: reportDateStr
            };
          }

          const entry = mfgAccMap[key][entryKey];
          entry.stages[stage] = Math.round(((entry.stages[stage] || 0) + addVal) * 100) / 100;
          if (addVal > 0) {
            entry.latestStage = stage;
            entry.latestToday = addVal;
            entry.latestDate = reportDateStr;
          }
        });
      }
    });

    const mfgGroupsMap: Record<string, any> = {};
    // Build groups from mfgReports first (most recent activity first)
    mfgReports.forEach(r => {
      const key = r.dispatch_order_id ? `DO_${r.dispatch_order_id}` : `PRJ_${r.project_id || 'UNASSIGNED'}`;
      const photos = extractReportPhotos(r);
      const reportDateStr = r.report_date ? new Date(r.report_date).toISOString().slice(0, 10) : '';

      if (!mfgGroupsMap[key]) {
        const itemsList = Object.values(mfgAccMap[key] || {}).map(it => {
          const stageDetails = STAGES.map(st => {
            const done = it.stages[st] || 0;
            const pct = it.targetNum > 0 ? Math.min(100, Math.round((done / it.targetNum) * 1000) / 10) : 0;
            return { stage: st, done, target: it.targetNum, pct };
          });
          const avgItemPct = Math.round(stageDetails.reduce((s, d) => s + d.pct, 0) / STAGES.length);
          const isReadyToHoist = (it.stages['鍍鋅完成出貨至案場'] || 0) >= it.targetNum && it.targetNum > 0;
          return {
            ...it,
            unitSuffix: it.isPct ? '%' : '',
            stageDetails,
            avgItemPct,
            isReadyToHoist
          };
        });

        const stageSummary = STAGES.map(st => {
          if (itemsList.length === 0) return { stage: st, pct: 0, completedCount: 0, totalCount: 0 };
          const pct = Math.round(
            itemsList.reduce((sum, it) => {
              const found = it.stageDetails.find(d => d.stage === st);
              return sum + (found ? found.pct : 0);
            }, 0) / itemsList.length
          );
          const completedCount = itemsList.filter(it => (it.stages[st] || 0) >= it.targetNum && it.targetNum > 0).length;
          return { stage: st, pct, completedCount, totalCount: itemsList.length };
        });

        const overallPct = stageSummary.length > 0
          ? Math.round(stageSummary.reduce((s, st) => s + st.pct, 0) / stageSummary.length)
          : 0;

        mfgGroupsMap[key] = {
          group_key: key,
          project_id: r.project?.id || r.project_id || '',
          project_code: r.project?.project_code || '',
          project_name: r.project?.name || '未指定專案',
          dispatch_order_id: r.dispatch_order_id || '',
          dispatch_no: r.dispatchOrder?.dispatch_no || '',
          target_dept: r.dispatchOrder?.target_dept || '鋼構部',
          urgency: r.dispatchOrder?.urgency || '',
          latest_report_id: r.id,
          latest_report_date: reportDateStr,
          recorder_name: r.recorder?.name || '',
          work_category: r.work_category || '',
          construction_location: r.construction_location || '',
          overall_pct: overallPct,
          stageSummary,
          items: itemsList,
          latest_photos: [] as { url: string; label: string; category?: string; date: string }[]
        };
      }
      const grp = mfgGroupsMap[key];
      photos.forEach(ph => {
        if (grp.latest_photos.length < 8 && !grp.latest_photos.some((x: any) => x.url === ph.url)) {
          grp.latest_photos.push({ ...ph, date: reportDateStr });
        }
      });
    });

    // Also include approved dispatch orders that haven't had reports yet or are in progress
    allDispatchOrders
      .filter(ord => ord.approval_status === '同意' && ord.drawing_received_date)
      .forEach(ord => {
        const key = `DO_${ord.id}`;
        if (!mfgGroupsMap[key]) {
          const itemsList = Object.values(mfgAccMap[key] || {}).map(it => {
            const stageDetails = STAGES.map(st => ({ stage: st, done: 0, target: it.targetNum, pct: 0 }));
            return {
              ...it,
              unitSuffix: it.isPct ? '%' : '',
              stageDetails,
              avgItemPct: 0,
              isReadyToHoist: false
            };
          });
          const stageSummary = STAGES.map(st => ({
            stage: st,
            pct: 0,
            completedCount: 0,
            totalCount: itemsList.length
          }));
          mfgGroupsMap[key] = {
            group_key: key,
            project_id: ord.project?.id || ord.project_id,
            project_code: ord.project?.project_code || '',
            project_name: ord.project?.name || ord.site_name || '未指定專案',
            dispatch_order_id: ord.id,
            dispatch_no: ord.dispatch_no,
            target_dept: ord.target_dept || '鋼構部',
            urgency: ord.urgency || '',
            latest_report_id: null,
            latest_report_date: ord.drawing_received_date || '',
            recorder_name: ord.requester_name || '',
            work_category: '已收圖待生產',
            construction_location: ord.factory_area || ord.site_name || '',
            overall_pct: 0,
            stageSummary,
            items: itemsList,
            latest_photos: []
          };
        }
      });

    const ongoingManufacturingProgress = Object.values(mfgGroupsMap);

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

    // Team tasks & pending dispatch order approvals (if manager)
    let teamTasks: any[] = [];
    let pendingDispatchOrders: any[] = [];
    let processedDispatchOrders: any[] = [];

    if (user.level >= 50) {
      if (user.level >= 100) {
        teamTasks = tasks; // All tasks for top management
      } else {
        const dept = await prisma.department.findUnique({ where: { name: user.department } });
        if (dept) {
          teamTasks = tasks.filter(t => t.assignees.some(a => a.department_id === dept.id));
        }
      }

      // Fetch dispatch orders for this department manager (or all if level >= 100)
      const dispatchWhere: any =
        user.level >= 100 || !user.department
          ? {}
          : { target_dept: user.department };

      const deptDispatchOrders = await prisma.dispatchOrder.findMany({
        where: dispatchWhere,
        include: {
          project: {
            select: { id: true, project_code: true, name: true }
          },
          laborReports: {
            select: { id: true, report_date: true, work_items: true }
          }
        },
        orderBy: { created_at: 'desc' }
      });

      pendingDispatchOrders = deptDispatchOrders.filter(
        o =>
          o.approval_status !== '同意' && o.approval_status !== '退回' ||
          (o.approval_status === '同意' && (!o.drawing_received_date || String(o.drawing_received_date).trim() === ''))
      );

      processedDispatchOrders = deptDispatchOrders.filter(
        o =>
          (o.approval_status === '同意' && Boolean(o.drawing_received_date && String(o.drawing_received_date).trim() !== '')) ||
          o.approval_status === '退回'
      );
    }

    // Fetch pending electronic approval requests (報表/簽呈/表單) waiting for this user
    let pendingApprovalRequests: any[] = [];
    try {
      const openReqs = await prisma.approvalRequest.findMany({
        where: { status: { in: ['待簽核', '簽核中'] } },
        include: { template: true },
        orderBy: { created_at: 'desc' },
      });
      pendingApprovalRequests = openReqs
        .filter(r => {
          const steps: any[] = Array.isArray(r.workflow_steps) ? (r.workflow_steps as any[]) : [];
          const activeStep = steps.find(s => Number(s.step_order) === Number(r.current_step));
          return activeStep && canUserApproveStep(user, r, activeStep);
        })
        .map(r => {
          const steps: any[] = Array.isArray(r.workflow_steps) ? (r.workflow_steps as any[]) : [];
          const activeStep = steps.find(s => Number(s.step_order) === Number(r.current_step));
          return {
            ...r,
            activeStepName: activeStep?.step_name || '',
          };
        });
    } catch (e) {
      console.error('Failed to query pendingApprovalRequests:', e);
    }

    res.json({
      global: {
        activeProjects,
        completedProjects,
        totalProjects: projects.length,
        projects,
        ongoingOnsiteProgress,
        ongoingManufacturingProgress
      },
      employee: {
        myTasks,
        myOverdueTasks,
        myActiveTasks: myTasks.filter(t => t.status !== '已完成')
      },
      manager: {
        teamTasks,
        teamOverdueTasks: overdueTasks.filter(t => teamTasks.find(tt => tt.id === t.id)),
        pendingDispatchOrders,
        processedDispatchOrders,
        pendingApprovalRequests
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '獲取儀表板資料失敗' });
  }
});

export default router;
