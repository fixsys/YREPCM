import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, FileText, Printer, X, Factory, Hash, Layers, UploadCloud, Download } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export interface DispatchOrderItem {
  category: string; // 項目 (例: RH鋼/柱、RH鋼/樑、C鋼、槽鋼、零件板)
  member_no: string; // 構件編號 (例: ASC-1)
  quantity: string; // 數量
  spec: string; // 規格尺寸 (例: RH200x100x5.5x8)
  length: string; // 長度 (例: 3559)
  material: string; // 材質 (例: SN400B、SS400)
  unit_weight: string; // 單重(Kg)
  total_weight: string; // 總量(Kgs)
  note: string; // 備註 (例: 熱浸鍍鋅>100μm)
  // 相容舊資料欄位
  description?: string;
  drawing_no?: string;
}

const DEFAULT_DEMAND_CATEGORIES = [
  'RH鋼/柱',
  'RH鋼/樑',
  'C鋼',
  '槽鋼',
  '零件板',
  '其他鋼構'
];

const createEmptyDispatchItem = (cat = 'RH鋼/柱'): DispatchOrderItem => ({
  category: cat,
  member_no: '',
  quantity: '',
  spec: '',
  length: '',
  material: '',
  unit_weight: '',
  total_weight: '',
  note: ''
});

const normalizeItem = (raw: any): DispatchOrderItem => ({
  category: raw?.category || 'RH鋼/柱',
  member_no: raw?.member_no ?? raw?.drawing_no ?? raw?.description ?? '',
  quantity: raw?.quantity !== undefined && raw?.quantity !== null ? String(raw.quantity) : '',
  spec: raw?.spec || '',
  length: raw?.length !== undefined && raw?.length !== null ? String(raw.length) : '',
  material: raw?.material || '',
  unit_weight: raw?.unit_weight !== undefined && raw?.unit_weight !== null ? String(raw.unit_weight) : '',
  total_weight: raw?.total_weight !== undefined && raw?.total_weight !== null ? String(raw.total_weight) : '',
  note: raw?.note ?? (raw?.member_no ? '' : raw?.description || ''),
});

interface DispatchOrdersTabProps {
  project: any;
}

