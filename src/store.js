// Progress, notes and checklist ticks live in the browser's localStorage.
// Format: { st: { [topicId]: 1 | 2 | 3 }, nt: { [id]: "note" }, ck: { [id]: { [itemKey]: true } } }
//   st: 1 = learning, 2 = learned, 3 = skipped (topics at 0 are not stored)

const KEY = 'ai-roadmap-v1';
export const LEARNING = 1, LEARNED = 2, SKIPPED = 3;

export const store = { st: {}, nt: {}, ck: {} };

const obj = (x) => (x && typeof x === 'object' ? x : {});

try {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    const o = JSON.parse(raw);
    if (o && typeof o === 'object') {
      store.st = obj(o.st); store.nt = obj(o.nt); store.ck = obj(o.ck);
    }
  }
} catch (e) { /* private window etc.: continue with empty state */ }

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* ignore */ }
}

export function st(n) { return store.st[n.id] || 0; }

export function setStatusValue(n, v) {
  if (v) store.st[n.id] = v; else delete store.st[n.id];
}

// Progress summary for every topic below an entity.
export function prog(e) {
  let d = 0, l = 0, s = 0;
  const a = e.all || [];
  for (let i = 0; i < a.length; i++) {
    const v = store.st[a[i].id];
    if (v === LEARNED) d++; else if (v === LEARNING) l++; else if (v === SKIPPED) s++;
  }
  return { d, l, s, t: a.length };
}

export function isChecked(id, key) { return !!(store.ck[id] && store.ck[id][key]); }

export function setChecked(id, key, on) {
  const c = store.ck[id] || (store.ck[id] = {});
  if (on) c[key] = true; else delete c[key];
  if (!Object.keys(c).length) delete store.ck[id];
  save();
}

export function exportBackup() {
  return JSON.stringify({ app: 'ai-roadmap', v: 1, savedAt: new Date().toISOString(), st: store.st, nt: store.nt, ck: store.ck }, null, 1);
}

// Loads a valid backup; throws if it is not one.
// Backups from AI Learning Tree (same topic ids, statuses 1-2) load too.
export function importBackup(text) {
  const o = JSON.parse(text);
  if (!o || typeof o !== 'object' || typeof o.st !== 'object') throw new Error('invalid');
  const st2 = {}, nt2 = {}, ck2 = {};
  let n = 0, m = 0;
  for (const k in o.st) { const v = +o.st[k]; if (v === 1 || v === 2 || v === 3) { st2[k] = v; n++; } }
  for (const j in obj(o.nt)) { if (typeof o.nt[j] === 'string' && o.nt[j].trim()) { nt2[j] = o.nt[j]; m++; } }
  for (const c in obj(o.ck)) { if (o.ck[c] && typeof o.ck[c] === 'object') ck2[c] = o.ck[c]; }
  store.st = st2; store.nt = nt2; store.ck = ck2; save();
  return { n, m };
}

export function resetAll() { store.st = {}; store.nt = {}; store.ck = {}; save(); }
