import React, { useState, useMemo } from 'react';
import axios from 'axios';
import { Download, Calendar, Filter } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface ProjectTimelineProps {
  project: any;
  workItemsConfig: any;
  logs: any[];
}

type Granularity = 'DAY' | 'WEEK' | 'BIWEEK' | 'MONTH';

interface TimeBucket {
  id: string;
  topLabel: string;
  subLabel: string;
  startTs: number;
  endTs: number;
  isCurrent: boolean;
  isWeekend?: boolean;
}

class ErrorBoundary extends React.Component<any, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 bg-red-100 text-red-900 font-bold whitespace-pre-wrap">
          {this.state.error && this.state.error.toString()}
          {'\n'}
          {this.state.error && this.state.error.stack}
        </div>
      );
    }
    return this.props.children;
  }
}

const pad2 = (n: number) => String(n).padStart(2, '0');

const formatYMD = (d: Date) =>
  `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}`;

const formatMD = (d: Date) =>
  `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}`;

const toDayStart = (input: string | number | Date): number => {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return NaN;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
};

const toDayEnd = (input: string | number | Date): number => {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return NaN;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
};

const ProjectTimelineInner: React.FC<ProjectTimelineProps> = ({
  project,
  workItemsConfig,
  logs,
}) => {
  const { token } = useAuthStore();
  const [granularity, setGranularity] = useState<Granularity>('WEEK');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [isExporting, setIsExporting] = useState(false);

  // 統計各工項在施工日誌累計完成之進度/數量
  const accumulatedProgressMap = useMemo(() => {
    const map = new Map<string, number>();
    (logs || []).forEach(log => {
      if ((log._logType === 'labor' || !log._logType) && log.work_items) {
        try {
          const items =
            typeof log.work_items === 'string'
              ? JSON.parse(log.work_items)
              : log.work_items;
          if (Array.isArray(items)) {
            items.forEach((item: any) => {
              const rawName = String(item?.name || '').trim();
              if (!rawName) return;
              const cleanKey = rawName.split(/\s*\((?:圖號:|規格:|長度:|材質:)/)[0].trim();
              const parsedVal = parseFloat(
                String(item.progress ?? '0').replace(/%/g, '').replace(/,/g, '')
              );
              if (!Number.isNaN(parsedVal) && parsedVal > 0) {
                map.set(rawName, (map.get(rawName) || 0) + parsedVal);
                if (cleanKey && cleanKey !== rawName) {
                  map.set(cleanKey, (map.get(cleanKey) || 0) + parsedVal);
                }
              }
            });
          }
        } catch (e) {
          console.error('Error parsing work_items:', e);
        }
      }
    });
    return map;
  }, [logs]);

  const now = new Date();
  const todayStartTs = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  ).getTime();
  const todayEndTs = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  ).getTime();

  // 整理所有具備起訖日期的工項與時間範圍
  const { allRows, categories, minTs, maxTs, hasItems } = useMemo(() => {
    const rowsList: any[] = [];
    const catList: string[] = [];
    let minDateTs = Infinity;
    let maxDateTs = -Infinity;

    Object.keys(workItemsConfig || {}).forEach(category => {
      const rawItems = Array.isArray(workItemsConfig[category])
        ? workItemsConfig[category]
        : [];
      const validItems = rawItems.filter((i: any) => {
        if (!i?.startDate || !i?.endDate || !i?.name) return false;
        const s = toDayStart(i.startDate);
        const e = toDayEnd(i.endDate);
        return !Number.isNaN(s) && !Number.isNaN(e) && s <= e;
      });

      if (validItems.length > 0) {
        catList.push(category);
        const enriched = validItems.map((i: any) => {
          const startTs = toDayStart(i.startDate);
          const endTs = toDayEnd(i.endDate);
          if (startTs < minDateTs) minDateTs = startTs;
          if (endTs > maxDateTs) maxDateTs = endTs;

          const contractQty = Number(i.contractQuantity) || 0;
          const unit = i.unit || '式';
          const accumulated =
            Math.round((accumulatedProgressMap.get(String(i.name).trim()) || 0) * 100) /
            100;

          let actualProgress = 0;
          if (contractQty > 0) {
            actualProgress = Math.min(100, Math.round((accumulated / contractQty) * 100));
          } else {
            actualProgress = Math.min(100, Math.round(accumulated));
          }

          // 判斷色塊狀態：
          // 1. 已完工 (100%) -> 綠底 ■ 已完工
          // 2. 逾期未完工 (endTs < todayStartTs && actualProgress < 100) -> 紅底 ★ 延遲警示
          // 3. 正式執行 / 施工中 (actualProgress > 0 || (startTs <= todayEndTs && endTs >= todayStartTs)) -> 深藍底 ● 正式執行
          // 4. 排程預定 / 待開工 (startTs > todayEndTs && actualProgress === 0) -> 橘底 ▲ 排程預定
          let statusKey: 'COMPLETED' | 'DELAYED' | 'ACTIVE' | 'PLANNED' = 'ACTIVE';
          let blockLabel = '● 正式執行';
          let remark = '';

          if (actualProgress >= 100) {
            statusKey = 'COMPLETED';
            blockLabel = '■ 已完工';
            remark = contractQty > 0 ? `已完工 (${accumulated}/${contractQty} ${unit})` : '100% 已完工';
          } else if (endTs < todayStartTs && actualProgress < 100) {
            statusKey = 'DELAYED';
            blockLabel = '★ 延遲警示';
            remark =
              contractQty > 0
                ? `進度落後 (${accumulated}/${contractQty} ${unit})`
                : `逾期未完成 (目前 ${actualProgress}%)`;
          } else if (actualProgress > 0 || (startTs <= todayEndTs && endTs >= todayStartTs)) {
            statusKey = 'ACTIVE';
            blockLabel = '● 正式執行';
            remark =
              contractQty > 0
                ? `執行中 (${accumulated}/${contractQty} ${unit})`
                : '依排程執行中';
          } else {
            statusKey = 'PLANNED';
            blockLabel = '▲ 排程預定';
            remark =
              contractQty > 0
                ? `預定排程 (目標 ${contractQty} ${unit})`
                : '預定排程待開工';
          }

          const startStr = formatYMD(new Date(startTs));
          const endStr = formatYMD(new Date(endTs));
          const gateText = `${endStr.slice(5)} 前完成${
            contractQty > 0 ? `（目標：${contractQty} ${unit}）` : ''
          }`;

          return {
            ...i,
            category,
            startTs,
            endTs,
            startStr,
            endStr,
            contractQty,
            unit,
            accumulated,
            actualProgress,
            statusKey,
            blockLabel,
            gateText,
            remark,
          };
        });

        enriched.sort((a: any, b: any) => a.startTs - b.startTs);
        rowsList.push(...enriched);
      }
    });

    if (rowsList.length === 0) {
      return {
        allRows: [],
        categories: [],
        minTs: 0,
        maxTs: 0,
        hasItems: false,
      };
    }

    return {
      allRows: rowsList,
      categories: catList,
      minTs: minDateTs,
      maxTs: maxDateTs,
      hasItems: true,
    };
  }, [workItemsConfig, accumulatedProgressMap, todayStartTs, todayEndTs]);

  // 依據篩選後的工項決定時間區間欄位 (單日 / 週別 W1~W5 / 雙週 / 月別)
  const filteredRows = useMemo(() => {
    if (selectedCategory === 'ALL') return allRows;
    return allRows.filter(r => r.category === selectedCategory);
  }, [allRows, selectedCategory]);

  // 計算專案涵蓋的所有月份選項 (供「單日」或各模式快速篩選特定月份)
  const availableMonths = useMemo(() => {
    const targetRows = filteredRows.length > 0 ? filteredRows : allRows;
    if (targetRows.length === 0) return [] as { key: string; label: string; startTs: number; endTs: number }[];
    let rMin = Infinity;
    let rMax = -Infinity;
    targetRows.forEach(r => {
      if (r.startTs < rMin) rMin = r.startTs;
      if (r.endTs > rMax) rMax = r.endTs;
    });
    const minD = new Date(rMin);
    const maxD = new Date(rMax);
    const months: { key: string; label: string; startTs: number; endTs: number }[] = [];
    let cur = new Date(minD.getFullYear(), minD.getMonth(), 1);
    const endM = new Date(maxD.getFullYear(), maxD.getMonth() + 1, 0);
    while (cur <= endM) {
      const y = cur.getFullYear();
      const m = cur.getMonth();
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      months.push({
        key: `${y}-${pad2(m + 1)}`,
        label: `${y}年${pad2(m + 1)}月`,
        startTs: new Date(y, m, 1, 0, 0, 0, 0).getTime(),
        endTs: new Date(y, m, daysInMonth, 23, 59, 59, 999).getTime(),
      });
      cur = new Date(y, m + 1, 1);
    }
    return months;
  }, [filteredRows, allRows]);

  const { buckets, rangeStartStr, rangeEndStr } = useMemo(() => {
    const targetRows = filteredRows.length > 0 ? filteredRows : allRows;
    if (targetRows.length === 0) {
      return { buckets: [] as TimeBucket[], rangeStartStr: '', rangeEndStr: '' };
    }

    let rMin = Infinity;
    let rMax = -Infinity;
    targetRows.forEach(r => {
      if (r.startTs < rMin) rMin = r.startTs;
      if (r.endTs > rMax) rMax = r.endTs;
    });

    if (selectedMonth !== 'ALL') {
      const matchedM = availableMonths.find(m => m.key === selectedMonth);
      if (matchedM) {
        rMin = matchedM.startTs;
        rMax = matchedM.endTs;
      }
    }

    const minD = new Date(rMin);
    const maxD = new Date(rMax);
    const spanYears = maxD.getFullYear() !== minD.getFullYear();
    const list: TimeBucket[] = [];
    const WEEKDAY_SHORT = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

    if (granularity === 'DAY') {
      // 單日模式：逐日產生欄位
      let cur = new Date(minD.getFullYear(), minD.getMonth(), minD.getDate(), 0, 0, 0, 0);
      const endDay = new Date(maxD.getFullYear(), maxD.getMonth(), maxD.getDate(), 23, 59, 59, 999);

      while (cur <= endDay) {
        const y = cur.getFullYear();
        const m = cur.getMonth();
        const d = cur.getDate();
        const dow = cur.getDay();
        const bStart = new Date(y, m, d, 0, 0, 0, 0).getTime();
        const bEnd = new Date(y, m, d, 23, 59, 59, 999).getTime();

        const topPrefix = spanYears ? `${String(y).slice(2)}/` : '';
        list.push({
          id: `D-${y}-${pad2(m + 1)}-${pad2(d)}`,
          topLabel: `${topPrefix}${pad2(m + 1)}/${pad2(d)}`,
          subLabel: WEEKDAY_SHORT[dow],
          startTs: bStart,
          endTs: bEnd,
          isCurrent: todayStartTs >= bStart && todayStartTs <= bEnd,
          isWeekend: dow === 0 || dow === 6,
        });

        cur = new Date(y, m, d + 1, 0, 0, 0, 0);
      }
    } else if (granularity === 'WEEK') {
      // 將每個月份切分為月內週別 W1 ~ W5（與參考圖完全一致：例如 11月 W4 11/23-11/30, 12月 W1 12/01-12/06）
      let cur = new Date(minD.getFullYear(), minD.getMonth(), 1);
      const endMonth = new Date(maxD.getFullYear(), maxD.getMonth() + 1, 0);

      while (cur <= endMonth) {
        const y = cur.getFullYear();
        const m = cur.getMonth(); // 0..11
        const daysInMonth = new Date(y, m + 1, 0).getDate();

        let dayCursor = 1;
        let weekNum = 1;
        while (dayCursor <= daysInMonth) {
          const startDateObj = new Date(y, m, dayCursor, 0, 0, 0, 0);
          // 找出該週的週日（若週日超過月底，或月底剩餘天數 <= 2 天則合併到月底）
          const dow = startDateObj.getDay(); // 0(Sun) .. 6(Sat)
          const daysUntilSunday = dow === 0 ? 0 : 7 - dow;
          let endDay = Math.min(daysInMonth, dayCursor + daysUntilSunday);
          // 若第一週只有 1 天(週日)，往後延伸到下週日
          if (endDay === dayCursor && dayCursor === 1 && daysInMonth > 7) {
            endDay = Math.min(daysInMonth, dayCursor + 7);
          }
          // 若距離月底只剩 1~2 天，直接併入本週避免碎片欄位
          if (daysInMonth - endDay <= 2) {
            endDay = daysInMonth;
          }

          const endDateObj = new Date(y, m, endDay, 23, 59, 59, 999);
          const bStart = startDateObj.getTime();
          const bEnd = endDateObj.getTime();

          // 只保留與專案顯示範圍有交集的週次（前後保留1週緩衝）
          if (bEnd >= rMin - 7 * 86400000 && bStart <= rMax + 7 * 86400000) {
            const monthPrefix = spanYears ? `${String(y).slice(2)}/${m + 1}月` : `${m + 1}月`;
            list.push({
              id: `W-${y}-${m + 1}-${weekNum}`,
              topLabel: `${monthPrefix} W${weekNum}`,
              subLabel: `${pad2(m + 1)}/${pad2(dayCursor)}-${pad2(m + 1)}/${pad2(endDay)}`,
              startTs: bStart,
              endTs: bEnd,
              isCurrent: todayStartTs >= bStart && todayStartTs <= bEnd,
            });
          }

          dayCursor = endDay + 1;
          weekNum++;
        }

        cur = new Date(y, m + 1, 1);
      }
    } else if (granularity === 'BIWEEK') {
      // 上半月 (01~15) / 下半月 (16~月底)
      let cur = new Date(minD.getFullYear(), minD.getMonth(), 1);
      const endMonth = new Date(maxD.getFullYear(), maxD.getMonth() + 1, 0);

      while (cur <= endMonth) {
        const y = cur.getFullYear();
        const m = cur.getMonth();
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        const monthPrefix = spanYears ? `${String(y).slice(2)}/${m + 1}月` : `${m + 1}月`;

        const h1Start = new Date(y, m, 1, 0, 0, 0, 0).getTime();
        const h1End = new Date(y, m, 15, 23, 59, 59, 999).getTime();
        if (h1End >= rMin && h1Start <= rMax) {
          list.push({
            id: `BW-${y}-${m + 1}-1`,
            topLabel: `${monthPrefix} 上半`,
            subLabel: `${pad2(m + 1)}/01-${pad2(m + 1)}/15`,
            startTs: h1Start,
            endTs: h1End,
            isCurrent: todayStartTs >= h1Start && todayStartTs <= h1End,
          });
        }

        const h2Start = new Date(y, m, 16, 0, 0, 0, 0).getTime();
        const h2End = new Date(y, m, daysInMonth, 23, 59, 59, 999).getTime();
        if (h2End >= rMin && h2Start <= rMax) {
          list.push({
            id: `BW-${y}-${m + 1}-2`,
            topLabel: `${monthPrefix} 下半`,
            subLabel: `${pad2(m + 1)}/16-${pad2(m + 1)}/${pad2(daysInMonth)}`,
            startTs: h2Start,
            endTs: h2End,
            isCurrent: todayStartTs >= h2Start && todayStartTs <= h2End,
          });
        }

        cur = new Date(y, m + 1, 1);
      }
    } else {
      // 月別
      let cur = new Date(minD.getFullYear(), minD.getMonth(), 1);
      const endMonth = new Date(maxD.getFullYear(), maxD.getMonth() + 1, 0);

      while (cur <= endMonth) {
        const y = cur.getFullYear();
        const m = cur.getMonth();
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        const mStart = new Date(y, m, 1, 0, 0, 0, 0).getTime();
        const mEnd = new Date(y, m, daysInMonth, 23, 59, 59, 999).getTime();

        list.push({
          id: `M-${y}-${m + 1}`,
          topLabel: `${y}年 ${m + 1}月`,
          subLabel: `${pad2(m + 1)}/01-${pad2(m + 1)}/${pad2(daysInMonth)}`,
          startTs: mStart,
          endTs: mEnd,
          isCurrent: todayStartTs >= mStart && todayStartTs <= mEnd,
        });

        cur = new Date(y, m + 1, 1);
      }
    }

    return {
      buckets: list,
      rangeStartStr: formatYMD(minD),
      rangeEndStr: formatYMD(maxD),
    };
  }, [filteredRows, allRows, granularity, todayStartTs, selectedMonth, availableMonths]);

  // 計算每一列命中的時間區間 ID
  const rowsWithBuckets = useMemo(() => {
    return filteredRows.map(r => {
      const activeBucketIds = buckets
        .filter(b => r.startTs <= b.endTs && r.endTs >= b.startTs)
        .map(b => b.id);
      return {
        ...r,
        activeBucketIds,
      };
    });
  }, [filteredRows, buckets]);

  if (!hasItems) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
        <h3 className="text-xl font-bold text-slate-700 mb-2">尚未設定具備日期的工項</h3>
        <p className="text-slate-500">
          請先至「施工細項設定」頁籤，為工項輸入「開始日期」與「結束日期」，才能在專案時間軸中以甘特圖色塊顯示。
        </p>
      </div>
    );
  }

  const bannerTitle = `${project?.project_code || ''} ${
    project?.name || '專案'
  } — 專案工程甘特圖與進度檢核表 (${rangeStartStr} ~ ${rangeEndStr})`.trim();

  const legendText =
    '圖例說明：【綠底 ■ 已完工 (100%)】 ｜ 【深藍底 ● 正式執行 / 施工中】 ｜ 【橘底 ▲ 排程預定 / 待開工】 ｜ 【紅底 ★ 延遲警示 (逾期未完成)】';

  const handleExportExcel = async () => {
    if (!project?.id) return;
    setIsExporting(true);
    try {
      const res = await axios.post(
        `/api/projects/${project.id}/timeline-excel`,
        {
          title: bannerTitle,
          legendText,
          granularity,
          buckets,
          rows: rowsWithBuckets,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob',
        }
      );

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const safeName = `${project.project_code || ''}_${
        project.name || '專案'
      }_甘特圖與進度檢核表.xlsx`.replace(/[\\/:*?"<>|]/g, '_');
      link.setAttribute('download', safeName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export timeline excel error:', err);
      alert('匯出甘特圖 Excel 失敗，請稍後再試');
    } finally {
      setIsExporting(false);
    }
  };

  const getBlockStyleClass = (statusKey: string) => {
    switch (statusKey) {
      case 'COMPLETED':
        return 'bg-[#70AD47] text-white border-[#5c9338]'; // 綠底
      case 'DELAYED':
        return 'bg-[#C00000] text-white border-[#9e0000]'; // 紅底
      case 'PLANNED':
        return 'bg-[#ED7D31] text-white border-[#d16820]'; // 橘底
      case 'ACTIVE':
      default:
        return 'bg-[#2F5597] text-white border-[#234278]'; // 深藍底
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col space-y-3">
      {/* 操作控制列 */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          {/* 工程階段篩選 */}
          <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700">
            <Filter size={14} className="text-slate-500" />
            <span>工程階段：</span>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs font-bold text-slate-800 outline-none"
            >
              <option value="ALL">全部工程階段 ({allRows.length} 項)</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat} ({allRows.filter(r => r.category === cat).length} 項)
                </option>
              ))}
            </select>
          </div>

          {/* 時間顆粒度切換 */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-bold">
            <Calendar size={14} className="text-slate-500 ml-1.5 mr-1 shrink-0" />
            {(
              [
                { id: 'DAY', label: '單日' },
                { id: 'WEEK', label: '週別 (W1~W5)' },
                { id: 'BIWEEK', label: '雙週 (上/下半月)' },
                { id: 'MONTH', label: '月別' },
              ] as { id: Granularity; label: string }[]
            ).map(g => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGranularity(g.id)}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  granularity === g.id
                    ? 'bg-[#1F4E78] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* 月份區間快速篩選 */}
          {availableMonths.length > 1 && (
            <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700">
              <span>顯示月份：</span>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs font-bold text-slate-800 outline-none"
              >
                <option value="ALL">全部期間 ({availableMonths.length} 個月)</option>
                {availableMonths.map(m => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 匯出 Excel 按鈕 */}
        <button
          type="button"
          onClick={handleExportExcel}
          disabled={isExporting}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Download size={15} />
          {isExporting ? '正在產生 Excel...' : '輸出成 Excel (.xlsx)'}
        </button>
      </div>

      {/* 甘特圖主表區塊（參考圖片樣式：深藍大標題 + 圖例說明 + 表格色塊） */}
      <div className="border-2 border-[#1F4E78] rounded-lg overflow-hidden shadow-sm">
        {/* 第一列：深藍主標題橫幅 */}
        <div className="bg-[#1F4E78] text-white text-center py-3 px-4 font-extrabold text-base md:text-lg tracking-wide">
          {bannerTitle}
        </div>

        {/* 第二列：圖例說明列 */}
        <div className="bg-[#E8EEF5] border-y border-[#B4C6E7] px-4 py-2 text-xs font-bold text-[#1F4E78] flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span>圖例說明：</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3.5 h-3.5 rounded-xs bg-[#70AD47] border border-[#5c9338]"></span>
            【綠底】■ 已完工 (100%)
          </span>
          <span className="text-slate-400">｜</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3.5 h-3.5 rounded-xs bg-[#2F5597] border border-[#234278]"></span>
            【深藍底】● 正式執行 / 施工中
          </span>
          <span className="text-slate-400">｜</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3.5 h-3.5 rounded-xs bg-[#ED7D31] border border-[#d16820]"></span>
            【橘底】▲ 排程預定 / 待開工
          </span>
          <span className="text-slate-400">｜</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3.5 h-3.5 rounded-xs bg-[#C00000] border border-[#9e0000]"></span>
            【紅底】★ 延遲警示 (逾期未完成)
          </span>
        </div>

        {/* 第三列起：甘特圖色塊矩陣表格 */}
        <div className="bg-amber-50/70 border-b border-[#B4C6E7] px-3 py-1.5 text-[11px] font-bold text-[#1F4E78] md:hidden flex items-center gap-1.5">
          <span>👉 手機瀏覽提示：表格可左右滑動查看完整甘特圖時程色塊與進度</span>
        </div>
        <div className="overflow-auto max-h-[620px] w-full max-w-full [-webkit-overflow-scrolling:touch]">
          <table className="w-max min-w-full border-separate border-spacing-0 text-xs">
            <thead>
              <tr className="bg-[#2F5597] text-white">
                <th className="sticky top-0 md:left-0 z-40 bg-[#2F5597] border-b border-r border-[#8EA9DB] px-2 py-2.5 w-[52px] min-w-[52px] max-w-[52px] box-border text-center font-bold whitespace-nowrap">
                  項次
                </th>
                <th className="sticky top-0 md:left-[52px] z-40 bg-[#2F5597] border-b border-r border-[#8EA9DB] px-2.5 py-2.5 w-[92px] min-w-[92px] max-w-[92px] box-border text-center font-bold whitespace-nowrap">
                  工程階段
                </th>
                <th className="sticky top-0 md:left-[144px] z-40 bg-[#2F5597] border-b border-r border-[#8EA9DB] px-3 py-2.5 w-[220px] min-w-[220px] max-w-[220px] box-border text-left font-bold whitespace-nowrap">
                  工作模組 / 施工工項
                </th>
                <th className="sticky top-0 md:left-[364px] z-40 bg-[#2F5597] border-b border-r-2 border-[#8EA9DB] px-3 py-2.5 w-[210px] min-w-[210px] max-w-[210px] box-border text-left font-bold whitespace-nowrap md:shadow-[2px_0_5px_-1px_rgba(0,0,0,0.2)]">
                  預計起訖與檢核目標
                </th>

                {buckets.map(b => (
                  <th
                    key={b.id}
                    className={`sticky top-0 z-30 border-b border-r border-[#8EA9DB] ${
                      granularity === 'DAY' ? 'px-1.5 py-1.5 min-w-[64px]' : 'px-2 py-2 min-w-[96px]'
                    } text-center font-bold whitespace-nowrap leading-tight ${
                      b.isCurrent
                        ? 'bg-[#1b3b6f] ring-2 ring-inset ring-amber-300'
                        : b.isWeekend
                        ? 'bg-[#25467e]'
                        : 'bg-[#2F5597]'
                    }`}
                  >
                    <div>{b.topLabel}</div>
                    <div
                      className={`text-[11px] font-mono mt-0.5 ${
                        b.isWeekend ? 'text-amber-200' : 'text-blue-100'
                      }`}
                    >
                      {b.subLabel}
                    </div>
                    {b.isCurrent && (
                      <div className="mt-0.5 inline-block px-1.5 py-0.2 bg-amber-400 text-slate-900 text-[10px] font-extrabold rounded">
                        {granularity === 'DAY' ? '今日' : '本週/今日'}
                      </div>
                    )}
                  </th>
                ))}

                <th className="sticky top-0 z-30 bg-[#2F5597] border-b border-r border-[#8EA9DB] px-2.5 py-2.5 w-16 min-w-[64px] text-center font-bold whitespace-nowrap">
                  進度%
                </th>
                <th className="sticky top-0 z-30 bg-[#2F5597] border-b border-[#8EA9DB] px-3 py-2.5 min-w-[180px] text-left font-bold whitespace-nowrap">
                  備註 / 狀態
                </th>
              </tr>
            </thead>

            <tbody>
              {rowsWithBuckets.map((row, idx) => {
                const seqStr = String(idx + 1).padStart(2, '0');
                const isDelayed = row.statusKey === 'DELAYED';
                const blockClass = getBlockStyleClass(row.statusKey);

                return (
                  <tr
                    key={`${row.category}-${row.name}-${idx}`}
                    className="group bg-white"
                  >
                    {/* 項次 */}
                    <td
                      className={`md:sticky md:left-0 z-20 bg-white group-hover:bg-slate-50 border-b border-r border-slate-300 px-2 py-2.5 w-[52px] min-w-[52px] max-w-[52px] box-border text-center font-mono font-bold ${
                        isDelayed ? 'text-[#C00000]' : 'text-slate-700'
                      }`}
                    >
                      {seqStr}
                    </td>

                    {/* 工程階段 */}
                    <td className="md:sticky md:left-[52px] z-20 bg-white group-hover:bg-slate-50 border-b border-r border-slate-300 px-2.5 py-2.5 w-[92px] min-w-[92px] max-w-[92px] box-border text-center font-bold text-slate-700 whitespace-nowrap truncate">
                      {row.category}
                    </td>

                    {/* 工作模組 / 施工工項 */}
                    <td
                      title={row.name}
                      className={`md:sticky md:left-[144px] z-20 bg-white group-hover:bg-slate-50 border-b border-r border-slate-300 px-3 py-2.5 w-[220px] min-w-[220px] max-w-[220px] box-border font-bold truncate ${
                        isDelayed ? 'text-[#C00000]' : 'text-slate-800'
                      }`}
                    >
                      {isDelayed && <span className="mr-1">★</span>}
                      {row.name}
                    </td>

                    {/* 預計起訖與檢核目標 */}
                    <td
                      className={`md:sticky md:left-[364px] z-20 border-b border-r-2 border-slate-300 px-3 py-2.5 w-[210px] min-w-[210px] max-w-[210px] box-border leading-snug bg-white group-hover:bg-slate-50 md:shadow-[2px_0_5px_-1px_rgba(0,0,0,0.08)] ${
                        isDelayed ? 'text-[#C00000] font-bold' : 'text-slate-700'
                      }`}
                    >
                      <div className="font-mono text-[11px]">
                        {formatMD(new Date(row.startTs))} ~ {formatMD(new Date(row.endTs))}
                      </div>
                      <div className="text-[11px] truncate" title={row.gateText}>{row.gateText}</div>
                    </td>

                    {/* 時間區間色塊欄位 */}
                    {buckets.map(b => {
                      const isHit = row.activeBucketIds.includes(b.id);
                      const shortDayLabel =
                        row.statusKey === 'COMPLETED'
                          ? '■ 完工'
                          : row.statusKey === 'DELAYED'
                          ? '★ 延遲'
                          : row.statusKey === 'PLANNED'
                          ? '▲ 預定'
                          : '● 執行';
                      return (
                        <td
                          key={b.id}
                          title={
                            isHit
                              ? `${row.category} - ${row.name}\n預計工期：${row.startStr} ~ ${row.endStr}\n目前進度：${row.actualProgress}%\n狀態：${row.remark}`
                              : `${b.topLabel} (${b.subLabel})`
                          }
                          className={`border-b border-r border-slate-300 p-0 text-center align-middle h-11 ${
                            isHit
                              ? blockClass
                              : b.isCurrent
                              ? 'bg-amber-50/40'
                              : b.isWeekend
                              ? 'bg-slate-50/70'
                              : 'bg-white'
                          }`}
                        >
                          {isHit && (
                            <div className="w-full h-full px-1 py-2 flex items-center justify-center font-bold text-[11px] tracking-tight whitespace-nowrap select-none">
                              {granularity === 'DAY' ? shortDayLabel : row.blockLabel}
                            </div>
                          )}
                        </td>
                      );
                    })}

                    {/* 進度% */}
                    <td
                      className={`border-b border-r border-slate-300 px-2.5 py-2.5 text-center font-mono font-extrabold ${
                        row.actualProgress >= 100
                          ? 'text-emerald-700 bg-emerald-50/50'
                          : isDelayed
                          ? 'text-[#C00000] bg-red-50/50'
                          : 'text-slate-800 bg-white'
                      }`}
                    >
                      {row.actualProgress}%
                    </td>

                    {/* 備註 / 狀態 */}
                    <td
                      className={`border-b border-slate-300 px-3 py-2.5 text-xs bg-white ${
                        isDelayed
                          ? 'text-[#C00000] font-bold'
                          : row.actualProgress >= 100
                          ? 'text-emerald-700 font-bold'
                          : 'text-slate-700'
                      }`}
                    >
                      {row.remark}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const ProjectTimeline = (props: any) => (
  <ErrorBoundary>
    <ProjectTimelineInner {...props} />
  </ErrorBoundary>
);
export default ProjectTimeline;
