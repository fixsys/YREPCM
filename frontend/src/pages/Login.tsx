import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { Sun, Monitor, Smartphone } from 'lucide-react';

const Login = () => {
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [loginType, setLoginType] = useState('1');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();



    setError('');
    setLoading(true);

    try {
      const res = await axios.post('/api/auth/login', { account, password });
      const { token, user, requirePasswordChange } = res.data;
      
      setAuth(token, user, requirePasswordChange, loginType);
      
      if (loginType === '2') {
        navigate('/onsite');
      } else {
        if (requirePasswordChange) {
          navigate('/change-password');
        } else {
          navigate('/');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '登入失敗，請檢查帳號密碼');
    } finally {
      setLoading(false);
    }
  };

  const formContent = (
    <div className="w-full max-w-md p-8 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl z-10 relative mt-12 md:mt-0">
      <div className="flex flex-col items-center mb-8">
        <img 
          src="/logo.png" 
          alt="元融集團 Logo" 
          className="w-24 h-24 object-contain mb-4 drop-shadow-lg" 
          onError={(e) => { e.currentTarget.style.display = 'none'; }} 
        />
        <h2 className="text-3xl font-bold text-white tracking-wider">元融集團</h2>
        <p className="text-blue-200 mt-2 text-sm font-semibold tracking-widest">專案管理系統</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">登入系統類型</label>
          <select
            value={loginType}
            onChange={(e) => setLoginType(e.target.value)}
            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white transition-all appearance-none"
          >
            <option value="1">專案管理</option>
            <option value="2">現場報工</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">帳號</label>
          <input
            type="text"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400 transition-all"
            placeholder="請輸入帳號"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">密碼</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400 transition-all"
            placeholder="請輸入密碼"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium py-3 px-4 rounded-lg shadow-lg hover:shadow-blue-500/30 transition-all duration-200 disabled:opacity-50"
        >
          {loading ? '登入中...' : '登入系統'}
        </button>
      </form>
    </div>
  );

  const backgroundDecorations = (
    <div className="absolute inset-0 z-0">
      <img src="/background.png" alt="Background" className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]"></div>
    </div>
  );



  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 relative overflow-hidden">
      {backgroundDecorations}



      {formContent}
    </div>
  );
};

export default Login;
