import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Search, Phone, Building2, User, ChevronRight, FileText, Briefcase } from 'lucide-react';
import clsx from 'clsx';
import DailyLogs from './DailyLogs';

export default function Leads() {
  const [leads, setLeads] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [activeTab, setActiveTab] = useState<'leads' | 'dailyLog'>('leads');
  const [formData, setFormData] = useState({ name: '', company: '', site_name: '', phone: '', source: 'SELF', assignee_id: '', referrer_name: '' });
  const [users, setUsers] = useState<any[]>([]);
  const navigate = useNavigate();

  const unconvertedLeads = leads.filter(l => l.status !== 'CONVERTED');
  const convertedLeads = leads.filter(l => l.status === 'CONVERTED');

  const fetchLeads = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/leads', {
        headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('auth-storage') || '{}').state?.token}` }
      });
      setLeads(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/users', {
        headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('auth-storage') || '{}').state?.token}` }
      });
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchUsers();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3001/api/leads', formData, {
        headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('auth-storage') || '{}').state?.token}` }
      });
      setShowAdd(false);
      setFormData({ name: '', company: '', site_name: '', phone: '', source: 'SELF', assignee_id: '', referrer_name: '' });
      fetchLeads();
    } catch (err) {
      alert('新增失敗');
    }
  };

  const statusColors: any = {
    'NEW': 'bg-blue-100 text-blue-700',
    'CONTACTED': 'bg-yellow-100 text-yellow-700',
    'REQUIREMENT': 'bg-purple-100 text-purple-700',
    'CONVERTED': 'bg-green-100 text-green-700',
    'RETURNED': 'bg-red-100 text-red-700',
    'LOST': 'bg-gray-100 text-gray-700',
  };

  const statusLabels: any = {
    'NEW': '新名單',
    'CONTACTED': '聯繫中',
    'REQUIREMENT': '需求單',
    'CONVERTED': '已結案',
    'RETURNED': '被退回',
    'LOST': '流失',
  };

  const sourceLabels: any = {
    'SELF': '自行開發',
    'COMPANY': '公司交派',
    'CUSTOMER': '客戶轉介',
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">業務開發</h1>
        
        {activeTab === 'leads' && (
          <button 
            onClick={() => setShowAdd(true)}
            className="bg-blue-600 text-white p-2 md:px-4 md:py-2 rounded-full md:rounded-lg shadow-lg md:shadow-md hover:bg-blue-700 transition flex items-center justify-center"
          >
            <Plus size={20} />
            <span className="hidden md:inline ml-2">新增名單</span>
          </button>
        )}
      </div>

      <div className="flex border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('leads')}
          className={clsx(
            "px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors",
            activeTab === 'leads' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          )}
        >
          <Briefcase size={18} /> 名單追蹤
        </button>
        <button
          onClick={() => setActiveTab('dailyLog')}
          className={clsx(
            "px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors",
            activeTab === 'dailyLog' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          )}
        >
          <FileText size={18} /> 今日工作日誌
        </button>
      </div>

      {activeTab === 'dailyLog' ? (
        <div className="flex-1 overflow-auto">
          <DailyLogs />
        </div>
      ) : (
        <>
          {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
          <div className="bg-white w-full md:w-[480px] rounded-t-2xl md:rounded-2xl p-6 shadow-2xl pb-safe">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">新增潛在客戶</h3>
              <button onClick={() => setShowAdd(false)} className="text-slate-500 text-xl font-bold p-2">&times;</button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">聯絡人姓名 *</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500" placeholder="王小明" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">公司名稱 (業主)</label>
                <input type="text" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500" placeholder="元融科技" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">案場名稱</label>
                <input type="text" value={formData.site_name} onChange={e => setFormData({...formData, site_name: e.target.value})} className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500" placeholder="台南案場" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">聯絡電話</label>
                <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500" placeholder="09XX-XXX-XXX" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">案源</label>
                <select value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})} className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="SELF">自行開發</option>
                  <option value="COMPANY">公司交派</option>
                  <option value="CUSTOMER">客戶轉介</option>
                </select>
              </div>
              {formData.source === 'CUSTOMER' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">轉介客戶名稱</label>
                  <input type="text" value={formData.referrer_name} onChange={e => setFormData({...formData, referrer_name: e.target.value})} required className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500" placeholder="請輸入介紹人名稱" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">負責業務開發人員</label>
                <select value={formData.assignee_id} onChange={e => setFormData({...formData, assignee_id: e.target.value})} className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">預設 (指派給自己)</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.department?.name || '無部門'})</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white font-medium py-3 rounded-lg shadow-md hover:bg-blue-700 active:scale-95 transition-all mt-4">
                建立名單
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto -mx-4 px-4 md:mx-0 md:px-0 space-y-8 pb-20 md:pb-0">
        
        {/* 未成案 Section */}
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            未成案 ({unconvertedLeads.length})
          </h2>
          <div className="grid grid-cols-1 @md:grid-cols-2 @lg:grid-cols-3 gap-4">
            {unconvertedLeads.map(lead => (
              <div 
                key={lead.id} 
                onClick={() => navigate(`/crm/leads/${lead.id}`)}
                className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all active:bg-slate-50 flex flex-col"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-slate-100 p-2 rounded-lg text-slate-600">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg leading-tight">
                        {lead.company && lead.site_name ? `${lead.company} - ${lead.site_name}` : lead.site_name || lead.company || lead.name}
                      </h3>
                      <span className="text-xs text-slate-500">
                        {sourceLabels[lead.source] || lead.source}
                        {lead.source === 'CUSTOMER' && lead.referrer_name && ` (${lead.referrer_name})`}
                        {lead.assignee && ` · 負責業務: ${lead.assignee.name}`}
                      </span>
                    </div>
                  </div>
                  <span className={clsx("text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap", statusColors[lead.status])}>
                    {statusLabels[lead.status]}
                  </span>
                </div>
                
                <div className="space-y-2 mt-auto pt-4 text-sm text-slate-600 border-t border-slate-50">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-slate-400" />
                    <span>聯絡人：{lead.name}</span>
                  </div>
                  {lead.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={16} className="text-slate-400" />
                      <a href={`tel:${lead.phone}`} onClick={(e) => e.stopPropagation()} className="text-blue-600 hover:underline">{lead.phone}</a>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {unconvertedLeads.length === 0 && (
              <div className="col-span-full py-8 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                目前沒有未成案的名單。
              </div>
            )}
          </div>
        </div>

        {/* 已成案 Section */}
        {convertedLeads.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              已成案 ({convertedLeads.length})
            </h2>
            <div className="grid grid-cols-1 @md:grid-cols-2 @lg:grid-cols-3 gap-4 opacity-75 hover:opacity-100 transition-opacity">
              {convertedLeads.map(lead => (
                <div 
                  key={lead.id} 
                  onClick={() => navigate(`/crm/leads/${lead.id}`)}
                  className="bg-slate-50 p-4 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all active:bg-slate-100 flex flex-col"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-white p-2 rounded-lg text-slate-400">
                        <Building2 size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-600 text-lg leading-tight">
                          {lead.company && lead.site_name ? `${lead.company} - ${lead.site_name}` : lead.site_name || lead.company || lead.name}
                        </h3>
                        <span className="text-xs text-slate-400">
                          {sourceLabels[lead.source] || lead.source}
                          {lead.source === 'CUSTOMER' && lead.referrer_name && ` (${lead.referrer_name})`}
                          {lead.assignee && ` · 負責業務: ${lead.assignee.name}`}
                        </span>
                      </div>
                    </div>
                    <span className={clsx("text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap", statusColors[lead.status])}>
                      {statusLabels[lead.status]}
                    </span>
                  </div>
                  
                  <div className="space-y-2 mt-auto pt-4 text-sm text-slate-500 border-t border-slate-200">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-slate-300" />
                      <span>聯絡人：{lead.name}</span>
                    </div>
                    {lead.phone && (
                      <div className="flex items-center gap-2">
                        <Phone size={16} className="text-slate-300" />
                        <a href={`tel:${lead.phone}`} onClick={(e) => e.stopPropagation()} className="text-slate-500 hover:text-blue-600 hover:underline">{lead.phone}</a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
          {/* Mobile Sticky Add Button - visible only on small screens without touching standard button layout */}
          <div className="md:hidden fixed bottom-6 right-6 z-40">
             <button 
              onClick={() => setShowAdd(true)}
              className="bg-blue-600 text-white w-14 h-14 rounded-full shadow-xl hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center"
            >
              <Plus size={28} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
