/**
 * Single-port server for the application catalog.
 *
 * Everything — the page and the test API — is served from one port (3000 by
 * default), so the browser never talks to a second origin and no proxying is
 * involved.
 *
 *   development (`npm run dev`)   Vite runs as middleware of this server,
 *                                 including its HMR websocket.
 *   production  (`npm start`)     the built page in `dist/` is served
 *                                 statically, with SPA fallback to index.html.
 *
 * In both modes `server/public/` (the application icons) is served directly
 * from disk, ahead of the page, so those assets never go through the bundler.
 *
 * API:
 *
 *   GET /api/sets
 *     -> { "sets": ["default", "developer", "media", "empty"] }
 *
 *   GET /api/applications[?set=<name>][&delay=<ms>][&fail=1]
 *     -> [ { ... }, ... ]              (a bare array of entries)
 *
 *   GET /api/applications/<slug>
 *     -> { "application": { ... } }   (looked up across all sets)
 *
 *   GET /api/admin/preset            development only, 404 in production
 *     -> { "activePreset": "default", "presets": [...] }
 *   PUT /api/admin/preset  { "preset": "developer" }
 *     -> { "activePreset": "developer", "presets": [...] }
 *
 * The active preset is what `/api/applications` serves when no `?set=` is
 * given; it is changed from the dev-only admin page at /admin.html.
 *
 * Every application's `icon` is a root-relative path to an image served by
 * this same server from `server/public/`, e.g. /icons/mail.svg
 *
 * An entry's `main` is where choosing it takes the user. In this test server
 * those point at the stand-in pages under /launch/<slug>; a real board points
 * them at each application's own URL.
 *
 *   set=random  picks one of the non-empty sets on every request,
 *   delay=<ms>  slows the response down so the loading state is visible,
 *   fail=1      responds with 500 so the error state can be tested.
 */

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applicationSets, findApplication, setNames } from './data.js';
import { resolveBaseUrl, stripBaseUrl, toViteBase, withBaseUrl } from './base-url.js';

const PORT = Number(process.env.PORT) || 3000;
/** '' or '/prefix' — see server/base-url.js. */
const BASE_URL = resolveBaseUrl();
const MAX_DELAY_MS = 10_000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const ROOT = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const DIST = path.join(ROOT, 'dist');
/** Server-owned assets (icons). Served straight from disk, never bundled. */
const SERVER_PUBLIC = path.join(ROOT, 'server', 'public');

/**
 * The admin API exists wherever the admin page does: always in dev, and in a
 * `npm run build:dev` artifact, which — unlike `npm run build` — includes
 * admin.html. A production build has neither.
 */
const ADMIN_ENABLED = !IS_PRODUCTION || fs.existsSync(path.join(DIST, 'admin.html'));

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function sendJson(res, status, body) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

/**
 * Preset served to the page when no explicit `?set=` is given. Changed from
 * the dev-only admin page; `random` re-rolls on every request.
 */
let activePreset = 'default';

function pickRandomSet() {
  const candidates = setNames.filter((name) => applicationSets[name].length > 0);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/** True for `https://…`, `//host/…` — links that are not ours to prefix. */
const isAbsoluteUrl = (link) => /^[a-z][a-z0-9+.-]*:/i.test(link) || link.startsWith('//');

/**
 * Shapes an entry for the API: the internal `id` is dropped, and icon and
 * `main` paths — stored base-less — are prefixed with the base URL. A `main`
 * pointing at another origin is left exactly as it is.
 */
function toEntry({ id: _id, ...application }) {
  const entry = { ...application, icon: withBaseUrl(BASE_URL, application.icon) };
  if (entry.main && !isAbsoluteUrl(entry.main)) {
    entry.main = withBaseUrl(BASE_URL, entry.main);
  }
  return entry;
}

function handleApplications(url, res) {
  const requested = url.searchParams.get('set') || activePreset;
  const setName = requested === 'random' ? pickRandomSet() : requested;
  const applications = applicationSets[setName];

  if (!applications) {
    sendJson(res, 404, {
      error: `Unknown application set "${requested}"`,
      availableSets: setNames,
    });
    return;
  }

  if (url.searchParams.get('fail') === '1') {
    sendJson(res, 500, { error: 'Simulated server failure' });
    return;
  }

  sendJson(res, 200, applications.map(toEntry));
}

function handleApplicationDetail(id, res) {
  const application = findApplication(id);
  if (!application) {
    sendJson(res, 404, { error: `Unknown application "${id}"` });
    return;
  }
  sendJson(res, 200, { application: toEntry(application) });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('error', reject);
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Request body is not valid JSON'));
      }
    });
  });
}

