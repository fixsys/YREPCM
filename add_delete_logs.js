const fs = require('fs');

let toolboxCode = fs.readFileSync('backend/src/routes/toolboxMeetings.ts', 'utf8');
const toolboxRoute = `
// Delete toolbox meeting
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  if (req.user?.role !== 'SystemAdmin') return res.status(403).json({ error: '權限不足，僅系統管理員可刪除' });
  try {
    await prisma.toolboxMeeting.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '刪除失敗' });
  }
});
`;
toolboxCode = toolboxCode.replace(/export default router;/, toolboxRoute + '\nexport default router;');
fs.writeFileSync('backend/src/routes/toolboxMeetings.ts', toolboxCode, 'utf8');

// For UI in ProjectDetails.tsx
let uiCode = fs.readFileSync('frontend/src/pages/ProjectDetails.tsx', 'utf8');
uiCode = uiCode.replace(/import \{ ([^}]+) \} from 'lucide-react';/, "import { $1, Trash2 } from 'lucide-react';");

const deleteFunc = `
  const handleDeleteLog = async (log: any) => {
    if (!window.confirm('確定要刪除此紀錄嗎？此動作無法復原！')) return;
    try {
      const endpoint = log._logType === 'toolbox' ? \`/api/toolbox-meetings/\${log.id}\` : \`/api/labor-reports/\${log.id}\`;
      await axios.delete(endpoint, {
        headers: { Authorization: \`Bearer \${token}\` }
      });
      fetchProject(); // refresh data
    } catch (error: any) {
      alert(error.response?.data?.error || '刪除失敗');
    }
  };
`;
uiCode = uiCode.replace(/const navigate = useNavigate\(\);/, 'const navigate = useNavigate();\n' + deleteFunc);

const targetHtml = `                        <button 
                          onClick={() => navigate(\`/onsite?viewType=\${log._logType}&viewId=\${log.id}\`)}
                          className="whitespace-nowrap px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-50 hover:text-blue-600 hover:border-blue-300 transition-colors shadow-sm flex items-center gap-2 text-sm"
                        >
                          <FileText size={16} /> 檢視完整內容
                        </button>`;

const replacementHtml = `                        <button 
                          onClick={() => navigate(\`/onsite?viewType=\${log._logType}&viewId=\${log.id}\`)}
                          className="whitespace-nowrap px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-50 hover:text-blue-600 hover:border-blue-300 transition-colors shadow-sm flex items-center gap-2 text-sm"
                        >
                          <FileText size={16} /> 檢視完整內容
                        </button>
                        {user?.role === 'SystemAdmin' && (
                          <button 
                            onClick={() => handleDeleteLog(log)}
                            className="whitespace-nowrap p-2 bg-white border border-slate-300 rounded-lg text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors shadow-sm"
                            title="刪除紀錄"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}`;

uiCode = uiCode.replace(targetHtml, replacementHtml);
fs.writeFileSync('frontend/src/pages/ProjectDetails.tsx', uiCode, 'utf8');

