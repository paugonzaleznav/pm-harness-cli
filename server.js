const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT      = 3000;
const STATIC    = path.join(__dirname, 'pm-harness');
const SPECS_DIR = path.join(__dirname, 'pm-specs');

if (!fs.existsSync(SPECS_DIR)) fs.mkdirSync(SPECS_DIR, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.ico':  'image/x-icon',
};

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // POST /api/save — write a markdown file into pm-specs/
  if (req.method === 'POST' && req.url === '/api/save') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { filename, content } = JSON.parse(body);
        const safe = path.basename(filename);
        if (!safe || safe !== filename || !safe.endsWith('.md')) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Invalid filename' }));
          return;
        }
        fs.writeFileSync(path.join(SPECS_DIR, safe), content, 'utf8');
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Serve static files from pm-harness/
  const url      = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.join(STATIC, url);

  // Prevent path traversal outside STATIC
  if (!filePath.startsWith(STATIC)) { res.writeHead(403); res.end(); return; }

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  });

}).listen(PORT, () => {
  console.log(`PM Harness  →  http://localhost:${PORT}`);
  console.log(`Specs       →  pm-specs/`);
});
