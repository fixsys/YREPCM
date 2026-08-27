import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LogOut, LayoutDashboard, FolderKanban, Shield, BarChart2, Settings, CheckSquare, Network, Briefcase, Smartphone, Monitor, Menu, Calculator, Lightbulb, ClipboardList } from 'lucide-react';
import clsx from 'clsx';
import { useState } from 'react';
import NotificationCenter from './NotificationCenter';

const Layout = ({ children }: { children: ReactNode }) => {
  const { user, logout, isMobileView, setMobileView, loginSystem } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  let navItems = [
    { id: 'dashboard', name: '總覽看板', path: '/', icon: LayoutDashboard },
    { id: 'crm', name: '業務開發', path: '/crm/leads', icon: Briefcase },
    { id: 'onsite', name: '現場報工', path: '/onsite', icon: ClipboardList },
    { id: 'budget', name: '預算分析', path: '/budget', icon: Calculator },
    { id: 'tasks', name: '個人任務', path: '/tasks', icon: CheckSquare },
    { id: 'projects', name: '專案管理', path: '/projects', icon: FolderKanban },
    { id: 'simulators', name: '設計模擬器', path: '/simulators', icon: Lightbulb },
    { id: 'analytics', name: '報表與分析', path: '/analytics', icon: BarChart2 },
  ];

  if (user?.level && user.level < 100) {
    const allowed = user.permissions || [];
    navItems = navItems.filter(item => allowed.includes(item.id));
  }

  if (user?.level && user.level >= 100) {
    navItems.push({ name: '帳號管理', path: '/users', icon: Shield });
    navItems.push({ name: '系統設定', path: '/settings', icon: Settings });
    navItems.push({ name: '流程引擎', path: '/workflow-builder', icon: Network });
  }

  if (loginSystem === '2') {
    navItems = navItems.filter(item => item.path === '/onsite');
  }

  const desktopLayout = (
    <div className="min-h-screen flex flex-col bg-slate-50 relative">
      {/* Top Header */}
      <header className="h-16 bg-slate-900 flex items-center justify-between px-6 shadow-md z-40 shrink-0 relative">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-slate-300 hover:text-white p-2 rounded-md hover:bg-slate-800 transition-colors"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain drop-shadow-md" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <div className="flex flex-col justify-center">
              <h1 className="text-xl font-bold text-white tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 leading-tight">元融集團</h1>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <NotificationCenter />
          <div className="hidden md:block h-6 w-px bg-slate-700 mx-2"></div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-sm font-medium text-white leading-tight">{user?.name}</span>
              <span className="text-xs text-slate-400">{user?.department} | {user?.role}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
              title="登出"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Collapsible Sidebar Overlay */}
        <aside 
          className={clsx(
            "absolute left-0 top-0 bottom-0 bg-slate-900 text-slate-300 flex flex-col shadow-2xl z-50 transition-transform duration-300 ease-in-out",
            isSidebarOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full"
          )}
        >
          <div className="p-4 flex flex-col gap-1 flex-1 overflow-y-auto">
            <div className="mb-4 px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              功能選單
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    navigate(item.path);
                    setIsSidebarOpen(false); // Close on click
                  }}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium',
                    isActive 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50' 
                      : 'hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <Icon size={18} />
                  {item.name}
                </button>
              )
            })}
          </div>
        </aside>

        {/* Overlay background when sidebar is open */}
        {isSidebarOpen && (
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-auto bg-slate-50 relative @container">
          <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm shrink-0 sticky top-0 z-20">
            <h2 className="text-xl font-semibold text-slate-800">
              {navItems.find(item => item.path === location.pathname || (item.path !== '/' && location.pathname.startsWith(item.path)))?.name || '系統'}
            </h2>
          </header>
          <div className="flex-1 p-8 relative">
            {/* Faint Logo Watermark Background */}
            <div className="absolute inset-0 z-0 flex items-center justify-center opacity-[0.03] pointer-events-none overflow-hidden">
              <img src="/logo.png" alt="Watermark" className="w-[80%] h-[80%] object-contain" />
            </div>
            <div className="h-full relative max-w-7xl mx-auto">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );

  return desktopLayout;
};

export default Layout;
