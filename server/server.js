import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, 'public');
/** Racine du module TizenViewer (parent de server/), pour héberger package.json + dist/ (TizenBrew). */
const MODULE_ROOT = path.join(__dirname, '..');
const PORT = Number(process.env.TIZENVIEWER_PORT || 9350);

let nonce = 0;
let targetUrl = '';

function normalizeUrl(input) {
  const s = String(input || '').trim();
  if (!s) return null;
  let u;
  try {
    u = new URL(s);
  } catch {
    try {
      u = new URL('https://' + s);
    } catch {
      return null;
    }
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  return u.href;
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.ico': 'image/x-icon',
    '.png': 'image/png',
    '.svg': 'image/svg+xml'
  };
  return map[ext] || 'application/octet-stream';
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function serveStatic(res, relPath) {
  const safe = path.normalize(relPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = path.join(PUBLIC, safe);
  if (!filePath.startsWith(PUBLIC)) {
    sendJson(res, 403, { error: 'Interdit' });
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Non trouvé');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType(filePath) });
    res.end(data);
  });
}

function isAllowedModuleRel(relPosix) {
  if (relPosix === 'package.json') return true;
  return relPosix === 'dist' || relPosix.startsWith('dist/');
}

function serveModuleAsset(res, relFromModuleRoot) {
  const decoded = decodeURIComponent(relFromModuleRoot);
  const safe = path.normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = path.resolve(MODULE_ROOT, safe);
  const rootResolved = path.resolve(MODULE_ROOT);
  const relToRoot = path.relative(rootResolved, filePath);
  if (relToRoot.startsWith('..') || path.isAbsolute(relToRoot)) {
    sendJson(res, 403, { error: 'Interdit' });
    return;
  }
  const relPosix = relToRoot.split(path.sep).join('/');
  if (!isAllowedModuleRel(relPosix)) {
    sendJson(res, 403, { error: 'Interdit' });
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Non trouvé');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType(filePath) });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url || '/', 'http://127.0.0.1');

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  if (u.pathname === '/api/state' && req.method === 'GET') {
    sendJson(res, 200, { targetUrl, nonce });
    return;
  }

  if (u.pathname === '/api/navigate' && req.method === 'POST') {
    try {
      const raw = await readBody(req);
      const json = JSON.parse(raw || '{}');
      const next = normalizeUrl(json.url);
      if (!next) {
        sendJson(res, 400, { error: 'URL invalide (http ou https uniquement)' });
        return;
      }
      targetUrl = next;
      nonce += 1;
      sendJson(res, 200, { ok: true, targetUrl, nonce });
    } catch {
      sendJson(res, 400, { error: 'Corps JSON invalide' });
    }
    return;
  }

  if (u.pathname === '/api/clear' && req.method === 'POST') {
    targetUrl = '';
    nonce += 1;
    sendJson(res, 200, { ok: true, targetUrl: '', nonce });
    return;
  }

  if (req.method === 'GET') {
    if (u.pathname === '/package.json') {
      serveModuleAsset(res, 'package.json');
      return;
    }
    if (u.pathname.startsWith('/dist/')) {
      serveModuleAsset(res, u.pathname.replace(/^\//, ''));
      return;
    }
    if (u.pathname === '/' || u.pathname === '') {
      serveStatic(res, 'index.html');
      return;
    }
    if (u.pathname === '/phone' || u.pathname === '/phone/') {
      res.writeHead(302, { Location: '/phone.html' });
      res.end();
      return;
    }
    if (u.pathname === '/preview' || u.pathname === '/preview/') {
      res.writeHead(302, { Location: '/?bundle=1' });
      res.end();
      return;
    }
    const rel = u.pathname.replace(/^\//, '');
    serveStatic(res, rel);
    return;
  }

  res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Méthode non autorisée');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('TizenViewer serveur sur le port ' + PORT);
  console.log('Page TV       : http://<IP-LAN>:' + PORT + '/');
  console.log('TizenBrew URL : http://<IP-LAN>:' + PORT + '/  (package.json + /dist/)');
  console.log('Téléphone     : http://<IP-LAN>:' + PORT + '/phone.html');
  console.log('Test navigateur : http://<IP-LAN>:' + PORT + '/preview  (redirige vers ?bundle=1)');
});