/** Dev-only: reads or changes the preset the page is served. */
async function handleAdminPreset(req, res) {
  const presets = [...setNames, 'random'];

  if (req.method === 'GET') {
    sendJson(res, 200, { activePreset, presets });
    return;
  }

  if (req.method !== 'PUT') {
    sendJson(res, 405, { error: `Method ${req.method} not allowed` });
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (cause) {
    sendJson(res, 400, { error: cause.message });
    return;
  }

  if (!presets.includes(body.preset)) {
    sendJson(res, 400, { error: `Unknown preset "${body.preset}"`, presets });
    return;
  }

  activePreset = body.preset;
  console.log(`active preset -> ${activePreset}`);
  sendJson(res, 200, { activePreset, presets });
}

/**
 * Routes an `/api/...` request. `route` is the request path with the base URL
 * prefix removed. Returns false if the path is not an API route.
 */
function handleApi(req, route, url, res) {
  const readOnly = req.method === 'GET';

  if (route === '/api/admin/preset') {
    if (!ADMIN_ENABLED) {
      sendJson(res, 404, { error: 'Admin API is available in development only' });
      return true;
    }
    handleAdminPreset(req, res);
    return true;
  }

  if (!readOnly) {
    sendJson(res, 405, { error: `Method ${req.method} not allowed` });
    return true;
  }

  switch (route) {
    case '/api/sets':
      sendJson(res, 200, { sets: setNames });
      return true;
    case '/api/applications':
      handleApplications(url, res);
      return true;
    default: {
      const detail = /^\/api\/applications\/([^/]+)\/?$/.exec(route);
      if (detail) {
        handleApplicationDetail(decodeURIComponent(detail[1]), res);
        return true;
      }
      if (route.startsWith('/api/')) {
        sendJson(res, 404, { error: `No route for ${route}` });
        return true;
      }
      return false;
    }
  }
}

/** Resolves `pathname` inside `baseDir`, or null if it is not a file in there. */
function resolveFile(baseDir, pathname) {
  const candidate = path.join(baseDir, path.normalize(decodeURIComponent(pathname)));
  const isInside = candidate === baseDir || candidate.startsWith(baseDir + path.sep);
  if (!isInside || !fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) return null;
  return candidate;
}

function sendNotFound(pathname, res) {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(`Not found: ${pathname}`);
}

function sendFile(file, res, cacheControl) {
  res.writeHead(200, {
    'Content-Type': MIME_TYPES[path.extname(file)] ?? 'application/octet-stream',
    'Cache-Control': cacheControl,
  });
  fs.createReadStream(file).pipe(res);
}

// Top-level names in server/public (`/icons`, …). Those URL prefixes belong to
// the server, so a miss under them is a 404 instead of falling through to the
// page — in dev that also keeps Vite's SPA fallback out of the way.
const SERVER_ASSET_PREFIXES = fs.existsSync(SERVER_PUBLIC)
  ? fs.readdirSync(SERVER_PUBLIC).map((name) => `/${name}`)
  : [];

/** Serves icons and other server-owned assets from `server/public/`. */
function serveServerAsset(route, res) {
  const file = resolveFile(SERVER_PUBLIC, route);
  if (file) {
    sendFile(file, res, 'public, max-age=3600');
    return true;
  }

  const owned = SERVER_ASSET_PREFIXES.some(
    (prefix) => route === prefix || route.startsWith(`${prefix}/`),
  );
  if (owned) {
    sendNotFound(route, res);
    return true;
  }

  return false;
}

const escapeHtml = (text) =>
  text.replace(/[&<>"]/g, (char) => `&#${char.charCodeAt(0)};`);

/**
 * Stand-in for a real application, so that following an entry's `main` link
 * lands somewhere in the test server instead of falling through to the board
 * itself. Nothing in the page depends on this: a real board points `main` at
 * the application's own URL and never serves it.
 */
function serveLaunchPage(slug, res) {
  const application = findApplication(slug);
  if (!application) {
    sendNotFound(`/launch/${slug}`, res);
    return;
  }

  const title = escapeHtml(application.title);
  const version = application.version ? ` ${escapeHtml(application.version)}` : '';
  const body = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      body { margin: 0; display: grid; place-items: center; min-height: 100vh;
             font-family: system-ui, sans-serif; background: #14161a; color: #e8eaed; }
      main { text-align: center; }
      p { color: #9aa0a6; }
      a { color: #7aa2f7; }
    </style>
  </head>
  <body>
    <main>
      <h1>${title}${version}</h1>
      <p>Stand-in for the real application.</p>
      <p><a href="${withBaseUrl(BASE_URL, '/')}">← Back to the board</a></p>
    </main>
  </body>
</html>
`;
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

/** `index-D_vIqwqE.css` — a Vite-fingerprinted filename, safe to cache forever. */
const FINGERPRINTED = /-[A-Za-z0-9_-]{8}\.[A-Za-z0-9]+$/;

/**
 * The HTML entries and manifest.json point at the current hashes, so they must
 * stay fresh; fingerprinted assets never change; anything else (favicon.svg
 * and other unhashed files) gets a modest TTL.
 */
function cacheControlFor(file) {
  const name = path.basename(file);
  if (path.extname(name) === '.html' || name === 'manifest.json') return 'no-store';
  return FINGERPRINTED.test(name) ? 'public, max-age=31536000, immutable' : 'public, max-age=3600';
}

/** Serves the built page from `dist/`, falling back to index.html for client routes. */
function serveApp(route, res) {
  const asset = resolveFile(DIST, route);

  // Only client routes fall back to index.html; a missing file with an
  // extension (an icon, say) is a 404 rather than a page of HTML.
  if (!asset && path.extname(route)) {
    sendNotFound(route, res);
    return;
  }

  const file = asset ?? path.join(DIST, 'index.html');

  if (!fs.existsSync(file)) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('No production build found. Run `npm run build` first.');
    return;
  }

  sendFile(file, res, cacheControlFor(file));
}

let viteMiddlewares;

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

  // Everything below routes on the path with the base prefix removed.
  const route = stripBaseUrl(BASE_URL, url.pathname);
  if (route === null) {
    // Outside the base URL: point the site root at it, 404 anything else.
    if (url.pathname === '/') {
      res.writeHead(302, { Location: `${BASE_URL}/` });
      res.end();
      return;
    }
    sendNotFound(url.pathname, res);
    return;
  }

  if (route.startsWith('/api/')) {
    // Only reads are delayed; a delayed write would risk losing its body.
    const delay =
      req.method === 'GET'
        ? Math.min(Number(url.searchParams.get('delay')) || 0, MAX_DELAY_MS)
        : 0;
    if (delay > 0) {
      setTimeout(() => handleApi(req, route, url, res), delay);
    } else {
      handleApi(req, route, url, res);
    }
    return;
  }

  // Icons live with the server, so they are served the same way in dev and in
  // production — they are never part of the Vite build.
  if (serveServerAsset(route, res)) return;

  // Stand-in application pages — test-server only, see serveLaunchPage.
  const launch = /^\/launch\/([^/]+)\/?$/.exec(route);
  if (launch) {
    serveLaunchPage(decodeURIComponent(launch[1]), res);
    return;
  }

  // manifest.json is produced by the build, so it is answered from dist/ even
  // in dev — otherwise Vite's SPA fallback would return the page instead.
  if (route === '/manifest.json') {
    serveApp(route, res);
    return;
  }

  // Vite is configured with the same base, so it gets the untouched request.
  if (viteMiddlewares) {
    viteMiddlewares(req, res, () => serveApp(route, res));
    return;
  }

  serveApp(route, res);
});

if (!IS_PRODUCTION) {
  // Dev only: run Vite inside this server so the page, the API and the HMR
  // websocket all share a single port.
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    root: ROOT,
    base: toViteBase(BASE_URL),
    appType: 'spa',
    server: {
      middlewareMode: true,
      hmr: { server },
    },
  });
  viteMiddlewares = vite.middlewares;
}

server.listen(PORT, () => {
  const mode = IS_PRODUCTION ? 'production (dist/)' : 'development (vite middleware)';
  const origin = `http://localhost:${PORT}${BASE_URL}`;
  console.log(`Application catalog on ${origin}/  —  ${mode}`);
  console.log(`  base url: ${BASE_URL || '/'}`);
  console.log(`  application sets: ${setNames.join(', ')}`);
  console.log(`  admin page: ${ADMIN_ENABLED ? `${origin}/admin.html` : 'disabled'}`);
});
