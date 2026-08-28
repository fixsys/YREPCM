const fs = require('fs');
 // Note: we might not have glob, use fs.readdirSync recursively
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  // Replace frontend checks
  content = content.replace(/user\?\.role === 'SystemAdmin'/g, "(user?.role === 'SystemAdmin' || user?.role === '系統管理員')");
  
  // Replace backend checks
  content = content.replace(/req\.user\?\.role !== 'SystemAdmin'/g, "(req.user?.role !== 'SystemAdmin' && req.user?.role !== '系統管理員')");
  
  if (original !== content) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        walk(fullPath);
      }
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      replaceInFile(fullPath);
    }
  }
}

walk(path.join(__dirname, 'frontend/src'));
walk(path.join(__dirname, 'backend/src'));
