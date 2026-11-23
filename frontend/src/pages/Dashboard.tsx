import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  Activity, 
  CheckCircle, 
  CheckCircle2,
  Clock, 
  FolderKanban, 
  AlertCircle,
  Briefcase,
  Users,
  Bell,
  Stamp,
  FileText,
  Printer,
  X
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const Dashboard = () => {
  const navigate = useNavigate();
  const { token, user } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [approvalTab, setApprovalTab] = useState<'PENDING' | 'PROCESSED'>('PENDING');
  const [approvingOrder, setApprovingOrder] = useState<any | null>(null);
  const [viewingOrder, setViewingOrder] = useState<any | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const [approveForm, setApproveForm] = useState({
    target_manager_sign: '',
    approval_status: '同意',
    target_manager_comment: '',
    drawing_received_date: '',
    assigned_staff_sign: '',
    remarks: '',
  });

  const fetchDashboardData = async () => {
    try {
      const res = await axios.get('/api/reports/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(res.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchDashboardData();
  }, [token]);

  const handleOpenApprove = (order: any) => {
    setApprovingOrder(order);
    setApproveForm({
      target_manager_sign: order.target_manager_sign || user?.name || '',
      approval_status:
        order.approval_status && order.approval_status !== '待簽核' ? order.approval_status : '同意',
      target_manager_comment: order.target_manager_comment || '',
      drawing_received_date: order.drawing_received_date || '',
      assigned_staff_sign: order.assigned_staff_sign || '',
      remarks: order.remarks || '',
    });
  };

  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingOrder) return;
    if (!approveForm.target_manager_sign.trim()) {
      alert('請輸入受託單位主管簽名');
      return;
    }
    if (approveForm.approval_status === '同意' && !approveForm.drawing_received_date.trim()) {
      alert('簽核為「同意」時，請先點擊右側「蓋下收圖章」蓋章後再確認送出，方可開放生產！');
      return;
    }

    setIsApproving(true);
    try {
      const res = await axios.post(`/api/dispatch-orders/${approvingOrder.id}/approve`, approveForm, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchDashboardData();
      if (viewingOrder && viewingOrder.id === approvingOrder.id) {
        setViewingOrder(res.data);
      }
      setApprovingOrder(null);
    } catch (err: any) {
      alert(err.response?.data?.error || '簽核儲存失敗');
    } finally {
      setIsApproving(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-slate-500 font-medium">載入數據中...</p>
        </div>
      </div>
    );
  }

  const { global, employee, manager } = data;
  const isManager = user?.level && user.level >= 50;

  // Render Global View (For Top Management and Managers)
  const renderGlobalView = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg text-white shadow-lg shadow-indigo-200">
          <Activity size={24} />
        </div>
        <h2 className="text-xl font-bold text-slate-800">重大專案狀態</h2>
      </div>

      <div className="grid grid-cols-1 @md:grid-cols-3 gap-6">
        <div onClick={() => navigate('/projects')} className="cursor-pointer bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-white/40 p-6 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-blue-500/10 blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500 tracking-wider">進行中專案</p>
              <h3 className="text-4xl font-black text-slate-800 mt-2">{global.activeProjects}</h3>
            </div>
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <FolderKanban size={28} />
            </div>
          </div>
        </div>

        <div onClick={() => navigate('/projects')} className="cursor-pointer bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-white/40 p-6 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-emerald-500/10 blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500 tracking-wider">已完工專案</p>
              <h3 className="text-4xl font-black text-slate-800 mt-2">{global.completedProjects}</h3>
            </div>
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
              <CheckCircle size={28} />
            </div>
          </div>
        </div>

        <div onClick={() => navigate('/projects')} className="cursor-pointer bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-white/40 p-6 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-slate-500/10 blur-2xl group-hover:bg-slate-500/20 transition-all"></div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500 tracking-wider">總專案數</p>
              <h3 className="text-4xl font-black text-slate-800 mt-2">{global.totalProjects}</h3>
            </div>
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white shadow-lg shadow-slate-200">
              <Briefcase size={28} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-white/40 overflow-hidden mt-6">
        <div className="bg-indigo-50/50 px-6 py-4 border-b border-indigo-100 flex items-center gap-2">
          <FolderKanban className="text-indigo-600" size={20} />
          <h3 className="font-semibold text-indigo-900">進行中專案輪播</h3>
        </div>
        <div className="p-6 bg-slate-50/50 overflow-hidden relative group">
           <div className="flex gap-6 animate-marquee-seamless group-hover:[animation-play-state:paused] w-max">
             {(() => {
               // Filter active projects
               const activeProjects = global.projects.filter((p: any) => p.status !== '已完工' && p.status !== '停工');
               if (activeProjects.length === 0) {
                 return <div className="text-slate-500 italic">目前沒有進行中的專案</div>;
               }
               // Duplicate list to create seamless loop if there's enough items to scroll,
               // but just doing it anyway for the marquee effect.
               const displayList = [...activeProjects, ...activeProjects, ...activeProjects];
                return displayList.map((p: any, idx: number) => (
                 <div key={`${p.id}-${idx}`} onClick={() => navigate(`/projects/${p.id}`)} className="cursor-pointer w-80 shrink-0 bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-bold text-slate-800 text-lg truncate pr-2">{p.name}</h4>
                      <span className="text-xs font-medium px-2 py-1 bg-indigo-50 text-indigo-600 rounded-md whitespace-nowrap">
                        {p.status}
                      </span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs text-slate-500 mb-1 font-medium">
                          <span>專案進度</span>
                          <span>{p.progress_pct || 0}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div className="bg-gradient-to-r from-blue-400 to-indigo-500 h-2 rounded-full" style={{ width: `${p.progress_pct || 0}%` }}></div>
                        </div>
                      </div>
                      <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg truncate border border-slate-100 font-medium flex items-center gap-2" title={p.dailyLogs?.[0]?.task_item || '尚未新增工項'}>
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></div>
                        最新: {p.dailyLogs?.[0]?.task_item || '尚未新增工項'}
                      </div>
                    </div>
                 </div>
               ));
             })()}
           </div>
        </div>
      </div>
    </div>
  );

  // Render Manager View
  const pendingOrders: any[] = manager?.pendingDispatchOrders || [];
  const processedOrders: any[] = manager?.processedDispatchOrders || [];
  const displayedApprovalOrders = approvalTab === 'PENDING' ? pendingOrders : processedOrders;

  const renderManagerView = () => (
    <div className="space-y-6 mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg text-white shadow-lg shadow-orange-200">
          <Users size={24} />
        </div>
        <h2 className="text-xl font-bold text-slate-800">團隊負載與待辦簽核</h2>
      </div>

      <div className="grid grid-cols-1 @lg:grid-cols-2 gap-6">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-white/40 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6">團隊異常延宕警示</h3>
          {manager.teamOverdueTasks.length > 0 ? (
            <div className="space-y-3">
              {manager.teamOverdueTasks.map((task: any) => (
                <div key={task.id} className="flex items-center justify-between p-4 bg-red-50/50 border border-red-100 rounded-xl hover:bg-red-50 transition-colors">
                  <div>
                    <h4 className="font-bold text-red-900">{task.name}</h4>
                    <p className="text-sm text-red-600 mt-1">負責人: {task.assignee?.name || '未指派'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-red-500 bg-red-100 px-2 py-1 rounded-full">
                      逾期: {new Date(task.due_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <CheckCircle size={48} className="text-emerald-200 mb-4" />
              <p>目前團隊無異常延宕任務</p>
            </div>
          )}
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-white/40 p-6 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Stamp className="text-rose-600" size={20} />
              <h3 className="text-lg font-bold text-slate-800">待辦簽核專區（受託單位派工單）</h3>
              {pendingOrders.length > 0 && (
                <span className="px-2.5 py-0.5 bg-rose-600 text-white text-xs font-extrabold rounded-full shadow-sm">
                  {pendingOrders.length} 筆待簽核
                </span>
              )}
            </div>

            <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-bold">
              <button
                type="button"
                onClick={() => setApprovalTab('PENDING')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  approvalTab === 'PENDING'
                    ? 'bg-white text-rose-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                待簽核 ({pendingOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setApprovalTab('PROCESSED')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  approvalTab === 'PROCESSED'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                已簽核紀錄 ({processedOrders.length})
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-500 mb-4">
            {user?.level && user.level >= 100
              ? '管理員視角：顯示所有部門委託之派工單簽核與收圖章狀態。尚未完成簽核與蓋下收圖章前，製造端無法進行生產報工。'
              : `受託單位【${user?.department || '本部門'}】主管簽核區：請針對委託貴部門之派工單進行簽核並蓋下收圖章，簽核同意並蓋章後始開放製造生產。`}
          </p>

          {displayedApprovalOrders.length > 0 ? (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {displayedApprovalOrders.map((order: any) => {
                const isApprovedAndStamped =
                  order.approval_status === '同意' &&
                  Boolean(order.drawing_received_date && String(order.drawing_received_date).trim() !== '');
                const itemsCount = Array.isArray(order.items) ? order.items.length : 0;

                return (
                  <div
                    key={order.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isApprovedAndStamped
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : order.approval_status === '退回'
                        ? 'bg-red-50/40 border-red-200'
                        : 'bg-rose-50/40 border-rose-200 hover:border-rose-300 shadow-sm'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-extrabold text-sm text-slate-800 bg-white px-2.5 py-0.5 rounded border border-slate-200">
                            {order.dispatch_no}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-xs font-bold rounded border ${
                              order.urgency === '急單(3日)'
                                ? 'bg-red-50 text-red-600 border-red-200'
                                : order.urgency === '長期'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {order.urgency}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-xs font-bold rounded ${
                              order.approval_status === '同意'
                                ? 'bg-emerald-100 text-emerald-700'
                                : order.approval_status === '退回'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            簽核：{order.approval_status || '待簽核'}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-xs font-bold rounded border ${
                              order.drawing_received_date
                                ? 'bg-rose-100 text-rose-700 border-rose-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            {order.drawing_received_date
                              ? `💮 已蓋收圖章 (${order.drawing_received_date})`
                              : '⏳ 未蓋收圖章'}
                          </span>
                        </div>

                        <div className="text-sm font-bold text-slate-800 pt-0.5">
                          專案：{order.project?.project_code} - {order.project?.name || order.site_name || '未指定'}
                        </div>

                        <div className="text-xs text-slate-600 flex flex-wrap gap-x-3 gap-y-1">
                          <span>
                            <strong>需求單位：</strong>{order.request_dept}（{order.requester_name || '-'}）
                          </span>
                          <span>
                            <strong>受託單位：</strong>
                            <span className="text-rose-700 font-bold">{order.target_dept}</span>
                          </span>
                          <span>
                            <strong>加工構件：</strong>{itemsCount} 項
                          </span>
                          <span>
                            <strong>需求日期：</strong>
                            {order.required_date ? new Date(order.required_date).toLocaleDateString('zh-TW') : '-'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setViewingOrder(order)}
                          className="px-3 py-1.5 bg-white border border-slate-300 hover:border-blue-400 hover:text-blue-600 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                        >
                          <FileText size={14} /> 檢視派工單
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenApprove(order)}
                          className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                        >
                          <Stamp size={14} />
                          {isApprovedAndStamped ? '重新簽核 / 修改收圖章' : '簽核 / 蓋收圖章'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
              <CheckCircle size={48} className="text-emerald-200 mb-3" />
              <p className="font-medium">
                {approvalTab === 'PENDING' ? '目前無待簽核的派工單，所有簽核皆已處理完畢' : '尚無已簽核的派工單紀錄'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render Employee View
  const renderEmployeeView = () => (
    <div className="space-y-6 mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <div className="p-2 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-lg text-white shadow-lg shadow-teal-200">
          <CheckCircle size={24} />
        </div>
        <h2 className="text-xl font-bold text-slate-800">個人工作台</h2>
      </div>

      <div className="grid grid-cols-1 @lg:grid-cols-2 gap-6">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-white/40 p-6 relative overflow-hidden">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
            今日待辦清單
          </h3>
          {employee.myActiveTasks.length > 0 ? (
            <div className="space-y-3">
              {employee.myActiveTasks.slice(0,5).map((task: any) => (
                <div key={task.id} onClick={() => navigate('/tasks')} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-slate-100">
                  <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex-shrink-0"></div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-700">{task.name}</p>
                    {task.project?.name && <p className="text-xs text-slate-500 mt-0.5">{task.project.name}</p>}
                  </div>
                  <div className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-md">
                    {task.status}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-center py-8">太棒了！今日無待辦事項</p>
          )}
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-white/40 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-2 h-6 bg-red-500 rounded-full"></span>
            即將逾期 / 已逾期
          </h3>
          {employee.myOverdueTasks.length > 0 ? (
            <div className="space-y-3">
              {employee.myOverdueTasks.map((task: any) => (
                <div key={task.id} onClick={() => navigate('/tasks')} className="flex items-center gap-4 p-3 bg-red-50/50 rounded-xl border border-red-100 cursor-pointer hover:bg-red-100 transition-colors">
                  <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
                  <div className="flex-1">
                    <p className="font-semibold text-red-900">{task.name}</p>
                    <p className="text-xs text-red-600 mt-0.5">期限: {new Date(task.due_date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <p className="text-slate-400 text-center py-8">沒有即將逾期的任務</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="pb-12 max-w-7xl mx-auto space-y-2">
      {/* Header section */}
      <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 shadow-sm border border-white/60 flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500">
            早安，{user?.name}
          </h1>
          <p className="text-slate-500 mt-1 font-medium">歡迎回到系統，這是您今天的專屬工作區。</p>
        </div>
        <div className="text-right">
          <span className="inline-block px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-bold shadow-inner">
            {user?.department} - {user?.role}
          </span>
        </div>
      </div>

      {isManager && renderGlobalView()}
      {isManager && renderManagerView()}
      {renderEmployeeView()}

      {/* Modal: 檢視 / 列印「元融公司 內部派工委託單」 */}
      {viewingOrder && (() => {
        const viewItems: any[] = Array.isArray(viewingOrder.items) ? viewingOrder.items : [];
        let totalQty = 0;
        let totalUnitW = 0;
        let totalWeight = 0;
        viewItems.forEach((it: any) => {
          const q = parseFloat(String(it?.quantity || '').replace(/,/g, ''));
          const uw = parseFloat(String(it?.unit_weight || '').replace(/,/g, ''));
          const tw = parseFloat(String(it?.total_weight || '').replace(/,/g, ''));
          if (!Number.isNaN(q)) totalQty += q;
          if (!Number.isNaN(uw)) totalUnitW += uw;
          if (!Number.isNaN(tw)) totalWeight += tw;
        });

        return (
          <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden">
              <div className="px-6 py-3 bg-slate-800 text-white flex justify-between items-center print:hidden shrink-0">
                <span className="font-bold">派工委託單預覽 — {viewingOrder.dispatch_no}</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleOpenApprove(viewingOrder)}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Stamp size={15} /> 受託單位簽核 / 蓋收圖章
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer size={15} /> 列印 / 另存 PDF
                  </button>
                  <button onClick={() => setViewingOrder(null)} className="text-slate-300 hover:text-white cursor-pointer">
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
                        案場名稱：<span className="underline font-bold">{viewingOrder.category_type === '案場需求' ? (viewingOrder.site_name || viewingOrder.project?.name) : ''}</span>
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
                            {viewItems.map((it: any, i: number) => (
                              <tr key={i}>
                                <td className="border border-black p-1 font-bold">{it.category}</td>
                                <td className="border border-black p-1 font-mono">{it.member_no || it.description}</td>
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
                              <td className="border border-black p-1 text-right">{(Math.round(totalQty * 100) / 100).toLocaleString()}</td>
                              <td colSpan={3} className="border border-black p-1"></td>
                              <td className="border border-black p-1 text-right font-mono">{(Math.round(totalUnitW * 100) / 100).toLocaleString()}</td>
                              <td className="border border-black p-1 text-right font-mono">{(Math.round(totalWeight * 100) / 100).toLocaleString()}</td>
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
                      <td className="border border-black p-2 font-bold h-12">需求單位主管簽核</td>
                      <td colSpan={2} className="border border-black p-2 text-center text-lg font-bold">{viewingOrder.req_manager_sign}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 font-bold h-14">簽核意見</td>
                      <td colSpan={2} className="border border-black p-2">{viewingOrder.req_manager_comment}</td>
                    </tr>

                    {/* Section 四 */}
                    <tr>
                      <td rowSpan={4} className="border border-black w-10 text-center font-bold">四</td>
                      <td className="border border-black p-2 font-bold h-12">受託單位主管簽名</td>
                      <td className="border border-black p-2 text-center font-bold">
                        <div>{viewingOrder.target_manager_sign}</div>
                        <div className="text-xs font-bold mt-1">
                          簽核：{viewingOrder.approval_status === '同意' ? '☑' : '□'}同意 &nbsp;
                          {viewingOrder.approval_status === '退回' ? '☑' : '□'}退回
                        </div>
                      </td>
                      <td rowSpan={4} className="border border-black p-2 text-center align-middle w-64">
                        <div className="text-xs font-bold text-slate-600 mb-1.5">受託單位收圖章</div>
                        {viewingOrder.drawing_received_date ? (
                          <div className="inline-flex flex-col items-center justify-center w-28 h-28 rounded-full border-2 border-red-600 text-red-600 text-xs font-bold leading-tight shadow-sm">
                            <span>元融科技</span>
                            <span>{viewingOrder.target_dept || '受託單位'}</span>
                            <span className="my-1 border-y border-red-500 px-1 py-0.5 text-[11px]">
                              {viewingOrder.drawing_received_date}
                            </span>
                            <span className="text-sm">收圖章</span>
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-center justify-center w-28 h-28 rounded-full border-2 border-dashed border-slate-300 text-slate-400 text-xs font-bold leading-tight">
                            <span>{viewingOrder.target_dept || '受託單位'}</span>
                            <span className="my-1 text-[11px]">尚未蓋章</span>
                            <span>(收圖章)</span>
                          </div>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 font-bold h-14">簽核意見</td>
                      <td className="border border-black p-2">{viewingOrder.target_manager_comment}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 font-bold h-12">交辦人員簽名</td>
                      <td className="border border-black p-2">{viewingOrder.assigned_staff_sign}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 font-bold h-14">備註</td>
                      <td className="border border-black p-2">{viewingOrder.remarks}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal: 受託單位主管簽核與蓋收圖章專屬介面 */}
      {approvingOrder && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[110] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-gradient-to-r from-rose-600 to-rose-700 text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <Stamp size={22} />
                <div>
                  <h4 className="text-base font-bold">受託單位主管簽核與蓋收圖章</h4>
                  <p className="text-xs text-rose-100">
                    派工單號：{approvingOrder.dispatch_no} ｜ 需求單位：{approvingOrder.request_dept} ➔ 受託單位：{approvingOrder.target_dept}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setApprovingOrder(null)}
                className="text-rose-100 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleApproveSubmit} className="p-6 space-y-5">
              {/* 派工單摘要 */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="col-span-2">
                  <div className="text-slate-400 font-medium">所屬專案</div>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {approvingOrder.project?.project_code} - {approvingOrder.project?.name || approvingOrder.site_name || '-'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium">開單人</div>
                  <div className="font-bold text-slate-800 mt-0.5">{approvingOrder.requester_name || '-'}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium">需求日期</div>
                  <div className="font-bold text-rose-600 mt-0.5">
                    {approvingOrder.required_date ? new Date(approvingOrder.required_date).toLocaleDateString('zh-TW') : '-'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                {/* 左側：簽核表單 */}
                <div className="md:col-span-7 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      受託單位（{approvingOrder.target_dept}）主管簽名 *
                    </label>
                    <input
                      type="text"
                      required
                      value={approveForm.target_manager_sign}
                      onChange={e => setApproveForm({ ...approveForm, target_manager_sign: e.target.value })}
                      placeholder="請輸入受託單位主管姓名"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">簽核結果 *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['同意', '退回'] as const).map(status => (
                        <button
                          key={status}
                          type="button"
                          onClick={() =>
                            setApproveForm(prev => ({
                              ...prev,
                              approval_status: status,
                              drawing_received_date:
                                status === '退回'
                                  ? ''
                                  : prev.drawing_received_date || todayStr,
                            }))
                          }
                          className={`py-2.5 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            approveForm.approval_status === status
                              ? status === '同意'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-red-600 text-white border-red-600 shadow-sm'
                              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {status === '同意' && <CheckCircle2 size={14} />}
                          {status === '同意' ? '同意（開放生產）' : '退回（不開放生產）'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">簽核意見</label>
                    <textarea
                      rows={2}
                      value={approveForm.target_manager_comment}
                      onChange={e => setApproveForm({ ...approveForm, target_manager_comment: e.target.value })}
                      placeholder="可填寫受託單位主管簽核意見或退回原因..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">交辦人員簽名</label>
                      <input
                        type="text"
                        value={approveForm.assigned_staff_sign}
                        onChange={e => setApproveForm({ ...approveForm, assigned_staff_sign: e.target.value })}
                        placeholder="指派/交辦人員"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">備註</label>
                      <input
                        type="text"
                        value={approveForm.remarks}
                        onChange={e => setApproveForm({ ...approveForm, remarks: e.target.value })}
                        placeholder="備註事項"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 右側：受託單位收圖章互動蓋章區 */}
                <div className="md:col-span-5 bg-rose-50/60 border-2 border-rose-200 rounded-xl p-4 flex flex-col items-center text-center space-y-3">
                  <div className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                    <Stamp size={15} /> 受託單位（{approvingOrder.target_dept}）收圖章
                  </div>

                  <div className="py-2">
                    {approveForm.drawing_received_date ? (
                      <div className="inline-flex flex-col items-center justify-center w-32 h-32 rounded-full border-4 border-red-600 bg-white text-red-600 text-xs font-extrabold leading-tight shadow-md select-none">
                        <span className="tracking-widest">元融科技</span>
                        <span className="text-sm">{approvingOrder.target_dept || '受託單位'}</span>
                        <span className="my-1 border-y-2 border-red-500 px-2 py-0.5 text-xs font-mono">
                          {approveForm.drawing_received_date}
                        </span>
                        <span className="text-base tracking-widest">收圖章</span>
                      </div>
                    ) : (
                      <div className="inline-flex flex-col items-center justify-center w-32 h-32 rounded-full border-2 border-dashed border-slate-300 bg-white/80 text-slate-400 text-xs font-bold leading-tight">
                        <span>{approvingOrder.target_dept || '受託單位'}</span>
                        <span className="my-1 text-[11px]">尚未蓋下收圖章</span>
                        <span>請點擊下方蓋章</span>
                      </div>
                    )}
                  </div>

                  <div className="w-full space-y-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setApproveForm({ ...approveForm, drawing_received_date: todayStr })}
                        className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                      >
                        <Stamp size={14} /> 蓋下收圖章 (今日)
                      </button>
                      {approveForm.drawing_received_date && (
                        <button
                          type="button"
                          onClick={() => setApproveForm({ ...approveForm, drawing_received_date: '' })}
                          className="py-2 px-2.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded-lg text-xs font-bold cursor-pointer"
                        >
                          取消蓋章
                        </button>
                      )}
                    </div>
                    <div className="text-left">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">收圖章日期（可手動調整）</label>
                      <input
                        type="date"
                        value={approveForm.drawing_received_date}
                        onChange={e => setApproveForm({ ...approveForm, drawing_received_date: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-rose-200 rounded-lg text-xs bg-white font-mono outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setApprovingOrder(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-bold cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isApproving}
                  className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-bold shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Stamp size={16} />
                  {isApproving ? '簽核儲存中...' : '確認簽核並蓋收圖章'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
