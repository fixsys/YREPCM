import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import {
  X,
  History,
  Download,
  Search,
  Calendar,
  GitCommit,
  Sparkles,
  Wrench,
  Palette,
  Layers,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Code2,
  CheckCircle2
} from 'lucide-react';
import clsx from 'clsx';

export interface ChangelogCommit {
  fullHash: string;
  hash: string;
  date: string;
  time: string;
  isoDate: string;
  author: string;
  type: 'feat' | 'fix' | 'style' | 'refactor' | 'chore' | 'other';
  typeLabel: string;
  module: string;
  descriptionZh: string;
  rawSubject: string;
}

export interface DailyChangelogGroup {
  date: string;
  totalCommits: number;
  featCount: number;
  fixCount: number;
  styleCount: number;
  modules: string[];
  highlights: string[];
  commits: ChangelogCommit[];
}

export interface ChangelogData {
  generatedAt: string;
  latestCommitHash: string;
  latestCommitDate: string;
  totalDays: number;
  totalCommits: number;
  dailyGroups: DailyChangelogGroup[];
  commits: ChangelogCommit[];
}

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSeenLatest?: (hash: string) => void;
}

const TYPE_BADGE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  feat: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200'
  },
  fix: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200'
  },
  style: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200'
  },
  refactor: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200'
  },
  chore: {
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-200'
  },
  other: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200'
  }
};

