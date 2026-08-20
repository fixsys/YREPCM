const fs = require('fs');
let code = fs.readFileSync('backend/src/routes/laborReports.ts', 'utf8');

code = code.replace(/const allPhotos = \[\];/g, 'const allPhotos: any[] = [];');
code = code.replace(/let parsedPhotos = \{\};/g, 'let parsedPhotos: any = {};');
code = code.replace(/const getAbsPath = \(url\) =>/g, 'const getAbsPath = (url: string) =>');
code = code.replace(/const getBase64 = \(url\) =>/g, 'const getBase64 = (url: string) =>');
code = code.replace(/allPhotos\.forEach\(p =>/g, 'allPhotos.forEach((p: any) =>');
code = code.replace(/parsedPhotos\.close\.forEach\(\(url, i\)/g, 'parsedPhotos.close.forEach((url: string, i: number)');
code = code.replace(/parsedPhotos\.mid\.forEach\(\(url, i\)/g, 'parsedPhotos.mid.forEach((url: string, i: number)');
code = code.replace(/parsedPhotos\.far\.forEach\(\(url, i\)/g, 'parsedPhotos.far.forEach((url: string, i: number)');
code = code.replace(/workItems\.forEach\(\(item, idx\)/g, 'workItems.forEach((item: any, idx: number)');
code = code.replace(/extension: path\.extname\(absPath1\)\.substring\(1\)/g, 'extension: path.extname(absPath1).substring(1) as any');
code = code.replace(/extension: path\.extname\(absPath2\)\.substring\(1\)/g, 'extension: path.extname(absPath2).substring(1) as any');
code = code.replace(/tl: \{ col: 0\.1, row: rowPhoto - 1 \+ 0\.1 \}/g, 'tl: { col: 0.1, row: rowPhoto - 1 + 0.1 } as any');
code = code.replace(/br: \{ col: 3\.9, row: rowPhoto - 0\.1 \}/g, 'br: { col: 3.9, row: rowPhoto - 0.1 } as any');
code = code.replace(/tl: \{ col: 4\.1, row: rowPhoto - 1 \+ 0\.1 \}/g, 'tl: { col: 4.1, row: rowPhoto - 1 + 0.1 } as any');
code = code.replace(/br: \{ col: 7\.9, row: rowPhoto - 0\.1 \}/g, 'br: { col: 7.9, row: rowPhoto - 0.1 } as any');

fs.writeFileSync('backend/src/routes/laborReports.ts', code, 'utf8');
