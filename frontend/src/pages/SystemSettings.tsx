import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { Save, Plus, Trash2, Settings, Mail, Users, Shield } from 'lucide-react';

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

  if (user?.level && user.level < 100) {
    return <div className="p-8 text-center text-red-500 font-bold">權限不足</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-slate-800 rounded-lg text-white">
          <Settings size={24} />
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
          <Users size={18} /> 部門管理
        </button>
        <button 
          onClick={() => setActiveTab('roles')}
          className={`pb-4 px-4 font-medium transition-colors flex items-center gap-2 ${activeTab === 'roles' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Shield size={18} /> 角色與權限等級
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
                    <th className="p-3 text-slate-600 font-medium">建立時間</th>
                    <th className="p-3 text-right text-slate-600 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {departments.map(dept => (
                    <tr key={dept.id} className="hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-800">{dept.name}</td>
                      <td className="p-3 text-slate-500 text-sm">{new Date(dept.created_at).toLocaleDateString()}</td>
                      <td className="p-3 text-right">
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
            <p className="text-sm text-slate-500">提示：等級 &gt;= 100 為高階管理員，等級 &gt;= 50 為主管（可見 Dashboard 調度力），<br/>等級 &lt; 50 為一般員工。</p>
            
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="p-3 text-slate-600 font-medium">角色名稱</th>
                    <th className="p-3 text-slate-600 font-medium">權限等級</th>
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
    </div>
  );
};

export default SystemSettings;
