// Level filter (Basic / Intermediate / Advanced). View only: boxes outside the chosen
// levels fade out, nothing about progress changes. Any combination can be on; the
// choice is remembered in this browser.

import { D, el } from '../util.js';
import { t } from '../strings.js';
import { levelOf } from '../data/learn.js';
import { pips } from './common.js';

const KEY = 'ai-roadmap-view';
const ALL = [1, 2, 3];
let on = new Set(ALL);
try {
  const v = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (v && Array.isArray(v.levels)) on = new Set(v.levels.filter((x) => ALL.includes(x)));
} catch (e) { /* keep all */ }
if (!on.size) on = new Set(ALL);

// true when a topic is visible under the current filter (fields always are)
export const levelOn = (e) => e.kind !== 'node' || on.has(levelOf(e));

function apply() {
  ALL.forEach((l) => D.body.classList.toggle('hide-l' + l, !on.has(l)));
  D.querySelectorAll('.lv-filter button').forEach((b) => {
    const lv = b.dataset.lv;
    b.setAttribute('aria-pressed', String(lv === 'all' ? on.size === ALL.length : on.has(+lv)));
  });
}

function set(levels) {
  on = new Set(levels.length ? levels : ALL);
  try { localStorage.setItem(KEY, JSON.stringify({ levels: [...on] })); } catch (e) { /* ignore */ }
  apply();
}

function toggle(l) {
  const next = new Set(on);
  if (next.has(l)) next.delete(l); else next.add(l);
  set([...next]);
}

export function initLevels() { apply(); }

// The filter bar for a roadmap; counts are for the topics in that roadmap.
export function levelFilter(root) {
  const w = el('div', 'lv-filter');
  w.setAttribute('role', 'group');
  w.setAttribute('aria-label', t('level'));
  w.appendChild(el('span', 'lv-lab', t('level')));
  const counts = { 1: 0, 2: 0, 3: 0 };
  (root.all || []).forEach((n) => { counts[levelOf(n)]++; });
  const all = el('button', null, t('lvAll'));
  all.type = 'button'; all.dataset.lv = 'all';
  all.onclick = () => set(ALL);
  w.appendChild(all);
  ALL.forEach((l) => {
    const b = el('button');
    b.type = 'button'; b.dataset.lv = l;
    b.appendChild(pips(l));
    b.appendChild(el('span', null, t('lv' + l)));
    b.appendChild(el('span', 'n', String(counts[l])));
    b.onclick = () => toggle(l);
    w.appendChild(b);
  });
  setTimeout(apply);
  return w;
}
