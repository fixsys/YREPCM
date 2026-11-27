import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Root directory of the design template knowledge base
const TEMPLATE_ROOT = path.resolve(__dirname, '../../../風雨球場設計模板');

// Custom uploaded engineering templates storage directory & metadata registry
const CUSTOM_UPLOAD_DIR = path.resolve(__dirname, '../../uploads/knowledge-base');
const CUSTOM_META_FILE = path.join(CUSTOM_UPLOAD_DIR, 'metadata.json');

if (!fs.existsSync(CUSTOM_UPLOAD_DIR)) {
  fs.mkdirSync(CUSTOM_UPLOAD_DIR, { recursive: true });
}

export type EngineeringDisciplineId = 'CIVIL' | 'STEEL' | 'MEP';

interface CustomUploadedEntry {
  id: string;
  originalName: string;
  storedFileName: string;
  discipline: EngineeringDisciplineId;
  folderKey: string;
  subFolder: string;
  products: string[];
  isUniversal: boolean;
  note: string;
  sizeBytes: number;
  uploadedAt: string;
}

const readCustomMetadata = (): CustomUploadedEntry[] => {
  try {
    if (!fs.existsSync(CUSTOM_META_FILE)) return [];
    const raw = fs.readFileSync(CUSTOM_META_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeCustomMetadata = (entries: CustomUploadedEntry[]) => {
  fs.writeFileSync(CUSTOM_META_FILE, JSON.stringify(entries, null, 2), 'utf-8');
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(CUSTOM_UPLOAD_DIR)) {
      fs.mkdirSync(CUSTOM_UPLOAD_DIR, { recursive: true });
    }
    cb(null, CUSTOM_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
});

const STAGE_DESCRIPTIONS: Record<string, { title: string; subtitle: string; badge: string; order: number; checkPoint: string }> = {
  '1.預算書及模配圖': {
    title: '1. 預算書及模配圖（提案與成本階段）',
    subtitle: '現場收方及柱位圖 (.dwg)、工程預算書參數化母版 (.xlsx)、模組配置圖 (.dwg/.pdf) 與航拍底圖 (.png)',
    badge: '收方、提案與預算',
    order: 1,
    checkPoint: '現場收方確認場域邊界、周邊遮陰樓高與地下管溝位置（避開柱位開挖）；套疊地籍圖、確認指北針方位、模組排佈（19 排 × 15 列 = 285 片）、中央留設檢修走道與安全爬梯位置。',
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

// 判斷每個範例檔案所屬之「土木 (CIVIL) / 鋼構 (STEEL) / 機電 (MEP)」三大工程分類
const getEngineeringDisciplines = (filename: string, folderKey: string): EngineeringDisciplineId[] => {
  if (folderKey === '3.台電送審圖及施工圖' || filename.includes('台電') || filename.includes('機電') || filename.includes('電錶箱') || filename.includes('串併') || filename.includes('掛錶')) {
    return ['MEP'];
  }
  if (folderKey === '5.拆料圖及組裝圖' || filename.includes('加工圖') || filename.includes('拆料') || filename.includes('風拉桿') || filename.includes('鋁') || filename.includes('平台')) {
    return ['STEEL'];
  }
  if (folderKey === '4.結構簽證圖' || filename.includes('結構計算書')) {
    // 結構簽證與結構計算書同時涵蓋「土木基礎配筋」與「鋼構構架」
    return ['CIVIL', 'STEEL'];
  }
  if (filename.includes('收方及柱位圖') || filename.includes('航拍底圖')) {
    return ['CIVIL'];
  }
  if (filename.includes('工程預算書')) {
    // 工程預算書母版同時涵蓋土木、鋼構、機電三大工項
    return ['CIVIL', 'STEEL', 'MEP'];
  }
  if (filename.includes('模組配置圖')) {
    return ['STEEL', 'MEP'];
  }
  return ['CIVIL', 'STEEL', 'MEP'];
};

// 判斷每個範例檔案適用之六大太陽能產品線
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
  disciplines: EngineeringDisciplineId[];
  isCustomUpload?: boolean;
  note?: string;
}

const scanFilesRecursive = (dirPath: string, folderKey: string, baseRel = ''): KnowledgeFileItem[] => {
  if (!fs.existsSync(dirPath)) return [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const results: KnowledgeFileItem[] = [];

  for (const entry of entries) {
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
      const disciplines = getEngineeringDisciplines(entry.name, folderKey);
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
        disciplines,
        isCustomUpload: false,
      });
    }
  }
  return results;
};

// GET /api/knowledge-base - 取得設計知識庫完整結構與所有範例檔案清單 (含六大產品 & 土木/鋼構/機電分類 & 自訂上傳母版)
router.get('/', authenticateToken, async (_req, res) => {
  try {
    if (!fs.existsSync(TEMPLATE_ROOT)) {
      return res.status(404).json({ error: '找不到風雨球場設計模板目錄' });
    }

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

    // 1..6 Stage directories (排除第 0 項與第 8 項，並將 7.收方圖 內的檔案併入 1.預算書及模配圖)
    const extraFilesForStage1: KnowledgeFileItem[] = [];
    for (const entry of rootEntries) {
      if (entry.isDirectory()) {
        const folderKey = entry.name;
        if (folderKey.startsWith('0.') || folderKey.startsWith('8.')) {
          continue;
        }
        const fullDir = path.join(TEMPLATE_ROOT, folderKey);
        if (folderKey === '7.收方圖') {
          const stage7Files = scanFilesRecursive(fullDir, '1.預算書及模配圖', '');
          extraFilesForStage1.push(...stage7Files);
          continue;
        }
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

    if (extraFilesForStage1.length > 0) {
      const stage1 = folders.find(f => f.key === '1.預算書及模配圖');
      if (stage1) {
        stage1.files.push(...extraFilesForStage1);
      }
    }

    // Merge custom uploaded files (土木 / 鋼構 / 機電 母版) into their respective stage folders
    const customMeta = readCustomMetadata();
    for (const item of customMeta) {
      const fullCustomPath = path.join(CUSTOM_UPLOAD_DIR, item.storedFileName);
      if (!fs.existsSync(fullCustomPath)) continue;

      const tInfo = getFileTypeInfo(item.originalName);
      const kbItem: KnowledgeFileItem = {
        id: item.id,
        name: item.originalName,
        relativePath: `custom:${item.storedFileName}`,
        folderKey: item.folderKey,
        subFolder: item.subFolder || (item.discipline === 'CIVIL' ? '土木工程母版' : item.discipline === 'STEEL' ? '鋼構工程母版' : '機電工程母版'),
        sizeBytes: item.sizeBytes,
        updatedAt: item.uploadedAt,
        ext: tInfo.ext,
        typeCategory: tInfo.category,
        previewable: tInfo.previewable,
        products: item.products,
        isUniversal: item.isUniversal,
        disciplines: [item.discipline],
        isCustomUpload: true,
        note: item.note,
      };

      const targetFolder = folders.find(f => f.key === item.folderKey) || folders[0];
      if (targetFolder) {
        targetFolder.files.unshift(kbItem);
      }
    }

    folders.sort((a, b) => a.order - b.order);
    const allFiles = folders.flatMap(f => f.files);

    res.json({
      templateName: '太陽能風雨球場標準設計模板（澎湖嵵裡國小 156.75 kWp 基準）',
      totalFiles: allFiles.length,
      folders,
      allFiles,
    });
  } catch (error) {
    console.error('Failed to load knowledge base:', error);
    res.status(500).json({ error: '讀取設計知識庫失敗' });
  }
});

// POST /api/knowledge-base/upload - 上傳「土木 / 鋼構 / 機電」工程圖說與母版檔案
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '請選擇要上傳的圖說或母版檔案' });
    }

    // Solve Latin1 -> UTF-8 filename encoding issue from multer
    const rawOriginalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const originalName = rawOriginalName || req.file.originalname;

    const discipline = (req.body.discipline as EngineeringDisciplineId) || 'STEEL';
    const defaultFolderByDiscipline =
      discipline === 'CIVIL'
        ? '1.預算書及模配圖'
        : discipline === 'STEEL'
        ? '5.拆料圖及組裝圖'
        : '3.台電送審圖及施工圖';
    const folderKey = req.body.folderKey || defaultFolderByDiscipline;
    const subFolder = req.body.subFolder || '';
    const note = req.body.note || '';
    const isUniversal = req.body.isUniversal !== 'false';

    let products: string[] = ['fish_outdoor', 'fish_indoor', 'sport_court', 'roof_canopy', 'roof_flush', 'ground_mount'];
    if (req.body.products) {
      try {
        const parsed = JSON.parse(req.body.products);
        if (Array.isArray(parsed) && parsed.length > 0) {
          products = parsed;
        }
      } catch {
        // keep all 6 products
      }
    }

    const newEntry: CustomUploadedEntry = {
      id: `custom_${Date.now()}_${Math.round(Math.random() * 1e6)}`,
      originalName,
      storedFileName: req.file.filename,
      discipline,
      folderKey,
      subFolder,
      products,
      isUniversal,
      note,
      sizeBytes: req.file.size,
      uploadedAt: new Date().toISOString(),
    };

    const list = readCustomMetadata();
    list.unshift(newEntry);
    writeCustomMetadata(list);

    res.json({ message: '成功上傳工程圖說母版', entry: newEntry });
  } catch (error) {
    console.error('Failed to upload knowledge base file:', error);
    res.status(500).json({ error: '上傳工程圖說母版失敗' });
  }
});

