import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { SOLAR_PRODUCTS, type SolarProductSpec } from './SolarModuleSim';
import type { ProductTypeId } from '../components/SolarSite3DView';
import {
  Download,
  FolderOpen,
  Search,
  Zap,
  Box,
  Eye,
  X,
  CheckCircle2,
  Compass,
  Image as ImageIcon,
  ArrowRight,
  Sparkles,
  Upload,
  Trash2,
  Layers,
} from 'lucide-react';
import EngineeringDiscipline3DModal, {
  ENGINEERING_DISCIPLINES,
  type EngineeringDisciplineId,
  type DisciplineMeta,
} from '../components/EngineeringDiscipline3DModal';

/**
 * 9 個完全獨立的頂層知識庫分類 ID：
 * - 六大太陽能產品 (1~6)：'fish_outdoor' | 'fish_indoor' | 'sport_court' | 'roof_canopy' | 'roof_flush' | 'ground_mount'
 * - 三大工程項目 (C/S/E)：'CIVIL' | 'STEEL' | 'MEP'
 */
export type IndependentCategoryId = ProductTypeId | EngineeringDisciplineId;

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
  /** 單一獨立歸屬分類 ID（不跨產品、不跨工程分類互相關聯） */
  categoryId: IndependentCategoryId;
  isCustomUpload?: boolean;
  note?: string;
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

const isDisciplineCategory = (id: IndependentCategoryId): id is EngineeringDisciplineId =>
  id === 'CIVIL' || id === 'STEEL' || id === 'MEP';

// 九大獨立分類（六大太陽能產品 + 三大工程項目）各自專屬的設計基準規格與檢核重點
const CATEGORY_KNOWLEDGE_CONFIG: Record<
  IndependentCategoryId,
  {
    benchmarkCase: string;
    specs: { category: string; item: string; baseline: string; rule: string; color: string }[];
    keyPoints: string[];
  }
