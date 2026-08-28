import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { CheckSquare, Plus, Clock, Search, FolderKanban, Trash2 } from 'lucide-react';

const Tasks = () => {
  const { token, user } = useAuthStore();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'PROJECT' | 'GENERAL' | 'HISTORY'>('PROJECT');
  const [historyTab, setHistoryTab] = useState<'PROJECT' | 'GENERAL'>('PROJECT');

  // Form states for creating a new general task
  const [isCreating, setIsCreating] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState(user?.id || '');

  // Task processing modal states
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [workLogs, setWorkLogs] = useState<any[]>([]);
  const [newLogDesc, setNewLogDesc] = useState('');
  const [newLogHours, setNewLogHours] = useState('');
  const [markAsCompleted, setMarkAsCompleted] = useState(false);
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);

  useEffect(() => {
    fetchTasks();
    if (user?.level && user.level >= 50) {
      fetchUsers();
    }
  }, [token]);

  const fetchTasks = async () => {
    try {
      const res = await axios.get('/api/tasks', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // The API returns all tasks. We'll filter them here to only show tasks assigned to me, 
      // or if I'm a manager, tasks created by me.
      const myTasks = res.data.filter((t: any) => {
        const isAssignee = t.assignees && t.assignees.some((a: any) => a.id === user?.id);
        const isCreator = t.creator_id === user?.id;
        return isAssignee || isCreator;
      });
      setTasks(myTasks);
    } catch (error) {
      console.error('Failed to fetch tasks', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data);
    } catch (error) {
      console.error('Failed to fetch users', error);
    }
  };

  const handleCreateGeneralTask = async () => {
    if (!newTaskName) return;
    try {
      await axios.post('/api/tasks', {
        name: newTaskName,
        task_type: 'GENERAL',
        due_date: newDueDate || null,
        assignee_ids: selectedAssignee ? [selectedAssignee] : []
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      setIsCreating(false);
      setNewTaskName('');
      setNewDueDate('');
      fetchTasks();
    } catch (error) {
      alert('新增一般任務失敗');
    }
  };

  const handleStatusChange = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === '已完成' ? '未開始' : '已完成';
    try {
      await axios.put(`/api/tasks/${id}`, { status: nextStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTasks();
    } catch (error) {
      console.error('Failed to update task', error);
    }
  };

  const handleAcceptTask = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await axios.post(`/api/tasks/${id}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTasks();
    } catch (error) {
      console.error('Failed to accept task', error);
      alert('接取任務失敗');
    }
  };

  
  const handleDeleteTask = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('確定要刪除此任務嗎？此動作無法復原！')) return;
    try {
      await axios.delete(`/api/tasks/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || '刪除失敗');
    }
  };

  const openTaskModal = async (task: any) => {
    setSelectedTask(task);
    setNewLogDesc('');
    setNewLogHours('');
    setMarkAsCompleted(task.status === '已完成');
    
    try {
      const res = await axios.get(`/api/tasks/${task.id}/worklogs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWorkLogs(res.data);
    } catch (error) {
      console.error('Failed to fetch worklogs', error);
      setWorkLogs([]);
    }
  };

  const closeTaskModal = () => {
    setSelectedTask(null);
    setWorkLogs([]);
  };

  const handleSubmitWorkLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !newLogDesc) return;
    setIsSubmittingLog(true);
    
    try {
      await axios.post(`/api/tasks/${selectedTask.id}/worklogs`, {
        description: newLogDesc,
        logged_hours: newLogHours,
        is_completed: markAsCompleted
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      closeTaskModal();
      fetchTasks();
    } catch (error) {
      alert('新增處理紀錄失敗');
    } finally {
      setIsSubmittingLog(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-500">載入中...</div>;

  const tenDaysAgo = new Date();
  tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

  const activeTasks = tasks.filter(t => !(t.status === '已完成' && new Date(t.updated_at) < tenDaysAgo));
  const historyTasks = tasks.filter(t => t.status === '已完成' && new Date(t.updated_at) < tenDaysAgo);

  const filteredTasks = activeTab === 'HISTORY'
    ? historyTasks.filter(t => t.task_type === historyTab)
    : activeTasks.filter(t => t.task_type === activeTab);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">任務管理中心</h1>
        
        {activeTab === 'GENERAL' && (
          <button 
            onClick={() => setIsCreating(true)}
            className="bg-indigo-600 text-white p-2 md:px-4 md:py-2 rounded-full md:rounded-lg shadow-lg md:shadow-md hover:bg-indigo-700 transition flex items-center justify-center"
          >
            <Plus size={20} />
            <span className="hidden md:inline ml-2">新增一般任務</span>
          </button>
        )}
      </div>

      <div className="flex border-b border-slate-200 mb-6 shrink-0 overflow-x-auto hide-scrollbar snap-x">
        <button
          onClick={() => setActiveTab('PROJECT')}
          className={`w-1/2 shrink-0 md:w-auto px-2 md:px-6 py-3 font-medium text-sm flex items-center justify-center gap-2 border-b-2 transition-colors snap-start ${activeTab === 'PROJECT' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
        >
          <FolderKanban size={18} className="shrink-0" /> 
          <span className="whitespace-nowrap">專案型任務</span>
        </button>
        <button
          onClick={() => setActiveTab('GENERAL')}
          className={`w-1/2 shrink-0 md:w-auto px-2 md:px-6 py-3 font-medium text-sm flex items-center justify-center gap-2 border-b-2 transition-colors snap-start ${activeTab === 'GENERAL' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
        >
          <CheckSquare size={18} className="shrink-0" />
          <span className="whitespace-nowrap">一般型交辦任務</span>
        </button>
        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`w-1/2 shrink-0 md:w-auto px-2 md:px-6 py-3 font-medium text-sm flex items-center justify-center gap-2 border-b-2 transition-colors snap-start ${activeTab === 'HISTORY' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
        >
          <Clock size={18} className="shrink-0" />
          <span className="whitespace-nowrap">歷史紀錄</span>
        </button>
      </div>

      {isCreating && activeTab === 'GENERAL' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
          <div className="bg-white w-full md:w-[480px] rounded-t-2xl md:rounded-2xl p-6 shadow-2xl pb-safe">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">建立日常行政任務</h3>
              <button onClick={() => setIsCreating(false)} className="text-slate-500 text-xl font-bold p-2">&times;</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">任務名稱 *</label>
                <input type="text" value={newTaskName} onChange={e => setNewTaskName(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500" placeholder="輸入任務名稱" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">期限 (選填)</label>
                <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500" />
              </div>
              {user?.level && user.level >= 50 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">指派對象</label>
                  <select value={selectedAssignee} onChange={e => setSelectedAssignee(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 bg-white">
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.department?.name || '無'})</option>
                    ))}
                  </select>
                </div>
              )}
              <button onClick={handleCreateGeneralTask} className="w-full bg-indigo-600 text-white font-medium py-3 rounded-lg shadow-md hover:bg-indigo-700 active:scale-95 transition-all mt-4">
                建立任務
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto -mx-4 px-4 md:mx-0 md:px-0 space-y-6 pb-20 md:pb-0">

      {activeTab === 'HISTORY' && (
        <div className="flex gap-4 mb-4">
          <button 
            onClick={() => setHistoryTab('PROJECT')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${historyTab === 'PROJECT' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            專案型任務
          </button>
          <button 
            onClick={() => setHistoryTab('GENERAL')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${historyTab === 'GENERAL' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            一般型交辦任務
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 @md:grid-cols-2 @lg:grid-cols-3 gap-4">
        {filteredTasks.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
            {activeTab === 'PROJECT' ? '目前沒有專案型任務' : 
             activeTab === 'GENERAL' ? '目前沒有一般型任務' : '目前沒有歷史紀錄'}
          </div>
        ) : (
          filteredTasks.map(task => {
            const acceptedIds = task.accepted_by?.map((u: any) => u.id) || [];
            const isAcceptedByMe = acceptedIds.includes(user?.id);
            const unacceptedUsers = task.assignees?.filter((a: any) => !acceptedIds.includes(a.id)) || [];

            return (
              <div 
                key={task.id} 
                onClick={() => openTaskModal(task)}
                className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all active:bg-slate-50 flex flex-col relative"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3 w-3/4">
                    <div className="bg-indigo-50 p-2.5 rounded-lg text-indigo-600 shrink-0">
                      {task.task_type === 'PROJECT' ? <FolderKanban size={22} /> : <CheckSquare size={22} />}
                    </div>
                    <div className="min-w-0">
                      <h4 className={`font-bold text-lg leading-tight truncate ${task.status === '已完成' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {task.name}
                      </h4>
                      {task.project && (
                        <span className="text-xs text-slate-500 font-mono mt-1 block truncate">
                          專案: {task.project.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {user?.role === 'SystemAdmin' && (
                      <button 
                        onClick={(e) => handleDeleteTask(e, task.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="刪除"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap shrink-0 ${task.status === '已完成' ? 'bg-green-100 text-green-700' : task.status === '進行中' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                      {task.status}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3 mt-auto pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 truncate max-w-[65%]">
                      負責人: {task.assignees?.map((a:any) => a.name).join(', ') || '未指派'}
                    </span>
                    {task.due_date && (
                      <span className={`text-xs flex items-center gap-1 shrink-0 ${new Date(task.due_date) < new Date() && task.status !== '已完成' ? 'text-red-500 font-bold' : 'text-slate-500'}`}>
                        <Clock size={12} /> {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  
                  {unacceptedUsers.length > 0 && task.status !== '已完成' && (
                    <div className="text-xs text-amber-600 font-medium bg-amber-50 px-2.5 py-1.5 rounded-lg inline-block">
                      尚未接取: {unacceptedUsers.map((u:any) => u.name).join(', ')}
                    </div>
                  )}

                  {!isAcceptedByMe && task.assignees?.some((a:any) => a.id === user?.id) && task.status !== '已完成' && (
                    <div className="pt-2 mt-2 border-t border-slate-50">
                      <button 
                        onClick={(e) => handleAcceptTask(e, task.id)}
                        className="w-full py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
                      >
                        接取任務
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      </div>
      
      {activeTab === 'GENERAL' && (
        <div className="md:hidden fixed bottom-6 right-6 z-40">
           <button 
            onClick={() => setIsCreating(true)}
            className="bg-indigo-600 text-white w-14 h-14 rounded-full shadow-xl hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center"
          >
            <Plus size={28} />
          </button>
        </div>
      )}

      {/* Task Processing Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <CheckSquare className="text-indigo-600" size={20} />
                任務處理: {selectedTask.name}
              </h3>
              <button onClick={closeTaskModal} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
              {/* Task Details */}
              <div className="mb-6 bg-white p-4 rounded-lg border border-slate-200">
                <div className="text-sm text-slate-500 mb-1">任務說明</div>
                <div className="text-slate-700 whitespace-pre-wrap">{selectedTask.description || '無詳細說明'}</div>
                <div className="mt-3 flex gap-3 text-sm">
                  <span className={`px-2 py-1 rounded bg-slate-100 font-medium ${selectedTask.status === '已完成' ? 'text-emerald-600' : 'text-slate-600'}`}>狀態: {selectedTask.status}</span>
                  {selectedTask.due_date && <span className="px-2 py-1 rounded bg-slate-100 text-slate-600">期限: {new Date(selectedTask.due_date).toLocaleDateString()}</span>}
                </div>
              </div>

              {/* Past Work Logs */}
              {workLogs.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2"><Clock size={16} /> 歷史處理紀錄</h4>
                  <div className="space-y-3">
                    {workLogs.map(log => (
                      <div key={log.id} className="bg-white p-3 rounded-lg border border-slate-200 text-sm">
                        <div className="flex justify-between items-center mb-1 text-slate-500">
                          <span className="font-medium text-indigo-700">{log.user?.name}</span>
                          <span>{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                        <div className="text-slate-700">{log.description}</div>
                        {log.logged_hours > 0 && (
                          <div className="mt-1 text-xs text-slate-400">處理時數: {log.logged_hours} 小時</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Work Log Form */}
              <form onSubmit={handleSubmitWorkLog} className="bg-white p-5 rounded-xl border border-indigo-100 shadow-sm relative">
                <h4 className="font-bold text-indigo-900 mb-4">輸入今日處理進度</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">今日任務處理細項 <span className="text-red-500">*</span></label>
                    <textarea 
                      required
                      value={newLogDesc}
                      onChange={e => setNewLogDesc(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px]"
                      placeholder="請輸入今天處理了哪些項目、遇到了什麼問題或取得了什麼進展..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 @md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">處理時數 (選填)</label>
                      <input 
                        type="number" 
                        step="0.5"
                        min="0"
                        value={newLogHours}
                        onChange={e => setNewLogHours(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="例如: 2.5"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 pb-2 border-t border-slate-100">
                    <input 
                      type="checkbox" 
                      id="markCompleted" 
                      checked={markAsCompleted}
                      onChange={e => setMarkAsCompleted(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="markCompleted" className="text-sm font-medium text-slate-700 cursor-pointer">
                      今天是否已完成該任務？ (勾選後狀態將改為已完成)
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
                  <button type="button" onClick={closeTaskModal} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium">取消</button>
                  <button type="submit" disabled={isSubmittingLog} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2">
                    {isSubmittingLog ? '儲存中...' : '送出處理紀錄'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
