import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Root directory of the design template knowledge base
const TEMPLATE_ROOT = path.resolve(__dirname, '../../../風雨球場設計模板');

const STAGE_DESCRIPTIONS: Record<string, { title: string; subtitle: string; badge: string; order: number; checkPoint: string }> = {
  '0.設計規範與總覽': {
    title: '0. 標準設計規範與防呆檢核表',
    subtitle: '太陽能風雨球場標準設計母版總綱（澎湖嵵裡國小 156.75 kWp 基準）',
    badge: '核心規範',
    order: 0,
    checkPoint: '涵蓋空間幾何、結構參數、Tekla 構件命名、機電串併邏輯、預算估算公式與 6 大歷史改圖防呆檢核點。',
  },
  '1.預算書及模配圖': {
    title: '1. 預算書及模配圖（提案與成本階段）',
    subtitle: '工程預算書參數化母版 (.xlsx)、模組配置圖 (.dwg/.pdf) 與航拍底圖 (.png)',
    badge: '提案與預算',
    order: 1,
    checkPoint: '套疊地籍圖、確認指北針方位、模組排佈（19 排 × 15 列 = 285 片）、中央留設檢修走道與安全爬梯位置。',
  },
  '2.客戶資料': {
    title: '2. 客戶資料（業主與校方基本文件）',
    subtitle: '存放土地地籍、校方提供之既有建築圖說、地質與使用需求文件',
    badge: '業主資料',
    order: 2,
    checkPoint: '確認校方或業主提供之地下管線圖、既有配電室單線圖與使照資料。',
  },
  '3.台電送審圖及施工圖': {
    title: '3. 台電送審圖及機電施工圖（機電併網階段）',
    subtitle: '台電送審圖 (.dwg/.pdf)、機電施工圖、3P4W附CT電錶箱結構圖、串併及線槽填充率檢討表 (.xlsx)',
    badge: '機電與送審',
    order: 3,
    checkPoint: '超過 100kW 併內線案場直接套用「3Φ4W 低壓附 CT 雙門表箱（寬 1350mm，表箱離地 1.5~1.8m，內門淨寬 ≥ 55cm）」與獨立遮陰短串 MPPT。',
  },
  '4.結構簽證圖': {
    title: '4. 結構簽證圖與學校簽確圖（法規與審查階段）',
    subtitle: '學校簽確圖 (.pdf)、結構簽證圖 (.dwg/.pdf) 與結構技師簽章定稿範例',
    badge: '結構簽證',
    order: 4,
    checkPoint: '先出「學校簽確圖」（模配、柱位、立面圖）供校方確認跨距（22m 對稱跨距）與高度（簷高 +7.0m）；再由結構技師出具簽證圖。',
  },
  '5.拆料圖及組裝圖': {
    title: '5. Tekla 拆料圖、組裝圖與鋁支架分料單（工廠加工與吊裝階段）',
    subtitle: '鋼構拆料總圖 (.dwg)、設備平台結構與補強詳圖 (.dwg)、一次/二次/板加工圖、風拉桿製造圖、結構安裝圖、鋁支架分料單',
    badge: '鋼構拆料與支架',
    order: 5,
    checkPoint: '一次加工圖標示型鋼單件切鑽；板加工圖標示連接板；二次加工圖標示組焊與螺栓清單；屋脊中脊板處腳座務必由 h 腳座改為 L 腳座。',
  },
  '6.竣工報告書定稿參考': {
    title: '6. 竣工報告書定稿參考（結案歸檔階段）',
    subtitle: '31.結構計算書 (.pdf)、32.台電審訖圖 (.pdf)、33.竣工照及掛錶紀錄 (.pdf)',
    badge: '竣工定稿',
    order: 6,
    checkPoint: '彙整 Midas Gen 3D 結構計算書、台電審訖圖與現場竣工照片及掛錶紀錄供驗收結案。',
  },
  '7.收方圖': {
    title: '7. 現場收方及柱位圖（先期勘查階段）',
    subtitle: '收方及柱位圖 (.dwg)',
    badge: '先期勘查',
    order: 7,
    checkPoint: '標示既有籃球場邊線、籃球架位置、階梯/出口動線、周邊建物樓高（2F 教室遮陰）、草地與地下暗溝位置（避開柱位開挖）。',
  },
  '8.FreeCAD_3D模型': {
    title: '8. FreeCAD 3D 全模型與自動化建模腳本（BIM 3D 模型）',
    subtitle: '風雨球場 3D 全模型 (.FCStd / .step) 與 Python 參數化 BIM 自動建模腳本 (.py)',
    badge: '3D BIM 模型',
    order: 8,
    checkPoint: '涵蓋土建基礎、主次鋼構、設備平台、屋面浪板母索、285片太陽能模組、逆變器配電箱與全場 17 串 DC/AC 線路之完整 3D 模型。',
  },
};

