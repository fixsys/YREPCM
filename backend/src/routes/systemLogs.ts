import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

const resolveModuleName = (urlPath: string, body?: any): string => {
  if (urlPath.includes('/api/auth')) return '登入與驗證';
  if (urlPath.includes('/api/toolbox-meetings')) {
    return body?.module_type === 'MANUFACTURING' || urlPath.includes('MANUFACTURING')
      ? '製造報工 (工具箱會議)'
      : '現場報工 (工具箱會議)';
  }
  if (urlPath.includes('/api/labor-reports')) {
    return body?.module_type === 'MANUFACTURING' || urlPath.includes('MANUFACTURING')
      ? '製造報工 (生產回報)'
      : '現場報工 (每日報工)';
  }
  if (urlPath.includes('/api/dispatch-orders')) return '生產派工';
  if (urlPath.includes('/api/projects') && urlPath.includes('/files')) return '開案執行書與檔案';
  if (urlPath.includes('/api/projects')) return '專案管理';
  if (urlPath.includes('/api/leads')) return '業務開發 (CRM)';
  if (urlPath.includes('/api/budget')) return '預算與報價分析';
  if (urlPath.includes('/api/tasks')) return '個人任務';
  if (urlPath.includes('/api/work-logs')) return '任務工時';
  if (urlPath.includes('/api/users')) return '帳號與權限管理';
  if (urlPath.includes('/api/settings')) return '系統設定';
  if (urlPath.includes('/api/workflows')) return '流程引擎';
  if (urlPath.includes('/api/logs')) return '部門日誌';
  return '系統其他';
};

const resolveActionType = (method: string, urlPath: string, statusCode: number): string => {
  if (statusCode >= 400) return 'ERROR';
  if (urlPath.includes('/api/auth/login')) return 'LOGIN';
  if (urlPath.includes('/export') || urlPath.includes('/template')) return 'EXPORT';
  if (method === 'POST') return 'CREATE';
  if (method === 'PUT' || method === 'PATCH') return 'UPDATE';
  if (method === 'DELETE') return 'DELETE';
  return 'VIEW';
};

const sanitizePayload = (body: any): any => {
  if (!body || typeof body !== 'object') return undefined;
  const copy: Record<string, any> = {};
  for (const [k, v] of Object.entries(body)) {
    if (k.toLowerCase().includes('password')) {
      copy[k] = '******';
    } else if (k === 'signatures') {
      try {
        const arr = typeof v === 'string' ? JSON.parse(v) : v;
        copy[k] = Array.isArray(arr) ? `[共 ${arr.filter(Boolean).length} 筆簽名圖檔]` : '[簽名資料]';
      } catch {
        copy[k] = '[簽名資料]';
      }
    } else if (typeof v === 'string' && v.length > 1500) {
      copy[k] = v.slice(0, 1500) + '...(截斷)';
    } else {
      copy[k] = v;
    }
  }
  return copy;
};

const buildHumanSummary = (
  method: string,
  urlPath: string,
  statusCode: number,
  moduleName: string,
  body: any,
  errMsg?: string
): string => {
  const isError = statusCode >= 400;
  const prefix = isError ? `❌ [失敗 ${statusCode}] ` : '';

  if (urlPath.includes('/api/auth/login')) {
    return `${prefix}使用者登入系統 (帳號: ${body?.account || '未知'})${errMsg ? ` — 原因：${errMsg}` : ''}`;
  }
  if (urlPath.includes('/export-pdf')) {
    return `${prefix}匯出 ${moduleName} PDF 報表`;
  }
  if (urlPath.includes('/export')) {
    return `${prefix}匯出 ${moduleName} Excel 報表`;
  }

  const actionVerb =
    method === 'POST'
      ? '新增'
      : method === 'PUT' || method === 'PATCH'
      ? '更新'
      : method === 'DELETE'
      ? '刪除'
      : '存取';

  const targetHint =
    body?.name ||
    body?.project_code ||
    body?.dispatch_no ||
    body?.work_category ||
    body?.work_content?.slice?.(0, 40) ||
    '';

  return `${prefix}${actionVerb}「${moduleName}」紀錄${targetHint ? ` (${targetHint})` : ''}${
    errMsg ? ` — 原因：${errMsg.replace(/\n/g, ' ')}` : ''
  }`;
};

