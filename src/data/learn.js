// "How do I learn this?" — everything the detail drawer derives from the content:
// key points, a checklist, a rough time estimate, curated resources, practice ideas,
// web search links and the "next up" suggestion.

import { fold } from '../util.js';
import { model } from './model.js';
import { store, LEARNING } from '../store.js';

let R = { areas: {}, topics: {} };
export function setResources(r) { R = { areas: r.areas || {}, topics: r.topics || {} }; }

// Deeper topics often have no level of their own; they inherit the nearest ancestor's.
export function levelOf(e) {
  for (let p = e; p && p.kind === 'node'; p = p.parent) if (p.level) return p.level;
  return 1;
}

// Rough study time in hours: leaves by level, parents = their children + an hour of overview.
const LEAF_HOURS = { 1: 2, 2: 4, 3: 7 };
export function hours(e) {
  if (e._h != null) return e._h;
  let h;
  if (!e.children.length) h = e.kind === 'node' ? LEAF_HOURS[levelOf(e)] : 0;
  else h = (e.kind === 'node' ? 1 : 0) + e.children.reduce((s, c) => s + hours(c), 0);
  e._h = h;
  return h;
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Splits the short description into key points ("A, B, C; D" -> 4 items),
// without splitting inside parentheses. Returns [] when there is only one point.
export function keyPoints(e) {
  if (!e.d) return [];
  const parts = e.d.split(/;\s*|,\s+(?![^()]*\))/).map((s) => s.trim()).filter(Boolean);
  return parts.length < 2 ? [] : parts.map(cap);
}

// Checklist for a topic without subtopics: its key points plus two learning goals.
export function checklist(e) {
  const items = keyPoints(e).map((p) => ({ text: p }));
  items.push({ text: `Can explain ${e.t} in plain words`, goal: true });
  items.push({ text: 'Used it once: a small exercise, script or project', goal: true });
  items.forEach((it) => { it.key = fold(it.text).replace(/[^a-z0-9]+/g, '-').slice(0, 40); });
  return items;
}

// Curated resources: topic-specific ones first (walking up to the parents), then the field's.
export function resourcesFor(e) {
  const out = [], seen = new Set();
  const add = (list, from) => (list || []).forEach((r) => { if (!seen.has(r.u)) { seen.add(r.u); out.push({ ...r, from }); } });
  for (let p = e; p && p.kind === 'node'; p = p.parent) add(R.topics[p.id], p);
  if (e.branch) add((R.areas[e.branch.id] || {}).resources, e.branch);
  return out;
}

export function practiceFor(e) {
  const a = e.branch && R.areas[e.branch.id];
  return a && a.practice ? a.practice.split('{topic}').join(e.t) : '';
}

export function searchLinks(e) {
  const q = encodeURIComponent, ctx = e.branch && e.branch !== e ? ' ' + e.branch.short : '';
  const links = [
    { t: 'YouTube', u: 'https://www.youtube.com/results?search_query=' + q(e.t + ctx + ' explained') },
    { t: 'Google', u: 'https://www.google.com/search?q=' + q(e.t + ctx + ' tutorial') },
    { t: 'Wikipedia', u: 'https://en.wikipedia.org/w/index.php?search=' + q(e.t) },
  ];
  if (levelOf(e) >= 2) links.push({ t: 'arXiv', u: 'https://arxiv.org/search/?searchtype=all&query=' + q(e.t) });
  return links;
}

// Suggests what to open next: something you are learning, otherwise the first
// first-level topic you have not touched yet (in roadmap order).
// `visible` (optional) limits it to topics shown by the level filter.
export function nextUp(visible = () => true) {
  const ok = model.nodes.filter(visible);
  return ok.find((n) => store.st[n.id] === LEARNING)
    || ok.find((n) => n.depth === 0 && !store.st[n.id]) || ok.find((n) => !store.st[n.id]) || null;
}
