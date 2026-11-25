import { Router } from 'express';
import path from 'path';
import fs from 'fs';

const router = Router();
const syncScriptPath = path.resolve(__dirname, '../../scripts/sync-changelog.js');

function getChangelogModule() {
  // 確保每次都能呼叫同步腳本的解析與 Excel 生成器
  return require(syncScriptPath);
}

// GET /api/changelog - 取得完整 Git 版本更新紀錄（每次執行 update.bat 或即時抓取皆可反映最新狀態）
router.get('/', async (_req, res) => {
  try {
    const { parseGitCommits, JSON_OUTPUT_PATH } = getChangelogModule();
    let data;
    try {
      // 優先即時從 Git 抓取最新紀錄並同步更新 changelog.json 快照
      data = parseGitCommits();
      fs.writeFileSync(JSON_OUTPUT_PATH, JSON.stringify(data, null, 2), 'utf8');
    } catch {
      // 若環境無 git 指令則退回讀取 update.bat 產生的 changelog.json
      if (fs.existsSync(JSON_OUTPUT_PATH)) {
        data = JSON.parse(fs.readFileSync(JSON_OUTPUT_PATH, 'utf8'));
      } else {
        throw new Error('無法讀取 Git 紀錄或 changelog.json');
      }
    }
    res.json(data);
  } catch (error: any) {
    console.error('Error loading changelog:', error);
    res.status(500).json({ error: '無法讀取系統版本更新紀錄', details: error?.message });
  }
});

// GET /api/changelog/export - 直接下載最新 Excel (.xlsx) 更新紀錄
router.get('/export', async (_req, res) => {
  try {
    const { parseGitCommits, generateExcelWorkbook, JSON_OUTPUT_PATH, EXCEL_OUTPUT_PATH } = getChangelogModule();
    let data;
    try {
      data = parseGitCommits();
      fs.writeFileSync(JSON_OUTPUT_PATH, JSON.stringify(data, null, 2), 'utf8');
    } catch {
      data = JSON.parse(fs.readFileSync(JSON_OUTPUT_PATH, 'utf8'));
    }

    const workbook = await generateExcelWorkbook(data, EXCEL_OUTPUT_PATH);
    const filename = encodeURIComponent(`元融系統更新紀錄_Changelog_${data.latestCommitDate || '最新'}.xlsx`);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    console.error('Error exporting changelog excel:', error);
    res.status(500).json({ error: '匯出版本更新紀錄 Excel 失敗' });
  }
});

export default router;
