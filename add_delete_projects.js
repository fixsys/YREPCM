const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/Projects.tsx', 'utf8');

code = code.replace(/import \{ ([^}]+) \} from 'lucide-react';/, "import { $1, Trash2 } from 'lucide-react';");

const deleteFunc = `
  const handleDeleteProject = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('確定要刪除此專案嗎？此動作無法復原！')) return;
    try {
      await axios.delete(\`/api/projects/\${id}\`, {
        headers: { Authorization: \`Bearer \${token}\` }
      });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || '刪除失敗');
    }
  };
`;

code = code.replace(/const renderProjectCard =/, deleteFunc + '\n  const renderProjectCard =');

const targetHtml = `        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">`;

const replacementHtml = `        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">`;

// Wait, I will inject it at the top right of the card.
const targetHtml2 = `            </div>
          </div>
          {isUnaccepted ? (`;

const replacementHtml2 = `            </div>
          </div>
          <div className="flex items-center gap-2">
            {user?.role === 'SystemAdmin' && (
              <button 
                onClick={(e) => handleDeleteProject(e, project.id)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="刪除專案"
              >
                <Trash2 size={18} />
              </button>
            )}
            {isUnaccepted ? (`;

code = code.replace(targetHtml2, replacementHtml2);

fs.writeFileSync('frontend/src/pages/Projects.tsx', code, 'utf8');
