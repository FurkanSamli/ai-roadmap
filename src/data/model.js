// Parses content/*.txt into the roadmap data model.
// See docs/CONTENT_FORMAT.md for the file format.

import { fold } from '../util.js';
import { gById } from './groups.js';

export const model = {
  core: null,      // "Artificial Intelligence", the root of the roadmap
  branches: [],    // the 18 fields
  nodes: [],       // every topic, as a flat list
  byId: {},
  searchIdx: [],
  total: 0,
};

export function parseContent(src) {
  const branches = [];
  let stack = [], cur = null, last = null;
  src.split('\n').forEach((raw) => {
    if (!raw.trim()) return;
    if (raw.startsWith('## ')) {
      const p = raw.slice(3).split(' | ').map((s) => s.trim());
      cur = { kind: 'branch', group: p[0], id: p[1], t: p[2], short: p[3] || p[2], children: [], depth: -1, level: 0 };
      branches.push(cur); stack = [cur]; last = cur;
      return;
    }
    const m = raw.match(/^( *)([->?]) (.*)$/);
    if (!m || !cur) return;
    const kind = m[2], body = m[3].trim();
    if (kind === '>') { last.d = body; return; }
    if (kind === '?') { last.s = body; return; }
    const depth = m[1].length / 2;
    let txt = body, level = 0;
    const lm = txt.match(/^\[(\d)\]\s*/);
    if (lm) { level = +lm[1]; txt = txt.slice(lm[0].length); }
    const n = { kind: 'node', t: txt, level, depth, children: [] };
    while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();
    const parent = stack[stack.length - 1];
    n.parent = parent; n.branch = cur; parent.children.push(n); stack.push(n); last = n;
  });
  return branches;
}

function slug(s) { return fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'x'; }

export function buildModel(src) {
  const branches = parseContent(src);
  const byId = {}, nodes = [];
  const core = {
    kind: 'core', id: 'core', depth: -2, level: 0, children: branches,
    t: 'Artificial Intelligence', d: 'Everything between zero and building real AI systems.',
    s: 'This roadmap splits artificial intelligence into 18 fields and 573 topics. Start with the foundations at the top, work down through the core methods, then pick the specializations and engineering skills you need.',
  };
  branches.forEach((b) => {
    if (!gById[b.group]) throw new Error('Unknown group: ' + b.group + ' (' + b.id + ')');
    b.branch = b; b.parent = core; b.all = [];
    byId[b.id] = b;
    // Topic id = branch id + slugs of the titles on the way down. Renaming a title
    // or moving a topic breaks its saved progress (see docs/ROADMAP.md, "stable ids").
    (function walk(list, parent) {
      list.forEach((n) => {
        const base = parent.id + '/' + slug(n.t);
        let id = base, k = 2;
        while (byId[id]) id = base + '-' + (k++);
        n.id = id; byId[id] = n; nodes.push(n); b.all.push(n);
        walk(n.children, n);
      });
    })(b.children, b);
  });
  nodes.forEach((n) => {
    const out = [];
    (function w(l) { l.forEach((c) => { out.push(c); w(c.children); }); })(n.children);
    n.all = out;
  });
  core.all = nodes;
  const searchIdx = branches.concat(nodes);
  searchIdx.forEach((e) => {
    e._ft = fold(e.t + (e.short ? ' · ' + e.short : ''));
    e._fd = fold(e.d || '');
  });
  Object.assign(model, { core, branches, nodes, byId, searchIdx, total: nodes.length });
  return model;
}

export function isAnc(a, n) {
  let p = n.parent;
  while (p) { if (p === a) return true; p = p.parent; }
  return false;
}
