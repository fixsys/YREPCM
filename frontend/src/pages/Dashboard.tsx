import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  Activity, 
  CheckCircle, 
  CheckCircle2,
  Clock, 
  FolderKanban, 
  AlertCircle,
  Briefcase,
  Users,
  Bell,
  Stamp,
  FileText,
  Printer,
  X,
  HardHat,
  Factory,
  Camera,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ZoomIn
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const Dashboard = () => {
  const navigate = useNavigate();
  const { token, user } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [approvalTab, setApprovalTab] = useState<'PENDING' | 'PROCESSED'>('PENDING');
  const [approvingOrder, setApprovingOrder] = useState<any | null>(null);
  const [viewingOrder, setViewingOrder] = useState<any | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [animReady, setAnimReady] = useState(false);
  const [photoTick, setPhotoTick] = useState(0);
  const [previewLightbox, setPreviewLightbox] = useState<{
    isOpen: boolean;
    photos: { url: string; label: string; date?: string }[];
    currentIndex: number;
    title: string;
  }>({
    isOpen: false,
    photos: [],
    currentIndex: 0,
    title: '',
  });

  useEffect(() => {
    if (!loading && data) {
      const t = setTimeout(() => setAnimReady(true), 120);
      return () => clearTimeout(t);
    }
  }, [loading, data]);

  useEffect(() => {
    const iv = setInterval(() => {
      setPhotoTick(prev => prev + 1);
    }, 3500);
    return () => clearInterval(iv);
  }, []);

  const openPhotoLightbox = (
    photos: { url: string; label: string; date?: string }[],
    index: number,
    title: string
  ) => {
    if (!photos || photos.length === 0) return;
    setPreviewLightbox({
      isOpen: true,
      photos,
      currentIndex: index,
      title,
    });
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const [approveForm, setApproveForm] = useState({
    target_manager_sign: '',
    approval_status: '同意',
    target_manager_comment: '',
    drawing_received_date: '',
    assigned_staff_sign: '',
    remarks: '',
  });

  const fetchDashboardData = async () => {
    try {
      const res = await axios.get('/api/reports/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(res.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchDashboardData();
  }, [token]);

  const handleOpenApprove = (order: any) => {
    setApprovingOrder(order);
    setApproveForm({
      target_manager_sign: order.target_manager_sign || user?.name || '',
      approval_status:
        order.approval_status && order.approval_status !== '待簽核' ? order.approval_status : '同意',
      target_manager_comment: order.target_manager_comment || '',
      drawing_received_date: order.drawing_received_date || '',
      assigned_staff_sign: order.assigned_staff_sign || '',
      remarks: order.remarks || '',
    });
  };

  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingOrder) return;
    if (!approveForm.target_manager_sign.trim()) {
      alert('請輸入受託單位主管簽名');
      return;
    }
    if (approveForm.approval_status === '同意' && !approveForm.drawing_received_date.trim()) {
      alert('簽核為「同意」時，請先點擊右側「蓋下收圖章」蓋章後再確認送出，方可開放生產！');
      return;
    }

    setIsApproving(true);
    try {
      const res = await axios.post(`/api/dispatch-orders/${approvingOrder.id}/approve`, approveForm, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchDashboardData();
      if (viewingOrder && viewingOrder.id === approvingOrder.id) {
        setViewingOrder(res.data);
      }
      setApprovingOrder(null);
    } catch (err: any) {
      alert(err.response?.data?.error || '簽核儲存失敗');
    } finally {
      setIsApproving(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-slate-500 font-medium">載入數據中...</p>
        </div>
      </div>
    );
  }

  const { global, employee, manager } = data;
  const isManager = Boolean(user?.level && user.level >= 50);
  const canAccessProjects = Boolean(
    (user?.level && user.level >= 100) ||
      (Array.isArray(user?.permissions) && user.permissions.includes('projects'))
  );
  const canAccessTasks = Boolean(
    (user?.level && user.level >= 100) ||
      (Array.isArray(user?.permissions) && user.permissions.includes('tasks'))
  );

  // Render Global View (For Top Management and Managers)
  const renderGlobalView = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg text-white shadow-lg shadow-indigo-200">
          <Activity size={24} />
        </div>
        <h2 className="text-xl font-bold text-slate-800">重大專案狀態</h2>
      </div>

      <div className="grid grid-cols-1 @md:grid-cols-3 gap-6">
        <div
          onClick={() => canAccessProjects && navigate('/projects')}
          className={`${canAccessProjects ? 'cursor-pointer hover:shadow-md' : 'cursor-default'} bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-white/40 p-6 relative overflow-hidden group transition-all`}
        >
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-blue-500/10 blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500 tracking-wider">進行中專案</p>
              <h3 className="text-4xl font-black text-slate-800 mt-2">{global.activeProjects}</h3>
            </div>
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <FolderKanban size={28} />
            </div>
          </div>
        </div>

        <div
          onClick={() => canAccessProjects && navigate('/projects')}
          className={`${canAccessProjects ? 'cursor-pointer hover:shadow-md' : 'cursor-default'} bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-white/40 p-6 relative overflow-hidden group transition-all`}
        >
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-emerald-500/10 blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500 tracking-wider">已完工專案</p>
              <h3 className="text-4xl font-black text-slate-800 mt-2">{global.completedProjects}</h3>
            </div>
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
              <CheckCircle size={28} />
            </div>
          </div>
        </div>

        <div
          onClick={() => canAccessProjects && navigate('/projects')}
          className={`${canAccessProjects ? 'cursor-pointer hover:shadow-md' : 'cursor-default'} bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-white/40 p-6 relative overflow-hidden group transition-all`}
        >
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-slate-500/10 blur-2xl group-hover:bg-slate-500/20 transition-all"></div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500 tracking-wider">總專案數</p>
              <h3 className="text-4xl font-black text-slate-800 mt-2">{global.totalProjects}</h3>
            </div>
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white shadow-lg shadow-slate-200">
              <Briefcase size={28} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const ongoingOnsiteList: any[] = global?.ongoingOnsiteProgress || [];
  const ongoingMfgList: any[] = global?.ongoingManufacturingProgress || [];

  // 依完成進度百分比自動回傳對應的分級顏色主題 (0% 未開始 / 1~29% 起步紅橘 / 30~69% 推進琥珀黃 / 70~99% 衝刺靛藍 / 100% 完成翠綠)
  const getProgressColorTheme = (pct: number) => {
    const val = Number(pct) || 0;
    if (val >= 100) {
      return {
        label: '已完成',
        barBg: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
        badgeClass: 'text-emerald-800 bg-emerald-100 border-emerald-300',
        textClass: 'text-emerald-700',
        dotClass: 'bg-emerald-500',
      };
    }
    if (val >= 70) {
      return {
        label: '收尾衝刺',
        barBg: 'linear-gradient(90deg, #3b82f6 0%, #4f46e5 100%)',
        badgeClass: 'text-indigo-800 bg-indigo-100 border-indigo-300',
        textClass: 'text-indigo-700',
        dotClass: 'bg-indigo-500',
      };
    }
    if (val >= 30) {
      return {
        label: '穩定推進',
        barBg: 'linear-gradient(90deg, #f59e0b 0%, #ea580c 100%)',
        badgeClass: 'text-amber-800 bg-amber-100 border-amber-300',
        textClass: 'text-amber-700',
        dotClass: 'bg-amber-500',
      };
    }
    if (val > 0) {
      return {
        label: '初期起步',
        barBg: 'linear-gradient(90deg, #f43f5e 0%, #e11d48 100%)',
        badgeClass: 'text-rose-800 bg-rose-100 border-rose-300',
        textClass: 'text-rose-700',
        dotClass: 'bg-rose-500',
      };
    }
    return {
      label: '待啟動',
      barBg: 'linear-gradient(90deg, #94a3b8 0%, #64748b 100%)',
      badgeClass: 'text-slate-600 bg-slate-100 border-slate-300',
      textClass: 'text-slate-500',
      dotClass: 'bg-slate-400',
    };
  };

  const STAGE_META: Record<string, { short: string; badge: string; bar: string; ring: string }> = {
    '一次加工': { short: '① 一次加工', badge: 'bg-indigo-100 text-indigo-800 border-indigo-200', bar: 'from-indigo-500 to-blue-500', ring: 'border-indigo-400 shadow-indigo-100' },
    '二次加工': { short: '② 二次加工', badge: 'bg-blue-100 text-blue-800 border-blue-200', bar: 'from-blue-500 to-cyan-500', ring: 'border-blue-400 shadow-blue-100' },
    '送至鍍鋅廠': { short: '③ 送至鍍鋅廠', badge: 'bg-amber-100 text-amber-800 border-amber-200', bar: 'from-amber-500 to-orange-400', ring: 'border-amber-400 shadow-amber-100' },
    '鍍鋅完成出貨至案場': { short: '④ 出貨至案場', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', bar: 'from-emerald-500 to-teal-500', ring: 'border-emerald-400 shadow-emerald-100' },
  };

  // Render Live Engineering & Manufacturing Progress + Latest Photos
  const renderLiveProgressSections = () => (
    <div className="space-y-12 mt-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 進度顏色分級圖例 */}
      <div className="bg-white/85 backdrop-blur-md border border-slate-200/80 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs shadow-2xs">
        <span className="font-extrabold text-slate-700">🎨 進度顏色階段說明：</span>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 font-bold text-slate-600">
            <span className="w-3 h-3 rounded-full bg-slate-400 inline-block" /> 0% 待啟動
          </span>
          <span className="inline-flex items-center gap-1.5 font-bold text-rose-700">
            <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" /> 1%~29% 初期起步
          </span>
          <span className="inline-flex items-center gap-1.5 font-bold text-amber-700">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> 30%~69% 穩定推進
          </span>
          <span className="inline-flex items-center gap-1.5 font-bold text-indigo-700">
            <span className="w-3 h-3 rounded-full bg-indigo-600 inline-block" /> 70%~99% 收尾衝刺
          </span>
          <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> 100% 已完成
          </span>
        </div>
      </div>

      {/* 1. 目前正在進行的工程進度以及最新的照片 */}
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="relative p-2.5 bg-gradient-to-br from-blue-500 to-teal-600 rounded-xl text-white shadow-lg shadow-blue-200 animate-float-slow">
              <HardHat size={24} />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-400 border border-white"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-slate-800">目前正在進行的工程進度與最新照片</h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  LIVE 即時監控中
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">即時彙整現場報工之各案場工程進度、施工項目累計完成度與最新現場施工照片動態展示</p>
            </div>
          </div>
        </div>

        {ongoingOnsiteList.length > 0 ? (
          <div className="grid grid-cols-1 @lg:grid-cols-2 gap-6">
            {ongoingOnsiteList.map((proj: any, idx: number) => {
              const items: any[] = Array.isArray(proj.items) ? proj.items : [];
              const photos: any[] = Array.isArray(proj.latest_photos) ? proj.latest_photos : [];
              const activePhotoIdx = photos.length > 0 ? (photoTick + idx) % Math.min(4, photos.length) : -1;
              const targetOverallPct = Math.min(100, proj.overall_pct || 0);
              const overallTheme = getProgressColorTheme(targetOverallPct);

              return (
                <div
                  key={`${proj.project_id}-${idx}`}
                  style={{ animationDelay: `${idx * 100}ms` }}
                  className="group/card bg-white/95 backdrop-blur-xl rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 hover:border-blue-300/80 transition-all duration-300 animate-in fade-in slide-in-from-bottom-3"
                >
                  {/* 卡片頂部：案場名稱與總體進度 */}
                  <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-blue-50/30 to-teal-50/30 relative overflow-hidden">
                    <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-gradient-to-br from-blue-400/10 to-teal-400/10 blur-2xl group-hover/card:scale-150 transition-transform duration-700 pointer-events-none" />
                    <div className="flex items-start justify-between gap-2 mb-2 relative">
                      <div
                        onClick={() =>
                          canAccessProjects &&
                          proj.project_id &&
                          proj.project_id !== 'UNASSIGNED' &&
                          navigate(`/projects/${proj.project_id}`)
                        }
                        className={canAccessProjects ? 'cursor-pointer group' : 'cursor-default'}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          {proj.project_code && (
                            <span className="font-mono text-xs font-extrabold px-2 py-0.5 bg-blue-100 text-blue-800 rounded shadow-2xs">
                              {proj.project_code}
                            </span>
                          )}
                          <h3
                            className={`text-base font-extrabold text-slate-800 transition-colors ${
                              canAccessProjects ? 'group-hover:text-blue-600' : ''
                            }`}
                          >
                            {proj.project_name}
                          </h3>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold rounded-full bg-teal-100 text-teal-800 border border-teal-200 shrink-0 shadow-2xs">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-600"></span>
                        </span>
                        {proj.project_status || '施工中'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mb-3.5 relative">
                      {proj.latest_report_date && (
                        <span className="flex items-center gap-1">
                          <Calendar size={12} className="text-blue-600" />
                          最新回報：<strong className="text-slate-700">{proj.latest_report_date}</strong>
                          {proj.weather ? ` (${proj.weather})` : ''}
                        </span>
                      )}
                      {proj.work_category && (
                        <span>
                          工程類別：<strong className="text-slate-700">{proj.work_category}</strong>
                        </span>
                      )}
                      {proj.construction_location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} className="text-teal-600" />
                          位置：{proj.construction_location}
                        </span>
                      )}
                      {proj.recorder_name && (
                        <span>紀錄人：{proj.recorder_name}</span>
                      )}
                    </div>

                    {/* 動態流光總體進度條 */}
                    <div className="relative">
                      <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                        <span className="text-slate-600 flex items-center gap-1.5">
                          案場整體工程進度
                          <span className={`text-[10px] px-1.5 py-0.2 rounded border font-extrabold ${overallTheme.badgeClass}`}>
                            {overallTheme.label}
                          </span>
                        </span>
                        <span className={`font-mono text-sm font-black px-2 py-0.5 rounded-md border ${overallTheme.badgeClass}`}>
                          {proj.overall_pct || 0}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200/80 rounded-full h-3 overflow-hidden shadow-inner p-0.5">
                        <div
                          className="relative h-full rounded-full transition-all duration-1000 ease-out overflow-hidden animate-progress-stripes"
                          style={{
                            width: `${animReady ? targetOverallPct : 0}%`,
                            background: overallTheme.barBg,
                          }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-progress-shimmer" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 卡片中段：進行中施工工項進度明細 */}
                  <div className="p-5 space-y-4 flex-1">
                    <div>
                      <div className="text-xs font-extrabold text-slate-700 mb-2.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span>📋 進行中工項進度明細</span>
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                          共 {items.length} 項工項
                        </span>
                      </div>
                      {items.length > 0 ? (
                        <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                          {items.slice(0, 6).map((it: any, iIdx: number) => {
                            const itemPct = Math.min(100, it.pct || 0);
                            const isItemDone = itemPct >= 100;
                            const itemTheme = getProgressColorTheme(itemPct);
                            return (
                              <div
                                key={iIdx}
                                className="bg-slate-50/90 hover:bg-blue-50/40 border border-slate-200/80 hover:border-blue-200 rounded-xl p-2.5 text-xs transition-all duration-200"
                              >
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="px-1.5 py-0.5 bg-blue-100/90 text-blue-800 font-bold rounded text-[10px] shrink-0">
                                      {it.category}
                                    </span>
                                    <span className="font-bold text-slate-800 truncate" title={it.name}>
                                      {it.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 font-mono">
                                    <span className="text-slate-600">
                                      已完 <strong className="text-slate-800">{it.accumulated}{it.unitSuffix}</strong> / {it.targetNum}{it.unitSuffix}
                                    </span>
                                    <span
                                      className={`font-extrabold px-1.5 py-0.5 rounded border ${itemTheme.badgeClass}`}
                                    >
                                      {it.pct}%
                                    </span>
                                  </div>
                                </div>
                                <div className="w-full bg-slate-200/90 rounded-full h-2.5 overflow-hidden">
                                  <div
                                    className={`relative h-full rounded-full transition-all duration-1000 ease-out overflow-hidden ${
                                      isItemDone ? '' : 'animate-progress-stripes'
                                    }`}
                                    style={{
                                      width: `${animReady ? itemPct : 0}%`,
                                      background: itemTheme.barBg,
                                      transitionDelay: `${iIdx * 120}ms`,
                                    }}
                                  >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-progress-shimmer" />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 italic bg-slate-50 rounded-xl p-3 text-center">
                          尚無填報工項進度明細
                        </div>
                      )}
                    </div>

                    {/* 卡片底部：最新現場施工照片 (含自動輪播聚焦特效) */}
                    <div>
                      <div className="text-xs font-extrabold text-slate-700 mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Camera size={14} className="text-blue-600 animate-pulse" />
                          最新現場施工照片
                        </span>
                        {photos.length > 0 && (
                          <span className="text-[11px] font-normal text-slate-400">
                            自動焦點輪播中・點擊照片放大 ({photos.length} 張)
                          </span>
                        )}
                      </div>
                      {photos.length > 0 ? (
                        <div className="grid grid-cols-4 gap-2.5">
                          {photos.slice(0, 4).map((ph: any, pIdx: number) => {
                            const isSpotlit = pIdx === activePhotoIdx;
                            return (
                              <div
                                key={pIdx}
                                onClick={() => openPhotoLightbox(photos, pIdx, `${proj.project_name} — 最新現場施工照片`)}
                                className={`group relative aspect-square rounded-xl overflow-hidden border-2 bg-slate-100 cursor-zoom-in transition-all duration-500 ${
                                  isSpotlit
                                    ? 'border-blue-500 shadow-md shadow-blue-200/80 -translate-y-0.5'
                                    : 'border-slate-200 hover:border-blue-400'
                                }`}
                              >
                                <img
                                  src={ph.url}
                                  alt={ph.label || '施工照片'}
                                  className={`w-full h-full object-cover transition-transform duration-700 ${
                                    isSpotlit ? 'scale-110' : 'group-hover:scale-110'
                                  }`}
                                />
                                {isSpotlit && (
                                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-400 ring-2 ring-white animate-ping" />
                                )}
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/45 to-transparent px-1.5 py-1 text-[10px] text-white font-bold truncate">
                                  {ph.label}
                                </div>
                                {pIdx === 3 && photos.length > 4 && (
                                  <div className="absolute inset-0 bg-black/55 hover:bg-black/40 transition-colors flex items-center justify-center text-white font-extrabold text-sm">
                                    +{photos.length - 4}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2 py-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                          <Camera size={15} /> 尚無上傳現場施工照片
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white/80 rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
            目前尚無進行中的現場工程報工紀錄
          </div>
        )}
      </div>

      {/* 2. 目前正在進行的生產製造進度以及最新的照片 */}
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="relative p-2.5 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl text-white shadow-lg shadow-indigo-200 animate-float-slow">
              <Factory size={24} />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-400 border border-white"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-slate-800">目前正在進行的生產製造進度與最新照片</h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                  </span>
                  4 階段產線追蹤
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">即時追蹤各派工單 4 階段工序（① 一次加工 ➔ ② 二次加工 ➔ ③ 送至鍍鋅廠 ➔ ④ 出貨至案場）進度與最新廠內製造照片</p>
            </div>
          </div>
        </div>

        {ongoingMfgList.length > 0 ? (
          <div className="grid grid-cols-1 @lg:grid-cols-2 gap-6">
            {ongoingMfgList.map((mfg: any, idx: number) => {
              const items: any[] = Array.isArray(mfg.items) ? mfg.items : [];
              const stageSummary: any[] = Array.isArray(mfg.stageSummary) ? mfg.stageSummary : [];
              const photos: any[] = Array.isArray(mfg.latest_photos) ? mfg.latest_photos : [];
              const activePhotoIdx = photos.length > 0 ? (photoTick + idx) % Math.min(4, photos.length) : -1;

              return (
                <div
                  key={`${mfg.group_key}-${idx}`}
                  style={{ animationDelay: `${idx * 100}ms` }}
                  className="group/mfg bg-white/95 backdrop-blur-xl rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 hover:border-indigo-300/80 transition-all duration-300 animate-in fade-in slide-in-from-bottom-3"
                >
                  {/* 卡片頂部：派工單號、所屬專案與 4 階段動態流線總覽 */}
                  <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-indigo-50/35 to-violet-50/30 relative overflow-hidden">
                    <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-gradient-to-br from-indigo-400/10 to-violet-400/10 blur-2xl group-hover/mfg:scale-150 transition-transform duration-700 pointer-events-none" />
                    <div className="flex items-start justify-between gap-2 mb-2 relative">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {mfg.dispatch_no && (
                            <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 bg-indigo-600 text-white rounded shadow-2xs">
                              派工單：{mfg.dispatch_no}
                            </span>
                          )}
                          {mfg.project_code && (
                            <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-200 text-slate-700 rounded">
                              {mfg.project_code}
                            </span>
                          )}
                          <h3 className="text-base font-extrabold text-slate-800">
                            {mfg.project_name}
                          </h3>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 shrink-0">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                        </span>
                        {mfg.target_dept || '鋼構部'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mb-3.5 relative">
                      {mfg.latest_report_date && (
                        <span className="flex items-center gap-1">
                          <Calendar size={12} className="text-indigo-600" />
                          最新動態：<strong className="text-slate-700">{mfg.latest_report_date}</strong>
                        </span>
                      )}
                      {mfg.work_category && (
                        <span>
                          狀態/類別：<strong className="text-indigo-700">{mfg.work_category}</strong>
                        </span>
                      )}
                      {mfg.construction_location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} className="text-indigo-600" />
                          廠區/位置：{mfg.construction_location}
                        </span>
                      )}
                      {mfg.recorder_name && (
                        <span>負責/紀錄人：{mfg.recorder_name}</span>
                      )}
                    </div>

                    {/* 4 階段工序進度橫列 (含流水動畫進度條與進度分級顏色) */}
                    {stageSummary.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 relative">
                        {stageSummary.map((st: any, stIdx: number) => {
                          const meta = STAGE_META[st.stage] || {
                            short: st.stage,
                            badge: 'bg-slate-100 text-slate-700 border-slate-200',
                            bar: 'from-indigo-500 to-blue-500',
                            ring: 'border-indigo-300',
                          };
                          const stPct = Math.min(100, st.pct || 0);
                          const isActiveStage = stPct > 0 && stPct < 100;
                          const isStageDone = stPct >= 100 && st.totalCount > 0;
                          const stTheme = getProgressColorTheme(stPct);

                          return (
                            <div
                              key={st.stage}
                              className={`bg-white rounded-xl p-2.5 shadow-2xs flex flex-col justify-between border transition-all duration-300 ${
                                isActiveStage
                                  ? `${meta.ring} shadow-sm`
                                  : isStageDone
                                  ? 'border-emerald-300 bg-emerald-50/30'
                                  : 'border-slate-200/90'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[11px] font-extrabold text-slate-700 whitespace-nowrap truncate">
                                  {meta.short}
                                </span>
                                {isActiveStage && (
                                  <span className="relative flex h-2 w-2 shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                                  </span>
                                )}
                              </div>
                              <div className="flex items-baseline justify-between mt-1">
                                <span className={`text-xs font-extrabold font-mono ${stTheme.textClass}`}>
                                  {st.pct}%
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  {st.completedCount}/{st.totalCount}件
                                </span>
                              </div>
                              <div className="w-full bg-slate-200/80 rounded-full h-2 mt-1.5 overflow-hidden">
                                <div
                                  className={`relative h-full rounded-full transition-all duration-1000 ease-out overflow-hidden ${
                                    isActiveStage ? 'animate-progress-stripes' : ''
                                  }`}
                                  style={{
                                    width: `${animReady ? stPct : 0}%`,
                                    background: stTheme.barBg,
                                    transitionDelay: `${stIdx * 120}ms`,
                                  }}
                                >
                                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-progress-shimmer" />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 卡片中段：各構件 4 道工序進度明細 */}
                  <div className="p-5 space-y-4 flex-1">
                    <div>
                      <div className="text-xs font-extrabold text-slate-700 mb-2.5 flex items-center justify-between">
                        <span>🔩 生產構件工序進度明細</span>
                        <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                          共 {items.length} 項構件
                        </span>
                      </div>
                      {items.length > 0 ? (
                        <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                          {items.slice(0, 6).map((it: any, iIdx: number) => (
                            <div
                              key={iIdx}
                              className="bg-slate-50/90 hover:bg-indigo-50/30 border border-slate-200/80 hover:border-indigo-200 rounded-xl p-2.5 text-xs space-y-2 transition-all duration-200"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-800 font-bold rounded text-[10px] shrink-0">
                                    {it.category}
                                  </span>
                                  <span className="font-bold text-slate-800 truncate" title={it.name}>
                                    {it.name}
                                  </span>
                                </div>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 flex items-center gap-1 ${
                                    it.isReadyToHoist
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                                  }`}
                                >
                                  {!it.isReadyToHoist && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                                  )}
                                  {it.isReadyToHoist ? '✅ 現場可吊裝' : `進行中：${STAGE_META[it.latestStage]?.short || it.latestStage}`}
                                </span>
                              </div>

                              <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                                {(it.stageDetails || []).map((sd: any) => {
                                  const isDone = sd.done >= sd.target && sd.target > 0;
                                  const isWorking = sd.done > 0 && !isDone;
                                  const sdTheme = getProgressColorTheme(sd.pct || 0);
                                  return (
                                    <div
                                      key={sd.stage}
                                      className={`px-1.5 py-1 rounded-lg border text-[10px] font-mono flex flex-col justify-between transition-all ${
                                        isDone
                                          ? 'bg-emerald-50/90 border-emerald-300 text-emerald-800 font-bold'
                                          : isWorking
                                          ? `${sdTheme.badgeClass} font-bold shadow-2xs`
                                          : 'bg-white border-slate-200 text-slate-400'
                                      }`}
                                    >
                                      <span className="truncate text-[9px]">
                                        {STAGE_META[sd.stage]?.short || sd.stage}
                                      </span>
                                      <span className="whitespace-nowrap mt-0.5">
                                        {sd.done}/{sd.target}{it.unitSuffix} ({sd.pct}%)
                                      </span>
                                      <div className="w-full bg-slate-200/80 rounded-full h-1.5 mt-1 overflow-hidden">
                                        <div
                                          className="h-full rounded-full transition-all duration-1000"
                                          style={{
                                            width: `${animReady ? Math.min(100, sd.pct || 0) : 0}%`,
                                            background: sdTheme.barBg,
                                          }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 italic bg-slate-50 rounded-xl p-3 text-center">
                          尚無構件生產進度明細
                        </div>
                      )}
                    </div>

                    {/* 卡片底部：最新生產製造照片 (含自動輪播聚焦特效) */}
                    <div>
                      <div className="text-xs font-extrabold text-slate-700 mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Camera size={14} className="text-indigo-600 animate-pulse" />
                          最新生產製造照片
                        </span>
                        {photos.length > 0 && (
                          <span className="text-[11px] font-normal text-slate-400">
                            自動焦點輪播中・點擊照片放大 ({photos.length} 張)
                          </span>
                        )}
                      </div>
                      {photos.length > 0 ? (
                        <div className="grid grid-cols-4 gap-2.5">
                          {photos.slice(0, 4).map((ph: any, pIdx: number) => {
                            const isSpotlit = pIdx === activePhotoIdx;
                            return (
                              <div
                                key={pIdx}
                                onClick={() =>
                                  openPhotoLightbox(
                                    photos,
                                    pIdx,
                                    `${mfg.dispatch_no ? `${mfg.dispatch_no} ` : ''}${mfg.project_name} — 最新生產製造照片`
                                  )
                                }
                                className={`group relative aspect-square rounded-xl overflow-hidden border-2 bg-slate-100 cursor-zoom-in transition-all duration-500 ${
                                  isSpotlit
                                    ? 'border-indigo-500 shadow-md shadow-indigo-200/80 -translate-y-0.5'
                                    : 'border-slate-200 hover:border-indigo-400'
                                }`}
                              >
                                <img
                                  src={ph.url}
                                  alt={ph.label || '生產製造照片'}
                                  className={`w-full h-full object-cover transition-transform duration-700 ${
                                    isSpotlit ? 'scale-110' : 'group-hover:scale-110'
                                  }`}
                                />
                                {isSpotlit && (
                                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-400 ring-2 ring-white animate-ping" />
                                )}
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/45 to-transparent px-1.5 py-1 text-[10px] text-white font-bold truncate">
                                  {ph.label}
                                </div>
                                {pIdx === 3 && photos.length > 4 && (
                                  <div className="absolute inset-0 bg-black/55 hover:bg-black/40 transition-colors flex items-center justify-center text-white font-extrabold text-sm">
                                    +{photos.length - 4}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2 py-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                          <Camera size={15} /> 尚無上傳生產製造照片
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white/80 rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
            目前尚無進行中的生產製造報工紀錄
          </div>
        )}
      </div>
    </div>
  );

  // Render Manager View
  const pendingOrders: any[] = manager?.pendingDispatchOrders || [];
  const processedOrders: any[] = manager?.processedDispatchOrders || [];
  const pendingEApprovals: any[] = manager?.pendingApprovalRequests || [];
  const displayedApprovalOrders = approvalTab === 'PENDING' ? pendingOrders : processedOrders;

  const renderManagerView = () => (
    <div className="space-y-6 mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg text-white shadow-lg shadow-orange-200">
          <Users size={24} />
        </div>
        <h2 className="text-xl font-bold text-slate-800">團隊負載與待辦簽核</h2>
      </div>

      <div className="grid grid-cols-1 @lg:grid-cols-2 gap-6">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-white/40 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6">團隊異常延宕警示</h3>
          {manager.teamOverdueTasks.length > 0 ? (
            <div className="space-y-3">
              {manager.teamOverdueTasks.map((task: any) => (
                <div key={task.id} className="flex items-center justify-between p-4 bg-red-50/50 border border-red-100 rounded-xl hover:bg-red-50 transition-colors">
                  <div>
                    <h4 className="font-bold text-red-900">{task.name}</h4>
                    <p className="text-sm text-red-600 mt-1">負責人: {task.assignee?.name || '未指派'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-red-500 bg-red-100 px-2 py-1 rounded-full">
                      逾期: {new Date(task.due_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <CheckCircle size={48} className="text-emerald-200 mb-4" />
              <p>目前團隊無異常延宕任務</p>
            </div>
          )}
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-white/40 p-6 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Stamp className="text-rose-600" size={20} />
              <h3 className="text-lg font-bold text-slate-800">待辦簽核專區（受託單位派工單）</h3>
              {pendingOrders.length > 0 && (
                <span className="px-2.5 py-0.5 bg-rose-600 text-white text-xs font-extrabold rounded-full shadow-sm">
                  {pendingOrders.length} 筆待簽核
                </span>
              )}
            </div>

            <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-bold">
              <button
                type="button"
                onClick={() => setApprovalTab('PENDING')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  approvalTab === 'PENDING'
                    ? 'bg-white text-rose-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                待簽核 ({pendingOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setApprovalTab('PROCESSED')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  approvalTab === 'PROCESSED'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                已簽核紀錄 ({processedOrders.length})
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-500 mb-4">
            {user?.level && user.level >= 100
              ? '管理員視角：顯示所有部門委託之派工單簽核與收圖章狀態，以及電子簽核單據。尚未完成簽核與蓋下收圖章前，製造端無法進行生產報工。'
              : `受託單位【${user?.department || '本部門'}】主管簽核區：請針對委託貴部門之派工單與電子簽呈/報表/表單進行簽核並蓋章。`}
          </p>

          {pendingEApprovals.length > 0 && (
            <div className="mb-4 p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-indigo-900">
                  📄 電子簽核（簽呈 / 報表 / 表單）待您簽核用印：{pendingEApprovals.length} 筆
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/approvals')}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  前往電子簽核中心 ➔
                </button>
              </div>
              <div className="space-y-1.5">
                {pendingEApprovals.slice(0, 3).map((reqItem: any) => (
                  <div
                    key={reqItem.id}
                    onClick={() => navigate('/approvals')}
                    className="bg-white border border-indigo-100 hover:border-indigo-300 rounded-lg px-3 py-2 text-xs flex items-center justify-between cursor-pointer"
                  >
                    <div className="truncate pr-2">
                      <span className="font-mono font-bold text-slate-700 mr-1.5">
                        {reqItem.request_no}
                      </span>
                      <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-700 rounded text-[10px] font-bold mr-1.5">
                        {reqItem.doc_type}
                      </span>
                      <span className="font-bold text-slate-800">{reqItem.title}</span>
                    </div>
                    <span className="text-[11px] font-bold text-rose-600 shrink-0">
                      第 {reqItem.current_step} 關：{reqItem.activeStepName}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {displayedApprovalOrders.length > 0 ? (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {displayedApprovalOrders.map((order: any) => {
                const isApprovedAndStamped =
                  order.approval_status === '同意' &&
                  Boolean(order.drawing_received_date && String(order.drawing_received_date).trim() !== '');
                const itemsCount = Array.isArray(order.items) ? order.items.length : 0;

                return (
                  <div
                    key={order.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isApprovedAndStamped
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : order.approval_status === '退回'
                        ? 'bg-red-50/40 border-red-200'
                        : 'bg-rose-50/40 border-rose-200 hover:border-rose-300 shadow-sm'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-extrabold text-sm text-slate-800 bg-white px-2.5 py-0.5 rounded border border-slate-200">
                            {order.dispatch_no}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-xs font-bold rounded border ${
                              order.urgency === '急單(3日)'
                                ? 'bg-red-50 text-red-600 border-red-200'
                                : order.urgency === '長期'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {order.urgency}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-xs font-bold rounded ${
                              order.approval_status === '同意'
                                ? 'bg-emerald-100 text-emerald-700'
                                : order.approval_status === '退回'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            簽核：{order.approval_status || '待簽核'}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-xs font-bold rounded border ${
                              order.drawing_received_date
                                ? 'bg-rose-100 text-rose-700 border-rose-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            {order.drawing_received_date
                              ? `💮 已蓋收圖章 (${order.drawing_received_date})`
                              : '⏳ 未蓋收圖章'}
                          </span>
                        </div>

                        <div className="text-sm font-bold text-slate-800 pt-0.5">
                          專案：{order.project?.project_code} - {order.project?.name || order.site_name || '未指定'}
                        </div>

                        <div className="text-xs text-slate-600 flex flex-wrap gap-x-3 gap-y-1">
                          <span>
                            <strong>需求單位：</strong>{order.request_dept}（{order.requester_name || '-'}）
                          </span>
                          <span>
                            <strong>受託單位：</strong>
                            <span className="text-rose-700 font-bold">{order.target_dept}</span>
                          </span>
                          <span>
                            <strong>加工構件：</strong>{itemsCount} 項
                          </span>
                          <span>
                            <strong>需求日期：</strong>
                            {order.required_date ? new Date(order.required_date).toLocaleDateString('zh-TW') : '-'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setViewingOrder(order)}
                          className="px-3 py-1.5 bg-white border border-slate-300 hover:border-blue-400 hover:text-blue-600 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                        >
                          <FileText size={14} /> 檢視派工單
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenApprove(order)}
                          className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                        >
                          <Stamp size={14} />
                          {isApprovedAndStamped ? '重新簽核 / 修改收圖章' : '簽核 / 蓋收圖章'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
              <CheckCircle size={48} className="text-emerald-200 mb-3" />
              <p className="font-medium">
                {approvalTab === 'PENDING' ? '目前無待簽核的派工單，所有簽核皆已處理完畢' : '尚無已簽核的派工單紀錄'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render Employee View
  const renderEmployeeView = () => (
    <div className="space-y-6 mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <div className="p-2 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-lg text-white shadow-lg shadow-teal-200">
          <CheckCircle size={24} />
        </div>
        <h2 className="text-xl font-bold text-slate-800">個人工作台</h2>
      </div>

      <div className="grid grid-cols-1 @lg:grid-cols-2 gap-6">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-white/40 p-6 relative overflow-hidden">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
            今日待辦清單
          </h3>
          {employee.myActiveTasks.length > 0 ? (
            <div className="space-y-3">
              {employee.myActiveTasks.slice(0,5).map((task: any) => (
                <div key={task.id} onClick={() => canAccessTasks && navigate('/tasks')} className={`flex items-center gap-4 p-3 rounded-xl transition-colors border border-transparent ${canAccessTasks ? 'hover:bg-slate-50 cursor-pointer hover:border-slate-100' : 'cursor-default'}`}>
                  <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex-shrink-0"></div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-700">{task.name}</p>
                    {task.project?.name && <p className="text-xs text-slate-500 mt-0.5">{task.project.name}</p>}
                  </div>
                  <div className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-md">
                    {task.status}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-center py-8">太棒了！今日無待辦事項</p>
          )}
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-white/40 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-2 h-6 bg-red-500 rounded-full"></span>
            即將逾期 / 已逾期
          </h3>
          {employee.myOverdueTasks.length > 0 ? (
            <div className="space-y-3">
              {employee.myOverdueTasks.map((task: any) => (
                <div key={task.id} onClick={() => canAccessTasks && navigate('/tasks')} className={`flex items-center gap-4 p-3 bg-red-50/50 rounded-xl border border-red-100 transition-colors ${canAccessTasks ? 'cursor-pointer hover:bg-red-100' : 'cursor-default'}`}>
                  <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
                  <div className="flex-1">
                    <p className="font-semibold text-red-900">{task.name}</p>
                    <p className="text-xs text-red-600 mt-0.5">期限: {new Date(task.due_date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <p className="text-slate-400 text-center py-8">沒有即將逾期的任務</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="pb-12 max-w-7xl mx-auto space-y-2">
      {/* Header section */}
      <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 shadow-sm border border-white/60 flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500">
            早安，{user?.name}
          </h1>
          <p className="text-slate-500 mt-1 font-medium">歡迎回到系統，這是您今天的專屬工作區。</p>
        </div>
        <div className="text-right">
          <span className="inline-block px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-bold shadow-inner">
            {user?.department} - {user?.role}
          </span>
        </div>
      </div>

      {isManager && renderGlobalView()}
      {renderLiveProgressSections()}
      {isManager && renderManagerView()}
      {renderEmployeeView()}

      {/* Lightbox Modal: 檢視工程 / 生產製造最新照片 */}
      {previewLightbox.isOpen && previewLightbox.photos.length > 0 && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[200] flex flex-col select-none"
          onClick={() => setPreviewLightbox(prev => ({ ...prev, isOpen: false }))}
        >
          <div
            className="flex items-center justify-between px-6 py-4 bg-slate-900/80 border-b border-white/10 text-white"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <Camera size={18} className="text-indigo-400" />
              <span className="font-bold text-sm md:text-base">{previewLightbox.title}</span>
              <span className="text-xs bg-white/15 px-2.5 py-0.5 rounded-full font-mono">
                {previewLightbox.currentIndex + 1} / {previewLightbox.photos.length}
              </span>
              {previewLightbox.photos[previewLightbox.currentIndex]?.label && (
                <span className="text-xs text-indigo-300 font-bold">
                  【{previewLightbox.photos[previewLightbox.currentIndex].label}】
                </span>
              )}
              {previewLightbox.photos[previewLightbox.currentIndex]?.date && (
                <span className="text-xs text-slate-400">
                  ({previewLightbox.photos[previewLightbox.currentIndex].date})
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setPreviewLightbox(prev => ({ ...prev, isOpen: false }))}
              className="p-2 rounded-lg bg-red-500/80 hover:bg-red-500 text-white cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          <div
            className="relative flex-1 flex items-center justify-center p-4 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {previewLightbox.photos.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setPreviewLightbox(prev => ({
                    ...prev,
                    currentIndex: (prev.currentIndex - 1 + prev.photos.length) % prev.photos.length,
                  }))
                }
                className="absolute left-4 z-20 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 cursor-pointer"
              >
                <ChevronLeft size={24} />
              </button>
            )}

            <img
              src={previewLightbox.photos[previewLightbox.currentIndex]?.url}
              alt="現場最新照片預覽"
              className="max-w-[90vw] max-h-[78vh] object-contain rounded-lg shadow-2xl"
            />

            {previewLightbox.photos.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setPreviewLightbox(prev => ({
                    ...prev,
                    currentIndex: (prev.currentIndex + 1) % prev.photos.length,
                  }))
                }
                className="absolute right-4 z-20 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 cursor-pointer"
              >
                <ChevronRight size={24} />
              </button>
            )}
          </div>

          {previewLightbox.photos.length > 1 && (
            <div
              className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-900/80 border-t border-white/10 overflow-x-auto"
              onClick={e => e.stopPropagation()}
            >
              {previewLightbox.photos.map((ph, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPreviewLightbox(prev => ({ ...prev, currentIndex: idx }))}
                  className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                    idx === previewLightbox.currentIndex
                      ? 'border-indigo-400 scale-105'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={ph.url} alt={ph.label} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: 檢視 / 列印「元融公司 內部派工委託單」 */}
      {viewingOrder && (() => {
        const viewItems: any[] = Array.isArray(viewingOrder.items) ? viewingOrder.items : [];
        let totalQty = 0;
        let totalUnitW = 0;
        let totalWeight = 0;
        viewItems.forEach((it: any) => {
          const q = parseFloat(String(it?.quantity || '').replace(/,/g, ''));
          const uw = parseFloat(String(it?.unit_weight || '').replace(/,/g, ''));
          const tw = parseFloat(String(it?.total_weight || '').replace(/,/g, ''));
          if (!Number.isNaN(q)) totalQty += q;
          if (!Number.isNaN(uw)) totalUnitW += uw;
          if (!Number.isNaN(tw)) totalWeight += tw;
        });

        return (
          <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden">
              <div className="px-6 py-3 bg-slate-800 text-white flex justify-between items-center print:hidden shrink-0">
                <span className="font-bold">派工委託單預覽 — {viewingOrder.dispatch_no}</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleOpenApprove(viewingOrder)}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Stamp size={15} /> 受託單位簽核 / 蓋收圖章
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer size={15} /> 列印 / 另存 PDF
                  </button>
                  <button onClick={() => setViewingOrder(null)} className="text-slate-300 hover:text-white cursor-pointer">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-8 overflow-y-auto flex-1 bg-white text-black" style={{ fontFamily: "'DFKai-SB', '標楷體', 'Microsoft JhengHei', serif" }}>
                <div className="flex justify-between items-end mb-1 text-xs">
                  <div className="font-bold text-sm">派工單號：<span className="font-mono underline">{viewingOrder.dispatch_no}</span></div>
                  <div>2025/5/10 改版</div>
                </div>

                <table className="w-full border-collapse border-2 border-black text-sm">
                  <tbody>
                    <tr>
                      <td colSpan={4} className="border border-black py-3 text-center text-2xl font-bold tracking-widest">
                        元融公司 內部派工委託單
                      </td>
                    </tr>

                    {/* Section 一 */}
                    <tr>
                      <td className="border border-black w-10 text-center font-bold">一</td>
                      <td className="border border-black w-48 p-2 font-bold">送單時間(必填)</td>
                      <td className="border border-black p-2 text-center text-base font-bold">
                        {viewingOrder.submit_date ? new Date(viewingOrder.submit_date).toLocaleDateString('zh-TW') : ''}
                      </td>
                      <td className="border border-black p-2 w-64">
                        <div className="font-bold mb-1">勾選:(必填)</div>
                        <div>1. {viewingOrder.urgency === '急單(3日)' ? '☑' : '□'}急單(3日)</div>
                        <div>2. {viewingOrder.urgency === '一般(7日)' ? '☑' : '□'}一般(7日)</div>
                        <div>3. {viewingOrder.urgency === '長期' ? '☑' : '□'}長期</div>
                      </td>
                    </tr>

                    {/* Section 二 */}
                    <tr>
                      <td rowSpan={7} className="border border-black w-10 text-center font-bold">二</td>
                      <td className="border border-black p-2 font-bold">需求單位(必填)</td>
                      <td className="border border-black p-2 text-center font-bold">{viewingOrder.request_dept}</td>
                      <td className="border border-black p-2">
                        開單人：<span className="underline font-bold mr-3">{viewingOrder.requester_name}</span>
                        電話：<span className="underline">{viewingOrder.requester_phone || '—'}</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 font-bold">預計委託單位(必填)</td>
                      <td colSpan={2} className="border border-black p-2 font-bold">{viewingOrder.target_dept}</td>
                    </tr>
                    <tr>
                      <td rowSpan={3} className="border border-black p-2">
                        <div className="font-bold mb-1">類別(必填)</div>
                        <div>{viewingOrder.category_type === '案場需求' ? '☑' : '□'} 案場需求</div>
                        <div>{viewingOrder.category_type === '工廠內部需求' ? '☑' : '□'} 工廠內部需求</div>
                        <div>{viewingOrder.category_type === '其他需求' ? '☑' : '□'} 其他需求</div>
                        <div className="text-xs text-slate-600">(非案場及公司區域)</div>
                      </td>
                      <td colSpan={2} className="border border-black p-2">
                        案場名稱：<span className="underline font-bold">{viewingOrder.category_type === '案場需求' ? (viewingOrder.site_name || viewingOrder.project?.name) : ''}</span>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2} className="border border-black p-2">
                        廠區：
                        <span className="ml-2">{viewingOrder.category_type === '工廠內部需求' && viewingOrder.factory_area === '新市廠' ? '☑' : '□'}新市廠</span>
                        <span className="ml-3">{viewingOrder.category_type === '工廠內部需求' && viewingOrder.factory_area === '安南廠' ? '☑' : '□'}安南廠</span>
                        <span className="ml-3">{viewingOrder.category_type === '工廠內部需求' && viewingOrder.factory_area === '安定廠' ? '☑' : '□'}安定廠</span>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2} className="border border-black p-2">
                        位置：<span className="underline">{viewingOrder.category_type === '其他需求' ? viewingOrder.other_location : ''}</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 align-top">
                        <div className="font-bold mb-2">委託事項說明(必填)</div>
                        <div className="text-xs text-red-600 leading-relaxed">
                          1. 如需廠內加工，請一併提供圖面。(紙本及電子檔)<br />
                          2. 若無提供圖面，恕不受理派工單。
                        </div>
                      </td>
                      <td colSpan={2} className="border border-black p-3 align-top">
                        <div className="font-bold text-xs mb-2 text-slate-700">【生產製造加工需求明細（鋼構總表格式）】</div>
                        <table className="w-full border-collapse border border-black text-xs mb-2">
                          <thead>
                            <tr className="bg-slate-200">
                              <th className="border border-black p-1">項目</th>
                              <th className="border border-black p-1">構件編號</th>
                              <th className="border border-black p-1 text-right">數量</th>
                              <th className="border border-black p-1">規格尺寸</th>
                              <th className="border border-black p-1 text-right">長度</th>
                              <th className="border border-black p-1">材質</th>
                              <th className="border border-black p-1 text-right">單重(Kg)</th>
                              <th className="border border-black p-1 text-right">總量(Kgs)</th>
                              <th className="border border-black p-1">備註</th>
                            </tr>
                          </thead>
                          <tbody>
                            {viewItems.map((it: any, i: number) => (
                              <tr key={i}>
                                <td className="border border-black p-1 font-bold">{it.category}</td>
                                <td className="border border-black p-1 font-mono">{it.member_no || it.description}</td>
                                <td className="border border-black p-1 text-right font-bold">{it.quantity}</td>
                                <td className="border border-black p-1 font-mono">{it.spec}</td>
                                <td className="border border-black p-1 text-right font-mono">{it.length}</td>
                                <td className="border border-black p-1">{it.material}</td>
                                <td className="border border-black p-1 text-right font-mono">{it.unit_weight}</td>
                                <td className="border border-black p-1 text-right font-mono font-bold">{it.total_weight}</td>
                                <td className="border border-black p-1">{it.note}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-slate-100 font-bold">
                              <td className="border border-black p-1">總計</td>
                              <td className="border border-black p-1"></td>
                              <td className="border border-black p-1 text-right">{(Math.round(totalQty * 100) / 100).toLocaleString()}</td>
                              <td colSpan={3} className="border border-black p-1"></td>
                              <td className="border border-black p-1 text-right font-mono">{(Math.round(totalUnitW * 100) / 100).toLocaleString()}</td>
                              <td className="border border-black p-1 text-right font-mono">{(Math.round(totalWeight * 100) / 100).toLocaleString()}</td>
                              <td className="border border-black p-1"></td>
                            </tr>
                          </tfoot>
                        </table>
                        {viewingOrder.description_note && (
                          <div className="text-xs mt-1 whitespace-pre-wrap">補充說明：{viewingOrder.description_note}</div>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2">
                        <div className="font-bold">需求時間(必填)</div>
                        <div className="text-[11px] text-red-600 leading-tight mt-1">
                          (PS. 如派工內容需先進行材料採購，請先確認材料下單後，預計可入廠日期，再進行需求日期填寫。謝謝。)
                        </div>
                      </td>
                      <td colSpan={2} className="border border-black p-2 text-center text-base font-bold">
                        {viewingOrder.required_date ? new Date(viewingOrder.required_date).toLocaleDateString('zh-TW') : ''}
                      </td>
                    </tr>

                    {/* Section 三 */}
                    <tr>
                      <td rowSpan={2} className="border border-black w-10 text-center font-bold">三</td>
                      <td className="border border-black p-2 font-bold h-12">需求單位主管簽核</td>
                      <td colSpan={2} className="border border-black p-2 text-center text-lg font-bold">{viewingOrder.req_manager_sign}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 font-bold h-14">簽核意見</td>
                      <td colSpan={2} className="border border-black p-2">{viewingOrder.req_manager_comment}</td>
                    </tr>

                    {/* Section 四 */}
                    <tr>
                      <td rowSpan={4} className="border border-black w-10 text-center font-bold">四</td>
                      <td className="border border-black p-2 font-bold h-12">受託單位主管簽名</td>
                      <td className="border border-black p-2 text-center font-bold">
                        <div>{viewingOrder.target_manager_sign}</div>
                        <div className="text-xs font-bold mt-1">
                          簽核：{viewingOrder.approval_status === '同意' ? '☑' : '□'}同意 &nbsp;
                          {viewingOrder.approval_status === '退回' ? '☑' : '□'}退回
                        </div>
                      </td>
                      <td rowSpan={4} className="border border-black p-2 text-center align-middle w-64">
                        <div className="text-xs font-bold text-slate-600 mb-1.5">受託單位收圖章</div>
                        {viewingOrder.drawing_received_date ? (
                          <div className="inline-flex flex-col items-center justify-center w-28 h-28 rounded-full border-2 border-red-600 text-red-600 text-xs font-bold leading-tight shadow-sm">
                            <span>元融科技</span>
                            <span>{viewingOrder.target_dept || '受託單位'}</span>
                            <span className="my-1 border-y border-red-500 px-1 py-0.5 text-[11px]">
                              {viewingOrder.drawing_received_date}
                            </span>
                            <span className="text-sm">收圖章</span>
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-center justify-center w-28 h-28 rounded-full border-2 border-dashed border-slate-300 text-slate-400 text-xs font-bold leading-tight">
                            <span>{viewingOrder.target_dept || '受託單位'}</span>
                            <span className="my-1 text-[11px]">尚未蓋章</span>
                            <span>(收圖章)</span>
                          </div>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 font-bold h-14">簽核意見</td>
                      <td className="border border-black p-2">{viewingOrder.target_manager_comment}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 font-bold h-12">交辦人員簽名</td>
                      <td className="border border-black p-2">{viewingOrder.assigned_staff_sign}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 font-bold h-14">備註</td>
                      <td className="border border-black p-2">{viewingOrder.remarks}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal: 受託單位主管簽核與蓋收圖章專屬介面 */}
      {approvingOrder && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[110] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-gradient-to-r from-rose-600 to-rose-700 text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <Stamp size={22} />
                <div>
                  <h4 className="text-base font-bold">受託單位主管簽核與蓋收圖章</h4>
                  <p className="text-xs text-rose-100">
                    派工單號：{approvingOrder.dispatch_no} ｜ 需求單位：{approvingOrder.request_dept} ➔ 受託單位：{approvingOrder.target_dept}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setApprovingOrder(null)}
                className="text-rose-100 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleApproveSubmit} className="p-6 space-y-5">
              {/* 派工單摘要 */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="col-span-2">
                  <div className="text-slate-400 font-medium">所屬專案</div>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {approvingOrder.project?.project_code} - {approvingOrder.project?.name || approvingOrder.site_name || '-'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium">開單人</div>
                  <div className="font-bold text-slate-800 mt-0.5">{approvingOrder.requester_name || '-'}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium">需求日期</div>
                  <div className="font-bold text-rose-600 mt-0.5">
                    {approvingOrder.required_date ? new Date(approvingOrder.required_date).toLocaleDateString('zh-TW') : '-'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                {/* 左側：簽核表單 */}
                <div className="md:col-span-7 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      受託單位（{approvingOrder.target_dept}）主管簽名 *
                    </label>
                    <input
                      type="text"
                      required
                      value={approveForm.target_manager_sign}
                      onChange={e => setApproveForm({ ...approveForm, target_manager_sign: e.target.value })}
                      placeholder="請輸入受託單位主管姓名"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">簽核結果 *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['同意', '退回'] as const).map(status => (
                        <button
                          key={status}
                          type="button"
                          onClick={() =>
                            setApproveForm(prev => ({
                              ...prev,
                              approval_status: status,
                              drawing_received_date:
                                status === '退回'
                                  ? ''
                                  : prev.drawing_received_date || todayStr,
                            }))
                          }
                          className={`py-2.5 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            approveForm.approval_status === status
                              ? status === '同意'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-red-600 text-white border-red-600 shadow-sm'
                              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {status === '同意' && <CheckCircle2 size={14} />}
                          {status === '同意' ? '同意（開放生產）' : '退回（不開放生產）'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">簽核意見</label>
                    <textarea
                      rows={2}
                      value={approveForm.target_manager_comment}
                      onChange={e => setApproveForm({ ...approveForm, target_manager_comment: e.target.value })}
                      placeholder="可填寫受託單位主管簽核意見或退回原因..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">交辦人員簽名</label>
                      <input
                        type="text"
                        value={approveForm.assigned_staff_sign}
                        onChange={e => setApproveForm({ ...approveForm, assigned_staff_sign: e.target.value })}
                        placeholder="指派/交辦人員"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">備註</label>
                      <input
                        type="text"
                        value={approveForm.remarks}
                        onChange={e => setApproveForm({ ...approveForm, remarks: e.target.value })}
                        placeholder="備註事項"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 右側：受託單位收圖章互動蓋章區 */}
                <div className="md:col-span-5 bg-rose-50/60 border-2 border-rose-200 rounded-xl p-4 flex flex-col items-center text-center space-y-3">
                  <div className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                    <Stamp size={15} /> 受託單位（{approvingOrder.target_dept}）收圖章
                  </div>

                  <div className="py-2">
                    {approveForm.drawing_received_date ? (
                      <div className="inline-flex flex-col items-center justify-center w-32 h-32 rounded-full border-4 border-red-600 bg-white text-red-600 text-xs font-extrabold leading-tight shadow-md select-none">
                        <span className="tracking-widest">元融科技</span>
                        <span className="text-sm">{approvingOrder.target_dept || '受託單位'}</span>
                        <span className="my-1 border-y-2 border-red-500 px-2 py-0.5 text-xs font-mono">
                          {approveForm.drawing_received_date}
                        </span>
                        <span className="text-base tracking-widest">收圖章</span>
                      </div>
                    ) : (
                      <div className="inline-flex flex-col items-center justify-center w-32 h-32 rounded-full border-2 border-dashed border-slate-300 bg-white/80 text-slate-400 text-xs font-bold leading-tight">
                        <span>{approvingOrder.target_dept || '受託單位'}</span>
                        <span className="my-1 text-[11px]">尚未蓋下收圖章</span>
                        <span>請點擊下方蓋章</span>
                      </div>
                    )}
                  </div>

                  <div className="w-full space-y-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setApproveForm({ ...approveForm, drawing_received_date: todayStr })}
                        className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                      >
                        <Stamp size={14} /> 蓋下收圖章 (今日)
                      </button>
                      {approveForm.drawing_received_date && (
                        <button
                          type="button"
                          onClick={() => setApproveForm({ ...approveForm, drawing_received_date: '' })}
                          className="py-2 px-2.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded-lg text-xs font-bold cursor-pointer"
                        >
                          取消蓋章
                        </button>
                      )}
                    </div>
                    <div className="text-left">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">收圖章日期（可手動調整）</label>
                      <input
                        type="date"
                        value={approveForm.drawing_received_date}
                        onChange={e => setApproveForm({ ...approveForm, drawing_received_date: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-rose-200 rounded-lg text-xs bg-white font-mono outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setApprovingOrder(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-bold cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isApproving}
                  className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-bold shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Stamp size={16} />
                  {isApproving ? '簽核儲存中...' : '確認簽核並蓋收圖章'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
