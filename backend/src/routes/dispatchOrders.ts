import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();
const memoryUpload = multer({ storage: multer.memoryStorage() });

// Download Excel template for steel structure / dispatch order items
router.get('/excel-template', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const wb = XLSX.utils.book_new();
    const rows = [
      ['鋼構總表', '', '', '', '', '', '', '', ''],
      ['案場名稱：', '', '', '', '', '', '', '', ''],
      ['需求日期：', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', ''],
      ['項目', '構件編號', '數量', '規格尺寸', '長度', '材質', '單重(Kg)', '總量(Kgs)', '備註'],
      ['RH鋼/柱', 'ASC-1', 1, 'RH200x100x5.5x8', 3559, 'SN400B', 85.72, 85.72, '熱浸鍍鋅>100μm'],
      ['', 'ASC-2', 1, 'RH200x100x5.5x8', 3086.5, 'SN400B', 74.13, 74.13, '熱浸鍍鋅>100μm'],
      ['RH鋼/樑', 'ASG-1', 1, 'RH200x100x5.5x8', 7554, 'SN400B', 166.38, 166.38, '熱浸鍍鋅>100μm'],
      ['C鋼', 'APN-1', 8, 'C150X65X20X3.2', 3596, 'SS400', 27.01, 216.08, '熱浸鍍鋅>65μm'],
      ['槽鋼', 'ABR-1', 7, 'U100X50X5X7.5', 1490.1, 'SS400', 13.95, 97.65, '熱浸鍍鋅>100μm'],
      ['零件板', 'CCL-1', 198, 'L105X57X4', 220, 'SS400', 1.1, 217.8, '熱浸鍍鋅>100μm'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 14 },
      { wch: 14 },
      { wch: 10 },
      { wch: 20 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, '工作表1');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent('派工單鋼構總表範本.xlsx')}`
    );
    res.send(buf);
  } catch (error) {
    console.error('Excel template error:', error);
    res.status(500).json({ error: '下載範本失敗' });
  }
});

// Parse uploaded Excel for dispatch order items
router.post('/parse-excel', authenticateToken, memoryUpload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '請選擇要匯入的 Excel 檔案' });
    }

    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    if (!wb.SheetNames || wb.SheetNames.length === 0) {
      return res.status(400).json({ error: '拒絕匯入：Excel 檔案內無任何工作表' });
    }

    const REQUIRED_HEADERS = ['項目', '構件編號', '數量', '規格尺寸', '長度', '材質', '單重(Kg)', '總量(Kgs)', '備註'];
    const parsedItems: any[] = [];
    let detectedSiteName = '';

    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      if (rows.length === 0) continue;

      // Scan top rows for metadata (e.g. 案場名稱：) and find the header row
      let headerRowIndex = -1;
      let colMap: Record<string, number> = {};

      for (let i = 0; i < Math.min(rows.length, 20); i++) {
        const rowCells = rows[i].map(c => String(c ?? '').trim());
        const siteLabelIdx = rowCells.findIndex(c => c.startsWith('案場名稱'));
        if (siteLabelIdx >= 0 && rowCells[siteLabelIdx + 1]) {
          detectedSiteName = rowCells[siteLabelIdx + 1];
        }

        const matchedAll = REQUIRED_HEADERS.every(reqH => rowCells.includes(reqH));
        if (matchedAll) {
          headerRowIndex = i;
          REQUIRED_HEADERS.forEach(reqH => {
            colMap[reqH] = rowCells.indexOf(reqH);
          });
          break;
        }
      }

      if (headerRowIndex === -1) {
        return res.status(400).json({
          error: `拒絕匯入：工作表「${sheetName}」格式不符合！必須包含欄位：${REQUIRED_HEADERS.join('、')}`
        });
      }

      let currentCategory = '';
      for (let r = headerRowIndex + 1; r < rows.length; r++) {
        const row = rows[r];
        if (!Array.isArray(row)) continue;

        const rawCategory = String(row[colMap['項目']] ?? '').trim();
        const memberNo = String(row[colMap['構件編號']] ?? '').trim();
        const rawQty = row[colMap['數量']];
        const spec = String(row[colMap['規格尺寸']] ?? '').trim();
        const rawLen = row[colMap['長度']];
        const material = String(row[colMap['材質']] ?? '').trim();
        const rawUnitWeight = row[colMap['單重(Kg)']];
        const rawTotalWeight = row[colMap['總量(Kgs)']];
        const note = String(row[colMap['備註']] ?? '').trim();

        // Skip completely empty rows or summary/total row ('總計' / '合計')
        if (rawCategory === '總計' || rawCategory === '合計' || memberNo === '總計' || memberNo === '合計') {
          continue;
        }
        if (!rawCategory && !memberNo && !spec && (rawQty === '' || rawQty === null || rawQty === undefined)) {
          continue;
        }

        if (rawCategory) {
          currentCategory = rawCategory;
        }

        const formatNumStr = (val: any) => {
          if (val === '' || val === null || val === undefined) return '';
          const n = Number(String(val).replace(/,/g, '').trim());
          if (Number.isNaN(n)) return String(val).trim();
          return String(Math.round(n * 100) / 100);
        };

        const qtyStr = formatNumStr(rawQty);
        const unitWStr = formatNumStr(rawUnitWeight);
        let totalWStr = formatNumStr(rawTotalWeight);
        if (!totalWStr && qtyStr && unitWStr && !Number.isNaN(Number(qtyStr)) && !Number.isNaN(Number(unitWStr))) {
          totalWStr = String(Math.round(Number(qtyStr) * Number(unitWStr) * 100) / 100);
        }

        parsedItems.push({
          category: currentCategory || '鋼構構件',
          member_no: memberNo,
          quantity: qtyStr,
          spec,
          length: formatNumStr(rawLen),
          material,
          unit_weight: unitWStr,
          total_weight: totalWStr,
          note,
        });
      }
    }

    if (parsedItems.length === 0) {
      return res.status(400).json({ error: '拒絕匯入：Excel 檔案內無任何有效的構件明細資料列' });
    }

    res.json({
      items: parsedItems,
      site_name: detectedSiteName,
      count: parsedItems.length,
    });
  } catch (error) {
    console.error('Parse dispatch excel error:', error);
    res.status(500).json({ error: '解析 Excel 失敗，請確認檔案格式是否正確' });
  }
});

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
