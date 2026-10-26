import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DomainError } from '../domain/errors.js';
import { createRouter } from './router.js';

const MIME_TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
});

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

function publicPathFrom(publicDir) {
  return publicDir instanceof URL ? fileURLToPath(publicDir) : path.resolve(publicDir);
}

async function readJsonBody(request) {
  if (!request.headers['content-type']?.toLowerCase().includes('application/json')) return;
  let raw = '';
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 1_000_000) {
      throw new DomainError('BAD_REQUEST', 'Request body is too large');
    }
  }
  if (!raw.trim()) return;
  try {
    request.body = JSON.parse(raw);
  } catch {
    const error = new SyntaxError('Invalid JSON request body');
    error.code = 'INVALID_JSON';
    throw error;
  }
}

async function serveStatic(response, pathname, publicDir) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    throw new DomainError('BAD_REQUEST', 'Invalid URL path encoding');
  }
  if (decoded.includes('\0') || decoded.includes('\\')) {
    throw new DomainError('NOT_FOUND', 'File not found');
  }

  const root = await realpath(publicDir);
  const relative = decoded.replace(/^\/+/, '') || 'index.html';
  const candidate = path.resolve(root, relative);
  if (candidate !== root && !candidate.startsWith(root + path.sep)) {
    throw new DomainError('NOT_FOUND', 'File not found');
  }

  let actual;
  try {
    actual = await realpath(candidate);
  } catch {
    throw new DomainError('NOT_FOUND', 'File not found');
  }
  if (actual !== root && !actual.startsWith(root + path.sep)) {
    throw new DomainError('NOT_FOUND', 'File not found');
  }

  const info = await stat(actual);
  if (!info.isFile()) throw new DomainError('NOT_FOUND', 'File not found');
  const content = await readFile(actual);
  const type = MIME_TYPES[path.extname(actual).toLowerCase()] ?? 'application/octet-stream';
  response.writeHead(200, { 'content-type': type, 'content-length': content.length });
  response.end(content);
}

export function createApp({ publicDir = new URL('../../public/', import.meta.url), router = createRouter() } = {}) {
  router.add('GET', '/health', (_request, response) => {
    sendJson(response, 200, { status: 'ok' });
  });

  return createServer(async (request, response) => {
    try {
      await readJsonBody(request);
      const requestUrl = new URL(request.url ?? '/', 'http://localhost');
      const match = router.match(request.method ?? 'GET', requestUrl.pathname);

      if (match?.error === 'BAD_PATH_ENCODING') {
        return sendJson(response, 400, { error: { code: 'BAD_REQUEST', message: 'Invalid URL path encoding' } });
      }

      if (match) {
        await match.handler(request, response, { params: match.params, url: requestUrl });
        return;
      }

      if (requestUrl.pathname.startsWith('/api/')) {
        return sendJson(response, 404, { error: { code: 'NOT_FOUND', message: 'API route not found' } });
      }

      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return sendJson(response, 404, { error: { code: 'NOT_FOUND', message: 'Route not found' } });
      }

      await serveStatic(response, requestUrl.pathname, publicPathFrom(publicDir));
    } catch (error) {
      if (response.headersSent) {
        response.destroy();
        return;
      }
      if (error instanceof SyntaxError && error.code === 'INVALID_JSON') {
        return sendJson(response, 400, { error: { code: 'BAD_JSON', message: 'Request body must contain valid JSON' } });
      }
      if (error instanceof DomainError) {
        const status = error.code === 'NOT_FOUND' ? 404 :
          error.code === 'VALIDATION' || error.code === 'BAD_REQUEST' ? 400 :
          error.code === 'INVALID_TRANSITION' || error.code === 'INVALID_STATE' ? 409 : 500;
        return sendJson(response, status, { error: { code: error.code, message: error.message } });
      }
      return sendJson(response, 500, { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
    }
  });
}
