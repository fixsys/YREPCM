import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Settings,
  Maximize,
  Zap,
  LayoutGrid,
  Info,
  ArrowRightLeft,
  ArrowUpDown,
  Shapes,
  Route,
  MousePointerClick,
  Box,
  Image as ImageIcon,
  X,
  ArrowLeft,
  Sun,
  CheckCircle2,
} from 'lucide-react';
import SolarSite3DView, { type ProductTypeId } from '../components/SolarSite3DView';

export interface SolarProductSpec {
  id: ProductTypeId;
  code: string;
  name: string;
  subtitle: string;
  application: string;
  features: string;
  suitableFor: string;
  defaultDripHeight: number;
  defaultTiltAngle: number;
  defaultSlopeType: 'single' | 'gable';
  defaultBuildingHeight: number;
  defaultGroundStyle: 'rows' | 'canopy';
  badgeColor: string;
}

export const SOLAR_PRODUCTS: SolarProductSpec[] = [
  {
    id: 'fish_outdoor',
    code: '1',
    name: '魚電共生室外型',
    subtitle: '養殖池上方設置，於戶外環境',
    application: '養殖漁業＋發電',
    features: '大跨距、高抗風、不影響養殖作業',
    suitableFor: '戶外魚塭、養殖場',
    defaultDripHeight: 4.5,
    defaultTiltAngle: 10,
    defaultSlopeType: 'single',
    defaultBuildingHeight: 0,
    defaultGroundStyle: 'canopy',
    badgeColor: 'from-sky-600 to-blue-800',
  },
  {
    id: 'fish_indoor',
    code: '2',
    name: '魚電共生室內型',
    subtitle: '養殖池結合室內養殖設施，如溫室/養殖棚',
    application: '室內養殖＋發電',
    features: '可控環境（溫度、光照）、兼顧發電收益',
    suitableFor: '高值化養殖、育苗場',
    defaultDripHeight: 4.0,
    defaultTiltAngle: 12,
    defaultSlopeType: 'gable',
    defaultBuildingHeight: 0,
    defaultGroundStyle: 'canopy',
    badgeColor: 'from-teal-600 to-emerald-800',
  },
  {
    id: 'sport_court',
    code: '3',
    name: '風雨球場',
    subtitle: '具頂棚遮蔽、可運動的多功能球場',
    application: '運動設施＋發電',
    features: '遮陽避雨、提升場地使用率、兼具綠電效益',
    suitableFor: '校園、社區、公園、企業園區',
    defaultDripHeight: 6.5,
    defaultTiltAngle: 10,
    defaultSlopeType: 'single',
    defaultBuildingHeight: 0,
    defaultGroundStyle: 'canopy',
    badgeColor: 'from-indigo-600 to-blue-900',
  },
  {
    id: 'roof_canopy',
    code: '4',
    name: '屋頂棚架型',
    subtitle: '在平屋頂上增設棚架架設模組',
    application: '屋頂空間活化＋發電',
    features: '獨立棚架，提升屋頂利用率、便於維護',
    suitableFor: 'RC 平屋頂、廠房、倉庫、辦公大樓',
    defaultDripHeight: 2.8,
    defaultTiltAngle: 10,
    defaultSlopeType: 'single',
    defaultBuildingHeight: 8.0,
    defaultGroundStyle: 'canopy',
    badgeColor: 'from-slate-700 to-slate-900',
  },
  {
    id: 'roof_flush',
    code: '5',
    name: '屋頂平鋪型',
    subtitle: '於有斜度的屋頂上沿屋面鋪設模組',
    application: '斜屋頂發電',
    features: '沿屋面鋪設、結構簡單、美觀一體',
    suitableFor: '鐵皮屋頂、工廠、倉庫、農業設施',
    defaultDripHeight: 0.2,
    defaultTiltAngle: 12,
    defaultSlopeType: 'single',
    defaultBuildingHeight: 7.0,
    defaultGroundStyle: 'canopy',
    badgeColor: 'from-amber-600 to-orange-800',
  },
  {
    id: 'ground_mount',
    code: '6',
    name: '地面型',
    subtitle: '於地面設置支架架設模組',
    application: '地面場域發電',
    features: '設計彈性大、容量可擴充、維護便利',
    suitableFor: '閒置土地、工業用地、農業用地（依法規評估）',
    defaultDripHeight: 1.2,
    defaultTiltAngle: 18,
    defaultSlopeType: 'single',
    defaultBuildingHeight: 0,
    defaultGroundStyle: 'rows',
    badgeColor: 'from-emerald-600 to-green-800',
  },
];

