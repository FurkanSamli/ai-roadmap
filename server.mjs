// Local server: serves the site and saves progress in a small database inside the project.
// No dependencies. Uses Node's built-in SQLite (Node 22.13+) and falls back to a JSON file
// when node:sqlite is not available.
//
//   npm run dev                      → http://localhost:5174, data in data/progress.db
//   PORT=8080 npm run dev            → another port
//   DATA_DIR=~/Dropbox/ai npm run dev → keep the database somewhere else (e.g. a synced folder)
//
// API (same origin only):
//   GET /api/state  → { storage, file, st, nt, ck, ...meta }
//   PUT /api/state  ← { st, nt, ck, ...meta }   (the whole state; the server works out what changed)

import { createServer } from 'node:http';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve, extname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_PORT = 5174;
const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(process.env.PORT) || DEFAULT_PORT;
const DATA_DIR = resolve(process.env.DATA_DIR || join(ROOT, 'data'));
const MAX_BODY = 5 * 1024 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp',
  '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }

/* ---------- Storage ---------- */

const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const okKey = (k) => typeof k === 'string' && k.length > 0 && k.length <= 300;
const COLLECTIONS = ['st', 'nt', 'ck'];

// Keeps only well-formed data: statuses 1-3, non-empty notes, ticked checklist items,
// and simple top-level values (e.g. "intro") as metadata.
function clean(o) {
  if (!isObj(o)) throw new HttpError(400, 'expected a JSON object');
  const out = { st: {}, nt: {}, ck: {}, meta: {} };
  for (const [k, v] of Object.entries(isObj(o.st) ? o.st : {})) if (okKey(k) && [1, 2, 3].includes(v)) out.st[k] = v;
  for (const [k, v] of Object.entries(isObj(o.nt) ? o.nt : {})) if (okKey(k) && typeof v === 'string' && v.trim()) out.nt[k] = v;
  for (const [k, items] of Object.entries(isObj(o.ck) ? o.ck : {})) {
    if (!okKey(k) || !isObj(items)) continue;
    for (const [i, v] of Object.entries(items)) if (okKey(i) && v === true) (out.ck[k] ||= {})[i] = true;
  }
  for (const [k, v] of Object.entries(o)) {
    if (COLLECTIONS.includes(k) || k.startsWith('_') || !okKey(k)) continue;
    if (['string', 'number', 'boolean'].includes(typeof v)) out.meta[k] = v;
  }
  return out;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS status (topic_id TEXT PRIMARY KEY, value INTEGER NOT NULL, updated_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS notes (topic_id TEXT PRIMARY KEY, body TEXT NOT NULL, updated_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS checks (topic_id TEXT NOT NULL, item TEXT NOT NULL, PRIMARY KEY (topic_id, item));
  CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  -- every status change, for a future learning log / progress chart (value 0 = cleared)
  CREATE TABLE IF NOT EXISTS status_log (id INTEGER PRIMARY KEY AUTOINCREMENT, topic_id TEXT NOT NULL, value INTEGER NOT NULL, at TEXT NOT NULL);
`;

function sqliteStore(DatabaseSync, file) {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL;' + SCHEMA + 'PRAGMA user_version = 1;');
  const q = {
    status: db.prepare('SELECT topic_id, value FROM status'),
    notes: db.prepare('SELECT topic_id, body FROM notes'),
    checks: db.prepare('SELECT topic_id, item FROM checks'),
    meta: db.prepare('SELECT key, value FROM meta'),
    setStatus: db.prepare('INSERT INTO status (topic_id, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(topic_id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'),
    delStatus: db.prepare('DELETE FROM status WHERE topic_id = ?'),
    log: db.prepare('INSERT INTO status_log (topic_id, value, at) VALUES (?, ?, ?)'),
    setNote: db.prepare('INSERT INTO notes (topic_id, body, updated_at) VALUES (?, ?, ?) ON CONFLICT(topic_id) DO UPDATE SET body = excluded.body, updated_at = excluded.updated_at'),
    delNote: db.prepare('DELETE FROM notes WHERE topic_id = ?'),
    addCheck: db.prepare('INSERT INTO checks (topic_id, item) VALUES (?, ?)'),
    setMeta: db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)'),
  };
  const load = () => {
    const out = { st: {}, nt: {}, ck: {} };
    for (const r of q.meta.all()) out[r.key] = JSON.parse(r.value);
    for (const r of q.status.all()) out.st[r.topic_id] = r.value;
    for (const r of q.notes.all()) out.nt[r.topic_id] = r.body;
    for (const r of q.checks.all()) (out.ck[r.topic_id] ||= {})[r.item] = true;
    return out;
  };
  const save = (s) => {
    const now = new Date().toISOString();
    const old = load();
    db.exec('BEGIN');
    try {
      for (const [k, v] of Object.entries(s.st)) if (old.st[k] !== v) { q.setStatus.run(k, v, now); q.log.run(k, v, now); }
      for (const k of Object.keys(old.st)) if (!(k in s.st)) { q.delStatus.run(k); q.log.run(k, 0, now); }
      for (const [k, v] of Object.entries(s.nt)) if (old.nt[k] !== v) q.setNote.run(k, v, now);
      for (const k of Object.keys(old.nt)) if (!(k in s.nt)) q.delNote.run(k);
      db.exec('DELETE FROM checks');
      for (const [k, items] of Object.entries(s.ck)) for (const i of Object.keys(items)) q.addCheck.run(k, i);
      db.exec('DELETE FROM meta');
      for (const [k, v] of Object.entries(s.meta)) q.setMeta.run(k, JSON.stringify(v));
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
    return now;
  };
  return { kind: 'sqlite', file, load, save };
}

function jsonStore(file) {
  let data = { st: {}, nt: {}, ck: {} };
  if (existsSync(file)) data = JSON.parse(readFileSync(file, 'utf8'));
  return {
    kind: 'json', file,
    load: () => data,
    save: (s) => {
      data = { ...s.meta, st: s.st, nt: s.nt, ck: s.ck };
      const tmp = file + '.tmp';
      // write to a temp file first so a crash never leaves a half-written file
      return writeFile(tmp, JSON.stringify(data, null, 1)).then(() => rename(tmp, file)).then(() => new Date().toISOString());
    },
  };
}

async function openStore() {
  await mkdir(DATA_DIR, { recursive: true });
  let sqlite = null;
  try { sqlite = await import('node:sqlite'); } catch (err) { /* older Node: use a JSON file */ }
  return sqlite ? sqliteStore(sqlite.DatabaseSync, join(DATA_DIR, 'progress.db')) : jsonStore(join(DATA_DIR, 'progress.json'));
}

/* ---------- HTTP ---------- */

function send(res, status, body, type) {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(body);
}
const sendJson = (res, status, obj) => send(res, status, JSON.stringify(obj), 'application/json; charset=utf-8');

function readBody(req) {
  return new Promise((ok, fail) => {
    let size = 0;
    const parts = [];
    req.on('data', (c) => { size += c.length; if (size > MAX_BODY) { fail(new HttpError(413, 'body too large')); req.destroy(); } else parts.push(c); });
    req.on('end', () => ok(Buffer.concat(parts).toString('utf8')));
    req.on('error', fail);
  });
}

// Only this page may use the API: blocks other websites (Origin) and DNS rebinding (Host).
function checkCaller(req) {
  const host = (req.headers.host || '').replace(/:\d+$/, '');
  if (!['localhost', '127.0.0.1', '[::1]'].includes(host)) throw new HttpError(403, 'unexpected host');
  const origin = req.headers.origin;
  if (origin && origin !== `http://${req.headers.host}`) throw new HttpError(403, 'cross-origin request');
}

async function serveFile(req, res, pathname) {
  let rel = decodeURIComponent(pathname).replace(/^\/+/, '') || 'index.html';
  if (rel.endsWith('/')) rel += 'index.html';
  const file = resolve(ROOT, rel);
  const inside = file.startsWith(ROOT.endsWith(sep) ? ROOT : ROOT + sep);
  // never serve the database, dotfiles (.git, .claude) or anything outside the project
  if (!inside || rel.split('/').some((p) => p.startsWith('.')) || file.startsWith(DATA_DIR + sep) || file.startsWith(join(ROOT, 'node_modules'))) {
    throw new HttpError(404, 'not found');
  }
  let body;
  try { body = await readFile(file); } catch (err) { throw new HttpError(404, 'not found'); }
  send(res, 200, req.method === 'HEAD' ? undefined : body, MIME[extname(file).toLowerCase()] || 'application/octet-stream');
}

const store = await openStore();
const shown = relative(ROOT, store.file).startsWith('..') ? store.file : relative(ROOT, store.file);

async function handle(req, res) {
  try {
    const { pathname } = new URL(req.url, 'http://localhost');
    if (pathname === '/api/state') {
      checkCaller(req);
      if (req.method === 'GET') return sendJson(res, 200, { storage: store.kind, file: shown, ...store.load() });
      if (req.method === 'PUT') {
        if (!(req.headers['content-type'] || '').startsWith('application/json')) throw new HttpError(415, 'expected application/json');
        let parsed;
        try { parsed = JSON.parse(await readBody(req)); } catch (err) { throw err instanceof HttpError ? err : new HttpError(400, 'invalid JSON'); }
        const savedAt = await store.save(clean(parsed));
        return sendJson(res, 200, { ok: true, savedAt });
      }
      throw new HttpError(405, 'method not allowed');
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'method not allowed');
    await serveFile(req, res, pathname);
  } catch (err) {
    if (!err.status) console.error(err);
    if (!res.headersSent) sendJson(res, err.status || 500, { error: err.status ? err.message : 'server error' });
  }
}

// "localhost" may resolve to IPv4 or IPv6, so listen on both loopback addresses
// (only this computer can connect; set HOST to change that).
const hosts = process.env.HOST ? [process.env.HOST] : ['127.0.0.1', '::1'];
let up = 0;
hosts.forEach((h, i) => {
  const srv = createServer(handle);
  srv.on('error', (err) => {
    if (i > 0 && err.code === 'EADDRNOTAVAIL') return; // no IPv6 on this machine
    console.error(err.code === 'EADDRINUSE' ? `Port ${PORT} is already in use. Stop the other server or run: PORT=${PORT + 10} npm run dev` : err.message);
    process.exit(1);
  });
  srv.listen(PORT, h, () => {
    if (up++) return;
    console.log(`\n  Running at  http://localhost:${PORT}`);
    console.log(`  Progress    ${shown} (${store.kind === 'sqlite' ? 'SQLite' : 'JSON file'})`);
    console.log('  Stop with   Ctrl+C\n');
  });
});
