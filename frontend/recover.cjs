const fs = require('fs');
const path = './src/pages/Budget.tsx';
const str = fs.readFileSync(path, 'latin1');
const idx = str.indexOf('|| \'');
console.log('INDEX:', idx);
if (idx !== -1) {
  const slice = str.slice(idx, idx + 20);
  console.log(slice);
  console.log(Buffer.from(slice, 'latin1'));
}
