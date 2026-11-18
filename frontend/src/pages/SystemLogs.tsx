import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import {
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Terminal,
  Filter,
  Eye,
  X,
  Copy,
  Check,
  Database,
  Activity,
} from 'lucide-react';

interface SystemLogItem {
  id: string;
  source?: 'AUDIT' | 'DATABASE';
  user_id?: string | null;
  user_name?: string | null;
  user_account?: string | null;
  department?: string | null;
  action: string;
  module: string;
  target_id?: string | null;
  summary: string;
  method?: string | null;
  path?: string | null;
  status_code: number;
  level: string;
  ip_address?: string | null;
  duration_ms?: number | null;
  payload?: any;
  error_message?: string | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, { label: string; badge: string }> = {
  CREATE: { label: '新增', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  UPDATE: { label: '更新', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  DELETE: { label: '刪除', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
  EXPORT: { label: '匯出報表', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  LOGIN: { label: '登入驗證', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  ERROR: { label: '失敗/異常', badge: 'bg-red-100 text-red-800 border-red-300 font-extrabold' },
  VIEW: { label: '查閱', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
};

const SystemLogs = () => {
  const { token } = useAuthStore();
  const [logs, setLogs] = useState<SystemLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [selectedLevel, setSelectedLevel] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [viewingLog, setViewingLog] = useState<SystemLogItem | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchSystemLogs = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/system-logs?limit=800', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLogs(res.data?.logs || []);
    } catch (error) {
      console.error('Failed to fetch system logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemLogs();
  }, [token]);

  const moduleOptions = useMemo(() => {
    const set = new Set<string>();
    logs.forEach(l => {
      if (l.module) set.add(l.module);
    });
    return Array.from(set);
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      if (selectedModule !== 'ALL' && l.module !== selectedModule) return false;
      if (selectedAction !== 'ALL' && l.action !== selectedAction) return false;
      if (selectedLevel === 'ERROR_ONLY' && l.status_code < 400 && l.level === 'INFO') return false;
      if (selectedLevel === 'SUCCESS_ONLY' && (l.status_code >= 400 || l.level !== 'INFO')) return false;
      if (dateFilter) {
        const logDate = new Date(l.created_at).toISOString().slice(0, 10);
        if (logDate !== dateFilter) return false;
      }
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const hay = [
          l.summary,
          l.user_name,
          l.user_account,
          l.department,
          l.module,
          l.path,
          l.target_id,
          l.error_message,
          l.payload ? JSON.stringify(l.payload) : '',
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [logs, selectedModule, selectedAction, selectedLevel, dateFilter, searchQuery]);

  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayCount = logs.filter(l => new Date(l.created_at).toISOString().slice(0, 10) === todayStr).length;
    const errorCount = logs.filter(l => l.status_code >= 400 || l.level === 'ERROR' || l.level === 'WARN').length;
    const successCount = logs.length - errorCount;
    return {
      total: logs.length,
      todayCount,
      successCount,
      errorCount,
    };
  }, [logs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-900 text-emerald-400">
              <Terminal size={22} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">後臺系統紀錄 (System Audit & Activity Logs)</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            提供開發者與管理員檢視全系統每一筆資料異動、報工送出、報表匯出及失敗/欄位缺漏攔截詳情。
          </p>
        </div>
        <button
          type="button"
          onClick={fetchSystemLogs}
          disabled={loading}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm transition-colors cursor-pointer self-start md:self-auto"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          重新整理紀錄
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
            <Database size={22} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500">系統總紀錄筆數</div>
            <div className="text-2xl font-black text-slate-800">{stats.total}</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <Activity size={22} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500">今日新增/操作紀錄</div>
            <div className="text-2xl font-black text-blue-700">{stats.todayCount}</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500">成功執行筆數</div>
            <div className="text-2xl font-black text-emerald-700">{stats.successCount}</div>
          </div>
        </div>
        <div
          onClick={() => setSelectedLevel(selectedLevel === 'ERROR_ONLY' ? 'ALL' : 'ERROR_ONLY')}
          title="點擊篩選異常/失敗紀錄"
          className={`p-4 rounded-xl border shadow-sm flex items-center gap-3.5 cursor-pointer transition-all ${
            selectedLevel === 'ERROR_ONLY'
              ? 'bg-red-50 border-red-400 ring-2 ring-red-300'
              : 'bg-white border-slate-200 hover:border-red-300'
          }`}
        >
          <div className="p-3 rounded-xl bg-red-100 text-red-600">
            <AlertTriangle size={22} />
          </div>
          <div>
            <div className="text-xs font-bold text-red-700">失敗 / 欄位驗證攔截</div>
            <div className="text-2xl font-black text-red-600">{stats.errorCount}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <Filter size={14} /> 搜尋與多維度篩選（共篩選出 {filteredLogs.length} 筆紀錄）
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜尋人員、專案代碼、派工單號、路徑或錯誤原因..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="md:col-span-3">
            <select
              value={selectedModule}
              onChange={e => setSelectedModule(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="ALL">所有系統模組 (全部)</option>
              {moduleOptions.map(m => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <select
              value={selectedAction}
              onChange={e => setSelectedAction(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="ALL">所有動作類型</option>
              <option value="CREATE">新增 (CREATE)</option>
              <option value="UPDATE">更新 (UPDATE)</option>
              <option value="DELETE">刪除 (DELETE)</option>
              <option value="EXPORT">匯出 (EXPORT)</option>
              <option value="LOGIN">登入 (LOGIN)</option>
              <option value="ERROR">失敗/異常 (ERROR)</option>
            </select>
          </div>
          <div className="md:col-span-3 flex gap-2">
            <select
              value={selectedLevel}
              onChange={e => setSelectedLevel(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="ALL">全部狀態</option>
              <option value="SUCCESS_ONLY">✅ 僅顯示成功</option>
              <option value="ERROR_ONLY">❌ 僅顯示失敗/攔截</option>
            </select>
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="px-2.5 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500">載入系統紀錄中...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-slate-400">沒有符合篩選條件的系統紀錄</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-800 text-white text-xs uppercase tracking-wider">
                  <th className="py-3 px-4 w-44">時間</th>
                  <th className="py-3 px-3 w-36">操作人員 / 部門</th>
                  <th className="py-3 px-3 w-44">系統模組</th>
                  <th className="py-3 px-3 w-28 text-center">動作 / 狀態</th>
                  <th className="py-3 px-4">紀錄摘要與錯誤詳情</th>
                  <th className="py-3 px-3 w-24 text-center">檢視</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredLogs.map(log => {
                  const isErr = log.status_code >= 400 || log.level === 'ERROR' || log.level === 'WARN';
                  const actCfg = ACTION_LABELS[log.action] || {
                    label: log.action,
                    badge: 'bg-slate-100 text-slate-700 border-slate-200',
                  };

                  return (
                    <tr
                      key={log.id}
                      onClick={() => setViewingLog(log)}
                      className={`transition-colors cursor-pointer ${
                        isErr ? 'bg-red-50/60 hover:bg-red-100/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                          <Clock size={13} className="text-slate-400" />
                          {new Date(log.created_at).toLocaleString('zh-TW', { hour12: false })}
                        </div>
                        {log.duration_ms !== null && log.duration_ms !== undefined && (
                          <span className="text-[11px] text-slate-400 ml-5">耗時 {log.duration_ms} ms</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800">{log.user_name || '系統'}</div>
                        <div className="text-xs text-slate-500">
                          {[log.user_account, log.department].filter(Boolean).join(' | ') || '-'}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-block px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {log.module}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${actCfg.badge}`}>
                          {actCfg.label}
                        </span>
                        <div className="mt-1">
                          <span
                            className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${
                              isErr ? 'bg-red-600 text-white' : 'text-emerald-700 bg-emerald-50'
                            }`}
                          >
                            HTTP {log.status_code}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className={`font-medium ${isErr ? 'text-red-900 font-bold' : 'text-slate-800'}`}>
                          {log.summary}
                        </div>
                        {log.error_message && (
                          <div className="mt-1.5 p-2 rounded-lg bg-red-100/80 border border-red-300 text-xs text-red-800 whitespace-pre-wrap">
                            <strong>⚠️ 失敗/攔截原因：</strong>
                            {log.error_message}
                          </div>
                        )}
                        {log.path && (
                          <div className="text-[11px] font-mono text-slate-400 mt-1">
                            {log.method} {log.path}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setViewingLog(log);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Eye size={14} /> 詳情
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 詳細紀錄檢視 Modal */}
      {viewingLog && (
        <div
          className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setViewingLog(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Terminal size={20} className="text-emerald-400" />
                <h3 className="font-bold text-lg">系統紀錄詳細資料</h3>
                <span
                  className={`ml-2 text-xs font-mono px-2 py-0.5 rounded font-bold ${
                    viewingLog.status_code >= 400 ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
                  }`}
                >
                  HTTP {viewingLog.status_code}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewingLog(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 font-medium">紀錄時間：</span>
                  <span className="font-mono font-bold text-slate-800">
                    {new Date(viewingLog.created_at).toLocaleString('zh-TW', { hour12: false })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">操作人員：</span>
                  <span className="font-bold text-slate-800">
                    {viewingLog.user_name || '系統'}
                    {viewingLog.user_account ? ` (${viewingLog.user_account})` : ''}
                    {viewingLog.department ? ` - ${viewingLog.department}` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">系統模組：</span>
                  <span className="font-bold text-indigo-700">{viewingLog.module}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">動作類型：</span>
                  <span className="font-bold text-slate-800">
                    {ACTION_LABELS[viewingLog.action]?.label || viewingLog.action}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-500 font-medium">API 端點：</span>
                  <span className="font-mono text-xs bg-slate-200 px-2 py-0.5 rounded text-slate-800">
                    {viewingLog.method || 'POST'} {viewingLog.path || '-'}
                  </span>
                  {viewingLog.target_id && (
                    <span className="ml-3 text-xs text-slate-500 font-mono">
                      Target ID: {viewingLog.target_id}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-700 mb-1.5">操作摘要</h4>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-800">
                  {viewingLog.summary}
                </div>
              </div>

              {viewingLog.error_message && (
                <div>
                  <h4 className="font-bold text-red-700 mb-1.5 flex items-center gap-1.5">
                    <AlertTriangle size={16} /> 錯誤 / 欄位驗證攔截原因
                  </h4>
                  <div className="p-4 rounded-xl bg-red-50 border border-red-300 text-red-900 whitespace-pre-wrap leading-relaxed font-medium">
                    {viewingLog.error_message}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="font-bold text-slate-700">完整資料內容 (Payload JSON)</h4>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(viewingLog.payload || {}, null, 2));
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1800);
                    }}
                    className="text-xs px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    {copied ? '已複製 JSON' : '複製 JSON'}
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-slate-900 text-emerald-300 font-mono text-xs overflow-x-auto max-h-80 leading-relaxed">
                  {JSON.stringify(viewingLog.payload || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingLog(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-sm cursor-pointer"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemLogs;
