const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const ROOT_DIR = path.resolve(__dirname, '../..');
const BACKEND_DIR = path.resolve(__dirname, '..');
const JSON_OUTPUT_PATH = path.join(BACKEND_DIR, 'changelog.json');
const EXCEL_OUTPUT_PATH = path.join(ROOT_DIR, '系統更新紀錄_Changelog.xlsx');

// 完整繁體中文精準對照表 (涵蓋歷史 Commit + 自動智慧翻譯兜底)
const EXACT_ZH_MAP = {
  '0383146': '派工單新增全螢幕檢視切換與響應式縮放比例功能',
  '0846d7f': '專案時程甘特圖新增電腦與手機版全螢幕切換及響應式縮放功能',
  '10c202a': '修正專案時程甘特圖凍結第 4 欄（目標欄）與頂部標題列（sticky top-0）',
  '511f16c': '修正手機瀏覽器水平滾動與凍結欄位（sticky column）裁切問題',
  '1e0f403': '修正儀表板進度條背景覆蓋問題並新增 5 級進度顏色標示',
  'b3dc31b': '移除儀表板舊版跑馬燈與導覽按鈕，新增即時進度動態效果',
  'f55c01a': '儀表板新增進行中現場工程與製造進度看板（含最新現場照片）',
  'f4dd598': '現場報工將階段狀態徽章移至下一行堆疊，並停用已完成之階段選項',
  'dc2c054': '修正派工單表格換行、階段標籤文字換行與進度框溢位問題',
  'babf99f': '製造報工縮短「今日生產數量」輸入框標籤並確保最小寬度',
  '4f42c16': '製造報工於工項卡片與派工追蹤表嵌入「4 階段製程標籤（備料/組立/焊接/塗裝）」',
  '571b8f0': '修正業務開發（Leads）使用者未定義崩潰問題，並移除獨立流程建置器選單',
  'd15baf8': '新增完整「電子簽核系統（E-Approval）」，含表單/報表設計器、簽核流程建置器與印章設計器',
  '82262ab': '修正專案甘特圖凍結欄位縫隙問題（鎖定欄寬與 border-separate）',
  '798b989': '專案甘特圖新增「日」顆粒度切換與月份篩選器',
  'ba5a06c': '新增色塊網格甘特圖（Color-block Gantt）與帶樣式之 Excel 匯出功能',
  '03770b1': '重構派工單：從專案派工分頁移除簽核按鈕與彈窗，統一由主管看板控管',
  'c795744': '主管儀表板新增待簽核派工單專區，並鎖定未簽核派工單不得進入生產報工',
  '4a55ae1': '派工單新增部門下拉選單、目標部門圖紙印章與主管簽核彈窗',
  'cf50bdd': '專案管理新增 Excel 批次匯入專案功能（保留系統既有專案資料）',
  'f24ef19': '修正現場報工當圖紙檔名包含頓號（、）時勾選框無法切換的問題',
  'a56cac8': '調整現場報工「委外模式」照片上傳區塊為垂直堆疊以符合原版面配置',
  'f40e419': '現場報工「委外模式」自動帶入填報人姓名並記錄填報人工時',
  'c545aeb': '現場報工新增「委外報工模式」，支援依工程類別分區獨立上傳照片',
  '4fab04e': '簡化製造工具箱會議報表標頭並更新工廠作業區域選項',
  'bdf4f69': '新增現場/製造報工詳細欄位防呆驗證提示，並新增「後臺系統紀錄（Audit Logs）」頁面',
  '3ffe64e': '現場報工新增全螢幕圖片檢視燈箱（支援縮放、平移、旋轉與相簿切換）',
  'a40aaf1': '將製造工具箱會議卡片上的派工單徽章移至內容區域',
  '6989f61': '製造工具箱會議支援動態選擇任意專案及其關聯派工單',
  'b03b76d': '製造工具箱會議 PDF 與彈窗改為每列獨立渲染一項派工單工項',
  '6a636d0': '製造工具箱會議支援跨專案與多張派工單選擇，並更新報表工作內容格式',
  'c4ff020': '將不可量化之工項預設為 100% 目標完成度模式',
  '41a11a5': '專案「施工日誌」新增「現場工程」與「製造」子分頁，並支援 PDF 與 Excel 匯出',
  '966df02': '修正派工單查詢中的 laborReports 關聯名稱',
  '73ec6c2': '於派工單顯示累計生產進度與完成百分比',
  '7693eef': '報工圖紙確認支援直接檢視與多選「開案執行書」內的施工圖與 BOM 表檔案',
  '4a91616': '鎖定目標數量為唯讀，並於累計數量超過目標時發出提醒警告',
  'd1bbca9': '補上 Onsite.tsx 的 useCallback 引用以修正白畫面錯誤',
  'c1a6ee2': '報工表單拆分「目標數量」與「今日完成數量」欄位，自動計算完成進度百分比',
  'fca53a0': '限制現場與製造報工紀錄僅填報人本人可檢視與編輯',
  'b881e23': '現場與製造報工支援單次填報多個工程類別與多筆工項',
  'fda36df': '將派工單工項更新為 9 欄式鋼構總表格式，並支援 Excel 匯入',
  '5cc4daf': '專案工項設定新增 Excel 範本下載與匯入功能（含嚴格表頭驗證）',
  '48d8a42': '新增支援六大產品類型的「3D 太陽能案場模擬器」，並與 2D 排佈模擬器整合',
  'c0a95d7': '施工日誌匯出檔名格式更新為「民國日期 + 案場名稱 + 施工項目」',
  '3d6c7e0': '將專案詳情「履約管理」分頁替換為「派工單」分頁，並串聯製造報工紀錄',
  '5a3f26e': '現場報工依機具數量自動計算機具總工時，並修正施工日誌機具統計',
  '598f40d': '開案執行書 PDF 匯出時將 Excel 轉圖頁面以 A4 橫向（Landscape）渲染',
  'a827534': '開案執行書 PDF 匯出支援自動將 Excel (.xlsx/.xls/.csv) 轉為圖片並縮放至 A4',
  '91614d4': '開案執行書 PDF 匯出新增即時進度條與階段檢核動畫',
  'b76ea8f': '修正開案執行書表格欄位換行與按鈕排版',
  '5e15ad1': '開案執行書開放無限量多檔案同時上傳',
  '7416459': '將專案檔案升級為「開案執行書」，整合 v3 封面、v7 目錄協作與合併 PDF 匯出',
  'daf5a90': '移除出勤報表中多餘的專案與關鍵字篩選器',
  '076284e': '報表中心新增報表類型切換器與「月度出勤報表」（含總表、1~31日分頁與 Excel 匯出）',
  'b2c6acc': '新增「製造報工模組」，包含工廠工具箱會議與每日生產日報表',
  '6dd67e2': '每日報工移除浮水印與標題底線，並對齊 Excel 範本配色 (#ebf1de)',
  '92c4298': '統一工具箱會議 PDF 第二頁照片表格式與每日報工一致，並修正照片 JSON 解析',
  '34887db': '每日報工於安全檢查上方新增最多 18 張補充照片上傳區',
  '9d3cb8d': '施工設定允許自訂工程類別並移除預設寫死工項',
  'af4770d': '工具箱會議與每日報工新增送出 Loading 狀態與成功回饋，防止重複提交',
  '8a61fc3': '修正甘特圖「今日線（Today line）」被滑鼠游標所在列遮蓋的問題',
  '838c25f': '於甘特圖進度條上直接顯示完成度百分比文字',
  '9dd0de0': '將甘特圖縮放文字按鈕替換為 Lucide 圖示按鈕',
  '685ed52': '更新甘特圖「今日線」為對齊分類列的虛線樣式',
  '645f6eb': '移除資料列 z-0 限制，讓甘特圖提示框（Tooltip）可浮於凍結欄位上方',
  '5097571': '設定滑鼠懸停時的 z-index 以解決時程表提示框被裁切的問題',
  '2dce5bb': '修正專案時程表標頭換行跑版問題',
  '57152e0': '調整專案時程版面配置：縮小左側欄寬（1/4）以擴大右側甘特圖顯示空間',
  '2f13dbe': '修正 work_items 中 Prisma Json 物件重複執行 JSON.parse 造成的錯誤',
  '15f3a52': '依據「累計完成量 vs 合約數量」自動計算甘特圖工項進度',
  'b450086': '補上缺失的 ProjectTimeline 引用以修正 React 崩潰',
  'a3e97d1': '新增 ErrorBoundary 錯誤邊界組件以利追蹤白畫面問題',
  '10b03a3': '修正無效開始/結束日期導致的 NaN 崩潰問題',
  'ef3cf0d': '修正 React 樣式寬度反斜線跳脫錯誤導致的白畫面',
  '04ee349': '新增專案時程「互動式甘特圖（Gantt Chart）」功能',
  'e13a0d2': '修正表格標頭與刪除按鈕對齊問題',
  '5476a1e': '專案工項新增「預計開始/結束日期」欄位並修正刪除按鈕換行',
  '167abe4': '修正施工機具顯示與儲存問題，並優化 update.bat 更新腳本',
  '250872d': '新增登入失敗時的錯誤彈窗提示（Alert Popup）',
  '9d8766d': '為工具箱會議與每日報工日誌新增刪除按鈕',
  '0a0ac81': '新增首次登入強制修改密碼機制與密碼強度驗證',
  '5dccf35': '將刪除權限判斷由角色名稱改為權限等級（Role Level >= 100）',
  '95965e6': '修正後端 TypeScript 編譯錯誤並防止前端 index.html 被瀏覽器快取',
  'e1aea0e': '於潛客（Leads）、任務（Tasks）與專案（Projects）前端介面正確顯示刪除按鈕',
  'ff0c21c': '新增專案、潛客、任務與現場日誌之刪除功能（限系統管理員）',
  'eed0b82': '專案資料模型與新增/編輯專案彈窗加入「案場地址」欄位',
  'cd2211e': '修正編輯專案時建置容量回填問題，並允許潛客轉專案時手動輸入容量',
  '3a86741': '於 Excel 與 PDF 匯出邏輯中正確帶入工項合約數量',
  '236c595': '將合約數量邏輯套用至 PDF 匯出路由',
  '959bb3b': '修正 laborReports 中導致後端無法編譯的 TypeScript 型別錯誤',
  '0483f0d': '於 ProjectDetails.tsx 渲染專案自訂工項（work_items）設定面板',
  '714d291': '防止工項設定崩潰並於下拉選單保留舊有工項相容性',
  '86d450d': '專案管理新增「自訂工項與合約數量」設定，並與每日報工日誌連動',
  '6e30d60': '將系統網頁標題更新為「元融管理系統」並將圖示（Favicon）設為 logo.png',
  '0fecc24': '系統設定為不同權限模組標籤配置專屬顏色並優化欄寬',
  'bf7cfd2': '於部門管理表格中以彩色標籤（Chips）顯示已啟用的權限模組',
  'e6df876': '實作基於部門的角色存取權限控管（RBAC）導覽選單',
  '3da4760': '將遠景照片上傳輸入框同步更新為雙按鈕設計',
  '1ceb483': '將照片上傳明確拆分為「拍照」與「從相簿選擇」雙按鈕，解決 Android 手機選檔限制',
  'ec8baa7': '移除照片輸入框 multiple 屬性讓 Android 原生選擇器可顯示相機拍照選項',
  'fa98aec': '工具箱會議 PDF：移除其他風險列的換行與固定高度以達成最緊湊排版',
  '1c83eab': '工具箱會議 PDF：為空白機具列設定明確高度避免表格塌陷',
  'd3d26cf': '工具箱會議 PDF：縮小行高與列高使單頁版面更緊湊',
  'bd40751': '工具箱會議 PDF：增加物理性危害欄位跨距（colspan）防止文字換行',
  '65a4164': '工具箱會議 PDF：交錯對齊上方表頭邊框並保持直書欄位窄幅顯示',
  '62d3741': '工具箱會議 PDF：縮減第一欄寬度並防止表頭文字換行',
  '56d601b': '工具箱會議 PDF：將物理性危害依需求排列為整齊的兩列並排格式',
  '894c1dc': '工具箱會議 PDF：自訂物理性危害彈性排版並增加第一項安全跨距',
  'bde72c4': '工具箱會議 PDF：調整第一欄寬度並平均分配安全欄位跨距以防止換行',
  '13adaeb': '工具箱會議 PDF：調整右側欄位跨距防止文字換行',
  '931c802': '修正後端正確儲存工具箱會議表單新增之 JSON 檢核欄位',
  '603e95a': '修正工具箱會議 PDF 範本備援路徑與精確版面配置',
  '2f004e2': '專案施工日誌新增「工具箱會議 PDF 匯出」功能',
  '0330932': '將工具箱會議表單中的安全檢查區塊移至照片上傳下方',
  'c237817': '以 getCanvas 取代 getTrimmedCanvas 解決 trim-canvas 在 Vite 打包時的相容問題',
  'da4ff10': '強化電子簽名板儲存處理（加入 try-catch 與陣列檢查防護）',
  '6b7c92d': '清理電子簽名暫存腳本',
  '52282e9': '工具箱會議新增現場人員「手寫電子簽名板（Digital Signature Pad）」功能',
  '800e4fd': '將新版工具箱會議檢核表 UI 正確嵌入彈窗中',
  'ea25661': '清理臨時注入腳本',
  '310ae28': '新增完整工具箱會議檢核表（含作業區域、危害告知與安全防護措施）',
  'bfeb7f9': '修正報表檢視中專案名稱未定義問題並移除列印按鈕',
  '1aa1833': '將新增按鈕拆分為「新增工具箱會議」與「新增報工日誌」兩顆獨立按鈕',
  '35ceee3': '將新增按鈕移至搜尋列下方並於手機版保持文字顯示',
  '28c0a56': '清理手機上傳修正腳本',
  '0e74143': '支援手機端分批累加多張照片並新增單張照片移除按鈕',
  '8e2e14d': '清理 Logo 腳本',
  '012a3ef': '於 Excel 與 PDF 匯出報表中套用真實公司 Logo',
  'c71cf58': '縮減照片列高度以減少版面留白',
  '804f97a': '調整照片附錄頁版面為每頁 6 張照片並支援自動分頁',
  '4514b5b': '清理專案暫存檔案',
  '0f15852': '於 Excel 與 PDF 匯出報表新增「第二頁施工照片附錄」',
  '1a21797': '修正每日報工從 Prisma 讀取 JSON 陣列時的解析邏輯',
  '876421e': '每日報工預設將單位設為「式」、合約數量設為 100%',
  'd3aa4db': '修正正式環境下 PDF 範本檔案的路徑解析問題',
  'c78d8ca': '改寫 Excel 匯出排版使其與 PDF 報表版面完全一致',
  '5e4eef4': '補上 PDF 範本缺失的 .bg-gray 灰色背景樣式',
  '6ed3e94': '為 PDF 報表表頭加上灰色背景樣式',
  'c0063bd': '強化 update.bat 中的檔案路徑相容性',
  'd5c9eae': '修正 update.bat 執行時的工作目錄問題',
  'f2aa2e6': '將 PDF 報表工項列數上限提升至 11 列',
  'd5f012d': '進一步壓縮 PDF 樣式以確保完整放入單頁 A4',
  'b872dee': '調整 PDF 工項列數以防止超出單頁範圍',
  '4e5de2a': '修正 PDF 報表中的建置容量顯示格式',
  '76602b8': '專案資料新增「建置容量（Capacity）」欄位',
  '6832be9': '導入 Puppeteer 新增每日報工 PDF 匯出功能',
  '495c4ee': '修正每日報工中的範本路徑解析',
  '4a50842': '新增每日報工日誌 Excel (.xlsx) 匯出功能',
  '354233b': '將工具箱會議與每日報工日誌整合至專案詳情的「施工日誌」分頁',
  'a9c755f': '更新 tsconfig.json 僅編譯 src 目錄以避免編譯外部輔助腳本',
  '82f92ae': '每日報工新增「明日預計工作項目」欄位',
  'c7f04d9': '每日報工新增「施工機具管理」紀錄功能',
  '501360e': '新增資料庫 Seed 腳本以建立預設系統管理員帳號',
  '7e17fb0': '設定 tsconfig rootDir 為 ./src',
  '49e862e': '完成地端部署架構準備：由後端託管前端靜態檔案並新增 update.bat 更新腳本',
  '1caeb0b': '新增點工人員記錄、24 小時制時間輸入與工時自動計算功能',
  'c73a69f': '修正報表檢視功能顯示問題（新增自主檢查表與照片、修正專案標題）',
  'c5c98ad': '報表卡片與表單排版優化、實作獨立報表檢視功能',
  'b61988f': '實作每日報工詳細記錄與照片分類上傳功能',
  '66484ca': '合併主分支（Merge branch main）',
  '0fdf17c': '系統初始化提交（Initial commit）',
  '8bed1cb': '後端系統初始化提交（Initial commit backend）'
};