const getFileTypeInfo = (filename: string) => {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.pdf':
      return { ext: 'PDF', category: 'PDF 圖說/文件', previewable: true, mime: 'application/pdf' };
    case '.dwg':
      return { ext: 'DWG', category: 'AutoCAD 圖檔', previewable: false, mime: 'application/acad' };
    case '.xlsx':
    case '.xls':
      return { ext: 'XLSX', category: 'Excel 試算表/母版', previewable: false, mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
    case '.png':
    case '.jpg':
    case '.jpeg':
      return { ext: ext.replace('.', '').toUpperCase(), category: '影像/底圖', previewable: true, mime: `image/${ext === '.png' ? 'png' : 'jpeg'}` };
    case '.fcstd':
      return { ext: 'FCStd', category: 'FreeCAD 3D 原生檔', previewable: false, mime: 'application/octet-stream' };
    case '.step':
    case '.stp':
      return { ext: 'STEP', category: '3D 通用交換模型', previewable: false, mime: 'application/step' };
    case '.py':
      return { ext: 'PY', category: 'FreeCAD 建模腳本', previewable: true, mime: 'text/plain; charset=utf-8' };
    case '.md':
      return { ext: 'MD', category: '設計規範文件', previewable: true, mime: 'text/markdown; charset=utf-8' };
    default:
      return { ext: ext.replace('.', '').toUpperCase() || 'FILE', category: '其他檔案', previewable: false, mime: 'application/octet-stream' };
  }
};

// 判斷每個範例檔案適用之六大太陽能產品線
// (sport_court: 風雨球場為完整母版，而預算書母版、台電送審、3P4W附CT電錶箱、串併及線槽填充率、鋁擠支架通用標準、竣工報告書等亦可供其他五大產品通用參考)
const getApplicableProducts = (filename: string, folderKey: string): { products: string[]; isUniversal: boolean } => {
  const universalKeywords = [
    '工程預算書(參數化母版)',
    '3P4W附CT電錶箱結構圖',
    '串併及線槽填充率檢討表',
    '台電送審圖(範例)',
    '機電施工圖(範例)',
    '結構技師簽章定稿',
    '鋁擠支架安裝詳圖(通用標準)',
    '铝挤支架安装详图',
    '32.[案號]-[案名]-台電審訖圖',
    '33.[案號]-[案名]-竣工照及掛錶紀錄',
  ];
  const isUniversal = universalKeywords.some(kw => filename.includes(kw));
  if (isUniversal) {
    return {
      products: ['fish_outdoor', 'fish_indoor', 'sport_court', 'roof_canopy', 'roof_flush', 'ground_mount'],
      isUniversal: true,
    };
  }
  // 鋼構拆料、一次/二次/板加工、風拉桿亦適用於棚架類產品 (魚電室外、魚電室內、風雨球場、屋頂棚架、地面棚架)
  if (
    folderKey === '5.拆料圖及組裝圖' ||
    folderKey === '4.結構簽證圖' ||
    filename.includes('結構計算書')
  ) {
    return {
      products: ['sport_court', 'fish_outdoor', 'fish_indoor', 'roof_canopy'],
      isUniversal: false,
    };
  }
  return {
    products: ['sport_court'],
    isUniversal: false,
  };
};

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
  products: string[];
  isUniversal: boolean;
}

