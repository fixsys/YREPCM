const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/crm/Leads.tsx', 'utf8');

code = code.replace(/import \{ ([^}]+) \} from 'lucide-react';/, "import { $1, Trash2 } from 'lucide-react';");

const deleteFunc = `
  const handleDeleteLead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('確定要刪除此業務項目嗎？此動作無法復原！')) return;
    try {
      await axios.delete(\`/api/leads/\${id}\`, {
        headers: { Authorization: \`Bearer \${token}\` }
      });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || '刪除失敗');
    }
  };
`;

code = code.replace(/const fetchData =/, deleteFunc + '\n  const fetchData =');

// 1. Unconverted Leads
const unconvertedTarget = `                    <div className="flex items-center gap-2">
                      <div className="bg-slate-100 p-2 rounded-lg text-slate-600">
                        <Building2 size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg leading-tight">{lead.company || lead.name}</h3>
                        {lead.company && <span className="text-sm text-slate-500">{lead.name}</span>}
                      </div>
                    </div>
                    {getStatusBadge(lead.status)}
                  </div>`;

const unconvertedReplacement = `                    <div className="flex items-center gap-2">
                      <div className="bg-slate-100 p-2 rounded-lg text-slate-600">
                        <Building2 size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg leading-tight">{lead.company || lead.name}</h3>
                        {lead.company && <span className="text-sm text-slate-500">{lead.name}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {user?.role === 'SystemAdmin' && (
                        <button 
                          onClick={(e) => handleDeleteLead(e, lead.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="刪除"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                      {getStatusBadge(lead.status)}
                    </div>
                  </div>`;

// 2. Converted Leads
const convertedTarget = `                    <div className="flex items-center gap-2">
                        <div className="bg-white p-2 rounded-lg text-slate-400">
                          <Building2 size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-600 text-lg leading-tight">{lead.company || lead.name}</h3>
                          {lead.company && <span className="text-sm text-slate-400">{lead.name}</span>}
                        </div>
                      </div>
                      {getStatusBadge(lead.status)}
                    </div>`;

const convertedReplacement = `                    <div className="flex items-center gap-2">
                        <div className="bg-white p-2 rounded-lg text-slate-400">
                          <Building2 size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-600 text-lg leading-tight">{lead.company || lead.name}</h3>
                          {lead.company && <span className="text-sm text-slate-400">{lead.name}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {user?.role === 'SystemAdmin' && (
                          <button 
                            onClick={(e) => handleDeleteLead(e, lead.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="刪除"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                        {getStatusBadge(lead.status)}
                      </div>
                    </div>`;

code = code.replace(unconvertedTarget, unconvertedReplacement);
code = code.replace(convertedTarget, convertedReplacement);

fs.writeFileSync('frontend/src/pages/crm/Leads.tsx', code, 'utf8');
