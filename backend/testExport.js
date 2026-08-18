const http = require('http');

async function testExport() {
  const loginData = JSON.stringify({ account: 'admin', password: 'admin123' });
  const loginReq = http.request({
    hostname: 'localhost', port: 3001, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': loginData.length }
  }, (res) => {
    let body = '';
    res.on('data', c => body += c);
    res.on('end', () => {
      const token = JSON.parse(body).token;
      console.log('Login successful');
      
      const exportReq = http.request({
        hostname: 'localhost', port: 3001, path: '/api/labor-reports/90126f57-c609-4a7b-87ef-5ba5688a256b/export',
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      }, (res2) => {
        let exportBody = [];
        res2.on('data', c => exportBody.push(c));
        res2.on('end', () => {
          const buffer = Buffer.concat(exportBody);
          console.log('Status:', res2.statusCode);
          if (res2.statusCode !== 200) console.log(buffer.toString());
          else console.log('Length:', buffer.length);
        });
      });
      exportReq.end();
    });
  });
  loginReq.write(loginData);
  loginReq.end();
}
testExport();
