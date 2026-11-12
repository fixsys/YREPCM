import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();

async function generateNextDispatchNo(): Promise<string> {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const prefix = `DO-${datePart}-`;

  const latest = await prisma.dispatchOrder.findFirst({
    where: {
      dispatch_no: { startsWith: prefix }
    },
    orderBy: { dispatch_no: 'desc' }
  });

  if (!latest) {
    return `${prefix}001`;
  }

  const parts = latest.dispatch_no.split('-');
  const seq = parseInt(parts[parts.length - 1], 10);
  const nextSeq = Number.isNaN(seq) ? 1 : seq + 1;
  return `${prefix}${String(nextSeq).padStart(3, '0')}`;
}

// Get next auto-generated dispatch_no
router.get('/next-no', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const nextNo = await generateNextDispatchNo();
    res.json({ dispatch_no: nextNo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '產生派工單號失敗' });
  }
});

// List dispatch orders
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { project_id } = req.query;
    const whereClause: any = {};
    if (project_id) {
      whereClause.project_id = String(project_id);
    }

    const orders = await prisma.dispatchOrder.findMany({
      where: whereClause,
      include: {
        project: {
          select: { id: true, project_code: true, name: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '取得派工單列表失敗' });
  }
});

// Get single dispatch order
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const order = await prisma.dispatchOrder.findUnique({
      where: { id: String(req.params.id) },
      include: {
        project: {
          select: { id: true, project_code: true, name: true }
        }
      }
    });
    if (!order) return res.status(404).json({ error: '找不到派工單' });
    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '取得派工單失敗' });
  }
});

// Create dispatch order
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ error: '未授權' });

  try {
    const {
      dispatch_no,
      project_id,
      submit_date,
      urgency,
      request_dept,
      requester_name,
      requester_phone,
      target_dept,
      category_type,
      site_name,
      factory_area,
      other_location,
      items,
      description_note,
      required_date,
      req_manager_sign,
      req_manager_comment,
      drawing_received_date,
      target_manager_sign,
      approval_status,
      target_manager_comment,
      assigned_staff_sign,
      remarks
    } = req.body;

    if (!project_id) {
      return res.status(400).json({ error: '必須指定專案' });
    }

    let finalDispatchNo = (dispatch_no || '').trim();
    if (!finalDispatchNo) {
      finalDispatchNo = await generateNextDispatchNo();
    } else {
      const existing = await prisma.dispatchOrder.findUnique({
        where: { dispatch_no: finalDispatchNo }
      });
      if (existing) {
        return res.status(400).json({ error: `派工單號「${finalDispatchNo}」已存在，請使用其他單號` });
      }
    }

    const order = await prisma.dispatchOrder.create({
      data: {
        dispatch_no: finalDispatchNo,
        project_id,
        submit_date: submit_date ? new Date(submit_date) : new Date(),
        urgency: urgency || '一般(7日)',
        request_dept: request_dept || '工務部',
        requester_name: requester_name || (req.user as any).name || req.user.account || '',
        requester_phone: requester_phone || '',
        target_dept: target_dept || '鋼構部',
        category_type: category_type || '案場需求',
        site_name: site_name || '',
        factory_area: factory_area || '',
        other_location: other_location || '',
        items: Array.isArray(items) ? items : [],
        description_note: description_note || '',
        required_date: required_date ? new Date(required_date) : null,
        req_manager_sign: req_manager_sign || '',
        req_manager_comment: req_manager_comment || '',
        drawing_received_date: drawing_received_date || '',
        target_manager_sign: target_manager_sign || '',
        approval_status: approval_status || '待簽核',
        target_manager_comment: target_manager_comment || '',
        assigned_staff_sign: assigned_staff_sign || '',
        remarks: remarks || '',
        creator_id: req.user.id
      },
      include: {
        project: {
          select: { id: true, project_code: true, name: true }
        }
      }
    });

    res.status(201).json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '建立派工單失敗' });
  }
});

// Update dispatch order
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ error: '未授權' });

  try {
    const { id } = req.params;
    const {
      dispatch_no,
      project_id,
      submit_date,
      urgency,
      request_dept,
      requester_name,
      requester_phone,
      target_dept,
      category_type,
      site_name,
      factory_area,
      other_location,
      items,
      description_note,
      required_date,
      req_manager_sign,
      req_manager_comment,
      drawing_received_date,
      target_manager_sign,
      approval_status,
      target_manager_comment,
      assigned_staff_sign,
      remarks
    } = req.body;

    if (dispatch_no) {
      const conflict = await prisma.dispatchOrder.findFirst({
        where: {
          dispatch_no: String(dispatch_no).trim(),
          NOT: { id: String(id) }
        }
      });
      if (conflict) {
        return res.status(400).json({ error: `派工單號「${dispatch_no}」已被其他派工單使用` });
      }
    }

    const order = await prisma.dispatchOrder.update({
      where: { id: String(id) },
      data: {
        ...(dispatch_no ? { dispatch_no: String(dispatch_no).trim() } : {}),
        ...(project_id ? { project_id } : {}),
        ...(submit_date ? { submit_date: new Date(submit_date) } : {}),
        urgency: urgency || '一般(7日)',
        request_dept: request_dept || '工務部',
        requester_name: requester_name ?? '',
        requester_phone: requester_phone ?? '',
        target_dept: target_dept || '鋼構部',
        category_type: category_type || '案場需求',
        site_name: site_name ?? '',
        factory_area: factory_area ?? '',
        other_location: other_location ?? '',
        items: Array.isArray(items) ? items : [],
        description_note: description_note ?? '',
        required_date: required_date ? new Date(required_date) : null,
        req_manager_sign: req_manager_sign ?? '',
        req_manager_comment: req_manager_comment ?? '',
        drawing_received_date: drawing_received_date ?? '',
        target_manager_sign: target_manager_sign ?? '',
        approval_status: approval_status || '待簽核',
        target_manager_comment: target_manager_comment ?? '',
        assigned_staff_sign: assigned_staff_sign ?? '',
        remarks: remarks ?? ''
      },
      include: {
        project: {
          select: { id: true, project_code: true, name: true }
        }
      }
    });

    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '更新派工單失敗' });
  }
});

// Delete dispatch order
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ error: '未授權' });
  try {
    await prisma.dispatchOrder.delete({
      where: { id: String(req.params.id) }
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '刪除派工單失敗' });
  }
});

export default router;
