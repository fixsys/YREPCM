import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();

let isSeeded = false;

async function ensureDefaultApprovalsSeeded() {
  if (isSeeded) return;
  try {
    const stampCount = await prisma.approvalStamp.count();
    let stampIdDrawing = '';
    let stampIdReview = '';
    let stampIdFinal = '';
    let stampIdInspect = '';

    if (stampCount === 0) {
      const s1 = await prisma.approvalStamp.create({
        data: {
          name: '受託單位收圖章（圓形雙圈章）',
          shape: 'CIRCLE',
          color: '#DC2626',
          top_text: '元融科技',
          middle_text: '自動帶入部門',
          bottom_text: '收圖章',
          show_date: true,
          show_signer: false,
          border_style: 'DOUBLE',
          department: '',
        },
      });
      const s2 = await prisma.approvalStamp.create({
        data: {
          name: '部門主管審核章（圓形章）',
          shape: 'CIRCLE',
          color: '#B91C1C',
          top_text: '元融科技',
          middle_text: '自動帶入部門',
          bottom_text: '主管審核章',
          show_date: true,
          show_signer: true,
          border_style: 'DOUBLE',
          department: '',
        },
      });
      const s3 = await prisma.approvalStamp.create({
        data: {
          name: '總經理核決章（方形印鑑章）',
          shape: 'SQUARE',
          color: '#DC2626',
          top_text: '元融集團',
          middle_text: '總經理室',
          bottom_text: '核准決行',
          show_date: true,
          show_signer: true,
          border_style: 'DOUBLE',
          department: '管理部',
        },
      });
      const s4 = await prisma.approvalStamp.create({
        data: {
          name: '工程驗收合格章（長方職章）',
          shape: 'RECTANGLE',
          color: '#1D4ED8',
          top_text: '元融科技',
          middle_text: '自動帶入部門',
          bottom_text: '驗收合格章',
          show_date: true,
          show_signer: true,
          border_style: 'DOUBLE',
          department: '工務部',
        },
      });
      stampIdDrawing = s1.id;
      stampIdReview = s2.id;
      stampIdFinal = s3.id;
      stampIdInspect = s4.id;
    } else {
      const allStamps = await prisma.approvalStamp.findMany({ orderBy: { created_at: 'asc' } });
      stampIdDrawing = allStamps[0]?.id || '';
      stampIdReview = allStamps[1]?.id || stampIdDrawing;
      stampIdFinal = allStamps[2]?.id || stampIdReview;
      stampIdInspect = allStamps[3]?.id || stampIdDrawing;
    }

    const tplCount = await prisma.approvalTemplate.count();
    if (tplCount === 0) {
      await prisma.approvalTemplate.createMany({
        data: [
          {
            name: '內部公文簽呈',
            doc_type: '簽呈',
            code_prefix: 'AP',
            description: '適用於跨部門協調、專案經費核定、行政請示與重大事項簽報之標準內部簽呈。',
            default_stamp_id: stampIdReview,
            fields: [
              {
                id: 'category',
                label: '簽呈類別',
                type: 'select',
                required: true,
                width: 'half',
                options: ['工程專案簽呈', '採購發包簽呈', '財務預算簽呈', '人事行政簽呈', '其他請示'],
              },
              {
                id: 'project_name',
                label: '關聯專案',
                type: 'project',
                required: false,
                width: 'half',
              },
              {
                id: 'background',
                label: '一、主旨與說明（事由背景）',
                type: 'textarea',
                required: true,
                width: 'full',
                placeholder: '請詳述本次簽呈之背景事由、現況與依據...',
              },
              {
                id: 'proposal',
                label: '二、擬辦方案與對策',
                type: 'textarea',
                required: true,
                width: 'full',
                placeholder: '請條列擬請核示之具體執行方案...',
              },
              {
                id: 'estimated_budget',
                label: '預估經費金額 (NT$)',
                type: 'number',
                required: false,
                width: 'half',
                placeholder: '若無經費需求可免填',
              },
              {
                id: 'expected_date',
                label: '預計執行日期',
                type: 'date',
                required: false,
                width: 'half',
              },
            ],
            workflow_steps: [
              {
                step_order: 1,
                step_name: '申請部門主管審核',
                approver_type: 'APPLICANT_MANAGER',
                target_dept: '',
                target_user_id: '',
                target_role_level: 50,
                stamp_id: stampIdReview,
                require_stamp: true,
              },
              {
                step_order: 2,
                step_name: '總經理 / 最高管理層核決',
                approver_type: 'ROLE_LEVEL',
                target_dept: '',
                target_user_id: '',
                target_role_level: 100,
                stamp_id: stampIdFinal,
                require_stamp: true,
              },
            ],
          },
          {
            name: '工程請購與發包核定表單',
            doc_type: '表單',
            code_prefix: 'FRM',
            description: '適用於工程材料請購、外包廠商發包申請及費用明細審核表單。',
            default_stamp_id: stampIdReview,
            fields: [
              {
                id: 'project_name',
                label: '所屬專案',
                type: 'project',
                required: true,
                width: 'half',
              },
              {
                id: 'target_vendor',
                label: '建議廠商 / 供應商',
                type: 'text',
                required: false,
                width: 'half',
                placeholder: '例：大成鋼鐵股份有限公司',
              },
              {
                id: 'required_date',
                label: '需求進場 / 交貨日期',
                type: 'date',
                required: true,
                width: 'half',
              },
              {
                id: 'total_amount',
                label: '申請總金額 (NT$ 未稅)',
                type: 'number',
                required: true,
                width: 'half',
                placeholder: '輸入總金額',
              },
              {
                id: 'items_table',
                label: '請購 / 發包項目明細表',
                type: 'table',
                required: true,
                width: 'full',
                tableColumns: ['項目名稱', '規格尺寸', '數量', '單位', '預估單價', '預估金額', '備註'],
              },
              {
                id: 'notes',
                label: '補充說明與付款條件',
                type: 'textarea',
                required: false,
                width: 'full',
                placeholder: '填寫交貨地點、付款條件或特殊規範...',
              },
            ],
            workflow_steps: [
              {
                step_order: 1,
                step_name: '需求單位主管初審',
                approver_type: 'APPLICANT_MANAGER',
                target_dept: '',
                target_user_id: '',
                target_role_level: 50,
                stamp_id: stampIdReview,
                require_stamp: true,
              },
              {
                step_order: 2,
                step_name: '採購部主管複核',
                approver_type: 'DEPARTMENT_MANAGER',
                target_dept: '採購部',
                target_user_id: '',
                target_role_level: 50,
                stamp_id: stampIdDrawing,
                require_stamp: true,
              },
              {
                step_order: 3,
                step_name: '總經理核准',
                approver_type: 'ROLE_LEVEL',
                target_dept: '',
                target_user_id: '',
                target_role_level: 100,
                stamp_id: stampIdFinal,
                require_stamp: true,
              },
            ],
          },
          {
            name: '工程圖面收圖與階段驗收報表',
            doc_type: '報表',
            code_prefix: 'RPT',
            description: '適用於設計加工圖面交付收圖、鋼構出廠檢驗及現場施工階段驗收簽核報表。',
            default_stamp_id: stampIdDrawing,
            fields: [
              {
                id: 'project_name',
                label: '專案名稱',
                type: 'project',
                required: true,
                width: 'half',
              },
              {
                id: 'target_dept',
                label: '受託 / 驗收部門',
                type: 'department',
                required: true,
                width: 'half',
              },
              {
                id: 'stage_type',
                label: '報表檢核階段',
                type: 'select',
                required: true,
                width: 'half',
                options: ['一次/二次加工圖面收圖放行', '鋼構廠內製造品質檢驗', '案場土木基礎階段驗收', '案場支架與模組完工驗收'],
              },
              {
                id: 'drawing_no',
                label: '圖號 / 版次編號',
                type: 'text',
                required: true,
                width: 'half',
                placeholder: '例：115.10.01-V2',
              },
              {
                id: 'check_table',
                label: '檢核與驗收明細項目',
                type: 'table',
                required: true,
                width: 'full',
                tableColumns: ['檢核項目', '圖說/規範標準', '實測/清點結果', '判定(合格/待改善)', '備註說明'],
              },
              {
                id: 'conclusion',
                label: '綜合結論與交辦事項',
                type: 'textarea',
                required: true,
                width: 'full',
                placeholder: '填寫驗收或收圖結論...',
              },
            ],
            workflow_steps: [
              {
                step_order: 1,
                step_name: '工務部主管審查',
                approver_type: 'DEPARTMENT_MANAGER',
                target_dept: '工務部',
                target_user_id: '',
                target_role_level: 50,
                stamp_id: stampIdInspect,
                require_stamp: true,
              },
              {
                step_order: 2,
                step_name: '受託單位主管收圖蓋章',
                approver_type: 'DEPARTMENT_MANAGER',
                target_dept: '鋼構部',
                target_user_id: '',
                target_role_level: 50,
                stamp_id: stampIdDrawing,
                require_stamp: true,
              },
            ],
          },
        ],
      });
    }

    isSeeded = true;
  } catch (err) {
    console.error('Seed default approvals error:', err);
  }
}

