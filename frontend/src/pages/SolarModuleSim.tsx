import React, { useState, useMemo, useCallback } from 'react';
import { Settings, Maximize, Zap, LayoutGrid, Info, ArrowRightLeft, ArrowUpDown, Shapes, Route, MousePointerClick } from 'lucide-react';

export default function App() {
  // --- 狀態管理 ---
  // 場地參數 (公尺)
  const [siteWidth, setSiteWidth] = useState(20);
  const [siteLength, setSiteLength] = useState(15);
  const [edgeClearance, setEdgeClearance] = useState(0.5);

  // 場地型態擴充
  const [siteShape, setSiteShape] = useState('rectangle'); // rectangle, l-shape, u-shape, custom
  const [cutoutWidth, setCutoutWidth] = useState(5);
  const [cutoutLength, setCutoutLength] = useState(5);
  
  // 新增：屋頂與架設參數
  const [roofType, setRoofType] = useState('A'); // A: 平屋頂, B: 單尖屋頂, C: 雙尖屋頂, D: 地面型
  const [installType, setInstallType] = useState('roof_flat'); // roof_flat, roof_awning, ground_awning
  const [dripHeight, setDripHeight] = useState(3); // 滴水高度 (公尺)

  // 自由排佈模式：記錄被使用者手動點擊隱藏的模組 ID 集合
  const [disabledPanelIds, setDisabledPanelIds] = useState(new Set());

  // 走道配置
  const [vWalkwayCount, setVWalkwayCount] = useState(0);
  const [vWalkwayWidth, setVWalkwayWidth] = useState(1);
  const [hWalkwayCount, setHWalkwayCount] = useState(0);
  const [hWalkwayWidth, setHWalkwayWidth] = useState(1);

  // 模組參數 (公尺)
  const [panelWidth, setPanelWidth] = useState(1.13);
  const [panelLength, setPanelLength] = useState(1.72);
  const [panelPower, setPanelPower] = useState(400);
  const [panelSpacing, setPanelSpacing] = useState(0.02);

  // 配置設定
  const [orientation, setOrientation] = useState('portrait');

  // --- 互動邏輯 ---
  // 自由排佈：點擊模組切換顯示/隱藏
  const togglePanel = useCallback((id) => {
    if (siteShape !== 'custom') return;
    setDisabledPanelIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, [siteShape]);

  // 自由排佈：全部清空
  const clearAllPanels = useCallback((allIds) => {
    setDisabledPanelIds(new Set(allIds));
  }, []);

  // 自由排佈：全選填滿
  const fillAllPanels = useCallback(() => {
    setDisabledPanelIds(new Set());
  }, []);


  // --- 核心計算邏輯 ---
  const calculations = useMemo(() => {
    const actualPanelWidth = orientation === 'portrait' ? panelWidth : panelLength;
    const actualPanelLength = orientation === 'portrait' ? panelLength : panelWidth;

    const availableWidth = Math.max(0, siteWidth - 2 * edgeClearance);
    const availableLength = Math.max(0, siteLength - 2 * edgeClearance);

    // 走道與分區計算函數 (1D)
    const calc1DLayout = (availSize, panelSize, spacing, wCount, wWidth) => {
        const blocks = wCount + 1;
        const blockAvail = (availSize - wCount * wWidth) / blocks;
        if (blockAvail <= 0) return [];

        const itemsPerBlock = Math.floor((blockAvail + spacing) / (panelSize + spacing));
        if (itemsPerBlock <= 0) return [];

        const usedBlockSize = itemsPerBlock * panelSize + Math.max(0, itemsPerBlock - 1) * spacing;
        const totalUsedSize = usedBlockSize * blocks + wCount * wWidth;
        const startOffset = (availSize - totalUsedSize) / 2;

        const pos = [];
        let curr = startOffset;
        for (let b = 0; b < blocks; b++) {
            for (let i = 0; i < itemsPerBlock; i++) {
                pos.push(curr);
                curr += panelSize + spacing;
            }
            curr = curr - spacing + wWidth;
        }
        return pos;
    };

    const xPositions = calc1DLayout(availableWidth, actualPanelWidth, panelSpacing, vWalkwayCount, vWalkwayWidth);
    const yPositions = calc1DLayout(availableLength, actualPanelLength, panelSpacing, hWalkwayCount, hWalkwayWidth);

    const actualCutoutW = Math.min(cutoutWidth, siteWidth);
    const actualCutoutL = Math.min(cutoutLength, siteLength);

    const panelsData = [];
    const allIds = [];
    let activePanelsCount = 0;

    yPositions.forEach((y, rIdx) => {
        xPositions.forEach((x, cIdx) => {
            const id = `${rIdx}-${cIdx}`;
            allIds.push(id);
            
            const absX = edgeClearance + x;
            const absY = edgeClearance + y;
            const w = actualPanelWidth;
            const h = actualPanelLength;
            
            let isCutout = false;
            if (siteShape === 'l-shape') {
                const cutoutX = siteWidth - actualCutoutW;
                if (absX + w > cutoutX - edgeClearance && absY < actualCutoutL + edgeClearance) isCutout = true;
            } else if (siteShape === 'u-shape') {
                const cx1 = (siteWidth - actualCutoutW) / 2;
                const cx2 = cx1 + actualCutoutW;
                if (absX + w > cx1 - edgeClearance && absX < cx2 + edgeClearance && absY < actualCutoutL + edgeClearance) isCutout = true;
            }

            // 判斷是否顯示該片模組
            let isActive = true;
            if (siteShape === 'custom') {
                isActive = !disabledPanelIds.has(id); // 自訂模式下，檢查是否被使用者手動隱藏
            } else {
                isActive = !isCutout; // L/U型模式下，由演算法決定
            }

            panelsData.push({ id, x: absX, y: absY, w, h, isActive, isCutout });
            if (isActive) activePanelsCount++;
        });
    });

    const totalCapacityKW = (activePanelsCount * panelPower) / 1000;
    
    let totalSiteArea = siteWidth * siteLength;
    if (siteShape === 'l-shape' || siteShape === 'u-shape') {
        totalSiteArea -= (actualCutoutW * actualCutoutL);
    }
    // 自訂模式的總面積基準仍以最大矩形框為主
    
    const totalPanelArea = activePanelsCount * (panelWidth * panelLength);
    const utilizationRate = totalSiteArea > 0 ? (totalPanelArea / totalSiteArea) * 100 : 0;

    return {
      cols: xPositions.length,
      rows: yPositions.length,
      totalPanels: activePanelsCount,
      totalCapacityKW,
      utilizationRate,
      panelsData,
      allIds,
      availableWidth,
      availableLength,
      actualCutoutW,
      actualCutoutL
    };
  }, [siteWidth, siteLength, edgeClearance, panelWidth, panelLength, panelPower, panelSpacing, orientation, siteShape, cutoutWidth, cutoutLength, vWalkwayCount, vWalkwayWidth, hWalkwayCount, hWalkwayWidth, disabledPanelIds]);

  const renderCrossSection = () => {
    const cx = 50;
    const yGround = 45;
    
    const bW = 60;
    const bH = 15;
    const bLeft = cx - bW/2;
    const bRight = cx + bW/2;
    const yRoofBase = yGround - bH;

    let roofSvg = null;
    let installSvg = null;

    if (roofType !== 'D') {
      roofSvg = (
        <g>
          <rect x={bLeft} y={yRoofBase} width={bW} height={bH} fill="#cbd5e1" stroke="#64748b" strokeWidth="0.5" />
        </g>
      );
    }

    let roofTopY = yRoofBase;

    if (roofType === 'A') {
      roofSvg = (
        <g>
          {roofSvg}
          <line x1={bLeft - 2} y1={yRoofBase} x2={bRight + 2} y2={yRoofBase} stroke="#475569" strokeWidth="1" />
        </g>
      );
    } else if (roofType === 'B') {
      roofTopY = yRoofBase - 5;
      roofSvg = (
        <g>
          {roofSvg}
          <polygon points={`${bLeft-2},${yRoofBase} ${bRight},${roofTopY} ${bRight+2},${roofTopY}`} fill="#94a3b8" stroke="#475569" strokeWidth="0.5" />
        </g>
      );
    } else if (roofType === 'C') {
      roofTopY = yRoofBase - 8;
      roofSvg = (
        <g>
          {roofSvg}
          <polygon points={`${bLeft-2},${yRoofBase} ${cx},${roofTopY} ${bRight+2},${yRoofBase}`} fill="#94a3b8" stroke="#475569" strokeWidth="0.5" />
        </g>
      );
    }

    const dh = dripHeight * 2; 

    if (installType === 'roof_flat') {
      if (roofType === 'A') {
        installSvg = <line x1={bLeft} y1={yRoofBase - 0.5} x2={bRight} y2={yRoofBase - 0.5} stroke="#3b82f6" strokeWidth="1" />;
      } else if (roofType === 'B') {
        installSvg = <line x1={bLeft} y1={yRoofBase - 0.5} x2={bRight} y2={roofTopY - 0.5} stroke="#3b82f6" strokeWidth="1" />;
      } else if (roofType === 'C') {
        installSvg = (
          <g>
            <line x1={bLeft} y1={yRoofBase - 0.5} x2={cx} y2={roofTopY - 0.5} stroke="#3b82f6" strokeWidth="1" />
            <line x1={cx} y1={roofTopY - 0.5} x2={bRight} y2={yRoofBase - 0.5} stroke="#3b82f6" strokeWidth="1" />
          </g>
        );
      }
    } else if (installType === 'roof_awning' && roofType !== 'D') {
      installSvg = (
        <g>
          <line x1={bLeft + 5} y1={yRoofBase} x2={bLeft + 5} y2={yRoofBase - dh} stroke="#64748b" strokeWidth="0.8" />
          <line x1={bRight - 5} y1={yRoofBase} x2={bRight - 5} y2={yRoofBase - dh} stroke="#64748b" strokeWidth="0.8" />
          <line x1={bLeft - 2} y1={yRoofBase - dh} x2={bRight + 2} y2={yRoofBase - dh - 2} stroke="#3b82f6" strokeWidth="1.5" />
          <text x={cx} y={yRoofBase - dh / 2} fontSize="3" fill="#64748b" textAnchor="middle">滴水高 {dripHeight}m</text>
        </g>
      );
    } else if (installType === 'ground_awning' || roofType === 'D') {
      const gLeft = 20;
      const gRight = 80;
      installSvg = (
        <g>
          <line x1={gLeft + 10} y1={yGround} x2={gLeft + 10} y2={yGround - dh} stroke="#64748b" strokeWidth="0.8" />
          <line x1={gRight - 10} y1={yGround} x2={gRight - 10} y2={yGround - dh} stroke="#64748b" strokeWidth="0.8" />
          <line x1={gLeft} y1={yGround - dh} x2={gRight} y2={yGround - dh - 3} stroke="#3b82f6" strokeWidth="1.5" />
          <text x={cx} y={yGround - dh / 2} fontSize="3" fill="#64748b" textAnchor="middle">滴水高 {dripHeight}m</text>
        </g>
      );
    }

    return (
      <g>
        {roofSvg}
        {installSvg}
      </g>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-10">
      <header className="bg-blue-800 text-white p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Zap className="text-yellow-400" size={28} fill="currentColor" />
          <div>
            <h1 className="text-xl font-bold">元融集團 <span className="font-normal text-blue-200">| 太陽能模組配置計算模擬器</span></h1>
            <p className="text-xs text-blue-200 mt-1">業務部初步報價與設計部快速評估專用</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* 左側：控制面板 */}
        <div className="lg:col-span-4 space-y-6">
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-700 mb-4 pb-2 border-b">
              <Maximize size={20} className="text-blue-600" /> 場地參數 (公尺)
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">場地寬度 (W)</label>
                  <input type="number" value={siteWidth} onChange={e => setSiteWidth(Number(e.target.value))} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none" min="1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">場地長度 (L)</label>
                  <input type="number" value={siteLength} onChange={e => setSiteLength(Number(e.target.value))} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none" min="1" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">四周退縮距離</label>
                <input type="number" value={edgeClearance} onChange={e => setEdgeClearance(Number(e.target.value))} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none" min="0" step="0.1" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-700 mb-4 pb-2 border-b">
              <Shapes size={20} className="text-blue-600" /> 建築與架設型式
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">屋頂型式</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-lg">
                  <button onClick={() => setRoofType('A')} className={`py-1.5 rounded text-sm font-medium transition-colors ${roofType === 'A' ? 'bg-white text-blue-700 shadow' : 'text-slate-500 hover:text-slate-700'}`}>A 平屋頂</button>
                  <button onClick={() => setRoofType('B')} className={`py-1.5 rounded text-sm font-medium transition-colors ${roofType === 'B' ? 'bg-white text-blue-700 shadow' : 'text-slate-500 hover:text-slate-700'}`}>B 單尖屋頂</button>
                  <button onClick={() => setRoofType('C')} className={`py-1.5 rounded text-sm font-medium transition-colors ${roofType === 'C' ? 'bg-white text-blue-700 shadow' : 'text-slate-500 hover:text-slate-700'}`}>C 雙尖屋頂</button>
                  <button onClick={() => setRoofType('D')} className={`py-1.5 rounded text-sm font-medium transition-colors ${roofType === 'D' ? 'bg-white text-blue-700 shadow' : 'text-slate-500 hover:text-slate-700'}`}>D 地面型</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">架設型式</label>
                <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-lg">
                  <button onClick={() => setInstallType('roof_flat')} className={`py-1.5 rounded text-sm font-medium transition-colors ${installType === 'roof_flat' ? 'bg-white text-blue-700 shadow' : 'text-slate-500 hover:text-slate-700'}`}>屋頂平舖</button>
                  <button onClick={() => setInstallType('roof_awning')} className={`py-1.5 rounded text-sm font-medium transition-colors ${installType === 'roof_awning' ? 'bg-white text-blue-700 shadow' : 'text-slate-500 hover:text-slate-700'}`}>屋頂棚架</button>
                  <button onClick={() => setInstallType('ground_awning')} className={`py-1.5 rounded text-sm font-medium transition-colors ${installType === 'ground_awning' ? 'bg-white text-blue-700 shadow' : 'text-slate-500 hover:text-slate-700'}`}>地面棚架</button>
                </div>
              </div>
              {(installType === 'roof_awning' || installType === 'ground_awning') && (
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">滴水高度 (公尺)</label>
                  <input type="number" value={dripHeight} onChange={e => setDripHeight(Number(e.target.value))} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none" min="0" step="0.1" />
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-700 mb-4 pb-2 border-b">
              <Shapes size={20} className="text-blue-600" /> 場地型態
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">選擇場地輪廓</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-lg">
                  <button onClick={() => setSiteShape('rectangle')} className={`py-1.5 rounded text-sm font-medium transition-colors ${siteShape === 'rectangle' ? 'bg-white text-blue-700 shadow' : 'text-slate-500 hover:text-slate-700'}`}>矩形</button>
                  <button onClick={() => setSiteShape('l-shape')} className={`py-1.5 rounded text-sm font-medium transition-colors ${siteShape === 'l-shape' ? 'bg-white text-blue-700 shadow' : 'text-slate-500 hover:text-slate-700'}`}>L型缺角</button>
                  <button onClick={() => setSiteShape('u-shape')} className={`py-1.5 rounded text-sm font-medium transition-colors ${siteShape === 'u-shape' ? 'bg-white text-blue-700 shadow' : 'text-slate-500 hover:text-slate-700'}`}>U型缺口</button>
                  <button onClick={() => setSiteShape('custom')} className={`py-1.5 rounded text-sm font-medium transition-colors flex items-center justify-center gap-1 ${siteShape === 'custom' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}><MousePointerClick size={14}/> 自訂(自由排佈)</button>
                </div>
              </div>
              
              {(siteShape === 'l-shape' || siteShape === 'u-shape') && (
                <div className="grid grid-cols-2 gap-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">{siteShape === 'l-shape' ? '右上缺角' : '上方缺口'}寬度</label>
                    <input type="number" value={cutoutWidth} onChange={e => setCutoutWidth(Number(e.target.value))} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none" min="0" step="1" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">{siteShape === 'l-shape' ? '右上缺角' : '上方缺口'}長度</label>
                    <input type="number" value={cutoutLength} onChange={e => setCutoutLength(Number(e.target.value))} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none" min="0" step="1" />
                  </div>
                </div>
              )}

              {siteShape === 'custom' && (
                <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200 space-y-3">
                  <p className="text-sm text-indigo-800 flex items-start gap-1">
                    <MousePointerClick size={18} className="shrink-0 mt-0.5" />
                    <span>自訂模式：請在右側預覽圖直接<strong>「點擊」</strong>模組來新增或挖空。<br/><span className="text-xs text-indigo-600 opacity-90 block mt-1">(建議先設定好下方走道基準後，再進行細部描繪)</span></span>
                  </p>
                  <div className="flex gap-2 pt-1">
                    <button onClick={fillAllPanels} className="flex-1 py-1.5 bg-white border border-indigo-300 text-indigo-700 font-medium rounded text-sm hover:bg-indigo-100 transition-colors shadow-sm">全選填滿</button>
                    <button onClick={() => clearAllPanels(calculations.allIds)} className="flex-1 py-1.5 bg-white border border-indigo-300 text-indigo-700 font-medium rounded text-sm hover:bg-indigo-100 transition-colors shadow-sm">全部清空</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-700 mb-4 pb-2 border-b">
              <Route size={20} className="text-blue-600" /> 中間走道配置基準
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">橫向走道數量</label>
                  <select value={hWalkwayCount} onChange={e => setHWalkwayCount(Number(e.target.value))} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                    <option value={0}>無 (0)</option>
                    <option value={1}>1 條走道</option>
                    <option value={2}>2 條走道</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">橫向走道寬度</label>
                  <input type="number" value={hWalkwayWidth} disabled={hWalkwayCount === 0} onChange={e => setHWalkwayWidth(Number(e.target.value))} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100" min="0.1" step="0.1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">縱向走道數量</label>
                  <select value={vWalkwayCount} onChange={e => setVWalkwayCount(Number(e.target.value))} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                    <option value={0}>無 (0)</option>
                    <option value={1}>1 條走道</option>
                    <option value={2}>2 條走道</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">縱向走道寬度</label>
                  <input type="number" value={vWalkwayWidth} disabled={vWalkwayCount === 0} onChange={e => setVWalkwayWidth(Number(e.target.value))} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100" min="0.1" step="0.1" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-700 mb-4 pb-2 border-b">
              <LayoutGrid size={20} className="text-blue-600" /> 模組規格
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">模組寬度</label>
                  <input type="number" value={panelWidth} onChange={e => setPanelWidth(Number(e.target.value))} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none" min="0.1" step="0.01" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">模組長度</label>
                  <input type="number" value={panelLength} onChange={e => setPanelLength(Number(e.target.value))} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none" min="0.1" step="0.01" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">單片瓦數 (W)</label>
                  <input type="number" value={panelPower} onChange={e => setPanelPower(Number(e.target.value))} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none" min="1" step="5" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">模組間距</label>
                  <input type="number" value={panelSpacing} onChange={e => setPanelSpacing(Number(e.target.value))} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none" min="0" step="0.01" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-700 mb-4 pb-2 border-b">
              <Settings size={20} className="text-blue-600" /> 配置設定
            </h2>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">擺放方向</label>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button onClick={() => setOrientation('portrait')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${orientation === 'portrait' ? 'bg-white text-blue-700 shadow' : 'text-slate-500 hover:text-slate-700'}`}>
                  <ArrowUpDown size={16} /> 直放 (Portrait)
                </button>
                <button onClick={() => setOrientation('landscape')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${orientation === 'landscape' ? 'bg-white text-blue-700 shadow' : 'text-slate-500 hover:text-slate-700'}`}>
                  <ArrowRightLeft size={16} /> 橫放 (Landscape)
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* 右側：視覺化預覽與結果 */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col justify-center items-center">
              <span className="text-slate-500 text-sm font-medium mb-1">預估總容量</span>
              <div className="text-3xl font-bold text-blue-600 flex items-baseline gap-1">
                {calculations.totalCapacityKW.toFixed(2)} <span className="text-lg text-slate-500 font-normal">kWp</span>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col justify-center items-center">
              <span className="text-slate-500 text-sm font-medium mb-1">實際排佈數量</span>
              <div className="text-3xl font-bold text-slate-800 flex items-baseline gap-1">
                {calculations.totalPanels} <span className="text-lg text-slate-500 font-normal">片</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">最大網格: {calculations.cols} 行 × {calculations.rows} 列</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col justify-center items-center">
              <span className="text-slate-500 text-sm font-medium mb-1">面積利用率</span>
              <div className="text-3xl font-bold text-emerald-600 flex items-baseline gap-1">
                {calculations.utilizationRate.toFixed(1)} <span className="text-lg text-slate-500 font-normal">%</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
            <div className="bg-slate-100 p-3 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                2D 配置預覽圖 
                <div className="group relative cursor-help">
                  <Info size={16} className="text-slate-400" />
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 p-2 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center">
                    {siteShape === 'custom' ? '自訂模式下：您可以直接點擊藍色方塊將其移除，或點擊虛線方塊將其加回。' : '灰色區域為總場地，藍色方塊為太陽能模組。'}
                  </div>
                </div>
              </h3>
              <div className="text-sm text-slate-500">
                {siteShape === 'custom' ? <span className="text-indigo-600 font-medium animate-pulse">◆ 點擊畫布以編輯</span> : '比例尺視窗自適應'}
              </div>
            </div>
            
            <div className="p-6 flex-1 flex items-center justify-center bg-slate-50 min-h-[400px] overflow-hidden relative">
              {siteWidth > 0 && siteLength > 0 ? (
                <div className="w-full h-full flex items-center justify-center">
                  <svg 
                    viewBox={`0 0 ${siteWidth} ${siteLength}`} 
                    className="max-w-full max-h-[600px] shadow-lg"
                    style={{ 
                      aspectRatio: `${siteWidth} / ${siteLength}`,
                      height: siteWidth > siteLength ? 'auto' : '100%',
                      width: siteWidth > siteLength ? '100%' : 'auto'
                    }}
                  >
                    {/* 場地背景 */}
                    {(() => {
                      const w = siteWidth;
                      const l = siteLength;
                      const cw = calculations.actualCutoutW;
                      const cl = calculations.actualCutoutL;
                      const strokeW = Math.max(0.05, siteWidth * 0.002);

                      if (siteShape === 'l-shape') {
                          const points = `0,0 0,${l} ${w},${l} ${w},${cl} ${w-cw},${cl} ${w-cw},0`;
                          return <polygon points={points} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={strokeW} />;
                      } else if (siteShape === 'u-shape') {
                          const cx1 = (w - cw) / 2;
                          const cx2 = cx1 + cw;
                          const points = `0,0 0,${l} ${w},${l} ${w},0 ${cx2},0 ${cx2},${cl} ${cx1},${cl} ${cx1},0`;
                          return <polygon points={points} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={strokeW} />;
                      }
                      return <rect x="0" y="0" width={w} height={l} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={strokeW} />;
                    })()}
                    
                    {/* 可建置區域退縮線 (虛線) */}
                    {edgeClearance > 0 && calculations.availableWidth > 0 && calculations.availableLength > 0 && (() => {
                      const ec = edgeClearance;
                      const w = siteWidth;
                      const l = siteLength;
                      const cw = calculations.actualCutoutW;
                      const cl = calculations.actualCutoutL;
                      const strokeW = Math.max(0.05, siteWidth * 0.002);
                      const dash = `${Math.max(0.2, siteWidth * 0.01)}`;

                      if (siteShape === 'l-shape') {
                          const points = `${ec},${ec} ${ec},${l-ec} ${w-ec},${l-ec} ${w-ec},${cl+ec} ${w-cw-ec},${cl+ec} ${w-cw-ec},${ec}`;
                          return <polygon points={points} fill="none" stroke="#64748b" strokeWidth={strokeW} strokeDasharray={dash} />;
                      } else if (siteShape === 'u-shape') {
                          const cx1 = (w - cw) / 2;
                          const cx2 = cx1 + cw;
                          const points = `${ec},${ec} ${ec},${l-ec} ${w-ec},${l-ec} ${w-ec},${ec} ${cx2+ec},${ec} ${cx2+ec},${cl+ec} ${cx1-ec},${cl+ec} ${cx1-ec},${ec}`;
                          return <polygon points={points} fill="none" stroke="#64748b" strokeWidth={strokeW} strokeDasharray={dash} />;
                      }
                      return <rect x={ec} y={ec} width={calculations.availableWidth} height={calculations.availableLength} fill="none" stroke="#64748b" strokeWidth={strokeW} strokeDasharray={dash} />;
                    })()}

                    {/* 繪製模組 */}
                    {calculations.panelsData.map(panel => {
                      // 若非自訂模式，被算法判定不顯示的就直接不畫
                      if (!panel.isActive && siteShape !== 'custom') return null;

                      return (
                        <g 
                          key={panel.id}
                          onClick={() => togglePanel(panel.id)}
                          className={siteShape === 'custom' ? 'cursor-pointer hover:opacity-70 transition-opacity duration-150' : ''}
                        >
                          {panel.isActive ? (
                            // 有效排佈的模組
                            <>
                              <rect 
                                x={panel.x} y={panel.y} 
                                width={panel.w} height={panel.h} 
                                fill="#3b82f6" 
                                stroke="#1e3a8a" 
                                strokeWidth={Math.max(0.02, siteWidth * 0.001)}
                                rx={Math.max(0.01, siteWidth * 0.0005)}
                              />
                              <line x1={panel.x + panel.w * 0.33} y1={panel.y} x2={panel.x + panel.w * 0.33} y2={panel.y + panel.h} stroke="#60a5fa" strokeWidth={Math.max(0.01, siteWidth * 0.0005)} opacity="0.5" />
                              <line x1={panel.x + panel.w * 0.66} y1={panel.y} x2={panel.x + panel.w * 0.66} y2={panel.y + panel.h} stroke="#60a5fa" strokeWidth={Math.max(0.01, siteWidth * 0.0005)} opacity="0.5" />
                            </>
                          ) : (
                            // 自訂模式下被隱藏的空位 (畫出虛線框讓使用者可以點擊加回來)
                            siteShape === 'custom' && (
                              <rect 
                                x={panel.x} y={panel.y} 
                                width={panel.w} height={panel.h} 
                                fill="rgba(255, 255, 255, 0.4)" 
                                stroke="#94a3b8" 
                                strokeWidth={Math.max(0.02, siteWidth * 0.001)}
                                strokeDasharray={Math.max(0.1, siteWidth * 0.005)}
                                rx={Math.max(0.01, siteWidth * 0.0005)}
                              />
                            )
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              ) : (
                <div className="text-slate-400">請輸入有效的場地尺寸</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
            <div className="bg-slate-100 p-3 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                剖面圖展示
              </h3>
            </div>
            <div className="p-6 flex items-center justify-center bg-slate-50 min-h-[300px] overflow-hidden relative">
              <svg viewBox="0 0 100 50" className="w-full max-h-[300px]">
                <line x1="0" y1="45" x2="100" y2="45" stroke="#94a3b8" strokeWidth="1" />
                {renderCrossSection()}
              </svg>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}