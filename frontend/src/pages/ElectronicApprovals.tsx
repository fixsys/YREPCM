import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import {
  Stamp,
  FileText,
  GitMerge,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Printer,
  X,
  ArrowUp,
  ArrowDown,
  Clock,
  FileSignature,
  Layers,
  Check,
  Search,
} from 'lucide-react';

// ==========================================
// 通用電子印章渲染元件 (支援圓形收圖章、方形印鑑、長方職章、橢圓專用章)
// ==========================================
export interface StampRenderProps {
  shape?: string; // CIRCLE | SQUARE | RECTANGLE | OVAL
  color?: string;
  top_text?: string;
  middle_text?: string;
  bottom_text?: string;
  show_date?: boolean;
  show_signer?: boolean;
  border_style?: string; // DOUBLE | SINGLE
  stamp_date?: string;
  signer_name?: string;
  fallbackDept?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ElectronicStampPreview: React.FC<StampRenderProps> = ({
  shape = 'CIRCLE',
  color = '#DC2626',
  top_text = '元融科技',
  middle_text = '自動帶入部門',
  bottom_text = '收圖章',
  show_date = true,
  show_signer = false,
  border_style = 'DOUBLE',
  stamp_date,
  signer_name,
  fallbackDept = '受託單位',
  size = 'md',
}) => {
  const displayDate = stamp_date || new Date().toISOString().slice(0, 10);
  const displayMiddle =
    !middle_text || middle_text === '自動帶入部門' ? fallbackDept : middle_text;
  const displaySigner = signer_name || '主管';
  const isDouble = border_style !== 'SINGLE';

  const scaleClass =
    size === 'sm' ? 'scale-75 origin-center' : size === 'lg' ? 'scale-110 origin-center' : '';

  if (shape === 'SQUARE') {
    return (
      <div
        className={`inline-flex items-center justify-center w-28 h-28 bg-white/90 select-none ${scaleClass}`}
        style={{
          border: `3.5px solid ${color}`,
          color,
          boxShadow: isDouble ? `inset 0 0 0 2px #fff, inset 0 0 0 3.5px ${color}` : undefined,
          fontFamily: "'DFKai-SB', '標楷體', 'Microsoft JhengHei', serif",
        }}
      >
        <div className="flex flex-col items-center justify-between w-full h-full p-2 text-center leading-tight font-extrabold">
          <span className="text-xs tracking-widest">{top_text}</span>
          <span className="text-sm tracking-wider">{displayMiddle}</span>
          {show_date && (
            <span
              className="w-full py-0.5 text-[10px] font-mono"
              style={{ borderTop: `1.5px solid ${color}`, borderBottom: `1.5px solid ${color}` }}
            >
              {displayDate}
            </span>
          )}
          <span className="text-sm tracking-widest">
            {bottom_text}
            {show_signer ? `・${displaySigner}` : ''}
          </span>
        </div>
      </div>
    );
  }

  if (shape === 'RECTANGLE') {
    return (
      <div
        className={`inline-flex flex-col items-center justify-between w-36 h-24 rounded-md bg-white/90 p-1.5 select-none ${scaleClass}`}
        style={{
          border: `3px solid ${color}`,
          color,
          boxShadow: isDouble ? `inset 0 0 0 1.5px #fff, inset 0 0 0 2.8px ${color}` : undefined,
          fontFamily: "'DFKai-SB', '標楷體', 'Microsoft JhengHei', serif",
        }}
      >
        <div className="text-xs font-extrabold tracking-wider">
          {top_text}｜{displayMiddle}
        </div>
        {show_date && (
          <div
            className="w-full text-center py-0.5 text-[11px] font-mono font-bold"
            style={{ borderTop: `1.5px solid ${color}`, borderBottom: `1.5px solid ${color}` }}
          >
            {displayDate}
          </div>
        )}
        <div className="text-sm font-black tracking-widest">
          {bottom_text}
          {show_signer ? ` (${displaySigner})` : ''}
        </div>
      </div>
    );
  }

  if (shape === 'OVAL') {
    return (
      <div
        className={`inline-flex flex-col items-center justify-center w-36 h-24 rounded-[50%] bg-white/90 px-3 py-1.5 text-center leading-tight font-extrabold select-none ${scaleClass}`}
        style={{
          border: `3.5px solid ${color}`,
          color,
          boxShadow: isDouble ? `inset 0 0 0 2px #fff, inset 0 0 0 3.2px ${color}` : undefined,
          fontFamily: "'DFKai-SB', '標楷體', 'Microsoft JhengHei', serif",
        }}
      >
        <span className="text-[11px] tracking-widest">{top_text}</span>
        <span className="text-xs">{displayMiddle}</span>
        {show_date && (
          <span
            className="my-0.5 px-2 py-0.2 text-[10px] font-mono"
            style={{ borderTop: `1.5px solid ${color}`, borderBottom: `1.5px solid ${color}` }}
          >
            {displayDate}
          </span>
        )}
        <span className="text-xs tracking-wider">
          {bottom_text}
          {show_signer ? ` ${displaySigner}` : ''}
        </span>
      </div>
    );
  }

  // Default: CIRCLE (經典派工單圓形收圖章)
  return (
    <div
      className={`inline-flex flex-col items-center justify-center w-28 h-28 rounded-full bg-white/90 text-center leading-tight font-extrabold select-none ${scaleClass}`}
      style={{
        border: `3.5px solid ${color}`,
        color,
        boxShadow: isDouble ? `inset 0 0 0 2px #fff, inset 0 0 0 3.2px ${color}` : undefined,
        fontFamily: "'DFKai-SB', '標楷體', 'Microsoft JhengHei', serif",
      }}
    >
      <span className="text-xs tracking-widest">{top_text}</span>
      <span className="text-xs font-bold">{displayMiddle}</span>
      {show_date && (
        <span
          className="my-1 px-1.5 py-0.5 text-[10px] font-mono"
          style={{ borderTop: `1.5px solid ${color}`, borderBottom: `1.5px solid ${color}` }}
        >
          {displayDate}
        </span>
      )}
      <span className="text-sm tracking-widest">{bottom_text}</span>
      {show_signer && <span className="text-[10px] -mt-0.5">{displaySigner}</span>}
    </div>
  );
};

// ==========================================
// 電子簽核主頁面
// ==========================================
const ElectronicApprovals: React.FC = () => {
  const { token, user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'REQUESTS' | 'TEMPLATES' | 'STAMPS'>('REQUESTS');
  const [requestFilter, setRequestFilter] = useState<'PENDING_ME' | 'MY_SUBMITTED' | 'ALL'>('ALL');
  const [docTypeFilter, setDocTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [stamps, setStamps] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. 發起簽核申請 Modal State
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [applyTitle, setApplyTitle] = useState('');
  const [applyUrgency, setApplyUrgency] = useState('一般');
  const [applyProjectId, setApplyProjectId] = useState('');
  const [applyFormData, setApplyFormData] = useState<Record<string, any>>({});
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // 2. 檢視 / 簽核與蓋章 Modal State
  const [viewingRequest, setViewingRequest] = useState<any | null>(null);
  const [signStampId, setSignStampId] = useState<string>('');
  const [signStampDate, setSignStampDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [signCustomName, setSignCustomName] = useState<string>(user?.name || '');
  const [signComment, setSignComment] = useState<string>('');
  const [isSigning, setIsSigning] = useState(false);

  // 3. 表單 / 簽呈 / 報表 + 簽核流程設計器 Modal State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [tplForm, setTplForm] = useState({
    name: '',
    doc_type: '簽呈',
    code_prefix: 'AP',
    description: '',
    default_stamp_id: '',
    fields: [] as any[],
    workflow_steps: [] as any[],
  });

  // 4. 電子印章設計器 Modal State
  const [isStampModalOpen, setIsStampModalOpen] = useState(false);
  const [editingStamp, setEditingStamp] = useState<any | null>(null);
  const [stampForm, setStampForm] = useState({
    name: '',
    shape: 'CIRCLE',
    color: '#DC2626',
    top_text: '元融科技',
    middle_text: '自動帶入部門',
    bottom_text: '收圖章',
    show_date: true,
    show_signer: false,
    border_style: 'DOUBLE',
    department: '',
  });

  const allDepartments = useMemo(() => {
    const defaults = ['鋼構部', '工務部', '設計部', '業務部', '採購部', '機電部', '管理部'];
    return Array.from(new Set([...departments, ...defaults].filter(Boolean)));
  }, [departments]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [stampsRes, tplsRes, reqsRes, deptsRes, projsRes, usersRes] = await Promise.all([
        axios.get('/api/approvals/stamps', { headers }),
        axios.get('/api/approvals/templates', { headers }),
        axios.get('/api/approvals/requests', { headers }),
        axios.get('/api/settings/departments', { headers }).catch(() => ({ data: [] })),
        axios.get('/api/projects', { headers }).catch(() => ({ data: [] })),
        axios.get('/api/users', { headers }).catch(() => ({ data: [] })),
      ]);

      setStamps(stampsRes.data || []);
      setTemplates(tplsRes.data || []);
      setRequests(reqsRes.data || []);
      if (Array.isArray(deptsRes.data)) {
        setDepartments(deptsRes.data.map((d: any) => d?.name).filter(Boolean));
      }
      setProjects(projsRes.data || []);
      setUsers(usersRes.data || []);
    } catch (err) {
      console.error('Failed to fetch e-approval data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchAllData();
  }, [token]);

  // 當選擇範本發起申請時，初始化表單欄位預設值
  const activeApplyTemplate = useMemo(
    () => templates.find(t => t.id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  );

  const handleOpenApplyModal = (tpl?: any) => {
    const targetTpl = tpl || templates[0];
    if (!targetTpl) {
      alert('請先建立至少一個表單/簽呈/報表範本');
      return;
    }
    setSelectedTemplateId(targetTpl.id);
    setApplyTitle('');
    setApplyUrgency('一般');
    setApplyProjectId('');
    const initData: Record<string, any> = {};
    (targetTpl.fields || []).forEach((f: any) => {
      if (f.type === 'table') {
        const emptyRow: Record<string, string> = {};
        (f.tableColumns || ['項目', '說明']).forEach((col: string) => {
          emptyRow[col] = '';
        });
        initData[f.id] = [emptyRow];
      } else if (f.type === 'checkbox') {
        initData[f.id] = false;
      } else if (f.type === 'select' && Array.isArray(f.options) && f.options.length > 0) {
        initData[f.id] = f.options[0];
      } else {
        initData[f.id] = '';
      }
    });
    setApplyFormData(initData);
    setIsApplyModalOpen(true);
  };

  const handleSwitchApplyTemplate = (tplId: string) => {
    setSelectedTemplateId(tplId);
    const targetTpl = templates.find(t => t.id === tplId);
    if (!targetTpl) return;
    const initData: Record<string, any> = {};
    (targetTpl.fields || []).forEach((f: any) => {
      if (f.type === 'table') {
        const emptyRow: Record<string, string> = {};
        (f.tableColumns || ['項目', '說明']).forEach((col: string) => {
          emptyRow[col] = '';
        });
        initData[f.id] = [emptyRow];
      } else if (f.type === 'checkbox') {
        initData[f.id] = false;
      } else if (f.type === 'select' && Array.isArray(f.options) && f.options.length > 0) {
        initData[f.id] = f.options[0];
      } else {
        initData[f.id] = '';
      }
    });
    setApplyFormData(initData);
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeApplyTemplate) return;
    if (!applyTitle.trim()) {
      alert('請填寫主旨 / 單據標題');
      return;
    }

    // 驗證必填欄位
    for (const f of activeApplyTemplate.fields || []) {
      if (f.required) {
        const val = applyFormData[f.id];
        if (f.type === 'table') {
          if (!Array.isArray(val) || val.length === 0) {
            alert(`請填寫必填明細表：「${f.label}」`);
            return;
          }
        } else if (f.type === 'checkbox') {
          if (!val) {
            alert(`請勾選必填確認項：「${f.label}」`);
            return;
          }
        } else if (!val || String(val).trim() === '') {
          alert(`請填寫必填欄位：「${f.label}」`);
          return;
        }
      }
    }

    setIsSubmittingRequest(true);
    try {
      await axios.post(
        '/api/approvals/requests',
        {
          template_id: activeApplyTemplate.id,
          title: applyTitle.trim(),
          urgency: applyUrgency,
          project_id: applyProjectId || null,
          form_data: applyFormData,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsApplyModalOpen(false);
      await fetchAllData();
    } catch (err: any) {
      alert(err.response?.data?.error || '送出簽核單據失敗');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // 開啟單據檢視與簽核視窗
  const handleOpenViewRequest = (reqItem: any) => {
    setViewingRequest(reqItem);
    const steps: any[] = Array.isArray(reqItem.workflow_steps) ? reqItem.workflow_steps : [];
    const activeStep = steps.find(s => Number(s.step_order) === Number(reqItem.current_step));
    const defaultStamp =
      activeStep?.stamp_id || reqItem.template?.default_stamp_id || stamps[0]?.id || '';
    setSignStampId(defaultStamp);
    setSignStampDate(new Date().toISOString().slice(0, 10));
    setSignCustomName(user?.name || '');
    setSignComment('');
  };

  const handleExecuteSign = async (action: 'APPROVE' | 'REJECT') => {
    if (!viewingRequest) return;
    if (action === 'REJECT' && !signComment.trim()) {
      alert('退回單據時，請填寫簽核退回意見與原因');
      return;
    }

    setIsSigning(true);
    try {
      const res = await axios.post(
        `/api/approvals/requests/${viewingRequest.id}/action`,
        {
          action,
          comment: signComment.trim() || (action === 'APPROVE' ? '同意核准' : '退回修正'),
          stamp_id: signStampId,
          stamp_date: signStampDate,
          custom_signer_name: signCustomName.trim() || user?.name,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setViewingRequest(res.data);
      await fetchAllData();
    } catch (err: any) {
      alert(err.response?.data?.error || '簽核操作失敗');
    } finally {
      setIsSigning(false);
    }
  };

  const handleDeleteRequest = async (reqItem: any) => {
    if (!window.confirm(`確定要刪除簽核單據「${reqItem.request_no} ${reqItem.title}」嗎？`)) return;
    try {
      await axios.delete(`/api/approvals/requests/${reqItem.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (viewingRequest?.id === reqItem.id) setViewingRequest(null);
      await fetchAllData();
    } catch (err: any) {
      alert(err.response?.data?.error || '刪除失敗');
    }
  };

  // ==========================================
  // 表單範本與簽核流程設計器 Handlers
  // ==========================================
  const handleOpenCreateTemplate = () => {
    setEditingTemplate(null);
    setTplForm({
      name: '',
      doc_type: '簽呈',
      code_prefix: 'AP',
      description: '',
      default_stamp_id: stamps[0]?.id || '',
      fields: [
        {
          id: `field_${Date.now()}_1`,
          label: '申請說明 / 內容',
          type: 'textarea',
          required: true,
          width: 'full',
          placeholder: '請輸入詳細內容...',
          options: [],
          tableColumns: ['項目', '規格', '數量', '備註'],
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
          stamp_id: stamps[0]?.id || '',
          require_stamp: true,
        },
      ],
    });
    setIsTemplateModalOpen(true);
  };

  const handleOpenEditTemplate = (tpl: any) => {
    setEditingTemplate(tpl);
    setTplForm({
      name: tpl.name || '',
      doc_type: tpl.doc_type || '簽呈',
      code_prefix: tpl.code_prefix || 'AP',
      description: tpl.description || '',
      default_stamp_id: tpl.default_stamp_id || stamps[0]?.id || '',
      fields: Array.isArray(tpl.fields) ? JSON.parse(JSON.stringify(tpl.fields)) : [],
      workflow_steps: Array.isArray(tpl.workflow_steps)
        ? JSON.parse(JSON.stringify(tpl.workflow_steps))
        : [],
    });
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplForm.name.trim()) {
      alert('請輸入表單 / 簽呈 / 報表名稱');
      return;
    }
    if (tplForm.fields.length === 0) {
      alert('請至少設計一個表單欄位');
      return;
    }
    if (tplForm.workflow_steps.length === 0) {
      alert('請至少設定一個簽核流程關卡');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      if (editingTemplate) {
        await axios.put(`/api/approvals/templates/${editingTemplate.id}`, tplForm, { headers });
      } else {
        await axios.post('/api/approvals/templates', tplForm, { headers });
      }
      setIsTemplateModalOpen(false);
      await fetchAllData();
    } catch (err: any) {
      alert(err.response?.data?.error || '儲存表單範本失敗');
    }
  };

  const handleDeleteTemplate = async (tpl: any) => {
    if (
      !window.confirm(
        `確定要刪除範本「${tpl.name}」嗎？此操作也會清除該範本下的歷史單據。`
      )
    )
      return;
    try {
      await axios.delete(`/api/approvals/templates/${tpl.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchAllData();
    } catch (err: any) {
      alert(err.response?.data?.error || '刪除範本失敗');
    }
  };

  // ==========================================
  // 電子印章設計器 Handlers
  // ==========================================
  const handleOpenCreateStamp = () => {
    setEditingStamp(null);
    setStampForm({
      name: '',
      shape: 'CIRCLE',
      color: '#DC2626',
      top_text: '元融科技',
      middle_text: '自動帶入部門',
      bottom_text: '收圖章',
      show_date: true,
      show_signer: false,
      border_style: 'DOUBLE',
      department: '',
    });
    setIsStampModalOpen(true);
  };

  const handleOpenEditStamp = (st: any) => {
    setEditingStamp(st);
    setStampForm({
      name: st.name || '',
      shape: st.shape || 'CIRCLE',
      color: st.color || '#DC2626',
      top_text: st.top_text ?? '元融科技',
      middle_text: st.middle_text ?? '自動帶入部門',
      bottom_text: st.bottom_text ?? '收圖章',
      show_date: st.show_date !== undefined ? Boolean(st.show_date) : true,
      show_signer: st.show_signer !== undefined ? Boolean(st.show_signer) : false,
      border_style: st.border_style || 'DOUBLE',
      department: st.department || '',
    });
    setIsStampModalOpen(true);
  };

  const handleSaveStamp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stampForm.name.trim()) {
      alert('請輸入印章名稱');
      return;
    }
    try {
      const headers = { Authorization: `Bearer ${token}` };
      if (editingStamp) {
        await axios.put(`/api/approvals/stamps/${editingStamp.id}`, stampForm, { headers });
      } else {
        await axios.post('/api/approvals/stamps', stampForm, { headers });
      }
      setIsStampModalOpen(false);
      await fetchAllData();
    } catch (err: any) {
      alert(err.response?.data?.error || '儲存電子印章失敗');
    }
  };

  const handleDeleteStamp = async (st: any) => {
    if (!window.confirm(`確定要刪除印章「${st.name}」嗎？`)) return;
    try {
      await axios.delete(`/api/approvals/stamps/${st.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchAllData();
    } catch (err: any) {
      alert(err.response?.data?.error || '刪除印章失敗');
    }
  };

  const pendingForMeCount = useMemo(
    () => requests.filter(r => r.isPendingForMe).length,
    [requests]
  );

  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      if (requestFilter === 'PENDING_ME' && !r.isPendingForMe) return false;
      if (requestFilter === 'MY_SUBMITTED' && r.applicant_id !== user?.id) return false;
      if (docTypeFilter !== 'ALL' && r.doc_type !== docTypeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchNo = (r.request_no || '').toLowerCase().includes(q);
        const matchTitle = (r.title || '').toLowerCase().includes(q);
        const matchApp = (r.applicant_name || '').toLowerCase().includes(q);
        const matchDept = (r.applicant_dept || '').toLowerCase().includes(q);
        if (!matchNo && !matchTitle && !matchApp && !matchDept) return false;
      }
      return true;
    });
  }, [requests, requestFilter, docTypeFilter, searchQuery, user?.id]);

  return (
    <div className="space-y-6 pb-12">
      {/* 頂部標題與三大模組切換 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-br from-rose-600 to-indigo-700 rounded-xl text-white shadow-md">
              <FileSignature size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">電子簽核中心</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                自訂報表 / 簽呈 / 表單設計、多關卡簽核流程引擎、以及客製化電子收圖章 / 核決印章
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('REQUESTS')}
              className={`px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'REQUESTS'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText size={15} />
              <span>簽核單據中心</span>
              {pendingForMeCount > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-600 text-white rounded-full text-[11px]">
                  {pendingForMeCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('TEMPLATES')}
              className={`px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'TEMPLATES'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GitMerge size={15} />
              <span>1 & 2. 表單與簽核流程設計 ({templates.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('STAMPS')}
              className={`px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'STAMPS'
                  ? 'bg-white text-rose-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Stamp size={15} />
              <span>3. 簽核用印章設計 ({stamps.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleOpenApplyModal()}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Plus size={16} /> 發起簽呈 / 報表 / 表單
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* TAB 1: 簽核單據中心 (申請、待簽核、歷史查閱) */}
      {/* ========================================== */}
      {activeTab === 'REQUESTS' && (
        <div className="space-y-4">
          {/* 快速發起範本卡片列 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {templates.map(tpl => (
              <div
                key={tpl.id}
                onClick={() => handleOpenApplyModal(tpl)}
                className="bg-white hover:bg-indigo-50/30 border border-slate-200 hover:border-indigo-300 rounded-xl p-4 shadow-xs transition-all cursor-pointer flex items-start justify-between gap-3 group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 text-[11px] font-extrabold rounded ${
                        tpl.doc_type === '簽呈'
                          ? 'bg-purple-100 text-purple-700'
                          : tpl.doc_type === '報表'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {tpl.doc_type}
                    </span>
                    <h3 className="text-sm font-bold text-slate-800 group-hover:text-indigo-700">
                      {tpl.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1">
                    {tpl.description || '點擊快速填寫並送出簽核流程'}
                  </p>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1 pt-0.5">
                    <span>簽核流程：</span>
                    {(tpl.workflow_steps || []).map((s: any, idx: number, arr: any[]) => (
                      <React.Fragment key={idx}>
                        <span className="font-bold text-slate-600">{s.step_name}</span>
                        {idx < arr.length - 1 && <span>➔</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white rounded-lg text-xs font-bold shrink-0 transition-colors">
                  + 填寫
                </span>
              </div>
            ))}
          </div>

          {/* 篩選與搜尋列 */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setRequestFilter('ALL')}
                  className={`px-3 py-1.5 rounded-md cursor-pointer ${
                    requestFilter === 'ALL'
                      ? 'bg-white text-slate-800 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  全部單據 ({requests.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRequestFilter('PENDING_ME')}
                  className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 cursor-pointer ${
                    requestFilter === 'PENDING_ME'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-rose-600'
                  }`}
                >
                  <span>待我簽核蓋章</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      requestFilter === 'PENDING_ME'
                        ? 'bg-white text-rose-600'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {pendingForMeCount}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setRequestFilter('MY_SUBMITTED')}
                  className={`px-3 py-1.5 rounded-md cursor-pointer ${
                    requestFilter === 'MY_SUBMITTED'
                      ? 'bg-white text-slate-800 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  我發起的 ({requests.filter(r => r.applicant_id === user?.id).length})
                </button>
              </div>

              <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-bold">
                {['ALL', '簽呈', '報表', '表單'].map(dt => (
                  <button
                    key={dt}
                    type="button"
                    onClick={() => setDocTypeFilter(dt)}
                    className={`px-2.5 py-1.5 rounded-md cursor-pointer ${
                      docTypeFilter === dt
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {dt === 'ALL' ? '全部類型' : dt}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative w-full sm:w-64">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜尋單號、主旨、申請人..."
                className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* 簽核單據列表 */}
          {loading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              載入簽核單據中...
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
              <FileSignature size={44} className="mx-auto text-slate-300" />
              <p className="text-slate-600 font-bold">目前沒有符合條件的電子簽核單據</p>
              <button
                type="button"
                onClick={() => handleOpenApplyModal()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                + 立即發起第一筆簽呈 / 報表 / 表單
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map(reqItem => {
                const steps: any[] = Array.isArray(reqItem.workflow_steps)
                  ? reqItem.workflow_steps
                  : [];
                const records: any[] = Array.isArray(reqItem.approval_records)
                  ? reqItem.approval_records
                  : [];

                return (
                  <div
                    key={reqItem.id}
                    className={`bg-white rounded-xl border p-4 transition-all ${
                      reqItem.isPendingForMe
                        ? 'border-rose-300 ring-1 ring-rose-200 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-extrabold text-xs bg-slate-800 text-white px-2.5 py-0.5 rounded">
                            {reqItem.request_no}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-xs font-bold rounded ${
                              reqItem.doc_type === '簽呈'
                                ? 'bg-purple-100 text-purple-700'
                                : reqItem.doc_type === '報表'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {reqItem.doc_type}｜{reqItem.template?.name || ''}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-xs font-bold rounded border ${
                              reqItem.urgency === '最速件'
                                ? 'bg-red-50 text-red-600 border-red-200'
                                : reqItem.urgency === '速件'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            {reqItem.urgency}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 text-xs font-extrabold rounded-full ${
                              reqItem.status === '已核准'
                                ? 'bg-emerald-100 text-emerald-700'
                                : reqItem.status === '已退回'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {reqItem.status}
                            {reqItem.status !== '已核准' &&
                              reqItem.status !== '已退回' &&
                              reqItem.activeStepName &&
                              `（第 ${reqItem.current_step} 關：${reqItem.activeStepName}）`}
                          </span>
                          {reqItem.isPendingForMe && (
                            <span className="px-2.5 py-0.5 text-xs font-extrabold bg-rose-600 text-white rounded-full animate-pulse">
                              💮 待您簽核用印
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-extrabold text-slate-800">
                          {reqItem.title}
                        </h3>

                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span>
                            <strong>申請部門 / 人員：</strong>
                            {reqItem.applicant_dept} — {reqItem.applicant_name}
                          </span>
                          <span>
                            <strong>申請時間：</strong>
                            {new Date(reqItem.created_at).toLocaleString('zh-TW')}
                          </span>
                        </div>

                        {/* 簽核流程進度條 */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {steps.map((s: any, idx: number) => {
                            const rec = records.find(
                              r => Number(r.step_order) === Number(s.step_order)
                            );
                            const isCurrent =
                              (reqItem.status === '待簽核' || reqItem.status === '簽核中') &&
                              Number(reqItem.current_step) === Number(s.step_order);

                            return (
                              <React.Fragment key={idx}>
                                <div
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${
                                    rec?.action === '同意'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : rec?.action === '退回'
                                      ? 'bg-red-50 text-red-700 border-red-200'
                                      : isCurrent
                                      ? 'bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-200'
                                      : 'bg-slate-50 text-slate-400 border-slate-200'
                                  }`}
                                >
                                  <span>
                                    {s.step_order}. {s.step_name}
                                  </span>
                                  {rec && (
                                    <span className="text-[11px]">
                                      ({rec.signer_name} {rec.action}
                                      {rec.stamp_snapshot ? ' 💮' : ''})
                                    </span>
                                  )}
                                  {isCurrent && !rec && (
                                    <span className="text-[11px] font-extrabold">⏳ 簽核中</span>
                                  )}
                                </div>
                                {idx < steps.length - 1 && (
                                  <span className="text-slate-300 font-bold">➔</span>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {reqItem.isPendingForMe ? (
                          <button
                            type="button"
                            onClick={() => handleOpenViewRequest(reqItem)}
                            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <Stamp size={15} /> 立即簽核與蓋章
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenViewRequest(reqItem)}
                            className="px-3.5 py-2 bg-white border border-slate-300 hover:border-indigo-500 hover:text-indigo-600 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <FileText size={14} /> 檢視公文與印章
                          </button>
                        )}
                        {(reqItem.applicant_id === user?.id ||
                          (user?.level && user.level >= 100)) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteRequest(reqItem)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                            title="刪除單據"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 2: 1. 設計報表/簽呈/表單 & 2. 設計簽核流程 */}
      {/* ========================================== */}
      {activeTab === 'TEMPLATES' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">
                1. 報表 / 簽呈 / 表單設計 & 2. 簽核流程設計
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                自由設計各類簽呈、工程報表與申請表單的欄位結構（支援動態明細表格），並為每份表單配置多關卡簽核流程與指定簽核印章。
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenCreateTemplate}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus size={16} /> 新增表單 / 簽呈 / 報表範本
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {templates.map(tpl => {
              const fields: any[] = Array.isArray(tpl.fields) ? tpl.fields : [];
              const steps: any[] = Array.isArray(tpl.workflow_steps) ? tpl.workflow_steps : [];

              return (
                <div
                  key={tpl.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 text-xs font-extrabold rounded ${
                              tpl.doc_type === '簽呈'
                                ? 'bg-purple-100 text-purple-700'
                                : tpl.doc_type === '報表'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {tpl.doc_type}
                          </span>
                          <span className="font-mono text-xs text-slate-400">
                            前綴：{tpl.code_prefix}-YYYYMMDD-001
                          </span>
                        </div>
                        <h3 className="text-base font-extrabold text-slate-800 mt-1">
                          {tpl.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">{tpl.description}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditTemplate(tpl)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 size={13} /> 設計表單與流程
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(tpl)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* 表單欄位預覽 */}
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/80 space-y-1.5">
                      <div className="text-[11px] font-bold text-slate-500">
                        表單欄位結構（共 {fields.length} 個欄位）：
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {fields.map((f: any, i: number) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-white border border-slate-200 rounded text-xs font-medium text-slate-700"
                          >
                            {f.label}
                            {f.required && <span className="text-red-500 ml-0.5">*</span>}
                            <span className="text-[10px] text-slate-400 ml-1">({f.type})</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* 簽核流程預覽 */}
                    <div className="bg-indigo-50/50 rounded-lg p-3 border border-indigo-100 space-y-1.5">
                      <div className="text-[11px] font-bold text-indigo-800">
                        簽核流程關卡（共 {steps.length} 關）：
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {steps.map((s: any, i: number) => {
                          const stObj = stamps.find(st => st.id === s.stamp_id);
                          return (
                            <React.Fragment key={i}>
                              <div className="bg-white border border-indigo-200 rounded-lg px-2.5 py-1 text-xs">
                                <div className="font-bold text-slate-800">
                                  第 {i + 1} 關：{s.step_name}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {s.approver_type === 'APPLICANT_MANAGER'
                                    ? '申請人部門主管'
                                    : s.approver_type === 'DEPARTMENT_MANAGER'
                                    ? `指定部門主管 (${s.target_dept || '未指定'})`
                                    : s.approver_type === 'SPECIFIC_USER'
                                    ? '指定特定人員'
                                    : `職級 Level >= ${s.target_role_level || 100}`}
                                  {stObj ? ` ｜ 💮 ${stObj.bottom_text}` : ''}
                                </div>
                              </div>
                              {i < steps.length - 1 && (
                                <span className="text-indigo-400 font-bold">➔</span>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleOpenApplyModal(tpl)}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      使用此範本發起簽核
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 3: 3. 設計簽核用印章 (類似派工單的收圖章) */}
      {/* ========================================== */}
      {activeTab === 'STAMPS' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">
                3. 簽核用電子印章設計庫（收圖章 / 主管審核章 / 核決章 / 驗收章）
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                客製化設計圓形雙圈收圖章（同派工單收圖章格式）、方形官章、長方職章與橢圓專用章。支援自動帶入簽核部門、簽核日期橫帶與簽核人姓名。
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenCreateStamp}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus size={16} /> 設計新簽核印章
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stamps.map(st => (
              <div
                key={st.id}
                className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col items-center justify-between text-center space-y-4 shadow-xs hover:border-rose-300 transition-all"
              >
                <div className="w-full flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-800 truncate">{st.name}</span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold shrink-0">
                    {st.shape === 'CIRCLE'
                      ? '圓形章'
                      : st.shape === 'SQUARE'
                      ? '方形章'
                      : st.shape === 'RECTANGLE'
                      ? '長方章'
                      : '橢圓章'}
                  </span>
                </div>

                <div className="py-3 flex items-center justify-center min-h-[132px]">
                  <ElectronicStampPreview
                    shape={st.shape}
                    color={st.color}
                    top_text={st.top_text}
                    middle_text={st.middle_text}
                    bottom_text={st.bottom_text}
                    show_date={st.show_date}
                    show_signer={st.show_signer}
                    border_style={st.border_style}
                    fallbackDept={st.department || user?.department || '鋼構部'}
                    signer_name={user?.name || '主管'}
                  />
                </div>

                <div className="w-full text-[11px] text-slate-500 space-y-0.5 bg-slate-50 p-2 rounded-lg">
                  <div>
                    中排顯示：
                    <strong className="text-slate-700">{st.middle_text || '自動帶入部門'}</strong>
                  </div>
                  <div>
                    日期橫帶：{st.show_date ? '✅ 自動壓印日期' : '不顯示'} ｜ 簽核人：
                    {st.show_signer ? '✅ 顯示' : '不顯示'}
                  </div>
                </div>

                <div className="w-full flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEditStamp(st)}
                    className="flex-1 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Edit2 size={13} /> 編輯印章
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteStamp(st)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                    title="刪除印章"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 1: 發起簽呈 / 報表 / 表單申請 */}
      {/* ========================================== */}
      {isApplyModalOpen && activeApplyTemplate && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <FileSignature size={20} className="text-indigo-400" />
                <div>
                  <h3 className="text-base font-bold">
                    發起電子簽核 — {activeApplyTemplate.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    申請人：{user?.department} / {user?.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsApplyModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleApplySubmit}
              className="p-6 overflow-y-auto flex-1 space-y-5"
            >
              {/* 選擇表單範本 & 基本主旨 */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="md:col-span-4">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    選擇表單 / 簽呈 / 報表範本 *
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={e => handleSwitchApplyTemplate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold bg-white outline-none"
                  >
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>
                        【{t.doc_type}】{t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-5">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    主旨 / 單據標題 *
                  </label>
                  <input
                    type="text"
                    required
                    value={applyTitle}
                    onChange={e => setApplyTitle(e.target.value)}
                    placeholder={`請輸入${activeApplyTemplate.doc_type}主旨...`}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    速別
                  </label>
                  <select
                    value={applyUrgency}
                    onChange={e => setApplyUrgency(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold bg-white outline-none"
                  >
                    <option value="一般">一般</option>
                    <option value="速件">速件</option>
                    <option value="最速件">最速件</option>
                  </select>
                </div>
              </div>

              {/* 動態渲染該範本設計的欄位 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(activeApplyTemplate.fields || []).map((field: any) => {
                  const isFull = field.width === 'full' || field.type === 'table' || field.type === 'textarea';
                  const val = applyFormData[field.id];

                  return (
                    <div
                      key={field.id}
                      className={isFull ? 'md:col-span-2' : 'md:col-span-1'}
                    >
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>

                      {field.type === 'textarea' ? (
                        <textarea
                          rows={3}
                          required={field.required}
                          value={val || ''}
                          onChange={e =>
                            setApplyFormData({ ...applyFormData, [field.id]: e.target.value })
                          }
                          placeholder={field.placeholder || ''}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      ) : field.type === 'select' ? (
                        <select
                          value={val || ''}
                          onChange={e =>
                            setApplyFormData({ ...applyFormData, [field.id]: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none"
                        >
                          {(field.options || []).map((opt: string) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : field.type === 'project' ? (
                        <select
                          value={val || ''}
                          onChange={e => {
                            const pName = e.target.value;
                            const matchedP = projects.find(
                              p => `${p.project_code} - ${p.name}` === pName
                            );
                            if (matchedP) setApplyProjectId(matchedP.id);
                            setApplyFormData({ ...applyFormData, [field.id]: pName });
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none"
                        >
                          <option value="">-- 請選擇專案 --</option>
                          {projects.map(p => (
                            <option key={p.id} value={`${p.project_code} - ${p.name}`}>
                              {p.project_code} - {p.name}
                            </option>
                          ))}
                        </select>
                      ) : field.type === 'department' ? (
                        <select
                          value={val || ''}
                          onChange={e =>
                            setApplyFormData({ ...applyFormData, [field.id]: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none"
                        >
                          <option value="">-- 請選擇部門 --</option>
                          {allDepartments.map(d => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      ) : field.type === 'checkbox' ? (
                        <label className="flex items-center gap-2 text-sm text-slate-700 py-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(val)}
                            onChange={e =>
                              setApplyFormData({
                                ...applyFormData,
                                [field.id]: e.target.checked,
                              })
                            }
                            className="w-4 h-4"
                          />
                          <span>{field.placeholder || '確認已核對無誤'}</span>
                        </label>
                      ) : field.type === 'table' ? (
                        <div className="border border-slate-300 rounded-xl overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse">
                              <thead>
                                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                                  <th className="py-2 px-2 w-10 text-center">#</th>
                                  {(field.tableColumns || ['項目', '說明']).map(
                                    (col: string) => (
                                      <th key={col} className="py-2 px-2 text-left">
                                        {col}
                                      </th>
                                    )
                                  )}
                                  <th className="py-2 px-2 w-10"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {(Array.isArray(val) ? val : []).map(
                                  (rowObj: any, rIdx: number) => (
                                    <tr key={rIdx} className="border-b border-slate-200">
                                      <td className="p-1.5 text-center font-mono text-slate-400">
                                        {rIdx + 1}
                                      </td>
                                      {(field.tableColumns || ['項目', '說明']).map(
                                        (col: string) => (
                                          <td key={col} className="p-1.5">
                                            <input
                                              type="text"
                                              value={rowObj[col] || ''}
                                              onChange={e => {
                                                const nextRows = [...(val || [])];
                                                nextRows[rIdx] = {
                                                  ...nextRows[rIdx],
                                                  [col]: e.target.value,
                                                };
                                                setApplyFormData({
                                                  ...applyFormData,
                                                  [field.id]: nextRows,
                                                });
                                              }}
                                              className="w-full px-2 py-1 border border-slate-200 rounded text-xs outline-none focus:border-indigo-500"
                                            />
                                          </td>
                                        )
                                      )}
                                      <td className="p-1.5 text-center">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const nextRows =
                                              (val || []).length > 1
                                                ? val.filter((_: any, i: number) => i !== rIdx)
                                                : val;
                                            setApplyFormData({
                                              ...applyFormData,
                                              [field.id]: nextRows,
                                            });
                                          }}
                                          className="text-red-500 hover:bg-red-50 p-1 rounded cursor-pointer"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </td>
                                    </tr>
                                  )
                                )}
                              </tbody>
                            </table>
                          </div>
                          <div className="bg-slate-50 px-3 py-2 border-t border-slate-200">
                            <button
                              type="button"
                              onClick={() => {
                                const emptyRow: Record<string, string> = {};
                                (field.tableColumns || ['項目', '說明']).forEach(
                                  (col: string) => {
                                    emptyRow[col] = '';
                                  }
                                );
                                setApplyFormData({
                                  ...applyFormData,
                                  [field.id]: [...(Array.isArray(val) ? val : []), emptyRow],
                                });
                              }}
                              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                            >
                              <Plus size={14} /> 新增一列明細
                            </button>
                          </div>
                        </div>
                      ) : (
                        <input
                          type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                          required={field.required}
                          value={val || ''}
                          onChange={e =>
                            setApplyFormData({ ...applyFormData, [field.id]: e.target.value })
                          }
                          placeholder={field.placeholder || ''}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 簽核流程預覽 */}
              <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-4 space-y-2">
                <div className="text-xs font-extrabold text-indigo-900">
                  送出後將依序進入以下簽核與蓋章流程：
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {(activeApplyTemplate.workflow_steps || []).map(
                    (s: any, idx: number, arr: any[]) => (
                      <React.Fragment key={idx}>
                        <div className="bg-white border border-indigo-200 rounded-lg px-3 py-1.5 text-xs">
                          <span className="font-bold text-indigo-900">
                            第 {idx + 1} 關：{s.step_name}
                          </span>
                        </div>
                        {idx < arr.length - 1 && (
                          <span className="text-indigo-400 font-bold">➔</span>
                        )}
                      </React.Fragment>
                    )
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-bold cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRequest}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingRequest ? '送出簽核中...' : '確認送出簽核'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 2: 正式公文/報表檢視、列印與主管簽核用印視窗 */}
      {/* ========================================== */}
      {viewingRequest && (() => {
        const tplFields: any[] = Array.isArray(viewingRequest.template?.fields)
          ? viewingRequest.template.fields
          : [];
        const steps: any[] = Array.isArray(viewingRequest.workflow_steps)
          ? viewingRequest.workflow_steps
          : [];
        const records: any[] = Array.isArray(viewingRequest.approval_records)
          ? viewingRequest.approval_records
          : [];
        const fData = viewingRequest.form_data || {};
        const selectedStampObj = stamps.find(s => s.id === signStampId) || stamps[0];

        return (
          <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs z-[110] flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden">
              {/* Top Toolbar */}
              <div className="px-6 py-3 bg-slate-800 text-white flex items-center justify-between print:hidden shrink-0">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-bold text-sm bg-slate-700 px-2.5 py-0.5 rounded">
                    {viewingRequest.request_no}
                  </span>
                  <span className="font-bold text-sm">{viewingRequest.title}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer size={15} /> 列印 / 另存 PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingRequest(null)}
                    className="text-slate-300 hover:text-white cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-8 overflow-y-auto flex-1 space-y-6 bg-white text-black">
                {/* 正式公文 / 簽呈 / 報表 表格區塊 */}
                <div
                  style={{
                    fontFamily: "'DFKai-SB', '標楷體', 'Microsoft JhengHei', serif",
                  }}
                >
                  <div className="flex justify-between items-end mb-1 text-xs">
                    <div className="font-bold text-sm">
                      單據編號：
                      <span className="font-mono underline">{viewingRequest.request_no}</span>
                    </div>
                    <div>
                      狀態：<strong>{viewingRequest.status}</strong>
                    </div>
                  </div>

                  <table className="w-full border-collapse border-2 border-black text-sm">
                    <tbody>
                      <tr>
                        <td
                          colSpan={4}
                          className="border border-black py-3 text-center text-2xl font-bold tracking-widest bg-slate-50"
                        >
                          元融集團 — {viewingRequest.template?.name || viewingRequest.doc_type}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-black p-2 font-bold w-28 bg-slate-50">
                          申請部門
                        </td>
                        <td className="border border-black p-2 font-bold">
                          {viewingRequest.applicant_dept}
                        </td>
                        <td className="border border-black p-2 font-bold w-28 bg-slate-50">
                          申請人
                        </td>
                        <td className="border border-black p-2 font-bold">
                          {viewingRequest.applicant_name}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-black p-2 font-bold bg-slate-50">
                          申請日期
                        </td>
                        <td className="border border-black p-2">
                          {new Date(viewingRequest.created_at).toLocaleDateString('zh-TW')}
                        </td>
                        <td className="border border-black p-2 font-bold bg-slate-50">
                          速別 / 類型
                        </td>
                        <td className="border border-black p-2 font-bold">
                          {viewingRequest.urgency} ｜ {viewingRequest.doc_type}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-black p-2 font-bold bg-slate-50">
                          主旨
                        </td>
                        <td colSpan={3} className="border border-black p-2.5 text-base font-bold">
                          {viewingRequest.title}
                        </td>
                      </tr>

                      {/* 動態欄位內容 */}
                      {tplFields.map((f: any) => {
                        const val = fData[f.id];
                        return (
                          <tr key={f.id}>
                            <td className="border border-black p-2 font-bold bg-slate-50 align-top">
                              {f.label}
                            </td>
                            <td colSpan={3} className="border border-black p-2.5 whitespace-pre-wrap">
                              {f.type === 'table' && Array.isArray(val) ? (
                                <table className="w-full border-collapse border border-black text-xs">
                                  <thead>
                                    <tr className="bg-slate-100">
                                      <th className="border border-black p-1 w-8">#</th>
                                      {(f.tableColumns || ['項目', '說明']).map((c: string) => (
                                        <th key={c} className="border border-black p-1 text-left">
                                          {c}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {val.map((rowObj: any, rIdx: number) => (
                                      <tr key={rIdx}>
                                        <td className="border border-black p-1 text-center">
                                          {rIdx + 1}
                                        </td>
                                        {(f.tableColumns || ['項目', '說明']).map((c: string) => (
                                          <td key={c} className="border border-black p-1">
                                            {rowObj[c] || ''}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : f.type === 'checkbox' ? (
                                val ? '☑ 已確認' : '□ 未勾選'
                              ) : (
                                String(val ?? '—')
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {/* 簽核流程與電子印章蓋章區 */}
                      <tr>
                        <td
                          colSpan={4}
                          className="border border-black bg-slate-100 py-1.5 px-2 font-bold text-center"
                        >
                          簽核流程與電子用印紀錄
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={4} className="border border-black p-0">
                          <div
                            className="grid divide-x divide-black"
                            style={{
                              gridTemplateColumns: `repeat(${Math.max(1, steps.length)}, minmax(0, 1fr))`,
                            }}
                          >
                            {steps.map((s: any, idx: number) => {
                              const rec = records.find(
                                r => Number(r.step_order) === Number(s.step_order)
                              );
                              const snap = rec?.stamp_snapshot;

                              return (
                                <div key={idx} className="p-3 flex flex-col justify-between min-h-[210px]">
                                  <div className="border-b border-slate-300 pb-1.5 mb-2 text-center">
                                    <div className="font-bold text-sm">
                                      第 {s.step_order} 關：{s.step_name}
                                    </div>
                                    <div className="text-xs text-slate-600">
                                      {rec
                                        ? `${rec.signer_dept} / ${rec.signer_name} (${rec.action})`
                                        : '待簽核'}
                                    </div>
                                  </div>

                                  {/* 印章顯示區 */}
                                  <div className="flex-1 flex items-center justify-center py-2">
                                    {snap ? (
                                      <ElectronicStampPreview
                                        shape={snap.shape}
                                        color={snap.color}
                                        top_text={snap.top_text}
                                        middle_text={snap.middle_text}
                                        bottom_text={snap.bottom_text}
                                        show_date={snap.show_date}
                                        show_signer={snap.show_signer}
                                        border_style={snap.border_style}
                                        stamp_date={snap.stamp_date}
                                        signer_name={snap.signer_name}
                                      />
                                    ) : rec ? (
                                      <div className="text-center font-bold text-base">
                                        {rec.signer_name} ({rec.action})
                                      </div>
                                    ) : (
                                      <div className="inline-flex flex-col items-center justify-center w-24 h-24 rounded-full border-2 border-dashed border-slate-300 text-slate-400 text-xs font-bold">
                                        <span>待簽核</span>
                                        <span>(未用印)</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* 簽核意見與時間 */}
                                  <div className="border-t border-slate-200 pt-1.5 text-xs space-y-0.5">
                                    <div>
                                      <strong>意見：</strong>
                                      {rec?.comment || '—'}
                                    </div>
                                    {rec?.signed_at && (
                                      <div className="text-[11px] text-slate-500">
                                        時間：{new Date(rec.signed_at).toLocaleString('zh-TW')}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 若目前輪到登入者簽核，顯示互動式簽核與蓋章面板 (列印時隱藏) */}
                {viewingRequest.isPendingForMe && (
                  <div className="print:hidden bg-rose-50/70 border-2 border-rose-300 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-rose-200 pb-3">
                      <div className="flex items-center gap-2 text-rose-800 font-extrabold">
                        <Stamp size={20} />
                        <span>
                          目前輪到您簽核：第 {viewingRequest.current_step} 關【
                          {viewingRequest.activeStepName}】
                        </span>
                      </div>
                      <span className="text-xs font-bold text-rose-600 bg-white px-2.5 py-1 rounded-full border border-rose-200">
                        請選擇印章並完成簽核
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                      <div className="md:col-span-7 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              簽核人姓名 *
                            </label>
                            <input
                              type="text"
                              value={signCustomName}
                              onChange={e => setSignCustomName(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold bg-white outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              選擇要蓋下的電子印章 *
                            </label>
                            <select
                              value={signStampId}
                              onChange={e => setSignStampId(e.target.value)}
                              className="w-full px-3 py-2 border border-rose-300 rounded-lg text-sm font-bold bg-white outline-none"
                            >
                              {stamps.map(st => (
                                <option key={st.id} value={st.id}>
                                  💮 {st.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              印章壓印日期
                            </label>
                            <input
                              type="date"
                              value={signStampDate}
                              onChange={e => setSignStampDate(e.target.value)}
                              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white font-mono outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              簽核意見
                            </label>
                            <input
                              type="text"
                              value={signComment}
                              onChange={e => setSignComment(e.target.value)}
                              placeholder="例：同意核准 / 已收圖確認..."
                              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-2">
                          <button
                            type="button"
                            disabled={isSigning}
                            onClick={() => handleExecuteSign('APPROVE')}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                          >
                            <CheckCircle2 size={16} />
                            {isSigning ? '簽核蓋章中...' : '確認蓋章並同意核准'}
                          </button>
                          <button
                            type="button"
                            disabled={isSigning}
                            onClick={() => handleExecuteSign('REJECT')}
                            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                          >
                            <XCircle size={16} /> 退回單據
                          </button>
                        </div>
                      </div>

                      {/* 右側印章即時預覽 */}
                      <div className="md:col-span-5 bg-white border border-rose-200 rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-2">
                        <span className="text-xs font-bold text-rose-800">
                          即將蓋下之電子印章預覽
                        </span>
                        {selectedStampObj && (
                          <ElectronicStampPreview
                            shape={selectedStampObj.shape}
                            color={selectedStampObj.color}
                            top_text={selectedStampObj.top_text}
                            middle_text={selectedStampObj.middle_text}
                            bottom_text={selectedStampObj.bottom_text}
                            show_date={selectedStampObj.show_date}
                            show_signer={selectedStampObj.show_signer}
                            border_style={selectedStampObj.border_style}
                            stamp_date={signStampDate}
                            signer_name={signCustomName || user?.name}
                            fallbackDept={user?.department || '受託單位'}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================== */}
      {/* MODAL 3: 1. 報表/簽呈/表單 & 2. 簽核流程設計器 */}
      {/* ========================================== */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-[110] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Layers size={20} className="text-indigo-400" />
                <h3 className="text-base font-bold">
                  {editingTemplate
                    ? `編輯表單與簽核流程 — ${editingTemplate.name}`
                    : '新增表單 / 簽呈 / 報表與簽核流程'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSaveTemplate}
              className="p-6 overflow-y-auto flex-1 space-y-6"
            >
              {/* 第一部分：表單基本資料 */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                <div className="text-sm font-extrabold text-slate-800 border-b border-slate-200 pb-2">
                  一、單據基本設定（簽呈 / 報表 / 表單）
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      單據範本名稱 *
                    </label>
                    <input
                      type="text"
                      required
                      value={tplForm.name}
                      onChange={e => setTplForm({ ...tplForm, name: e.target.value })}
                      placeholder="例：內部公文簽呈 / 工程驗收報表 / 採購申請單"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold bg-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      單據類型 *
                    </label>
                    <select
                      value={tplForm.doc_type}
                      onChange={e => setTplForm({ ...tplForm, doc_type: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold bg-white outline-none"
                    >
                      <option value="簽呈">簽呈</option>
                      <option value="報表">報表</option>
                      <option value="表單">表單</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      單號前綴 (英文) *
                    </label>
                    <input
                      type="text"
                      required
                      value={tplForm.code_prefix}
                      onChange={e =>
                        setTplForm({ ...tplForm, code_prefix: e.target.value.toUpperCase() })
                      }
                      placeholder="例：AP / RPT / FRM"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono font-bold bg-white outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    用途說明
                  </label>
                  <input
                    type="text"
                    value={tplForm.description}
                    onChange={e => setTplForm({ ...tplForm, description: e.target.value })}
                    placeholder="簡述此表單適用情境..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none"
                  />
                </div>
              </div>

              {/* 第二部分：表單欄位設計器 */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="text-sm font-extrabold text-slate-800">
                    二、設計表單欄位結構（支援文字、日期、下拉、專案/部門選單、動態明細表格）
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setTplForm({
                        ...tplForm,
                        fields: [
                          ...tplForm.fields,
                          {
                            id: `field_${Date.now()}_${tplForm.fields.length + 1}`,
                            label: '新欄位名稱',
                            type: 'text',
                            required: false,
                            width: 'half',
                            placeholder: '',
                            options: ['選項1', '選項2'],
                            tableColumns: ['項目', '規格', '數量', '備註'],
                          },
                        ],
                      })
                    }
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={14} /> 新增欄位
                  </button>
                </div>

                <div className="space-y-3">
                  {tplForm.fields.map((field: any, idx: number) => (
                    <div
                      key={field.id || idx}
                      className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5 shadow-2xs"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                        <div className="md:col-span-3">
                          <label className="block text-[11px] font-bold text-slate-500 mb-0.5">
                            欄位名稱 ({idx + 1})
                          </label>
                          <input
                            type="text"
                            value={field.label}
                            onChange={e => {
                              const next = [...tplForm.fields];
                              next[idx] = { ...next[idx], label: e.target.value };
                              setTplForm({ ...tplForm, fields: next });
                            }}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold"
                          />
                        </div>

                        <div className="md:col-span-3">
                          <label className="block text-[11px] font-bold text-slate-500 mb-0.5">
                            欄位型態
                          </label>
                          <select
                            value={field.type}
                            onChange={e => {
                              const next = [...tplForm.fields];
                              next[idx] = { ...next[idx], type: e.target.value };
                              setTplForm({ ...tplForm, fields: next });
                            }}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold bg-white"
                          >
                            <option value="text">單行文字</option>
                            <option value="textarea">多行說明 (簽呈內文)</option>
                            <option value="number">數值 / 金額</option>
                            <option value="date">日期選擇</option>
                            <option value="select">下拉選單</option>
                            <option value="project">系統專案選單</option>
                            <option value="department">系統部門選單</option>
                            <option value="checkbox">勾選確認框</option>
                            <option value="table">動態明細表格 (多列)</option>
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-500 mb-0.5">
                            排版寬度
                          </label>
                          <select
                            value={field.width || 'half'}
                            onChange={e => {
                              const next = [...tplForm.fields];
                              next[idx] = { ...next[idx], width: e.target.value };
                              setTplForm({ ...tplForm, fields: next });
                            }}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                          >
                            <option value="half">半列並排 (50%)</option>
                            <option value="full">整列寬度 (100%)</option>
                          </select>
                        </div>

                        <div className="md:col-span-2 pt-4">
                          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(field.required)}
                              onChange={e => {
                                const next = [...tplForm.fields];
                                next[idx] = { ...next[idx], required: e.target.checked };
                                setTplForm({ ...tplForm, fields: next });
                              }}
                            />
                            <span>必填欄位</span>
                          </label>
                        </div>

                        <div className="md:col-span-2 flex items-center justify-end gap-1 pt-3">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => {
                              const next = [...tplForm.fields];
                              [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                              setTplForm({ ...tplForm, fields: next });
                            }}
                            className="p-1.5 text-slate-500 hover:bg-slate-100 rounded disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            disabled={idx === tplForm.fields.length - 1}
                            onClick={() => {
                              const next = [...tplForm.fields];
                              [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                              setTplForm({ ...tplForm, fields: next });
                            }}
                            className="p-1.5 text-slate-500 hover:bg-slate-100 rounded disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const next = tplForm.fields.filter((_, i) => i !== idx);
                              setTplForm({ ...tplForm, fields: next });
                            }}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {field.type === 'select' && (
                        <div>
                          <label className="block text-[11px] font-bold text-indigo-700 mb-0.5">
                            下拉選單選項（請以逗號 , 分隔）：
                          </label>
                          <input
                            type="text"
                            value={(field.options || []).join(',')}
                            onChange={e => {
                              const next = [...tplForm.fields];
                              next[idx] = {
                                ...next[idx],
                                options: e.target.value
                                  .split(',')
                                  .map(s => s.trim())
                                  .filter(Boolean),
                              };
                              setTplForm({ ...tplForm, fields: next });
                            }}
                            placeholder="例：工程簽呈,採購簽呈,人事簽呈"
                            className="w-full px-2.5 py-1 border border-indigo-200 rounded text-xs"
                          />
                        </div>
                      )}

                      {field.type === 'table' && (
                        <div>
                          <label className="block text-[11px] font-bold text-indigo-700 mb-0.5">
                            動態明細表欄位標題（請以逗號 , 分隔）：
                          </label>
                          <input
                            type="text"
                            value={(field.tableColumns || []).join(',')}
                            onChange={e => {
                              const next = [...tplForm.fields];
                              next[idx] = {
                                ...next[idx],
                                tableColumns: e.target.value
                                  .split(',')
                                  .map(s => s.trim())
                                  .filter(Boolean),
                              };
                              setTplForm({ ...tplForm, fields: next });
                            }}
                            placeholder="例：項目名稱,規格尺寸,數量,單位,單價,金額,備註"
                            className="w-full px-2.5 py-1 border border-indigo-200 rounded text-xs"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 第三部分：多關卡簽核流程設計器 */}
              <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-indigo-200 pb-2">
                  <div>
                    <div className="text-sm font-extrabold text-indigo-950">
                      三、設計簽核流程關卡與指定用印章
                    </div>
                    <p className="text-xs text-indigo-700">
                      設定單據送出後的簽核順序、每一關的簽核對象（部門主管 / 指定人員 / 最高管理層）與蓋章規定。
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setTplForm({
                        ...tplForm,
                        workflow_steps: [
                          ...tplForm.workflow_steps,
                          {
                            step_order: tplForm.workflow_steps.length + 1,
                            step_name: `第 ${tplForm.workflow_steps.length + 1} 關審核`,
                            approver_type: 'DEPARTMENT_MANAGER',
                            target_dept: allDepartments[0] || '鋼構部',
                            target_user_id: '',
                            target_role_level: 50,
                            stamp_id: stamps[0]?.id || '',
                            require_stamp: true,
                          },
                        ],
                      })
                    }
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={14} /> 新增簽核關卡
                  </button>
                </div>

                <div className="space-y-3">
                  {tplForm.workflow_steps.map((step: any, sIdx: number) => (
                    <div
                      key={sIdx}
                      className="bg-white border border-indigo-200 rounded-xl p-3.5 grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
                    >
                      <div className="md:col-span-1 flex items-center justify-center">
                        <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-extrabold flex items-center justify-center">
                          {sIdx + 1}
                        </span>
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-[11px] font-bold text-slate-500 mb-0.5">
                          關卡名稱 *
                        </label>
                        <input
                          type="text"
                          value={step.step_name}
                          onChange={e => {
                            const next = [...tplForm.workflow_steps];
                            next[sIdx] = { ...next[sIdx], step_name: e.target.value };
                            setTplForm({ ...tplForm, workflow_steps: next });
                          }}
                          placeholder="例：受託單位主管收圖蓋章"
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold"
                        />
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-[11px] font-bold text-slate-500 mb-0.5">
                          簽核對象規則 *
                        </label>
                        <select
                          value={step.approver_type}
                          onChange={e => {
                            const next = [...tplForm.workflow_steps];
                            next[sIdx] = { ...next[sIdx], approver_type: e.target.value };
                            setTplForm({ ...tplForm, workflow_steps: next });
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold bg-white"
                        >
                          <option value="APPLICANT_MANAGER">申請人所屬部門主管</option>
                          <option value="DEPARTMENT_MANAGER">指定部門主管 (如受託單位)</option>
                          <option value="SPECIFIC_USER">指定特定人員</option>
                          <option value="ROLE_LEVEL">依權限職級 (如總經理 Level 100)</option>
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        {step.approver_type === 'DEPARTMENT_MANAGER' ? (
                          <>
                            <label className="block text-[11px] font-bold text-slate-500 mb-0.5">
                              指定簽核部門
                            </label>
                            <select
                              value={step.target_dept || ''}
                              onChange={e => {
                                const next = [...tplForm.workflow_steps];
                                next[sIdx] = { ...next[sIdx], target_dept: e.target.value };
                                setTplForm({ ...tplForm, workflow_steps: next });
                              }}
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold bg-white"
                            >
                              {allDepartments.map(d => (
                                <option key={d} value={d}>
                                  {d}
                                </option>
                              ))}
                            </select>
                          </>
                        ) : step.approver_type === 'SPECIFIC_USER' ? (
                          <>
                            <label className="block text-[11px] font-bold text-slate-500 mb-0.5">
                              指定簽核人員
                            </label>
                            <select
                              value={step.target_user_id || ''}
                              onChange={e => {
                                const next = [...tplForm.workflow_steps];
                                next[sIdx] = { ...next[sIdx], target_user_id: e.target.value };
                                setTplForm({ ...tplForm, workflow_steps: next });
                              }}
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold bg-white"
                            >
                              <option value="">-- 請選擇人員 --</option>
                              {users.map(u => (
                                <option key={u.id} value={u.id}>
                                  {u.name} ({u.department?.name || ''})
                                </option>
                              ))}
                            </select>
                          </>
                        ) : step.approver_type === 'ROLE_LEVEL' ? (
                          <>
                            <label className="block text-[11px] font-bold text-slate-500 mb-0.5">
                              最低簽核職級
                            </label>
                            <select
                              value={step.target_role_level || 100}
                              onChange={e => {
                                const next = [...tplForm.workflow_steps];
                                next[sIdx] = {
                                  ...next[sIdx],
                                  target_role_level: Number(e.target.value),
                                };
                                setTplForm({ ...tplForm, workflow_steps: next });
                              }}
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold bg-white"
                            >
                              <option value={50}>Level &gt;= 50 (部門主管)</option>
                              <option value={100}>Level &gt;= 100 (總經理/最高管理層)</option>
                            </select>
                          </>
                        ) : (
                          <div className="text-xs text-slate-400 pt-3">
                            自動依申請人部門路由
                          </div>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold text-rose-700 mb-0.5">
                          此關預設簽核印章
                        </label>
                        <select
                          value={step.stamp_id || ''}
                          onChange={e => {
                            const next = [...tplForm.workflow_steps];
                            next[sIdx] = { ...next[sIdx], stamp_id: e.target.value };
                            setTplForm({ ...tplForm, workflow_steps: next });
                          }}
                          className="w-full px-2.5 py-1.5 border border-rose-200 rounded-lg text-xs font-bold bg-white"
                        >
                          {stamps.map(st => (
                            <option key={st.id} value={st.id}>
                              💮 {st.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-1 flex items-center justify-end gap-1 pt-3">
                        <button
                          type="button"
                          onClick={() => {
                            const next = tplForm.workflow_steps.filter((_, i) => i !== sIdx);
                            setTplForm({ ...tplForm, workflow_steps: next });
                          }}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-bold cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm cursor-pointer"
                >
                  儲存表單與簽核流程
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 4: 3. 簽核用電子印章設計器 (類似派工單收圖章) */}
      {/* ========================================== */}
      {isStampModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-[110] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-rose-600 to-rose-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Stamp size={20} />
                <h3 className="text-base font-bold">
                  {editingStamp ? `編輯簽核用印章 — ${editingStamp.name}` : '設計新簽核用電子印章'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsStampModalOpen(false)}
                className="text-rose-100 hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveStamp} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* 左側：印章參數設定 */}
                <div className="md:col-span-7 space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      印章識別名稱 *
                    </label>
                    <input
                      type="text"
                      required
                      value={stampForm.name}
                      onChange={e => setStampForm({ ...stampForm, name: e.target.value })}
                      placeholder="例：鋼構部收圖章 / 部門主管審核章"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        印章外型 *
                      </label>
                      <select
                        value={stampForm.shape}
                        onChange={e => setStampForm({ ...stampForm, shape: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold bg-white"
                      >
                        <option value="CIRCLE">圓形章 (派工單收圖章格式)</option>
                        <option value="SQUARE">方形印鑑章 (核決官章)</option>
                        <option value="RECTANGLE">長方形職章 (驗收章)</option>
                        <option value="OVAL">橢圓形專用章</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        外框樣式
                      </label>
                      <select
                        value={stampForm.border_style}
                        onChange={e =>
                          setStampForm({ ...stampForm, border_style: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold bg-white"
                      >
                        <option value="DOUBLE">雙圈立體框</option>
                        <option value="SINGLE">單圈標準框</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      印泥顏色
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {[
                        { hex: '#DC2626', label: '硃砂紅' },
                        { hex: '#991B1B', label: '深緋紅' },
                        { hex: '#1D4ED8', label: '公文藍' },
                        { hex: '#15803D', label: '合格綠' },
                        { hex: '#6D28D9', label: '紫羅蘭' },
                      ].map(c => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => setStampForm({ ...stampForm, color: c.hex })}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 cursor-pointer ${
                            stampForm.color === c.hex
                              ? 'border-slate-800 bg-slate-100'
                              : 'border-slate-200 bg-white'
                          }`}
                        >
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: c.hex }}
                          />
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        上排文字 (公司)
                      </label>
                      <input
                        type="text"
                        value={stampForm.top_text}
                        onChange={e => setStampForm({ ...stampForm, top_text: e.target.value })}
                        placeholder="元融科技"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        中排文字 (部門)
                      </label>
                      <input
                        type="text"
                        value={stampForm.middle_text}
                        onChange={e =>
                          setStampForm({ ...stampForm, middle_text: e.target.value })
                        }
                        placeholder="自動帶入部門 或 鋼構部"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        下排印章字樣
                      </label>
                      <input
                        type="text"
                        value={stampForm.bottom_text}
                        onChange={e =>
                          setStampForm({ ...stampForm, bottom_text: e.target.value })
                        }
                        placeholder="收圖章 / 審核章"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 pt-1">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={stampForm.show_date}
                        onChange={e =>
                          setStampForm({ ...stampForm, show_date: e.target.checked })
                        }
                      />
                      <span>中央顯示簽核日期橫帶</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={stampForm.show_signer}
                        onChange={e =>
                          setStampForm({ ...stampForm, show_signer: e.target.checked })
                        }
                      />
                      <span>印章內嵌入簽核人姓名</span>
                    </label>
                  </div>
                </div>

                {/* 右側：印章即時預覽區 */}
                <div className="md:col-span-5 bg-rose-50/50 border-2 border-rose-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="text-xs font-extrabold text-rose-800">
                    電子印章即時預覽
                  </div>
                  <div className="py-4">
                    <ElectronicStampPreview
                      shape={stampForm.shape}
                      color={stampForm.color}
                      top_text={stampForm.top_text}
                      middle_text={stampForm.middle_text}
                      bottom_text={stampForm.bottom_text}
                      show_date={stampForm.show_date}
                      show_signer={stampForm.show_signer}
                      border_style={stampForm.border_style}
                      fallbackDept={user?.department || '鋼構部'}
                      signer_name={user?.name || '王主管'}
                      size="lg"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    若中排文字填寫「<strong>自動帶入部門</strong>」，蓋章時將自動壓印該關卡簽核主管之所屬部門名稱。
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsStampModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-bold cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-bold shadow-sm cursor-pointer"
                >
                  儲存電子印章
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ElectronicApprovals;
