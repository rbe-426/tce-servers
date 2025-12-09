const http = require('http');
http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.writeHead(200);
  res.end('OK');
}).listen(process.env.PORT || 8081);
