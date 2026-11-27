import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Root directory of the Wind-Rain Court design template knowledge base (belongs strictly to 'sport_court')
const TEMPLATE_ROOT = path.resolve(__dirname, '../../../風雨球場設計模板');

// Custom uploaded templates storage directory & metadata registry
const CUSTOM_UPLOAD_DIR = path.resolve(__dirname, '../../uploads/knowledge-base');
const CUSTOM_META_FILE = path.join(CUSTOM_UPLOAD_DIR, 'metadata.json');

if (!fs.existsSync(CUSTOM_UPLOAD_DIR)) {
  fs.mkdirSync(CUSTOM_UPLOAD_DIR, { recursive: true });
}

/**
 * 9 個完全獨立的頂層分類 ID：
 * - 六大產品：'fish_outdoor' | 'fish_indoor' | 'sport_court' | 'roof_canopy' | 'roof_flush' | 'ground_mount'
 * - 三大工程項目：'CIVIL' | 'STEEL' | 'MEP'
 */
export type IndependentCategoryId =
  | 'fish_outdoor'
  | 'fish_indoor'
  | 'sport_court'
  | 'roof_canopy'
  | 'roof_flush'
  | 'ground_mount'
  | 'CIVIL'
  | 'STEEL'
  | 'MEP';

interface CustomUploadedEntry {
  id: string;
  originalName: string;
  storedFileName: string;
  categoryId: IndependentCategoryId;
  folderKey: string;
  subFolder: string;
  note: string;
  sizeBytes: number;
  uploadedAt: string;
}

const readCustomMetadata = (): CustomUploadedEntry[] => {
  try {
    if (!fs.existsSync(CUSTOM_META_FILE)) return [];
    const raw = fs.readFileSync(CUSTOM_META_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Backward compatibility if an older entry had discipline instead of categoryId
    return parsed.map((item: any) => ({
      ...item,
      categoryId: item.categoryId || item.discipline || 'STEEL',
    }));
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
    checkPoint: '現場收方確認場域邊界、周邊遮陰樓高與地下管溝位置（避開柱位開挖）；套疊地籍圖、確認指北針方位、模組排佈、中央留設檢修走道與安全爬梯位置。',
  },
  '2.客戶資料': {
    title: '2. 客戶資料（業主與校方基本文件）',
    subtitle: '存放土地地籍、業主提供之既有建築圖說、地質與使用需求文件',
    badge: '業主資料',
    order: 2,
    checkPoint: '確認業主提供之地下管線圖、既有配電室單線圖與使照資料。',
  },
  '3.台電送審圖及施工圖': {
    title: '3. 台電送審圖及機電施工圖（機電併網階段）',
    subtitle: '台電送審圖 (.dwg/.pdf)、機電施工圖、3P4W附CT電錶箱結構圖、串併及線槽填充率檢討表 (.xlsx)',
    badge: '機電與送審',
    order: 3,
    checkPoint: '超過 100kW 併內線案場直接套用「3Φ4W 低壓附 CT 雙門表箱（寬 1350mm，表箱離地 1.5~1.8m，內門淨寬 ≥ 55cm）」與獨立遮陰短串 MPPT。',
  },
  '4.結構簽證圖': {
    title: '4. 結構簽證圖與業主簽確圖（法規與審查階段）',
    subtitle: '業主簽確圖 (.pdf)、結構簽證圖 (.dwg/.pdf) 與結構技師簽章定稿範例',
    badge: '結構簽證',
    order: 4,
    checkPoint: '先出「簽確圖」（模配、柱位、立面圖）供業主確認跨距與高度；再由結構技師出具簽證圖。',
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

export interface KnowledgeFileItem {
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
  /** 單一獨立歸屬分類 ID（六大產品之一 或 土木/鋼構/機電 之一，絕不跨類共用） */
  categoryId: IndependentCategoryId;
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
      // 風雨球場設計模板目錄下的內建檔案，僅獨立歸屬於 'sport_court' (3. 風雨球場)，不與其他產品或土木/鋼構/機電互相關聯
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
        categoryId: 'sport_court',
        isCustomUpload: false,
      });
    }
  }
  return results;
};

