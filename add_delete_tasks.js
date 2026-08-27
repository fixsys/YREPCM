const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/Tasks.tsx', 'utf8');

code = code.replace(/import \{ ([^}]+) \} from 'lucide-react';/, "import { $1, Trash2 } from 'lucide-react';");

const deleteFunc = `
  const handleDeleteTask = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('確定要刪除此任務嗎？此動作無法復原！')) return;
    try {
      await axios.delete(\`/api/tasks/\${id}\`, {
        headers: { Authorization: \`Bearer \${token}\` }
      });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || '刪除失敗');
    }
  };
`;

code = code.replace(/const openTaskModal =/, deleteFunc + '\n  const openTaskModal =');

const targetHtml = `                <div 
                  key={task.id} 
                  onClick={() => openTaskModal(task)}
                  className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all active:bg-slate-50 flex flex-col relative"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-start gap-3">
                      <div className="bg-indigo-100 p-2.5 rounded-lg text-indigo-600 mt-1">
                        <CheckSquare size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg leading-tight mb-1">{task.name}</h3>`;

const replacementHtml = `                <div 
                  key={task.id} 
                  onClick={() => openTaskModal(task)}
                  className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all active:bg-slate-50 flex flex-col relative"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-start gap-3">
                      <div className="bg-indigo-100 p-2.5 rounded-lg text-indigo-600 mt-1">
                        <CheckSquare size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg leading-tight mb-1">{task.name}</h3>`;

const targetHtml2 = `                      </div>
                    </div>
                    {getStatusBadge(task.status)}
                  </div>`;

const replacementHtml2 = `                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {user?.role === 'SystemAdmin' && (
                        <button 
                          onClick={(e) => handleDeleteTask(e, task.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="刪除"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                      {getStatusBadge(task.status)}
                    </div>
                  </div>`;

code = code.replace(targetHtml2, replacementHtml2);

fs.writeFileSync('frontend/src/pages/Tasks.tsx', code, 'utf8');
