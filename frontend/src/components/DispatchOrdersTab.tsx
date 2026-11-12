import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, FileText, Printer, X, Factory, Hash, Layers } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export interface DispatchOrderItem {
  category: string;
  description: string;
  drawing_no: string;
  spec: string;
  quantity: string;
}

const DEFAULT_DEMAND_CATEGORIES = [
  '鋼構加工',
  '風拉桿加工',
  '鍍鋅',
  '噴砂',
  '切割/鑽孔',
  '焊接組裝'
];

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

  const [items, setItems] = useState<DispatchOrderItem[]>([
    { category: '鋼構加工', description: '', drawing_no: '', spec: '', quantity: '' }
  ]);

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
    setItems([
      { category: '鋼構加工', description: '', drawing_no: '', spec: '', quantity: '' }
    ]);
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
      ? order.items
      : [{ category: '鋼構加工', description: '', drawing_no: '', spec: '', quantity: '' }];
    setItems(parsedItems);
    setIsModalOpen(true);
  };

  const handleAddCustomCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    if (!allDemandCategories.includes(trimmed)) {
      setCustomCategories(prev => [...prev, trimmed]);
    }
    setItems(prev => [
      ...prev,
      { category: trimmed, description: '', drawing_no: '', spec: '', quantity: '' }
    ]);
    setNewCategoryInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    const validItems = items.filter(
      it => it.description.trim() || it.drawing_no.trim() || it.spec.trim() || it.quantity.trim()
    );
    if (validItems.length === 0) {
      setSubmitError('請至少填寫一項「生產製造加工需求（說明 / 圖號 / 規格 / 需求數量）」');
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
            建立與管理專案生產派工委託單，派工單號與條列工項將直接連動至「製造報工」。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/manufacturing')}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-colors"
          >
            <Factory size={16} /> 前往製造報工
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center gap-1.5 shadow-sm transition-colors"
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
            const orderItems: DispatchOrderItem[] = Array.isArray(order.items) ? order.items : [];
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
                      className="px-3 py-1.5 bg-white border border-slate-300 hover:border-blue-400 hover:text-blue-600 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <FileText size={14} /> 檢視派工單
                    </button>
                    <button
                      onClick={() => handleOpenEdit(order)}
                      className="px-3 py-1.5 bg-white border border-slate-300 hover:border-teal-500 hover:text-teal-700 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <Edit2 size={14} /> 編輯
                    </button>
                    <button
                      onClick={() => handleDelete(order)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-colors"
                      title="刪除派工單"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Items Table */}
                {orderItems.length > 0 && (
                  <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                          <th className="py-2 px-3 w-12 text-center">項次</th>
                          <th className="py-2 px-3 w-32">需求種類</th>
                          <th className="py-2 px-3">說明 (生產製造加工需求)</th>
                          <th className="py-2 px-3 w-36">圖號</th>
                          <th className="py-2 px-3 w-40">規格</th>
                          <th className="py-2 px-3 w-28 text-right">需求數量</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {orderItems.map((it, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 text-center font-bold text-slate-500">{idx + 1}</td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-semibold">
                                {it.category || '一般加工'}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-medium text-slate-800">{it.description || '-'}</td>
                            <td className="py-2 px-3 text-slate-600 font-mono">{it.drawing_no || '-'}</td>
                            <td className="py-2 px-3 text-slate-600">{it.spec || '-'}</td>
                            <td className="py-2 px-3 text-right font-bold text-blue-700">{it.quantity || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
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

                {/* 委託事項說明(必填) — 生產製造加工需求 (條列式) */}
                <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
                  <div className="flex flex-wrap justify-between items-start gap-2">
                    <div>
                      <label className="block text-sm font-bold text-slate-800">
                        委託事項說明 (必填) — 生產製造加工需求 (條列式) *
                      </label>
                      <p className="text-xs text-red-600 mt-0.5">
                        1. 如需廠內加工，請一併提供圖面。(紙本及電子檔) &nbsp; 2. 若無提供圖面，恕不受理派工單。
                      </p>
                    </div>

                    {/* 新增其他種類的需求 */}
                    <div className="flex items-center gap-2">
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
                        placeholder="輸入其他需求種類 (如: 雷射切割)"
                        className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs outline-none w-52"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomCategory}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0"
                      >
                        <Layers size={13} /> + 新增其他種類需求
                      </button>
                    </div>
                  </div>

                  {/* 條列式表格 */}
                  <div className="space-y-2">
                    <div className="hidden md:grid md:grid-cols-12 gap-2 px-2 text-xs font-bold text-slate-600">
                      <div className="col-span-1 text-center">項次</div>
                      <div className="col-span-2">需求種類</div>
                      <div className="col-span-3">說明 (加工需求內容)</div>
                      <div className="col-span-2">圖號</div>
                      <div className="col-span-2">規格</div>
                      <div className="col-span-2">需求數量</div>
                    </div>

                    {items.map((item, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200"
                      >
                        <div className="md:col-span-1 text-center font-bold text-slate-500 text-sm">
                          #{idx + 1}
                        </div>

                        <div className="md:col-span-2">
                          <select
                            value={item.category}
                            onChange={e => {
                              const next = [...items];
                              next[idx].category = e.target.value;
                              setItems(next);
                            }}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-xs font-medium outline-none"
                          >
                            {allDemandCategories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>

                        <div className="md:col-span-3">
                          <input
                            type="text"
                            value={item.description}
                            onChange={e => {
                              const next = [...items];
                              next[idx].description = e.target.value;
                              setItems(next);
                            }}
                            placeholder="說明 (例: 鋼構風拉桿加工、柱底板噴砂)"
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs outline-none"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <input
                            type="text"
                            value={item.drawing_no}
                            onChange={e => {
                              const next = [...items];
                              next[idx].drawing_no = e.target.value;
                              setItems(next);
                            }}
                            placeholder="圖號 (例: S-01)"
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs font-mono outline-none"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <input
                            type="text"
                            value={item.spec}
                            onChange={e => {
                              const next = [...items];
                              next[idx].spec = e.target.value;
                              setItems(next);
                            }}
                            placeholder="規格 (例: 膜厚>=100um)"
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs outline-none"
                          />
                        </div>

                        <div className="md:col-span-2 flex items-center gap-1.5">
                          <input
                            type="text"
                            value={item.quantity}
                            onChange={e => {
                              const next = [...items];
                              next[idx].quantity = e.target.value;
                              setItems(next);
                            }}
                            placeholder="數量 (例: 20支 / 1式)"
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs outline-none"
                          />
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setItems(items.filter((_, i) => i !== idx))}
                              className="p-1.5 text-red-500 hover:bg-red-100 rounded shrink-0"
                              title="刪除此列"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setItems([
                          ...items,
                          {
                            category: allDemandCategories[0] || '鋼構加工',
                            description: '',
                            drawing_no: '',
                            spec: '',
                            quantity: ''
                          }
                        ])
                      }
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Plus size={14} /> + 新增一列生產製造加工需求
                    </button>
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

      {/* Modal: 檢視 / 列印「元融公司 內部派工委託單」(依據 台中大益停車場派工單.pdf 格式) */}
      {viewingOrder && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden">
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
                      <div className="font-bold text-xs mb-2 text-slate-700">【生產製造加工需求明細】</div>
                      <table className="w-full border-collapse border border-black text-xs mb-2">
                        <thead>
                          <tr className="bg-slate-100">
                            <th className="border border-black p-1 text-center w-10">項次</th>
                            <th className="border border-black p-1">需求種類</th>
                            <th className="border border-black p-1">說明</th>
                            <th className="border border-black p-1">圖號</th>
                            <th className="border border-black p-1">規格</th>
                            <th className="border border-black p-1 text-right">需求數量</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(Array.isArray(viewingOrder.items) ? viewingOrder.items : []).map((it: DispatchOrderItem, i: number) => (
                            <tr key={i}>
                              <td className="border border-black p-1 text-center">{i + 1}</td>
                              <td className="border border-black p-1 font-bold">{it.category}</td>
                              <td className="border border-black p-1">{it.description}</td>
                              <td className="border border-black p-1 font-mono">{it.drawing_no}</td>
                              <td className="border border-black p-1">{it.spec}</td>
                              <td className="border border-black p-1 text-right font-bold">{it.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
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
      )}
    </div>
  );
};

export default DispatchOrdersTab;
