import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import {
  BookOpen,
  Download,
  FileText,
  FileSpreadsheet,
  FolderOpen,
  Search,
  CheckSquare,
  AlertTriangle,
  Layers,
  Zap,
  Calculator,
  Box,
  Eye,
  X,
  CheckCircle2,
  Compass,
  Image as ImageIcon,
  Code,
  ArrowRight,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

interface KnowledgeFileItem {
  id: string;
  name: string;
  relativePath: string;
  folderKey: string;
  subFolder: string;
  sizeBytes: number;
  updatedAt: string;
  ext: string;
  typeCategory: string;
  previewable: boolean;
}

interface KnowledgeFolder {
  key: string;
  title: string;
  subtitle: string;
  badge: string;
  order: number;
  checkPoint: string;
  files: KnowledgeFileItem[];
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
};

const BASELINE_SPECS = [
  {
    category: '基本參數',
    item: '標的類型 / 容量',
    baseline: '單座標準籃球場 / 156.75 kWp',
    rule: '模組：同昱 GTEC-550G9B6C（550Wp × 285 片 = 19 排 × 15 列）',
    color: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  {
    category: '空間幾何',
    item: '柱距配置 (X × Y)',
    baseline: '跨距 22.0 m（雙柱無中柱）× 縱向 31.5 m（7 跨）',
    rule: 'X 向軸距：5.5m × 4（軸 1~5，僅 1、5 軸落柱）｜Y 向軸距：5.0m + 5.0m + 5.5m + 5.5m + 5.5m + 5.0m（軸 A~G）',
    color: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
  {
    category: '高程設計',
    item: '簷高 / 脊高 / 坡度',
    baseline: '柱頂 +7.0m（淨高 >6.0m）/ 脊高 +8.5m~+9.0m / 6°',
    rule: '確保籃球拋物線淨空；設備平台設於 +4.5m（軸 5 / A~B 柱間，向內懸挑 1.5m）',
    color: 'bg-teal-50 text-teal-800 border-teal-200',
  },
  {
    category: '基礎型式',
    item: '鋼筋混凝土基礎',
    baseline: '縱向連續地梁基礎（斷面 800 × 700 mm，深 -800mm）',
    rule: '主筋 8-#6、箍筋 #4@15；柱底採 8-M20×170L 化學錨栓 + 14 座鋼柱防撞護墊',
    color: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  {
    category: '結構設計',
    item: '耐風 / 耐震參數',
    baseline: '基本設計風速 V10(C) = 33 m/sec、地況 B、I = 1.1',
    rule: '高風壓區標準，Midas Gen 3D 構架應力比控制在 Ratio ≤ 0.95',
    color: 'bg-rose-50 text-rose-800 border-rose-200',
  },
  {
    category: '屋面系統',
    item: '浪板 / 鋁支架',
    baseline: '0.6mm 清板（241.2 坪）+ 40×40 側開鋁擠型支架（90 支）',
    rule: '浪板區採 h 型腳座（1,125 只）、中脊採 L 型腳座（90 只），6 點上壓 + EPDM 防水墊片',
    color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  {
    category: '機電系統',
    item: '變流器與併網配置',
    baseline: '新望 PV-110KH-U (110kW) × 1 + PV-30000H-U (30kW) × 1',
    rule: 'DC/AC 比 = 156.75 / 140 = 1.12；併接 3Φ4W 220/380V 內線（附 CT 雙門電錶箱 1350×2150mm）',
    color: 'bg-purple-50 text-purple-800 border-purple-200',
  },
];

const TEKLA_MEMBERS = [
  {
    code: 'SC1 ~ SC7',
    role: '主鋼柱 (Column)',
    spec: 'RH300×300×10×15',
    material: 'SN400B',
    qty: 'L = 7,136.7 mm × 14 支',
    detail: '柱底板 PL20×500×500 (D1) + 8 片加勁板 PL8×100 (D2)；柱頂斜板 PL16×300×501.5 (D3)。SC5(5/B)、SC7(5/A) 附設設備平台接合孔 (16-Ø16)。',
  },
  {
    code: 'SG1 ~ SG6',
    role: '東西向大梁 (Rafter)',
    spec: 'RH400×200×8×13',
    material: 'SN400B',
    qty: '西側 SG2/4/5: 12,584.4 mm × 7 支｜東側 SG1/3/6: 11,387.7 mm × 7 支',
    detail: '跨距 22m 於中央脊部對接（端板 PL19×200~380×682，16-M20×80L + 8-M20×70L）；梁柱端採斜隅加腋（Haunch H10，長 2,005.7mm，高 200mm）。',
  },
  {
    code: 'E1 ~ E4',
    role: '南北向主繫梁',
    spec: 'RH300×150×6.5×9',
    material: 'SN400B',
    qty: '5.0m 跨 (E1/E3): 4,780 mm × 9 支｜5.5m 跨 (E2/E4): 5,280 mm × 9 支',
    detail: '配置於柱列（軸 1、5，標高 +7000）與屋脊（軸 3，標高 +8500），採 4-M20×60L 接合。',
  },
  {
    code: 'CP1 ~ CP4',
    role: '南北向次梁 / 中間縱梁',
    spec: 'RH250×125×6×9',
    material: 'SN400B',
    qty: '4,680 ~ 5,280 mm × 24 支',
    detail: '配置於軸 2、4 屋面中段及軸 1、5 下層（標高 +6000 雙層縱梁抗風），採 3-M20×60L 接合。',
  },
  {
    code: 'F1 ~ F5 / BR1',
    role: '設備平台構架與斜撐',
    spec: 'RH150×75×5×7',
    material: 'SN400B',
    qty: '懸挑 1.5m × 跨距 5.0m',
    detail: '設於軸 5（A~B 柱間，標高 +4500），下方設 2 支斜撐 BR1 (1,624.9 mm)，鋪設 PL3.2 花紋鋼板 (D21/D22)。',
  },
  {
    code: 'PP1 ~ PP4',
    role: '屋面與平台 C 型鋼',
    spec: 'C150×50×20×3.2',
    material: 'K35',
    qty: 'PP1(懸挑2.4m): 58支｜PP2(5.0m): 87支｜PP3(5.5m): 87支｜PP4(平台): 4支',
    detail: '藉由角鋼 L105×62×4.5 (CL1 單向 58 只、CL2 雙向 203 只) 與 2-M12×25L 固定於大梁上。',
  },
  {
    code: 'BK1 ~ BK2',
    role: '屋面交叉風拉桿',
    spec: 'Ø16 mm 圓鋼 + 1/2" 伸縮器',
    material: 'A36',
    qty: 'BK1: 11,250 mm × 12 組｜BK2: 11,470 mm × 12 組（共 24 組）',
    detail: '搭配 BD-1 風拉桿連接片（厚度 10T × 48 片）。',
  },
];

const MEP_STRINGS = [
  { inv: 'INV-1 新望 PV-110KH-U (110kW, 9 MPPT)', area: '東側坡面 + 部分西側 (225片)', mppt: 'MPPT 1 ~ 3', config: '16 串 × 2 並 (×3 組)', pcs: '96 片', kwp: '52.80 kWp', note: '標準無遮陰區，16 串為基準 (Vmp = 671V)' },
  { inv: 'INV-1 新望 PV-110KH-U', area: '東側坡面', mppt: 'MPPT 4', config: '16 串 × 1 並', pcs: '16 片', kwp: '8.80 kWp', note: '單串獨立迴路' },
  { inv: 'INV-1 新望 PV-110KH-U', area: '東側遮陰區', mppt: 'MPPT 5 ~ 6', config: '12 串 × 1 並 / 11 串 × 1 並', pcs: '23 片', kwp: '12.65 kWp', note: '⚠️ 遮陰區（24 片級距）：短串獨立 MPPT，避免拉低主串發電' },
  { inv: 'INV-1 新望 PV-110KH-U', area: '高日照區', mppt: 'MPPT 7 ~ 8', config: '18 串 × 2 並 (×2 組)', pcs: '72 片', kwp: '39.60 kWp', note: '高日照長串區 (Voc = 898V < 1000V)' },
  { inv: 'INV-1 新望 PV-110KH-U', area: '高日照區', mppt: 'MPPT 9', config: '18 串 × 1 並', pcs: '18 片', kwp: '9.90 kWp', note: '單串獨立迴路' },
  { inv: 'INV-2 新望 PV-30000H-U (30kW, 2 MPPT)', area: '西側坡面 (60片)', mppt: 'MPPT 1', config: '18 串 × 2 並', pcs: '36 片', kwp: '19.80 kWp', note: '西側主發電區' },
  { inv: 'INV-2 新望 PV-30000H-U', area: '西側遮陰區', mppt: 'MPPT 2', config: '12 串 × 2 並', pcs: '24 片', kwp: '13.20 kWp', note: '⚠️ 西側遮陰區（鄰近 2F 校舍）：12 串獨立 MPPT' },
];

const QA_CHECKLIST_ITEMS = [
  {
    id: 'chk-1',
    title: '地下管網與跨距一次定案',
    lesson: '歷史教訓：2024/07 原為 21m 跨距 + 懸挑 2.395m，08 月因排水溝退縮改為 22m 對稱跨距 + 懸挑 1.0m。',
    check: '柱位開挖點是否已避開球場周邊既有暗溝、化糞池與給排水管？',
  },
  {
    id: 'chk-2',
    title: '球場淨高、退縮淨距與防撞護墊',
    lesson: '歷史教訓：校園籃球場驗收嚴格要求鋼柱緩衝防護。',
    check: '球場邊線至鋼柱內側淨距是否足夠？預算是否已列入「鋼柱防護墊（14 座）」且簷高淨空 > 6.0m？',
  },
  {
    id: 'chk-3',
    title: '連續地梁基礎混凝土與鋼筋預留',
    lesson: '歷史教訓：初期以 300×300 獨立基礎估價，結構簽證時因抗拔需求改為 800×700 縱向連續基礎地梁 + 8-M20×170L 化學錨栓。',
    check: '球場地質或外島高風壓抗拔需求高時，預算與結構圖是否已採連續地梁基礎設計？',
  },
  {
    id: 'chk-4',
    title: '設備平台預留孔位與雙斜撐 BR1 補強',
    lesson: '歷史教訓：2025/01 事後追加設備平台補強圖，導致一次/二次加工圖改版至 v.4。',
    check: '負責掛載變流器與配電箱的鋼柱（如 SC5、SC7），在 Tekla 一次加工圖是否已預留平台梁與雙斜撐 BR1 的螺栓孔（16-Ø16）？',
  },
  {
    id: 'chk-5',
    title: '屋脊中脊板腳座切換（h 腳座 ➔ L 腳座）',
    lesson: '歷史教訓：屋脊中脊板為平板，無法安裝跨浪波峰的 h 型腳座，2024/09 分料單特別緊急標註「屋脊換 L」。',
    check: '鋁支架分料單中，位於屋脊中脊板上的第一排腳座（90 只）是否已由 h 腳座改為 L 型腳座？',
  },
  {
    id: 'chk-6',
    title: '遮陰串列獨立 MPPT 與 3Φ4W 附 CT 雙門電表箱',
    lesson: '歷史教訓：初期畫單獨電表箱（寬 750mm），審訖圖改為附 CT 雙門電表箱（寬 1350mm）並追加 #D 受電箱進線管。',
    check: '鄰近校舍遮陰模組是否已獨立短串 MPPT（11~12 串）？超過 100kW 併內線案場是否已套用寬 1350mm 附 CT 電表箱（離地 1.5~1.8m、內門淨寬 ≥ 55cm）？',
  },
];

const DesignKnowledgeBase: React.FC = () => {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [folders, setFolders] = useState<KnowledgeFolder[]>([]);
  const [allFiles, setAllFiles] = useState<KnowledgeFileItem[]>([]);
  const [freecadScript, setFreecadScript] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'FILES' | 'SPECS' | 'TEKLA' | 'MEP' | 'COST' | 'QA' | 'BIM3D'>('FILES');

  // Filter states for file center
  const [selectedFolderKey, setSelectedFolderKey] = useState<string>('ALL');
  const [selectedFileExt, setSelectedFileExt] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Interactive QA checklist state
  const [checkedQaIds, setCheckedQaIds] = useState<Record<string, boolean>>({});

  // Cost Simulator state (default 156.75 kWp, 29.44t RH steel)
  const [simCapacityKw, setSimCapacityKw] = useState<number>(156.75);
  const [simRhTheoryTons, setSimRhTheoryTons] = useState<number>(29.44);
  const [simCorrugatedPing, setSimCorrugatedPing] = useState<number>(241.2);

  // Preview Modal state
  const [previewFile, setPreviewFile] = useState<KnowledgeFileItem | null>(null);

  useEffect(() => {
    const fetchKb = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/api/knowledge-base', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFolders(res.data.folders || []);
        setAllFiles(res.data.allFiles || []);
        setFreecadScript(res.data.freecadScriptContent || '');
      } catch (err) {
        console.error('Failed to load design knowledge base:', err);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchKb();
  }, [token]);

  const handleDownloadFile = (file: KnowledgeFileItem) => {
    const url = `/api/knowledge-base/file?path=${encodeURIComponent(file.relativePath)}&download=1`;
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', file.name);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const getPreviewUrl = (file: KnowledgeFileItem) =>
    `/api/knowledge-base/file?path=${encodeURIComponent(file.relativePath)}&download=0`;

  const filteredFiles = useMemo(() => {
    return allFiles.filter(f => {
      if (selectedFolderKey !== 'ALL' && f.folderKey !== selectedFolderKey) return false;
      if (selectedFileExt !== 'ALL' && f.ext !== selectedFileExt) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        return (
          f.name.toLowerCase().includes(q) ||
          f.folderKey.toLowerCase().includes(q) ||
          f.subFolder.toLowerCase().includes(q) ||
          f.typeCategory.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allFiles, selectedFolderKey, selectedFileExt, searchQuery]);

  const extCounts = useMemo(() => {
    const map: Record<string, number> = {};
    allFiles.forEach(f => {
      map[f.ext] = (map[f.ext] || 0) + 1;
    });
    return map;
  }, [allFiles]);

  const getExtBadgeClass = (ext: string) => {
    switch (ext) {
      case 'PDF':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'DWG':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'XLSX':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'PNG':
      case 'JPG':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'FCStd':
      case 'STEP':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'PY':
      case 'MD':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Dynamic Cost Estimation calculation based on Section 5 formulas
  const costSimResult = useMemo(() => {
    const kw = Math.max(1, simCapacityKw);
    const rhLossTons = Math.round(simRhTheoryTons * 1.11 * 100) / 100;
    const plateTons = Math.round(rhLossTons * 0.1 * 100) / 100;
    const totalRhAndPlateTons = Math.round((rhLossTons + plateTons) * 100) / 100;
    const boltTons = Math.round(totalRhAndPlateTons * 0.015 * 1000) / 1000;
    const cChannelTons = Math.round((kw / 156.75) * 5.27 * 100) / 100;
    const totalErectionTons = Math.round((totalRhAndPlateTons + cChannelTons) * 100) / 100;

    const steelCost = Math.round(
      rhLossTons * 28000 +
        plateTons * 33000 +
        totalRhAndPlateTons * 20000 + // 加工10,000 + 鍍鋅10,000
        boltTons * 49500 +
        cChannelTons * (27500 + 14000) +
        totalErectionTons * 7000 +
        14 * 13560
    );
    const sheetCost = Math.round(simCorrugatedPing * 2126); // 基準 241.2坪 -> 512,873元
    const aluBracketCost = Math.round(kw * (2700 + 2400 + 50) + 115.8 * 500 + 60.8 * 800);
    const civilCost = Math.round(14 * (10600 + 3340 + 2640) + 115.8 * 1540);
    const mepCost = Math.round(316000 + kw * (3200 + 1300 + 850 + 2100) + 46800);
    const certCost = Math.round(35000 + 50000 + 50000 + 15000 + 65000 + kw * 500 + 78000);
    const totalUntaxed = steelCost + sheetCost + aluBracketCost + civilCost + mepCost + certCost;
    const perKw = Math.round(totalUntaxed / kw);

    return {
      rhLossTons,
      plateTons,
      totalRhAndPlateTons,
      boltTons,
      cChannelTons,
      totalErectionTons,
      steelCost,
      sheetCost,
      aluBracketCost,
      civilCost,
      mepCost,
      certCost,
      totalUntaxed,
      perKw,
    };
  }, [simCapacityKw, simRhTheoryTons, simCorrugatedPing]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          <p className="text-slate-500 text-sm font-bold">載入設計知識庫與標準範例檔案中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 頂部主視覺 Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-indigo-500/30 border border-indigo-400/40 rounded-full text-xs font-extrabold text-indigo-200 flex items-center gap-1.5">
                <Sparkles size={13} /> 標準設計母版 Knowledge Base
              </span>
              <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 rounded-full text-xs font-bold text-emerald-200">
                基準案：澎湖 A-5 嵵裡國小風雨球場 (156.75 kWp)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              設計知識庫 — 太陽能風雨球場標準設計模板
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              整合單一標準籃球場（雙坡跨距 22m × 縱向 31.5m）之<strong>收方套圖、結構簽證、Tekla 一二次拆料製造、浪板/鋁支架分料、台電送審、參數化預算母版及 FreeCAD 3D 全模型</strong>，提供同仁線上查閱設計規範與一鍵下載全套標準範例檔。
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5 bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-3.5 text-center shrink-0">
            <div className="px-2">
              <div className="text-xl sm:text-2xl font-black text-amber-300 font-mono">{allFiles.length}</div>
              <div className="text-[11px] text-slate-300 font-medium">標準範例檔案</div>
            </div>
            <div className="px-2 border-x border-white/15">
              <div className="text-xl sm:text-2xl font-black text-emerald-300 font-mono">8 大</div>
              <div className="text-[11px] text-slate-300 font-medium">標準資料夾階段</div>
            </div>
            <div className="px-2">
              <div className="text-xl sm:text-2xl font-black text-sky-300 font-mono">156.75</div>
              <div className="text-[11px] text-slate-300 font-medium">基準容量 (kWp)</div>
            </div>
          </div>
        </div>
      </div>

      {/* 功能導覽分頁列 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 flex gap-1.5 overflow-x-auto">
        {[
          { id: 'FILES', label: `📂 範例檔案下載中心 (${allFiles.length})`, icon: FolderOpen },
          { id: 'SPECS', label: '📐 基準規格與 SOP 流程', icon: Compass },
          { id: 'TEKLA', label: '🏗️ 結構與 Tekla 拆料規範', icon: Layers },
          { id: 'MEP', label: '⚡ 機電串併與線槽檢討', icon: Zap },
          { id: 'COST', label: '💰 工程預算參數化試算', icon: Calculator },
          { id: 'QA', label: '🛡️ 歷史重工復盤與防呆檢核表', icon: CheckSquare },
          { id: 'BIM3D', label: '🧊 FreeCAD 3D 全模型與腳本', icon: Box },
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-2.5 rounded-lg text-xs sm:text-sm font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* =====================================================================
          TAB 1: 範例檔案下載中心 (含 8 大階段資料夾、格式篩選、線上預覽與一鍵下載)
      ===================================================================== */}
      {activeTab === 'FILES' && (
        <div className="space-y-6">
          {/* 搜尋與檔案格式快速篩選列 */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="搜尋範例檔案名稱（例如：預算書、結構簽證、一次加工圖、串併、3D全模型...）"
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* 檔案類型膠囊篩選 */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedFileExt('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border transition-colors cursor-pointer ${
                    selectedFileExt === 'ALL'
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  全部格式 ({allFiles.length})
                </button>
                {Object.entries(extCounts).map(([ext, count]) => (
                  <button
                    key={ext}
                    type="button"
                    onClick={() => setSelectedFileExt(ext === selectedFileExt ? 'ALL' : ext)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold border transition-colors cursor-pointer ${
                      selectedFileExt === ext
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : `${getExtBadgeClass(ext)} hover:opacity-85`
                    }`}
                  >
                    .{ext} ({count})
                  </button>
                ))}
              </div>
            </div>

            {/* 資料夾階段快速切換按鈕 */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-500 mr-1">依設計階段篩選：</span>
              <button
                type="button"
                onClick={() => setSelectedFolderKey('ALL')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                  selectedFolderKey === 'ALL'
                    ? 'bg-indigo-100 text-indigo-800 font-extrabold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                顯示全部階段
              </button>
              {folders.map(fd => (
                <button
                  key={fd.key}
                  type="button"
                  onClick={() => setSelectedFolderKey(fd.key === selectedFolderKey ? 'ALL' : fd.key)}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                    selectedFolderKey === fd.key
                      ? 'bg-indigo-100 text-indigo-800 font-extrabold'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {fd.key} ({fd.files.length})
                </button>
              ))}
            </div>
          </div>

          {/* 依資料夾分組顯示所有範例檔案與檢核點 */}
          <div className="space-y-5">
            {folders
              .filter(fd => selectedFolderKey === 'ALL' || fd.key === selectedFolderKey)
              .map(fd => {
                const folderFilteredFiles = filteredFiles.filter(f => f.folderKey === fd.key);
                if (
                  (searchQuery.trim() !== '' || selectedFileExt !== 'ALL') &&
                  folderFilteredFiles.length === 0
                ) {
                  return null;
                }

                return (
                  <div
                    key={fd.key}
                    className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
                  >
                    {/* 資料夾標題與階段設計檢核點 */}
                    <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-indigo-50/30 to-slate-50 border-b border-slate-200">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-0.5 bg-indigo-600 text-white rounded-md text-xs font-extrabold">
                              {fd.badge}
                            </span>
                            <h3 className="text-base sm:text-lg font-extrabold text-slate-800">
                              {fd.title}
                            </h3>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{fd.subtitle}</p>
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                          共 {folderFilteredFiles.length} 個範例檔
                        </span>
                      </div>

                      {fd.checkPoint && (
                        <div className="mt-3 p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                          <CheckCircle2 size={15} className="text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <strong className="font-extrabold">本階段設計檢核點：</strong>
                            {fd.checkPoint}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 資料夾內檔案清單 */}
                    {folderFilteredFiles.length > 0 ? (
                      <div className="divide-y divide-slate-100">
                        {folderFilteredFiles.map(file => (
                          <div
                            key={file.id}
                            className="p-3.5 sm:px-5 flex flex-wrap items-center justify-between gap-3 hover:bg-indigo-50/30 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <span
                                className={`px-2.5 py-1 rounded-lg text-xs font-black font-mono border shrink-0 min-w-[54px] text-center ${getExtBadgeClass(
                                  file.ext
                                )}`}
                              >
                                .{file.ext}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className="font-bold text-sm text-slate-800 break-all"
                                    title={file.name}
                                  >
                                    {file.name}
                                  </span>
                                  {file.subFolder && (
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px] font-bold">
                                      子目錄：{file.subFolder}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-0.5">
                                  <span>類型：{file.typeCategory}</span>
                                  <span>大小：{formatFileSize(file.sizeBytes)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {file.previewable && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewFile(file)}
                                  className="px-3 py-1.5 bg-white border border-slate-300 hover:border-indigo-400 hover:text-indigo-600 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                                >
                                  <Eye size={14} /> 線上預覽
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDownloadFile(file)}
                                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                              >
                                <Download size={14} /> 下載範例檔
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-xs text-slate-400 italic">
                        此資料夾為專案業主原始資料存放目錄（新開案時請將業主提供之地籍與建物圖檔歸檔於此）
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: 基準規格與標準設計作業流程 (Baseline Specs & SOP)
      ===================================================================== */}
      {activeTab === 'SPECS' && (
        <div className="space-y-6">
          {/* 標準設計作業流程 SOP 視覺化卡片 */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 space-y-4">
            <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
              <Compass size={20} className="text-indigo-600" />
              標準設計作業流程與圖件交付物 (SOP & Deliverables)
            </h3>
            <p className="text-xs text-slate-500">
              點擊任一階段可直接跳轉至「範例檔案下載中心」對應資料夾下載該階段標準母版與範例圖。
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-2">
              {[
                { step: 'STEP 1', title: '現場收方與套圖', folder: '7.收方圖', desc: '確認籃球場邊線、球架、2F教室樓高與地下暗溝位置' },
                { step: 'STEP 2', title: '模配與預算試算', folder: '1.預算書及模配圖', desc: '套疊地籍圖、排佈285片模組、留設檢修步道與參數化預算' },
                { step: 'STEP 3', title: '校方簽確與結構簽證', folder: '4.結構簽證圖', desc: '先出學校簽確圖確認跨距22m與高程，再出Midas計算書與簽證圖' },
                { step: 'STEP 4', title: 'Tekla拆料與製造圖', folder: '5.拆料圖及組裝圖', desc: '鋼構拆料總圖、設備平台補強、一二次/板加工圖與鋁支架分料單' },
                { step: 'STEP 5', title: '台電送審與機電施工圖', folder: '3.台電送審圖及施工圖', desc: '串併遮陰分離、線槽填充率檢討表与 3P4W 附 CT 電表箱圖' },
                { step: 'STEP 6', title: '竣工報告與掛錶結案', folder: '6.竣工報告書定稿參考', desc: '彙整31.結構計算書、32.台電審訖圖、33.竣工照及掛錶紀錄' },
              ].map((s, idx) => (
                <div
                  key={s.step}
                  onClick={() => {
                    setSelectedFolderKey(s.folder);
                    setActiveTab('FILES');
                  }}
                  className="group bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 rounded-xl p-3.5 cursor-pointer transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-black text-indigo-600 mb-1">
                      <span>{s.step}</span>
                      <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                    <div className="font-extrabold text-sm text-slate-800 mb-1">{s.title}</div>
                    <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-200/70 text-[11px] font-mono font-bold text-indigo-700 truncate">
                    📁 {s.folder}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 專案基準規格速查表 */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50">
              <h3 className="text-lg font-extrabold text-slate-800">
                一、專案基準規格速查表 (Baseline Specs — 156.75 kWp 標準籃球場)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-max min-w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-extrabold">
                    <th className="p-3.5 whitespace-nowrap">類別</th>
                    <th className="p-3.5 whitespace-nowrap">項目</th>
                    <th className="p-3.5 whitespace-nowrap">嵵裡國小基準數值 / 規格</th>
                    <th className="p-3.5 min-w-[320px]">模板化設計原則 / 備註</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {BASELINE_SPECS.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-extrabold border ${row.color}`}>
                          {row.category}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-slate-800 whitespace-nowrap">{row.item}</td>
                      <td className="p-3.5 font-extrabold text-indigo-900 whitespace-nowrap">{row.baseline}</td>
                      <td className="p-3.5 text-slate-600 leading-relaxed">{row.rule}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: 結構與鋼構標準設計模組 (Tekla & Aluminum Bracket Specs)
      ===================================================================== */}
      {activeTab === 'TEKLA' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800">
                  構件編號與型鋼選用標準（Tekla 命名規範）
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  後續風雨球場專案請統一依 `[案號] + [構件代號]` 命名，確保加工廠一次/二次加工與製造報工完全對齊
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedFolderKey('5.拆料圖及組裝圖');
                  setActiveTab('FILES');
                }}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                <FolderOpen size={14} /> 查看 5.拆料圖及組裝圖全部範例檔
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-max min-w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-extrabold">
                    <th className="p-3.5 whitespace-nowrap">構件代號</th>
                    <th className="p-3.5 whitespace-nowrap">角色說明</th>
                    <th className="p-3.5 whitespace-nowrap">斷面規格</th>
                    <th className="p-3.5 whitespace-nowrap">材質</th>
                    <th className="p-3.5 whitespace-nowrap">單件長度 / 數量</th>
                    <th className="p-3.5 min-w-[340px]">接合與加工細節</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {TEKLA_MEMBERS.map((m, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-3.5 font-mono font-black text-indigo-700 whitespace-nowrap">{m.code}</td>
                      <td className="p-3.5 font-bold text-slate-800 whitespace-nowrap">{m.role}</td>
                      <td className="p-3.5 font-mono font-bold text-emerald-800 whitespace-nowrap">{m.spec}</td>
                      <td className="p-3.5 font-mono font-bold text-slate-700 whitespace-nowrap">{m.material}</td>
                      <td className="p-3.5 font-mono text-slate-700 whitespace-nowrap">{m.qty}</td>
                      <td className="p-3.5 text-slate-600 leading-relaxed">{m.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tekla 出圖分級與屋面鋁支架標準 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-3">
              <h4 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <Layers size={18} className="text-indigo-600" />
                Tekla 出圖圖層分級規則
              </h4>
              <div className="space-y-2.5 text-xs sm:text-sm text-slate-700">
                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl">
                  <strong className="text-indigo-900">① 一次加工圖 (H1~H26, PP1~PP4)：</strong>
                  <p className="mt-1 text-slate-600">僅標示型鋼單件切斷長度、切角與鑽孔位置（供型鋼加工廠 CNC 鑽切下料）。</p>
                </div>
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
                  <strong className="text-blue-900">② 板加工圖 (CL1~2, D1~D22)：</strong>
                  <p className="mt-1 text-slate-600">所有連接板、加勁板、基礎底板、花紋板之獨立裁切鑽孔圖。</p>
                </div>
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                  <strong className="text-emerald-900">③ 二次加工圖 (SC1~7, SG1~6, E1~4, CP1~4, F1~5)：</strong>
                  <p className="mt-1 text-slate-600">標示主材與鐵板組焊位置、焊道、重量及工廠/現場螺栓清單（前置碼 <code>TB</code> 為工廠植釘、<code>TE</code> 為現場植釘）。</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-3">
              <h4 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600" />
                屋面浪板、鋁支架分料與維運安全標準
              </h4>
              <div className="space-y-2.5 text-xs sm:text-sm text-slate-700">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <strong>• 浪板分段搭接尺寸：</strong>單側坡面分兩段搭接，西側 <code>6.5m + 6.8m</code>，東側 <code>6.5m + 5.6m</code>（含兩端懸挑）。
                </div>
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                  <strong>• 鋁支架分料標準（A區 150片 / B區 135片）：</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1 text-slate-700">
                    <li><strong>A 區 (東坡 150片)</strong>：支架長 11,900mm (6300+5600) × 45 支、連結片 45 只、<strong>h 腳座 585 只</strong>、<strong>屋脊 L 腳座 45 只</strong>、中壓塊 405 只、側壓塊 90 只。</li>
                    <li><strong>B 區 (西坡 135片)</strong>：支架長 10,700mm (6300+4400) × 45 支、連結片 45 只、<strong>h 腳座 540 只</strong>、<strong>屋脊 L 腳座 45 只</strong>、中壓塊 360 只、側壓塊 90 只。</li>
                    <li><strong>防水扣件</strong>：腳座底部全面鋪設 EPDM 防水橡膠墊片 + 1-M8 六角鑽尾自攻釘（SGS 實測抗拉力 835 kgf &gt; 設計需求 40.7 kgf）。</li>
                  </ul>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <strong>• 維運安全配置：</strong>西南角（軸 1/G）設護籠爬梯；屋面四周設角鐵安全母索立柱（高 1m，間距 2.5m）；屋脊中央（軸 3）與南側屋簷設菱形擴張網維修步道。
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: 機電與台電送審標準設計模組 (MEP & Taipower Module)
      ===================================================================== */}
      {activeTab === 'MEP' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800">
                  1. 串併配置邏輯（分區 + 遮陰獨立 MPPT — 共 285 片 / 156.75 kWp）
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  模組參數：同昱 550Wp (Voc = 49.90V, Vmp = 41.96V, Isc = 14.00A, Imp = 13.11A)
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedFolderKey('3.台電送審圖及施工圖');
                  setActiveTab('FILES');
                }}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                <Download size={14} /> 下載串併及線槽填充率檢討表 (.xlsx)
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-max min-w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-extrabold">
                    <th className="p-3.5 whitespace-nowrap">變流器</th>
                    <th className="p-3.5 whitespace-nowrap">負責區域</th>
                    <th className="p-3.5 whitespace-nowrap">MPPT 編號</th>
                    <th className="p-3.5 whitespace-nowrap">串列數 × 並列數</th>
                    <th className="p-3.5 whitespace-nowrap">片數</th>
                    <th className="p-3.5 whitespace-nowrap">容量</th>
                    <th className="p-3.5 min-w-[280px]">設計邏輯說明</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {MEP_STRINGS.map((row, idx) => (
                    <tr key={idx} className={row.note.includes('遮陰') ? 'bg-amber-50/60' : 'hover:bg-slate-50'}>
                      <td className="p-3.5 font-bold text-slate-800 whitespace-nowrap">{row.inv}</td>
                      <td className="p-3.5 text-slate-700 whitespace-nowrap">{row.area}</td>
                      <td className="p-3.5 font-mono font-bold text-indigo-700 whitespace-nowrap">{row.mppt}</td>
                      <td className="p-3.5 font-mono font-bold text-slate-800 whitespace-nowrap">{row.config}</td>
                      <td className="p-3.5 font-mono font-bold text-blue-700 whitespace-nowrap">{row.pcs}</td>
                      <td className="p-3.5 font-mono font-extrabold text-emerald-700 whitespace-nowrap">{row.kwp}</td>
                      <td className="p-3.5 text-slate-700 font-medium">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 線槽填充率與電表箱標準 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-3">
              <h4 className="text-base font-extrabold text-slate-800">
                2. 線槽填充率標準檢討公式（直接套用至施工圖說明欄）
              </h4>
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="font-extrabold text-indigo-900">• DC 幹線鋁線槽 (#A：100 mm × 100 mm)</div>
                  <div className="text-slate-600">容納線材：PV cable 4.0mm² × 34 條 (外徑 7.5mm，面積 45mm²) + 接地母線 PVC 22mm² × 1 條 (外徑 9.2mm，面積 66mm²)</div>
                  <div className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded border border-emerald-200 mt-1">
                    填充率 = (45 × 34 + 66 × 1) / (100 × 100) = 1596 / 10000 = 15.96% &lt; 20% (OK)
                  </div>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="font-extrabold text-indigo-900">• AC 分路鋁線槽 (#B：100 mm × 100 mm)</div>
                  <div className="text-slate-600">容納線材：INV-1 用 XLPE 100mm² × 4 條 (238mm²) + PVC 22mm² × 1 條 (66mm²) + INV-2 用 XLPE 14mm² × 4 條 (57mm²) + PVC 5.5mm² × 1 條 (20mm²)</div>
                  <div className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded border border-emerald-200 mt-1">
                    填充率 = (238 × 4 + 66 + 57 × 4 + 20) / 10000 = 1266 / 10000 = 12.66% &lt; 20% (OK)
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-3">
              <h4 className="text-base font-extrabold text-slate-800">
                3. AC 主幹線、3Φ4W 附 CT 電表箱與接地規範
              </h4>
              <div className="space-y-3 text-xs sm:text-sm text-slate-700">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <strong>• AC 主幹線 (#C、#D：AC-1 至 KWH-PV 躉售電表箱及受電箱)：</strong>
                  <p className="mt-1 text-slate-600">管線規格：<code>Ø82mm (3") RSG 金屬管 × 2 管</code>，內穿 <code>(XLPE 60mm²-1/C × 4, E22) × 2 迴</code>。</p>
                </div>
                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl">
                  <strong>• 3Φ4W 低壓附 CT 使用式電錶箱標準：</strong>
                  <p className="mt-1 text-slate-700">材質 <code>SUS304 2.0t</code> 防水防塵型（高 2150 × 寬 1350 × 深 500 mm），<strong>表箱離地 1.5~1.8m，內門淨寬 ≥ 55 cm</strong>（CT 比流器倍率 × 80）。</p>
                </div>
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                  <strong>• 接地系統電阻要求：</strong>
                  <p className="mt-1 text-slate-700">設備接地電阻 <code>R &lt; 10 Ω (E22)</code>；系統接地電阻 <code>R &lt; 50 Ω (E30)</code>。</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 5: 工程預算與參數化估算公式 (Interactive Cost Estimation Model)
      ===================================================================== */}
      {activeTab === 'COST' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                  <Calculator size={20} className="text-indigo-600" />
                  風雨球場工程預算參數化快速試算器（基於嵵裡國小 156.75 kWp 母版公式）
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  輸入新案場的「設置容量 (kWp)」、「圖面 RH 型鋼理論重 (噸)」與「浪板坪數」，即時依公司經驗係數（1.11 損耗、10% 連接板、1.5% 高張力螺絲）試算未稅工程總預算
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedFolderKey('1.預算書及模配圖');
                  setActiveTab('FILES');
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet size={15} /> 下載工程預算書參數化母版 (.xlsx)
              </button>
            </div>

            {/* 參數輸入列 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-indigo-50/50 border border-indigo-100 rounded-xl p-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  1. 新案設置容量 (kWp)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={simCapacityKw}
                  onChange={e => setSimCapacityKw(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg font-mono font-extrabold text-indigo-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-slate-400">基準值：156.75 kWp (285片 × 550Wp)</span>
              </div>
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  2. Tekla 圖面 RH 型鋼理論重 (噸)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={simRhTheoryTons}
                  onChange={e => setSimRhTheoryTons(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg font-mono font-extrabold text-indigo-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-slate-400">
                  含 1.11 損耗後：{costSimResult.rhLossTons} 噸 + 10% 連接板：{costSimResult.plateTons} 噸
                </span>
              </div>
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  3. 屋面浪板鋪設面積 (坪)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={simCorrugatedPing}
                  onChange={e => setSimCorrugatedPing(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg font-mono font-extrabold text-indigo-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-slate-400">基準值：241.2 坪 (0.6mm 清板 + 水槽)</span>
              </div>
            </div>

            {/* 估算結果明細表 */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-max min-w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-extrabold">
                    <th className="p-3.5 whitespace-nowrap">工項分類</th>
                    <th className="p-3.5 whitespace-nowrap">細項與經驗公式係數</th>
                    <th className="p-3.5 text-right whitespace-nowrap">估算小計 (未稅)</th>
                    <th className="p-3.5 text-right whitespace-nowrap">每 kW 單價</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="p-3.5 font-extrabold text-slate-800 whitespace-nowrap">壹、鋼構工程</td>
                    <td className="p-3.5 text-slate-600">
                      RH型鋼 ({costSimResult.rhLossTons}t @28,000) + 10%連接板 ({costSimResult.plateTons}t @33,000) + 加工鍍鋅 (@20,000/t) + 1.5% F10T螺絲 ({costSimResult.boltTons}t) + C型鋼 ({costSimResult.cChannelTons}t) + 吊裝 ({costSimResult.totalErectionTons}t @7,000) + 14座防撞墊
                    </td>
                    <td className="p-3.5 text-right font-mono font-extrabold text-slate-800 whitespace-nowrap">
                      {costSimResult.steelCost.toLocaleString()} 元
                    </td>
                    <td className="p-3.5 text-right font-mono text-slate-600 whitespace-nowrap">
                      {Math.round(costSimResult.steelCost / Math.max(1, simCapacityKw)).toLocaleString()} 元/kW
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-extrabold text-slate-800 whitespace-nowrap">貳、浪板工程</td>
                    <td className="p-3.5 text-slate-600">
                      0.6mm 清板 ({simCorrugatedPing} 坪 @1,700) + 中脊包邊 + 30cm 白鐵水槽 (@330/呎)
                    </td>
                    <td className="p-3.5 text-right font-mono font-extrabold text-slate-800 whitespace-nowrap">
                      {costSimResult.sheetCost.toLocaleString()} 元
                    </td>
                    <td className="p-3.5 text-right font-mono text-slate-600 whitespace-nowrap">
                      {Math.round(costSimResult.sheetCost / Math.max(1, simCapacityKw)).toLocaleString()} 元/kW
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-extrabold text-slate-800 whitespace-nowrap">參、鋁擠支架與母索步道</td>
                    <td className="p-3.5 text-slate-600">
                      支架材料 (2,700元/kW) + 安裝 (2,400元/kW) + 小五金 (50元/kW) + 母索 115.8m + 菱形網步道 60.8m
                    </td>
                    <td className="p-3.5 text-right font-mono font-extrabold text-slate-800 whitespace-nowrap">
                      {costSimResult.aluBracketCost.toLocaleString()} 元
                    </td>
                    <td className="p-3.5 text-right font-mono text-slate-600 whitespace-nowrap">
                      {Math.round(costSimResult.aluBracketCost / Math.max(1, simCapacityKw)).toLocaleString()} 元/kW
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-extrabold text-slate-800 whitespace-nowrap">肆、土木工程</td>
                    <td className="p-3.5 text-slate-600">
                      基礎開挖澆置 (10,600/座) + 棄土 (3,340/座) + 球場漆面復原 (2,640/座) × 14 座 + 甲種圍籬 115.8m
                    </td>
                    <td className="p-3.5 text-right font-mono font-extrabold text-slate-800 whitespace-nowrap">
                      {costSimResult.civilCost.toLocaleString()} 元
                    </td>
                    <td className="p-3.5 text-right font-mono text-slate-600 whitespace-nowrap">
                      {Math.round(costSimResult.civilCost / Math.max(1, simCapacityKw)).toLocaleString()} 元/kW
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-extrabold text-slate-800 whitespace-nowrap">陸、機電工程</td>
                    <td className="p-3.5 text-slate-600">
                      低壓盤體與附CT表箱 (316,000元) + 線材 (3,200/kW) + 管槽 (1,300/kW) + 另料 (850/kW) + 工資 (2,100/kW)
                    </td>
                    <td className="p-3.5 text-right font-mono font-extrabold text-slate-800 whitespace-nowrap">
                      {costSimResult.mepCost.toLocaleString()} 元
                    </td>
                    <td className="p-3.5 text-right font-mono text-slate-600 whitespace-nowrap">
                      {Math.round(costSimResult.mepCost / Math.max(1, simCapacityKw)).toLocaleString()} 元/kW
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-extrabold text-slate-800 whitespace-nowrap">柒、簽證與假設工程</td>
                    <td className="p-3.5 text-slate-600">
                      結構簽證 35,000 + 電機簽證 50,000 + 跑照 50,000 + 拉拔 15,000 + 埋管 65,000 + 雜項 500/kW + 保險 78,000
                    </td>
                    <td className="p-3.5 text-right font-mono font-extrabold text-slate-800 whitespace-nowrap">
                      {costSimResult.certCost.toLocaleString()} 元
                    </td>
                    <td className="p-3.5 text-right font-mono text-slate-600 whitespace-nowrap">
                      {Math.round(costSimResult.certCost / Math.max(1, simCapacityKw)).toLocaleString()} 元/kW
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="bg-indigo-50 font-black text-indigo-950 border-t-2 border-indigo-200">
                    <td className="p-4" colSpan={2}>
                      全案工程總預算合計（未稅，不含模組與變流器主機）
                    </td>
                    <td className="p-4 text-right font-mono text-lg text-indigo-700 whitespace-nowrap">
                      {costSimResult.totalUntaxed.toLocaleString()} 元
                    </td>
                    <td className="p-4 text-right font-mono text-base text-emerald-700 whitespace-nowrap">
                      {costSimResult.perKw.toLocaleString()} 元/kW
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 6: 設計歷程痛點復盤與互動式「防呆檢核表」 (Design QA/QC Checklist)
      ===================================================================== */}
      {activeTab === 'QA' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                  <ShieldAlert size={20} className="text-rose-600" />
                  設計歷程痛點復盤與新案出圖前必勾選「防呆檢核表」
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  萃取自歷史版本比對發現之 6 大重大設計變更教訓，新案出圖前逐項勾選確認可減少 80% 改圖重工
                </p>
              </div>
              <div className="px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-extrabold text-emerald-800">
                已檢核：{Object.values(checkedQaIds).filter(Boolean).length} / {QA_CHECKLIST_ITEMS.length} 項
              </div>
            </div>

            <div className="space-y-3">
              {QA_CHECKLIST_ITEMS.map((item, idx) => {
                const isChecked = Boolean(checkedQaIds[item.id]);
                return (
                  <div
                    key={item.id}
                    onClick={() => setCheckedQaIds(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                      isChecked
                        ? 'bg-emerald-50/50 border-emerald-400'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="mt-1 w-5 h-5 rounded text-emerald-600 cursor-pointer shrink-0"
                    />
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 bg-slate-800 text-white rounded text-xs font-mono font-bold">
                          檢核 {idx + 1}
                        </span>
                        <h4 className={`font-extrabold text-sm sm:text-base ${isChecked ? 'text-emerald-900 line-through' : 'text-slate-800'}`}>
                          {item.title}
                        </h4>
                      </div>
                      <div className="text-xs text-rose-800 bg-rose-50/80 border border-rose-200/80 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                        <AlertTriangle size={14} className="text-rose-600 shrink-0" />
                        <span>{item.lesson}</span>
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-slate-700 pt-0.5">
                        ✅ 出圖前確認：{item.check}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 7: FreeCAD 3D 全模型與自動化建模腳本 (BIM 3D Model & Python Script)
      ===================================================================== */}
      {activeTab === 'BIM3D' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                  <Box size={20} className="text-purple-600" />
                  FreeCAD 3D 全模型 (.FCStd / .STEP) 與 Python 自動建模腳本
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  內建 6 大 BIM 圖層群組（土建基礎與球場、主次鋼構與平台、屋面C鋼浪板母索、鋁支架與285片模組、逆變器配電箱、全場17串DC/AC線路與接地）
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {allFiles
                  .filter(f => f.folderKey === '8.FreeCAD_3D模型')
                  .map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => handleDownloadFile(f)}
                      className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Download size={14} /> 下載 {f.ext} ({formatFileSize(f.sizeBytes)})
                    </button>
                  ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { layer: '01_土建基礎與籃球場', detail: '800×700連續地梁、柱墩、8-M20錨栓、14座防撞墊、標準球場與球架' },
                { layer: '02_主次鋼構與設備平台', detail: 'SC1~7柱、SG1~6雙坡大梁+H10斜隅、E1~4繫梁、CP1~4次梁、BK1~2風拉桿、+4.5m平台與爬梯' },
                { layer: '03_屋面C鋼_浪板_母索步道', detail: '22排C150×50、0.6mm清浪板、中脊板、30cm白鐵水槽、菱形網步道、安全母索' },
                { layer: '04_鋁擠支架與285片模組', detail: '40×40側開鋁軌90支、1125只h腳座、90只屋脊L腳座、同昱550Wp模組285片' },
                { layer: '05_逆變器與機電配電盤箱', detail: 'INV-1 (110kW)、INV-2 (30kW)、DC-1/2、AC-1、監控箱、1F 3P4W附CT雙門表箱' },
                { layer: '06_全場DC串列線_AC幹線', detail: '17串DC正負極串列線、#A/#B 100×100鋁線槽、#C/#D Ø82mm RSG管、E22/E30接地銅棒' },
              ].map(g => (
                <div key={g.layer} className="p-3 bg-purple-50/50 border border-purple-200/80 rounded-xl space-y-1">
                  <div className="text-xs font-extrabold text-purple-900">{g.layer}</div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{g.detail}</p>
                </div>
              ))}
            </div>

            {freecadScript && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                    <Code size={15} className="text-indigo-600" />
                    參數化 3D BIM 建模腳本原始碼 (build_wind_rain_court_freecad.py)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(freecadScript);
                      alert('已複製 FreeCAD Python 建模腳本至剪貼簿！');
                    }}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-bold cursor-pointer"
                  >
                    複製 Python 腳本
                  </button>
                </div>
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-96 leading-relaxed">
                  {freecadScript}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 線上預覽 Modal (支援 PDF、PNG 影像、Markdown、Python 腳本) */}
      {previewFile && (
        <div
          className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="px-2 py-0.5 bg-indigo-600 rounded text-xs font-mono font-bold">
                  .{previewFile.ext}
                </span>
                <span className="font-bold text-sm truncate">{previewFile.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownloadFile(previewFile)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download size={14} /> 下載此檔案
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="p-1.5 text-slate-300 hover:text-white rounded-lg cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 overflow-auto flex items-center justify-center p-2 sm:p-4">
              {previewFile.ext === 'PDF' ? (
                <iframe
                  src={getPreviewUrl(previewFile)}
                  title={previewFile.name}
                  className="w-full h-full rounded-lg bg-white border border-slate-300"
                />
              ) : previewFile.ext === 'PNG' || previewFile.ext === 'JPG' ? (
                <img
                  src={getPreviewUrl(previewFile)}
                  alt={previewFile.name}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                />
              ) : (
                <iframe
                  src={getPreviewUrl(previewFile)}
                  title={previewFile.name}
                  className="w-full h-full rounded-lg bg-white border border-slate-300 p-4"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DesignKnowledgeBase;
