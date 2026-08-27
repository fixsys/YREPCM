import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import RequirementForm from './crm/RequirementForm';
import { ArrowLeft, Clock, Calendar, User, FileText, Plus, Edit2, Trash2, Paperclip, Building2, AlignLeft, CheckCircle2, UploadCloud, File as FileIcon, Download } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ProjectWorkflowTab from '../components/ProjectWorkflowTab';

const TASK_CATALOG = [
  {
    department: '業務部+預算組+法務部',
    tasks: [
      '接到專案', '現場測量 協作:設計部', '評估是否成案', '蒐集資訊', 
      '合約擬定 (請款節點/施作項目) 協作:法務部', '報價單/預算書 協作:預算組+採購組', 
      '施工規範 施工進度表 勞安衛計畫書 協作:工務部', '合約書用印 協作:法務部', 
      '業主確認是否簽約', '專案成立', '各部門開始處理該專案'
    ]
  },
  {
    department: '設計部',
    tasks: [
      '現場測量 協作:業務部', '專案成立', '測量成果圖', '業主確認是否無誤', 
      '結構計算書', '技師確認是否無誤', '簽證圖', '建模', '板材圖面', 
      '一次加工圖面', '雷射切割', '鋼板一次', '二次加工圖', 'BOM表', '工程圖說'
    ]
  },
  {
    department: '採購組+倉管組',
    tasks: [
      '施工進度表+BOM表 施工規範+預算書 協作:工務+設計+預算組', '材料庫存盤點 協作:倉管', 
      '工具盤點', '確認採購排程 (對應現場進度) 協作:工務部', '請購作業', 
      '出貨 現場or廠內加工or倉庫協助出貨'
    ]
  },
  {
    department: '鋼構部',
    tasks: [
      '一二次加工圖+雷射切割機程式碼+施工規範+派工單 協作:設計部+工務部', '進料 協作:採購', 
      '鋼構部圖面審核', '是否無異常', '一次加工 鋼板、H鋼 (零件加工)', '自檢 是否無異常', 
      '二次加工 (構件製造)', '工務抽檢 是否無異常', '鍍鋅作業', '出貨至工程現場'
    ]
  },
  {
    department: '工務部',
    tasks: [
      '工程圖說+施工進度表+施工規範+BOM表 協作:設計部', '工程發包', '現場派工/施工', 
      '施工查驗', '完工並聯'
    ]
  },
  {
    department: '所有部門',
    tasks: [
      '竣工', '竣工報告書', '專案成本結算', '結案會議', '後續運維計畫'
    ]
  }
];

const FILE_CATEGORIES = [
  '合約', '預算書', '施工規範', '施工進度表', '追加項目',
  '結構計算書', '結構簽證', 'BOM表', '內部異常單', '施工自主檢查表'
];

const ProjectDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const { token, user } = useAuthStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'requirements' | 'logs' | 'tasks' | 'performance' | 'files' | 'work_items' | 'workflow'>('tasks');
  const [tasks, setTasks] = useState<any[]>([]);
  const [workItemsConfig, setWorkItemsConfig] = useState<any>({});
  
  // Initialize config when project loads
  useEffect(() => {
    if (project && project.work_items_config && !Array.isArray(project.work_items_config) && Object.keys(project.work_items_config).length > 0) {
      setWorkItemsConfig(project.work_items_config);
    } else if (project) {
      // Default to the original Onsite.tsx categories
      const defaults: any = {
        '土木': ['整地', '放樣', '開挖', 'PC', '鋼筋綁紮', '大底澆置', '板模', '灌漿', '基礎螺栓', '拆模', '回填', '其他'].map(name => ({ name, contractQuantity: 0, unit: '式' })),
        '機電': ['DC－模組串列接線', 'DC－直流電纜佈設', 'DC－絕緣阻抗測試', 'DC－逆變器接線', 'AC－交流電纜佈設', 'AC－配電盤安裝', 'AC－接地及防雷施工', 'AC－功能測試', '台電申報／竣工資料', '台電會勘／預計掛表', '其他機電工程'].map(name => ({ name, contractQuantity: 0, unit: '式' })),
        '模組': ['模組進場點收', '模組搬運上架', '模組定位排列', '中壓塊安裝', '側壓塊安裝', '模組鎖固扭力確認', '模組外觀及破損檢查', '其他模組工程'].map(name => ({ name, contractQuantity: 0, unit: '式' })),
        '鋼構': ['錨栓及柱腳放樣', '鋼柱吊裝', '鋼柱及主梁吊裝', '次梁及斜撐安裝', '梁柱接頭螺栓安裝', '高強度螺栓終鎖', '現場焊接作業', '柱腳無收縮灌漿', '鍍鋅層修補', '其他鋼構工程'].map(name => ({ name, contractQuantity: 0, unit: '式' })),
      };
      setWorkItemsConfig(defaults);
    }
  }, [project]);

  const handleSaveWorkItems = async () => {
    try {
      await axios.put(`/api/projects/${id}/work-items`, { work_items_config: workItemsConfig }, { headers: { Authorization: `Bearer ${token}` } });
      alert('施工細項設定已儲存！報工表單將自動套用此設定。');
    } catch (err) {
      alert('儲存失敗');
    }
  };

  const [contributionData, setContributionData] = useState<any>(null);
  const [projectFiles, setProjectFiles] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [projectWorkflow, setProjectWorkflow] = useState<any>(null);

  // File Modal State
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [fileCategory, setFileCategory] = useState(FILE_CATEGORIES[0]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [fileSubmitError, setFileSubmitError] = useState('');

  // Task Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskFormData, setTaskFormData] = useState({ name: '', description: '', estimated_hours: '', weight: '1', status: '未開始', workflow_node_id: '', assignee_ids: [] as string[] });
  const [taskSubmitError, setTaskSubmitError] = useState('');

  // Work Log Modal State
  const [isWorkLogModalOpen, setIsWorkLogModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [workLogFormData, setWorkLogFormData] = useState({ work_date: new Date().toISOString().slice(0, 10), logged_hours: '', description: '' });
  const [workLogSubmitError, setWorkLogSubmitError] = useState('');

  // Daily Log Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [formData, setFormData] = useState({
    task_item: '', sub_task: '', start_time: '', est_end_time: '', act_end_time: '', est_days: '',
  });
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [files]);
  const [submitError, setSubmitError] = useState('');

  // Edit Project Modal State
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [editProjectData, setEditProjectData] = useState<any>({});
  const [projectSubmitError, setProjectSubmitError] = useState('');

  const fetchData = async () => {
    try {
      const [projectRes, toolboxRes, laborRes, tasksRes, contribRes, filesRes, tplRes, wfRes] = await Promise.all([
        axios.get(`/api/projects/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`/api/toolbox-meetings?project_id=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`/api/labor-reports?project_id=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`/api/tasks?project_id=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`/api/projects/${id}/contribution`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: null })),
        axios.get(`/api/projects/${id}/files`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
        axios.get(`/api/workflows/templates`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
        axios.get(`/api/projects/${id}/workflow`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: null }))
      ]);
      setProject(projectRes.data);
      
      const mergedLogs = [
        ...(toolboxRes.data || []).map((t: any) => ({ ...t, _logType: 'toolbox', _date: t.record_date })),
        ...(laborRes.data || []).map((l: any) => ({ ...l, _logType: 'labor', _date: l.report_date }))
      ].sort((a, b) => new Date(b._date).getTime() - new Date(a._date).getTime());
      
      setLogs(mergedLogs);
      setTasks(tasksRes.data);
      setContributionData(contribRes.data);
      setProjectFiles(filesRes.data);
      setTemplates(tplRes.data || []);
      setProjectWorkflow(wfRes.data);
      
      // Fetch users for assignment dropdowns
      try {
        const usersRes = await axios.get('/api/users', { headers: { Authorization: `Bearer ${token}` } });
        setUsers(usersRes.data);
      } catch(e) {
        // Ignored if user doesn't have permission to list users
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (id && token) fetchData();
  }, [id, token]);

  const openEditProjectModal = () => {
    setEditProjectData({
      project_code: project.project_code || '',
      name: project.name || '',
      status: project.status || '評估中',
      owner: project.owner || '',
      capacity: project.capacity || '',
      address: project.address || '',
      content: project.content || '',
      start_date: project.start_date ? new Date(project.start_date).toISOString().slice(0, 10) : '',
      target_date: project.target_date ? new Date(project.target_date).toISOString().slice(0, 10) : '',
      sales_rep_id: project.sales_rep_id || '',
      eng_rep_id: project.eng_rep_id || '',
      design_rep_id: project.design_rep_id || '',
      procurement_rep_id: project.procurement_rep_id || '',
      steel_rep_id: project.steel_rep_id || '',
      template_id: projectWorkflow?.template_id || ''
    });
    setProjectSubmitError('');
    setIsEditProjectModalOpen(true);
  };

  const handleEditProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProjectSubmitError('');
    try {
      const payload = {
        ...editProjectData,
        start_date: editProjectData.start_date ? new Date(editProjectData.start_date).toISOString() : null,
        target_date: editProjectData.target_date ? new Date(editProjectData.target_date).toISOString() : null,
        sales_rep_id: editProjectData.sales_rep_id || null,
        eng_rep_id: editProjectData.eng_rep_id || null,
        design_rep_id: editProjectData.design_rep_id || null,
        procurement_rep_id: editProjectData.procurement_rep_id || null,
        steel_rep_id: editProjectData.steel_rep_id || null,
        template_id: editProjectData.template_id || null
      };
      await axios.put(`/api/projects/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsEditProjectModalOpen(false);
      fetchData();
    } catch (error: any) {
      setProjectSubmitError(error.response?.data?.error || '更新專案失敗');
    }
  };

  const openCreateLogModal = () => {
    setSelectedLog(null);
    setFormData({ task_item: '', sub_task: '', start_time: '', est_end_time: '', act_end_time: '', est_days: '' });
    setFiles([]);
    setIsModalOpen(true);
  };

  const openEditLogModal = (log: any) => {
    setSelectedLog(log);
    setFormData({
      task_item: log.task_item || '',
      sub_task: log.sub_task || '',
      start_time: log.start_time ? new Date(log.start_time).toISOString().slice(0, 16) : '',
      est_end_time: log.est_end_time ? new Date(log.est_end_time).toISOString().slice(0, 16) : '',
      act_end_time: log.act_end_time ? new Date(log.act_end_time).toISOString().slice(0, 16) : '',
      est_days: log.est_days || '',
    });
    setFiles([]);
    setIsModalOpen(true);
  };

  const handleLogDelete = async (logId: string) => {
    if (!window.confirm('確定要刪除此工作日誌嗎？')) return;
    try {
      await axios.delete(`/api/logs/${logId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || '刪除失敗');
    }
  };

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    
    const payload = new FormData();
    payload.append('project_id', id as string);
    Object.entries(formData).forEach(([key, value]) => {
      if (value) payload.append(key, value);
    });
    if (files.length > 0) {
      files.forEach(f => payload.append('attachments', f));
    }

    try {
      if (selectedLog) {
        await axios.put(`/api/logs/${selectedLog.id}`, payload, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await axios.post(`/api/logs`, payload, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
        });
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      setSubmitError(error.response?.data?.error || '儲存日誌失敗');
    }
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTaskSubmitError('');
    try {
      await axios.post('/api/tasks', { ...taskFormData, project_id: id }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsTaskModalOpen(false);
      setTaskFormData({ name: '', description: '', estimated_hours: '', weight: '1', status: '未開始', workflow_node_id: '', assignee_ids: [] });
      fetchData();
    } catch (error: any) {
      setTaskSubmitError(error.response?.data?.error || '建立任務失敗');
    }
  };

  const handleWorkLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWorkLogSubmitError('');
    try {
      await axios.post('/api/work-logs', { ...workLogFormData, task_id: selectedTaskId, project_id: id }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsWorkLogModalOpen(false);
      setWorkLogFormData({ work_date: new Date().toISOString().slice(0, 10), logged_hours: '', description: '' });
      fetchData();
    } catch (error: any) {
      setWorkLogSubmitError(error.response?.data?.error || '新增工時失敗');
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return setFileSubmitError('請選擇檔案');
    setFileSubmitError('');
    const formData = new FormData();
    formData.append('category', fileCategory);
    formData.append('file', uploadFile);
    try {
      await axios.post(`/api/projects/${id}/files`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setIsFileModalOpen(false);
      setUploadFile(null);
      fetchData();
    } catch (error: any) {
      setFileSubmitError(error.response?.data?.error || '上傳失敗');
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!window.confirm('確定刪除此檔案？')) return;
    try {
      await axios.delete(`/api/projects/${id}/files/${fileId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || '刪除失敗');
    }
  };

  if (!project) return <div className="p-8 text-center text-slate-500">載入中...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/projects')} className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-slate-800">{project.project_code} - {project.name}</h1>
        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">{project.status}</span>
      </div>

      <div className="grid grid-cols-1 @lg:grid-cols-3 gap-6">
        {/* Project Info */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h3 className="text-lg font-semibold text-slate-800">專案資訊</h3>
            <button onClick={openEditProjectModal} className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
              <Edit2 size={14} /> 編輯資訊
            </button>
          </div>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500 flex items-center gap-2"><Building2 size={16}/> 業主</span>
              <span className="font-medium">{project.owner || '未填寫'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 flex items-center gap-2"><Calendar size={16}/> 發起日期</span>
              <span className="font-medium">{project.start_date ? new Date(project.start_date).toLocaleDateString() : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 flex items-center gap-2"><Calendar size={16}/> 預計結束</span>
              <span className="font-medium">{project.target_date ? new Date(project.target_date).toLocaleDateString() : '-'}</span>
            </div>

            <div className="pt-2 pb-1 border-t border-slate-100"><span className="text-slate-600 font-medium">各部門負責人</span></div>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4 pl-1">
              <div className="flex flex-col">
                <span className="text-xs text-slate-400">業務部</span>
                <span className="font-medium text-slate-700">{project.salesRep?.name || '未指派'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-400">工程研發部 (設計)</span>
                <span className="font-medium text-slate-700">{project.designRep?.name || '未指派'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-400">採購組</span>
                <span className="font-medium text-slate-700">{project.procurementRep?.name || '未指派'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-400">工務部</span>
                <span className="font-medium text-slate-700">{project.engRep?.name || '未指派'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-400">鋼構部</span>
                <span className="font-medium text-slate-700">{project.steelRep?.name || '未指派'}</span>
              </div>
            </div>

            <div className="pt-2">
              <span className="text-slate-500 flex items-center gap-2 mb-1"><AlignLeft size={16}/> 專案內容</span>
              <p className="text-slate-700 bg-slate-50 p-3 rounded-lg text-sm whitespace-pre-wrap">{project.content || '無內容摘要'}</p>
            </div>
          </div>
        </div>

        {/* Right side content (Tabs) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 flex gap-2 overflow-x-auto">
            {/* <button onClick={() => setActiveTab('workflow')} className={`px-4 py-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors flex-1 ${activeTab === 'workflow' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>專案工作流</button> */}
            <button onClick={() => setActiveTab('requirements')} className={`px-4 py-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors flex-1 ${activeTab === 'requirements' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>客戶需求單</button>
            <button onClick={() => setActiveTab('logs')} className={`px-4 py-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors flex-1 ${activeTab === 'logs' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>施工日誌</button>
            <button onClick={() => setActiveTab('tasks')} className={`px-4 py-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors flex-1 ${activeTab === 'tasks' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>任務與工時</button>
            <button onClick={() => setActiveTab('performance')} className={`px-4 py-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors flex-1 ${activeTab === 'performance' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>專案績效與貢獻</button>
            <button onClick={() => setActiveTab('files')} className={`px-4 py-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors flex-1 ${activeTab === 'files' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>專案檔案</button>
            <button onClick={() => setActiveTab('work_items')} className={`px-4 py-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors flex-1 ${activeTab === 'work_items' ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50'}`}>施工細項設定</button>
          </div>

          {/* activeTab === 'workflow' && (
            <ProjectWorkflowTab projectId={id || ''} key={projectWorkflow?.id || 'empty'} />
          ) */}

          {/* 需求單 Tab */}
          {activeTab === 'requirements' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-6">客戶需求表 (唯讀)</h3>
              {project.requirementTicket ? (
                <div className="h-[600px] overflow-auto">
                  <RequirementForm mode="view" initialData={project.requirementTicket} />
                </div>
              ) : (
                <div className="text-center text-slate-500 py-12 bg-slate-50 rounded-xl">
                  此專案未關聯任何客戶需求單
                </div>
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-slate-800">施工日誌</h3>
                <button onClick={() => navigate('/onsite')} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors">
                  <Plus size={16} /> 前往填寫
                </button>
              </div>

              <div className="space-y-4">
                {logs.map((log) => (
                  <div key={`${log._logType}-${log.id}`} className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 transition-colors bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 text-xs font-bold rounded ${log._logType === 'toolbox' ? 'bg-indigo-100 text-indigo-700' : 'bg-teal-100 text-teal-700'}`}>
                          {log._logType === 'toolbox' ? '工具箱會議' : '報工日誌'}
                        </span>
                        <h4 className="font-bold text-slate-800">{log.work_category}工程</h4>
                      </div>
                      <div className="text-sm text-slate-600 space-y-1">
                        <p><strong className="text-slate-700">日期：</strong> {new Date(log._date).toLocaleDateString()}</p>
                        {log._logType === 'toolbox' ? (
                          <p><strong className="text-slate-700">宣導內容：</strong> {log.work_content}</p>
                        ) : (
                          <p><strong className="text-slate-700">明日規劃：</strong> {log.tomorrow_plan || '無'}</p>
                        )}
                        <p className="text-xs text-slate-400 mt-2">記錄人：{log.recorder?.name || '未知'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                                            {log._logType === 'toolbox' && (
                        <button 
                          onClick={async () => {
                            try {
                              const res = await axios.get(`/api/toolbox-meetings/${log.id}/export-pdf`, {
                                headers: { Authorization: `Bearer ${token}` },
                                responseType: 'blob'
                              });
                              const url = window.URL.createObjectURL(new Blob([res.data]));
                              const link = document.createElement('a');
                              link.href = url;
                              link.setAttribute('download', `工具箱會議-${new Date(log._date).toLocaleDateString().replace(/\//g, '')}.pdf`);
                              document.body.appendChild(link);
                              link.click();
                              link.remove();
                              window.URL.revokeObjectURL(url);
                            } catch (e) {
                              console.error(e);
                              alert('匯出 PDF 失敗');
                            }
                          }}
                          className="whitespace-nowrap px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 font-bold hover:bg-red-100 hover:border-red-300 transition-colors shadow-sm flex items-center gap-2 text-sm"
                        >
                          <Download size={16} /> 匯出 PDF
                        </button>
                      )}
                      {log._logType === 'labor' && (
                        <button 
                          onClick={async () => {
                            try {
                              const res = await axios.get(`/api/labor-reports/${log.id}/export`, {
                                headers: { Authorization: `Bearer ${token}` },
                                responseType: 'blob'
                              });
                              const url = window.URL.createObjectURL(new Blob([res.data]));
                              const link = document.createElement('a');
                              link.href = url;
                              link.setAttribute('download', `施工日誌-${new Date(log._date).toLocaleDateString().replace(/\//g, '')}.xlsx`);
                              document.body.appendChild(link);
                              link.click();
                              link.remove();
                              window.URL.revokeObjectURL(url);
                            } catch (e) {
                              console.error(e);
                              alert('匯出失敗');
                            }
                          }}
                          className="whitespace-nowrap px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 font-bold hover:bg-emerald-100 hover:border-emerald-300 transition-colors shadow-sm flex items-center gap-2 text-sm"
                        >
                          <Download size={16} /> 匯出 Excel
                        </button>
                      )}
                      {log._logType === 'labor' && (
                        <button 
                          onClick={async () => {
                            try {
                              const res = await axios.get(`/api/labor-reports/${log.id}/export-pdf`, {
                                headers: { Authorization: `Bearer ${token}` },
                                responseType: 'blob'
                              });
                              const url = window.URL.createObjectURL(new Blob([res.data]));
                              const link = document.createElement('a');
                              link.href = url;
                              link.setAttribute('download', `施工日誌-${new Date(log._date).toLocaleDateString().replace(/\//g, '')}.pdf`);
                              document.body.appendChild(link);
                              link.click();
                              link.remove();
                              window.URL.revokeObjectURL(url);
                            } catch (e) {
                              console.error(e);
                              alert('匯出 PDF 失敗');
                            }
                          }}
                          className="whitespace-nowrap px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 font-bold hover:bg-red-100 hover:border-red-300 transition-colors shadow-sm flex items-center gap-2 text-sm"
                        >
                          <Download size={16} /> 匯出 PDF
                        </button>
                      )}
                      <button 
                        onClick={() => navigate(`/onsite?viewType=${log._logType}&viewId=${log.id}`)}
                        className="whitespace-nowrap px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-50 hover:text-blue-600 hover:border-blue-300 transition-colors shadow-sm flex items-center gap-2 text-sm"
                      >
                        <FileText size={16} /> 檢視報表
                      </button>
                    </div>
                  </div>
                ))}
                
                {logs.length === 0 && (
                  <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                    目前尚無施工日誌記錄
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-slate-800">專案任務</h3>
                <button onClick={() => setIsTaskModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors">
                  <Plus size={16} /> 新增任務
                </button>
              </div>
              {(() => {
                const unacceptedTasks = tasks.filter(task => {
                  const acceptedIds = task.accepted_by?.map((u: any) => u.id) || [];
                  const unacceptedUsers = task.assignees?.filter((a: any) => !acceptedIds.includes(a.id)) || [];
                  return unacceptedUsers.length > 0 && task.status !== '已完成';
                });
                
                const acceptedTasks = tasks.filter(task => {
                  const acceptedIds = task.accepted_by?.map((u: any) => u.id) || [];
                  const unacceptedUsers = task.assignees?.filter((a: any) => !acceptedIds.includes(a.id)) || [];
                  return unacceptedUsers.length === 0 || task.status === '已完成';
                });

                const renderTaskCard = (task: any) => (
                  <div key={task.id} className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium text-slate-800 text-lg flex items-center gap-2">
                          {task.status === '已完成' && <CheckCircle2 size={16} className="text-green-500" />}
                          {task.name}
                        </h4>
                        <p className="text-sm text-slate-600 mt-1">{task.description}</p>
                        {(() => {
                          const acceptedIds = task.accepted_by?.map((u: any) => u.id) || [];
                          const unacceptedUsers = task.assignees?.filter((a: any) => !acceptedIds.includes(a.id)) || [];
                          if (unacceptedUsers.length > 0 && task.status !== '已完成') {
                            return (
                              <div className="mt-2 text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded inline-block">
                                尚未接取: {unacceptedUsers.map((u:any) => u.name).join(', ')}
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${task.status === '已完成' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{task.status}</span>
                    </div>
                    <div className="flex gap-4 mt-3 pt-3 border-t border-slate-100">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock size={14}/> 預估: {task.estimated_hours ? parseFloat(task.estimated_hours).toFixed(1) : '-'} hr
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock size={14}/> 實際: {task.workLogs?.reduce((sum: number, log: any) => sum + Number(log.logged_hours), 0).toFixed(1) || '0.0'} hr
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <AlignLeft size={14}/> 權重: {task.weight}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <User size={14}/> 指派: {task.assignees?.map((a: any) => a.name).join(', ') || '未指派'}
                      </span>
                    </div>
                  </div>
                );

                return (
                  <div className="space-y-8">
                    {/* Unaccepted Tasks */}
                    <div>
                      <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span> 尚未接取任務 ({unacceptedTasks.length})
                      </h4>
                      <div className="space-y-4">
                        {unacceptedTasks.length > 0 ? unacceptedTasks.map(renderTaskCard) : (
                          <div className="text-center py-4 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300 text-sm">
                            無尚未接取之任務
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Accepted Tasks */}
                    <div>
                      <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 已接取任務 ({acceptedTasks.length})
                      </h4>
                      <div className="space-y-4">
                        {acceptedTasks.length > 0 ? acceptedTasks.map(renderTaskCard) : (
                          <div className="text-center py-4 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300 text-sm">
                            目前無已接取之任務
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
              <h3 className="text-lg font-semibold text-slate-800 border-b pb-3">專案績效與資源視圖</h3>
              {contributionData ? (
                <div className="grid grid-cols-1 @md:grid-cols-2 gap-6">
                  {/* Pie Chart */}
                  <div className="border border-slate-100 rounded-lg p-4">
                    <h4 className="text-sm font-bold text-slate-700 mb-4 text-center">成員工時佔比</h4>
                    <div className="h-64">
                      {contributionData.totalProjectHours > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={contributionData.contributions.filter((c:any) => c.hours > 0)}
                              dataKey="hours"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                              {contributionData.contributions.map((entry:any, index:number) => (
                                <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => `${value} 小時`} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-sm text-slate-400">尚無工時資料</div>
                      )}
                    </div>
                    <div className="text-center mt-2 text-sm text-slate-500">
                      總投入工時: {contributionData.totalProjectHours} hr
                    </div>
                  </div>

                  {/* Contribution Ranking */}
                  <div className="border border-slate-100 rounded-lg p-4">
                    <h4 className="text-sm font-bold text-slate-700 mb-4">成員貢獻度排名</h4>
                    <div className="space-y-3">
                      {contributionData.contributions.map((c: any, i: number) => (
                        <div key={c.userId} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">{i + 1}</div>
                            <span className="font-medium text-slate-700">{c.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-blue-600">{c.totalContribution.toFixed(1)}%</div>
                            <div className="text-xs text-slate-400">工時 {c.hours}hr</div>
                          </div>
                        </div>
                      ))}
                      {contributionData.contributions.length === 0 && (
                        <div className="text-center text-sm text-slate-400 py-4">尚無成員貢獻資料</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">無貢獻度資料</div>
              )}
            </div>
          )}

          {activeTab === 'work_items' && (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
    <div className="flex justify-between items-center mb-4 border-b pb-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-800">施工細項設定</h3>
        <p className="text-sm text-slate-500">預先設定本專案各類別需要進行報工的工項、契約數量與單位。報工時，將自動帶入對應數值。</p>
      </div>
      <button onClick={handleSaveWorkItems} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-bold">
        儲存設定
      </button>
    </div>
    
    {Object.keys(workItemsConfig).map(category => (
      <div key={category} className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-slate-100 p-3 font-bold text-slate-700 flex justify-between items-center">
          {category} 類別
          <button onClick={() => {
            const newConfig = { ...workItemsConfig };
            newConfig[category] = [...(newConfig[category] || []), { name: '', contractQuantity: 0, unit: '式' }];
            setWorkItemsConfig(newConfig);
          }} className="text-teal-600 font-bold hover:underline text-sm">+ 新增 {category} 工項</button>
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-3 text-slate-600">工項名稱</th>
              <th className="p-3 text-slate-600 w-32">契約數量</th>
              <th className="p-3 text-slate-600 w-24">單位</th>
              <th className="p-3 text-slate-600 text-right w-20">操作</th>
            </tr>
          </thead>
          <tbody>
            {(workItemsConfig[category] || []).map((item: any, idx: number) => (
              <tr key={idx} className="border-b">
                <td className="p-2">
                  <input type="text" value={item.name} onChange={e => {
                    const newConfig = { ...workItemsConfig };
                    newConfig[category][idx].name = e.target.value;
                    setWorkItemsConfig(newConfig);
                  }} className="w-full border rounded px-2 py-1" />
                </td>
                <td className="p-2">
                  <input type="number" value={item.contractQuantity} onChange={e => {
                    const newConfig = { ...workItemsConfig };
                    newConfig[category][idx].contractQuantity = Number(e.target.value);
                    setWorkItemsConfig(newConfig);
                  }} className="w-full border rounded px-2 py-1" />
                </td>
                <td className="p-2">
                  <input type="text" value={item.unit} onChange={e => {
                    const newConfig = { ...workItemsConfig };
                    newConfig[category][idx].unit = e.target.value;
                    setWorkItemsConfig(newConfig);
                  }} className="w-full border rounded px-2 py-1" />
                </td>
                <td className="p-2 text-right">
                  <button onClick={() => {
                    const newConfig = { ...workItemsConfig };
                    newConfig[category] = newConfig[category].filter((_: any, i: number) => i !== idx);
                    setWorkItemsConfig(newConfig);
                  }} className="text-red-500 hover:text-red-700 font-bold p-1">刪除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ))}
  </div>
)}

{activeTab === 'files' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-slate-800">專案相關檔案</h3>
                <button onClick={() => setIsFileModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors">
                  <UploadCloud size={16} /> 上傳檔案
                </button>
              </div>
              <div className="space-y-6">
                {FILE_CATEGORIES.map(category => {
                  const categoryFiles = projectFiles.filter((f: any) => f.category === category);
                  if (categoryFiles.length === 0) return null;
                  return (
                    <div key={category}>
                      <h4 className="text-md font-bold text-slate-700 border-b pb-2 mb-3">{category}</h4>
                      <div className="grid grid-cols-1 @md:grid-cols-2 gap-3">
                        {categoryFiles.map((file: any) => (
                          <div key={file.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg bg-slate-50 hover:border-blue-300 transition-colors">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <FileIcon size={20} className="text-slate-400 flex-shrink-0" />
                              <div className="overflow-hidden">
                                <a href={`${file.file_path}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline truncate block">
                                  {file.file_name}
                                </a>
                                <p className="text-xs text-slate-500 mt-0.5">{new Date(file.uploaded_at).toLocaleDateString()} · 上傳者: {file.uploader?.name}</p>
                              </div>
                            </div>
                            {(user?.role === 'SystemAdmin' || user?.id === file.uploaded_by) && (
                              <button onClick={() => handleDeleteFile(file.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors ml-2 flex-shrink-0">
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {projectFiles.length === 0 && (
                  <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                    目前尚無專案檔案，請點擊右上角新增
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Project Modal */}
      {isEditProjectModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">編輯專案資訊</h3>
              <button onClick={() => setIsEditProjectModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleEditProjectSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {projectSubmitError && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{projectSubmitError}</div>}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">專案代碼</label>
                  <input type="text" value={editProjectData.project_code} onChange={e => setEditProjectData({...editProjectData, project_code: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none" disabled />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">專案名稱</label>
                  <input type="text" value={editProjectData.name} onChange={e => setEditProjectData({...editProjectData, name: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">業主</label>
                  <input type="text" value={editProjectData.owner} onChange={e => setEditProjectData({...editProjectData, owner: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">狀態</label>
                  <select value={editProjectData.status} onChange={e => setEditProjectData({...editProjectData, status: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="評估中">評估中</option>
                    <option value="施工中">施工中</option>
                    <option value="已完工">已完工</option>
                    <option value="停工">停工</option>
                  </select>
                </div>
                {/* <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">流程樣板</label>
                  <select 
                    value={editProjectData.template_id} 
                    onChange={e => setEditProjectData({...editProjectData, template_id: e.target.value})} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="" disabled>未選擇樣板</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div> */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">發起日期</label>
                  <input type="date" value={editProjectData.start_date} onChange={e => setEditProjectData({...editProjectData, start_date: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">預計結束日期</label>
                  <input type="date" value={editProjectData.target_date} onChange={e => setEditProjectData({...editProjectData, target_date: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">設置容量</label>
                  <input type="text" value={editProjectData.capacity || ''} onChange={e => setEditProjectData({...editProjectData, capacity: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. 3333 kW" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">工程地點</label>
                  <input type="text" value={editProjectData.address || ''} onChange={e => setEditProjectData({...editProjectData, address: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="例如: 台中市西屯區..." />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">專案內容</label>
                  <textarea value={editProjectData.content} onChange={e => setEditProjectData({...editProjectData, content: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" rows={3}></textarea>
                </div>

                {/* Rep Assignment section */}
                <div className="col-span-2 pt-2 border-t mt-2">
                  <h4 className="text-sm font-bold text-slate-700 mb-3">負責人指派</h4>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">業務人員</label>
                  <select value={editProjectData.sales_rep_id} onChange={e => setEditProjectData({...editProjectData, sales_rep_id: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">-- 未指派 --</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.department?.name || '無'})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">設計負責人</label>
                  <select value={editProjectData.design_rep_id} onChange={e => setEditProjectData({...editProjectData, design_rep_id: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">-- 未指派 --</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.department?.name || '無'})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">採購負責人</label>
                  <select value={editProjectData.procurement_rep_id} onChange={e => setEditProjectData({...editProjectData, procurement_rep_id: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">-- 未指派 --</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.department?.name || '無'})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">工務負責人</label>
                  <select value={editProjectData.eng_rep_id} onChange={e => setEditProjectData({...editProjectData, eng_rep_id: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">-- 未指派 --</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.department?.name || '無'})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">鋼構負責人</label>
                  <select value={editProjectData.steel_rep_id} onChange={e => setEditProjectData({...editProjectData, steel_rep_id: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">-- 未指派 --</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.department?.name || '無'})</option>)}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
                <button type="button" onClick={() => setIsEditProjectModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">取消</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">儲存變更</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Modal (Keep existing) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">{selectedLog ? '編輯日誌' : '新增日誌'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleLogSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {submitError && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{submitError}</div>}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">部門</label>
                  <input type="text" readOnly value={selectedLog ? selectedLog.department : user?.department} className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-500 rounded-lg outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">工項 (必填)</label>
                  <input required type="text" value={formData.task_item} onChange={e => setFormData({...formData, task_item: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="例如: 支架安裝" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">詳細工項</label>
                  <textarea value={formData.sub_task} onChange={e => setFormData({...formData, sub_task: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" rows={2} placeholder="工作細項描述"></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">開始時間 (必填)</label>
                  <input required type="datetime-local" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">預計結束時間</label>
                  <input type="datetime-local" value={formData.est_end_time} onChange={e => setFormData({...formData, est_end_time: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">實際結束時間</label>
                  <input type="datetime-local" value={formData.act_end_time} onChange={e => setFormData({...formData, act_end_time: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">預計工作天數</label>
                  <input type="number" step="0.1" value={formData.est_days} onChange={e => setFormData({...formData, est_days: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="例如: 1.5" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">上傳佐證附件 (最多 6 張照片/施工圖)</label>
                  <input type="file" multiple onChange={e => {
                    const selected = e.target.files ? Array.from(e.target.files) : [];
                    if (selected.length > 6) {
                      alert('最多只能上傳 6 個檔案');
                      e.target.value = '';
                      setFiles([]);
                    } else {
                      setFiles(selected);
                    }
                  }} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" accept="image/*,.pdf" />
                  
                  {previewUrls.length > 0 && (
                    <div className="flex gap-2 flex-wrap mt-3">
                      {previewUrls.map((url, idx) => (
                        <div key={idx} className="relative w-16 h-16 rounded-md overflow-hidden border border-slate-200 shadow-sm">
                          {files[idx]?.type.startsWith('image/') ? (
                            <img src={url} alt={`預覽 ${idx + 1}`} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-500 text-xs">檔案</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedLog?.attachment && files.length === 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-slate-500 mb-2">已上傳的附件:</p>
                      <div className="flex gap-2 flex-wrap">
                        {(() => {
                          try {
                            const paths = JSON.parse(selectedLog.attachment);
                            if (Array.isArray(paths)) {
                              return paths.map((path: string, idx: number) => {
                                const isImage = path.match(/\.(jpeg|jpg|gif|png|webp)$/i);
                                return isImage ? (
                                  <a key={idx} href={`${path}`} target="_blank" rel="noopener noreferrer" className="block relative w-16 h-16 rounded-md overflow-hidden border border-slate-200 hover:border-blue-500 transition-colors shadow-sm">
                                    <img src={`${path}`} alt={`附件 ${idx + 1}`} className="w-full h-full object-cover" />
                                  </a>
                                ) : (
                                  <a key={idx} href={`${path}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-200 h-fit">
                                    附件 {idx + 1}
                                  </a>
                                );
                              });
                            }
                          } catch(e) {}
                          
                          const isLegacyImage = selectedLog.attachment.match(/\.(jpeg|jpg|gif|png|webp)$/i);
                          return isLegacyImage ? (
                            <a href={`${selectedLog.attachment}`} target="_blank" rel="noopener noreferrer" className="block relative w-16 h-16 rounded-md overflow-hidden border border-slate-200 hover:border-blue-500 transition-colors shadow-sm">
                              <img src={`${selectedLog.attachment}`} alt="附件" className="w-full h-full object-cover" />
                            </a>
                          ) : (
                            <a href={`${selectedLog.attachment}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-200 h-fit">
                              查看現有附件
                            </a>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">取消</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">{selectedLog ? '儲存變更' : '確認新增'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">新增任務</h3>
              <button onClick={() => setIsTaskModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleTaskSubmit} className="p-6 space-y-4">
              {taskSubmitError && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{taskSubmitError}</div>}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">任務名稱 (必填)</label>
                <input required type="text" value={taskFormData.name} onChange={e => setTaskFormData({...taskFormData, name: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">任務描述</label>
                <textarea value={taskFormData.description} onChange={e => setTaskFormData({...taskFormData, description: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">預估工時 (小時)</label>
                  <input type="number" step="0.5" value={taskFormData.estimated_hours} onChange={e => setTaskFormData({...taskFormData, estimated_hours: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">權重分數 (1-5)</label>
                  <input type="number" min="1" max="5" required value={taskFormData.weight} onChange={e => setTaskFormData({...taskFormData, weight: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">狀態</label>
                <select value={taskFormData.status} onChange={e => setTaskFormData({...taskFormData, status: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="未開始">未開始</option>
                  <option value="進行中">進行中</option>
                  <option value="已完成">已完成</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">從任務庫快速帶寫 (可選)</label>
                <select 
                  onChange={e => {
                    const val = e.target.value;
                    if (val) {
                      setTaskFormData({...taskFormData, name: val});
                    }
                  }} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mb-4 bg-blue-50/50"
                  defaultValue=""
                >
                  <option value="" disabled>-- 點擊選擇標準任務 --</option>
                  {TASK_CATALOG.map(cat => (
                    <optgroup key={cat.department} label={cat.department}>
                      {cat.tasks.map(task => (
                        <option key={task} value={task}>{task}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {projectWorkflow?.template?.nodes && projectWorkflow.template.nodes.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">所屬流程節點 (可選)</label>
                  <select 
                    value={taskFormData.workflow_node_id} 
                    onChange={e => setTaskFormData({...taskFormData, workflow_node_id: e.target.value})} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">-- 無 --</option>
                    {projectWorkflow.template.nodes.filter((n: any) => n.type === 'TASK').map((n: any) => (
                      <option key={n.id} value={n.id}>{n.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">指派人員</label>
                <div className="border border-slate-300 rounded-lg max-h-40 overflow-y-auto p-2 bg-slate-50">
                  {users.map((u: any) => (
                    <label key={u.id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={taskFormData.assignee_ids.includes(u.id)}
                        onChange={(e) => {
                          const newIds = e.target.checked 
                            ? [...taskFormData.assignee_ids, u.id]
                            : taskFormData.assignee_ids.filter(id => id !== u.id);
                          setTaskFormData({ ...taskFormData, assignee_ids: newIds });
                        }}
                      />
                      <span className="text-sm text-slate-700">{u.name} {u.department?.name ? `(${u.department.name})` : ''}</span>
                    </label>
                  ))}
                  {users.length === 0 && <div className="text-sm text-slate-500 p-2 text-center">無可用成員</div>}
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
                <button type="button" onClick={() => setIsTaskModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">取消</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">確認新增</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Work Log Modal */}
      {isWorkLogModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">新增工時紀錄</h3>
              <button onClick={() => setIsWorkLogModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleWorkLogSubmit} className="p-6 space-y-4">
              {workLogSubmitError && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{workLogSubmitError}</div>}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">日期</label>
                <input required type="date" value={workLogFormData.work_date} onChange={e => setWorkLogFormData({...workLogFormData, work_date: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">投入時數 (小時)</label>
                <input required type="number" step="0.5" value={workLogFormData.logged_hours} onChange={e => setWorkLogFormData({...workLogFormData, logged_hours: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="例如: 1.5" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">工作內容簡述</label>
                <textarea value={workLogFormData.description} onChange={e => setWorkLogFormData({...workLogFormData, description: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" rows={3} placeholder="說明這段時間處理的內容..." />
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
                <button type="button" onClick={() => setIsWorkLogModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">取消</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">確認送出</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File Upload Modal */}
      {isFileModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">上傳專案檔案</h3>
              <button onClick={() => setIsFileModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleFileUpload} className="p-6 space-y-4">
              {fileSubmitError && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{fileSubmitError}</div>}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">檔案分類</label>
                <select value={fileCategory} onChange={e => setFileCategory(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                  {FILE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">選擇檔案</label>
                <input type="file" onChange={e => setUploadFile(e.target.files?.[0] || null)} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
                <button type="button" onClick={() => setIsFileModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">取消</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">確認上傳</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetails;