> = {
  sport_court: {
    benchmarkCase: '澎湖 A-5 嵵裡國小風雨球場 (156.75 kWp 標準設計母版)',
    specs: [
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
    ],
    keyPoints: [
      '雙柱無中柱 22m 大跨距設計，柱頂簷高 +7.0m 確保籃球拋物線淨空，柱身須包覆 2m 高防撞護墊（14座）。',
      '屋脊中脊板為平板，鋁支架分料時屋脊第一排（90只）務必由 h 型腳座改為 L 型腳座。',
      '設備平台（軸5 / A~B 柱間 +4.5m）集中掛載變流器與配電盤，標準內建 RH150×75 雙斜撐 BR1 補強。',
    ],
  },
  fish_outdoor: {
    benchmarkCase: '魚電共生室外型（戶外魚塭大跨距高抗風棚架獨立專區）',
    specs: [
      {
        category: '空間幾何',
        item: '滴水高度 / 跨距配置',
        baseline: '滴水高度 ≥ 4.5m / 單斜傾角 10°',
        rule: '預留抓魚吊車、飼料車與清淤怪手動線淨高；池中落柱需配合土堤或預鑄基樁配置',
        color: 'bg-sky-50 text-sky-800 border-sky-200',
      },
      {
        category: '防蝕與結構',
        item: '表面處理 / 耐風等級',
        baseline: '熱浸鍍鋅 ≥ 100μm (HDG) / 沿海地況 C 高抗風',
        rule: '沿海高鹽害養殖區，全構件採熱浸鍍鋅（含 C 型鋼與螺栓扣件 SUS304/316），嚴禁現場切割未補鋅',
        color: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      },
      {
        category: '遮蔽率法規',
        item: '農業容許遮蔽率檢核',
        baseline: '遮蔽率 ≤ 40%（依漁業署水產養殖容許規範）',
        rule: '模配圖必須標示魚塭土地面積、水體面積與模組垂直投影面積計算式',
        color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      },
    ],
    keyPoints: [
      '此為「1. 魚電共生室外型」獨立圖說與母版專區，可點擊右上角「上傳此分類圖說母版」新增專屬範例檔。',
      '戶外魚塭務必確認清淤重機具進出通道、水車電力迴路與 40% 遮蔽率法規上限。',
    ],
  },
  fish_indoor: {
    benchmarkCase: '魚電共生室內型（雙斜山形溫室 / 室內養殖棚獨立專區）',
    specs: [
      {
        category: '空間幾何',
        item: '結構型式 / 滴水高度',
        baseline: '雙斜山形鋼構棚架 / 滴水高度 4.0m ~ 4.5m / 傾角 12°',
        rule: '雙斜山形 RH 型鋼主構架 + 防蝕屋面浪板 + 鋁擠支架系統',
        color: 'bg-teal-50 text-teal-800 border-teal-200',
      },
      {
        category: '屋面與採光',
        item: '浪板與採光帶配置',
        baseline: '盛餘/燁輝耐蝕浪板 + PC 透明採光浪板交錯配置',
        rule: '依養殖物種（白蝦、石斑、文蛤育苗）光照需求留設屋脊通風器（太子樓）與採光帶',
        color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      },
    ],
    keyPoints: [
      '此為「2. 魚電共生室內型」獨立圖說與母版專區，可點擊右上角「上傳此分類圖說母版」新增專屬範例檔。',
    ],
  },
  roof_canopy: {
    benchmarkCase: '屋頂棚架型（RC 平屋頂增設高架鋼構棚架獨立專區）',
    specs: [
      {
        category: '空間幾何',
        item: '棚架高度 / 屋面傾角',
        baseline: '滴水高度 2.8m ~ 3.0m（最高點 ≤ 4.5m 免雜照標準）/ 傾角 10°',
        rule: '配合建築技術規則免請領雜項執照高度上限（4.5m 或 9.0m），下方保留屋頂防水層檢修空間',
        color: 'bg-slate-100 text-slate-800 border-slate-300',
      },
      {
        category: '柱底生根',
        item: 'RC 屋頂植筋與防水墩',
        baseline: '化學錨栓植筋入 RC 梁柱 + 30cm 高防水混凝土柱墩',
        rule: '柱位必須對齊原建物 RC 柱或大梁中心線，嚴禁直接落於薄樓板中央；植筋處施作三層複合防水包覆',
        color: 'bg-amber-50 text-amber-800 border-amber-200',
      },
    ],
    keyPoints: [
      '此為「4. 屋頂棚架型」獨立圖說與母版專區，可點擊右上角「上傳此分類圖說母版」新增專屬範例檔。',
      '柱位排佈務必套疊原建物「結構梁柱平面圖」，確保每一支鋼柱皆落於既有 RC 柱頭或主梁上。',
    ],
  },
  roof_flush: {
    benchmarkCase: '屋頂平鋪型（斜屋頂 / 廠房鐵皮浪板沿屋面平鋪獨立專區）',
    specs: [
      {
        category: '屋面支架',
        item: '40×40 側開鋁擠支架 + h/L 腳座',
        baseline: '軌道貼合屋面（高約 15~20cm）/ 依既有屋面坡度 (5°~20°)',
        rule: '浪板波峰採 h 型腳座、屋脊中脊平板處採 L 型腳座 + EPDM 防水橡膠墊片',
        color: 'bg-amber-50 text-amber-800 border-amber-200',
      },
      {
        category: '維運安全',
        item: '爬梯、安全母索與維修步道',
        baseline: '護籠爬梯 + 四周 1m 高角鐵安全母索 + 菱形網維修步道',
        rule: '留設模組區間至少 50~60cm 寬清潔檢修走道，避免踩踏模組造成隱裂',
        color: 'bg-blue-50 text-blue-800 border-blue-200',
      },
    ],
    keyPoints: [
      '此為「5. 屋頂平鋪型」獨立圖說與母版專區，可點擊右上角「上傳此分類圖說母版」新增專屬範例檔。',
    ],
  },
  ground_mount: {
    benchmarkCase: '地面型（地面支架陣列 / 雙柱立地支架系統獨立專區）',
    specs: [
      {
        category: '陣列排佈',
        item: '支架傾角 / 前後排遮陰間距',
        baseline: '前緣離地高 ≥ 1.2m / 最佳傾角 15°~20° / 冬至日 9:00~15:00 無遮陰',
        rule: '前後排間距 D ≥ H × cot(太陽高度角) × cos(方位角)，一般留設 1.8m ~ 2.5m 列間距兼除草動線',
        color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      },
      {
        category: '基礎型式',
        item: 'PC 預鑄樁 / 螺旋樁 / RC 獨立基墩',
        baseline: '依地質鑽探與拉拔試驗（拉拔力 ≥ 1.5~2.5 tf）選用',
        rule: '出圖前須完成現場拉拔試驗，確認植入深度與抗傾覆安全係數 ≥ 1.5',
        color: 'bg-amber-50 text-amber-800 border-amber-200',
      },
    ],
    keyPoints: [
      '此為「6. 地面型」獨立圖說與母版專區，可點擊右上角「上傳此分類圖說母版」新增專屬範例檔。',
    ],
  },
  CIVIL: {
    benchmarkCase: '🧱 土木與基礎工程（基礎鋼筋綁紮示意圖 F1 標準母版與由下而上 3D 施工工序演示）',
    specs: [
      {
        category: '基礎底版 (GL-1300)',
        item: '2000×2000×300mm RC 底版 + 上下兩層獨立 #4@15 鋼筋地網',
        baseline: 'GL+0 為地面位置；總開挖深度 GL-1300mm（100mm PC 打底 + 300mm RC 底版，保護層 50mm）',
        rule: '1900×1900mm 範圍配置「下層 + 上層」兩層獨立 #4@15cm 直筋地網（一根一根十字交疊以鐵絲綁紮，上下兩層分離不互連）',
        color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      },
      {
        category: '柱墩鋼筋籠 (700×700)',
        item: '#6主筋16支 + #4箍筋5支(雙135°鉤) + #3耐震繫筋30支(135°/90°鉤)',
        baseline: '柱墩高 700mm (GL-200 ~ GL-900)，保護層 50mm (箍筋外框 600×600mm)',
        rule: '垂直主筋 16 支 #6 落地 L 鉤錨定於下層網；水平箍筋 5 支 #4 (4@150=600，角隅雙 135° 耐震彎鉤)；每層 6 支雙向 #3 繫筋嚴格採「一端 135° 斜鉤、另一端 90° 直角鉤」包住主筋（5層×6支 = 共 30 支）',
        color: 'bg-amber-50 text-amber-800 border-amber-200',
      },
      {
        category: '基礎螺栓與柱底板',
        item: 'A.B 8-M25 (L=600) + PL-19×500×500 + 5cm無收縮水泥 + GL+0回填',
        baseline: '柱墩頂 GL-200 + 5cm 無收縮水泥土 + PL-19×500×500 + PL12 加勁板 + RH300×300×10×15 穿出 GL+0 地面',
        rule: '8 支 M25 基礎螺栓 (L=600mm) 預埋於柱墩鋼筋籠內，安裝鋼柱後回填夯實至 GL+0 地面位置',
        color: 'bg-stone-100 text-stone-800 border-stone-300',
      },
    ],
    keyPoints: [
      '已匯入《基礎鋼筋綁紮示意圖.pdf (F1)》至本土木工程知識庫，同仁可直接線上預覽或下載。',
      '點擊右側「啟動【土木與基礎工程】3D 結構與工序互動演示」可一鍵播放 Step 1 ~ Step 7 由下而上基礎施工動畫（GL-1300 開挖打底 → 下層+上層雙層 #4@15 鋼筋地網 → 柱墩鋼筋籠 → 預埋螺栓與底版 RC → 柱墩 RC → 無收縮水泥與立鋼柱 → 回填至 GL+0 地面完工）。',
    ],
  },
  STEEL: {
    benchmarkCase: '🏗️ 鋼構與支架工程（獨立專業圖說母版與 3D 構件演示專區）',
    specs: [
      {
        category: '主次鋼構系統',
        item: '主柱 SC / 雙坡大梁 SG / 斜隅加腋 H10',
        baseline: 'SC (RH300×300) + SG (RH400×200) + 梁柱斜隅加腋 Haunch H10',
        rule: '屋脊中央以 PL19×380×682 端板與 24-M20 高張力螺栓對接；屋面設 Ø16 交叉風拉桿 BK1/BK2',
        color: 'bg-blue-50 text-blue-800 border-blue-200',
      },
      {
        category: '屋面與鋁支架',
        item: 'C150×50 檁條 + 浪板 h 腳座 / 屋脊 L 腳座',
        baseline: '一般浪板波峰採 h 型腳座｜屋脊中脊平板處必換 L 型腳座',
        rule: '腳座底部鋪設 EPDM 防水橡膠墊片 + M8 六角鑽尾自攻釘，40×40 側開鋁軌 6 點上壓',
        color: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      },
      {
        category: '平台與維運安全',
        item: '+4.5m 設備平台 / 護籠爬梯 / 走道 / 四周母索',
        baseline: 'RH150×75 平台 + BR1 雙斜撐｜G 軸山牆爬梯 + L 型走道 + 四周 1m 母索立柱',
        rule: '屋面四邊每 2.5m 設 1.0m 高角鐵母索立柱（附 50cm 內向斜撐）與雙層不鏽鋼母索',
        color: 'bg-amber-50 text-amber-800 border-amber-200',
      },
    ],
    keyPoints: [
      '此為「🏗️ 鋼構與支架工程」獨立專區（與六大產品、土木、機電完全分離），專供上傳與下載 Tekla 拆料總圖、一次/二次/板加工圖、鋁支架分料單與母索走道母版。',
      '點擊右側「啟動【鋼構工程】3D 構件與腳座演示」可互動檢視 H10 斜隅加腋、+4.5m 平台斜撐、屋脊 L 腳座 vs 浪板 h 腳座及四周母索圍籬。',
    ],
  },
  MEP: {
    benchmarkCase: '⚡ 機電與台電併網工程（獨立專業圖說母版與 3D 管槽演示專區）',
    specs: [
      {
        category: '串併與遮陰分離',
        item: '無遮陰主串 vs 遮陰區獨立短串 MPPT',
        baseline: '主串 16~18 串｜受周邊建物遮陰區獨立 11~12 短串接入專用 MPPT',
        rule: '嚴禁將遮陰短串與高日照長串並聯，確保整組變流器 MPPT 追蹤效率',
        color: 'bg-purple-50 text-purple-800 border-purple-200',
      },
      {
        category: '線槽填充率檢討',
        item: '#A DC 主幹鋁線槽 / #B AC 分路鋁線槽',
        baseline: '100 × 100 mm 鋁線槽（填充率必須 < 20% 法規上限）',
        rule: '#A 容納 34 條 PV 4.0mm² + E22 (填充率 15.96%)；#B 容納 XLPE 100mm²×4 + 14mm²×4 (填充率 12.66%)',
        color: 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200',
      },
      {
        category: '電表箱與幹線接地',
        item: '3Φ4W 附 CT 雙門電表箱 + #C/#D 幹線管',
        baseline: 'SUS304 2.0t (寬 1350 × 高 2150 × 深 500 mm) + Ø82mm RSG 管 × 2 管',
        rule: '表箱離地 1.5~1.8m、內門淨寬 ≥ 55cm；設備接地 E22 (R<10Ω)、系統接地 E30 (R<50Ω)',
        color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      },
    ],
    keyPoints: [
      '此為「⚡ 機電與台電併網工程」獨立專區（與六大產品、土木、鋼構完全分離），專供上傳與下載台電送審圖、單線圖、串併線槽檢討表與附 CT 電表箱母版。',
      '點擊右側「啟動【機電工程】3D 線槽與併網演示」可互動檢視屋脊 #A 線槽、平台變流器盤群、#C/#D 下地 RSG 金屬管與 1F 3Φ4W 附 CT 雙門電表箱。',
    ],
  },
};

