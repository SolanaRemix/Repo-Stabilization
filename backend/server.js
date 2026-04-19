'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { URL } = require('node:url');
const { MODULE_NAMES, MODULE_ORDER, runPipeline } = require('./repo-brain-modules');

const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sendJson(res, statusCode, payload) {
  const body = stableJson(payload);
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

async function readJsonBody(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1024 * 1024) throw new Error('Request body exceeds 1MB limit');
  }
  if (!raw) return {};
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('JSON body must be an object');
  }
  return parsed;
}

function resolveStaticPath(rootDir, pathname) {
  const safePath = decodeURIComponent(pathname);
  const normalized = path.posix.normalize(safePath);
  if (normalized.includes('..')) return null;

  let resolved = path.join(rootDir, normalized);
  if (safePath.endsWith('/')) resolved = path.join(rootDir, normalized, 'index.html');
  if (safePath === '/') resolved = path.join(rootDir, 'index.html');
  return resolved;
}

function serveStaticFile(rootDir, req, res, pathname) {
  const filePath = resolveStaticPath(rootDir, pathname);
  if (!filePath || !filePath.startsWith(rootDir)) {
    sendJson(res, 400, { error: 'Invalid path' });
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  if (!pathname.endsWith('/')) {
    const candidate = path.join(rootDir, pathname, 'index.html');
    if (fs.existsSync(candidate)) {
      res.writeHead(308, { Location: `${pathname}/` });
      res.end();
      return;
    }
  }

  sendJson(res, 404, { error: 'Not found', path: pathname });
}

function createRepoBrainServer(options = {}) {
  const rootDir = path.resolve(options.rootDir || path.join(__dirname, '..'));

  return http.createServer(async (req, res) => {
    const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = reqUrl.pathname;

    try {
      if (req.method === 'GET' && pathname === '/healthz') {
        sendJson(res, 200, { status: 'ok', service: 'repo-brain' });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/modules') {
        sendJson(res, 200, {
          modules: MODULE_ORDER.map((id) => ({ id, name: MODULE_NAMES[id] }))
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/pipeline/run') {
        const body = await readJsonBody(req);
        const result = runPipeline({
          repoPath: typeof body.repoPath === 'string' ? body.repoPath : rootDir,
          modules: Array.isArray(body.modules) ? body.modules : MODULE_ORDER
        });
        sendJson(res, 200, result);
        return;
      }

      serveStaticFile(rootDir, req, res, pathname);
    } catch (error) {
      sendJson(res, 500, {
        error: 'Repo-Brain service error',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
}

function startServer() {
  const port = Number(process.env.PORT || 4173);
  const host = process.env.HOST || '0.0.0.0';
  const server = createRepoBrainServer();
  server.listen(port, host, () => {
    process.stdout.write(`Repo-Brain full app running at http://${host}:${port}\n`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = {
  createRepoBrainServer,
  startServer
};
