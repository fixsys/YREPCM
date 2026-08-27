import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { Save, Plus, Trash2, Settings as SettingsIcon, Mail, Users, Shield, CheckSquare, X } from 'lucide-react';

const AVAILABLE_MODULES = [
  { id: 'dashboard', name: '總覽看板' },
  { id: 'crm', name: '業務開發' },
  { id: 'onsite', name: '現場報工' },
  { id: 'budget', name: '預算分析' },
  { id: 'tasks', name: '個人任務' },
  { id: 'projects', name: '專案管理' },
  { id: 'simulators', name: '設計模擬器' },
  { id: 'analytics', name: '報表與分析' }
];

const SystemSettings = () => {
  const { token, user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('smtp');
  
  // Settings State
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  
  // Depts & Roles
  const [departments, setDepartments] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  
  // Form states
  const [newDeptName, setNewDeptName] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleLevel, setNewRoleLevel] = useState('');

  // Permissions Modal state
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<any>(null);
  const [deptPermissions, setDeptPermissions] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      const [settingsRes, deptRes, roleRes] = await Promise.all([
        axios.get('/api/settings', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/settings/departments', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/settings/roles', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      
      const settings = settingsRes.data;
      setSmtpHost(settings.find((s: any) => s.key === 'SMTP_HOST')?.value || '');
      setSmtpPort(settings.find((s: any) => s.key === 'SMTP_PORT')?.value || '');
      setSmtpUser(settings.find((s: any) => s.key === 'SMTP_USER')?.value || '');
      setSmtpPass(settings.find((s: any) => s.key === 'SMTP_PASS')?.value || '');
      
      setDepartments(deptRes.data);
      setRoles(roleRes.data);
    } catch (error) {
      console.error('Failed to fetch settings data', error);
    }
  };

  const handleSaveSmtp = async () => {
    try {
      await axios.post('/api/settings', {
        settings: [
          { key: 'SMTP_HOST', value: smtpHost },
          { key: 'SMTP_PORT', value: smtpPort },
          { key: 'SMTP_USER', value: smtpUser },
          { key: 'SMTP_PASS', value: smtpPass },
        ]
      }, { headers: { Authorization: `Bearer ${token}` } });
      alert('SMTP 設定已儲存');
    } catch (error) {
      alert('儲存失敗');
    }
  };

  const handleAddDept = async () => {
    if (!newDeptName) return;
    try {
      await axios.post('/api/settings/departments', { name: newDeptName }, { headers: { Authorization: `Bearer ${token}` } });
      setNewDeptName('');
      fetchData();
    } catch (error) {
      alert('新增部門失敗');
    }
  };

  const handleDeleteDept = async (id: string) => {
    if (!confirm('確定刪除此部門？')) return;
    try {
      await axios.delete(`/api/settings/departments/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchData();
    } catch (error) {
      alert('刪除失敗，可能有使用者正在使用該部門');
    }
  };

  const handleAddRole = async () => {
    if (!newRoleName || !newRoleLevel) return;
    try {
      await axios.post('/api/settings/roles', { name: newRoleName, level: newRoleLevel }, { headers: { Authorization: `Bearer ${token}` } });
      setNewRoleName('');
      setNewRoleLevel('');
      fetchData();
    } catch (error) {
      alert('新增角色失敗');
    }
  };

  const handleDeleteRole = async (id: string) => {
    if (!confirm('確定刪除此角色？')) return;
    try {
      await axios.delete(`/api/settings/roles/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchData();
    } catch (error) {
      alert('刪除失敗，可能有使用者正在使用該角色');
    }
  };

  const openPermissionModal = (dept: any) => {
    setSelectedDept(dept);
    setDeptPermissions(dept.permissions || []);
    setPermissionModalOpen(true);
  };

  const togglePermission = (moduleId: string) => {
    if (deptPermissions.includes(moduleId)) {
      setDeptPermissions(deptPermissions.filter(id => id !== moduleId));
    } else {
      setDeptPermissions([...deptPermissions, moduleId]);
    }
  };

  const savePermissions = async () => {
    if (!selectedDept) return;
    try {
      await axios.put(`/api/settings/departments/${selectedDept.id}/permissions`, {
        permissions: deptPermissions
      }, { headers: { Authorization: `Bearer ${token}` } });
      setPermissionModalOpen(false);
      fetchData();
    } catch (error) {
      alert('儲存權限失敗');
    }
  };

  if (user?.level && user.level < 100) {
    return <div className="p-8 text-center text-red-500 font-bold">權限不足</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-slate-800 rounded-lg text-white">
          <SettingsIcon size={24} />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">系統設定</h1>
      </div>

      <div className="flex gap-4 border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('smtp')}
          className={`pb-4 px-4 font-medium transition-colors flex items-center gap-2 ${activeTab === 'smtp' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Mail size={18} /> SMTP 郵件伺服器
        </button>
        <button 
          onClick={() => setActiveTab('depts')}
          className={`pb-4 px-4 font-medium transition-colors flex items-center gap-2 ${activeTab === 'depts' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Users size={18} /> 部門與權限管理
        </button>
        <button 
          onClick={() => setActiveTab('roles')}
          className={`pb-4 px-4 font-medium transition-colors flex items-center gap-2 ${activeTab === 'roles' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Shield size={18} /> 角色與管理層級
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        {activeTab === 'smtp' && (
          <div className="max-w-2xl space-y-6">
            <h3 className="text-lg font-bold text-slate-800 border-b pb-2">Email 推播設定</h3>
            <p className="text-sm text-slate-500">配置 SMTP 以便系統能夠自動寄送晨間提醒與任務指派通知。</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">SMTP 伺服器位置</label>
                <input type="text" value={smtpHost} onChange={e => setSmtpHost(e.target.value)} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500" placeholder="e.g. smtp.gmail.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">SMTP 連接埠 (Port)</label>
                <input type="text" value={smtpPort} onChange={e => setSmtpPort(e.target.value)} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500" placeholder="e.g. 465 或 587" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">SMTP 使用者名稱</label>
                <input type="text" value={smtpUser} onChange={e => setSmtpUser(e.target.value)} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500" placeholder="your-email@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">SMTP 密碼 / 應用程式密碼</label>
                <input type="password" value={smtpPass} onChange={e => setSmtpPass(e.target.value)} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500" placeholder="••••••••" />
              </div>
            </div>
            
            <button onClick={handleSaveSmtp} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
              <Save size={18} /> 儲存設定
            </button>
          </div>
        )}

        {activeTab === 'depts' && (
          <div className="space-y-6">
            <div className="flex gap-4 items-end">
              <div className="flex-1 max-w-sm">
                <label className="block text-sm font-medium text-slate-700 mb-1">新增部門名稱</label>
                <input type="text" value={newDeptName} onChange={e => setNewDeptName(e.target.value)} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500" placeholder="例如：法務部" />
              </div>
              <button onClick={handleAddDept} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors">
                <Plus size={18} /> 新增
              </button>
            </div>
            
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="p-3 text-slate-600 font-medium">部門名稱</th>
                    <th className="p-3 text-slate-600 font-medium w-1/2">目前已授權模組</th>
                    <th className="p-3 text-right text-slate-600 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {departments.map(dept => (
                    <tr key={dept.id} className="hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-800">{dept.name}</td>
                      <td className="p-3 text-slate-500 text-sm max-w-[200px]">
                        <div className="flex flex-wrap gap-1">
                          {(dept.permissions || []).map((modId: string) => {
                            const modName = AVAILABLE_MODULES.find(m => m.id === modId)?.name || modId;
                            return (
                              <span key={modId} className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded text-xs font-medium whitespace-nowrap">
                                {modName}
                              </span>
                            );
                          })}
                          {(!dept.permissions || dept.permissions.length === 0) && (
                            <span className="text-slate-400 text-xs italic">尚未配置權限</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-right flex justify-end gap-2">
                        <button onClick={() => openPermissionModal(dept)} className="text-indigo-600 hover:text-indigo-800 p-1 rounded hover:bg-indigo-50 border border-transparent hover:border-indigo-200 text-sm flex items-center gap-1 font-bold">
                          <CheckSquare size={14} /> 權限設定
                        </button>
                        <button onClick={() => handleDeleteDept(dept.id)} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'roles' && (
          <div className="space-y-6">
            <div className="flex gap-4 items-end">
              <div className="flex-1 max-w-xs">
                <label className="block text-sm font-medium text-slate-700 mb-1">新增角色名稱</label>
                <input type="text" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500" placeholder="例如：專案經理" />
              </div>
              <div className="flex-1 max-w-xs">
                <label className="block text-sm font-medium text-slate-700 mb-1">權限等級 (1~100)</label>
                <input type="number" value={newRoleLevel} onChange={e => setNewRoleLevel(e.target.value)} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500" placeholder="50" />
              </div>
              <button onClick={handleAddRole} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors">
                <Plus size={18} /> 新增
              </button>
            </div>
            <p className="text-sm text-slate-500">提示：等級 &gt;= 100 為系統管理員，不受部門權限限制。等級 &gt;= 50 為部門主管。等級 &lt; 50 為一般員工。</p>
            
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="p-3 text-slate-600 font-medium">角色名稱</th>
                    <th className="p-3 text-slate-600 font-medium">管理層級</th>
                    <th className="p-3 text-right text-slate-600 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {roles.map(role => (
                    <tr key={role.id} className="hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-800">{role.name}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${role.level >= 100 ? 'bg-purple-100 text-purple-700' : role.level >= 50 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'}`}>
                          Level: {role.level}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button onClick={() => handleDeleteRole(role.id)} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50" disabled={role.name === 'SystemAdmin'}>
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Permissions Modal */}
      {permissionModalOpen && selectedDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">設定【{selectedDept.name}】功能權限</h2>
              <button onClick={() => setPermissionModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {AVAILABLE_MODULES.map(mod => (
                <label key={mod.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                  <span className="font-medium text-slate-700">{mod.name}</span>
                  <input 
                    type="checkbox" 
                    checked={deptPermissions.includes(mod.id)}
                    onChange={() => togglePermission(mod.id)}
                    className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </label>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t">
              <button onClick={() => setPermissionModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                取消
              </button>
              <button onClick={savePermissions} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold">
                儲存設定
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SystemSettings;