// 自動攔截全系統 API 操作與錯誤的 Middleware
export const systemAuditMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!req.path.startsWith('/api/') || req.path.startsWith('/api/system-logs') || req.path === '/api/health') {
    return next();
  }

  const startTime = Date.now();
  let capturedResponseBody: any = null;

  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    capturedResponseBody = body;
    return originalJson(body);
  };

  res.on('finish', async () => {
    try {
      const method = req.method.toUpperCase();
      const statusCode = res.statusCode;
      const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
      const isExport = req.path.includes('/export') || req.path.includes('/template');
      const isError = statusCode >= 400;

      // 紀錄所有「新增/修改/刪除」、「報表匯出」以及任何「API 錯誤 (>=400)」
      if (!isMutation && !isExport && !isError) return;

      let decodedUser: any = (req as any).user || null;
      if (!decodedUser) {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (token) {
          try {
            decodedUser = jwt.verify(token, JWT_SECRET);
          } catch {}
        }
      }

      let userName = decodedUser?.name || null;
      if (!userName && decodedUser?.id) {
        const u = await prisma.user.findUnique({
          where: { id: decodedUser.id },
          select: { name: true, account: true, department: { select: { name: true } } },
        });
        if (u) {
          userName = u.name;
          decodedUser.account = decodedUser.account || u.account;
          decodedUser.department = decodedUser.department || u.department?.name;
        }
      }

      const moduleName = resolveModuleName(req.originalUrl || req.path, req.body);
      const action = resolveActionType(method, req.originalUrl || req.path, statusCode);
      const errorMessage =
        statusCode >= 400
          ? capturedResponseBody?.error ||
            capturedResponseBody?.message ||
            `HTTP ${statusCode} 錯誤`
          : null;

      const summary = buildHumanSummary(
        method,
        req.originalUrl || req.path,
        statusCode,
        moduleName,
        req.body,
        errorMessage || undefined
      );

      const level = statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'INFO';
      const durationMs = Date.now() - startTime;
      const targetId =
        capturedResponseBody?.id ||
        (req.params && (req.params as any).id) ||
        req.body?.project_id ||
        null;

      const filesInfo = Array.isArray((req as any).files)
        ? (req as any).files.map((f: any) => ({
            fieldname: f.fieldname,
            originalname: f.originalname,
            size: f.size,
          }))
        : (req as any).file
        ? [{ fieldname: (req as any).file.fieldname, originalname: (req as any).file.originalname }]
        : undefined;

      const payloadObj = sanitizePayload({
        ...(req.body || {}),
        ...(filesInfo ? { _uploadedFiles: filesInfo } : {}),
      });

      await prisma.systemAuditLog.create({
        data: {
          user_id: decodedUser?.id || null,
          user_name: userName || (req.body?.account ? String(req.body.account) : '系統/未登入'),
          user_account: decodedUser?.account || (req.body?.account ? String(req.body.account) : null),
          department: decodedUser?.department || null,
          action,
          module: moduleName,
          target_id: targetId ? String(targetId) : null,
          summary,
          method,
          path: req.originalUrl || req.path,
          status_code: statusCode,
          level,
          ip_address: String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''),
          duration_ms: durationMs,
          payload: payloadObj,
          error_message: errorMessage,
        },
      });
    } catch (err) {
      console.error('Failed to write SystemAuditLog:', err);
    }
  });

  next();
};

