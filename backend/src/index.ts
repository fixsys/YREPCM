import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import projectRoutes from './routes/projects';
import logRoutes from './routes/logs';
import taskRoutes from './routes/tasks';
import workLogRoutes from './routes/workLogs';
import reportRoutes from './routes/reports';
import projectFileRoutes from './routes/projectFiles';
import settingRoutes from './routes/settings';
import notificationRoutes from './routes/notifications';
import workflowsRoutes from './routes/workflows';
import leadsRoutes from './routes/leads';
import budgetRoutes from './routes/budget';
import toolboxMeetingsRoutes from './routes/toolboxMeetings';
import laborReportsRoutes from './routes/laborReports';
import path from 'path';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// 靜態檔案服務 (供前端讀取上傳的圖片)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects/:projectId/files', projectFileRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/work-logs', workLogRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/workflows', workflowsRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/toolbox-meetings', toolboxMeetingsRoutes);
app.use('/api/labor-reports', laborReportsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
