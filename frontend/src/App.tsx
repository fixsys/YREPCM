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
import WorkflowBuilder from './pages/WorkflowBuilder';
import Budget from './pages/Budget';
import BudgetDetail from './pages/BudgetDetail';
import Leads from './pages/crm/Leads';
import LeadDetail from './pages/crm/LeadDetail';
import SimulatorsDashboard from './pages/SimulatorsDashboard';
import SolarModuleSim from './pages/SolarModuleSim';
import Onsite from './pages/Onsite';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { token, requirePasswordChange } = useAuthStore();
  
  if (!token) return <Navigate to="/login" />;
  if (requirePasswordChange) return <Navigate to="/change-password" />;
  
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
                <Route path="/" element={<Dashboard />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:id" element={<ProjectDetails />} />
                <Route path="/users" element={<Users />} />
                <Route path="/settings" element={<SystemSettings />} />
                <Route path="/analytics" element={<AnalyticsReports />} />
                <Route path="/crm/leads" element={<Leads />} />
                <Route path="/crm/leads/:id" element={<LeadDetail />} />
                <Route path="/budget" element={<Budget />} />
                <Route path="/budget/:id" element={<BudgetDetail />} />
                <Route path="/onsite" element={<Onsite />} />
                <Route path="/simulators" element={<SimulatorsDashboard />} />
                <Route path="/simulators/solar" element={<SolarModuleSim />} />
                <Route path="/workflow-builder" element={(user?.level && user.level >= 100) ? <WorkflowBuilder /> : <Navigate to="/" />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;
