import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { Download, Search, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

const AnalyticsReports = () => {
  const { token } = useAuthStore();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    department: ''
  });

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.department) params.append('department', filters.department);

      const res = await axios.get(`http://localhost:3001/api/reports/work-logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReports(res.data.summary);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const exportCSV = () => {
    if (reports.length === 0) return alert('沒有資料可匯出');
    
    const headers = ['員工編號(ID)', '姓名', '部門', '累計工時(小時)', '標準工時(小時)', '狀態評估'];
    const rows = reports.map(r => [
      r.userId,
      r.name,
      r.department,
      r.totalHours,
      r.expectedHours,
      r.status
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    // Add UTF-8 BOM for Excel
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `工時統計報表_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">報表與分析中心</h1>
          <p className="text-sm text-slate-500 mt-1">人員工時統計與產能分析</p>
        </div>
        <button onClick={exportCSV} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors">
          <Download size={16} /> 匯出 CSV (Excel相容)
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Search size={18} className="text-slate-400"/> 篩選條件
        </h3>
        <div className="grid grid-cols-1 @md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">開始日期</label>
            <input type="date" value={filters.start_date} onChange={e => setFilters({...filters, start_date: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">結束日期</label>
            <input type="date" value={filters.end_date} onChange={e => setFilters({...filters, end_date: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">部門</label>
            <select value={filters.department} onChange={e => setFilters({...filters, department: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">所有部門</option>
              <option value="業務部">業務部</option>
              <option value="工程研發部 (設計)">工程研發部 (設計)</option>
              <option value="採購組">採購組</option>
              <option value="工務部">工務部</option>
              <option value="鋼構部">鋼構部</option>
            </select>
          </div>
          <div>
            <button onClick={fetchReports} className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
              套用篩選
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-sm font-semibold text-slate-600">員工姓名</th>
                <th className="p-4 text-sm font-semibold text-slate-600">所屬部門</th>
                <th className="p-4 text-sm font-semibold text-slate-600 text-right">累計工時</th>
                <th className="p-4 text-sm font-semibold text-slate-600 text-right">標準工時</th>
                <th className="p-4 text-sm font-semibold text-slate-600 text-center">狀態評估</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">資料載入中...</td></tr>
              ) : reports.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">查無資料</td></tr>
              ) : (
                reports.map((row: any) => (
                  <tr key={row.userId} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-800">{row.name}</td>
                    <td className="p-4 text-slate-600 text-sm">{row.department}</td>
                    <td className="p-4 text-right font-medium text-slate-800">{row.totalHours} hr</td>
                    <td className="p-4 text-right text-slate-500 text-sm">{row.expectedHours} hr</td>
                    <td className="p-4 text-center">
                      {row.status === '正常' && <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium"><CheckCircle2 size={12}/> 正常</span>}
                      {row.status === '過載' && <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold"><AlertCircle size={12}/> 過載警示</span>}
                      {row.status === '閒置' && <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-medium"><Clock size={12}/> 產能不足</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsReports;