const SCOPE_NAME_MAP = {
  'dispatch-orders': '生產派工單',
  'timeline': '專案時程/甘特圖',
  'project-timeline': '專案時程/甘特圖',
  'mobile': '行動裝置優化',
  'dashboard': '總覽看板',
  'onsite': '現場報工',
  'ui': '介面與排版',
  'manufacturing': '製造報工',
  'crm': '業務開發 (CRM)',
  'e-approval': '電子簽核系統',
  'projects': '專案管理',
  'project': '專案管理',
  'reports': '報表與分析',
  'labor-report': '每日報工日誌',
  'frontend': '前端介面',
  'backend': '後端核心',
  'pdf': 'PDF 報表引擎',
  'export': '報表匯出',
  'settings': '系統與權限設定',
  'changelog': '版本更新紀錄'
};

const TYPE_META = {
  feat: { label: '新功能', color: '10B981' },
  fix: { label: '問題修正', color: 'F59E0B' },
  style: { label: '介面優化', color: '6366F1' },
  refactor: { label: '架構重構', color: '8B5CF6' },
  chore: { label: '系統維護', color: '64748B' },
  other: { label: '一般更新', color: '3B82F6' }
};

function detectModule(scope, subject) {
  if (scope && SCOPE_NAME_MAP[scope.toLowerCase()]) {
    return SCOPE_NAME_MAP[scope.toLowerCase()];
  }
  const s = subject.toLowerCase();
  if (s.includes('開案執行書')) return '開案執行書';
  if (s.includes('3d') || s.includes('simulator')) return '3D/2D 設計模擬器';
  if (s.includes('audit') || s.includes('system-log')) return '後臺系統紀錄';
  if (s.includes('dispatch')) return '生產派工單';
  if (s.includes('manufacturing')) return '製造報工';
  if (s.includes('toolbox')) return '工具箱會議';
  if (s.includes('labor report') || s.includes('報工') || s.includes('onsite')) return '現場報工/日報表';
  if (s.includes('gantt') || s.includes('timeline')) return '專案時程/甘特圖';
  if (s.includes('approval')) return '電子簽核系統';
  if (s.includes('pdf') || s.includes('excel')) return '報表匯出 (PDF/Excel)';
  if (s.includes('login') || s.includes('password') || s.includes('rbac') || s.includes('permission')) return '帳號與權限安全';
  if (s.includes('project')) return '專案管理';
  if (s.includes('update.bat') || s.includes('deploy') || s.includes('tsconfig')) return '部署與系統建置';
  return '系統核心';
}

