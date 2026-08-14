import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { Plus, Users as UsersIcon, Shield, Edit2, KeyRound } from 'lucide-react';

const DEPARTMENTS = [
  '系統管理員', '總經理室', '法務部', '工務部', '鋼構部', 
  '工程研發部', '業務部', '財會部', '採購組', '行政組', '人資部', '資管組'
];

const ROLES = ['SystemAdmin', 'Manager', 'User'];

const Users = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  const [formData, setFormData] = useState({ account: '', password: '', name: '', email: '', department_id: '', role_id: '' });
  const [resetPassword, setResetPassword] = useState('');
  const [submitError, setSubmitError] = useState('');
  
  const { token, user: currentUser } = useAuthStore();

  const fetchUsers = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const [deptRes, roleRes] = await Promise.all([
        axios.get('http://localhost:3001/api/settings/departments', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:3001/api/settings/roles', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setDepartments(deptRes.data);
      setRoles(roleRes.data);
      if (deptRes.data.length > 0 && roleRes.data.length > 0) {
        setFormData(prev => ({ ...prev, department_id: deptRes.data[0].id, role_id: roleRes.data[0].id }));
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (token && currentUser?.level && currentUser.level >= 100) {
      fetchUsers();
      fetchSettings();
    }
  }, [token, currentUser]);

  if (!currentUser?.level || currentUser.level < 100) {
    return <div className="p-8 text-center text-red-500 font-medium">權限不足，僅限系統管理員存取。</div>;
  }

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    try {
      if (selectedUser) {
        await axios.put(`http://localhost:3001/api/users/${selectedUser.id}`, 
          { name: formData.name, email: formData.email, department_id: formData.department_id, role_id: formData.role_id, is_active: true },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post('http://localhost:3001/api/users', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (error: any) {
      setSubmitError(error.response?.data?.error || '操作失敗');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    try {
      await axios.post(`http://localhost:3001/api/users/${selectedUser.id}/reset-password`, 
        { newPassword: resetPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsResetModalOpen(false);
    } catch (error: any) {
      setSubmitError(error.response?.data?.error || '重設密碼失敗');
    }
  };

  const openCreateModal = () => {
    setSelectedUser(null);
    setFormData({ 
      account: '', password: '', name: '', email: '',
      department_id: departments[0]?.id || '', 
      role_id: roles[0]?.id || '' 
    });
    setIsModalOpen(true);
  };

  const openEditModal = (u: any) => {
    setSelectedUser(u);
    setFormData({ 
      account: u.account, password: '', name: u.name, email: u.email || '',
      department_id: u.department?.id || '', 
      role_id: u.role?.id || '' 
    });
    setIsModalOpen(true);
  };

  const openResetModal = (u: any) => {
    setSelectedUser(u);
    setResetPassword('');
    setIsResetModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
            <UsersIcon size={24} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">帳號與權限管理</h1>
        </div>
        <button 
          onClick={openCreateModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-sm"
        >
          <Plus size={18} /> 新增帳號
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">載入中...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">帳號</th>
                  <th className="px-6 py-4">姓名</th>
                  <th className="px-6 py-4">信箱</th>
                  <th className="px-6 py-4">部門</th>
                  <th className="px-6 py-4">角色</th>
                  <th className="px-6 py-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{u.account}</td>
                    <td className="px-6 py-4 text-slate-600">{u.name}</td>
                    <td className="px-6 py-4 text-slate-600">{u.email || '-'}</td>
                    <td className="px-6 py-4 text-slate-600">{u.department?.name || '無'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${u.role?.level >= 100 ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                        {u.role?.name || '無'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button onClick={() => openEditModal(u)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="編輯">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => openResetModal(u)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="重設密碼">
                        <KeyRound size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">{selectedUser ? '編輯帳號' : '新增帳號'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleCreateOrUpdate} className="p-6 space-y-4">
              {submitError && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{submitError}</div>}
              
              {!selectedUser && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">登入帳號</label>
                    <input required type="text" value={formData.account} onChange={e => setFormData({...formData, account: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">初始密碼</label>
                    <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">姓名</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email 信箱</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="example@domain.com" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">部門</label>
                  <select required value={formData.department_id} onChange={e => setFormData({...formData, department_id: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">系統角色</label>
                  <select required value={formData.role_id} onChange={e => setFormData({...formData, role_id: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name} (Lv.{r.level})</option>)}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">取消</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">{selectedUser ? '儲存' : '新增'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">重設密碼 ({selectedUser?.account})</h3>
              <button onClick={() => setIsResetModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              {submitError && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{submitError}</div>}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">新密碼</label>
                <input required type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
                <button type="button" onClick={() => setIsResetModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">取消</button>
                <button type="submit" className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium transition-colors">重設</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
