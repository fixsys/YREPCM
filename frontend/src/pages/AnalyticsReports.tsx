import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { Download, Search, AlertCircle, CheckCircle2, Clock, FileSpreadsheet, Calendar, Users, Layers } from 'lucide-react';

type AttendanceRow = {
  id: string;
  report_id: string;
  date: string;
  day: number;
  weekday: string;
  worker_name: string;
  project_id: string;
  project_code: string;
  project_name: string;
  work_category: string;
  work_item: string;
  start_time: string;
  end_time: string;
  raw_hours: number;
  actual_workers: number | null;
  expected_workers: number | null;
  days: number | null;
  partial_hours: number | null;
  total_hours: number;
  overtime_hours: number | null;
  progress: string;
  construction_location: string;
  weather: string;
  pm_name: string;
  recorder_name: string;
  engineers: string;
  module_type: string;
};

type WorkerMonthlySummary = {
  worker_name: string;
  attendance_days_count: number;
  total_days: number;
  total_partial_hours: number;
  total_normal_hours: number;
  total_overtime_hours: number;
  total_all_hours: number;
  projects: string;
  work_items: string;
};

const WEEKDAY_NAMES = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

const AnalyticsReports = () => {
  const { token } = useAuthStore();

  // 1. 報表種類選擇: 'ATTENDANCE' (出工表) | 'WORK_LOGS' (人員工時統計與產能分析)
  const [reportType, setReportType] = useState<'ATTENDANCE' | 'WORK_LOGS'>('ATTENDANCE');

  // --- 原「人員工時統計與產能分析」State ---
  const [reports, setReports] = useState<any[]>([]);
  const [loadingWorkLogs, setLoadingWorkLogs] = useState(false);
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    department: ''
  });

  // --- 新增「出工表」State ---
  const [attendanceMonth, setAttendanceMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [attendanceProjectId, setAttendanceProjectId] = useState('');
  const [attendanceModuleType, setAttendanceModuleType] = useState('');
  const [attendanceKeyword, setAttendanceKeyword] = useState('');
  const [activeSheetTab, setActiveSheetTab] = useState<'SUMMARY' | number>('SUMMARY');
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<{
    year: number;
    month: number;
    daysInMonth: number;
    rows: AttendanceRow[];
    dailyRecords: Record<number, AttendanceRow[]>;
    workerSummary: WorkerMonthlySummary[];
  }>({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    daysInMonth: 31,
    rows: [],
    dailyRecords: {},
    workerSummary: []
  });

  const fetchWorkLogsReport = async () => {
    setLoadingWorkLogs(true);
    try {
      const params = new URLSearchParams();
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.department) params.append('department', filters.department);

      const res = await axios.get(`/api/reports/work-logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReports(res.data.summary);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingWorkLogs(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await axios.get('/api/projects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(res.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchAttendanceReport = async () => {
    setLoadingAttendance(true);
    try {
      const params = new URLSearchParams();
      if (attendanceMonth) params.append('month', attendanceMonth);
      if (attendanceProjectId) params.append('project_id', attendanceProjectId);
      if (attendanceModuleType) params.append('module_type', attendanceModuleType);

      const res = await axios.get(`/api/reports/attendance?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAttendanceData(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingAttendance(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchWorkLogsReport();
  }, []);

  useEffect(() => {
    fetchAttendanceReport();
  }, [attendanceMonth, attendanceProjectId, attendanceModuleType]);

  const exportWorkLogsCSV = () => {
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

  const exportAttendanceExcel = async () => {
    setExportingExcel(true);
    try {
      const params = new URLSearchParams();
      if (attendanceMonth) params.append('month', attendanceMonth);
      if (attendanceProjectId) params.append('project_id', attendanceProjectId);
      if (attendanceModuleType) params.append('module_type', attendanceModuleType);

      const res = await axios.get(`/api/reports/attendance/export-excel?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `元融_${attendanceData.year}年${attendanceData.month}月份出工表.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert('匯出 Excel 失敗');
    } finally {
      setExportingExcel(false);
    }
  };

  const filteredSummaryRows = useMemo(() => {
    if (!attendanceKeyword.trim()) return attendanceData.rows;
    const kw = attendanceKeyword.trim().toLowerCase();
    return attendanceData.rows.filter(r =>
      r.worker_name.toLowerCase().includes(kw) ||
      r.project_name.toLowerCase().includes(kw) ||
      r.work_item.toLowerCase().includes(kw) ||
      r.work_category.toLowerCase().includes(kw)
    );
  }, [attendanceData.rows, attendanceKeyword]);

  const filteredDayRows = useMemo(() => {
    if (activeSheetTab === 'SUMMARY') return [];
    const dayList = attendanceData.dailyRecords[activeSheetTab] || [];
    if (!attendanceKeyword.trim()) return dayList;
    const kw = attendanceKeyword.trim().toLowerCase();
    return dayList.filter(r =>
      r.worker_name.toLowerCase().includes(kw) ||
      r.project_name.toLowerCase().includes(kw) ||
      r.work_item.toLowerCase().includes(kw) ||
      r.work_category.toLowerCase().includes(kw)
    );
  }, [attendanceData.dailyRecords, activeSheetTab, attendanceKeyword]);

  const activeDayDateInfo = useMemo(() => {
    if (activeSheetTab === 'SUMMARY') return null;
    const day = activeSheetTab;
    const isValid = day <= attendanceData.daysInMonth;
    const dateObj = new Date(Date.UTC(attendanceData.year, attendanceData.month - 1, day));
    const weekday = isValid ? WEEKDAY_NAMES[dateObj.getUTCDay()] : '';
    const dateStr = `${attendanceData.year}/${String(attendanceData.month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
    return { day, isValid, weekday, dateStr };
  }, [activeSheetTab, attendanceData.year, attendanceData.month, attendanceData.daysInMonth]);

  return (
    <div className="space-y-6">
      {/* 頂部標題與報表種類切換 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">報表與分析中心</h1>
          <p className="text-sm text-slate-500 mt-1">
            {reportType === 'ATTENDANCE'
              ? '每月每日報工現場派工人員出工總表與 1~31 日明細表'
              : '人員工時統計與產能分析'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-slate-700 whitespace-nowrap">報表種類：</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as 'ATTENDANCE' | 'WORK_LOGS')}
              className="px-3.5 py-2 border border-slate-300 rounded-lg bg-slate-50 font-semibold text-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ATTENDANCE">出工表 (月總表 + 1~31日明細)</option>
              <option value="WORK_LOGS">人員工時統計與產能分析</option>
            </select>
          </div>

          {reportType === 'ATTENDANCE' ? (
            <button
              onClick={exportAttendanceExcel}
              disabled={exportingExcel}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-sm"
            >
              <FileSpreadsheet size={16} />
              {exportingExcel ? '匯出中...' : '匯出出工表 Excel (含總表與1~31分頁)'}
            </button>
          ) : (
            <button
              onClick={exportWorkLogsCSV}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-sm"
            >
              <Download size={16} /> 匯出 CSV (Excel相容)
            </button>
          )}
        </div>
      </div>

      {/* ========================================== */}
      {/* 報表種類 1：出工表 (ATTENDANCE)             */}
      {/* ========================================== */}
      {reportType === 'ATTENDANCE' && (
        <>
          {/* 篩選條件 */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Search size={18} className="text-slate-400" /> 出工表篩選條件
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">統計月份</label>
                <input
                  type="month"
                  value={attendanceMonth}
                  onChange={e => setAttendanceMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">案場 / 專案</label>
                <select
                  value={attendanceProjectId}
                  onChange={e => setAttendanceProjectId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">所有案場</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.project_code} - {p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">報工來源</label>
                <select
                  value={attendanceModuleType}
                  onChange={e => setAttendanceModuleType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">全部 (現場報工 + 製造報工)</option>
                  <option value="ONSITE">現場報工</option>
                  <option value="MANUFACTURING">製造報工</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">關鍵字搜尋 (姓名/案場/工種)</label>
                <input
                  type="text"
                  value={attendanceKeyword}
                  onChange={e => setAttendanceKeyword(e.target.value)}
                  placeholder="輸入姓名、案場或施工工種..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 分頁切換列：分頁1 總表 + 1~31 分頁 */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto">
              <button
                onClick={() => setActiveSheetTab('SUMMARY')}
                className={`px-4 py-2 rounded-lg text-sm font-bold shrink-0 flex items-center gap-1.5 transition-all ${
                  activeSheetTab === 'SUMMARY'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                <Layers size={15} />
                總表
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeSheetTab === 'SUMMARY' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {attendanceData.rows.length}
                </span>
              </button>

              <div className="h-6 w-px bg-slate-300 mx-1 shrink-0" />

              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                const count = (attendanceData.dailyRecords[day] || []).length;
                const isSelected = activeSheetTab === day;
                const isInvalidDay = day > attendanceData.daysInMonth;
                return (
                  <button
                    key={day}
                    onClick={() => setActiveSheetTab(day)}
                    className={`min-w-[42px] px-2.5 py-1.5 rounded-lg text-xs font-bold shrink-0 flex flex-col items-center justify-center transition-all relative border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : count > 0
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                        : isInvalidDay
                        ? 'bg-slate-50 text-slate-300 border-slate-200'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                    title={count > 0 ? `${attendanceData.month}月${day}日：${count} 筆派工` : `${attendanceData.month}月${day}日：無派工紀錄`}
                  >
                    <span>{day}</span>
                    {count > 0 && (
                      <span className={`text-[10px] leading-none mt-0.5 font-extrabold ${isSelected ? 'text-blue-100' : 'text-emerald-600'}`}>
                        {count}人
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* 分頁內容區 */}
            {loadingAttendance ? (
              <div className="p-12 text-center text-slate-500">出工表資料載入中...</div>
            ) : activeSheetTab === 'SUMMARY' ? (
              /* ========================================== */
              /* 分頁 1：總表 (比照圖2格式)                   */
              /* ========================================== */
              <div className="p-6 space-y-8">
                <div>
                  <div className="text-center py-3 bg-[#ebf1de] border-2 border-b-0 border-slate-800">
                    <h2 className="text-2xl font-bold text-slate-900 tracking-wider">
                      元融{attendanceData.month}月份出工表
                    </h2>
                  </div>

                  <div className="overflow-x-auto border-2 border-slate-800">
                    <table className="w-full text-center border-collapse text-sm">
                      <thead>
                        <tr className="bg-[#ebf1de] border-b-2 border-slate-800 text-slate-900 font-bold">
                          <th className="border border-slate-400 px-3 py-2.5 whitespace-nowrap">日期</th>
                          <th className="border border-slate-400 px-3 py-2.5 whitespace-nowrap">星期</th>
                          <th className="border border-slate-400 px-3 py-2.5 whitespace-nowrap">姓名</th>
                          <th className="border border-slate-400 px-3 py-2.5 whitespace-nowrap">案場</th>
                          <th className="border border-slate-400 px-3 py-2.5 whitespace-nowrap">施工工種</th>
                          <th className="border border-slate-400 px-3 py-2.5 whitespace-nowrap">實際人數</th>
                          <th className="border border-slate-400 px-3 py-2.5 whitespace-nowrap">預計人數</th>
                          <th className="border border-slate-400 px-3 py-2.5 whitespace-nowrap">天數</th>
                          <th className="border border-slate-400 px-3 py-2.5 whitespace-nowrap">H</th>
                          <th className="border border-slate-400 px-3 py-2.5 whitespace-nowrap">總計H</th>
                          <th className="border border-slate-400 px-3 py-2.5 whitespace-nowrap">加班(H)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSummaryRows.length === 0 ? (
                          <tr>
                            <td colSpan={11} className="p-8 text-center text-slate-400">
                              本月份尚無每日報工現場派工人員紀錄
                            </td>
                          </tr>
                        ) : (
                          filteredSummaryRows.map((row) => (
                            <tr key={row.id} className="hover:bg-slate-50 border-b border-slate-300 text-slate-800">
                              <td className="border border-slate-300 px-3 py-1.5 whitespace-nowrap">{row.date}</td>
                              <td className="border border-slate-300 px-3 py-1.5 whitespace-nowrap">{row.weekday}</td>
                              <td className="border border-slate-300 px-3 py-1.5 font-medium whitespace-nowrap">{row.worker_name}</td>
                              <td className="border border-slate-300 px-3 py-1.5">{row.project_name}</td>
                              <td className="border border-slate-300 px-3 py-1.5">{row.work_item}</td>
                              <td className="border border-slate-300 px-3 py-1.5">{row.actual_workers ?? ''}</td>
                              <td className="border border-slate-300 px-3 py-1.5">{row.expected_workers ?? ''}</td>
                              <td className="border border-slate-300 px-3 py-1.5 font-medium">{row.days ?? ''}</td>
                              <td className="border border-slate-300 px-3 py-1.5 font-medium">{row.partial_hours ?? ''}</td>
                              <td className="border border-slate-300 px-3 py-1.5 font-bold">{row.total_hours}</td>
                              <td className="border border-slate-300 px-3 py-1.5 font-bold text-rose-600">{row.overtime_hours ?? ''}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      {filteredSummaryRows.length > 0 && (
                        <tfoot>
                          <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-800">
                            <td colSpan={7} className="border border-slate-400 px-3 py-2 text-right">
                              總計（共 {filteredSummaryRows.length} 筆派工紀錄）：
                            </td>
                            <td className="border border-slate-400 px-3 py-2">
                              {Number(filteredSummaryRows.reduce((acc, r) => acc + (r.days || 0), 0).toFixed(2))}
                            </td>
                            <td className="border border-slate-400 px-3 py-2">
                              {Number(filteredSummaryRows.reduce((acc, r) => acc + (r.partial_hours || 0), 0).toFixed(1)) || ''}
                            </td>
                            <td className="border border-slate-400 px-3 py-2 text-blue-700">
                              {Number(filteredSummaryRows.reduce((acc, r) => acc + (r.total_hours || 0), 0).toFixed(1))}
                            </td>
                            <td className="border border-slate-400 px-3 py-2 text-rose-600">
                              {Number(filteredSummaryRows.reduce((acc, r) => acc + (r.overtime_hours || 0), 0).toFixed(1)) || ''}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>

                {/* 月度各人員累計出工彙總表 */}
                {attendanceData.workerSummary.length > 0 && (
                  <div>
                    <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <Users size={18} className="text-blue-600" />
                      {attendanceData.month}月份 各人員出工統計彙總
                    </h3>
                    <div className="overflow-x-auto border border-slate-300 rounded-lg">
                      <table className="w-full text-center border-collapse text-sm">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                            <th className="border border-slate-300 px-3 py-2">姓名</th>
                            <th className="border border-slate-300 px-3 py-2">出工日數</th>
                            <th className="border border-slate-300 px-3 py-2">折算天數(天)</th>
                            <th className="border border-slate-300 px-3 py-2">散鐘頭(H)</th>
                            <th className="border border-slate-300 px-3 py-2">正常總工時(總計H)</th>
                            <th className="border border-slate-300 px-3 py-2">加班總時數(H)</th>
                            <th className="border border-slate-300 px-3 py-2 text-left">參與案場</th>
                            <th className="border border-slate-300 px-3 py-2 text-left">施工工種</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendanceData.workerSummary.map(w => (
                            <tr key={w.worker_name} className="hover:bg-slate-50 border-b border-slate-200">
                              <td className="border border-slate-200 px-3 py-2 font-bold text-slate-800">{w.worker_name}</td>
                              <td className="border border-slate-200 px-3 py-2">{w.attendance_days_count} 日</td>
                              <td className="border border-slate-200 px-3 py-2 font-medium">{w.total_days}</td>
                              <td className="border border-slate-200 px-3 py-2">{w.total_partial_hours || '-'}</td>
                              <td className="border border-slate-200 px-3 py-2 font-bold text-blue-700">{w.total_normal_hours}</td>
                              <td className="border border-slate-200 px-3 py-2 font-bold text-rose-600">{w.total_overtime_hours || '-'}</td>
                              <td className="border border-slate-200 px-3 py-2 text-left text-slate-600">{w.projects}</td>
                              <td className="border border-slate-200 px-3 py-2 text-left text-slate-600">{w.work_items}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ========================================== */
              /* 分頁 1~31：單日現場派工詳細情況              */
              /* ========================================== */
              <div className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 bg-[#ebf1de] px-4 py-3 border-2 border-b-0 border-slate-800">
                  <div className="flex items-center gap-2">
                    <Calendar size={20} className="text-slate-800" />
                    <h2 className="text-xl font-bold text-slate-900">
                      {activeDayDateInfo?.isValid
                        ? `${activeDayDateInfo.dateStr} (${activeDayDateInfo.weekday}) 每日報工 — 現場派工人員詳細情況`
                        : `${attendanceData.year}年${attendanceData.month}月 第 ${activeSheetTab} 日 (本月無此日期)`}
                    </h2>
                  </div>
                  <span className="text-sm font-bold text-slate-700">
                    共 {filteredDayRows.length} 筆派工紀錄
                  </span>
                </div>

                <div className="overflow-x-auto border-2 border-slate-800">
                  <table className="w-full text-center border-collapse text-sm">
                    <thead>
                      <tr className="bg-[#ebf1de] border-b-2 border-slate-800 text-slate-900 font-bold">
                        <th className="border border-slate-400 px-2.5 py-2 whitespace-nowrap">日期</th>
                        <th className="border border-slate-400 px-2.5 py-2 whitespace-nowrap">星期</th>
                        <th className="border border-slate-400 px-2.5 py-2 whitespace-nowrap">姓名</th>
                        <th className="border border-slate-400 px-2.5 py-2 whitespace-nowrap">案場</th>
                        <th className="border border-slate-400 px-2.5 py-2 whitespace-nowrap">工作類別</th>
                        <th className="border border-slate-400 px-2.5 py-2 whitespace-nowrap">施工工種(工項)</th>
                        <th className="border border-slate-400 px-2.5 py-2 whitespace-nowrap">上班時間</th>
                        <th className="border border-slate-400 px-2.5 py-2 whitespace-nowrap">下班時間</th>
                        <th className="border border-slate-400 px-2.5 py-2 whitespace-nowrap">實際人數</th>
                        <th className="border border-slate-400 px-2.5 py-2 whitespace-nowrap">預計人數</th>
                        <th className="border border-slate-400 px-2.5 py-2 whitespace-nowrap">天數</th>
                        <th className="border border-slate-400 px-2.5 py-2 whitespace-nowrap">H</th>
                        <th className="border border-slate-400 px-2.5 py-2 whitespace-nowrap">總計H</th>
                        <th className="border border-slate-400 px-2.5 py-2 whitespace-nowrap">加班(H)</th>
                        <th className="border border-slate-400 px-2.5 py-2 whitespace-nowrap">施工進度說明</th>
                        <th className="border border-slate-400 px-2.5 py-2 whitespace-nowrap">施工位置</th>
                        <th className="border border-slate-400 px-2.5 py-2 whitespace-nowrap">現場工程師</th>
                        <th className="border border-slate-400 px-2.5 py-2 whitespace-nowrap">工務經理</th>
                        <th className="border border-slate-400 px-2.5 py-2 whitespace-nowrap">天氣</th>
                        <th className="border border-slate-400 px-2.5 py-2 whitespace-nowrap">紀錄者</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDayRows.length === 0 ? (
                        <tr>
                          <td colSpan={20} className="p-10 text-center text-slate-400">
                            當日無每日報工現場派工人員紀錄
                          </td>
                        </tr>
                      ) : (
                        filteredDayRows.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50 border-b border-slate-300 text-slate-800">
                            <td className="border border-slate-300 px-2.5 py-1.5 whitespace-nowrap">{row.date}</td>
                            <td className="border border-slate-300 px-2.5 py-1.5 whitespace-nowrap">{row.weekday}</td>
                            <td className="border border-slate-300 px-2.5 py-1.5 font-bold whitespace-nowrap">{row.worker_name}</td>
                            <td className="border border-slate-300 px-2.5 py-1.5">{row.project_name}</td>
                            <td className="border border-slate-300 px-2.5 py-1.5 whitespace-nowrap">{row.work_category}</td>
                            <td className="border border-slate-300 px-2.5 py-1.5">{row.work_item}</td>
                            <td className="border border-slate-300 px-2.5 py-1.5 whitespace-nowrap font-mono">{row.start_time}</td>
                            <td className="border border-slate-300 px-2.5 py-1.5 whitespace-nowrap font-mono">{row.end_time}</td>
                            <td className="border border-slate-300 px-2.5 py-1.5">{row.actual_workers ?? ''}</td>
                            <td className="border border-slate-300 px-2.5 py-1.5">{row.expected_workers ?? ''}</td>
                            <td className="border border-slate-300 px-2.5 py-1.5 font-medium">{row.days ?? ''}</td>
                            <td className="border border-slate-300 px-2.5 py-1.5 font-medium">{row.partial_hours ?? ''}</td>
                            <td className="border border-slate-300 px-2.5 py-1.5 font-bold text-blue-700">{row.total_hours}</td>
                            <td className="border border-slate-300 px-2.5 py-1.5 font-bold text-rose-600">{row.overtime_hours ?? ''}</td>
                            <td className="border border-slate-300 px-2.5 py-1.5 text-left">{row.progress || '-'}</td>
                            <td className="border border-slate-300 px-2.5 py-1.5">{row.construction_location || '-'}</td>
                            <td className="border border-slate-300 px-2.5 py-1.5">{row.engineers || '-'}</td>
                            <td className="border border-slate-300 px-2.5 py-1.5 whitespace-nowrap">{row.pm_name || '-'}</td>
                            <td className="border border-slate-300 px-2.5 py-1.5 whitespace-nowrap">{row.weather || '-'}</td>
                            <td className="border border-slate-300 px-2.5 py-1.5 whitespace-nowrap">{row.recorder_name || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {filteredDayRows.length > 0 && (
                      <tfoot>
                        <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-800">
                          <td colSpan={10} className="border border-slate-400 px-3 py-2 text-right">
                            當日派工合計（共 {filteredDayRows.length} 人次）：
                          </td>
                          <td className="border border-slate-400 px-2.5 py-2">
                            {Number(filteredDayRows.reduce((acc, r) => acc + (r.days || 0), 0).toFixed(2))}
                          </td>
                          <td className="border border-slate-400 px-2.5 py-2">
                            {Number(filteredDayRows.reduce((acc, r) => acc + (r.partial_hours || 0), 0).toFixed(1)) || ''}
                          </td>
                          <td className="border border-slate-400 px-2.5 py-2 text-blue-700">
                            {Number(filteredDayRows.reduce((acc, r) => acc + (r.total_hours || 0), 0).toFixed(1))}
                          </td>
                          <td className="border border-slate-400 px-2.5 py-2 text-rose-600">
                            {Number(filteredDayRows.reduce((acc, r) => acc + (r.overtime_hours || 0), 0).toFixed(1)) || ''}
                          </td>
                          <td colSpan={6} className="border border-slate-400"></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ========================================== */}
      {/* 報表種類 2：人員工時統計與產能分析            */}
      {/* ========================================== */}
      {reportType === 'WORK_LOGS' && (
        <>
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
                  <option value="工程研發部">工程研發部</option>
                  <option value="採購組">採購組</option>
                  <option value="工務部">工務部</option>
                  <option value="鋼構部">鋼構部</option>
                </select>
              </div>
              <div>
                <button onClick={fetchWorkLogsReport} className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
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
                  {loadingWorkLogs ? (
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
        </>
      )}
    </div>
  );
};

export default AnalyticsReports;