function autoTranslateFallback(rawSubject) {
  // 若未來新 commit 已經寫中文，直接使用
  if (/[\u4e00-\u9fa5]/.test(rawSubject)) {
    return rawSubject.replace(/^(feat|fix|style|refactor|chore|docs|perf)(\([^)]+\))?:\s*/i, '').trim();
  }
  let clean = rawSubject.replace(/^(feat|fix|style|refactor|chore|docs|perf)(\([^)]+\))?:\s*/i, '').trim();
  const dict = [
    [/\badd\b/gi, '新增'],
    [/\bfix\b/gi, '修正'],
    [/\bupdate\b/gi, '更新'],
    [/\bremove\b/gi, '移除'],
    [/\ballow\b/gi, '支援'],
    [/\bsupport\b/gi, '支援'],
    [/\bresolve\b/gi, '解決'],
    [/\bimprove\b/gi, '優化'],
    [/\bprevent\b/gi, '防止'],
    [/\bdispatch orders?\b/gi, '派工單'],
    [/\btoolbox meetings?\b/gi, '工具箱會議'],
    [/\blabor reports?\b/gi, '報工日誌'],
    [/\bgantt chart\b/gi, '甘特圖'],
    [/\bproject timeline\b/gi, '專案時程'],
    [/\bdashboard\b/gi, '總覽看板'],
    [/\bexport\b/gi, '匯出'],
    [/\bimport\b/gi, '匯入']
  ];
  for (const [regex, zh] of dict) {
    clean = clean.replace(regex, zh);
  }
  return clean;
}