// GET /api/knowledge-base - 取得設計知識庫結構與所有獨立分類檔案
router.get('/', authenticateToken, async (_req, res) => {
  try {
    const folders: {
      key: string;
      title: string;
      subtitle: string;
      badge: string;
      order: number;
      checkPoint: string;
      files: KnowledgeFileItem[];
    }[] = Object.entries(STAGE_DESCRIPTIONS).map(([key, meta]) => ({
      key,
      ...meta,
      files: [],
    }));

    if (fs.existsSync(TEMPLATE_ROOT)) {
      const rootEntries = fs.readdirSync(TEMPLATE_ROOT, { withFileTypes: true });
      for (const entry of rootEntries) {
        if (entry.isDirectory()) {
          const folderKey = entry.name;
          if (folderKey.startsWith('0.') || folderKey.startsWith('8.')) {
            continue;
          }
          const fullDir = path.join(TEMPLATE_ROOT, folderKey);
          const targetKey = folderKey === '7.收方圖' ? '1.預算書及模配圖' : folderKey;
          const files = scanFilesRecursive(fullDir, targetKey, '');
          const folderObj = folders.find(f => f.key === targetKey);
          if (folderObj) {
            folderObj.files.push(...files);
          }
        }
      }
    }

    // 載入各獨立分類（六大產品 或 土木/鋼構/機電）自訂上傳之專屬檔案
    const customMeta = readCustomMetadata();
    for (const item of customMeta) {
      const fullCustomPath = path.join(CUSTOM_UPLOAD_DIR, item.storedFileName);
      if (!fs.existsSync(fullCustomPath)) continue;

      const tInfo = getFileTypeInfo(item.originalName);
      const kbItem: KnowledgeFileItem = {
        id: item.id,
        name: item.originalName,
        relativePath: `custom:${item.storedFileName}`,
        folderKey: item.folderKey || '1.預算書及模配圖',
        subFolder: item.subFolder || '',
        sizeBytes: item.sizeBytes,
        updatedAt: item.uploadedAt,
        ext: tInfo.ext,
        typeCategory: tInfo.category,
        previewable: tInfo.previewable,
        categoryId: item.categoryId,
        isCustomUpload: true,
        note: item.note,
      };

      const targetFolder = folders.find(f => f.key === kbItem.folderKey) || folders[0];
      if (targetFolder) {
        targetFolder.files.unshift(kbItem);
      }
    }

    folders.sort((a, b) => a.order - b.order);
    const allFiles = folders.flatMap(f => f.files);

    res.json({
      templateName: '元融集團 設計知識庫與 3D 模擬中心',
      totalFiles: allFiles.length,
      folders,
      allFiles,
    });
  } catch (error) {
    console.error('Failed to load knowledge base:', error);
    res.status(500).json({ error: '讀取設計知識庫失敗' });
  }
});

// POST /api/knowledge-base/upload - 針對單一獨立分類（六大產品之一 或 土木/鋼構/機電之一）上傳專屬圖說母版
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '請選擇要上傳的圖說或母版檔案' });
    }

    const rawOriginalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const originalName = rawOriginalName || req.file.originalname;

    const categoryId = (req.body.categoryId as IndependentCategoryId) || 'CIVIL';
    const defaultFolder =
      categoryId === 'CIVIL'
        ? '1.預算書及模配圖'
        : categoryId === 'STEEL'
        ? '5.拆料圖及組裝圖'
        : categoryId === 'MEP'
        ? '3.台電送審圖及施工圖'
        : '1.預算書及模配圖';

    const folderKey = req.body.folderKey || defaultFolder;
    const subFolder = req.body.subFolder || '';
    const note = req.body.note || '';

    const newEntry: CustomUploadedEntry = {
      id: `custom_${Date.now()}_${Math.round(Math.random() * 1e6)}`,
      originalName,
      storedFileName: req.file.filename,
      categoryId,
      folderKey,
      subFolder,
      note,
      sizeBytes: req.file.size,
      uploadedAt: new Date().toISOString(),
    };

    const list = readCustomMetadata();
    list.unshift(newEntry);
    writeCustomMetadata(list);

    res.json({ message: '成功上傳圖說母版', entry: newEntry });
  } catch (error) {
    console.error('Failed to upload knowledge base file:', error);
    res.status(500).json({ error: '上傳圖說母版失敗' });
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

// GET /api/knowledge-base/file - 下載或線上預覽範例檔案
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
