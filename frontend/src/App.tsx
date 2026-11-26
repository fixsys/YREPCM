import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetails from './pages/ProjectDetails';
import Users from './pages/Users';
import SystemSettings from './pages/SystemSettings';
import Tasks from './pages/Tasks';
import AnalyticsReports from './pages/AnalyticsReports';
import Budget from './pages/Budget';
import BudgetDetail from './pages/BudgetDetail';
import Leads from './pages/crm/Leads';
import LeadDetail from './pages/crm/LeadDetail';
import SimulatorsDashboard from './pages/SimulatorsDashboard';
import SolarModuleSim from './pages/SolarModuleSim';
import Onsite from './pages/Onsite';
import SystemLogs from './pages/SystemLogs';
import ElectronicApprovals from './pages/ElectronicApprovals';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { token, requirePasswordChange } = useAuthStore();
  
  if (!token) return <Navigate to="/login" />;
  if (requirePasswordChange) return <Navigate to="/change-password" />;
  
  return children;
};

export const canUserAccessModule = (user: any, moduleId: string): boolean => {
  if (!user) return false;
  if (user.level && user.level >= 100) return true;
  if (moduleId === 'dashboard' || moduleId === 'approvals') return true;
  const allowed: string[] = Array.isArray(user.permissions) ? user.permissions : [];
  return allowed.includes(moduleId);
};

const ModuleRoute = ({ moduleId, children }: { moduleId: string; children: JSX.Element }) => {
  const { user, loginSystem } = useAuthStore();
  if (loginSystem === '2' && moduleId !== 'onsite') return <Navigate to="/onsite" replace />;
  if (loginSystem === '3' && moduleId !== 'manufacturing') return <Navigate to="/manufacturing" replace />;
  if (!canUserAccessModule(user, moduleId)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  const { user } = useAuthStore();
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/change-password" element={<ChangePassword />} />
        
        {/* Protected Routes */}
        <Route path="/*" element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<ModuleRoute moduleId="dashboard"><Dashboard /></ModuleRoute>} />
                <Route path="/tasks" element={<ModuleRoute moduleId="tasks"><Tasks /></ModuleRoute>} />
                <Route path="/projects" element={<ModuleRoute moduleId="projects"><Projects /></ModuleRoute>} />
                <Route path="/projects/:id" element={<ModuleRoute moduleId="projects"><ProjectDetails /></ModuleRoute>} />
                <Route path="/users" element={(user?.level && user.level >= 100) ? <Users /> : <Navigate to="/" replace />} />
                <Route path="/settings" element={(user?.level && user.level >= 100) ? <SystemSettings /> : <Navigate to="/" replace />} />
                <Route path="/analytics" element={<ModuleRoute moduleId="analytics"><AnalyticsReports /></ModuleRoute>} />
                <Route path="/crm/leads" element={<ModuleRoute moduleId="crm"><Leads /></ModuleRoute>} />
                <Route path="/crm/leads/:id" element={<ModuleRoute moduleId="crm"><LeadDetail /></ModuleRoute>} />
                <Route path="/budget" element={<ModuleRoute moduleId="budget"><Budget /></ModuleRoute>} />
                <Route path="/budget/:id" element={<ModuleRoute moduleId="budget"><BudgetDetail /></ModuleRoute>} />
                <Route path="/onsite" element={<ModuleRoute moduleId="onsite"><Onsite mode="ONSITE" /></ModuleRoute>} />
                <Route path="/manufacturing" element={<ModuleRoute moduleId="manufacturing"><Onsite mode="MANUFACTURING" /></ModuleRoute>} />
                <Route path="/approvals" element={<ModuleRoute moduleId="approvals"><ElectronicApprovals /></ModuleRoute>} />
                <Route path="/simulators" element={<ModuleRoute moduleId="simulators"><SimulatorsDashboard /></ModuleRoute>} />
                <Route path="/simulators/solar" element={<ModuleRoute moduleId="simulators"><SolarModuleSim /></ModuleRoute>} />
                <Route path="/system-logs" element={(user?.level && user.level >= 100) ? <SystemLogs /> : <Navigate to="/" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;