function parseGitCommits() {
  const raw = execSync('git log --pretty=format:"%H|%h|%ad|%an|%s" --date=iso', {
    cwd: ROOT_DIR,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  });

  const lines = raw.split(/\r?\n/).filter(Boolean);
  const commits = lines.map((line) => {
    const [fullHash, hash, isoDate, author, ...subjectParts] = line.split('|');
    const subject = subjectParts.join('|').trim();
    const dateObj = new Date(isoDate);
    const date = isoDate.slice(0, 10);
    const time = isoDate.slice(11, 16);

    const conventionalMatch = subject.match(/^(feat|fix|style|refactor|chore|docs|perf)(?:\(([^)]+)\))?:\s*(.+)$/i);
    let type = 'other';
    let scope = '';
    if (conventionalMatch) {
      const rawType = conventionalMatch[1].toLowerCase();
      type = TYPE_META[rawType] ? rawType : 'other';
      scope = conventionalMatch[2] || '';
    } else if (/^fix\b/i.test(subject)) {
      type = 'fix';
    } else if (/^(add|feat)\b/i.test(subject)) {
      type = 'feat';
    } else if (/^(update|adjust|show|replace|calculate|allow|format|prevent)\b/i.test(subject)) {
      type = 'feat';
    } else if (/^(remove|clean)/i.test(subject)) {
      type = 'chore';
    }

    const moduleName = detectModule(scope, subject);
    const descriptionZh = EXACT_ZH_MAP[hash] || autoTranslateFallback(subject);

    return {
      fullHash,
      hash,
      date,
      time,
      isoDate: dateObj.toISOString(),
      author,
      type,
      typeLabel: (TYPE_META[type] || TYPE_META.other).label,
      module: moduleName,
      descriptionZh,
      rawSubject: subject
    };
  });

  // 依日期分組
  const groupedMap = new Map();
  for (const c of commits) {
    if (!groupedMap.has(c.date)) {
      groupedMap.set(c.date, []);
    }
    groupedMap.get(c.date).push(c);
  }

  const dailyGroups = Array.from(groupedMap.entries()).map(([date, items]) => {
    const modules = Array.from(new Set(items.map((i) => i.module)));
    const featCount = items.filter((i) => i.type === 'feat').length;
    const fixCount = items.filter((i) => i.type === 'fix').length;
    const styleCount = items.filter((i) => i.type === 'style' || i.type === 'refactor').length;
    return {
      date,
      totalCommits: items.length,
      featCount,
      fixCount,
      styleCount,
      modules,
      highlights: items
        .filter((i) => i.type !== 'chore')
        .slice(0, 6)
        .map((i) => `[${i.module}] ${i.descriptionZh}`),
      commits: items
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    latestCommitHash: commits[0]?.hash || '',
    latestCommitDate: commits[0]?.date || '',
    totalDays: dailyGroups.length,
    totalCommits: commits.length,
    dailyGroups,
    commits
  };
}

async function generateExcelWorkbook(data, targetPath) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = '元融管理系統 (YRPM)';
  workbook.created = new Date();

  // ================= 工作表 1：每日更新彙整 =================
  const summarySheet = workbook.addWorksheet('每日更新彙整', {
    views: [{ state: 'frozen', ySplit: 3 }]
  });

  summarySheet.mergeCells('A1:G1');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = `元融管理系統 (YRPM) — 每日系統更新紀錄彙整表（共 ${data.totalDays} 個更新日 / ${data.totalCommits} 筆更新）`;
  titleCell.font = { name: '微軟正黑體', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  summarySheet.getRow(1).height = 34;

  summarySheet.mergeCells('A2:G2');
  const subTitleCell = summarySheet.getCell('A2');
  subTitleCell.value = `最後同步時間：${new Date(data.generatedAt).toLocaleString('zh-TW')} ｜ 最新版本號：#${data.latestCommitHash} (${data.latestCommitDate})`;
  subTitleCell.font = { name: '微軟正黑體', size: 10, color: { argb: 'FF334155' } };
  subTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  subTitleCell.alignment = { vertical: 'middle', horizontal: 'right' };
  summarySheet.getRow(2).height = 22;

  const summaryHeaders = ['更新日期', '更新筆數', '新功能數', '修正/優化數', '涵蓋系統模組', '當日完整更新明細（繁體中文）', '版本編號 (Hashes)'];
  const headerRow1 = summarySheet.getRow(3);
  summaryHeaders.forEach((h, idx) => {
    const cell = headerRow1.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: '微軟正黑體', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  });
  headerRow1.height = 28;

  summarySheet.columns = [
    { key: 'date', width: 15 },
    { key: 'total', width: 11 },
    { key: 'feat', width: 11 },
    { key: 'fix', width: 13 },
    { key: 'modules', width: 28 },
    { key: 'details', width: 78 },
    { key: 'hashes', width: 24 }
  ];

  data.dailyGroups.forEach((group, idx) => {
    const bulletLines = group.commits
      .map((c, i) => `${i + 1}. [${c.typeLabel}｜${c.module}] ${c.descriptionZh}`)
      .join('\n');
    const row = summarySheet.addRow({
      date: group.date,
      total: group.totalCommits,
      feat: group.featCount,
      fix: group.fixCount + group.styleCount,
      modules: group.modules.join('、'),
      details: bulletLines,
      hashes: group.commits.map((c) => c.hash).join(', ')
    });

    const bgArgb = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';
    row.eachCell((cell, colNumber) => {
      cell.font = { name: '微軟正黑體', size: 10, bold: colNumber === 1 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
      cell.alignment = {
        vertical: 'top',
        horizontal: colNumber <= 4 ? 'center' : 'left',
        wrapText: true
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });
    row.height = Math.max(26, Math.min(group.commits.length * 16 + 10, 260));
  });

  // ================= 工作表 2：Git 完整提交明細 =================
  const detailSheet = workbook.addWorksheet('Git完整提交明細', {
    views: [{ state: 'frozen', ySplit: 2 }]
  });

  detailSheet.mergeCells('A1:H1');
  const dTitle = detailSheet.getCell('A1');
  dTitle.value = `元融管理系統 (YRPM) — Git 版本提交完整明細表（共 ${data.totalCommits} 筆）`;
  dTitle.font = { name: '微軟正黑體', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  dTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  dTitle.alignment = { vertical: 'middle', horizontal: 'center' };
  detailSheet.getRow(1).height = 32;

  const detailHeaders = ['項次', '更新日期', '時間', '版本號 (Hash)', '更新類型', '所屬模組', '更新內容說明（繁體中文）', 'Git 原始提交訊息'];
  const headerRow2 = detailSheet.getRow(2);
  detailHeaders.forEach((h, idx) => {
    const cell = headerRow2.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: '微軟正黑體', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  });
  headerRow2.height = 26;

  detailSheet.columns = [
    { key: 'index', width: 8 },
    { key: 'date', width: 14 },
    { key: 'time', width: 9 },
    { key: 'hash', width: 14 },
    { key: 'typeLabel', width: 13 },
    { key: 'module', width: 22 },
    { key: 'descriptionZh', width: 58 },
    { key: 'rawSubject', width: 52 }
  ];

  data.commits.forEach((c, idx) => {
    const row = detailSheet.addRow({
      index: idx + 1,
      date: c.date,
      time: c.time,
      hash: c.hash,
      typeLabel: c.typeLabel,
      module: c.module,
      descriptionZh: c.descriptionZh,
      rawSubject: c.rawSubject
    });

    const bgArgb = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';
    row.eachCell((cell, colNumber) => {
      cell.font = {
        name: colNumber === 4 ? 'Consolas' : '微軟正黑體',
        size: 10,
        bold: colNumber === 5 || colNumber === 6
      };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
      cell.alignment = {
        vertical: 'middle',
        horizontal: colNumber <= 5 ? 'center' : 'left',
        wrapText: true
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });
    row.height = 24;
  });

  if (targetPath) {
    await workbook.xlsx.writeFile(targetPath);
  }
  return workbook;
}

async function runSync() {
  console.log('[Changelog] 正在從 Git 抓取提交紀錄...');
  const data = parseGitCommits();
  fs.writeFileSync(JSON_OUTPUT_PATH, JSON.stringify(data, null, 2), 'utf8');
  console.log(`[Changelog] 已同步 ${data.totalCommits} 筆更新紀錄 (${data.totalDays} 天) 至 ${JSON_OUTPUT_PATH}`);

  await generateExcelWorkbook(data, EXCEL_OUTPUT_PATH);
  console.log(`[Changelog] 已產生 Excel 報表：${EXCEL_OUTPUT_PATH}`);
  return data;
}

if (require.main === module) {
  runSync().catch((err) => {
    console.error('[Changelog] 同步失敗:', err);
    process.exit(1);
  });
}

module.exports = {
  parseGitCommits,
  generateExcelWorkbook,
  runSync,
  JSON_OUTPUT_PATH,
  EXCEL_OUTPUT_PATH
};
