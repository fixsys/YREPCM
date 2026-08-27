import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { Plus, Search, Calendar, ChevronRight, Briefcase, FileText } from 'lucide-react';

const Projects = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({ project_code: '', name: '', status: '評估中', owner: '', capacity: '', address: '', start_date: '', target_date: '', content: '', notes: '', template_id: '' });
  const [submitError, setSubmitError] = useState('');
  
  const { token, user } = useAuthStore();
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [projRes, tplRes] = await Promise.all([
        axios.get('/api/projects', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/workflows/templates', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setProjects(projRes.data);
      setTemplates(tplRes.data);
      
      // Default template_id to the first one if available
      if (tplRes.data.length > 0) {
        setNewProject(prev => ({ ...prev, template_id: tplRes.data[0].id }));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    // if (!newProject.template_id) {
    //   setSubmitError('請選擇流程樣板');
    //   return;
    // }

    try {
      const payload = {
        ...newProject,
        start_date: newProject.start_date ? new Date(newProject.start_date).toISOString() : undefined,
        target_date: newProject.target_date ? new Date(newProject.target_date).toISOString() : undefined
      };
      await axios.post('/api/projects', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsModalOpen(false);
      setNewProject({ project_code: '', name: '', status: '評估中', owner: '', capacity: '', start_date: '', target_date: '', content: '', notes: '', template_id: templates.length > 0 ? templates[0].id : '' });
      fetchData();
    } catch (error: any) {
      setSubmitError(error.response?.data?.error || '新增專案失敗');
    }
  };

  const handleTakeover = async (id: string) => {
    const code = window.prompt('請輸入官方專案代碼 (例如: PRJ-20231012-001)：\r\n若留空將取消接取。');
    if (!code) return;
    
    try {
      await axios.post(`/api/projects/${id}/takeover`, { project_code: code.trim() }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('已成功接取並指派代碼！');
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || '接取失敗');
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt('發現異常？請輸入退回原因，以通知業務人員進行修正：\r\n(若留空則取消退回)');
    if (!reason) return;
    
    try {
      await axios.post(`/api/projects/${id}/reject`, { reason: reason.trim() }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('已成功退回專案給業務人員！');
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || '退回失敗');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '待接洽': return 'bg-purple-100 text-purple-800 border border-purple-200';
      case '評估中': return 'bg-yellow-100 text-yellow-800';
      case '施工中': return 'bg-blue-100 text-blue-800';
      case '已完工': return 'bg-emerald-100 text-emerald-800';
      case '退回修正': return 'bg-red-100 text-red-800 border border-red-200';
      case '停工': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const renderProjectCard = (project: any, isUnaccepted: boolean) => (
    <div 
      key={project.id} 
      onClick={() => navigate(`/projects/${project.id}`)}
      className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all active:bg-slate-50 flex flex-col relative"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 p-2.5 rounded-lg text-slate-600">
            <Briefcase size={22} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-lg leading-tight mb-1">{project.name}</h3>
            <span className="text-xs text-slate-500 font-mono">
              {project.status === '待接洽' ? '尚未建立代碼' : project.project_code}
            </span>
          </div>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${getStatusColor(project.status)}`}>
          {project.status}
        </span>
      </div>
      
      <div className="space-y-3 mt-auto pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-full bg-slate-200 rounded-full h-2 max-w-[120px]">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${project.progress_pct || 0}%` }}></div>
          </div>
          <span className="text-xs text-slate-500 font-medium">{project.progress_pct || 0}%</span>
        </div>
        
        <div className="flex items-center justify-between text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-slate-400" />
            <span>預計: {project.target_date ? new Date(project.target_date).toLocaleDateString() : '未設定'}</span>
          </div>
        </div>

        {isUnaccepted ? (
          <div className="flex items-center gap-2 pt-2 mt-2 border-t border-slate-50">
            <button 
              onClick={(e) => { e.stopPropagation(); handleTakeover(project.id); }}
              className="flex-1 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-colors"
            >
              接取專案
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleReject(project.id); }}
              className="flex-1 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg shadow-sm transition-colors"
            >
              退回修正
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-slate-500 truncate mt-1 pt-2 border-t border-slate-50" title={project.tasks && project.tasks.length > 0 ? project.tasks[0].name : '尚未新增任務'}>
            <FileText size={14} className="shrink-0" />
            <span className="truncate">最新任務: {project.tasks && project.tasks.length > 0 ? project.tasks[0].name : '尚未新增任務'}</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">專案管理</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-sm"
        >
          <Plus size={18} /> 新增專案
        </button>
      </div>

      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="搜尋專案代碼或名稱..." 
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
        />
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500">載入中...</div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Unaccepted Projects */}
          {(() => {
            const unaccepted = projects.filter(p => p.status === '待接洽');
            if (unaccepted.length === 0) return null;
            
            return (
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  尚未接取 ({unaccepted.length})
                </h2>
                <div className="grid grid-cols-1 @md:grid-cols-2 @lg:grid-cols-3 gap-4">
                  {unaccepted.map(project => renderProjectCard(project, true))}
                </div>
              </div>
            );
          })()}

          {/* Accepted Projects */}
          {(() => {
            const accepted = projects.filter(p => p.status !== '待接洽' && p.status !== '退回修正');
            
            return (
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  執行中專案 ({accepted.length})
                </h2>
                <div className="grid grid-cols-1 @md:grid-cols-2 @lg:grid-cols-3 gap-4">
                  {accepted.map(project => renderProjectCard(project, false))}
                  {accepted.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                      目前沒有執行中之專案
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">新增專案</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="p-6 space-y-4">
              {submitError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
                  {submitError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">專案代碼 *</label>
                  <input required type="text" value={newProject.project_code} onChange={e => setNewProject({...newProject, project_code: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="例如: YR-202604-001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">專案名稱 *</label>
                  <input required type="text" value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="專案名稱" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">流程樣板 *</label>
                  <select 
                    required 
                    value={newProject.template_id} 
                    onChange={e => setNewProject({...newProject, template_id: e.target.value})} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="" disabled>請選擇流程樣板</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div> */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">狀態</label>
                  <select value={newProject.status} onChange={e => setNewProject({...newProject, status: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="評估中">評估中</option>
                    <option value="施工中">施工中</option>
                    <option value="已完工">已完工</option>
                    <option value="停工">停工</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">業主名稱</label>
                  <input type="text" value={newProject.owner} onChange={e => setNewProject({...newProject, owner: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="業主名稱" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">設置容量</label>
                  <input type="text" value={newProject.capacity} onChange={e => setNewProject({...newProject, capacity: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. 3333 kW" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">工程地點</label>
                  <input type="text" value={newProject.address || ''} onChange={e => setNewProject({...newProject, address: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="例如: 台中市西屯區..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">發起日期</label>
                  <input type="date" value={newProject.start_date} onChange={e => setNewProject({...newProject, start_date: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">預計結束日期</label>
                  <input type="date" value={newProject.target_date} onChange={e => setNewProject({...newProject, target_date: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">專案內容</label>
                <textarea value={newProject.content} onChange={e => setNewProject({...newProject, content: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" rows={2} placeholder="專案大綱或內容摘要"></textarea>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">取消</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">確認新增</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