const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose, onSeenLatest }) => {
  const [data, setData] = useState<ChangelogData | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [showRawGit, setShowRawGit] = useState(false);
  const [collapsedDates, setCollapsedDates] = useState<Record<string, boolean>>({});

  const fetchChangelog = async () => {
    setLoading(true);
    try {
      const res = await axios.get<ChangelogData>('/api/changelog');
      setData(res.data);
      if (res.data?.latestCommitHash && onSeenLatest) {
        onSeenLatest(res.data.latestCommitHash);
      }
    } catch (err) {
      console.error('Failed to fetch changelog:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchChangelog();
    }
  }, [isOpen]);

  const allModules = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    data.commits.forEach((c) => set.add(c.module));
    return Array.from(set);
  }, [data]);

  const filteredGroups = useMemo(() => {
    if (!data) return [];
    const q = searchQuery.trim().toLowerCase();

    return data.dailyGroups
      .map((group) => {
        const matchedCommits = group.commits.filter((c) => {
          if (selectedType !== 'ALL' && c.type !== selectedType) return false;
          if (selectedModule !== 'ALL' && c.module !== selectedModule) return false;
          if (!q) return true;
          return (
            c.descriptionZh.toLowerCase().includes(q) ||
            c.rawSubject.toLowerCase().includes(q) ||
            c.module.toLowerCase().includes(q) ||
            c.hash.toLowerCase().includes(q) ||
            c.date.includes(q)
          );
        });
        return {
          ...group,
          commits: matchedCommits
        };
      })
      .filter((g) => g.commits.length > 0);
  }, [data, searchQuery, selectedType, selectedModule]);

  const totalFilteredCommits = useMemo(
    () => filteredGroups.reduce((acc, g) => acc + g.commits.length, 0),
    [filteredGroups]
  );

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const response = await axios.get('/api/changelog/export', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `元融系統更新紀錄_Changelog_${data?.latestCommitDate || new Date().toISOString().slice(0, 10)}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export changelog excel error:', err);
      alert('匯出 Excel 失敗，請稍後再試');
    } finally {
      setExporting(false);
    }
  };

  const toggleDateCollapse = (date: string) => {
    setCollapsedDates((prev) => ({ ...prev, [date]: !prev[date] }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Banner Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0">
              <History size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-lg sm:text-xl font-bold tracking-wide">系統版本更新紀錄 (Changelog)</h3>
                {data?.latestCommitHash && (
                  <span className="px-2.5 py-0.5 text-xs font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    最新版 #{data.latestCommitHash}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                每次執行 <code className="px-1.5 py-0.5 bg-slate-800 rounded text-amber-300 font-mono">update.bat</code> 時自動從 Git 同步最新更新紀錄與 Excel 報表
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={fetchChangelog}
              disabled={loading}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
              title="重新從 Git 同步"
            >
              <RefreshCw size={14} className={clsx(loading && 'animate-spin')} />
              <span className="hidden sm:inline">即時同步</span>
            </button>
            <button
              onClick={handleExportExcel}
              disabled={exporting || loading}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download size={16} />
              <span>{exporting ? '匯出中...' : '匯出 Excel (.xlsx)'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="關閉"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Summary KPI Bar */}
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 px-5 py-3 bg-slate-50 border-b border-slate-200 shrink-0">
            <div className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/80 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Calendar size={18} />
              </div>
              <div>
                <div className="text-[11px] text-slate-500 font-medium">累計更新天數</div>
                <div className="text-base sm:text-lg font-bold text-slate-800">{data.totalDays} 天</div>
              </div>
            </div>
            <div className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/80 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <GitCommit size={18} />
              </div>
              <div>
                <div className="text-[11px] text-slate-500 font-medium">總提交版本數</div>
                <div className="text-base sm:text-lg font-bold text-slate-800">{data.totalCommits} 筆</div>
              </div>
            </div>
            <div className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/80 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <Sparkles size={18} />
              </div>
              <div>
                <div className="text-[11px] text-slate-500 font-medium">新功能開發</div>
                <div className="text-base sm:text-lg font-bold text-emerald-700">
                  {data.commits.filter((c) => c.type === 'feat').length} 項
                </div>
              </div>
            </div>
            <div className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/80 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <Wrench size={18} />
              </div>
              <div>
                <div className="text-[11px] text-slate-500 font-medium">問題修正與優化</div>
                <div className="text-base sm:text-lg font-bold text-amber-700">
                  {data.commits.filter((c) => c.type === 'fix' || c.type === 'style' || c.type === 'refactor').length} 項
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter & Search Toolbar */}
        <div className="px-5 py-3 bg-white border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 shrink-0">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋更新內容、日期 (例: 2026-11-25)、模組或版本號..."
              className="w-full pl-9 pr-4 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="px-2.5 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">所有系統模組 ({allModules.length})</option>
              {allModules.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-medium">
              {[
                { id: 'ALL', label: '全部' },
                { id: 'feat', label: '新功能' },
                { id: 'fix', label: '問題修正' },
                { id: 'style', label: '介面優化' }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedType(t.id)}
                  className={clsx(
                    'px-2.5 py-1 rounded-md transition-colors cursor-pointer',
                    selectedType === t.id ? 'bg-white text-blue-600 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowRawGit(!showRawGit)}
              className={clsx(
                'px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer',
                showRawGit
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              )}
              title="顯示/隱藏 Git 原始英文 Commit 訊息"
            >
              <Code2 size={14} />
              <span>Git 原文</span>
            </button>
          </div>
        </div>

        {/* Main Timeline Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 bg-slate-50/60 space-y-4">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-3">
              <RefreshCw size={28} className="animate-spin text-blue-600" />
              <p className="text-sm font-medium">正在載入 Git 版本更新紀錄...</p>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <p className="text-base font-medium">找不到符合篩選條件的更新紀錄</p>
              <p className="text-xs text-slate-400 mt-1">請嘗試清除搜尋關鍵字或切換模組篩選</p>
            </div>
          ) : (
            filteredGroups.map((group, groupIdx) => {
              const isCollapsed = Boolean(collapsedDates[group.date]);
              const isLatestDay = groupIdx === 0 && selectedType === 'ALL' && selectedModule === 'ALL' && !searchQuery;

              return (
                <div
                  key={group.date}
                  className={clsx(
                    'bg-white rounded-xl border shadow-xs overflow-hidden transition-all',
                    isLatestDay ? 'border-blue-300 ring-1 ring-blue-100' : 'border-slate-200'
                  )}
                >
                  {/* Day Header */}
                  <div
                    onClick={() => toggleDateCollapse(group.date)}
                    className={clsx(
                      'px-4 py-3 flex flex-wrap items-center justify-between gap-2 cursor-pointer select-none transition-colors',
                      isLatestDay ? 'bg-gradient-to-r from-blue-50/80 to-indigo-50/40 hover:from-blue-50' : 'bg-slate-50/80 hover:bg-slate-100/70'
                    )}
                  >
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <button className="text-slate-500 hover:text-slate-800">
                        {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                      </button>
                      <span className="font-mono text-sm sm:text-base font-bold text-slate-800 flex items-center gap-1.5">
                        <Calendar size={15} className="text-blue-600" />
                        {group.date}
                      </span>
                      {isLatestDay && (
                        <span className="px-2 py-0.5 text-[11px] font-bold bg-blue-600 text-white rounded-full">
                          最新更新
                        </span>
                      )}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {group.modules.slice(0, 5).map((mod) => (
                          <span
                            key={mod}
                            className="px-2 py-0.5 text-[11px] font-medium bg-white text-slate-700 border border-slate-200 rounded-md flex items-center gap-1"
                          >
                            <Layers size={10} className="text-slate-400" />
                            {mod}
                          </span>
                        ))}
                        {group.modules.length > 5 && (
                          <span className="text-[11px] text-slate-500">+{group.modules.length - 5} 模組</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      {group.featCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                          +{group.featCount} 新功能
                        </span>
                      )}
                      {group.fixCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
                          {group.fixCount} 修正
                        </span>
                      )}
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-200/80 text-slate-700 font-semibold">
                        共 {group.commits.length} 筆
                      </span>
                    </div>
                  </div>

                  {/* Day Commits List */}
                  {!isCollapsed && (
                    <div className="divide-y divide-slate-100">
                      {group.commits.map((commit) => {
                        const badge = TYPE_BADGE_STYLES[commit.type] || TYPE_BADGE_STYLES.other;
                        return (
                          <div
                            key={commit.fullHash}
                            className="px-4 py-2.5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <span
                                className={clsx(
                                  'px-2 py-0.5 text-[11px] font-semibold rounded border shrink-0 mt-0.5',
                                  badge.bg,
                                  badge.text,
                                  badge.border
                                )}
                              >
                                {commit.typeLabel}
                              </span>
                              <span className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-700 rounded shrink-0 mt-0.5">
                                {commit.module}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-slate-800 font-medium leading-snug break-words">
                                  {commit.descriptionZh}
                                </p>
                                {showRawGit && (
                                  <p className="text-xs font-mono text-slate-400 mt-0.5 break-all">
                                    {commit.rawSubject}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center text-xs text-slate-400 font-mono">
                              <span>{commit.time}</span>
                              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200">
                                #{commit.hash}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 shrink-0">
          <div>
            顯示 <span className="font-semibold text-slate-700">{filteredGroups.length}</span> 個更新日、共{' '}
            <span className="font-semibold text-slate-700">{totalFilteredCommits}</span> 筆提交紀錄
          </div>
          <div>
            最後同步時間：{data?.generatedAt ? new Date(data.generatedAt).toLocaleString('zh-TW') : '-'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangelogModal;