// 取得全系統後臺紀錄 (整合 SystemAuditLog + 既有業務資料表歷史紀錄)
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const isAdmin = Boolean(req.user?.level && req.user.level >= 100);
    if (!isAdmin) {
      return res.status(403).json({ error: '權限不足，僅管理員與開發者可查看後臺紀錄' });
    }

    const limit = Math.min(parseInt(String(req.query.limit || '500'), 10) || 500, 1000);

    const [
      auditLogs,
      toolboxList,
      laborList,
      dispatchList,
      projectList,
      fileList,
      taskList,
      leadList,
    ] = await Promise.all([
      prisma.systemAuditLog.findMany({
        orderBy: { created_at: 'desc' },
        take: limit,
      }),
      prisma.toolboxMeeting.findMany({
        include: {
          recorder: { select: { name: true, account: true, department: { select: { name: true } } } },
          project: { select: { project_code: true, name: true } },
          dispatchOrder: { select: { dispatch_no: true } },
        },
        orderBy: { created_at: 'desc' },
        take: 150,
      }),
      prisma.dailyLaborReport.findMany({
        include: {
          recorder: { select: { name: true, account: true, department: { select: { name: true } } } },
          pm: { select: { name: true } },
          project: { select: { project_code: true, name: true } },
          dispatchOrder: { select: { dispatch_no: true } },
        },
        orderBy: { created_at: 'desc' },
        take: 150,
      }),
      prisma.dispatchOrder.findMany({
        include: {
          project: { select: { project_code: true, name: true } },
        },
        orderBy: { created_at: 'desc' },
        take: 100,
      }),
      prisma.project.findMany({
        orderBy: { updated_at: 'desc' },
        take: 100,
      }),
      prisma.projectFile.findMany({
        include: {
          project: { select: { project_code: true, name: true } },
          uploader: { select: { name: true, account: true, department: { select: { name: true } } } },
        },
        orderBy: { uploaded_at: 'desc' },
        take: 100,
      }),
      prisma.task.findMany({
        include: {
          project: { select: { project_code: true, name: true } },
          creator: { select: { name: true, account: true } },
        },
        orderBy: { updated_at: 'desc' },
        take: 100,
      }),
      prisma.lead.findMany({
        include: {
          creator: { select: { name: true, account: true } },
        },
        orderBy: { updated_at: 'desc' },
        take: 100,
      }),
    ]);

    // 為避免重複顯示同一秒剛由 AuditLog 攔截到的紀錄，建立 target_id + action 索引
    const auditTargetSet = new Set(
      auditLogs.filter(a => a.target_id).map(a => `${a.action}:${a.target_id}`)
    );

    const synthesized: any[] = [];

    for (const t of toolboxList) {
      if (auditTargetSet.has(`CREATE:${t.id}`)) continue;
      const isMfg = t.module_type === 'MANUFACTURING';
      const projLabel = t.project ? `${t.project.project_code} ${t.project.name}` : '多專案/工廠生產';
      synthesized.push({
        id: `tb-${t.id}`,
        source: 'DATABASE',
        user_id: t.recorder_id,
        user_name: t.recorder?.name || '未知人員',
        user_account: t.recorder?.account || null,
        department: t.recorder?.department?.name || null,
        action: 'CREATE',
        module: isMfg ? '製造報工 (工具箱會議)' : '現場報工 (工具箱會議)',
        target_id: t.id,
        summary: `建立${isMfg ? '製造' : '現場'}工具箱會議紀錄 — ${projLabel} (${t.work_category}工程 / 上工 ${t.worker_count} 人)`,
        method: 'POST',
        path: '/api/toolbox-meetings',
        status_code: 200,
        level: 'INFO',
        ip_address: '-',
        duration_ms: null,
        payload: {
          id: t.id,
          record_date: t.record_date,
          module_type: t.module_type,
          project: projLabel,
          dispatch_no: t.dispatchOrder?.dispatch_no || null,
          work_category: t.work_category,
          worker_count: t.worker_count,
          work_area: t.work_area,
          work_content: t.work_content,
          work_items: t.work_items,
          hazards: t.hazards,
          safety_measures: t.safety_measures,
        },
        error_message: null,
        created_at: t.created_at,
      });
    }

    for (const l of laborList) {
      if (auditTargetSet.has(`CREATE:${l.id}`)) continue;
      const isMfg = l.module_type === 'MANUFACTURING';
      const projLabel = l.project ? `${l.project.project_code} ${l.project.name}` : '未指定專案';
      synthesized.push({
        id: `lb-${l.id}`,
        source: 'DATABASE',
        user_id: l.recorder_id,
        user_name: l.recorder?.name || '未知人員',
        user_account: l.recorder?.account || null,
        department: l.recorder?.department?.name || null,
        action: 'CREATE',
        module: isMfg ? '製造報工 (生產回報)' : '現場報工 (每日報工)',
        target_id: l.id,
        summary: `建立${isMfg ? '每日生產回報' : '每日現場報工'} — ${projLabel}${
          l.dispatchOrder?.dispatch_no ? ` / 派工單 ${l.dispatchOrder.dispatch_no}` : ''
        } (${l.work_category}工程)`,
        method: 'POST',
        path: '/api/labor-reports',
        status_code: 200,
        level: 'INFO',
        ip_address: '-',
        duration_ms: null,
        payload: {
          id: l.id,
          report_date: l.report_date,
          module_type: l.module_type,
          project: projLabel,
          dispatch_no: l.dispatchOrder?.dispatch_no || null,
          weather: l.weather,
          pm_name: l.pm?.name || null,
          work_category: l.work_category,
          drawing_number: l.drawing_number,
          work_items: l.work_items,
          tomorrow_plan: l.tomorrow_plan,
        },
        error_message: null,
        created_at: l.created_at,
      });
    }

    for (const d of dispatchList) {
      if (auditTargetSet.has(`CREATE:${d.id}`)) continue;
      const projLabel = d.project ? `${d.project.project_code} ${d.project.name}` : '';
      synthesized.push({
        id: `do-${d.id}`,
        source: 'DATABASE',
        user_id: d.creator_id,
        user_name: d.requester_name || '系統管理員',
        user_account: null,
        department: d.request_dept,
        action: 'CREATE',
        module: '生產派工',
        target_id: d.id,
        summary: `建立生產派工單 ${d.dispatch_no} — ${projLabel} [委託：${d.target_dept} / 簽核：${d.approval_status}]`,
        method: 'POST',
        path: '/api/dispatch-orders',
        status_code: 200,
        level: 'INFO',
        ip_address: '-',
        duration_ms: null,
        payload: {
          id: d.id,
          dispatch_no: d.dispatch_no,
          project: projLabel,
          urgency: d.urgency,
          request_dept: d.request_dept,
          target_dept: d.target_dept,
          approval_status: d.approval_status,
          items_count: Array.isArray(d.items) ? d.items.length : 0,
        },
        error_message: null,
        created_at: d.created_at,
      });
    }

    for (const f of fileList) {
      if (auditTargetSet.has(`CREATE:${f.id}`)) continue;
      const projLabel = f.project ? `${f.project.project_code} ${f.project.name}` : '';
      synthesized.push({
        id: `pf-${f.id}`,
        source: 'DATABASE',
        user_id: f.uploaded_by,
        user_name: f.uploader?.name || '未知人員',
        user_account: f.uploader?.account || null,
        department: f.uploader?.department?.name || null,
        action: 'CREATE',
        module: '開案執行書與檔案',
        target_id: f.id,
        summary: `上傳專案檔案「${f.file_name}」(${f.category}) — ${projLabel}`,
        method: 'POST',
        path: `/api/projects/${f.project_id}/files`,
        status_code: 200,
        level: 'INFO',
        ip_address: '-',
        duration_ms: null,
        payload: {
          id: f.id,
          project: projLabel,
          category: f.category,
          file_name: f.file_name,
          file_path: f.file_path,
        },
        error_message: null,
        created_at: f.uploaded_at,
      });
    }

    for (const p of projectList) {
      if (auditTargetSet.has(`CREATE:${p.id}`)) continue;
      synthesized.push({
        id: `pj-${p.id}`,
        source: 'DATABASE',
        user_id: null,
        user_name: '專案管理',
        user_account: null,
        department: null,
        action: 'CREATE',
        module: '專案管理',
        target_id: p.id,
        summary: `專案紀錄：${p.project_code} ${p.name} (狀態：${p.status} / 進度：${p.progress_pct}%)`,
        method: 'POST',
        path: '/api/projects',
        status_code: 200,
        level: 'INFO',
        ip_address: '-',
        duration_ms: null,
        payload: {
          id: p.id,
          project_code: p.project_code,
          name: p.name,
          status: p.status,
          capacity: p.capacity,
          address: p.address,
        },
        error_message: null,
        created_at: p.created_at,
      });
    }

    for (const tk of taskList) {
      if (auditTargetSet.has(`CREATE:${tk.id}`)) continue;
      synthesized.push({
        id: `tk-${tk.id}`,
        source: 'DATABASE',
        user_id: tk.creator_id,
        user_name: tk.creator?.name || '系統',
        user_account: tk.creator?.account || null,
        department: null,
        action: 'CREATE',
        module: '個人任務',
        target_id: tk.id,
        summary: `建立任務「${tk.name}」(${tk.status})${tk.project ? ` — ${tk.project.project_code}` : ''}`,
        method: 'POST',
        path: '/api/tasks',
        status_code: 200,
        level: 'INFO',
        ip_address: '-',
        duration_ms: null,
        payload: {
          id: tk.id,
          name: tk.name,
          status: tk.status,
          priority: tk.priority,
          project: tk.project ? `${tk.project.project_code} ${tk.project.name}` : null,
        },
        error_message: null,
        created_at: tk.created_at,
      });
    }

    for (const ld of leadList) {
      if (auditTargetSet.has(`CREATE:${ld.id}`)) continue;
      synthesized.push({
        id: `ld-${ld.id}`,
        source: 'DATABASE',
        user_id: ld.created_by,
        user_name: ld.creator?.name || '業務人員',
        user_account: ld.creator?.account || null,
        department: '業務部',
        action: 'CREATE',
        module: '業務開發 (CRM)',
        target_id: ld.id,
        summary: `建立業務商機「${ld.name}${ld.site_name ? ` / ${ld.site_name}` : ''}」(狀態：${ld.status})`,
        method: 'POST',
        path: '/api/leads',
        status_code: 200,
        level: 'INFO',
        ip_address: '-',
        duration_ms: null,
        payload: {
          id: ld.id,
          name: ld.name,
          company: ld.company,
          site_name: ld.site_name,
          status: ld.status,
        },
        error_message: null,
        created_at: ld.created_at,
      });
    }

    const merged = [
      ...auditLogs.map(a => ({ ...a, source: 'AUDIT' })),
      ...synthesized,
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    res.json({
      logs: merged.slice(0, limit),
      totalCount: merged.length,
      errorCount: merged.filter(m => m.level === 'ERROR' || m.level === 'WARN' || m.status_code >= 400).length,
    });
  } catch (error) {
    console.error('Error fetching system logs:', error);
    res.status(500).json({ error: '獲取後臺系統紀錄失敗' });
  }
});

export default router;
