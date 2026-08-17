import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, User, Phone, Building2, Calendar, FileText, Send, Clock, PlusCircle, CheckCircle2, Edit2, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import RequirementForm from './RequirementForm';

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState<any>(null);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [showInteractionAdd, setShowInteractionAdd] = useState(false);
  const [showRequirementAdd, setShowRequirementAdd] = useState(false);
  const [showRequirementEdit, setShowRequirementEdit] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  const [editFormData, setEditFormData] = useState({ name: '', company: '', site_name: '', phone: '', source: '', referrer_name: '' });
  
  const [interactionData, setInteractionData] = useState({
    action_type: 'C',
    summary: '',
    result: '',
    next_contact_date: ''
  });

  const [reqData, setReqData] = useState<any>({});

  const fetchLead = async () => {
    try {
      const res = await axios.get(`/api/leads/${id}`, {
        headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('auth-storage') || '{}').state?.token}` }
      });
      setLead(res.data);
      setEditFormData({
        name: res.data.name || '',
        company: res.data.company || '',
        site_name: res.data.site_name || '',
        phone: res.data.phone || '',
        source: res.data.source || 'SELF',
        referrer_name: res.data.referrer_name || ''
      });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLead();
  }, [id]);

  const handleAddInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`/api/leads/${id}/interactions`, interactionData, {
        headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('auth-storage') || '{}').state?.token}` }
      });
      setShowInteractionAdd(false);
      setInteractionData({ action_type: 'C', summary: '', result: '', next_contact_date: '' });
      fetchLead();
    } catch (err: any) {
      alert(err.response?.data?.error || '新增失敗');
    }
  };

  const handleCreateRequirement = async (data: any) => {
    try {
      await axios.post(`/api/leads/${id}/requirements`, data, {
        headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('auth-storage') || '{}').state?.token}` }
      });
      setShowRequirementAdd(false);
      fetchLead();
    } catch (err: any) {
      alert(err.response?.data?.error || '建立失敗');
    }
  };

  const handleEditRequirement = async (data: any) => {
    try {
      await axios.put(`/api/leads/${id}/requirements`, data, {
        headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('auth-storage') || '{}').state?.token}` }
      });
      setShowRequirementEdit(false);
      fetchLead();
    } catch (err: any) {
      alert(err.response?.data?.error || '儲存失敗');
    }
  };

  const handleConvertToProject = async () => {
    if (!confirm('確定要將此客戶需求單拋轉至專案管理模組嗎？')) return;

    setIsConverting(true);
    try {
      const res = await axios.post(`/api/leads/${id}/convert-to-project`, {}, {
        headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('auth-storage') || '{}').state?.token}` }
      });
      alert(`已成功拋轉至專案管理！請通知專案人員接取並建立代碼。`);
      fetchLead();
      // Optionally navigate to project detail:
      // navigate(`/projects/${res.data.id}`);
    } catch (err: any) {
      alert(err.response?.data?.error || '轉拋專案失敗，可能是專案代碼已重複');
    } finally {
      setIsConverting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('確定要刪除此潛在客戶嗎？這會同時刪除所有的互動紀錄與需求單！')) return;
    try {
      await axios.delete(`/api/leads/${id}`, {
        headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('auth-storage') || '{}').state?.token}` }
      });
      navigate('/crm/leads');
    } catch (err: any) {
      alert(err.response?.data?.error || '刪除失敗');
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.put(`/api/leads/${id}`, editFormData, {
        headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('auth-storage') || '{}').state?.token}` }
      });
      setShowEdit(false);
      fetchLead();
    } catch (err: any) {
      alert(err.response?.data?.error || '修改失敗');
    }
  };

  if (!lead) return <div className="p-8 text-center text-slate-500">載入中...</div>;

  const userStr = localStorage.getItem('auth-storage');
  const currentUser = userStr ? JSON.parse(userStr).state?.user : null;
  const canEdit = currentUser && (
    ['SystemAdmin', 'Chairman', 'TopManagement'].includes(currentUser.role) || 
    currentUser.id === lead.assignee_id || 
    currentUser.id === lead.created_by
  );

  const actionLabels: any = {
    'B': '拜訪 (B)',
    'C': '電聯 (C)',
    'F': '信件 (F)',
    'D': '傳單DM (D)'
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/crm/leads')} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 transition-colors">
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <h1 className="text-2xl font-bold text-slate-800">潛在客戶詳情</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-xl text-blue-600">
              <User size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{lead.name}</h2>
              <span className="text-sm font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {lead.status === 'NEW' ? '新名單' : lead.status === 'CONTACTED' ? '聯繫中' : lead.status === 'REQUIREMENT' ? '已建需求單' : lead.status === 'CONVERTED' ? '已結案' : '流失'}
              </span>
            </div>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <button onClick={() => setShowEdit(true)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition" title="修改">
                <Edit2 size={20} />
              </button>
              <button onClick={handleDelete} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition" title="刪除">
                <Trash2 size={20} />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3 text-sm text-slate-600 mt-4">
          <div className="flex items-center gap-3">
            <User size={18} className="text-slate-400" />
            <span>負責業務: {lead.assignee?.name || '未指派'}</span>
          </div>
          {lead.source === 'CUSTOMER' && lead.referrer_name && (
            <div className="flex items-center gap-3">
              <User size={18} className="text-slate-400" />
              <span>轉介客戶: {lead.referrer_name}</span>
            </div>
          )}
          {lead.company && <div className="flex items-center gap-3"><Building2 size={18} className="text-slate-400" /> <span>公司: {lead.company}</span></div>}
          {lead.site_name && <div className="flex items-center gap-3"><Building2 size={18} className="text-slate-400" /> <span>案場: {lead.site_name}</span></div>}
          {lead.phone && <div className="flex items-center gap-3"><Phone size={18} className="text-slate-400" /> <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline">{lead.phone}</a></div>}
          <div className="flex items-center gap-3"><Calendar size={18} className="text-slate-400" /> <span>建檔日: {new Date(lead.created_at).toLocaleDateString()}</span></div>
        </div>

        {lead.status !== 'REQUIREMENT' && lead.status !== 'CONVERTED' && (
          <button 
            onClick={() => setShowRequirementAdd(true)}
            className="w-full mt-5 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium py-3 rounded-xl shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <FileText size={18} />
            轉為客戶需求單 (推進商機)
          </button>
        )}

        {lead.requirementTicket && (
          <div className="mt-5 bg-purple-50 p-4 rounded-xl border border-purple-100">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-purple-800 flex items-center gap-2"><CheckCircle2 size={18} /> 客戶需求單資訊 (已建檔)</h3>
              <button 
                onClick={() => setShowRequirementEdit(true)}
                className="text-purple-600 bg-white border border-purple-200 px-3 py-1 rounded-lg text-xs font-bold hover:bg-purple-100 transition-colors flex items-center gap-1"
              >
                <Edit2 size={12} /> 編輯需求單
              </button>
            </div>
            <div className="grid grid-cols-2 @md:grid-cols-4 gap-4 mt-3">
              <div>
                <p className="text-xs text-purple-500 font-bold mb-1">設計現勘狀態</p>
                <div className="flex flex-col items-start gap-1">
                  <p className="text-sm font-medium text-purple-900">{lead.requirementTicket.design_status}</p>
                  {lead.requirementTicket.design_assignee_names && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md font-medium">
                      {lead.requirementTicket.design_assignee_names}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-purple-500 font-bold mb-1">預算分析狀態</p>
                <div className="flex flex-col items-start gap-1">
                  <p className="text-sm font-medium text-purple-900">{lead.requirementTicket.budget_status}</p>
                  {lead.requirementTicket.budget_assignee_names && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md font-medium">
                      {lead.requirementTicket.budget_assignee_names}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-purple-500 font-bold mb-1">設置容量</p>
                <p className="text-sm font-medium text-purple-900">{lead.requirementTicket.installation_capacity || '--'} kW</p>
              </div>
              <div>
                <p className="text-xs text-purple-500 font-bold mb-1">承攬形式</p>
                <p className="text-sm font-medium text-purple-900">{lead.requirementTicket.contract_type || '--'}</p>
              </div>
            </div>
            <p className="text-xs text-purple-600 mt-4">* 詳細 50+ 項工程參數已成功儲存於資料庫中，工程部可隨時取用。</p>
            
            {lead.status !== 'CONVERTED' && lead.status !== 'LOST' && (
              <div className="mt-4 pt-4 border-t border-purple-200/50 flex justify-end">
                <button 
                  onClick={handleConvertToProject}
                  disabled={isConverting}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-md transition-colors active:scale-95 disabled:opacity-50"
                >
                  {isConverting ? '轉拋中...' : '轉拋為正式專案 (成案)'}
                </button>
              </div>
            )}
            {lead.status === 'CONVERTED' && (
              <div className="mt-4 pt-4 border-t border-purple-200/50 flex justify-end">
                <span className="bg-green-100 text-green-700 font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-2">
                  <CheckCircle2 size={16} /> 已轉為專案
                </span>
              </div>
            )}
          </div>
        )}

        {lead.requirementTicket?.budget_status === '已完成' && lead.requirementTicket?.budgetBook?.quotation?.total_price != null && (
          <div className="mt-5 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
            <h3 className="font-bold text-indigo-800 flex items-center gap-2 mb-3"><FileText size={18} /> 預算分析報價結果</h3>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-indigo-50">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">報價總計 (未稅)</span>
                <span className="text-2xl font-bold text-indigo-700">
                  ${Number(lead.requirementTicket.budgetBook.quotation.total_price).toLocaleString()}
                </span>
              </div>
              {lead.requirementTicket.budgetBook.quotation.notes && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-500 font-bold mb-1">備註說明</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{lead.requirementTicket.budgetBook.quotation.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-slate-800">互動與追蹤紀錄</h3>
        <button 
          onClick={() => setShowInteractionAdd(true)}
          className="text-blue-600 font-medium text-sm flex items-center gap-1 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg"
        >
          <PlusCircle size={16} /> 新增紀錄
        </button>
      </div>

      <div className="flex-1 overflow-auto pb-6">
        {lead.interactions?.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-300 text-slate-500">
            尚無互動紀錄，快點擊新增吧！
          </div>
        ) : (
          <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
            {lead.interactions?.map((int: any) => (
              <div key={int.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                {/* Icon */}
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-200 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                  {int.action_type === 'C' ? <Phone size={18} /> : int.action_type === 'B' ? <Building2 size={18} /> : <FileText size={18} />}
                </div>
                {/* Card */}
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-slate-800">{actionLabels[int.action_type]}</span>
                    <span className="text-xs text-slate-400">{new Date(int.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">{int.summary}</p>
                  {int.result && (
                    <div className="bg-slate-50 p-2 rounded-lg text-sm text-slate-600 border border-slate-100 mb-3">
                      <strong>結果：</strong>{int.result}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs font-medium text-orange-600 bg-orange-50 px-2.5 py-1.5 rounded-lg inline-flex">
                    <Clock size={14} /> 預計下次聯繫: {new Date(int.next_contact_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interaction Modal */}
      {showInteractionAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex flex-col justify-end md:justify-center items-center pb-safe">
          <div className="bg-white w-full md:w-[500px] rounded-t-3xl md:rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-5 shrink-0">
              <h3 className="text-xl font-bold text-slate-800">新增互動紀錄</h3>
              <button onClick={() => setShowInteractionAdd(false)} className="bg-slate-100 text-slate-500 w-8 h-8 rounded-full flex items-center justify-center font-bold hover:bg-slate-200">&times;</button>
            </div>
            
            <form onSubmit={handleAddInteraction} className="space-y-5 overflow-auto flex-1 px-1">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">互動動作 *</label>
                <div className="grid grid-cols-4 gap-2">
                  {['B', 'C', 'F', 'D'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setInteractionData({...interactionData, action_type: type})}
                      className={clsx(
                        "py-3 rounded-xl text-sm font-medium transition-colors border",
                        interactionData.action_type === type 
                          ? "bg-blue-50 border-blue-600 text-blue-700 shadow-inner" 
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {actionLabels[type]}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">洽談摘要 *</label>
                <textarea required rows={3} value={interactionData.summary} onChange={e => setInteractionData({...interactionData, summary: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors resize-none" placeholder="記錄當下談話重點..." />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">洽談結果</label>
                <input type="text" value={interactionData.result} onChange={e => setInteractionData({...interactionData, result: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors" placeholder="客戶覺得價格偏高/願意安排現勘..." />
              </div>

              <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                <label className="block text-sm font-bold text-orange-800 mb-1.5 flex items-center gap-1"><Clock size={16} /> 預計下次聯繫日期 (必填)</label>
                <p className="text-xs text-orange-600 mb-2">為了確保名單不遺漏，請排定下次追蹤日期</p>
                <input required type="date" value={interactionData.next_contact_date} onChange={e => setInteractionData({...interactionData, next_contact_date: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-orange-300 focus:ring-2 focus:ring-orange-500 bg-white" />
              </div>

              <button type="submit" className="w-full bg-blue-600 text-white font-medium py-3.5 rounded-xl shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4">
                <Send size={18} /> 送出紀錄
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Requirement Modal */}
      {showRequirementAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex flex-col justify-end md:justify-center items-center pb-safe">
          <div className="bg-white w-full md:w-[600px] h-[90vh] md:h-[80vh] rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col relative">
            <div className="flex justify-between items-center p-5 shrink-0 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">建立客戶需求單</h3>
              <button onClick={() => setShowRequirementAdd(false)} className="bg-slate-100 text-slate-500 w-8 h-8 rounded-full flex items-center justify-center font-bold hover:bg-slate-200">&times;</button>
            </div>
            <div className="flex-1 overflow-hidden relative">
              <RequirementForm onSubmit={handleCreateRequirement} onCancel={() => setShowRequirementAdd(false)} />
            </div>
          </div>
        </div>
      )}
      {/* Requirement Edit Modal */}
      {showRequirementEdit && lead.requirementTicket && (
        <div className="fixed inset-0 bg-black/50 z-50 flex flex-col justify-end md:justify-center items-center pb-safe">
          <div className="bg-white w-full md:w-[600px] h-[90vh] md:h-[80vh] rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col relative">
            <div className="flex justify-between items-center p-5 shrink-0 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">編輯客戶需求單</h3>
              <button onClick={() => setShowRequirementEdit(false)} className="bg-slate-100 text-slate-500 w-8 h-8 rounded-full flex items-center justify-center font-bold hover:bg-slate-200">&times;</button>
            </div>
            <div className="flex-1 overflow-hidden relative">
              <RequirementForm 
                mode="edit"
                initialData={lead.requirementTicket} 
                onSubmit={handleEditRequirement} 
                onCancel={() => setShowRequirementEdit(false)} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex flex-col justify-end md:justify-center items-center pb-safe">
          <div className="bg-white w-full md:w-[480px] rounded-t-3xl md:rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-5 shrink-0">
              <h3 className="text-xl font-bold text-slate-800">修改客戶資料</h3>
              <button onClick={() => setShowEdit(false)} className="bg-slate-100 text-slate-500 w-8 h-8 rounded-full flex items-center justify-center font-bold hover:bg-slate-200">&times;</button>
            </div>
            
            <form onSubmit={handleEdit} className="space-y-4 overflow-auto flex-1 px-1">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">聯絡人姓名 *</label>
                <input required type="text" value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">公司名稱 (業主)</label>
                <input type="text" value={editFormData.company} onChange={e => setEditFormData({...editFormData, company: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">案場名稱</label>
                <input type="text" value={editFormData.site_name} onChange={e => setEditFormData({...editFormData, site_name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">聯絡電話</label>
                <input type="tel" value={editFormData.phone} onChange={e => setEditFormData({...editFormData, phone: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">案源</label>
                <select value={editFormData.source} onChange={e => setEditFormData({...editFormData, source: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="SELF">自行開發</option>
                  <option value="COMPANY">公司交派</option>
                  <option value="CUSTOMER">客戶轉介</option>
                </select>
              </div>
              {editFormData.source === 'CUSTOMER' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">轉介客戶名稱</label>
                  <input type="text" value={editFormData.referrer_name} onChange={e => setEditFormData({...editFormData, referrer_name: e.target.value})} required className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500" placeholder="請輸入介紹人名稱" />
                </div>
              )}
              
              <button type="submit" className="w-full bg-blue-600 text-white font-medium py-3.5 rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all mt-4">
                儲存修改
              </button>
            </form>
          </div>
        </div>
      )}



    </div>
  );
}