async function generateNextRequestNo(prefixRaw: string): Promise<string> {
  const prefixClean = (prefixRaw || 'AP').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'AP';
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}`;
  const fullPrefix = `${prefixClean}-${datePart}-`;

  const latest = await prisma.approvalRequest.findFirst({
    where: { request_no: { startsWith: fullPrefix } },
    orderBy: { request_no: 'desc' },
  });

  if (!latest) return `${fullPrefix}001`;
  const parts = latest.request_no.split('-');
  const seq = parseInt(parts[parts.length - 1], 10);
  const nextSeq = Number.isNaN(seq) ? 1 : seq + 1;
  return `${fullPrefix}${String(nextSeq).padStart(3, '0')}`;
}

export function canUserApproveStep(user: any, reqItem: any, step: any): boolean {
  if (!user || !step) return false;
  const userLevel = Number(user.level || 0);
  if (userLevel >= 100) return true; // 系統管理員 / 最高管理層可簽核或代簽任何關卡

  const approverType = step.approver_type || 'DEPARTMENT_MANAGER';
  if (approverType === 'APPLICANT_MANAGER') {
    return userLevel >= 50 && Boolean(user.department && user.department === reqItem.applicant_dept);
  }
  if (approverType === 'DEPARTMENT_MANAGER') {
    return userLevel >= 50 && Boolean(user.department && (!step.target_dept || user.department === step.target_dept));
  }
  if (approverType === 'SPECIFIC_USER') {
    return Boolean(step.target_user_id && user.id === step.target_user_id);
  }
  if (approverType === 'ROLE_LEVEL') {
    const reqLvl = Number(step.target_role_level || 50);
    return userLevel >= reqLvl;
  }
  return false;
}

// ==========================================
// 1. 電子印章 (ApprovalStamp) API
// ==========================================

router.get('/stamps', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await ensureDefaultApprovalsSeeded();
    const stamps = await prisma.approvalStamp.findMany({
      orderBy: { created_at: 'asc' },
    });
    res.json(stamps);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '取得電子印章列表失敗' });
  }
});

router.post('/stamps', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const {
      name,
      shape,
      color,
      top_text,
      middle_text,
      bottom_text,
      show_date,
      show_signer,
      border_style,
      department,
    } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: '請輸入印章名稱' });
    }

    const stamp = await prisma.approvalStamp.create({
      data: {
        name: String(name).trim(),
        shape: shape || 'CIRCLE',
        color: color || '#DC2626',
        top_text: top_text ?? '元融科技',
        middle_text: middle_text ?? '自動帶入部門',
        bottom_text: bottom_text ?? '收圖章',
        show_date: show_date !== undefined ? Boolean(show_date) : true,
        show_signer: show_signer !== undefined ? Boolean(show_signer) : false,
        border_style: border_style || 'DOUBLE',
        department: department || '',
        creator_id: req.user?.id || null,
      },
    });
    res.status(201).json(stamp);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '建立電子印章失敗' });
  }
});

router.put('/stamps/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      shape,
      color,
      top_text,
      middle_text,
      bottom_text,
      show_date,
      show_signer,
      border_style,
      department,
      is_active,
    } = req.body;

    const stamp = await prisma.approvalStamp.update({
      where: { id: String(id) },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(shape !== undefined ? { shape } : {}),
        ...(color !== undefined ? { color } : {}),
        ...(top_text !== undefined ? { top_text } : {}),
        ...(middle_text !== undefined ? { middle_text } : {}),
        ...(bottom_text !== undefined ? { bottom_text } : {}),
        ...(show_date !== undefined ? { show_date: Boolean(show_date) } : {}),
        ...(show_signer !== undefined ? { show_signer: Boolean(show_signer) } : {}),
        ...(border_style !== undefined ? { border_style } : {}),
        ...(department !== undefined ? { department } : {}),
        ...(is_active !== undefined ? { is_active: Boolean(is_active) } : {}),
      },
    });
    res.json(stamp);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '更新電子印章失敗' });
  }
});

router.delete('/stamps/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await prisma.approvalStamp.delete({ where: { id: String(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '刪除電子印章失敗' });
  }
});

// ==========================================
// 2. 表單 / 簽呈 / 報表範本與簽核流程 (ApprovalTemplate) API
// ==========================================

router.get('/templates', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await ensureDefaultApprovalsSeeded();
    const templates = await prisma.approvalTemplate.findMany({
      orderBy: { created_at: 'asc' },
    });
    res.json(templates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '取得表單範本列表失敗' });
  }
});

router.post('/templates', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const {
      name,
      doc_type,
      code_prefix,
      description,
      fields,
      workflow_steps,
      default_stamp_id,
    } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: '請輸入表單/簽呈/報表名稱' });
    }
    if (!Array.isArray(workflow_steps) || workflow_steps.length === 0) {
      return res.status(400).json({ error: '請至少設定一關簽核流程' });
    }

    const template = await prisma.approvalTemplate.create({
      data: {
        name: String(name).trim(),
        doc_type: doc_type || '簽呈',
        code_prefix: (code_prefix || 'AP').toUpperCase(),
        description: description || '',
        fields: Array.isArray(fields) ? fields : [],
        workflow_steps: workflow_steps.map((s: any, i: number) => ({
          ...s,
          step_order: i + 1,
        })),
        default_stamp_id: default_stamp_id || null,
        creator_id: req.user?.id || null,
      },
    });
    res.status(201).json(template);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '建立表單範本失敗' });
  }
});

router.put('/templates/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      doc_type,
      code_prefix,
      description,
      fields,
      workflow_steps,
      default_stamp_id,
      is_active,
    } = req.body;

    const template = await prisma.approvalTemplate.update({
      where: { id: String(id) },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(doc_type !== undefined ? { doc_type } : {}),
        ...(code_prefix !== undefined ? { code_prefix: String(code_prefix).toUpperCase() } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(Array.isArray(fields) ? { fields } : {}),
        ...(Array.isArray(workflow_steps)
          ? {
              workflow_steps: workflow_steps.map((s: any, i: number) => ({
                ...s,
                step_order: i + 1,
              })),
            }
          : {}),
        ...(default_stamp_id !== undefined ? { default_stamp_id } : {}),
        ...(is_active !== undefined ? { is_active: Boolean(is_active) } : {}),
      },
    });
    res.json(template);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '更新表單範本失敗' });
  }
});

router.delete('/templates/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    await prisma.approvalRequest.deleteMany({ where: { template_id: id } });
    await prisma.approvalTemplate.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '刪除表單範本失敗' });
  }
});

// ==========================================
// 3. 電子簽核申請單與簽核用印 (ApprovalRequest) API
// ==========================================

router.get('/requests', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await ensureDefaultApprovalsSeeded();
    const requests = await prisma.approvalRequest.findMany({
      include: {
        template: true,
      },
      orderBy: { created_at: 'desc' },
    });

    const user = req.user;
    const enriched = requests.map(r => {
      const steps: any[] = Array.isArray(r.workflow_steps) ? (r.workflow_steps as any[]) : [];
      const activeStep = steps.find(s => Number(s.step_order) === Number(r.current_step));
      const isPendingForMe =
        (r.status === '待簽核' || r.status === '簽核中') &&
        activeStep &&
        canUserApproveStep(user, r, activeStep);

      return {
        ...r,
        isPendingForMe: Boolean(isPendingForMe),
        activeStepName: activeStep?.step_name || '',
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '取得簽核單據列表失敗' });
  }
});

router.post('/requests', authenticateToken, async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ error: '未授權' });

  try {
    const {
      template_id,
      title,
      urgency,
      project_id,
      form_data,
      applicant_name,
      applicant_dept,
    } = req.body;

    if (!template_id) {
      return res.status(400).json({ error: '請選擇表單/簽呈/報表範本' });
    }
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: '請填寫主旨 / 單據標題' });
    }

    const template = await prisma.approvalTemplate.findUnique({
      where: { id: String(template_id) },
    });
    if (!template) {
      return res.status(404).json({ error: '找不到指定的表單範本' });
    }

    const requestNo = await generateNextRequestNo(template.code_prefix || 'AP');
    const dbUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { department: true },
    });

    const finalApplicantName = applicant_name || dbUser?.name || req.user.account || '申請人';
    const finalApplicantDept =
      applicant_dept || dbUser?.department?.name || req.user.department || '工務部';

    const steps: any[] = Array.isArray(template.workflow_steps)
      ? (template.workflow_steps as any[])
      : [];

    const created = await prisma.approvalRequest.create({
      data: {
        request_no: requestNo,
        template_id: template.id,
        title: String(title).trim(),
        doc_type: template.doc_type || '簽呈',
        urgency: urgency || '一般',
        project_id: project_id || null,
        applicant_id: req.user.id,
        applicant_name: finalApplicantName,
        applicant_dept: finalApplicantDept,
        form_data: form_data || {},
        workflow_steps: steps,
        current_step: 1,
        status: '待簽核',
        approval_records: [],
      },
      include: {
        template: true,
      },
    });

    // 發送通知給第一關簽核人
    try {
      const firstStep = steps.find(s => Number(s.step_order) === 1) || steps[0];
      if (firstStep) {
        let targetUsers: { id: string }[] = [];
        if (firstStep.approver_type === 'SPECIFIC_USER' && firstStep.target_user_id) {
          targetUsers = [{ id: firstStep.target_user_id }];
        } else if (firstStep.approver_type === 'APPLICANT_MANAGER') {
          targetUsers = await prisma.user.findMany({
            where: {
              is_active: true,
              department: { name: finalApplicantDept },
              role: { level: { gte: 50 } },
            },
            select: { id: true },
          });
        } else if (firstStep.approver_type === 'DEPARTMENT_MANAGER' && firstStep.target_dept) {
          targetUsers = await prisma.user.findMany({
            where: {
              is_active: true,
              department: { name: firstStep.target_dept },
              role: { level: { gte: 50 } },
            },
            select: { id: true },
          });
        } else if (firstStep.approver_type === 'ROLE_LEVEL') {
          targetUsers = await prisma.user.findMany({
            where: {
              is_active: true,
              role: { level: { gte: Number(firstStep.target_role_level || 100) } },
            },
            select: { id: true },
          });
        }

        if (targetUsers.length > 0) {
          await prisma.notification.createMany({
            data: targetUsers.map(u => ({
              user_id: u.id,
              title: `【電子簽核待審】${created.request_no} ${created.title}`,
              content: `${finalApplicantDept} ${finalApplicantName} 送出${created.doc_type}「${created.title}」，目前位於第 1 關【${firstStep.step_name}】，請至「電子簽核」或「總覽看板 ➔ 待辦簽核專區」簽核用印。`,
            })),
          });
        }
      }
    } catch (notifyErr) {
      console.error('Notify first step approvers error:', notifyErr);
    }

    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '建立電子簽核申請單失敗' });
  }
});

// 執行簽核與蓋下電子印章 (同意 / 退回)
router.post('/requests/:id/action', authenticateToken, async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ error: '未授權' });

  try {
    const { id } = req.params;
    const { action, comment, stamp_id, stamp_date, custom_signer_name } = req.body; // action: 'APPROVE' | 'REJECT'

    const existing = await prisma.approvalRequest.findUnique({
      where: { id: String(id) },
      include: { template: true },
    });
    if (!existing) {
      return res.status(404).json({ error: '找不到該筆簽核單據' });
    }
    if (existing.status === '已核准' || existing.status === '已退回') {
      return res.status(400).json({ error: `此單據已結案（狀態：${existing.status}），無法重複簽核` });
    }

    const steps: any[] = Array.isArray(existing.workflow_steps)
      ? (existing.workflow_steps as any[])
      : [];
    const currentStepObj = steps.find(s => Number(s.step_order) === Number(existing.current_step));

    if (!currentStepObj) {
      return res.status(400).json({ error: '找不到目前對應的簽核關卡設定' });
    }

    if (!canUserApproveStep(req.user, existing, currentStepObj)) {
      return res.status(403).json({
        error: `權限不足：目前關卡為「${currentStepObj.step_name}」，您不在此關卡的簽核權限範圍內`,
      });
    }

    const isApprove = action !== 'REJECT';

    // 查詢簽核者資訊與所選電子印章
    const dbUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { department: true, role: true },
    });
    const signerName =
      (custom_signer_name && String(custom_signer_name).trim()) ||
      dbUser?.name ||
      req.user.account ||
      '簽核主管';
    const signerDept =
      dbUser?.department?.name ||
      req.user.department ||
      currentStepObj.target_dept ||
      existing.applicant_dept ||
      '管理部';

    let stampSnapshot: any = null;
    const targetStampId = stamp_id || currentStepObj.stamp_id || existing.template?.default_stamp_id;

    if (isApprove && currentStepObj.require_stamp && !targetStampId) {
      return res.status(400).json({
        error: `關卡「${currentStepObj.step_name}」規定簽核同意時必須選擇並蓋下簽核用印章！`,
      });
    }

    if (targetStampId && isApprove) {
      const stampObj = await prisma.approvalStamp.findUnique({
        where: { id: String(targetStampId) },
      });
      if (stampObj) {
        const resolvedMiddle =
          !stampObj.middle_text || stampObj.middle_text === '自動帶入部門'
            ? currentStepObj.target_dept || signerDept
            : stampObj.middle_text;

        stampSnapshot = {
          id: stampObj.id,
          name: stampObj.name,
          shape: stampObj.shape,
          color: stampObj.color,
          top_text: stampObj.top_text,
          middle_text: resolvedMiddle,
          bottom_text: stampObj.bottom_text,
          show_date: stampObj.show_date,
          show_signer: stampObj.show_signer,
          border_style: stampObj.border_style,
          stamp_date: stamp_date || new Date().toISOString().slice(0, 10),
          signer_name: signerName,
        };
      }
    }

    const prevRecords: any[] = Array.isArray(existing.approval_records)
      ? (existing.approval_records as any[])
      : [];

    const newRecord = {
      step_order: Number(existing.current_step),
      step_name: currentStepObj.step_name,
      action: isApprove ? '同意' : '退回',
      signer_id: req.user.id,
      signer_name: signerName,
      signer_dept: signerDept,
      comment: comment || (isApprove ? '同意核准' : '退回修正'),
      stamp_snapshot: stampSnapshot,
      signed_at: new Date().toISOString(),
    };

    const updatedRecords = [
      ...prevRecords.filter(r => Number(r.step_order) !== Number(existing.current_step)),
      newRecord,
    ];

    const totalSteps = steps.length;
    let nextStatus = existing.status;
    let nextStepNum = existing.current_step;

    if (!isApprove) {
      nextStatus = '已退回';
    } else if (Number(existing.current_step) >= totalSteps) {
      nextStatus = '已核准';
    } else {
      nextStatus = '簽核中';
      nextStepNum = Number(existing.current_step) + 1;
    }

    const updated = await prisma.approvalRequest.update({
      where: { id: existing.id },
      data: {
        current_step: nextStepNum,
        status: nextStatus,
        approval_records: updatedRecords,
      },
      include: {
        template: true,
      },
    });

    // 通知申請人或下一關簽核人
    try {
      if (nextStatus === '已核准' || nextStatus === '已退回') {
        await prisma.notification.create({
          data: {
            user_id: existing.applicant_id,
            title: `【電子簽核${nextStatus}】${existing.request_no} ${existing.title}`,
            content: `您申請的${existing.doc_type}「${existing.title}」已由 ${signerDept} ${signerName} 簽核「${newRecord.action}」（意見：${newRecord.comment}）。`,
          },
        });
      }
    } catch (notifyErr) {
      console.error('Notify applicant error:', notifyErr);
    }

    res.json(updated);
  } catch (err) {
    console.error('Approve request action error:', err);
    res.status(500).json({ error: '執行簽核失敗' });
  }
});

router.delete('/requests/:id', authenticateToken, async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ error: '未授權' });
  try {
    const existing = await prisma.approvalRequest.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!existing) return res.status(404).json({ error: '找不到單據' });
    const isAdmin = Number(req.user.level || 0) >= 100;
    if (!isAdmin && existing.applicant_id !== req.user.id) {
      return res.status(403).json({ error: '僅申請人本人或管理員可刪除此單據' });
    }
    await prisma.approvalRequest.delete({ where: { id: existing.id } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '刪除簽核單據失敗' });
  }
});

export default router;