const DesignKnowledgeBase: React.FC = () => {
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [folders, setFolders] = useState<KnowledgeFolder[]>([]);
  const [allFiles, setAllFiles] = useState<KnowledgeFileItem[]>([]);

  // 單一獨立選中分類 ID（六大產品 1~6 或 三大工程項目 CIVIL / STEEL / MEP，彼此完全獨立不混聯）
  const initialParam = (searchParams.get('product') as IndependentCategoryId) || 'sport_court';
  const [selectedCategoryId, setSelectedCategoryId] = useState<IndependentCategoryId>(
    SOLAR_PRODUCTS.some(p => p.id === initialParam) || isDisciplineCategory(initialParam)
      ? initialParam
      : 'sport_court'
  );

  const [showSixProductsDiagramModal, setShowSixProductsDiagramModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'FILES' | 'SPECS'>('FILES');

  // Filter states within the selected independent category
  const [selectedFolderKey, setSelectedFolderKey] = useState<string>('ALL');
  const [selectedFileExt, setSelectedFileExt] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 工程項目 (土木 / 鋼構 / 機電) 3D 互動演示 Modal state
  const [discipline3DModalTarget, setDiscipline3DModalTarget] = useState<EngineeringDisciplineId | null>(null);

  // 上傳圖說母版 Modal state (單選歸屬至某一個獨立分類)
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadCategoryId, setUploadCategoryId] = useState<IndependentCategoryId>('CIVIL');
  const [uploadFolderKey, setUploadFolderKey] = useState<string>('1.預算書及模配圖');
  const [uploadSubFolder, setUploadSubFolder] = useState<string>('');
  const [uploadNote, setUploadNote] = useState<string>('');
  const [uploadFileObj, setUploadFileObj] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  // Preview Modal state
  const [previewFile, setPreviewFile] = useState<KnowledgeFileItem | null>(null);

  // 判斷當前選中的是「六大產品之一」還是「三大工程項目之一」
  const isCurrentDiscipline = isDisciplineCategory(selectedCategoryId);
  const currentProductSpec: SolarProductSpec | null = useMemo(
    () => (!isCurrentDiscipline ? SOLAR_PRODUCTS.find(p => p.id === selectedCategoryId) || null : null),
    [selectedCategoryId, isCurrentDiscipline]
  );
  const currentDisciplineMeta: DisciplineMeta | null = useMemo(
    () => (isCurrentDiscipline ? ENGINEERING_DISCIPLINES.find(d => d.id === selectedCategoryId) || null : null),
    [selectedCategoryId, isCurrentDiscipline]
  );

  const currentCategoryTitle = useMemo(() => {
    if (currentProductSpec) return `${currentProductSpec.code}. ${currentProductSpec.name}`;
    if (currentDisciplineMeta) return `${currentDisciplineMeta.code} 類｜${currentDisciplineMeta.name}`;
    return '3. 風雨球場';
  }, [currentProductSpec, currentDisciplineMeta]);

  const currentCategoryShortName = useMemo(() => {
    if (currentProductSpec) return currentProductSpec.name;
    if (currentDisciplineMeta) return currentDisciplineMeta.name;
    return '風雨球場';
  }, [currentProductSpec, currentDisciplineMeta]);

  const currentCategoryKb = useMemo(
    () => CATEGORY_KNOWLEDGE_CONFIG[selectedCategoryId] || CATEGORY_KNOWLEDGE_CONFIG.sport_court,
    [selectedCategoryId]
  );

  const fetchKb = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/knowledge-base', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFolders(res.data.folders || []);
      setAllFiles(res.data.allFiles || []);
    } catch (err) {
      console.error('Failed to load design knowledge base:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchKb();
  }, [token]);

  const getDefaultFolderForCategory = (catId: IndependentCategoryId) => {
    if (catId === 'CIVIL') return '1.預算書及模配圖';
    if (catId === 'STEEL') return '5.拆料圖及組裝圖';
    if (catId === 'MEP') return '3.台電送審圖及施工圖';
    return '1.預算書及模配圖';
  };

  const handleOpenUploadForCategory = (catId: IndependentCategoryId) => {
    setUploadCategoryId(catId);
    setUploadFolderKey(getDefaultFolderForCategory(catId));
    setUploadFileObj(null);
    setUploadNote('');
    setShowUploadModal(true);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFileObj) {
      alert('請先選擇要上傳的圖說或母版檔案');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFileObj);
      formData.append('categoryId', uploadCategoryId);
      formData.append('folderKey', uploadFolderKey);
      formData.append('subFolder', uploadSubFolder);
      formData.append('note', uploadNote);

      await axios.post('/api/knowledge-base/upload', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      setShowUploadModal(false);
      setSelectedCategoryId(uploadCategoryId);
      setSelectedFolderKey('ALL');
      setActiveTab('FILES');
      await fetchKb();
    } catch (err: any) {
      alert(err?.response?.data?.error || '上傳失敗，請稍後再試');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteCustomFile = async (file: KnowledgeFileItem) => {
    if (!window.confirm(`確定要刪除自訂上傳的母版檔案「${file.name}」嗎？`)) return;
    try {
      await axios.delete(`/api/knowledge-base/upload/${encodeURIComponent(file.id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchKb();
    } catch (err: any) {
      alert(err?.response?.data?.error || '刪除失敗');
    }
  };

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

  // 統計 9 個獨立分類（六大產品 + 三大工程項目）各自擁有的專屬檔案數量（彼此完全獨立不共用）
  const categoryFileCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    SOLAR_PRODUCTS.forEach(p => {
      counts[p.id] = 0;
    });
    ENGINEERING_DISCIPLINES.forEach(d => {
      counts[d.id] = 0;
    });
    allFiles.forEach(f => {
      if (f.categoryId && counts[f.categoryId] !== undefined) {
        counts[f.categoryId]++;
      }
    });
    return counts;
  }, [allFiles]);

  // 嚴格僅顯示目前選中那 1 個獨立分類的專屬檔案
  const categoryScopedFiles = useMemo(() => {
    return allFiles.filter(f => f.categoryId === selectedCategoryId);
  }, [allFiles, selectedCategoryId]);

  const filteredFiles = useMemo(() => {
    return categoryScopedFiles.filter(f => {
      if (selectedFolderKey !== 'ALL' && f.folderKey !== selectedFolderKey) return false;
      if (selectedFileExt !== 'ALL' && f.ext !== selectedFileExt) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        return (
          f.name.toLowerCase().includes(q) ||
          f.folderKey.toLowerCase().includes(q) ||
          f.subFolder.toLowerCase().includes(q) ||
          f.typeCategory.toLowerCase().includes(q) ||
          (f.note && f.note.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [categoryScopedFiles, selectedFolderKey, selectedFileExt, searchQuery]);

  const extCounts = useMemo(() => {
    const map: Record<string, number> = {};
    categoryScopedFiles.forEach(f => {
      map[f.ext] = (map[f.ext] || 0) + 1;
    });
    return map;
  }, [categoryScopedFiles]);

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

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          <p className="text-slate-500 text-sm font-bold">載入設計知識庫與 3D 模擬中心...</p>
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
                <Sparkles size={13} /> 設計知識庫 × 3D 設計模擬器（六大產品 & 三大工程項目獨立專區）
              </span>
              <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 rounded-full text-xs font-bold text-emerald-200">
                目前檢視：【{currentCategoryTitle}】（專屬檔案 {categoryScopedFiles.length} 份）
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              設計知識庫與 3D 模擬器 — 獨立分類圖說母版中心
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              下方分為<strong>「六大太陽能系統產品（1~6）」</strong>與<strong>「三大工程專業項目（🧱 土木、🏗️ 鋼構、⚡ 機電）」</strong>共 9 個<strong>完全獨立的分類專區</strong>（各分類檔案彼此獨立不混用）。點擊任一分類即可檢視與下載該分類專屬母版圖檔，或啟動對應的 <strong>3D 模擬 / 3D 工程演示</strong>。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => handleOpenUploadForCategory(selectedCategoryId)}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-lg shadow-emerald-950/30 transition-all cursor-pointer"
            >
              <Upload size={16} /> 上傳【{currentCategoryShortName}】圖說母版
            </button>
            <button
              type="button"
              onClick={() => setShowSixProductsDiagramModal(true)}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <ImageIcon size={16} className="text-sky-300" /> 六大產品示意圖
            </button>
            {isCurrentDiscipline ? (
              <button
                type="button"
                onClick={() => setDiscipline3DModalTarget(selectedCategoryId as EngineeringDisciplineId)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-lg shadow-orange-900/30 transition-all cursor-pointer"
              >
                <Box size={16} /> 啟動【{currentCategoryShortName}】3D 互動演示 ➔
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate(`/simulators/solar?product=${selectedCategoryId}`)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-lg shadow-orange-900/30 transition-all cursor-pointer"
              >
                <Zap size={16} fill="currentColor" /> 啟動【{currentCategoryShortName}】3D 排佈模擬器 ➔
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================================
          第一區：六大太陽能系統產品（1~6 各產品完全獨立，檔案互不關聯）
      ===================================================================== */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-800 flex items-center gap-2">
              <Box size={20} className="text-indigo-600" />
              一、六大太陽能系統產品分類（各產品檔案完全獨立）
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              點擊任一產品卡片切換至該產品的獨立圖說檔案庫，或點擊「3D 模擬」開啟該產品之 3D 案場排佈模擬器
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {SOLAR_PRODUCTS.map(prod => {
            const isSelected = selectedCategoryId === prod.id;
            const fileCount = categoryFileCounts[prod.id] || 0;

            return (
              <div
                key={prod.id}
                onClick={() => {
                  setSelectedCategoryId(prod.id);
                  setSelectedFolderKey('ALL');
                }}
                className={`rounded-xl border-2 p-3.5 transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden group ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20 shadow-md -translate-y-0.5'
                    : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50/80'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black text-white bg-gradient-to-br ${prod.badgeColor} shadow-2xs`}
                    >
                      {prod.code}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                        fileCount > 0
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      專屬檔案 ({fileCount})
                    </span>
                  </div>

                  <h3 className="font-extrabold text-sm sm:text-base text-slate-800 group-hover:text-indigo-700 transition-colors">
                    {prod.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{prod.subtitle}</p>

                  <div className="mt-2.5 pt-2 border-t border-slate-200/70 text-[11px] text-slate-600 space-y-0.5">
                    <div className="truncate">
                      <strong className="text-slate-700">應用：</strong>{prod.application}
                    </div>
                    <div className="truncate">
                      <strong className="text-slate-700">預設：</strong>滴水 {prod.defaultDripHeight}m / 傾角 {prod.defaultTiltAngle}°
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between gap-1">
                  <span className="text-[11px] font-extrabold text-indigo-700">
                    {isSelected ? '● 目前檢視中' : '切換至此產品'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handleOpenUploadForCategory(prod.id);
                      }}
                      className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md transition-colors cursor-pointer"
                      title={`上傳 ${prod.name} 專屬檔案`}
                    >
                      <Upload size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        navigate(`/simulators/solar?product=${prod.id}`);
                      }}
                      className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[10px] font-extrabold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                      title={`開啟 ${prod.name} 3D 排佈模擬器`}
                    >
                      <Zap size={11} /> 3D 模擬
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          第二區：三大工程專業項目分類（🧱 土木、🏗️ 鋼構、⚡ 機電 — 與六大產品完全分離獨立）
      ===================================================================== */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-800 flex items-center gap-2">
              <Layers size={20} className="text-indigo-600" />
              二、三大工程專業項目獨立分類（土木工程 × 鋼構工程 × 機電工程）
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              此三類與上方六大產品完全分開獨立。點擊卡片即可切換檢視您上傳至「土木」、「鋼構」或「機電」的專屬圖說母版，或開啟 3D 工程演示
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ENGINEERING_DISCIPLINES.map(disc => {
            const isSelected = selectedCategoryId === disc.id;
            const count = categoryFileCounts[disc.id] || 0;
            const iconEmoji = disc.id === 'CIVIL' ? '🧱' : disc.id === 'STEEL' ? '🏗️' : '⚡';

            return (
              <div
                key={disc.id}
                onClick={() => {
                  setSelectedCategoryId(disc.id);
                  setSelectedFolderKey('ALL');
                }}
                className={`rounded-xl border-2 p-4 transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20 shadow-md -translate-y-0.5'
                    : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50/70'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-black text-white bg-gradient-to-r ${disc.badgeColor} shadow-2xs`}
                    >
                      {iconEmoji} {disc.code} 類｜{disc.name}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                        count > 0
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      專屬檔案 ({count})
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{disc.summary}</p>

                  <div className="pt-1 flex flex-wrap gap-1.5">
                    {disc.checkpoints.map((cp, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-bold truncate max-w-full"
                      >
                        • {cp.title.replace(/^\d+\.\s*/, '')}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-3.5 pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-indigo-700">
                    {isSelected ? '● 目前檢視中' : '切換至此工程分類'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handleOpenUploadForCategory(disc.id);
                      }}
                      className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-extrabold flex items-center gap-1 transition-colors cursor-pointer"
                      title={`上傳 ${disc.name} 專屬圖說或母版`}
                    >
                      <Upload size={12} /> 上傳母版
                    </button>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setDiscipline3DModalTarget(disc.id);
                      }}
                      className={`px-3 py-1.5 bg-gradient-to-r ${disc.badgeColor} hover:opacity-90 text-white rounded-lg text-xs font-extrabold flex items-center gap-1 shadow-sm transition-all cursor-pointer`}
                      title={`開啟 ${disc.name} 3D 結構與工序互動演示`}
                    >
                      <Box size={13} /> 3D 演示
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 當前選中分類的設計重點提示與快捷操作列 */}
      <div className="p-4 bg-gradient-to-r from-indigo-50/90 via-blue-50/60 to-slate-50 border border-indigo-200/80 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1.5 flex-1 min-w-[260px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 bg-indigo-600 text-white rounded-md text-xs font-extrabold">
              目前獨立分類：{currentCategoryTitle}
            </span>
            <span className="text-xs font-extrabold text-slate-800">
              {currentCategoryKb.benchmarkCase}
            </span>
          </div>
          <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
            {currentCategoryKb.keyPoints.map((pt, i) => (
              <li key={i}>{pt}</li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleOpenUploadForCategory(selectedCategoryId)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Upload size={14} /> 上傳【{currentCategoryShortName}】專屬圖說母版
          </button>
          {isCurrentDiscipline ? (
            <button
              type="button"
              onClick={() => setDiscipline3DModalTarget(selectedCategoryId as EngineeringDisciplineId)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Box size={14} /> 啟動【{currentCategoryShortName}】3D 結構與工序互動演示 ➔
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate(`/simulators/solar?product=${selectedCategoryId}`)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Zap size={14} /> 進入【{currentCategoryShortName}】3D 案場與模組排佈模擬 ➔
            </button>
          )}
        </div>
      </div>

      {/* 知識庫子分頁導覽列 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 flex gap-1.5 overflow-x-auto">
        {[
          { id: 'FILES', label: `📂 【${currentCategoryShortName}】專屬檔案下載 (${categoryScopedFiles.length})`, icon: FolderOpen },
          { id: 'SPECS', label: `📐 【${currentCategoryShortName}】基準規格與 SOP`, icon: Compass },
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
          TAB 1: 當前獨立分類之專屬檔案下載中心
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
                  placeholder={`在【${currentCategoryShortName}】專屬檔案中搜尋...`}
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
                  全部格式 ({categoryScopedFiles.length})
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

            {/* 資料夾階段快速切換按鈕（僅在檢視「六大產品」時顯示；三大工程項目直接歸類為知識庫不分階段） */}
            {!isCurrentDiscipline && (
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
                  顯示全部階段 ({categoryScopedFiles.length})
                </button>
                {folders.map(fd => {
                  const countInCat = categoryScopedFiles.filter(f => f.folderKey === fd.key).length;
                  return (
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
                      {fd.key} ({countInCat})
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 若該獨立分類尚無任何檔案時的空狀態引導 */}
          {categoryScopedFiles.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
                <FolderOpen size={28} />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-800">
                  【{currentCategoryTitle}】知識庫目前尚無上傳之圖說或母版檔案
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  請點擊下方按鈕直接上傳【{currentCategoryShortName}】圖說或母版檔案，上傳後將直接歸類於此知識庫供同仁預覽與下載。
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => handleOpenUploadForCategory(selectedCategoryId)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <Upload size={16} /> 直接上傳【{currentCategoryShortName}】知識庫檔案
                </button>
                {isCurrentDiscipline ? (
                  <button
                    type="button"
                    onClick={() => setDiscipline3DModalTarget(selectedCategoryId as EngineeringDisciplineId)}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Box size={16} /> 開啟【{currentCategoryShortName}】3D 互動演示
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate(`/simulators/solar?product=${selectedCategoryId}`)}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Zap size={16} /> 開啟【{currentCategoryShortName}】3D 排佈模擬器
                  </button>
                )}
              </div>
            </div>
          ) : isCurrentDiscipline ? (
            /* 三大工程項目（土木 / 鋼構 / 機電）：不用再分階段資料夾，直接歸類為該工程知識庫清單 */
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-indigo-50/30 to-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-indigo-600 text-white rounded-md text-xs font-extrabold">
                      工程知識庫
                    </span>
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-800">
                      【{currentCategoryTitle}】知識庫圖說與母版清單
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{currentCategoryKb.benchmarkCase}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    共 {filteredFiles.length} 個知識庫檔案
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenUploadForCategory(selectedCategoryId)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                  >
                    <Upload size={13} /> 直接上傳檔案
                  </button>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {filteredFiles.map(file => (
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
                          <span className="font-bold text-sm text-slate-800 break-all" title={file.name}>
                            {file.name}
                          </span>
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[10px] font-extrabold">
                            {currentCategoryShortName} 知識庫
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-0.5">
                          <span>類型：{file.typeCategory}</span>
                          <span>大小：{formatFileSize(file.sizeBytes)}</span>
                          {file.note && <span className="text-indigo-600 font-semibold">說明：{file.note}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {file.isCustomUpload && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomFile(file)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                          title="刪除此檔案"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
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
                        <Download size={14} /> 下載檔案
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* 六大產品：依資料夾分組顯示該獨立產品之檔案 */
            <div className="space-y-5">
              {folders
                .filter(fd => selectedFolderKey === 'ALL' || fd.key === selectedFolderKey)
                .map(fd => {
                  const folderFilteredFiles = filteredFiles.filter(f => f.folderKey === fd.key);
                  if (folderFilteredFiles.length === 0 && !(selectedCategoryId === 'sport_court' && fd.key === '2.客戶資料')) {
                    return null;
                  }

                  return (
                    <div
                      key={fd.key}
                      className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
                    >
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
                            共 {folderFilteredFiles.length} 個專屬檔
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
                                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[10px] font-extrabold">
                                      {currentCategoryShortName} 專屬
                                    </span>
                                    {file.isCustomUpload && (
                                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-[10px] font-extrabold">
                                        ★ 自訂上傳母版
                                      </span>
                                    )}
                                    {file.subFolder && (
                                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px] font-bold">
                                        子目錄：{file.subFolder}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-0.5">
                                    <span>類型：{file.typeCategory}</span>
                                    <span>大小：{formatFileSize(file.sizeBytes)}</span>
                                    {file.note && (
                                      <span className="text-indigo-600 font-semibold">備註：{file.note}</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {file.isCustomUpload && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCustomFile(file)}
                                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                                    title="刪除此自訂上傳檔案"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                )}
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
                                  <Download size={14} /> 下載檔案
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
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 2: 基準規格與標準設計作業流程 (依當前選擇之獨立分類切換)
      ===================================================================== */}
      {activeTab === 'SPECS' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 space-y-4">
            <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
              <Compass size={20} className="text-indigo-600" />
              標準設計作業流程與圖件交付物 (SOP & Deliverables)
            </h3>
            <p className="text-xs text-slate-500">
              點擊任一階段可直接跳轉至「專屬檔案下載中心」對應階段資料夾。
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-2">
              {[
                { step: 'STEP 1', title: '現場收方與套圖', folder: '1.預算書及模配圖', desc: '確認場域邊界、既有設施、周邊建物遮陰樓高與地下管溝位置（收方及柱位圖）' },
                { step: 'STEP 2', title: '模配與預算試算', folder: '1.預算書及模配圖', desc: '套疊地籍圖、排佈模組、留設檢修步道與參數化預算母版' },
                { step: 'STEP 3', title: '業主簽確與結構簽證', folder: '4.結構簽證圖', desc: '先出業主/校方簽確圖確認跨距與高程，再出Midas計算書與簽證圖' },
                { step: 'STEP 4', title: 'Tekla拆料與製造圖', folder: '5.拆料圖及組裝圖', desc: '鋼構拆料總圖、設備平台補強、一二次/板加工圖與鋁支架分料單' },
                { step: 'STEP 5', title: '台電送審與機電施工圖', folder: '3.台電送審圖及施工圖', desc: '串併遮陰分離、線槽填充率檢討表與 3P4W 附 CT 電表箱圖' },
                { step: 'STEP 6', title: '竣工報告與掛錶結案', folder: '6.竣工報告書定稿參考', desc: '彙整31.結構計算書、32.台電審訖圖、33.竣工照及掛錶紀錄' },
              ].map(s => (
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

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-extrabold text-slate-800">
                【{currentCategoryTitle}】設計基準規格速查表 — {currentCategoryKb.benchmarkCase}
              </h3>
              {isCurrentDiscipline ? (
                <button
                  type="button"
                  onClick={() => setDiscipline3DModalTarget(selectedCategoryId as EngineeringDisciplineId)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  <Box size={13} /> 開啟此工程分類 3D 互動演示
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate(`/simulators/solar?product=${selectedCategoryId}`)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  <Zap size={13} /> 開啟此產品 3D 模擬器
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-max min-w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-extrabold">
                    <th className="p-3.5 whitespace-nowrap">類別</th>
                    <th className="p-3.5 whitespace-nowrap">項目</th>
                    <th className="p-3.5 whitespace-nowrap">基準數值 / 規格</th>
                    <th className="p-3.5 min-w-[320px]">模板化設計原則 / 備註</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {currentCategoryKb.specs.map((row, idx) => (
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

      {/* 三大工程專業項目 (土木 / 鋼構 / 機電) 3D 結構與工序互動演示 Modal */}
      {discipline3DModalTarget && (
        <EngineeringDiscipline3DModal
          initialDiscipline={discipline3DModalTarget}
          onClose={() => setDiscipline3DModalTarget(null)}
          onOpenUploadModal={disc => handleOpenUploadForCategory(disc)}
          onFilterFilesByDiscipline={disc => {
            setSelectedCategoryId(disc);
            setSelectedFolderKey('ALL');
            setActiveTab('FILES');
          }}
        />
      )}

      {/* 上傳圖說與母版 Modal（單選一個獨立分類：六大產品之一 或 土木/鋼構/機電之一） */}
      {showUploadModal && (
        <div
          className="fixed inset-0 z-[210] bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowUploadModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload size={18} className="text-emerald-400" />
                <h3 className="font-black text-base">上傳專屬圖說與設計母版（獨立分類歸檔）</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-5 space-y-4 text-xs sm:text-sm">
              {/* 1. 單選要歸屬的獨立分類（三大工程項目 或 六大太陽能產品） */}
              <div className="space-y-2.5">
                <label className="block font-extrabold text-slate-700">
                  1. 選擇要歸屬的獨立分類（單選，各分類檔案彼此獨立不混用） <span className="text-rose-500">*</span>
                </label>

                <div className="text-xs font-bold text-slate-500">A. 三大工程專業項目：</div>
                <div className="grid grid-cols-3 gap-2">
                  {ENGINEERING_DISCIPLINES.map(d => {
                    const active = uploadCategoryId === d.id;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => {
                          setUploadCategoryId(d.id);
                          setUploadFolderKey(getDefaultFolderForCategory(d.id));
                        }}
                        className={`p-2.5 rounded-xl border-2 font-extrabold text-center transition-all cursor-pointer ${
                          active
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-2xs'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {d.id === 'CIVIL' ? '🧱 土木工程' : d.id === 'STEEL' ? '🏗️ 鋼構工程' : '⚡ 機電工程'}
                      </button>
                    );
                  })}
                </div>

                <div className="text-xs font-bold text-slate-500 pt-1">B. 六大太陽能系統產品：</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SOLAR_PRODUCTS.map(prod => {
                    const active = uploadCategoryId === prod.id;
                    return (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => {
                          setUploadCategoryId(prod.id);
                          setUploadFolderKey('1.預算書及模配圖');
                        }}
                        className={`p-2 rounded-xl border-2 font-extrabold text-xs text-center transition-all cursor-pointer ${
                          active
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-2xs'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {prod.code}. {prod.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. 歸檔設計階段資料夾（僅在選擇「六大產品」時顯示；三大工程不用分類直接歸入知識庫） */}
              {!isDisciplineCategory(uploadCategoryId) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-extrabold text-slate-700 mb-1">
                      2. 歸檔設計階段資料夾
                    </label>
                    <select
                      value={uploadFolderKey}
                      onChange={e => setUploadFolderKey(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {folders.map(f => (
                        <option key={f.key} value={f.key}>
                          {f.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-extrabold text-slate-700 mb-1">
                      子分類標籤（選填）
                    </label>
                    <input
                      type="text"
                      value={uploadSubFolder}
                      onChange={e => setUploadSubFolder(e.target.value)}
                      placeholder="例如：模配圖、簽證圖..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* 選擇檔案與備註 */}
              <div>
                <label className="block font-extrabold text-slate-700 mb-1">
                  {isDisciplineCategory(uploadCategoryId) ? '2.' : '3.'} 選擇圖說或母版檔案 (.dwg / .pdf / .xlsx / .png / .step / .fcstd) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="file"
                  required
                  onChange={e => setUploadFileObj(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-dashed border-indigo-300 bg-indigo-50/40 rounded-xl text-xs sm:text-sm cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-extrabold text-slate-700 mb-1">
                  {isDisciplineCategory(uploadCategoryId) ? '3.' : '4.'} 圖說說明或設計檢核備註（選填）
                </label>
                <input
                  type="text"
                  value={uploadNote}
                  onChange={e => setUploadNote(e.target.value)}
                  placeholder="例如：標準 800x700 連續地梁配筋母版、100kW 以上附 CT 雙門表箱標準圖..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Upload size={15} /> {uploading ? '上傳中...' : '確認上傳至獨立分類'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 六大產品建模示意圖 Modal */}
      {showSixProductsDiagramModal && (
        <div
          className="fixed inset-0 z-[200] bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowSixProductsDiagramModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-6xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-base">六種太陽能系統型態 — 建模示意圖總覽</h3>
              <button
                type="button"
                onClick={() => setShowSixProductsDiagramModal(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              <img
                src="/six-products.png"
                alt="六種太陽能系統型態建模示意圖"
                className="w-full h-auto rounded-xl border border-slate-200"
              />
            </div>
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