const scanFilesRecursive = (dirPath: string, folderKey: string, baseRel = ''): KnowledgeFileItem[] => {
  if (!fs.existsSync(dirPath)) return [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const results: KnowledgeFileItem[] = [];

  for (const entry of entries) {
    // Skip backup files like .FCBak
    if (entry.name.endsWith('.FCBak')) continue;
    const fullPath = path.join(dirPath, entry.name);
    const relFromRoot = path.relative(TEMPLATE_ROOT, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      const nextSub = baseRel ? `${baseRel} / ${entry.name}` : entry.name;
      results.push(...scanFilesRecursive(fullPath, folderKey, nextSub));
    } else if (entry.isFile()) {
      const stat = fs.statSync(fullPath);
      const typeInfo = getFileTypeInfo(entry.name);
      const appInfo = getApplicableProducts(entry.name, folderKey);
      results.push({
        id: Buffer.from(relFromRoot, 'utf8').toString('base64url'),
        name: entry.name,
        relativePath: relFromRoot,
        folderKey,
        subFolder: baseRel,
        sizeBytes: stat.size,
        updatedAt: stat.mtime.toISOString(),
        ext: typeInfo.ext,
        typeCategory: typeInfo.category,
        previewable: typeInfo.previewable,
        products: appInfo.products,
        isUniversal: appInfo.isUniversal,
      });
    }
  }
  return results;
};

// GET /api/knowledge-base - 取得設計知識庫完整結構、Markdown 規範全文與所有範例檔案清單
router.get('/', authenticateToken, async (_req, res) => {
  try {
    if (!fs.existsSync(TEMPLATE_ROOT)) {
      return res.status(404).json({ error: '找不到風雨球場設計模板目錄' });
    }

    const mdFilePath = path.join(TEMPLATE_ROOT, '00_風雨球場標準設計規範與檢核表.md');
    const markdownContent = fs.existsSync(mdFilePath)
      ? fs.readFileSync(mdFilePath, 'utf-8')
      : '';

    const pyScriptPath = path.join(TEMPLATE_ROOT, '8.FreeCAD_3D模型', 'build_wind_rain_court_freecad.py');
    const freecadScriptContent = fs.existsSync(pyScriptPath)
      ? fs.readFileSync(pyScriptPath, 'utf-8')
      : '';

    const rootEntries = fs.readdirSync(TEMPLATE_ROOT, { withFileTypes: true });
    const folders: {
      key: string;
      title: string;
      subtitle: string;
      badge: string;
      order: number;
      checkPoint: string;
      files: KnowledgeFileItem[];
    }[] = [];

    // 0. Root markdown specification file
    const rootFiles: KnowledgeFileItem[] = [];
    if (fs.existsSync(mdFilePath)) {
      const st = fs.statSync(mdFilePath);
      const tInfo = getFileTypeInfo('00_風雨球場標準設計規範與檢核表.md');
      rootFiles.push({
        id: Buffer.from('00_風雨球場標準設計規範與檢核表.md', 'utf8').toString('base64url'),
        name: '00_風雨球場標準設計規範與檢核表.md',
        relativePath: '00_風雨球場標準設計規範與檢核表.md',
        folderKey: '0.設計規範與總覽',
        subFolder: '',
        sizeBytes: st.size,
        updatedAt: st.mtime.toISOString(),
        ext: tInfo.ext,
        typeCategory: tInfo.category,
        previewable: tInfo.previewable,
        products: ['sport_court', 'fish_outdoor', 'fish_indoor', 'roof_canopy', 'roof_flush', 'ground_mount'],
        isUniversal: true,
      });
    }
    const meta0 = STAGE_DESCRIPTIONS['0.設計規範與總覽'];
    folders.push({
      key: '0.設計規範與總覽',
      ...meta0,
      files: rootFiles,
    });

    // 1..8 Stage directories
    for (const entry of rootEntries) {
      if (entry.isDirectory()) {
        const folderKey = entry.name;
        const fullDir = path.join(TEMPLATE_ROOT, folderKey);
        const files = scanFilesRecursive(fullDir, folderKey, '');
        const meta = STAGE_DESCRIPTIONS[folderKey] || {
          title: folderKey,
          subtitle: '設計標準範例與模板資料夾',
          badge: '設計模板',
          order: 99,
          checkPoint: '',
        };
        folders.push({
          key: folderKey,
          ...meta,
          files,
        });
      }
    }

    folders.sort((a, b) => a.order - b.order);
    const allFiles = folders.flatMap(f => f.files);

    res.json({
      templateName: '太陽能風雨球場標準設計模板（澎湖嵵裡國小 156.75 kWp 基準）',
      markdownContent,
      freecadScriptContent,
      totalFiles: allFiles.length,
      folders,
      allFiles,
    });
  } catch (error) {
    console.error('Failed to load knowledge base:', error);
    res.status(500).json({ error: '讀取設計知識庫失敗' });
  }
});

// GET /api/knowledge-base/file - 下載或線上預覽範例檔案
router.get('/file', async (req, res) => {
  try {
    const relPath = String(req.query.path || '');
    const isDownload = req.query.download !== '0';

    if (!relPath) {
      return res.status(400).json({ error: '缺少檔案路徑參數' });
    }

    const resolvedPath = path.resolve(TEMPLATE_ROOT, relPath);
    // Security check: prevent path traversal outside TEMPLATE_ROOT
    if (!resolvedPath.startsWith(TEMPLATE_ROOT) || !fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: '找不到指定的範例檔案' });
    }

    const stat = fs.statSync(resolvedPath);
    if (!stat.isFile()) {
      return res.status(400).json({ error: '指定路徑不是檔案' });
    }

    const filename = path.basename(resolvedPath);
    const typeInfo = getFileTypeInfo(filename);
    const encodedName = encodeURIComponent(filename);

    res.setHeader('Content-Type', typeInfo.mime);
    res.setHeader('Content-Length', stat.size);
    if (isDownload) {
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedName}`);
    } else {
      res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodedName}`);
    }

    const stream = fs.createReadStream(resolvedPath);
    stream.pipe(res);
  } catch (error) {
    console.error('Failed to serve knowledge base file:', error);
    res.status(500).json({ error: '下載範例檔案失敗' });
  }
});

export default router;
