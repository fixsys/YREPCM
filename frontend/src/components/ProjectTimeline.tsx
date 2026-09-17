import React, { useState, useMemo, useRef, useEffect } from 'react';

interface ProjectTimelineProps {
  project: any;
  workItemsConfig: any;
  logs: any[];
}

const ProjectTimeline: React.FC<ProjectTimelineProps> = ({ project, workItemsConfig, logs }) => {
  const [zoomLevel, setZoomLevel] = useState(100);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse actual progress from logs
  // logs are labor reports containing work_items JSON string
  const actualProgressMap = useMemo(() => {
    const map = new Map<string, number>();
    logs.forEach(log => {
      if (log._logType === 'labor' && log.work_items) {
        try {
          const items = JSON.parse(log.work_items);
          items.forEach((item: any) => {
            const currentMax = map.get(item.name) || 0;
            // Parse progress string like "50%" or "50"
            const parsedProgress = parseInt(item.progress?.toString().replace('%', '') || '0', 10);
            if (!isNaN(parsedProgress) && parsedProgress > currentMax) {
              map.set(item.name, parsedProgress);
            }
          });
        } catch (e) {}
      }
    });
    return map;
  }, [logs]);

  // Filter valid items (must have start and end date)
  const timelineData = useMemo(() => {
    const data: { category: string; items: any[] }[] = [];
    let minDate = new Date('2099-01-01').getTime();
    let maxDate = new Date('1970-01-01').getTime();
    let hasItems = false;

    Object.keys(workItemsConfig || {}).forEach(category => {
      const items = (workItemsConfig[category] || []).filter((i: any) => i.startDate && i.endDate && i.name);
      if (items.length > 0) {
        const enrichedItems = items.map((i: any) => {
          const sDate = new Date(i.startDate).getTime();
          const eDate = new Date(i.endDate).getTime();
          if (sDate < minDate) minDate = sDate;
          if (eDate > maxDate) maxDate = eDate;
          
          return {
            ...i,
            startTs: sDate,
            endTs: eDate,
            actualProgress: actualProgressMap.get(i.name) || 0
          };
        });
        // Sort items by start date
        enrichedItems.sort((a: any, b: any) => a.startTs - b.startTs);
        data.push({ category, items: enrichedItems });
        hasItems = true;
      }
    });

    if (!hasItems) {
      return { data: [], minDate: 0, maxDate: 0, totalDays: 0, hasItems: false };
    }

    // Add 1 month padding
    const paddedMin = new Date(minDate);
    paddedMin.setMonth(paddedMin.getMonth() - 1);
    paddedMin.setDate(1);

    const paddedMax = new Date(maxDate);
    paddedMax.setMonth(paddedMax.getMonth() + 2);
    paddedMax.setDate(0);

    const totalDays = Math.ceil((paddedMax.getTime() - paddedMin.getTime()) / (1000 * 60 * 60 * 24));

    return { data, minDate: paddedMin.getTime(), maxDate: paddedMax.getTime(), totalDays, hasItems: true };
  }, [workItemsConfig, actualProgressMap]);

  // Handle Ctrl + Scroll to Zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        setZoomLevel(prev => {
          let newZoom = prev + (e.deltaY < 0 ? 25 : -25);
          return Math.max(100, Math.min(600, newZoom));
        });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  if (!timelineData.hasItems) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
        <h3 className="text-xl font-bold text-slate-700 mb-2">尚未設定具備日期的工項</h3>
        <p className="text-slate-500">請先至「施工細項設定」頁籤，為工項輸入「開始日期」與「結束日期」，才能在時間軸中顯示。</p>
      </div>
    );
  }

  const { data, minDate, maxDate, totalDays } = timelineData;
  const todayTs = new Date().getTime();
  
  // Base day width is 2px at 100% zoom.
  // At 600%, it is 12px per day.
  const dayWidth = 2 * (zoomLevel / 100);
  const totalWidth = totalDays * dayWidth;

  const getX = (ts: number) => {
    const days = (ts - minDate) / (1000 * 60 * 60 * 24);
    return Math.max(0, days * dayWidth);
  };

  const getWidth = (startTs: number, endTs: number) => {
    const days = (endTs - startTs) / (1000 * 60 * 60 * 24) + 1; // +1 to include end day
    return Math.max(0, days * dayWidth);
  };

  const todayX = getX(todayTs);

  // Generate headers based on zoom level
  const renderTimeHeaders = () => {
    const headers = [];
    const current = new Date(minDate);
    current.setHours(0,0,0,0);
    const end = new Date(maxDate);

    if (zoomLevel < 150) {
      // Quarters
      while (current <= end) {
        const year = current.getFullYear();
        const quarter = Math.floor(current.getMonth() / 3) + 1;
        const qStart = new Date(year, (quarter - 1) * 3, 1);
        const qEnd = new Date(year, quarter * 3, 0);
        
        let actualStart = qStart.getTime() < minDate ? minDate : qStart.getTime();
        let actualEnd = qEnd.getTime() > maxDate ? maxDate : qEnd.getTime();
        
        if (actualStart <= actualEnd) {
          headers.push(
            <div key={`q-${year}-${quarter}`} 
                 className="absolute border-r border-slate-200 h-full flex items-center justify-center text-xs font-bold text-slate-600 bg-slate-50"
                 style={{ left: getX(actualStart), width: getWidth(actualStart, actualEnd) }}>
              Q{quarter} ({year})
            </div>
          );
        }
        current.setMonth(current.getMonth() + 3);
      }
    } else if (zoomLevel < 300) {
      // Months
      while (current <= end) {
        const year = current.getFullYear();
        const month = current.getMonth();
        const mStart = new Date(year, month, 1);
        const mEnd = new Date(year, month + 1, 0);
        
        let actualStart = mStart.getTime() < minDate ? minDate : mStart.getTime();
        let actualEnd = mEnd.getTime() > maxDate ? maxDate : mEnd.getTime();

        if (actualStart <= actualEnd) {
          headers.push(
            <div key={`m-${year}-${month}`} 
                 className="absolute border-r border-slate-200 h-full flex items-center justify-center text-xs font-bold text-slate-600 bg-slate-50"
                 style={{ left: getX(actualStart), width: getWidth(actualStart, actualEnd) }}>
              {month + 1}月
            </div>
          );
        }
        current.setMonth(current.getMonth() + 1);
      }
    } else {
      // Days (simplified to show tick marks or week blocks to avoid thousands of divs)
      // We will show Months on top half, days on bottom half
      while (current <= end) {
        const year = current.getFullYear();
        const month = current.getMonth();
        const date = current.getDate();
        
        // Only render text for 1st, 10th, 20th if width allows, otherwise just a tick
        const showText = date === 1 || date === 10 || date === 20;
        
        headers.push(
          <div key={`d-${year}-${month}-${date}`} 
               className={`absolute border-r border-slate-200 h-full flex items-end justify-center text-[10px] text-slate-500 pb-1 ${date === 1 ? 'bg-slate-100 border-l border-slate-300' : ''}`}
               style={{ left: getX(current.getTime()), width: dayWidth }}>
            {showText ? date : ''}
          </div>
        );
        current.setDate(current.getDate() + 1);
      }
    }
    return headers;
  };

  const getStatusColor = (item: any) => {
    if (item.actualProgress >= 100) return 'bg-blue-500';
    if (item.endTs < todayTs && item.actualProgress < 100) return 'bg-red-500'; // Delayed
    return 'bg-blue-400';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col h-[700px]">
      
      {/* Toolbar */}
      <div className="flex justify-between items-center mb-4 pb-2 border-b">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">專案總體與工項時間軸</h3>
          <p className="text-sm text-slate-500">
            期間：{new Date(minDate).toLocaleDateString()} - {new Date(maxDate).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border">
            <span className="w-3 h-3 bg-slate-200 rounded-sm"></span> 預計工期
            <span className="w-3 h-3 bg-blue-500 rounded-sm ml-2"></span> 實際完成比例
            <span className="w-3 h-3 bg-red-500 rounded-sm ml-2"></span> 延遲警示
            <span className="w-px h-3 bg-red-500 mx-2"></span> 今日 ({new Date().toLocaleDateString(undefined, {month:'2-digit', day:'2-digit'})})
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 mr-2">提示: 按住 Ctrl + 滾輪可縮放</span>
            <button onClick={() => setZoomLevel(Math.max(100, zoomLevel - 25))} className="px-2 py-1 border rounded hover:bg-slate-50">- 縮小</button>
            <span className="text-sm font-bold w-12 text-center">{zoomLevel}%</span>
            <button onClick={() => setZoomLevel(Math.min(600, zoomLevel + 25))} className="px-2 py-1 border rounded hover:bg-slate-50">+ 放大</button>
          </div>
        </div>
      </div>

      {/* Gantt Chart Area */}
      <div className="flex-1 overflow-auto border border-slate-200 rounded-lg relative flex" ref={containerRef}>
        
        {/* Left Frozen Column: Items List */}
        <div className="w-64 flex-shrink-0 bg-white z-20 sticky left-0 border-r border-slate-300 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
          {/* Top-left empty corner for header */}
          <div className="h-12 border-b border-slate-300 bg-slate-100 sticky top-0 z-30 flex items-center px-4 font-bold text-slate-600 text-sm">
            工程階段 / 工項名稱
          </div>
          
          <div className="flex flex-col">
            {data.map((categoryGroup, cIdx) => (
              <React.Fragment key={cIdx}>
                <div className="bg-slate-50 font-bold text-slate-700 px-4 py-2 border-b text-sm">
                  {categoryGroup.category}
                </div>
                {categoryGroup.items.map((item, iIdx) => (
                  <div key={iIdx} className="px-4 py-2 border-b text-sm text-slate-600 hover:bg-teal-50 truncate h-10 flex items-center" title={item.name}>
                    {iIdx + 1}. {item.name}
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Right Scrollable Timeline Area */}
        <div className="flex-1 relative bg-white" style={{ minWidth: totalWidth }}>
          
          {/* Top Frozen Row: Timeline Header */}
          <div className="h-12 border-b border-slate-300 sticky top-0 z-10 bg-slate-50 overflow-hidden relative w-full">
            {renderTimeHeaders()}
            {/* Today Line Header indicator */}
            {todayX >= 0 && todayX <= totalWidth && (
              <div className="absolute top-0 bottom-0 bg-red-500 w-px z-20" style={{ left: todayX }}>
                <div className="absolute top-1 -ml-6 bg-red-500 text-white text-[10px] px-1 rounded whitespace-nowrap">今日</div>
              </div>
            )}
          </div>

          {/* Timeline Grid & Bars */}
          <div className="relative w-full" style={{ height: 'calc(100% - 3rem)' }}>
            
            {/* Background Grid Lines based on months */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
               {renderTimeHeaders()}
            </div>

            {/* Today Line Line indicator */}
            {todayX >= 0 && todayX <= totalWidth && (
              <div className="absolute top-0 bottom-0 bg-red-500 w-px border-l border-dashed border-red-500 z-10 pointer-events-none" style={{ left: todayX }}></div>
            )}

            {/* Data Rows */}
            <div className="flex flex-col relative z-0">
              {data.map((categoryGroup, cIdx) => (
                <React.Fragment key={cIdx}>
                  <div className="h-[37px] border-b bg-slate-50/30"></div> {/* Category gap */}
                  {categoryGroup.items.map((item, iIdx) => {
                    const x = getX(item.startTs);
                    const w = getWidth(item.startTs, item.endTs);
                    const isDelayed = item.endTs < todayTs && item.actualProgress < 100;

                    return (
                      <div key={iIdx} className="h-10 border-b hover:bg-slate-50 relative group">
                        
                        {/* Planned Bar (Grey) */}
                        <div className="absolute top-2 h-5 bg-slate-200 rounded-full" style={{ left: x, width: w }}>
                          
                          {/* Actual Progress Bar (Colored) */}
                          <div className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ${getStatusColor(item)}`}
                               style={{ width: \`\${item.actualProgress}%\` }}>
                          </div>

                          {/* Delayed Warning Icon */}
                          {isDelayed && (
                            <div className="absolute -right-6 top-0 text-red-500 text-xs flex items-center h-full font-bold">
                              ⚠️
                            </div>
                          )}
                        </div>

                        {/* Tooltip */}
                        <div className="hidden group-hover:block absolute z-50 bg-slate-800 text-white text-xs p-3 rounded shadow-lg whitespace-nowrap"
                             style={{ left: Math.min(x + w / 2, totalWidth - 200), top: '24px' }}>
                          <div className="font-bold text-sm mb-1">{item.name}</div>
                          <div>預計: {item.startDate} ~ {item.endDate}</div>
                          <div>實際進度: {item.actualProgress}%</div>
                          {isDelayed && <div className="text-red-400 font-bold mt-1">狀態: 進度落後</div>}
                          {item.actualProgress >= 100 && <div className="text-green-400 font-bold mt-1">狀態: 已完成</div>}
                        </div>
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectTimeline;