const DispatchOrdersTab: React.FC<DispatchOrdersTabProps> = ({ project }) => {
  const { token, user } = useAuthStore();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const [viewingOrder, setViewingOrder] = useState<any | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  const [formData, setFormData] = useState({
    dispatch_no: '',
    submit_date: new Date().toISOString().slice(0, 10),
    urgency: '一般(7日)',
    request_dept: '工務部',
    requester_name: user?.name || '',
    requester_phone: '',
    target_dept: '鋼構部',
    category_type: '案場需求',
    site_name: project?.name || '',
    factory_area: '新市廠',
    other_location: '',
    description_note: '',
    required_date: '',
    req_manager_sign: '',
    req_manager_comment: '',
    drawing_received_date: '',
    target_manager_sign: '',
    approval_status: '待簽核',
    target_manager_comment: '',
    assigned_staff_sign: '',
    remarks: ''
  });

  const [items, setItems] = useState<DispatchOrderItem[]>([createEmptyDispatchItem()]);

  const allDemandCategories = Array.from(
    new Set([
      ...DEFAULT_DEMAND_CATEGORIES,
      ...customCategories,
      ...items.map(i => i.category).filter(Boolean)
    ])
  );

  const fetchOrders = async () => {
    if (!project?.id) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/dispatch-orders?project_id=${project.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(res.data || []);
    } catch (err) {
      console.error('Failed to fetch dispatch orders', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [project?.id, token]);

  const handleOpenCreate = async () => {
    setEditingOrder(null);
    setSubmitError('');
    let nextNo = '';
    try {
      const res = await axios.get('/api/dispatch-orders/next-no', {
        headers: { Authorization: `Bearer ${token}` }
      });
      nextNo = res.data?.dispatch_no || '';
    } catch {
      const now = new Date();
      nextNo = `DO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-001`;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    setFormData({
      dispatch_no: nextNo,
      submit_date: todayStr,
      urgency: '一般(7日)',
      request_dept: '工務部',
      requester_name: user?.name || '',
      requester_phone: '',
      target_dept: '鋼構部',
      category_type: '案場需求',
      site_name: project?.name || '',
      factory_area: '新市廠',
      other_location: '',
      description_note: '',
      required_date: '',
      req_manager_sign: '',
      req_manager_comment: '',
      drawing_received_date: todayStr,
      target_manager_sign: '',
      approval_status: '待簽核',
      target_manager_comment: '',
      assigned_staff_sign: '',
      remarks: ''
    });
    setItems([createEmptyDispatchItem()]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (order: any) => {
    setEditingOrder(order);
    setSubmitError('');
    setFormData({
      dispatch_no: order.dispatch_no || '',
      submit_date: order.submit_date ? new Date(order.submit_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      urgency: order.urgency || '一般(7日)',
      request_dept: order.request_dept || '工務部',
      requester_name: order.requester_name || '',
      requester_phone: order.requester_phone || '',
      target_dept: order.target_dept || '鋼構部',
      category_type: order.category_type || '案場需求',
      site_name: order.site_name || project?.name || '',
      factory_area: order.factory_area || '新市廠',
      other_location: order.other_location || '',
      description_note: order.description_note || '',
      required_date: order.required_date ? new Date(order.required_date).toISOString().slice(0, 10) : '',
      req_manager_sign: order.req_manager_sign || '',
      req_manager_comment: order.req_manager_comment || '',
      drawing_received_date: order.drawing_received_date || '',
      target_manager_sign: order.target_manager_sign || '',
      approval_status: order.approval_status || '待簽核',
      target_manager_comment: order.target_manager_comment || '',
      assigned_staff_sign: order.assigned_staff_sign || '',
      remarks: order.remarks || ''
    });

    const parsedItems = Array.isArray(order.items) && order.items.length > 0
      ? order.items.map(normalizeItem)
      : [createEmptyDispatchItem()];
    setItems(parsedItems);
    setIsModalOpen(true);
  };

  const handleAddCustomCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    if (!allDemandCategories.includes(trimmed)) {
      setCustomCategories(prev => [...prev, trimmed]);
    }
    setItems(prev => [...prev, createEmptyDispatchItem(trimmed)]);
    setNewCategoryInput('');
  };

  const handleDownloadExcelTemplate = async () => {
    try {
      const res = await axios.get('/api/dispatch-orders/excel-template', {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', '派工單鋼構總表範本.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('下載範本失敗');
    }
  };

  const handleImportExcel = async (file: File) => {
    setSubmitError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await axios.post('/api/dispatch-orders/parse-excel', fd, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      const importedItems: DispatchOrderItem[] = (res.data.items || []).map(normalizeItem);
      if (importedItems.length > 0) {
        // Check if current items only has 1 empty row; if so replace, otherwise append
        const isCurrentEmpty =
          items.length === 1 &&
          !items[0].member_no.trim() &&
          !items[0].spec.trim() &&
          !items[0].quantity.trim();
        setItems(isCurrentEmpty ? importedItems : [...items, ...importedItems]);
        alert(`成功從 Excel 匯入 ${importedItems.length} 筆構件明細！`);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || '匯入 Excel 失敗，請確認欄位包含：項目、構件編號、數量、規格尺寸、長度、材質、單重(Kg)、總量(Kgs)、備註');
    }
  };

  const updateItemField = (idx: number, field: keyof DispatchOrderItem, value: string) => {
    const next = [...items];
    const row = { ...next[idx], [field]: value };

    // 當數量或單重變更時，自動計算總量(Kgs) = 數量 * 單重(Kg)
    if (field === 'quantity' || field === 'unit_weight') {
      const q = parseFloat(row.quantity);
      const uw = parseFloat(row.unit_weight);
      if (!Number.isNaN(q) && !Number.isNaN(uw)) {
        row.total_weight = String(Math.round(q * uw * 100) / 100);
      }
    }

    next[idx] = row;
    setItems(next);
  };

  const computeTotals = (list: DispatchOrderItem[]) => {
    let totalQty = 0;
    let totalUnitW = 0;
    let totalWeight = 0;
    list.forEach(it => {
      const q = parseFloat(String(it.quantity).replace(/,/g, ''));
      const uw = parseFloat(String(it.unit_weight).replace(/,/g, ''));
      const tw = parseFloat(String(it.total_weight).replace(/,/g, ''));
      if (!Number.isNaN(q)) totalQty += q;
      if (!Number.isNaN(uw)) totalUnitW += uw;
      if (!Number.isNaN(tw)) totalWeight += tw;
    });
    return {
      totalQty: Math.round(totalQty * 100) / 100,
      totalUnitW: Math.round(totalUnitW * 100) / 100,
      totalWeight: Math.round(totalWeight * 100) / 100
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    const validItems = items.filter(
      it =>
        it.member_no.trim() ||
        it.spec.trim() ||
        it.quantity.trim() ||
        it.length.trim() ||
        it.material.trim() ||
        it.note.trim()
    );
    if (validItems.length === 0) {
      setSubmitError('請至少填寫一項「生產製造加工需求（項目 / 構件編號 / 數量 / 規格尺寸）」');
      return;
    }
    if (!formData.required_date) {
      setSubmitError('請填寫「需求時間(必填)」');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        project_id: project.id,
        items: validItems
      };

      if (editingOrder) {
        await axios.put(`/api/dispatch-orders/${editingOrder.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post('/api/dispatch-orders', payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setIsModalOpen(false);
      fetchOrders();
    } catch (err: any) {
      setSubmitError(err.response?.data?.error || '儲存派工單失敗');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (order: any) => {
    if (!window.confirm(`確定要刪除派工單「${order.dispatch_no}」嗎？`)) return;
    try {
      await axios.delete(`/api/dispatch-orders/${order.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchOrders();
    } catch (err: any) {
      alert(err.response?.data?.error || '刪除派工單失敗');
    }
  };

  const modalTotals = computeTotals(items);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Factory size={20} className="text-blue-600" />
            生產派工管理 (元融公司 內部派工委託單)
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            建立與管理專案生產派工委託單（支援鋼構總表 Excel 匯入），派工單號與構件明細將直接連動至「製造報工」。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/manufacturing')}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Factory size={16} /> 前往製造報工
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Plus size={16} /> 新增派工單
          </button>
        </div>
      </div>

      {/* Dispatch Orders List */}
      {loading ? (
        <div className="text-center py-10 text-slate-400">載入派工單中...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500">
          目前尚無生產派工單，請點擊右上角「新增派工單」建立。
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => {
            const orderItems: DispatchOrderItem[] = Array.isArray(order.items)
              ? order.items.map(normalizeItem)
              : [];
            const totals = computeTotals(orderItems);
            return (
              <div
                key={order.id}
                className="border border-slate-200 rounded-xl p-5 hover:border-blue-300 transition-all bg-slate-50/40 space-y-4"
              >
                <div className="flex flex-wrap justify-between items-start gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 bg-blue-600 text-white text-xs font-bold rounded-md flex items-center gap-1">
                        <Hash size={13} /> 派工單號：{order.dispatch_no}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 text-xs font-bold rounded-md border ${
                          order.urgency === '急單(3日)'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : order.urgency === '長期'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {order.urgency}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 text-xs font-bold rounded-md ${
                          order.approval_status === '同意'
                            ? 'bg-emerald-100 text-emerald-700'
                            : order.approval_status === '退回'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        簽核：{order.approval_status || '待簽核'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1 pt-1">
                      <span><strong>送單時間：</strong>{order.submit_date ? new Date(order.submit_date).toLocaleDateString() : '-'}</span>
                      <span><strong>需求時間：</strong>{order.required_date ? new Date(order.required_date).toLocaleDateString() : '-'}</span>
                      <span><strong>需求單位：</strong>{order.request_dept}（開單人：{order.requester_name || '-'} {order.requester_phone ? `/ ${order.requester_phone}` : ''}）</span>
                      <span><strong>預計委託單位：</strong>{order.target_dept}</span>
                      <span>
                        <strong>類別：</strong>{order.category_type}
                        {order.category_type === '案場需求' && order.site_name ? ` (${order.site_name})` : ''}
                        {order.category_type === '工廠內部需求' && order.factory_area ? ` (${order.factory_area})` : ''}
                        {order.category_type === '其他需求' && order.other_location ? ` (${order.other_location})` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setViewingOrder(order)}
                      className="px-3 py-1.5 bg-white border border-slate-300 hover:border-blue-400 hover:text-blue-600 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      <FileText size={14} /> 檢視派工單
                    </button>
                    <button
                      onClick={() => handleOpenEdit(order)}
                      className="px-3 py-1.5 bg-white border border-slate-300 hover:border-teal-500 hover:text-teal-700 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      <Edit2 size={14} /> 編輯
                    </button>
                    <button
                      onClick={() => handleDelete(order)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                      title="刪除派工單"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Items Table */}
                {orderItems.length > 0 && (
                  <div className="overflow-x-auto bg-white rounded-lg border border-slate-200 max-h-80 overflow-y-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                          <th className="py-2 px-2.5 w-24">項目</th>
                          <th className="py-2 px-2.5 w-28">構件編號</th>
                          <th className="py-2 px-2.5 w-20 text-right">數量</th>
                          <th className="py-2 px-2.5">規格尺寸</th>
                          <th className="py-2 px-2.5 w-24 text-right">長度</th>
                          <th className="py-2 px-2.5 w-24">材質</th>
                          <th className="py-2 px-2.5 w-24 text-right">單重(Kg)</th>
                          <th className="py-2 px-2.5 w-28 text-right">總量(Kgs)</th>
                          <th className="py-2 px-2.5">備註</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {orderItems.map((it, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-1.5 px-2.5">
                              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-semibold">
                                {it.category || '-'}
                              </span>
                            </td>
                            <td className="py-1.5 px-2.5 font-mono font-bold text-slate-800">{it.member_no || '-'}</td>
                            <td className="py-1.5 px-2.5 text-right font-bold text-blue-700">{it.quantity || '-'}</td>
                            <td className="py-1.5 px-2.5 font-mono text-slate-700">{it.spec || '-'}</td>
                            <td className="py-1.5 px-2.5 text-right font-mono text-slate-600">{it.length || '-'}</td>
                            <td className="py-1.5 px-2.5 text-slate-700">{it.material || '-'}</td>
                            <td className="py-1.5 px-2.5 text-right font-mono text-slate-600">{it.unit_weight || '-'}</td>
                            <td className="py-1.5 px-2.5 text-right font-mono font-bold text-emerald-700">{it.total_weight || '-'}</td>
                            <td className="py-1.5 px-2.5 text-slate-600">{it.note || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 font-bold text-slate-800 border-t border-slate-200">
                          <td className="py-2 px-2.5">總計 ({orderItems.length} 項)</td>
                          <td className="py-2 px-2.5"></td>
                          <td className="py-2 px-2.5 text-right text-blue-700">{totals.totalQty.toLocaleString()}</td>
                          <td colSpan={3} className="py-2 px-2.5"></td>
                          <td className="py-2 px-2.5 text-right font-mono">{totals.totalUnitW.toLocaleString()}</td>
                          <td className="py-2 px-2.5 text-right font-mono text-emerald-700">{totals.totalWeight.toLocaleString()}</td>
                          <td className="py-2 px-2.5"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                {order.description_note && (
                  <div className="text-xs text-slate-600 bg-amber-50/60 border border-amber-200/70 rounded-lg px-3 py-2">
                    <strong className="text-amber-900">補充說明：</strong> {order.description_note}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: 新增 / 編輯 派工單 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-slate-800 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-lg font-bold">
                  {editingOrder ? '編輯生產派工單' : '新增生產派工單'} — 元融公司 內部派工委託單
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  專案：{project?.project_code} - {project?.name}
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6">
              {submitError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
                  {submitError}
                </div>
              )}

              {/* 頂部：派工單號 + 一、送單時間與緊急程度 */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">一</span>
                  派工單號與送單基本資訊
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">派工單號 (必填) *</label>
                    <input
                      type="text"
                      required
                      value={formData.dispatch_no}
                      onChange={e => setFormData({ ...formData, dispatch_no: e.target.value })}
                      placeholder="例: DO-20261112-001"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono font-bold text-blue-700 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">送單時間 (必填) *</label>
                    <input
                      type="date"
                      required
                      value={formData.submit_date}
                      onChange={e => setFormData({ ...formData, submit_date: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">勾選時效 (必填) *</label>
                    <div className="flex items-center gap-3 pt-1.5">
                      {['急單(3日)', '一般(7日)', '長期'].map(opt => (
                        <label key={opt} className="flex items-center gap-1.5 text-sm font-medium text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name="urgency"
                            checked={formData.urgency === opt}
                            onChange={() => setFormData({ ...formData, urgency: opt })}
                            className="text-blue-600"
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 二、需求單位、類別、委託事項說明(條列式加工需求)、需求時間 */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-5">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">二</span>
                  委託單位、類別與生產製造加工需求
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">需求單位 (必填) *</label>
                    <input
                      type="text"
                      required
                      value={formData.request_dept}
                      onChange={e => setFormData({ ...formData, request_dept: e.target.value })}
                      placeholder="例：工務部"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">開單人 *</label>
                    <input
                      type="text"
                      required
                      value={formData.requester_name}
                      onChange={e => setFormData({ ...formData, requester_name: e.target.value })}
                      placeholder="輸入開單人姓名"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">電話</label>
                    <input
                      type="text"
                      value={formData.requester_phone}
                      onChange={e => setFormData({ ...formData, requester_phone: e.target.value })}
                      placeholder="例：0958-xxx-xxx"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">預計委託單位 (必填) *</label>
                    <input
                      type="text"
                      required
                      value={formData.target_dept}
                      onChange={e => setFormData({ ...formData, target_dept: e.target.value })}
                      placeholder="例：鋼構部"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none"
                    />
                  </div>
                </div>

                {/* 類別 (必填) */}
                <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-3">
                  <label className="block text-xs font-bold text-slate-700">類別 (必填) *</label>

                  <div className="space-y-2.5 text-sm">
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-2 font-medium text-slate-700 w-44 cursor-pointer">
                        <input
                          type="radio"
                          checked={formData.category_type === '案場需求'}
                          onChange={() => setFormData({ ...formData, category_type: '案場需求' })}
                          className="text-blue-600"
                        />
                        案場需求
                      </label>
                      <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                        <span className="text-xs text-slate-500 shrink-0">案場名稱：</span>
                        <input
                          type="text"
                          value={formData.site_name}
                          onChange={e => setFormData({ ...formData, site_name: e.target.value })}
                          className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded text-sm outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-2 font-medium text-slate-700 w-44 cursor-pointer">
                        <input
                          type="radio"
                          checked={formData.category_type === '工廠內部需求'}
                          onChange={() => setFormData({ ...formData, category_type: '工廠內部需求' })}
                          className="text-blue-600"
                        />
                        工廠內部需求
                      </label>
                      <div className="flex items-center gap-4 flex-1">
                        <span className="text-xs text-slate-500">廠區：</span>
                        {['新市廠', '安南廠', '安定廠'].map(area => (
                          <label key={area} className="flex items-center gap-1.5 text-sm cursor-pointer">
                            <input
                              type="radio"
                              checked={formData.factory_area === area}
                              onChange={() => setFormData({ ...formData, category_type: '工廠內部需求', factory_area: area })}
                              className="text-blue-600"
                            />
                            {area}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-2 font-medium text-slate-700 w-44 cursor-pointer">
                        <input
                          type="radio"
                          checked={formData.category_type === '其他需求'}
                          onChange={() => setFormData({ ...formData, category_type: '其他需求' })}
                          className="text-blue-600"
                        />
                        其他需求 (非案場及公司區域)
                      </label>
                      <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                        <span className="text-xs text-slate-500 shrink-0">位置：</span>
                        <input
                          type="text"
                          value={formData.other_location}
                          onChange={e => setFormData({ ...formData, category_type: '其他需求', other_location: e.target.value })}
                          placeholder="請輸入位置"
                          className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded text-sm outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 委託事項說明(必填) — 生產製造加工需求 (條列式：項目 / 構件編號 / 數量 / 規格尺寸 / 長度 / 材質 / 單重(Kg) / 總量(Kgs) / 備註) */}
                <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
                  <div className="flex flex-wrap justify-between items-start gap-3">
                    <div>
                      <label className="block text-sm font-bold text-slate-800">
                        委託事項說明 (必填) — 生產製造加工需求 (條列式) *
                      </label>
                      <p className="text-xs text-red-600 mt-0.5">
                        1. 如需廠內加工，請一併提供圖面。(紙本及電子檔) &nbsp; 2. 若無提供圖面，恕不受理派工單。
                      </p>
                    </div>

                    {/* Excel 匯入與新增自訂項目 */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadExcelTemplate}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <Download size={13} /> 下載鋼構總表範本
                      </button>
                      <label className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer shadow-sm">
                        <UploadCloud size={14} /> 從 Excel 匯入鋼構總表
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleImportExcel(file);
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>
                      <input
                        type="text"
                        value={newCategoryInput}
                        onChange={e => setNewCategoryInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomCategory();
                          }
                        }}
                        placeholder="輸入其他項目 (如: 預埋件)"
                        className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs outline-none w-44"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomCategory}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <Layers size={13} /> + 新增其他項目
                      </button>
                    </div>
                  </div>

                  {/* 9欄式鋼構構件明細表 */}
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-xs text-left border-collapse min-w-[920px]">
                      <thead>
                        <tr className="bg-slate-200/80 text-slate-800 border-b border-slate-300 font-bold">
                          <th className="py-2 px-2 text-center w-10">#</th>
                          <th className="py-2 px-2 w-32">項目</th>
                          <th className="py-2 px-2 w-28">構件編號</th>
                          <th className="py-2 px-2 w-20">數量</th>
                          <th className="py-2 px-2 w-40">規格尺寸</th>
                          <th className="py-2 px-2 w-24">長度</th>
                          <th className="py-2 px-2 w-24">材質</th>
                          <th className="py-2 px-2 w-24">單重(Kg)</th>
                          <th className="py-2 px-2 w-28">總量(Kgs)</th>
                          <th className="py-2 px-2">備註</th>
                          <th className="py-2 px-2 w-10 text-center">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-slate-50/50">
                        {items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-blue-50/30">
                            <td className="py-1.5 px-2 text-center font-bold text-slate-500">
                              {idx + 1}
                            </td>
                            <td className="py-1.5 px-1.5">
                              <select
                                value={item.category}
                                onChange={e => updateItemField(idx, 'category', e.target.value)}
                                className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-xs font-medium outline-none"
                              >
                                {allDemandCategories.map(cat => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-1.5 px-1.5">
                              <input
                                type="text"
                                value={item.member_no}
                                onChange={e => updateItemField(idx, 'member_no', e.target.value)}
                                placeholder="例: ASC-1"
                                className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-xs font-mono outline-none"
                              />
                            </td>
                            <td className="py-1.5 px-1.5">
                              <input
                                type="number"
                                step="any"
                                value={item.quantity}
                                onChange={e => updateItemField(idx, 'quantity', e.target.value)}
                                placeholder="數量"
                                className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-xs text-right outline-none"
                              />
                            </td>
                            <td className="py-1.5 px-1.5">
                              <input
                                type="text"
                                value={item.spec}
                                onChange={e => updateItemField(idx, 'spec', e.target.value)}
                                placeholder="例: RH200x100x5.5x8"
                                className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-xs font-mono outline-none"
                              />
                            </td>
                            <td className="py-1.5 px-1.5">
                              <input
                                type="number"
                                step="any"
                                value={item.length}
                                onChange={e => updateItemField(idx, 'length', e.target.value)}
                                placeholder="例: 3559"
                                className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-xs font-mono text-right outline-none"
                              />
                            </td>
                            <td className="py-1.5 px-1.5">
                              <input
                                type="text"
                                value={item.material}
                                onChange={e => updateItemField(idx, 'material', e.target.value)}
                                placeholder="例: SN400B"
                                className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-xs outline-none"
                              />
                            </td>
                            <td className="py-1.5 px-1.5">
                              <input
                                type="number"
                                step="any"
                                value={item.unit_weight}
                                onChange={e => updateItemField(idx, 'unit_weight', e.target.value)}
                                placeholder="單重"
                                className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-xs font-mono text-right outline-none"
                              />
                            </td>
                            <td className="py-1.5 px-1.5">
                              <input
                                type="number"
                                step="any"
                                value={item.total_weight}
                                onChange={e => updateItemField(idx, 'total_weight', e.target.value)}
                                placeholder="自動計算"
                                className="w-full px-2 py-1.5 border border-slate-300 rounded bg-emerald-50/60 text-emerald-800 font-bold text-xs font-mono text-right outline-none"
                              />
                            </td>
                            <td className="py-1.5 px-1.5">
                              <input
                                type="text"
                                value={item.note}
                                onChange={e => updateItemField(idx, 'note', e.target.value)}
                                placeholder="例: 熱浸鍍鋅>100μm"
                                className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-xs outline-none"
                              />
                            </td>
                            <td className="py-1.5 px-1.5 text-center">
                              {items.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => setItems(items.filter((_, i) => i !== idx))}
                                  className="p-1 text-red-500 hover:bg-red-100 rounded"
                                  title="刪除此列"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 font-bold text-slate-800 border-t border-slate-300">
                          <td colSpan={2} className="py-2 px-3">總計 ({items.length} 列)</td>
                          <td></td>
                          <td className="py-2 px-2 text-right text-blue-700">{modalTotals.totalQty.toLocaleString()}</td>
                          <td colSpan={3}></td>
                          <td className="py-2 px-2 text-right font-mono">{modalTotals.totalUnitW.toLocaleString()}</td>
                          <td className="py-2 px-2 text-right font-mono text-emerald-700">{modalTotals.totalWeight.toLocaleString()}</td>
                          <td colSpan={2}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="flex flex-wrap justify-between items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setItems([
                          ...items,
                          createEmptyDispatchItem(items[items.length - 1]?.category || allDemandCategories[0] || 'RH鋼/柱')
                        ])
                      }
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={14} /> + 新增一列生產製造加工需求
                    </button>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('確定要清空目前所有明細列嗎？')) {
                            setItems([createEmptyDispatchItem()]);
                          }
                        }}
                        className="text-xs text-red-500 hover:text-red-700 font-medium cursor-pointer"
                      >
                        清空所有明細
                      </button>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-xs font-bold text-slate-600 mb-1">其他補充說明 (選填)</label>
                    <textarea
                      rows={2}
                      value={formData.description_note}
                      onChange={e => setFormData({ ...formData, description_note: e.target.value })}
                      placeholder="如有其他特殊加工注意事項可填寫於此..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none"
                    />
                  </div>
                </div>

                {/* 需求時間 (必填) */}
                <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800">需求時間 (必填) *</label>
                    <p className="text-[11px] text-red-600 mt-0.5">
                      (PS. 如派工內容需先進行材料採購，請先確認材料下單後，預計可入廠日期，再進行需求日期填寫。謝謝。)
                    </p>
                  </div>
                  <input
                    type="date"
                    required
                    value={formData.required_date}
                    onChange={e => setFormData({ ...formData, required_date: e.target.value })}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 三 & 四、簽核與收圖資訊 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">三</span>
                    需求單位主管簽核與收圖章
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">需求單位主管簽核</label>
                      <input
                        type="text"
                        value={formData.req_manager_sign}
                        onChange={e => setFormData({ ...formData, req_manager_sign: e.target.value })}
                        placeholder="主管姓名"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">收圖章日期</label>
                      <input
                        type="date"
                        value={formData.drawing_received_date}
                        onChange={e => setFormData({ ...formData, drawing_received_date: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">簽核意見</label>
                    <input
                      type="text"
                      value={formData.req_manager_comment}
                      onChange={e => setFormData({ ...formData, req_manager_comment: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white outline-none"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">四</span>
                    受託單位簽核與交辦
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">受託單位主管簽名</label>
                      <input
                        type="text"
                        value={formData.target_manager_sign}
                        onChange={e => setFormData({ ...formData, target_manager_sign: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">簽核結果</label>
                      <select
                        value={formData.approval_status}
                        onChange={e => setFormData({ ...formData, approval_status: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white outline-none font-bold"
                      >
                        <option value="待簽核">待簽核</option>
                        <option value="同意">同意</option>
                        <option value="退回">退回</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">交辦人員簽名</label>
                      <input
                        type="text"
                        value={formData.assigned_staff_sign}
                        onChange={e => setFormData({ ...formData, assigned_staff_sign: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">備註</label>
                      <input
                        type="text"
                        value={formData.remarks}
                        onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-bold"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? '儲存中...' : editingOrder ? '儲存修改' : '建立派工單'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: 檢視 / 列印「元融公司 內部派工委託單」 */}
      {viewingOrder && (() => {
        const viewItems: DispatchOrderItem[] = Array.isArray(viewingOrder.items)
          ? viewingOrder.items.map(normalizeItem)
          : [];
        const viewTotals = computeTotals(viewItems);
        return (
          <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden">
              <div className="px-6 py-3 bg-slate-800 text-white flex justify-between items-center print:hidden shrink-0">
                <span className="font-bold">派工委託單預覽 — {viewingOrder.dispatch_no}</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => window.print()}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold flex items-center gap-1.5"
                  >
                    <Printer size={15} /> 列印 / 另存 PDF
                  </button>
                  <button onClick={() => setViewingOrder(null)} className="text-slate-300 hover:text-white">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-8 overflow-y-auto flex-1 bg-white text-black" style={{ fontFamily: "'DFKai-SB', '標楷體', 'Microsoft JhengHei', serif" }}>
                <div className="flex justify-between items-end mb-1 text-xs">
                  <div className="font-bold text-sm">派工單號：<span className="font-mono underline">{viewingOrder.dispatch_no}</span></div>
                  <div>2025/5/10 改版</div>
                </div>

                <table className="w-full border-collapse border-2 border-black text-sm">
                  <tbody>
                    {/* Title */}
                    <tr>
                      <td colSpan={4} className="border border-black py-3 text-center text-2xl font-bold tracking-widest">
                        元融公司 內部派工委託單
                      </td>
                    </tr>

                    {/* Section 一 */}
                    <tr>
                      <td className="border border-black w-10 text-center font-bold">一</td>
                      <td className="border border-black w-48 p-2 font-bold">送單時間(必填)</td>
                      <td className="border border-black p-2 text-center text-base font-bold">
                        {viewingOrder.submit_date ? new Date(viewingOrder.submit_date).toLocaleDateString('zh-TW') : ''}
                      </td>
                      <td className="border border-black p-2 w-64">
                        <div className="font-bold mb-1">勾選:(必填)</div>
                        <div>1. {viewingOrder.urgency === '急單(3日)' ? '☑' : '□'}急單(3日)</div>
                        <div>2. {viewingOrder.urgency === '一般(7日)' ? '☑' : '□'}一般(7日)</div>
                        <div>3. {viewingOrder.urgency === '長期' ? '☑' : '□'}長期</div>
                      </td>
                    </tr>

                    {/* Section 二 */}
                    <tr>
                      <td rowSpan={7} className="border border-black w-10 text-center font-bold">二</td>
                      <td className="border border-black p-2 font-bold">需求單位(必填)</td>
                      <td className="border border-black p-2 text-center font-bold">{viewingOrder.request_dept}</td>
                      <td className="border border-black p-2">
                        開單人：<span className="underline font-bold mr-3">{viewingOrder.requester_name}</span>
                        電話：<span className="underline">{viewingOrder.requester_phone || '—'}</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 font-bold">預計委託單位(必填)</td>
                      <td colSpan={2} className="border border-black p-2 font-bold">{viewingOrder.target_dept}</td>
                    </tr>
                    <tr>
                      <td rowSpan={3} className="border border-black p-2">
                        <div className="font-bold mb-1">類別(必填)</div>
                        <div>{viewingOrder.category_type === '案場需求' ? '☑' : '□'} 案場需求</div>
                        <div>{viewingOrder.category_type === '工廠內部需求' ? '☑' : '□'} 工廠內部需求</div>
                        <div>{viewingOrder.category_type === '其他需求' ? '☑' : '□'} 其他需求</div>
                        <div className="text-xs text-slate-600">(非案場及公司區域)</div>
                      </td>
                      <td colSpan={2} className="border border-black p-2">
                        案場名稱：<span className="underline font-bold">{viewingOrder.category_type === '案場需求' ? (viewingOrder.site_name || project?.name) : ''}</span>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2} className="border border-black p-2">
                        廠區：
                        <span className="ml-2">{viewingOrder.category_type === '工廠內部需求' && viewingOrder.factory_area === '新市廠' ? '☑' : '□'}新市廠</span>
                        <span className="ml-3">{viewingOrder.category_type === '工廠內部需求' && viewingOrder.factory_area === '安南廠' ? '☑' : '□'}安南廠</span>
                        <span className="ml-3">{viewingOrder.category_type === '工廠內部需求' && viewingOrder.factory_area === '安定廠' ? '☑' : '□'}安定廠</span>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2} className="border border-black p-2">
                        位置：<span className="underline">{viewingOrder.category_type === '其他需求' ? viewingOrder.other_location : ''}</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 align-top">
                        <div className="font-bold mb-2">委託事項說明(必填)</div>
                        <div className="text-xs text-red-600 leading-relaxed">
                          1. 如需廠內加工，請一併提供圖面。(紙本及電子檔)<br />
                          2. 若無提供圖面，恕不受理派工單。
                        </div>
                      </td>
                      <td colSpan={2} className="border border-black p-3 align-top">
                        <div className="font-bold text-xs mb-2 text-slate-700">【生產製造加工需求明細（鋼構總表格式）】</div>
                        <table className="w-full border-collapse border border-black text-xs mb-2">
                          <thead>
                            <tr className="bg-slate-200">
                              <th className="border border-black p-1">項目</th>
                              <th className="border border-black p-1">構件編號</th>
                              <th className="border border-black p-1 text-right">數量</th>
                              <th className="border border-black p-1">規格尺寸</th>
                              <th className="border border-black p-1 text-right">長度</th>
                              <th className="border border-black p-1">材質</th>
                              <th className="border border-black p-1 text-right">單重(Kg)</th>
                              <th className="border border-black p-1 text-right">總量(Kgs)</th>
                              <th className="border border-black p-1">備註</th>
                            </tr>
                          </thead>
                          <tbody>
                            {viewItems.map((it, i) => (
                              <tr key={i}>
                                <td className="border border-black p-1 font-bold">{it.category}</td>
                                <td className="border border-black p-1 font-mono">{it.member_no}</td>
                                <td className="border border-black p-1 text-right font-bold">{it.quantity}</td>
                                <td className="border border-black p-1 font-mono">{it.spec}</td>
                                <td className="border border-black p-1 text-right font-mono">{it.length}</td>
                                <td className="border border-black p-1">{it.material}</td>
                                <td className="border border-black p-1 text-right font-mono">{it.unit_weight}</td>
                                <td className="border border-black p-1 text-right font-mono font-bold">{it.total_weight}</td>
                                <td className="border border-black p-1">{it.note}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-slate-100 font-bold">
                              <td className="border border-black p-1">總計</td>
                              <td className="border border-black p-1"></td>
                              <td className="border border-black p-1 text-right">{viewTotals.totalQty.toLocaleString()}</td>
                              <td colSpan={3} className="border border-black p-1"></td>
                              <td className="border border-black p-1 text-right font-mono">{viewTotals.totalUnitW.toLocaleString()}</td>
                              <td className="border border-black p-1 text-right font-mono">{viewTotals.totalWeight.toLocaleString()}</td>
                              <td className="border border-black p-1"></td>
                            </tr>
                          </tfoot>
                        </table>
                        {viewingOrder.description_note && (
                          <div className="text-xs mt-1 whitespace-pre-wrap">補充說明：{viewingOrder.description_note}</div>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2">
                        <div className="font-bold">需求時間(必填)</div>
                        <div className="text-[11px] text-red-600 leading-tight mt-1">
                          (PS. 如派工內容需先進行材料採購，請先確認材料下單後，預計可入廠日期，再進行需求日期填寫。謝謝。)
                        </div>
                      </td>
                      <td colSpan={2} className="border border-black p-2 text-center text-base font-bold">
                        {viewingOrder.required_date ? new Date(viewingOrder.required_date).toLocaleDateString('zh-TW') : ''}
                      </td>
                    </tr>

                    {/* Section 三 */}
                    <tr>
                      <td rowSpan={2} className="border border-black w-10 text-center font-bold">三</td>
                      <td className="border border-black p-2 font-bold h-14">需求單位主管簽核</td>
                      <td className="border border-black p-2 text-center text-lg font-bold">{viewingOrder.req_manager_sign}</td>
                      <td rowSpan={2} className="border border-black p-2 text-center align-middle">
                        <div className="inline-flex flex-col items-center justify-center w-28 h-28 rounded-full border-2 border-red-600 text-red-600 text-xs font-bold leading-tight">
                          <span>元融科技</span>
                          <span>{viewingOrder.target_dept || '鋼構部'}</span>
                          <span className="my-1 border-y border-red-500 px-1 py-0.5 text-[11px]">
                            {viewingOrder.drawing_received_date || '待收圖'}
                          </span>
                          <span className="text-sm">收圖章</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 font-bold h-16">簽核意見</td>
                      <td className="border border-black p-2">{viewingOrder.req_manager_comment}</td>
                    </tr>

                    {/* Section 四 */}
                    <tr>
                      <td rowSpan={4} className="border border-black w-10 text-center font-bold">四</td>
                      <td className="border border-black p-2 font-bold h-12">受託單位主管簽名</td>
                      <td className="border border-black p-2 text-center font-bold">{viewingOrder.target_manager_sign}</td>
                      <td className="border border-black p-2 font-bold">
                        簽核：{viewingOrder.approval_status === '同意' ? '☑' : '□'}同意 &nbsp;
                        {viewingOrder.approval_status === '退回' ? '☑' : '□'}退回
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 font-bold h-14">簽核意見</td>
                      <td colSpan={2} className="border border-black p-2">{viewingOrder.target_manager_comment}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 font-bold h-12">交辦人員簽名</td>
                      <td colSpan={2} className="border border-black p-2">{viewingOrder.assigned_staff_sign}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 font-bold h-14">備註</td>
                      <td className="border border-black p-2">{viewingOrder.remarks}</td>
                      <td className="border border-black p-2 text-center align-bottom text-xs">(簽收章)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default DispatchOrdersTab;
