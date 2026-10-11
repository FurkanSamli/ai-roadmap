// Search in the top bar: matches titles and descriptions, then jumps to the topic.

import { D, el, fold } from '../util.js';
import { actions } from '../state.js';
import { model } from '../data/model.js';
import { gById } from '../data/groups.js';
import { store } from '../store.js';
import { t } from '../strings.js';

let sIn, sRes, sItems = [], sIdx = 0;

function pathOf(e) {
  const parts = [];
  for (let p = e.parent; p && p.kind !== 'core'; p = p.parent) parts.unshift(p.kind === 'branch' ? p.short : p.t);
  return parts.join(' › ') || gById[e.group].t;
}

function runSearch() {
  const q = fold(sIn.value.trim());
  if (!q) { sRes.hidden = true; sItems = []; return; }
  const res = [];
  model.searchIdx.forEach((e) => {
    const i = e._ft.indexOf(q);
    let sc;
    if (i >= 0) sc = (i === 0 ? 0 : 1) + (e.kind === 'branch' ? -0.5 : 0) + (e.depth || 0) * 0.05;
    else if (q.length > 2 && e._fd.indexOf(q) >= 0) sc = 3 + (e.depth || 0) * 0.05;
    else return;
    res.push({ e, sc });
  });
  res.sort((a, b) => a.sc - b.sc);
  sItems = res.slice(0, 9).map((r) => r.e);
  sIdx = 0;
  draw();
}

function draw() {
  sRes.innerHTML = '';
  if (!sItems.length) { sRes.appendChild(el('li', 'none', t('noRes'))); sRes.hidden = false; return; }
  sItems.forEach((e, i) => {
    const li = el('li');
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', String(i === sIdx));
    li.dataset.st = store.st[e.id] || 0;
    li.dataset.group = e.branch.group;
    li.appendChild(el('span', 'st-ico'));
    li.appendChild(el('span', 'nm', e.t));
    li.appendChild(el('span', 'sp', pathOf(e)));
    li.addEventListener('mousedown', (ev) => { ev.preventDefault(); pick(e); });
    sRes.appendChild(li);
  });
  sRes.hidden = false;
}

function pick(e) {
  sIn.value = ''; sRes.hidden = true; sItems = []; sIn.blur();
  actions.goTo(e.parent, e);
}

export function initSearch() {
  sIn = D.getElementById('search');
  sRes = D.getElementById('sres');
  sIn.addEventListener('input', runSearch);
  sIn.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowDown') { ev.preventDefault(); if (sItems.length) { sIdx = (sIdx + 1) % sItems.length; draw(); } }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); if (sItems.length) { sIdx = (sIdx - 1 + sItems.length) % sItems.length; draw(); } }
    else if (ev.key === 'Enter') { if (sItems[sIdx]) pick(sItems[sIdx]); }
    else if (ev.key === 'Escape') { sIn.value = ''; sRes.hidden = true; sIn.blur(); ev.stopPropagation(); }
  });
  sIn.addEventListener('blur', () => setTimeout(() => { sRes.hidden = true; }, 120));
  sIn.addEventListener('focus', () => { if (sIn.value.trim()) runSearch(); });
}

export function focusSearch() { sIn.focus(); }
