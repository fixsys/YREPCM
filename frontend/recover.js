const fs = require('fs');
const path = './src/pages/Budget.tsx';
const buf = fs.readFileSync(path);
console.log(buf.slice(0, 100));