// DELETE /api/knowledge-base/upload/:id - 刪除自訂上傳之圖說母版
router.delete('/upload/:id', authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const list = readCustomMetadata();
    const target = list.find(item => item.id === id);
    if (!target) {
      return res.status(404).json({ error: '找不到該筆自訂上傳檔案' });
    }

    const filePath = path.join(CUSTOM_UPLOAD_DIR, target.storedFileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const updated = list.filter(item => item.id !== id);
    writeCustomMetadata(updated);

    res.json({ message: '已刪除該筆圖說母版' });
  } catch (error) {
    console.error('Failed to delete custom knowledge base file:', error);
    res.status(500).json({ error: '刪除失敗' });
  }
});

// GET /api/knowledge-base/file - 下載或線上預覽範例檔案 (支援內建母版與 custom: 自訂上傳母版)
router.get('/file', async (req, res) => {
  try {
    const relPath = String(req.query.path || '');
    const isDownload = req.query.download !== '0';

    if (!relPath) {
      return res.status(400).json({ error: '缺少檔案路徑參數' });
    }

    let resolvedPath = '';
    let downloadDisplayName = '';

    if (relPath.startsWith('custom:')) {
      const storedName = path.basename(relPath.slice('custom:'.length));
      resolvedPath = path.resolve(CUSTOM_UPLOAD_DIR, storedName);
      if (!resolvedPath.startsWith(CUSTOM_UPLOAD_DIR) || !fs.existsSync(resolvedPath)) {
        return res.status(404).json({ error: '找不到指定的自訂上傳檔案' });
      }
      const meta = readCustomMetadata().find(m => m.storedFileName === storedName);
      downloadDisplayName = meta ? meta.originalName : storedName;
    } else {
      resolvedPath = path.resolve(TEMPLATE_ROOT, relPath);
      if (!resolvedPath.startsWith(TEMPLATE_ROOT) || !fs.existsSync(resolvedPath)) {
        return res.status(404).json({ error: '找不到指定的範例檔案' });
      }
      downloadDisplayName = path.basename(resolvedPath);
    }

    const stat = fs.statSync(resolvedPath);
    if (!stat.isFile()) {
      return res.status(400).json({ error: '指定路徑不是檔案' });
    }

    const typeInfo = getFileTypeInfo(downloadDisplayName);
    const encodedName = encodeURIComponent(downloadDisplayName);

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
