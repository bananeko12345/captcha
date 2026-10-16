const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = __dirname;
const challenges = new Map();
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 誤読しやすい I/O/0/1 を除外
const TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function randomText(length = 6) {
  const bytes = crypto.randomBytes(length);
  return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('');
}

function escapeXml(value) {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
}

function challengeSvg(text) {
  const lines = Array.from({ length: 14 }, (_, i) => {
    const x1 = (i * 41) % 320;
    const y1 = 12 + ((i * 29) % 78);
    const x2 = 20 + ((i * 67) % 300);
    const y2 = 8 + ((i * 47) % 95);
    return `<path d="M${x1} ${y1} Q${(x1 + x2) / 2} ${100 - y1} ${x2} ${y2}"/>`;
  }).join('');
  const dots = Array.from({ length: 70 }, (_, i) => {
    const x = (i * 47) % 320;
    const y = (i * 31) % 110;
    return `<circle cx="${x}" cy="${y}" r="${i % 3 === 0 ? 1.6 : 1}"/>`;
  }).join('');
  const chars = [...text].map((char, i) => {
    const x = 37 + i * 43;
    const y = 76 + ((i % 2) ? -4 : 3);
    const rotate = (i % 3 - 1) * 11;
    return `<text x="${x}" y="${y}" transform="rotate(${rotate} ${x} ${y})">${char}</text>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="110" viewBox="0 0 320 110" role="img" aria-label="CAPTCHA画像">
    <rect width="320" height="110" rx="8" fill="#f5f7fb"/>
    <g fill="#8c9bb3" opacity=".5">${dots}</g>
    <g fill="none" stroke="#5878b4" stroke-width="1.7" opacity=".62">${lines}</g>
    <g fill="#172b4d" font-family="Arial,sans-serif" font-size="44" font-weight="700" letter-spacing="2">${chars}</g>
  </svg>`;
}

function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(data) });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 10_000) reject(new Error('payload too large'));
    });
    req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { reject(new Error('invalid json')); } });
    req.on('error', reject);
  });
}

function cleanup() {
  const now = Date.now();
  for (const [id, item] of challenges) if (item.expiresAt < now) challenges.delete(id);
}
setInterval(cleanup, 60_000).unref();

function serveStatic(req, res) {
  const requested = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const file = path.resolve(PUBLIC_DIR, `.${requested}`);
  if (!file.startsWith(path.resolve(PUBLIC_DIR)) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); return res.end('Not found');
  }
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/api/captcha/challenge') {
      const id = crypto.randomUUID();
      const text = randomText(6);
      challenges.set(id, { answer: text, expiresAt: Date.now() + TTL_MS, attempts: 0 });
      const image = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(challengeSvg(text))}`;
      return json(res, 200, { id, image, expiresIn: TTL_MS / 1000 });
    }
    if (req.method === 'POST' && req.url === '/api/captcha/verify') {
      const body = await readBody(req);
      const item = challenges.get(String(body.id || ''));
      const answer = String(body.answer || '').trim().toUpperCase();
      if (!item || item.expiresAt < Date.now()) return json(res, 400, { ok: false, message: 'チャレンジの有効期限が切れています。更新してください。' });
      item.attempts += 1;
      if (item.attempts > MAX_ATTEMPTS) {
        challenges.delete(String(body.id));
        return json(res, 429, { ok: false, message: '試行回数を超えました。新しい画像を取得してください。' });
      }
      if (answer.length !== item.answer.length || !crypto.timingSafeEqual(Buffer.from(answer), Buffer.from(item.answer))) {
        return json(res, 400, { ok: false, message: '文字が一致しません。画像を確認してください。', remaining: MAX_ATTEMPTS - item.attempts });
      }
      challenges.delete(String(body.id)); // ワンタイム利用
      return json(res, 200, { ok: true });
    }
    if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(req, res);
    json(res, 405, { error: 'method not allowed' });
  } catch (error) {
    json(res, 400, { error: error.message || 'bad request' });
  }
});

server.listen(PORT, '0.0.0.0', () => console.log(`CAPTCHA demo: http://localhost:${PORT}`));
