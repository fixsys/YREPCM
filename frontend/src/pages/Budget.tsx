import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { Calculator, Calendar, FileText, Briefcase } from 'lucide-react';
import clsx from 'clsx';

const Budget = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuthStore();
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const res = await axios.get('/api/budget', { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setTickets(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const handleTakeover = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await axios.post(`/api/budget/${id}/takeover`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || '接取失敗');
    }
  };

  const handleReject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('確定要退回此需求單嗎？')) return;
    try {
      await axios.post(`/api/budget/${id}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || '退回失敗');
    }
  };

  const renderTicketCard = (ticket: any, isUnaccepted: boolean) => {
    const lead = ticket.lead;
    const title = lead?.company && lead?.site_name ? `${lead.company} - ${lead.site_name}` : lead?.site_name || lead?.company || lead?.name || '未知案件';

    return (
      <div 
        key={ticket.id} 
        onClick={() => {
          if (!isUnaccepted) navigate(`/budget/${ticket.id}`);
        }}
        className={clsx(
          "bg-white rounded-xl shadow-sm border p-5 flex flex-col transition-all",
          isUnaccepted ? "border-slate-200" : "border-slate-200 cursor-pointer hover:shadow-md hover:border-blue-300 active:bg-slate-50"
        )}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className={clsx(
              "p-2.5 rounded-xl",
              isUnaccepted ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"
            )}>
              <Calculator size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg leading-tight mb-1">{title}</h3>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Briefcase size={14} /> 負責業務: {lead?.assignee?.name || '未知'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-auto space-y-2 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-slate-400" />
            <span>需求建立日: {new Date(ticket.lead?.created_at).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-slate-400" />
            <span className="truncate">承攬形式: {ticket.contract_type || '未填'}</span>
          </div>
        </div>

        {isUnaccepted ? (
          <div className="flex items-center gap-2 pt-4 mt-4 border-t border-slate-100">
            <button 
              onClick={(e) => handleTakeover(ticket.id, e)}
              className="flex-1 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-colors"
            >
              接取分析
            </button>
            <button 
              onClick={(e) => handleReject(ticket.id, e)}
              className="flex-1 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg shadow-sm transition-colors"
            >
              退回需求
            </button>
          </div>
        ) : (
          <div className="flex justify-between items-center pt-3 mt-3 border-t border-slate-100">
            <span className={clsx(
              "text-xs px-2.5 py-1 rounded-full font-medium",
              ticket.budget_status === '已完成' ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
            )}>
              {ticket.budget_status}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">預算分析</h1>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500">載入中...</div>
      ) : (
        <div className="flex flex-col gap-8">
          {(() => {
            const unaccepted = tickets.filter(p => p.budget_status === '待分析');
            if (unaccepted.length === 0) return null;
            
            return (
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  待接洽 ({unaccepted.length})
                </h2>
                <div className="grid grid-cols-1 @md:grid-cols-2 @lg:grid-cols-3 gap-4">
                  {unaccepted.map(ticket => renderTicketCard(ticket, true))}
                </div>
              </div>
            );
          })()}

          {(() => {
            const accepted = tickets.filter(p => p.budget_status !== '待分析' && p.budget_status !== '退回修正');
            
            return (
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  分析中/已完成 ({accepted.length})
                </h2>
                <div className="grid grid-cols-1 @md:grid-cols-2 @lg:grid-cols-3 gap-4">
                  {accepted.map(ticket => renderTicketCard(ticket, false))}
                  {accepted.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                      目前沒有處理中的案件
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default Budget;
