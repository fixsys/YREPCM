import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  Activity, 
  CheckCircle, 
  Clock, 
  FolderKanban, 
  AlertCircle,
  Briefcase,
  Users,
  Bell
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const Dashboard = () => {
  const navigate = useNavigate();
  const { token, user } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
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
    if (token) fetchData();
  }, [token]);

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
  const renderManagerView = () => (
    <div className="space-y-6 mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg text-white shadow-lg shadow-orange-200">
          <Users size={24} />
        </div>
        <h2 className="text-xl font-bold text-slate-800">團隊負載與異常警示</h2>
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

        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-white/40 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6">待辦簽核專區</h3>
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
             <Activity size={48} className="text-slate-200 mb-4" />
             <p>所有簽核皆已處理完畢</p>
          </div>
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
    </div>
  );
};

export default Dashboard;