export default function SolarModuleSim() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // --- 六大產品選擇狀態 ---
  const initialProduct = (searchParams.get('product') as ProductTypeId) || 'fish_outdoor';
  const [productType, setProductType] = useState<ProductTypeId>(
    SOLAR_PRODUCTS.some(p => p.id === initialProduct) ? initialProduct : 'fish_outdoor'
  );
  const [showRefImageModal, setShowRefImageModal] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | '3d' | '2d'>('split');

  // --- 場地參數 (公尺) ---
  const [siteWidth, setSiteWidth] = useState(24);
  const [siteLength, setSiteLength] = useState(16);
  const [edgeClearance, setEdgeClearance] = useState(0.5);

  // 場地型態擴充
  const [siteShape, setSiteShape] = useState('rectangle'); // rectangle, l-shape, u-shape, custom
  const [cutoutWidth, setCutoutWidth] = useState(5);
  const [cutoutLength, setCutoutLength] = useState(5);

  // 產品結構與3D參數
  const [dripHeight, setDripHeight] = useState(4.5); // 滴水高度 / 最低離地高度 (公尺)
  const [tiltAngle, setTiltAngle] = useState(10); // 屋面/支架傾角 (度)
  const [slopeType, setSlopeType] = useState<'single' | 'gable'>('single'); // 單斜 / 雙斜山形
  const [buildingHeight, setBuildingHeight] = useState(8.0); // 建物高度 (屋頂型適用)
  const [groundMountStyle, setGroundMountStyle] = useState<'rows' | 'canopy'>('rows'); // 地面型支架模式

  // 自由排佈模式：記錄被使用者手動點擊隱藏的模組 ID 集合
  const [disabledPanelIds, setDisabledPanelIds] = useState<Set<string>>(new Set());

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
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  const currentProductSpec = useMemo(
    () => SOLAR_PRODUCTS.find(p => p.id === productType) || SOLAR_PRODUCTS[0],
    [productType]
  );

  // 當切換產品時，自動套用該產品的預設結構參數
  const handleSelectProduct = (prod: SolarProductSpec) => {
    setProductType(prod.id);
    setDripHeight(prod.defaultDripHeight);
    setTiltAngle(prod.defaultTiltAngle);
    setSlopeType(prod.defaultSlopeType);
    if (prod.defaultBuildingHeight > 0) {
      setBuildingHeight(prod.defaultBuildingHeight);
    }
    setGroundMountStyle(prod.defaultGroundStyle);
    if (prod.id === 'ground_mount' && hWalkwayCount === 0) {
      setHWalkwayCount(1);
      setHWalkwayWidth(1.2);
    }
  };

  useEffect(() => {
    const paramProd = searchParams.get('product') as ProductTypeId;
    const found = SOLAR_PRODUCTS.find(p => p.id === paramProd);
    if (found) {
      handleSelectProduct(found);
    }
  }, [searchParams]);

  // --- 互動邏輯 ---
  const togglePanel = useCallback(
    (id: string) => {
      if (siteShape !== 'custom') return;
      setDisabledPanelIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [siteShape]
  );

  const clearAllPanels = useCallback((allIds: string[]) => {
    setDisabledPanelIds(new Set(allIds));
  }, []);

  const fillAllPanels = useCallback(() => {
    setDisabledPanelIds(new Set());
  }, []);

  // --- 核心計算邏輯 ---
  const calculations = useMemo(() => {
    const actualPanelWidth = orientation === 'portrait' ? panelWidth : panelLength;
    const actualPanelLength = orientation === 'portrait' ? panelLength : panelWidth;

    const availableWidth = Math.max(0, siteWidth - 2 * edgeClearance);
    const availableLength = Math.max(0, siteLength - 2 * edgeClearance);

    const calc1DLayout = (availSize: number, panelSize: number, spacing: number, wCount: number, wWidth: number) => {
      const blocks = wCount + 1;
      const blockAvail = (availSize - wCount * wWidth) / blocks;
      if (blockAvail <= 0) return [];

      const itemsPerBlock = Math.floor((blockAvail + spacing) / (panelSize + spacing));
      if (itemsPerBlock <= 0) return [];

      const usedBlockSize = itemsPerBlock * panelSize + Math.max(0, itemsPerBlock - 1) * spacing;
      const totalUsedSize = usedBlockSize * blocks + wCount * wWidth;
      const startOffset = (availSize - totalUsedSize) / 2;

      const pos: number[] = [];
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

    const panelsData: {
      id: string;
      x: number;
      y: number;
      w: number;
      h: number;
      isActive: boolean;
      isCutout: boolean;
    }[] = [];
    const allIds: string[] = [];
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
          if (absX + w > cx1 - edgeClearance && absX < cx2 + edgeClearance && absY < actualCutoutL + edgeClearance)
            isCutout = true;
        }

        let isActive = true;
        if (siteShape === 'custom') {
          isActive = !disabledPanelIds.has(id);
        } else {
          isActive = !isCutout;
        }

        panelsData.push({ id, x: absX, y: absY, w, h, isActive, isCutout });
        if (isActive) activePanelsCount++;
      });
    });

    const totalCapacityKW = (activePanelsCount * panelPower) / 1000;

    let totalSiteArea = siteWidth * siteLength;
    if (siteShape === 'l-shape' || siteShape === 'u-shape') {
      totalSiteArea -= actualCutoutW * actualCutoutL;
    }

    const totalPanelArea = activePanelsCount * (panelWidth * panelLength);
    const utilizationRate = totalSiteArea > 0 ? (totalPanelArea / totalSiteArea) * 100 : 0;
    // 預估年發電量 (以平均每日等效日照 3.55 小時 × 365 天估算)
    const estimatedAnnualKWh = Math.round(totalCapacityKW * 3.55 * 365);

    return {
      cols: xPositions.length,
      rows: yPositions.length,
      totalPanels: activePanelsCount,
      totalCapacityKW,
      utilizationRate,
      estimatedAnnualKWh,
      panelsData,
      allIds,
      availableWidth,
      availableLength,
      actualCutoutW,
      actualCutoutL,
    };
  }, [
    siteWidth,
    siteLength,
    edgeClearance,
    panelWidth,
    panelLength,
    panelPower,
    panelSpacing,
    orientation,
    siteShape,
    cutoutWidth,
    cutoutLength,
    vWalkwayCount,
    vWalkwayWidth,
    hWalkwayCount,
    hWalkwayWidth,
    disabledPanelIds,
  ]);

  // --- 六大產品專屬 2D 剖面示意圖 (對齊 六大產品.png 之「剖面示意」) ---
  const renderProductCrossSection = () => {
    const cx = 50;
    const yGround = 44;
    const spanLeft = 18;
    const spanRight = 82;
    const spanW = spanRight - spanLeft;
    const rise = Math.min(10, Math.max(2, Math.tan((tiltAngle * Math.PI) / 180) * 28));

    if (productType === 'fish_outdoor') {
      // ① 魚電共生室外型：養殖池 + 4支立柱 + 單斜桁架屋頂
      const eaveH = 14;
      const yLow = yGround - 6 - eaveH;
      const yHigh = yLow - rise;
      return (
        <g>
          {/* 養殖池凹槽與水體 */}
          <path
            d={`M 10,${yGround - 5} L 15,${yGround - 5} L 18,${yGround} L 82,${yGround} L 85,${yGround - 5} L 90,${yGround - 5}`}
            fill="none"
            stroke="#475569"
            strokeWidth="1.2"
          />
          <polygon points={`16,${yGround - 3} 84,${yGround - 3} 82,${yGround} 18,${yGround}`} fill="#bae6fd" stroke="#0284c7" strokeWidth="0.5" />
          <text x={cx} y={yGround - 0.8} fontSize="2.8" fill="#0f172a" fontWeight="bold" textAnchor="middle">
            養殖池
          </text>
          {/* 柱位與斜樑 */}
          {[0, 0.33, 0.66, 1].map((t, idx) => {
            const px = spanLeft + t * spanW;
            const py = yLow - t * (yLow - yHigh);
            return (
              <g key={idx}>
                <line x1={px} y1={yGround} x2={px} y2={py} stroke="#334155" strokeWidth="1" />
                <rect x={px - 1.2} y={yGround - 2.2} width="2.4" height="2.2" fill="#94a3b8" />
              </g>
            );
          })}
          <line x1={spanLeft - 2} y1={yLow + 0.5} x2={spanRight + 2} y2={yHigh - 0.5} stroke="#334155" strokeWidth="1.2" />
          <line x1={spanLeft - 2} y1={yLow - 0.3} x2={spanRight + 2} y2={yHigh - 1.3} stroke="#2563eb" strokeWidth="1.8" />
          <text x={spanLeft - 4} y={yLow + 5} fontSize="2.4" fill="#475569">
            滴水 {dripHeight}m / 傾角 {tiltAngle}°
          </text>
        </g>
      );
    }

    if (productType === 'fish_indoor') {
      // ② 魚電共生室內型：室內養殖池 + 山形屋架溫室
      const yWallTop = yGround - 15;
      const yRidge = yWallTop - rise;
      return (
        <g>
          {/* 室內養殖池 */}
          <rect x={spanLeft} y={yGround - 6} width={spanW} height="6" fill="#bae6fd" stroke="#0284c7" strokeWidth="0.6" />
          <text x={cx} y={yGround - 2.2} fontSize="2.8" fill="#0f172a" fontWeight="bold" textAnchor="middle">
            養殖池（室內）
          </text>
          {/* 溫室圍牆與山形桁架 */}
          <line x1={spanLeft} y1={yGround} x2={spanLeft} y2={yWallTop} stroke="#334155" strokeWidth="1.2" />
          <line x1={spanRight} y1={yGround} x2={spanRight} y2={yWallTop} stroke="#334155" strokeWidth="1.2" />
          <line x1={spanLeft} y1={yWallTop} x2={spanRight} y2={yWallTop} stroke="#64748b" strokeWidth="0.7" strokeDasharray="1,1" />
          <polyline
            points={`${spanLeft - 2},${yWallTop + 0.4} ${cx},${yRidge} ${spanRight + 2},${yWallTop + 0.4}`}
            fill="none"
            stroke="#334155"
            strokeWidth="1.2"
          />
          <polyline
            points={`${spanLeft - 2},${yWallTop - 0.5} ${cx},${yRidge - 0.9} ${spanRight + 2},${yWallTop - 0.5}`}
            fill="none"
            stroke="#2563eb"
            strokeWidth="1.8"
          />
          <text x={cx} y={yRidge - 2.2} fontSize="2.4" fill="#475569" textAnchor="middle">
            雙斜溫室棚架 (滴水 {dripHeight}m / 傾角 {tiltAngle}°)
          </text>
        </g>
      );
    }

    if (productType === 'sport_court') {
      // ③ 風雨球場：挑高大跨距 + 籃球架示意
      const yWallTop = yGround - 18;
      const yRidge = slopeType === 'gable' ? yWallTop - rise : yWallTop - rise;
      return (
        <g>
          <line x1={spanLeft} y1={yGround} x2={spanLeft} y2={yWallTop} stroke="#1e293b" strokeWidth="1.4" />
          <line x1={spanRight} y1={yGround} x2={spanRight} y2={slopeType === 'gable' ? yWallTop : yRidge} stroke="#1e293b" strokeWidth="1.4" />
          {slopeType === 'gable' ? (
            <>
              <polyline
                points={`${spanLeft - 2},${yWallTop + 0.5} ${cx},${yRidge} ${spanRight + 2},${yWallTop + 0.5}`}
                fill="none"
                stroke="#334155"
                strokeWidth="1.2"
              />
              <polyline
                points={`${spanLeft - 2},${yWallTop - 0.4} ${cx},${yRidge - 0.9} ${spanRight + 2},${yWallTop - 0.4}`}
                fill="none"
                stroke="#2563eb"
                strokeWidth="1.8"
              />
            </>
          ) : (
            <>
              <line x1={spanLeft - 2} y1={yWallTop + 0.5} x2={spanRight + 2} y2={yRidge} stroke="#334155" strokeWidth="1.2" />
              <line x1={spanLeft - 2} y1={yWallTop - 0.4} x2={spanRight + 2} y2={yRidge - 0.9} stroke="#2563eb" strokeWidth="1.8" />
            </>
          )}
          {/* 球場地面與中央籃球架示意 */}
          <line x1={spanLeft} y1={yGround} x2={spanRight} y2={yGround} stroke="#2563eb" strokeWidth="1.5" />
          <line x1={cx} y1={yGround} x2={cx} y2={yGround - 9} stroke="#475569" strokeWidth="0.9" />
          <rect x={cx - 3.5} y={yGround - 12} width="7" height="4.2" fill="none" stroke="#334155" strokeWidth="0.7" />
          <text x={cx} y={yGround + 4} fontSize="2.6" fill="#334155" fontWeight="bold" textAnchor="middle">
            多功能風雨球場 (挑高 {dripHeight}m)
          </text>
        </g>
      );
    }

    if (productType === 'roof_canopy') {
      // ④ 屋頂棚架型：屋頂(平面) + 水泥基座 + 獨立棚架
      const yRoof = yGround - 12;
      const yLow = yRoof - 11;
      const yHigh = yLow - rise;
      return (
        <g>
          <rect x={spanLeft} y={yRoof} width={spanW} height="12" fill="#e2e8f0" stroke="#64748b" strokeWidth="0.8" />
          <line x1={spanLeft - 1} y1={yRoof} x2={spanRight + 1} y2={yRoof} stroke="#334155" strokeWidth="1.5" />
          <text x={cx} y={yRoof + 7} fontSize="2.8" fill="#334155" fontWeight="bold" textAnchor="middle">
            屋頂（平面 RC 建物高 {buildingHeight}m）
          </text>
          {[0.08, 0.5, 0.92].map((t, idx) => {
            const px = spanLeft + t * spanW;
            const py = yLow - t * (yLow - yHigh);
            return (
              <g key={idx}>
                <line x1={px} y1={yRoof} x2={px} y2={py} stroke="#334155" strokeWidth="1.1" />
                <rect x={px - 1.5} y={yRoof - 2} width="3" height="2" fill="#94a3b8" stroke="#475569" strokeWidth="0.4" />
              </g>
            );
          })}
          <line x1={spanLeft - 2} y1={yLow} x2={spanRight + 2} y2={yHigh} stroke="#334155" strokeWidth="1.2" />
          <line x1={spanLeft - 2} y1={yLow - 0.8} x2={spanRight + 2} y2={yHigh - 0.8} stroke="#2563eb" strokeWidth="1.8" />
          <text x={cx} y={yHigh - 2} fontSize="2.4" fill="#475569" textAnchor="middle">
            獨立棚架 (滴水 {dripHeight}m / 傾角 {tiltAngle}°)
          </text>
        </g>
      );
    }

    if (productType === 'roof_flush') {
      // ⑤ 屋頂平鋪型：沿斜屋面鋪設模組 (約 5°~30°)
      const yWallLeft = yGround - 12;
      const yWallRight = slopeType === 'gable' ? yWallLeft : yWallLeft - rise * 1.3;
      const yPeak = yWallLeft - rise * 1.2;
      return (
        <g>
          {slopeType === 'gable' ? (
            <>
              <polygon
                points={`${spanLeft},${yGround} ${spanLeft},${yWallLeft} ${cx},${yPeak} ${spanRight},${yWallLeft} ${spanRight},${yGround}`}
                fill="#e2e8f0"
                stroke="#64748b"
                strokeWidth="0.8"
              />
              <polyline
                points={`${spanLeft - 2},${yWallLeft - 0.8} ${cx},${yPeak - 0.8} ${spanRight + 2},${yWallLeft - 0.8}`}
                fill="none"
                stroke="#2563eb"
                strokeWidth="2"
              />
            </>
          ) : (
            <>
              <polygon
                points={`${spanLeft},${yGround} ${spanLeft},${yWallLeft} ${spanRight},${yWallRight} ${spanRight},${yGround}`}
                fill="#e2e8f0"
                stroke="#64748b"
                strokeWidth="0.8"
              />
              <line x1={spanLeft - 2} y1={yWallLeft - 0.9} x2={spanRight + 2} y2={yWallRight - 0.9} stroke="#2563eb" strokeWidth="2" />
            </>
          )}
          <text x={cx} y={yGround - 4} fontSize="2.7" fill="#334155" fontWeight="bold" textAnchor="middle">
            沿斜屋面平鋪（屋面坡度 {tiltAngle}°，約 5°～30°）
          </text>
        </g>
      );
    }

    // ⑥ 地面型：於地面設置支架架設模組 (約 10°~30°)
    const yLow = yGround - 8;
    const yHigh = yLow - rise * 1.1;
    return (
      <g>
        {groundMountStyle === 'rows' ? (
          [0, 1, 2].map(i => {
            const rx1 = 20 + i * 22;
            const rx2 = rx1 + 16;
            const ry1 = yGround - 6;
            const ry2 = ry1 - Math.max(3, rise * 0.65);
            return (
              <g key={i}>
                <line x1={rx1 + 2} y1={yGround} x2={rx1 + 2} y2={ry1} stroke="#334155" strokeWidth="1" />
                <line x1={rx2 - 2} y1={yGround} x2={rx2 - 2} y2={ry2} stroke="#334155" strokeWidth="1" />
                <rect x={rx1 + 0.8} y={yGround - 1.5} width="2.4" height="1.5" fill="#94a3b8" />
                <rect x={rx2 - 3.2} y={yGround - 1.5} width="2.4" height="1.5" fill="#94a3b8" />
                <line x1={rx1} y1={ry1 - 0.5} x2={rx2} y2={ry2 - 0.5} stroke="#2563eb" strokeWidth="1.8" />
              </g>
            );
          })
        ) : (
          <>
            <line x1={spanLeft + 6} y1={yGround} x2={spanLeft + 6} y2={yLow} stroke="#334155" strokeWidth="1.1" />
            <line x1={spanRight - 6} y1={yGround} x2={spanRight - 6} y2={yHigh} stroke="#334155" strokeWidth="1.1" />
            <line x1={spanLeft} y1={yLow - 0.6} x2={spanRight} y2={yHigh - 0.6} stroke="#2563eb" strokeWidth="1.8" />
          </>
        )}
        <text x={cx} y={yGround + 4} fontSize="2.6" fill="#334155" fontWeight="bold" textAnchor="middle">
          地面支架系統（離地 {dripHeight}m / 傾角 {tiltAngle}°，約 10°～30°）
        </text>
      </g>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-10">
      {/* 頂部導覽列 */}
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white px-4 py-3.5 shadow-md flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/simulators')}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="返回設計模擬器列表"
          >
            <ArrowLeft size={18} />
          </button>
          <Zap className="text-yellow-400 shrink-0" size={26} fill="currentColor" />
          <div>
            <h1 className="text-lg md:text-xl font-bold flex items-center gap-2">
              元融集團 <span className="font-normal text-blue-200">| 六大太陽能產品 3D 案場與模組排佈模擬器</span>
            </h1>
            <p className="text-xs text-blue-200 mt-0.5">
              定義場域尺寸 × 選擇六大產品型態 × 即時 3D 案場建模與 2D 太陽能排佈計算
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowRefImageModal(true)}
            className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs md:text-sm font-medium flex items-center gap-1.5 border border-white/20 transition-colors cursor-pointer"
          >
            <ImageIcon size={16} /> 參閱「六大產品建模示意圖」
          </button>
        </div>
      </header>

      <div className="max-w-[1440px] mx-auto px-4 lg:px-6 pt-5 space-y-5">
        {/* 步驟 1：六大太陽能系統型態選擇器 */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Box size={18} className="text-blue-600" />
              STEP 1. 選擇太陽能系統產品型態（六大產品）
            </h2>
            <span className="text-xs text-slate-500">
              目前選用：<strong className="text-blue-700">{currentProductSpec.code}. {currentProductSpec.name}</strong> — {currentProductSpec.subtitle}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {SOLAR_PRODUCTS.map(prod => {
              const isSelected = prod.id === productType;
              return (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => handleSelectProduct(prod)}
                  className={`text-left rounded-xl p-3 border transition-all relative flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/30 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-extrabold text-white bg-gradient-to-br ${prod.badgeColor}`}
                      >
                        {prod.code}
                      </span>
                      {isSelected && <CheckCircle2 size={16} className="text-blue-600 shrink-0" />}
                    </div>
                    <div className="font-bold text-sm text-slate-800 leading-snug">{prod.name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{prod.subtitle}</div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-200/70 text-[11px] text-slate-600 space-y-0.5">
                    <div className="truncate">
                      <span className="font-semibold text-slate-700">應用：</span>
                      {prod.application}
                    </div>
                    <div className="truncate">
                      <span className="font-semibold text-slate-700">適用：</span>
                      {prod.suitableFor}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 主工作區：左側參數控制 + 右側 3D / 2D 模擬視窗 */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* 左側：控制面板 */}
          <div className="lg:col-span-4 space-y-5">
            {/* 場地尺寸與退縮 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-800 mb-3 pb-2 border-b">
                <Maximize size={18} className="text-blue-600" /> STEP 2. 定義場域大小 (公尺)
              </h2>
              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">場地寬度 W (東西向)</label>
                    <input
                      type="number"
                      value={siteWidth}
                      onChange={e => setSiteWidth(Math.max(1, Number(e.target.value)))}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">場地長度 L (南北向)</label>
                    <input
                      type="number"
                      value={siteLength}
                      onChange={e => setSiteLength(Math.max(1, Number(e.target.value)))}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold"
                      min="1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">四周退縮距離 (m)</label>
                    <input
                      type="number"
                      value={edgeClearance}
                      onChange={e => setEdgeClearance(Math.max(0, Number(e.target.value)))}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      min="0"
                      step="0.1"
                    />
                  </div>
                  <div className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-200 flex flex-col justify-center">
                    <span className="text-[11px] text-slate-500">總場域面積</span>
                    <span className="text-sm font-bold text-slate-800">
                      {(siteWidth * siteLength).toFixed(1)} m² ({(siteWidth * siteLength * 0.3025).toFixed(1)} 坪)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 產品 3D 結構參數 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-800 mb-3 pb-2 border-b">
                <Box size={18} className="text-blue-600" /> {currentProductSpec.name} — 3D 結構參數
              </h2>
              <div className="space-y-3.5">
                <div className="p-2.5 rounded-lg bg-blue-50/80 border border-blue-100 text-xs text-slate-700 space-y-1">
                  <div>
                    <strong className="text-blue-800">產品特點：</strong>
                    {currentProductSpec.features}
                  </div>
                  <div>
                    <strong className="text-blue-800">適用場域：</strong>
                    {currentProductSpec.suitableFor}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      {productType === 'ground_mount'
                        ? '支架前緣離地高 (m)'
                        : productType === 'roof_flush'
                        ? '軌道貼合高度 (m)'
                        : '滴水高度 / 柱高 (m)'}
                    </label>
                    <input
                      type="number"
                      value={dripHeight}
                      onChange={e => setDripHeight(Math.max(0.1, Number(e.target.value)))}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      min="0.1"
                      step="0.2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      {productType === 'roof_flush' ? '屋面坡度傾角 (°)' : '模組/棚架傾角 (°)'}
                    </label>
                    <input
                      type="number"
                      value={tiltAngle}
                      onChange={e => setTiltAngle(Math.max(0, Math.min(45, Number(e.target.value))))}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      min="0"
                      max="45"
                      step="1"
                    />
                  </div>
                </div>

                {(productType === 'sport_court' || productType === 'roof_flush' || productType === 'fish_indoor') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">屋面斜度型態</label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setSlopeType('single')}
                        className={`py-1.5 rounded text-xs font-bold transition-colors ${
                          slopeType === 'single' ? 'bg-white text-blue-700 shadow' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        單斜屋面
                      </button>
                      <button
                        type="button"
                        onClick={() => setSlopeType('gable')}
                        className={`py-1.5 rounded text-xs font-bold transition-colors ${
                          slopeType === 'gable' ? 'bg-white text-blue-700 shadow' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        雙斜山形屋面
                      </button>
                    </div>
                  </div>
                )}

                {(productType === 'roof_canopy' || productType === 'roof_flush') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">下方廠房/建築物高度 (m)</label>
                    <input
                      type="number"
                      value={buildingHeight}
                      onChange={e => setBuildingHeight(Math.max(3, Number(e.target.value)))}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      min="3"
                      step="0.5"
                    />
                  </div>
                )}

                {productType === 'ground_mount' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">地面支架配置型式</label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setGroundMountStyle('rows')}
                        className={`py-1.5 rounded text-xs font-bold transition-colors ${
                          groundMountStyle === 'rows'
                            ? 'bg-white text-blue-700 shadow'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        分排獨立支架陣列
                      </button>
                      <button
                        type="button"
                        onClick={() => setGroundMountStyle('canopy')}
                        className={`py-1.5 rounded text-xs font-bold transition-colors ${
                          groundMountStyle === 'canopy'
                            ? 'bg-white text-blue-700 shadow'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        整體連續大棚架
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 場地型態與自訂挖空 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-800 mb-3 pb-2 border-b">
                <Shapes size={18} className="text-blue-600" /> 場地輪廓與自由排佈
              </h2>
              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setSiteShape('rectangle')}
                    className={`py-1.5 rounded text-xs font-bold transition-colors ${
                      siteShape === 'rectangle' ? 'bg-white text-blue-700 shadow' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    矩形
                  </button>
                  <button
                    type="button"
                    onClick={() => setSiteShape('l-shape')}
                    className={`py-1.5 rounded text-xs font-bold transition-colors ${
                      siteShape === 'l-shape' ? 'bg-white text-blue-700 shadow' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    L型缺角
                  </button>
                  <button
                    type="button"
                    onClick={() => setSiteShape('u-shape')}
                    className={`py-1.5 rounded text-xs font-bold transition-colors ${
                      siteShape === 'u-shape' ? 'bg-white text-blue-700 shadow' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    U型缺口
                  </button>
                  <button
                    type="button"
                    onClick={() => setSiteShape('custom')}
                    className={`py-1.5 rounded text-xs font-bold transition-colors flex items-center justify-center gap-1 ${
                      siteShape === 'custom' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <MousePointerClick size={13} /> 自訂(點擊挖空)
                  </button>
                </div>

                {(siteShape === 'l-shape' || siteShape === 'u-shape') && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        {siteShape === 'l-shape' ? '右上缺角' : '上方缺口'}寬度
                      </label>
                      <input
                        type="number"
                        value={cutoutWidth}
                        onChange={e => setCutoutWidth(Number(e.target.value))}
                        className="w-full p-1.5 border rounded-md text-sm bg-white"
                        min="0"
                        step="1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        {siteShape === 'l-shape' ? '右上缺角' : '上方缺口'}長度
                      </label>
                      <input
                        type="number"
                        value={cutoutLength}
                        onChange={e => setCutoutLength(Number(e.target.value))}
                        className="w-full p-1.5 border rounded-md text-sm bg-white"
                        min="0"
                        step="1"
                      />
                    </div>
                  </div>
                )}

                {siteShape === 'custom' && (
                  <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200 space-y-2.5">
                    <p className="text-xs text-indigo-800 flex items-start gap-1.5">
                      <MousePointerClick size={16} className="shrink-0 mt-0.5" />
                      <span>
                        請在 <strong>2D 配置預覽圖</strong> 點擊任意太陽能模組以挖空或復原，<strong>3D 案場模型將即時同步更新</strong>！
                      </span>
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={fillAllPanels}
                        className="flex-1 py-1.5 bg-white border border-indigo-300 text-indigo-700 font-bold rounded text-xs hover:bg-indigo-100"
                      >
                        全選填滿
                      </button>
                      <button
                        type="button"
                        onClick={() => clearAllPanels(calculations.allIds)}
                        className="flex-1 py-1.5 bg-white border border-indigo-300 text-indigo-700 font-bold rounded text-xs hover:bg-indigo-100"
                      >
                        全部清空
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 走道與模組規格 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-800 pb-2 border-b">
                <Route size={18} className="text-blue-600" /> 維護走道與模組規格
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">橫向走道數量</label>
                  <select
                    value={hWalkwayCount}
                    onChange={e => setHWalkwayCount(Number(e.target.value))}
                    className="w-full p-2 border rounded-md text-sm bg-white"
                  >
                    <option value={0}>無 (0)</option>
                    <option value={1}>1 條走道</option>
                    <option value={2}>2 條走道</option>
                    <option value={3}>3 條走道</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">橫向走道寬度 (m)</label>
                  <input
                    type="number"
                    value={hWalkwayWidth}
                    disabled={hWalkwayCount === 0}
                    onChange={e => setHWalkwayWidth(Number(e.target.value))}
                    className="w-full p-2 border rounded-md text-sm disabled:bg-slate-100"
                    min="0.1"
                    step="0.1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">縱向走道數量</label>
                  <select
                    value={vWalkwayCount}
                    onChange={e => setVWalkwayCount(Number(e.target.value))}
                    className="w-full p-2 border rounded-md text-sm bg-white"
                  >
                    <option value={0}>無 (0)</option>
                    <option value={1}>1 條走道</option>
                    <option value={2}>2 條走道</option>
                    <option value={3}>3 條走道</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">縱向走道寬度 (m)</label>
                  <input
                    type="number"
                    value={vWalkwayWidth}
                    disabled={vWalkwayCount === 0}
                    onChange={e => setVWalkwayWidth(Number(e.target.value))}
                    className="w-full p-2 border rounded-md text-sm disabled:bg-slate-100"
                    min="0.1"
                    step="0.1"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">模組寬度 (m)</label>
                  <input
                    type="number"
                    value={panelWidth}
                    onChange={e => setPanelWidth(Number(e.target.value))}
                    className="w-full p-2 border rounded-md text-sm"
                    min="0.1"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">模組長度 (m)</label>
                  <input
                    type="number"
                    value={panelLength}
                    onChange={e => setPanelLength(Number(e.target.value))}
                    className="w-full p-2 border rounded-md text-sm"
                    min="0.1"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">單片瓦數 (W)</label>
                  <input
                    type="number"
                    value={panelPower}
                    onChange={e => setPanelPower(Number(e.target.value))}
                    className="w-full p-2 border rounded-md text-sm"
                    min="1"
                    step="5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">模組間距 (m)</label>
                  <input
                    type="number"
                    value={panelSpacing}
                    onChange={e => setPanelSpacing(Number(e.target.value))}
                    className="w-full p-2 border rounded-md text-sm"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">模組擺放方向</label>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setOrientation('portrait')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold transition-colors ${
                      orientation === 'portrait' ? 'bg-white text-blue-700 shadow' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <ArrowUpDown size={14} /> 直放 (Portrait)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrientation('landscape')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold transition-colors ${
                      orientation === 'landscape'
                        ? 'bg-white text-blue-700 shadow'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <ArrowRightLeft size={14} /> 橫放 (Landscape)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 右側：KPI 指標 + 3D 案場模擬 + 2D 模組排佈 + 剖面圖 */}
          <div className="lg:col-span-8 flex flex-col gap-5">
            {/* 4 大即時計算指標 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col justify-center items-center">
                <span className="text-slate-500 text-xs font-medium mb-1">預估總裝置容量</span>
                <div className="text-2xl font-extrabold text-blue-600 flex items-baseline gap-1">
                  {calculations.totalCapacityKW.toFixed(2)} <span className="text-xs text-slate-500 font-normal">kWp</span>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col justify-center items-center">
                <span className="text-slate-500 text-xs font-medium mb-1">實際排佈數量</span>
                <div className="text-2xl font-extrabold text-slate-800 flex items-baseline gap-1">
                  {calculations.totalPanels} <span className="text-xs text-slate-500 font-normal">片</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  最大網格: {calculations.cols} 行 × {calculations.rows} 列
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col justify-center items-center">
                <span className="text-slate-500 text-xs font-medium mb-1">面積利用率</span>
                <div className="text-2xl font-extrabold text-emerald-600 flex items-baseline gap-1">
                  {calculations.utilizationRate.toFixed(1)} <span className="text-xs text-slate-500 font-normal">%</span>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col justify-center items-center">
                <span className="text-slate-500 text-xs font-medium mb-1 flex items-center gap-1">
                  <Sun size={13} className="text-amber-500" /> 預估年發電量
                </span>
                <div className="text-2xl font-extrabold text-amber-600 flex items-baseline gap-1">
                  {calculations.estimatedAnnualKWh.toLocaleString()}{' '}
                  <span className="text-xs text-slate-500 font-normal">度/年</span>
                </div>
              </div>
            </div>

            {/* 檢視模式切換列 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 pl-2">
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white bg-gradient-to-br ${currentProductSpec.badgeColor}`}
                >
                  {currentProductSpec.code}
                </span>
                <span className="font-bold text-sm text-slate-800">{currentProductSpec.name}</span>
                <span className="text-xs text-slate-500 hidden sm:inline">({currentProductSpec.application})</span>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
                <button
                  type="button"
                  onClick={() => setViewMode('split')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                    viewMode === 'split' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  3D + 2D 同步檢視
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('3d')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                    viewMode === '3d' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  僅顯示 3D 案場
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('2d')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                    viewMode === '2d' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  僅顯示 2D 排佈
                </button>
              </div>
            </div>

            {/* 3D 案場模擬視窗 */}
            {(viewMode === 'split' || viewMode === '3d') && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    <Box size={16} className="text-blue-600" />
                    3D 案場實景模擬 — {currentProductSpec.name}
                  </h3>
                  <span className="text-xs text-slate-500">已結合 2D 太陽能排佈與走道配置</span>
                </div>
                <div className={viewMode === '3d' ? 'h-[620px]' : 'h-[480px]'}>
                  <SolarSite3DView
                    productType={productType}
                    siteWidth={siteWidth}
                    siteLength={siteLength}
                    edgeClearance={edgeClearance}
                    siteShape={siteShape}
                    cutoutWidth={cutoutWidth}
                    cutoutLength={cutoutLength}
                    dripHeight={dripHeight}
                    tiltAngle={tiltAngle}
                    slopeType={slopeType}
                    buildingHeight={buildingHeight}
                    groundMountStyle={groundMountStyle}
                    panelsData={calculations.panelsData}
                    totalPanels={calculations.totalPanels}
                    totalCapacityKW={calculations.totalCapacityKW}
                  />
                </div>
              </div>
            )}

            {/* 2D 配置預覽圖 */}
            {(viewMode === 'split' || viewMode === '2d') && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    <LayoutGrid size={16} className="text-blue-600" />
                    2D 太陽能模組排佈預覽圖
                    <div className="group relative cursor-help">
                      <Info size={15} className="text-slate-400" />
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-60 p-2 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center">
                        {siteShape === 'custom'
                          ? '自訂模式下：直接點擊藍色模組可挖空移除，點擊虛線框可加回，3D 視圖同步變化。'
                          : '灰色區域為總場地，藍色方塊為太陽能模組。'}
                      </div>
                    </div>
                  </h3>
                  <div className="text-xs text-slate-500">
                    {siteShape === 'custom' ? (
                      <span className="text-indigo-600 font-bold animate-pulse">◆ 點擊模組即可新增或挖空 (與3D連動)</span>
                    ) : (
                      '比例尺視窗自適應'
                    )}
                  </div>
                </div>

                <div className="p-6 flex items-center justify-center bg-slate-50 min-h-[360px] overflow-hidden relative">
                  {siteWidth > 0 && siteLength > 0 ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg
                        viewBox={`0 0 ${siteWidth} ${siteLength}`}
                        className="max-w-full max-h-[520px] shadow-lg"
                        style={{
                          aspectRatio: `${siteWidth} / ${siteLength}`,
                          height: siteWidth > siteLength ? 'auto' : '100%',
                          width: siteWidth > siteLength ? '100%' : 'auto',
                        }}
                      >
                        {/* 場地背景 */}
                        {(() => {
                          const w = siteWidth;
                          const l = siteLength;
                          const cw = calculations.actualCutoutW;
                          const cl = calculations.actualCutoutL;
                          const strokeW = Math.max(0.05, siteWidth * 0.002);
                          const bgFill =
                            productType === 'fish_outdoor' || productType === 'fish_indoor' ? '#bae6fd' : '#e2e8f0';

                          if (siteShape === 'l-shape') {
                            const points = `0,0 0,${l} ${w},${l} ${w},${cl} ${w - cw},${cl} ${w - cw},0`;
                            return <polygon points={points} fill={bgFill} stroke="#94a3b8" strokeWidth={strokeW} />;
                          } else if (siteShape === 'u-shape') {
                            const cx1 = (w - cw) / 2;
                            const cx2 = cx1 + cw;
                            const points = `0,0 0,${l} ${w},${l} ${w},0 ${cx2},0 ${cx2},${cl} ${cx1},${cl} ${cx1},0`;
                            return <polygon points={points} fill={bgFill} stroke="#94a3b8" strokeWidth={strokeW} />;
                          }
                          return (
                            <rect x="0" y="0" width={w} height={l} fill={bgFill} stroke="#94a3b8" strokeWidth={strokeW} />
                          );
                        })()}

                        {/* 可建置區域退縮線 */}
                        {edgeClearance > 0 &&
                          calculations.availableWidth > 0 &&
                          calculations.availableLength > 0 &&
                          (() => {
                            const ec = edgeClearance;
                            const w = siteWidth;
                            const l = siteLength;
                            const cw = calculations.actualCutoutW;
                            const cl = calculations.actualCutoutL;
                            const strokeW = Math.max(0.05, siteWidth * 0.002);
                            const dash = `${Math.max(0.2, siteWidth * 0.01)}`;

                            if (siteShape === 'l-shape') {
                              const points = `${ec},${ec} ${ec},${l - ec} ${w - ec},${l - ec} ${w - ec},${cl + ec} ${
                                w - cw - ec
                              },${cl + ec} ${w - cw - ec},${ec}`;
                              return (
                                <polygon
                                  points={points}
                                  fill="none"
                                  stroke="#64748b"
                                  strokeWidth={strokeW}
                                  strokeDasharray={dash}
                                />
                              );
                            } else if (siteShape === 'u-shape') {
                              const cx1 = (w - cw) / 2;
                              const cx2 = cx1 + cw;
                              const points = `${ec},${ec} ${ec},${l - ec} ${w - ec},${l - ec} ${w - ec},${ec} ${
                                cx2 + ec
                              },${ec} ${cx2 + ec},${cl + ec} ${cx1 - ec},${cl + ec} ${cx1 - ec},${ec}`;
                              return (
                                <polygon
                                  points={points}
                                  fill="none"
                                  stroke="#64748b"
                                  strokeWidth={strokeW}
                                  strokeDasharray={dash}
                                />
                              );
                            }
                            return (
                              <rect
                                x={ec}
                                y={ec}
                                width={calculations.availableWidth}
                                height={calculations.availableLength}
                                fill="none"
                                stroke="#64748b"
                                strokeWidth={strokeW}
                                strokeDasharray={dash}
                              />
                            );
                          })()}

                        {/* 繪製模組 */}
                        {calculations.panelsData.map(panel => {
                          if (!panel.isActive && siteShape !== 'custom') return null;

                          return (
                            <g
                              key={panel.id}
                              onClick={() => togglePanel(panel.id)}
                              className={
                                siteShape === 'custom'
                                  ? 'cursor-pointer hover:opacity-70 transition-opacity duration-150'
                                  : ''
                              }
                            >
                              {panel.isActive ? (
                                <>
                                  <rect
                                    x={panel.x}
                                    y={panel.y}
                                    width={panel.w}
                                    height={panel.h}
                                    fill="#2563eb"
                                    stroke="#1e3a8a"
                                    strokeWidth={Math.max(0.02, siteWidth * 0.001)}
                                    rx={Math.max(0.01, siteWidth * 0.0005)}
                                  />
                                  <line
                                    x1={panel.x + panel.w * 0.33}
                                    y1={panel.y}
                                    x2={panel.x + panel.w * 0.33}
                                    y2={panel.y + panel.h}
                                    stroke="#60a5fa"
                                    strokeWidth={Math.max(0.01, siteWidth * 0.0005)}
                                    opacity="0.5"
                                  />
                                  <line
                                    x1={panel.x + panel.w * 0.66}
                                    y1={panel.y}
                                    x2={panel.x + panel.w * 0.66}
                                    y2={panel.y + panel.h}
                                    stroke="#60a5fa"
                                    strokeWidth={Math.max(0.01, siteWidth * 0.0005)}
                                    opacity="0.5"
                                  />
                                </>
                              ) : (
                                siteShape === 'custom' && (
                                  <rect
                                    x={panel.x}
                                    y={panel.y}
                                    width={panel.w}
                                    height={panel.h}
                                    fill="rgba(255, 255, 255, 0.45)"
                                    stroke="#94a3b8"
                                    strokeWidth={Math.max(0.02, siteWidth * 0.001)}
                                    strokeDasharray={String(Math.max(0.1, siteWidth * 0.005))}
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
            )}

            {/* 結構剖面示意圖 (對應六大產品之剖面示意) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
              <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-sm">
                  剖面結構示意圖 — {currentProductSpec.code}. {currentProductSpec.name}
                </h3>
                <span className="text-xs text-slate-500">實際結構依現場條件、法規與結構計算調整</span>
              </div>
              <div className="p-4 flex items-center justify-center bg-slate-50 min-h-[220px]">
                <svg viewBox="0 0 100 50" className="w-full max-h-[240px]">
                  <line x1="5" y1="44" x2="95" y2="44" stroke="#94a3b8" strokeWidth="1" />
                  {renderProductCrossSection()}
                </svg>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* 六大產品參考圖 Modal */}
      {showRefImageModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowRefImageModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-6xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-base">
                六種太陽能系統型態 — 建模示意圖（點擊下方產品可直接套用）
              </h3>
              <button
                type="button"
                onClick={() => setShowRefImageModal(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-4">
              <img
                src="/six-products.png"
                alt="六種太陽能系統型態建模示意圖"
                className="w-full h-auto rounded-xl border border-slate-200"
              />
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                {SOLAR_PRODUCTS.map(prod => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => {
                      handleSelectProduct(prod);
                      setShowRefImageModal(false);
                    }}
                    className="py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    套用 {prod.code}. {prod.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
